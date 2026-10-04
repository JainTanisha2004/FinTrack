import { genAI } from "@/lib/ai/gemini";

export const INTENT_TYPES = {
  SQL_ONLY: "SQL_ONLY",
  HYBRID_SQL_RAG: "HYBRID_SQL_RAG",
};

// Key phrases that explicitly signal historical memory interest
const HISTORICAL_MEM_PATTERNS = [
  /\b(advice|advised|advising|recommend|recommended|recommendation|recommendations)\b/i,
  /\b(repeated|repeating|pattern|habits|discipline|trend|improvement|improved)\b/i,
  /\b(previous|past|historical|history|earlier|before|prior)\b/i,
  /\b(monthly report|reports|insight|insights|budget alert|alert history)\b/i,
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(last month|previous month|months ago|last year|over time)\b/i,
  /\b(what did you tell|what did you say|what was your advice)\b/i,
  /\b(mistake|mistakes|exceeded budget in|overspent in)\b/i,
];

// Key phrases that explicitly signal current structured financial state queries
const CURRENT_STATE_PATTERNS = [
  /\b(current balance|my balance|total balance|how much money)\b/i,
  /\b(this month|today|recent transactions|latest transaction)\b/i,
  /\b(current budget|remaining budget|exceed my budget|will i exceed)\b/i,
  /\b(how much did i spend on|total expense|total income)\b/i,
];

/**
 * Classifies user intent to decide if RAG historical memory is required.
 * Returns { intent: 'SQL_ONLY' | 'HYBRID_SQL_RAG', confidence: number, reason: string }
 */
export async function classifyIntent(question) {
  if (!question || typeof question !== "string") {
    return { intent: INTENT_TYPES.SQL_ONLY, confidence: 1.0, reason: "Default empty" };
  }

  const normalized = question.trim().toLowerCase();

  // Rule 1: Check strong historical memory patterns
  const matchedHistPattern = HISTORICAL_MEM_PATTERNS.find((regex) => regex.test(normalized));
  if (matchedHistPattern) {
    return {
      intent: INTENT_TYPES.HYBRID_SQL_RAG,
      confidence: 0.95,
      reason: `Matched historical keyword pattern: ${matchedHistPattern}`,
    };
  }

  // Rule 2: Check explicit current state patterns
  const matchedCurrentPattern = CURRENT_STATE_PATTERNS.find((regex) => regex.test(normalized));
  if (matchedCurrentPattern) {
    return {
      intent: INTENT_TYPES.SQL_ONLY,
      confidence: 0.95,
      reason: `Matched current state keyword pattern: ${matchedCurrentPattern}`,
    };
  }

  // Rule 3: Fast LLM intent classification if ambiguous
  if (genAI) {
    try {
      const candidateModels = ["gemini-3.6-flash", "gemini-flash-lite-latest", "gemini-3.7-flash", "gemini-3.8-flash"];
      const prompt = `
Classify this user financial query into one of two categories:
1. SQL_ONLY: The user is asking about current balance, current month transactions, current budget, or specific real-time totals.
2. HYBRID_SQL_RAG: The user is asking about past recommendations, historical financial advice, spending trends over previous months, repeated financial mistakes, or comparing past reports/insights.

User Query: "${question}"

Respond with EXACTLY ONE word: either "SQL_ONLY" or "HYBRID_SQL_RAG".
`;
      for (const m of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(prompt);
          const text = result.response.text().trim().toUpperCase();

          if (text.includes("HYBRID_SQL_RAG")) {
            return { intent: INTENT_TYPES.HYBRID_SQL_RAG, confidence: 0.9, reason: "LLM Classification" };
          }
          if (text.includes("SQL_ONLY")) {
            return { intent: INTENT_TYPES.SQL_ONLY, confidence: 0.9, reason: "LLM Classification" };
          }
        } catch (e) {
          console.warn(`[IntentClassifier] Model ${m} failed (${e.message}). Trying fallback...`);
        }
      }
    } catch (err) {
      console.warn("[IntentClassifier] LLM Intent classification failed, defaulting to SQL_ONLY:", err.message);
    }
  }

  // Fallback default
  return {
    intent: INTENT_TYPES.SQL_ONLY,
    confidence: 0.7,
    reason: "Default fallback",
  };
}
