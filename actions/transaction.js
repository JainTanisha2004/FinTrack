"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { request } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const serializeAmount=(obj)=>({
  ...obj,
  amount:obj.amount.toNumber(),
});

function getReceiptScanErrorMessage(error) {
  const message = error?.message || "";

  if (/quota|rate limit|429|too many requests/i.test(message)) {
    return "Receipt scan is temporarily unavailable because the AI service quota has been exhausted. Please try again in a few minutes or enter the details manually.";
  }

  if (/not found|unsupported|model/i.test(message)) {
    return "Receipt scan is currently unavailable because the configured AI model is not supported. Please try again later or enter the details manually.";
  }

  return "We couldn't read this receipt. Please try a clearer image or enter the details manually.";
}

function parseReceiptResponse(text) {
  const cleanedText = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = cleanedText.match(/\{[\s\S]*\}/);
  const jsonCandidate = match ? match[0] : cleanedText;
  const data = JSON.parse(jsonCandidate);

  if (!data || typeof data !== "object") {
    return null;
  }

  if (typeof data.amount === "undefined" || data.amount === null) {
    return null;
  }

  return {
    amount: Number(data.amount),
    date: data.date ? new Date(data.date) : new Date(),
    description: data.description || "Receipt",
    category: data.category || "other-expense",
    merchantName: data.merchantName || "",
  };
}

export async function createTransaction(data){
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const req = await request();

    const decision=await aj.protect(req,{
      userId,
      requested: 1,
    })

    if(decision.isDenied()){
      if(decision.reason.isRateLimit()){
        const {remaining, reset}=decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details:{
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked.");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

     const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;


    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}


function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function calculateNextRecurringDate(startDate, interval) {
  const date = startOfDay(new Date(startDate));

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

// export async function scanReceipt(file){
//   try {
//     if (!genAI) {
//       throw new Error("Receipt scan is not configured. Please set GEMINI_API_KEY.");
//     }

//     const model=genAI.getGenerativeModel({
//       model: process.env.GEMINI_RECEIPT_MODEL || "gemini-1.5-flash",
//     });

//     const arrayBuffer=await file.arrayBuffer();
//     const base64String=Buffer.from(arrayBuffer).toString("base64");
//     const prompt=`
//       Analyze this receipt image and extract the following information in JSON format:
//       - Total amount (just the number)
//       - Date (in ISO format)
//       - Description or items purchased (brief summary)
//       - Merchant/store name
//       - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense)

//       Only respond with valid JSON in this exact format:
//       {
//         "amount": number,
//         "date": "ISO date string",
//         "description": "string",
//         "merchantName": "string",
//         "category": "string"
//       }

//       If it is not a receipt, return an empty object.
//     `;
//     const result=await model.generateContent([
//       {
//         inlineData:{
//           data: base64String,
//           mimeType: file.type,
//         },
//       },
//       prompt,
//     ]);

//     const response=await result.response;
//     const text=response.text();
//     const parsedData=parseReceiptResponse(text);

//     if (!parsedData) {
//       throw new Error("We couldn't read this receipt. Please try a clearer image or enter the details manually.");
//     }

//     return parsedData;
//   } catch (error) {
//     // console.error("Error scanning receipt:", error);
//     // throw new Error(getReceiptScanErrorMessage(error));
//     console.error("===== GEMINI ERROR =====");
//   console.error(error);
//   console.error("Message:", error?.message);

//   if (error?.response) {
//     console.error(await error.response.text());
//   }

//   throw new Error(getReceiptScanErrorMessage(error));
//   }
// }

export async function scanReceipt(file) {
  try {
    if (!genAI) {
      throw new Error("Receipt scan is not configured. Please set GEMINI_API_KEY.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
Analyze this receipt image and extract the following information in JSON format:

- Total amount (number only)
- Date (ISO format)
- Brief description
- Merchant/store name
- Category (one of: housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense)

Return ONLY valid JSON.

{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string"
}

If this is not a receipt, return {}.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const text = result.response.text();

    console.log("Gemini Response:");
    console.log(text);

    const parsedData = parseReceiptResponse(text);

    if (!parsedData) {
      throw new Error(
        "We couldn't read this receipt. Please try a clearer image or enter the details manually."
      );
    }

    return parsedData;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error(getReceiptScanErrorMessage(error));
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}