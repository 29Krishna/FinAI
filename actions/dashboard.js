"use server"

import { db } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

const serializeTransaction = (obj) => {
    const serialized = { ...obj }

    if (obj.balance) {
        serialized.balance = obj.balance.toNumber();
    }

    if (obj.amount) {
        serialized.amount = obj.amount.toNumber();
    }

    return serialized;
}

export async function createAccount(data) {
    try {
        const user = await currentUser()
        if (!user) throw new Error("Unauthorized!!")

        const dbUser = await db.user.findUnique({
            where: { clerkUserId: user.id }
        })
        if (!dbUser) {
            throw new Error("User not Found!!")
        }

        //convert balance to float before saving
        const balanceFloat = parseFloat(data.balance)
        if (isNaN(balanceFloat)) {
            throw new Error("Invalid balance amount!!")
        }

        // check if this is the user's first account
        const existingAccounts = await db.account.findMany({
            where: { userId: dbUser.id }
        })

        // Set isDefault to true if it's the first account or if explicitly requested
        const shouldBeDefault = existingAccounts.length === 0 || data.isDefault

        // if this account should be default, unset other defaults accounts
        if (shouldBeDefault) {
            await db.account.updateMany({
                where: { userId: dbUser.id, isDefault: true },
                data: { isDefault: false }
            })
        }

        const account = await db.account.create({
            data: {
                name: data.name,
                type: data.type,
                balance: balanceFloat,
                userId: dbUser.id,
                isDefault: shouldBeDefault
            }
        })

        const serializedAccount = serializeTransaction(account)
        revalidatePath("/dashboard")

        return { success: true, data: serializedAccount }
    } catch (error) {
        throw new Error(error.message)
    }
}

export async function getUserAccounts() {
    const user = await currentUser()
    if (!user) throw new Error("Unauthorized!!")

    const dbUser = await db.user.findUnique({
        where: { clerkUserId: user.id }
    })
    if (!dbUser) {
        throw new Error("User not Found!!")
    }

    const accounts = await db.account.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    transactions: true,
                },
            },
        },
    });
    const serializedAccount = accounts.map(serializeTransaction)

    return serializedAccount;
}

export async function getDashboardData() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized!")

    const user = await db.user.findUnique({
        where: { clerkUserId: userId },
    })

    if (!user) {
        throw new Error("User not found")
    }

    //get all user transactions
    const transactions = await db.transaction.findMany({
        where: {userId: user.id},
        orderBy:{date: "desc"}
    })

    return transactions.map(serializeTransaction)
}