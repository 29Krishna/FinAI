import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";
import { Description } from "@radix-ui/react-dialog";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const checkBudgetAlerts = inngest.createFunction(
    { name: "Check Budget Alerts" },
    { cron: "0 */6 * * * " },
    async ({ step }) => {
        const budgets = await step.run("fetch-budget", async () => {
            return await db.budget.findMany({
                include: {
                    user: {
                        include: {
                            accounts: {
                                where: {
                                    isDefault: true
                                }
                            }
                        }
                    }
                }
            })
        })

        for (const budget of budgets) {
            const defaultAccount = budget.user.accounts[0];
            if (!defaultAccount) continue; //skip if no default account

            await step.run(`check-budget-${budget.id}`, async () => {


                const currentDate = new Date()
                const startOfMonth = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    1
                )
                const endOfMonth = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    0
                )

                const expenses = await db.transaction.aggregate({
                    where: {
                        userId: budget.userId,
                        accountId: defaultAccount.id,
                        type: "EXPENSE",
                        date: {
                            gte: startOfMonth, //greater then equal to
                            lte: endOfMonth,
                        },
                    },
                    _sum: {
                        amount: true,
                    }
                })

                const totalExpenses = expenses._sum.amount?.toNumber() || 0
                const budgetAmount = budget.amount;
                const percentageUsed = (totalExpenses / budgetAmount) * 100;
                console.log(percentageUsed);


                if (percentageUsed >= 80 && (!budget.lastAlertSent || isNewMonth(new Date(budget.lastAlertSent), new Date()))) {
                    //send email
                    await sendEmail({
                        to: budget.user.email,
                        subject: `Budget Alert for ${defaultAccount.name}`,
                        react: EmailTemplate({
                            username: budget.user.name,
                            type: "budget-alert",
                            data: {
                                percentageUsed,
                                budgetAmount: parseInt(budgetAmount).toFixed(1),
                                accountName: defaultAccount.name
                            }
                        })
                    })

                    //update lastalertsent
                    await db.budget.update({
                        where: { id: budget.id },
                        date: { lastAlertSent: new Date() }
                    })
                }
            })
        }
    }
);

function isNewMonth(lastAlertSent, current) {
    return (
        lastAlertSent.getMonth() !== currentDate.getMonth() || lastAlertSent.getFullYear() !== currentDate.getFullYear()
    )
}

//function to automatically add the recurring trasnaction
export const triggerRecurringTransactions = inngest.createFunction(
    {
        id: "trigger-recurring-transaction",
        name: "Trigger Recurring Transactions"
    }, { cron: "0 0 * * *" }, //cron to execute every midnight
    async ({ step }) => {
        //1. fetch all recurring transactions
        const recurringTransactions = await step.run(
            "fetch-recurring-transactions",
            async () => {
                return await db.transaction.findMany({
                    where: {
                        isRecurring: true,
                        status: "COMPLETED",
                        OR: [
                            { lastProcessed: null }, //never processed
                            { nextRecurringDate: { lte: new Date() } } // due date passed
                        ]
                    }
                })
            }
        )
        // 2. create eventss for each transaction
        if (recurringTransactions.length > 0) {
            const events = recurringTransactions.map((transaction) => ({
                name: "transaction.recurring.process",
                data: { transactionId: transaction.id, userId: transaction.userId },
            }))

            //3. send events to be processed
            await inngest.send(events)
        }

        return { triggered: recurringTransactions.length }
    }
)

export const processRecurringTransactions = inngest.createFunction({
    id: "process-recurring-transction",
    throttle: {
        limit: 10,
        period: "1m", // per minute
        key: "event.data.userId" //per user
    },
},

    { event: "transaction.recurring.process" },

    async ({ event, step }) => {
        //validate event data
        if (!event?.data?.transactionId || !event?.data?.userId) {
            console.error("Invalid event data: ", event);
            return { error: "Missing required event data" }
        }

        await step.run("process-transaction", async () => {
            const transaction = await db.transaction.findUnique({
                where: {
                    id: event.data.transactionId,
                    userId: event.data.userId
                },
                include: {
                    account: true
                }
            })

            if (!transaction || !isTransactionDue(transaction)) return;

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
                        isRecurring: false
                    }
                })

                //update account balnce
                const balanceChange = transaction.type === "EXPENSE" ? -transaction.amount.toNumber() : transaction.amount.toNumber()

                await tx.account.update({
                    where: { id: transaction.accountId },
                    data: { balance: { increment: balanceChange } }
                })

                //update last processed date and next recurring date
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        lasstProcessed: new Date(),
                        nextRecurringDate: calculateNextRecurringDate(
                            new Date,
                            transaction.recurringInternval
                        )
                    }
                })
            })
        })
    }
)

function isTransactionDue(transaction) {
    //If no lastProcessed date, transaction is due
    if (!transaction.lastProcessed) return true;

    const today = new Date()
    const nextDue = new Date(transaction.nextRecurringDate)

    //compare with next due date
    return nextDue <= today
}

function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate)

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setDate(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setDate(date.getFullYear() + 1);
            break;
    }

    return date;
}

export const generateMonthlyReports = inngest.createFunction(
    {
        id: "generate-monthly-reports",
        name: "Generate Monthly Reports"
    },
    { cron: "0 0 1 * *" },
    async ({ step }) => {
        const users = await step.run("fetch-users", async () => {
            return await db.user.findMany({
                include: { accounts: true }
            })
        })

        for (const user of users) {
            await step.run(`generate-report-${user.id}`, async () => {
                const lastMonth = new Date()
                lastMonth.setMonth(lastMonth.getMonth() - 1)

                const stats = await getMonthlyStats(user.id, lastMonth)
                const monthName = lastMonth.toLocaleString("default", {
                    month: "long"
                })

                const insights = await generateFinancialInsights(stats, monthName)

                await sendEmail({
                    to: user.email,
                    subject: `Your Monthly Financial Report - ${monthName}`,
                    react: EmailTemplate({
                        username: user.name,
                        type: "monthly-report",
                        data: {
                            stats,
                            month: monthName,
                            insights
                        }
                    })
                })
            })
        }

        return { processed: users.length }
    }
)

async function generateFinancialInsights(stats, month) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: ₹${(stats.totalIncome).toFixed(2)}
    - Total Expenses: ₹${(stats.totalExpenses).toFixed(2)}
    - Net Income: ₹${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
    - Expense Categories: ${Object.entries(stats.byCategory)
            .map(([category, amount]) => `${category}: ₹${amount.toFixed(2)}`)
            .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim()

        return JSON.parse(cleanedText)
    } catch (error) {
        console.error("Error generating insights:", error);
        return [
            "Your highest expense category needs attention.",
            "Consider setting up a budget for better financial management.",
            "Track your recurring expenses to identify portential savings."
        ]
    }
}

const getMonthlyStats = async (userId, month) => {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    const transactions = await db.transaction.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate
            },

        }
    })

    return transactions.reduce(
        (stats, t) => {
            const amount = t.amount.toNumber()
            if (t.type === "EXPENSE") {
                stats.totalExpenses += amount
                stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amount
            }
            else {
                stats.totalIncome += amount
            }
            return stats
        },
        {
            //generates a object with these 4 params and these are calculated based on the above cb function
            totalExpenses: 0,
            totalIncome: 0,
            byCategory: {},
            transactionCount: transactions.length,
        }
    )
}