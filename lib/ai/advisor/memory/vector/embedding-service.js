import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Service to generate text vector embeddings using Gemini API.
 * Embedded model: gemini-embedding-001 (3072 dimensions)
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Invalid text input for embedding generation.");
  }

  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured in environment.");
  }

  const sanitizedText = text.replace(/\s+/g, " ").trim();
  const startTime = Date.now();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }] },
      outputDimensionality: 768,
    });

    if (!result?.embedding?.values) {
      throw new Error("Malformed response from Gemini embedding API.");
    }

    const duration = Date.now() - startTime;
    console.log(
      `[EmbeddingService] Generated embedding (${result.embedding.values.length} dims) in ${duration}ms`
    );

    return {
      embedding: result.embedding.values,
      durationMs: duration,
    };
  } catch (error) {
    console.error("[EmbeddingService] Error generating embedding:", error);
    throw error;
  }
}
