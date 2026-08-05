 "use server"
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

export async function updateDefaultAccount(accountId){
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

    await db.account.updateMany({
      where:{userId:user.id, isDefault:true},
      data:{isDefault:false},
    });

    const account=await db.account.update({
      where:{
        id:accountId,
        userId:user.id,
      },
      data:{isDefault:true},
    });
    revalidatePath("/dashboard");
    return {success:true,data:serializeTransaction(account)};
  } catch (error) {
    return {success: false,error: error.message};
  }
}

export async function getAccountWithTransactions(accountId){
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

    const account=await db.account.findUnique({
      where:{id:accountId, userId:user.id},
      include:{
        transactions:{
          orderBy:{date:"desc"},
        },
        _count:{
          select:{transactions:true},
        },
      },
    });

    if(!account) return null;

    return {
      ...serializeTransaction(account),
      transactions:account.transactions.map(serializeTransaction)
    };
}

export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new Error("Select at least one transaction to delete");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    await db.$transaction(async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      const accountBalanceChanges = transactions.reduce((changes, transaction) => {
        const current = changes.get(transaction.accountId) ?? new Prisma.Decimal(0);
        changes.set(
          transaction.accountId,
          transaction.type === "EXPENSE"
            ? current.plus(transaction.amount)
            : current.minus(transaction.amount)
        );
        return changes;
      }, new Map());

      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      for (const [accountId, balanceChange] of accountBalanceChanges) {
        await tx.account.update({
          where: { id: accountId, userId: user.id },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
