const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Creating HNSW vector index on ai_memories...");
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS ai_memories_embedding_hnsw_idx ON ai_memories USING hnsw (embedding vector_cosine_ops);`
    );
    console.log("HNSW vector index created successfully!");
  } catch (error) {
    console.error("Failed to create HNSW vector index:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
