"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { genAI } from "@/lib/ai/gemini";
import { addDays, isBefore, isAfter, startOfDay, addWeeks, addMonths, addYears } from "date-fns";
import { recordForecastMemory } from "@/lib/ai/advisor/memory/memory-pipeline";

function serializeAmount(value) {
  return value ? value.toNumber() : 0;
}

export async function getForecast() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get all accounts to get current total balance
    const accounts = await db.account.findMany({
      where: { userId: user.id },
    });

    const currentBalance = accounts.reduce(
      (sum, account) => sum + serializeAmount(account.balance),
      0
    );

    // Get all recurring transactions
    const recurringTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
      },
    });

    // Get past 30 days non-recurring expenses to calculate average daily spend
    const thirtyDaysAgo = addDays(new Date(), -30);
    const pastTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: false,
        type: "EXPENSE",
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalPastSpend = pastTransactions.reduce((sum, t) => sum + serializeAmount(t.amount), 0);
    const averageDailySpend = totalPastSpend / 30;

    // Calculate upcoming recurring payments in the next 30 days
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);
    
    let upcomingPayments = [];
    
    // helper to find instances
    const findInstances = (transaction, interval) => {
       if (!transaction.nextRecurringDate) return;
       let nextDate = startOfDay(new Date(transaction.nextRecurringDate));
       while (isBefore(nextDate, thirtyDaysFromNow) || nextDate.getTime() === thirtyDaysFromNow.getTime()) {
           if (isAfter(nextDate, today) || nextDate.getTime() === today.getTime()) {
               upcomingPayments.push({
                   id: transaction.id + "-" + nextDate.getTime(),
                   description: transaction.description || transaction.category,
                   amount: serializeAmount(transaction.amount),
                   type: transaction.type,
                   date: nextDate,
               });
           }
           
           switch (interval) {
               case "DAILY": nextDate = addDays(nextDate, 1); break;
               case "WEEKLY": nextDate = addWeeks(nextDate, 1); break;
               case "MONTHLY": nextDate = addMonths(nextDate, 1); break;
               case "YEARLY": nextDate = addYears(nextDate, 1); break;
               default: return; // should not happen
           }
       }
    };

    recurringTransactions.forEach(t => {
       if(t.recurringInterval) {
           findInstances(t, t.recurringInterval);
       }
    });

    // Sort upcoming payments by date
    upcomingPayments.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate predicted balances
    const calculatePredictedBalance = (days) => {
        let balance = currentBalance;
        
        // Subtract average daily non-recurring spend
        balance -= (averageDailySpend * days);
        
        // Add/Subtract recurring payments within the next 'days'
        const targetDate = addDays(today, days);
        
        upcomingPayments.forEach(payment => {
            if (isBefore(payment.date, targetDate) || payment.date.getTime() === targetDate.getTime()) {
                if (payment.type === "INCOME") {
                    balance += payment.amount;
                } else {
                    balance -= payment.amount;
                }
            }
        });
        
        return balance;
    };

    const predictions = {
        7: calculatePredictedBalance(7),
        15: calculatePredictedBalance(15),
        30: calculatePredictedBalance(30)
    };

    // Ask Gemini for an insight
    const prompt = `
      Analyze this cash flow forecast for a user:
      - Current Balance: ₹${currentBalance.toFixed(2)}
      - Average Daily Non-Recurring Spend (past 30 days): ₹${averageDailySpend.toFixed(2)}
      
      Predicted Balances:
      - In 7 days: ₹${predictions[7].toFixed(2)}
      - In 15 days: ₹${predictions[15].toFixed(2)}
      - In 30 days: ₹${predictions[30].toFixed(2)}
      
      Upcoming Scheduled Payments (Next 30 days):
      ${upcomingPayments.map(p => `${p.description}: ${p.type === 'INCOME' ? '+' : '-'}₹${p.amount} on ${p.date.toISOString().split('T')[0]}`).join('\n')}
      
      Please provide a concise, actionable financial insight and recommendation (max 3 sentences) in plain text. Format it clearly as an "Insight" and a "Suggestion" block. Do not use Markdown bolding or headers, just plain text with newlines.
    `;

    let insight = "Insight:\nYour spending pattern is healthy.\n\nSuggestion:\nYou are on track for a stable month.";
    
    if (genAI) {
      const candidateModels = ["gemini-3.6-flash", "gemini-flash-lite-latest", "gemini-3.7-flash", "gemini-3.8-flash"];
      for (const m of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(prompt);
          if (result?.response?.text) {
            insight = result.response.text();
            break;
          }
        } catch (error) {
          console.error(`Gemini Forecast Error (${m}):`, error.message);
        }
      }
    }

    // Automatically record Forecast memory in vector database
    try {
      await recordForecastMemory({
        userId: user.id,
        currentBalance,
        predictions,
        insight,
      });
    } catch (err) {
      console.warn("Forecast memory recording skipped:", err.message);
    }

    return {
        success: true,
        data: {
            currentBalance,
            predictions,
            upcomingPayments: upcomingPayments.map(p => ({
                ...p,
                date: p.date.toISOString()
            })),
            insight
        }
    };
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
}
