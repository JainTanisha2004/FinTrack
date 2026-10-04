"use server";

import { checkUser } from "@/lib/checkUser";
import { processAdvisorQuery } from "@/lib/ai/advisor/advisor-service";

/**
 * Server Action for AI Advisor powered by Hybrid Retrieval Architecture (SQL + pgvector RAG).
 */
export async function askFinancialAdvisor(question) {
  try {
    const user = await checkUser();

    if (!user) {
      throw new Error("Unauthorized: Please sign in.");
    }

    const result = await processAdvisorQuery(user.clerkUserId, question);

    return {
      success: true,
      answer: result.answer,
      intent: result.intent,
      ragUsed: result.ragUsed,
      citations: result.citations,
      metrics: result.metrics,
      fallbackActive: result.fallbackActive,
    };
  } catch (error) {
    console.error("AI Advisor Error:", error);
    throw new Error(error.message || "Failed to process advisor query");
  }
}