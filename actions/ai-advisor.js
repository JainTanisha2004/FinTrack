"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { genAI } from "@/lib/ai/gemini";
import { buildFinancialPrompt } from "@/lib/ai/prompt";

function serializeAmount(value) {
  return value ? value.toNumber() : 0;
}

export async function askFinancialAdvisor(question) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Fetch user's financial data
    const accounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const budget = await db.budget.findUnique({
      where: {
        userId: user.id,
      },
    });

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Calculate totals
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

    // Calculate category-wise expenses
    const categoryTotals = {};

    transactions
      .filter((t) => t.type === "EXPENSE")
      .forEach((t) => {
        const amount = serializeAmount(t.amount);

        categoryTotals[t.category] =
          (categoryTotals[t.category] || 0) + amount;
      });

    // Latest 10 transactions
    const recentTransactions = transactions.slice(0, 10);

    // Build summary
    const financialSummary = `
Current Balance: ₹${totalBalance.toFixed(2)}

Total Income: ₹${totalIncome.toFixed(2)}

Total Expenses: ₹${totalExpenses.toFixed(2)}

Budget: ₹${
      budget
        ? serializeAmount(budget.amount).toFixed(2)
        : "Not Set"
    }

Expense Categories:

${Object.entries(categoryTotals)
  .map(([category, amount]) => `- ${category}: ₹${amount.toFixed(2)}`)
  .join("\n")}

Recent Transactions:

${recentTransactions
  .map(
    (t) =>
      `${t.type} | ${t.category} | ₹${serializeAmount(
        t.amount
      ).toFixed(2)} | ${t.description || "No Description"}`
  )
  .join("\n")}
`;

    // Build prompt
    const prompt = buildFinancialPrompt(financialSummary, question);

    // Check Gemini
    if (!genAI) {
      throw new Error("Gemini API key not configured.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);

    return {
      success: true,
      answer: result.response.text(),
    };
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
}