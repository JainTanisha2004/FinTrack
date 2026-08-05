import { db } from "@/lib/prisma";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";

export async function GET() {
  const budgets = await db.budget.findMany({
    include: {
      user: {
        include: {
          accounts: {
            where: { isDefault: true },
          },
        },
      },
    },
  });

  const results = [];

  for (const budget of budgets) {
    const defaultAccount = budget.user.accounts[0];
    if (!defaultAccount) continue;

    const startDate = new Date();
    startDate.setDate(1);

    const expenses = await db.transaction.aggregate({
      where: {
        userId: budget.userId,
        accountId: defaultAccount.id,
        type: "EXPENSE",
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const totalExpenses = expenses._sum.amount?.toNumber() || 0;
    const budgetAmount = Number(budget.amount);
    const percentageUsed = budgetAmount > 0 ? (totalExpenses / budgetAmount) * 100 : 0;

    const emailResult = await sendEmail({
      to: budget.user.email,
      subject: `Budget Alert Test for ${defaultAccount.name}`,
      react: EmailTemplate({
        userName: budget.user.name,
        type: "budget-alert",
        data: {
          percentageUsed,
          budgetAmount: Number(budgetAmount).toFixed(1),
          totalExpenses: Number(totalExpenses).toFixed(1),
          accountName: defaultAccount.name,
        },
      }),
    });

    results.push({
      budgetId: budget.id,
      email: budget.user.email,
      percentageUsed,
      emailResult,
    });
  }

  return Response.json({ success: true, results });
}
