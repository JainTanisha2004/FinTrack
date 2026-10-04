import { generateEmbedding } from "./vector/embedding-service";
import { insertMemoryDocument } from "./vector/vector-repository";

/**
 * Memory Pipeline for automatic lifecycle management of AI Knowledge Documents.
 * Converts AI-generated reports, forecasts, insights, and budget alerts into 
 * vector-embedded AI memories in PostgreSQL.
 */

/**
 * Stores a Monthly Report memory document.
 */
export async function recordMonthlyReportMemory({ userId, month, stats, insights }) {
  if (!userId) return;

  const title = `Monthly Financial Report - ${month}`;
  const insightsText = Array.isArray(insights)
    ? insights.map((i, idx) => `Insight ${idx + 1}: ${i}`).join("\n")
    : String(insights);

  const categoryBreakdown = stats?.byCategory
    ? Object.entries(stats.byCategory)
        .map(([cat, amt]) => `- ${cat}: ₹${amt}`)
        .join("\n")
    : "No categories recorded";

  const content = `
Monthly Report for ${month}
--------------------------------------------------
Total Income: ₹${stats?.totalIncome || 0}
Total Expenses: ₹${stats?.totalExpenses || 0}
Net Income: ₹${(stats?.totalIncome || 0) - (stats?.totalExpenses || 0)}
Total Transactions: ${stats?.transactionCount || 0}

Expense Categories Breakdown:
${categoryBreakdown}

AI Recommendations & Insights:
${insightsText}
`.trim();

  try {
    const { embedding } = await generateEmbedding(content);
    await insertMemoryDocument({
      userId,
      documentType: "MONTHLY_REPORT",
      month,
      title,
      content,
      embedding,
    });
    console.log(`[MemoryPipeline] Automatically recorded Monthly Report memory for ${month}`);
  } catch (error) {
    console.error(`[MemoryPipeline] Failed to record Monthly Report memory:`, error);
  }
}

/**
 * Stores a Cash Flow Forecast Summary memory document.
 */
export async function recordForecastMemory({ userId, currentBalance, predictions, insight, month }) {
  if (!userId) return;

  const currentMonth = month || new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const title = `Cash Flow Forecast & Financial Health - ${currentMonth}`;

  const content = `
Cash Flow Forecast (${currentMonth})
--------------------------------------------------
Current Total Balance: ₹${currentBalance ? currentBalance.toFixed(2) : "0.00"}
7-Day Balance Projection: ₹${predictions?.[7] ? predictions[7].toFixed(2) : "N/A"}
15-Day Balance Projection: ₹${predictions?.[15] ? predictions[15].toFixed(2) : "N/A"}
30-Day Balance Projection: ₹${predictions?.[30] ? predictions[30].toFixed(2) : "N/A"}

AI Forecast Insight & Suggestion:
${insight || "Healthy spending trend observed."}
`.trim();

  try {
    const { embedding } = await generateEmbedding(content);
    await insertMemoryDocument({
      userId,
      documentType: "FORECAST_SUMMARY",
      month: currentMonth,
      title,
      content,
      embedding,
    });
    console.log(`[MemoryPipeline] Automatically recorded Forecast memory for ${currentMonth}`);
  } catch (error) {
    console.error(`[MemoryPipeline] Failed to record Forecast memory:`, error);
  }
}

/**
 * Stores a Budget Alert memory document.
 */
export async function recordBudgetAlertMemory({
  userId,
  month,
  budgetAmount,
  totalExpenses,
  percentageUsed,
  accountName,
}) {
  if (!userId) return;

  const currentMonth = month || new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const title = `Budget Alert Exceeded - ${accountName} (${currentMonth})`;

  const content = `
Budget Alert Notification (${currentMonth})
--------------------------------------------------
Account: ${accountName}
Monthly Budget Target: ₹${budgetAmount}
Total Expenses Recorded: ₹${totalExpenses}
Budget Usage Percentage: ${percentageUsed.toFixed(1)}% Exceeded!

Explanation & Warning:
User exceeded monthly budget limit of ₹${budgetAmount} on account '${accountName}'. Spending reached ₹${totalExpenses} (${percentageUsed.toFixed(1)}%). Recommended immediate review of non-essential expense categories to regain financial discipline.
`.trim();

  try {
    const { embedding } = await generateEmbedding(content);
    await insertMemoryDocument({
      userId,
      documentType: "BUDGET_ALERT",
      month: currentMonth,
      title,
      content,
      embedding,
    });
    console.log(`[MemoryPipeline] Automatically recorded Budget Alert memory for ${currentMonth}`);
  } catch (error) {
    console.error(`[MemoryPipeline] Failed to record Budget Alert memory:`, error);
  }
}

/**
 * Stores a custom AI Insight or Recommendation memory.
 */
export async function recordCustomInsightMemory({ userId, documentType, month, title, content }) {
  if (!userId) return;

  try {
    const { embedding } = await generateEmbedding(content);
    await insertMemoryDocument({
      userId,
      documentType: documentType || "AI_INSIGHT",
      month: month || new Date().toLocaleString("default", { month: "long", year: "numeric" }),
      title,
      content,
      embedding,
    });
    console.log(`[MemoryPipeline] Automatically recorded custom memory '${title}'`);
  } catch (error) {
    console.error(`[MemoryPipeline] Failed to record custom memory:`, error);
  }
}
