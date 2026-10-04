import { db } from "@/lib/prisma";
import { genAI } from "@/lib/ai/gemini";
import { classifyIntent, INTENT_TYPES } from "./intent-classifier";
import { generateEmbedding } from "./memory/vector/embedding-service";
import { searchSimilarMemories } from "./memory/vector/vector-repository";
import { buildHybridFinancialPrompt } from "./prompt-builder";

function serializeAmount(value) {
  return value ? value.toNumber() : 0;
}

/**
 * Main Hybrid AI Advisor Service.
 * Combines SQL structured financial retrieval with Vector RAG historical AI memory retrieval.
 */
export async function processAdvisorQuery(userId, question) {
  if (!userId) throw new Error("Unauthorized user ID");
  if (!question || !question.trim()) throw new Error("Question cannot be empty");

  const startTime = Date.now();
  const metrics = {
    intentClassificationMs: 0,
    embeddingGenerationMs: 0,
    vectorSearchMs: 0,
    geminiGenerationMs: 0,
    retrievedDocCount: 0,
  };

  // 1. Retrieve Live Structured Financial Data from PostgreSQL via SQL/Prisma
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User record not found in database");

  const [accounts, budget, transactions] = await Promise.all([
    db.account.findMany({ where: { userId: user.id } }),
    db.budget.findUnique({ where: { userId: user.id } }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + serializeAmount(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + serializeAmount(t.amount), 0);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + serializeAmount(account.balance),
    0
  );

  const categoryTotals = {};
  transactions
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      const amount = serializeAmount(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
    });

  const recentTransactions = transactions.slice(0, 10);

  const financialSummary = `
Current Balance: ₹${totalBalance.toFixed(2)}
Total Income: ₹${totalIncome.toFixed(2)}
Total Expenses: ₹${totalExpenses.toFixed(2)}
Monthly Budget Target: ₹${
    budget ? serializeAmount(budget.amount).toFixed(2) : "Not Set"
  }

Expense Categories Breakdown:
${
  Object.keys(categoryTotals).length > 0
    ? Object.entries(categoryTotals)
        .map(([category, amount]) => `- ${category}: ₹${amount.toFixed(2)}`)
        .join("\n")
    : "- No expense categories recorded"
}

Recent Transactions (Latest 10):
${
  recentTransactions.length > 0
    ? recentTransactions
        .map(
          (t) =>
            `- ${t.type} | ${t.category} | ₹${serializeAmount(
              t.amount
            ).toFixed(2)} | ${t.description || "No description"}`
        )
        .join("\n")
    : "- No transactions recorded"
}
`;

  // 2. Intent Classification (SQL_ONLY vs HYBRID_SQL_RAG)
  const intentStart = Date.now();
  const intentResult = await classifyIntent(question);
  metrics.intentClassificationMs = Date.now() - intentStart;

  console.log(
    `[AdvisorService] Query: "${question}" -> Intent: ${intentResult.intent} (${intentResult.reason})`
  );

  let historicalMemories = [];
  let ragError = null;

  // 3. Vector Similarity RAG Retrieval (If intent is HYBRID_SQL_RAG)
  if (intentResult.intent === INTENT_TYPES.HYBRID_SQL_RAG) {
    try {
      // Step A: Generate query embedding
      const embedStart = Date.now();
      const embedRes = await generateEmbedding(question);
      metrics.embeddingGenerationMs = Date.now() - embedStart;

      // Step B: Search pgvector for relevant historical memories with mandatory userId filter
      const searchStart = Date.now();
      const searchRes = await searchSimilarMemories({
        userId: user.id,
        queryEmbedding: embedRes.embedding,
        topK: 4,
        minSimilarity: 0.25,
      });
      metrics.vectorSearchMs = Date.now() - searchStart;

      historicalMemories = searchRes.results;
      metrics.retrievedDocCount = historicalMemories.length;

      console.log(
        `[AdvisorService] Retrieved ${historicalMemories.length} historical memories in ${metrics.vectorSearchMs}ms`
      );
    } catch (err) {
      ragError = err.message;
      console.error(
        "[AdvisorService] RAG retrieval failed. Falling back gracefully to SQL-Only mode:",
        err
      );
      // Graceful Fallback: Proceed with empty historicalMemories
      historicalMemories = [];
    }
  }

  // 4. Construct Prompt
  const prompt = buildHybridFinancialPrompt({
    financialSummary,
    historicalMemories,
    question,
  });

  // 5. Query Gemini LLM with robust model fallback
  if (!genAI) {
    throw new Error("Gemini API key not configured.");
  }

  const geminiStart = Date.now();
  const candidateModels = ["gemini-3.6-flash", "gemini-flash-lite-latest", "gemini-3.7-flash", "gemini-3.8-flash"];
  let result = null;
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent(prompt);
      if (result?.response?.text) break;
    } catch (err) {
      console.warn(`[AdvisorService] Model ${modelName} failed (${err.message}). Trying fallback...`);
      lastError = err;
    }
  }

  if (!result || !result.response) {
    throw new Error(lastError?.message || "All Gemini generative models failed.");
  }
  metrics.geminiGenerationMs = Date.now() - geminiStart;

  const citations = historicalMemories.map((mem) => ({
    id: mem.id,
    title: mem.title,
    documentType: mem.documentType,
    month: mem.month,
    similarity: mem.similarity,
  }));

  const totalDurationMs = Date.now() - startTime;
  console.log(
    `[AdvisorService] Query completed in ${totalDurationMs}ms (Gemini: ${metrics.geminiGenerationMs}ms, Docs: ${metrics.retrievedDocCount})`
  );

  return {
    success: true,
    answer: result.response.text(),
    intent: intentResult.intent,
    ragUsed: historicalMemories.length > 0,
    citations,
    metrics: {
      ...metrics,
      totalDurationMs,
    },
    fallbackActive: Boolean(ragError),
  };
}
