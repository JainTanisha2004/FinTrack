"use server";

import { checkUser } from "@/lib/checkUser";
import { getUserMemories, deleteMemoryDocument } from "@/lib/ai/advisor/memory/vector/vector-repository";
import { recordCustomInsightMemory } from "@/lib/ai/advisor/memory/memory-pipeline";

/**
 * Server Action: Fetch user's stored vector memory documents.
 */
export async function fetchUserMemories() {
  try {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized: Please sign in.");

    const memories = await getUserMemories(user.id);
    return { success: true, memories };
  } catch (error) {
    console.error("fetchUserMemories error:", error);
    return { success: false, error: error.message || "Failed to fetch memories" };
  }
}

/**
 * Server Action: Delete a specific memory document.
 */
export async function deleteUserMemory(memoryId) {
  try {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized: Please sign in.");

    await deleteMemoryDocument(memoryId, user.id);
    return { success: true };
  } catch (error) {
    console.error("deleteUserMemory error:", error);
    return { success: false, error: error.message || "Failed to delete memory" };
  }
}

/**
 * Server Action: Seed sample multi-month historical AI memory documents for testing hybrid retrieval.
 */
export async function seedSampleHistoricalMemories() {
  try {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized: Please sign in.");

    const sampleMemories = [
      {
        documentType: "MONTHLY_REPORT",
        month: "January 2026",
        title: "Monthly Financial Report - January 2026",
        content: `
Monthly Financial Report for January 2026
--------------------------------------------------
Total Income: ₹85,000 | Total Expenses: ₹52,000 | Savings: ₹33,000
Top Spend Category: Dining & Food Delivery (₹18,500)

AI Financial Advisor Key Insights:
1. High Food Delivery Spending: You spent 36% of your monthly budget on Swiggy and Zomato food delivery.
2. Recurring Subscriptions: You have 5 streaming service subscriptions totaling ₹2,450/month.
3. Financial Recommendation: Reduce food delivery by at least 50% and allocate ₹10,000 to emergency savings.
`.trim(),
      },
      {
        documentType: "MONTHLY_REPORT",
        month: "April 2026",
        title: "Monthly Financial Report - April 2026",
        content: `
Monthly Financial Report for April 2026
--------------------------------------------------
Total Income: ₹85,000 | Total Expenses: ₹64,200 | Savings: ₹20,800
Top Spend Category: Shopping & Electronics (₹28,000)

AI Financial Advisor Key Insights:
1. Shopping Exceeded Target: Shopping expenses surged by 45% compared to March due to impulse Amazon purchases.
2. Food Delivery Persists: Food delivery spending remains consistently high at ₹16,200 despite previous advice.
3. Recommendation: Implement a 48-hour cooling period rule before non-essential online shopping purchases.
`.trim(),
      },
      {
        documentType: "BUDGET_ALERT",
        month: "May 2026",
        title: "Budget Alert Exceeded - May 2026",
        content: `
Budget Alert Notification for May 2026
--------------------------------------------------
Account: Primary Savings Account
Monthly Budget Limit: ₹45,000 | Total Spent: ₹58,400 (129.7% of budget exceeded!)

Explanation & Guidance:
User exceeded monthly budget limit in May due to unchecked restaurant dining and unplanned weekend trips. 
AI Advice given after May budget breach: Freeze discretionary spending for the first 10 days of June and create a dedicated impulse buy sinking fund.
`.trim(),
      },
      {
        documentType: "MONTHLY_REPORT",
        month: "July 2026",
        title: "Monthly Financial Report - July 2026",
        content: `
Monthly Financial Report for July 2026
--------------------------------------------------
Total Income: ₹90,000 | Total Expenses: ₹48,000 | Savings: ₹42,000
Top Spend Category: Utilities & Rent (₹22,000)

AI Financial Advisor Key Insights:
1. Discipline Improved: Financial discipline improved significantly in July! Shopping spending fell by 40%.
2. Food Delivery Warning: Food delivery spending remains a recurring weakness at ₹14,800/month across 6 consecutive reports.
3. Recommendation: Shift food delivery savings directly into long-term mutual fund SIPs.
`.trim(),
      },
      {
        documentType: "FORECAST_SUMMARY",
        month: "August 2026",
        title: "Cash Flow Forecast & Financial Health - August 2026",
        content: `
Cash Flow Forecast - August 2026
--------------------------------------------------
30-Day Predicted Balance: ₹1,12,500
Upcoming Recurring Payments: Rent ₹18,000, Car EMI ₹12,500

AI Forecast Insight:
Your financial discipline has shown positive progress compared to Q1. However, weekend dining out and food delivery remain your most repeated financial vulnerability.
`.trim(),
      },
    ];

    let seededCount = 0;
    for (const mem of sampleMemories) {
      await recordCustomInsightMemory({
        userId: user.id,
        documentType: mem.documentType,
        month: mem.month,
        title: mem.title,
        content: mem.content,
      });
      seededCount++;
    }

    return { success: true, count: seededCount };
  } catch (error) {
    console.error("seedSampleHistoricalMemories error:", error);
    return { success: false, error: error.message || "Seeding failed" };
  }
}
