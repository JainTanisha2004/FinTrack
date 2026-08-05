"use server"

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction=(obj)=>{
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function createAccount(data){
  try {
    const {userId}=await auth();
    if(!userId) throw new Error("Unauthorized");
    const user=await db.user.findUnique({
      where:{
        clerkUserId: userId
      },
    })

    if(!user){
      throw new Error("User not found");
    }


    const balanceFloat=parseFloat(data.balance);

    if(isNaN(balanceFloat)){
      throw new Error("Invalid Balance Amount");
    }

    const existingAccounts=await db.account.findMany({
      where:{userId:user.id},
    });

    const shouldBeDefault=existingAccounts.length===0?true:data.isDefault;

    if(shouldBeDefault){
      await db.account.updateMany({
        where:{userId:user.id, isDefault:true},
        data:{ isDefault:false},
      });
    }

    const account=await db.account.create({
      data:{
        ...data,
        balance:balanceFloat,
        userId:user.id,
        isDefault:shouldBeDefault,
      },
    });

    const serializedAccount=serializeTransaction(account);

    revalidatePath("/dashboard");
    return {success: true, data: serializedAccount};
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getUserAccounts(){
  const {userId}=await auth();
    if(!userId) throw new Error("Unauthorized");
    const user=await db.user.findUnique({
      where:{
        clerkUserId: userId
      },
    })

    if(!user){
      throw new Error("User not found");
    }

    const accounts=await db.account.findMany({
      where:{userId:user.id},
      orderBy:{createdAt:"desc"},
      include:{
        _count:{
          select:{
            transactions:true,
          },
        },
      },
    });

    const serializedAccount=accounts.map(serializeTransaction);

    return serializedAccount;
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
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

async function processDueRecurringTransactions(userId) {
  const todayEnd = endOfDay(new Date());

  const dueRecurringTransactions = await db.transaction.findMany({
    where: {
      userId,
      isRecurring: true,
      status: "COMPLETED",
      nextRecurringDate: {
        lte: todayEnd,
      },
    },
  });

  for (const transaction of dueRecurringTransactions) {
    if (!transaction.recurringInterval) continue;

    await db.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          type: transaction.type,
          amount: transaction.amount,
          description: `${transaction.description} (Recurring)`,
          date: new Date(),
          category: transaction.category,
          userId: transaction.userId,
          accountId: transaction.accountId,
          isRecurring: false,
          status: "COMPLETED",
        },
      });

      const balanceChange =
        transaction.type === "EXPENSE"
          ? -transaction.amount.toNumber()
          : transaction.amount.toNumber();

      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: balanceChange } },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          lastProcessed: new Date(),
          nextRecurringDate: calculateNextRecurringDate(
            new Date(),
            transaction.recurringInterval
          ),
        },
      });
    });
  }
}

export async function getDashboardData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await processDueRecurringTransactions(user.id);

  // Get all user transactions
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction);
}