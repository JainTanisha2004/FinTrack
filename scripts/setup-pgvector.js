const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Enabling vector extension in PostgreSQL...");
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("pgvector extension enabled successfully!");
  } catch (error) {
    console.error("Failed to enable pgvector extension:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
