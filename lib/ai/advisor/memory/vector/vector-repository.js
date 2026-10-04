import { db } from "@/lib/prisma";

/**
 * Vector Repository for PostgreSQL + pgvector operations on ai_memories table.
 * Enforces strict userId tenant isolation on all queries.
 */

/**
 * Inserts a new AI Memory document with its vector embedding.
 */
export async function insertMemoryDocument({
  userId,
  documentType,
  month = null,
  title,
  content,
  embedding,
}) {
  if (!userId) {
    throw new Error("[VectorRepository] Security Violation: userId is required.");
  }
  if (!documentType || !title || !content || !embedding) {
    throw new Error("[VectorRepository] Missing required memory fields.");
  }

  const startTime = Date.now();
  const vectorStr = `[${embedding.join(",")}]`;

  // Upsert or delete existing matching memory for the same documentType and month to avoid duplicates
  if (month) {
    await db.$executeRaw`
      DELETE FROM ai_memories 
      WHERE "userId" = ${userId} 
        AND "documentType" = ${documentType} 
        AND month = ${month};
    `;
  }

  const result = await db.$executeRawUnsafe(
    `
    INSERT INTO ai_memories (id, "userId", "documentType", month, title, content, embedding, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW(), NOW());
    `,
    userId,
    documentType,
    month,
    title,
    content,
    vectorStr
  );

  const duration = Date.now() - startTime;
  console.log(`[VectorRepository] Saved memory document '${title}' for user ${userId} in ${duration}ms`);
  return result;
}

/**
 * Performs Cosine Similarity Vector Search with mandatory userId filtering.
 */
export async function searchSimilarMemories({
  userId,
  queryEmbedding,
  topK = 5,
  minSimilarity = 0.3,
}) {
  if (!userId) {
    throw new Error("[VectorRepository] Security Violation: userId is required for vector search.");
  }

  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error("[VectorRepository] Invalid query embedding.");
  }

  const startTime = Date.now();
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // Cosine distance operator is <=> in pgvector
  // Cosine similarity = 1 - (embedding <=> queryVector)
  const rows = await db.$queryRawUnsafe(
    `
    SELECT 
      id,
      "documentType",
      month,
      title,
      content,
      "createdAt",
      (1 - (embedding <=> $1::vector))::float AS similarity
    FROM ai_memories
    WHERE "userId" = $2
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $3;
    `,
    vectorStr,
    userId,
    topK
  );

  const duration = Date.now() - startTime;

  // Filter out low similarity results
  const filteredRows = rows.filter((row) => row.similarity >= minSimilarity);

  console.log(
    `[VectorRepository] Vector search completed in ${duration}ms. Raw matches: ${rows.length}, Filtered (>=${minSimilarity}): ${filteredRows.length}`
  );

  return {
    results: filteredRows,
    searchDurationMs: duration,
  };
}

/**
 * Retrieves all stored AI Memory documents for a specific user.
 */
export async function getUserMemories(userId) {
  if (!userId) throw new Error("[VectorRepository] userId is required.");

  const memories = await db.aIMemory.findMany({
    where: { userId },
    select: {
      id: true,
      documentType: true,
      month: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return memories;
}

/**
 * Deletes a memory document by ID with userId check.
 */
export async function deleteMemoryDocument(id, userId) {
  if (!userId || !id) throw new Error("[VectorRepository] id and userId are required.");

  return await db.aIMemory.deleteMany({
    where: {
      id,
      userId,
    },
  });
}
