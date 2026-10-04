const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function runTest() {
  console.log("Testing generateEmbedding with text string...");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  try {
    const res1 = await model.embedContent("Hello world test string");
    console.log("res1 success, dim:", res1.embedding.values.length);
  } catch (err) {
    console.error("res1 error:", err);
  }

  try {
    const res2 = await model.embedContent({
      content: { parts: [{ text: "Hello world test object" }] }
    });
    console.log("res2 success, dim:", res2.embedding.values.length);
  } catch (err) {
    console.error("res2 error:", err);
  }
}

runTest();
