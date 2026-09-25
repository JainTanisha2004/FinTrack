import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;