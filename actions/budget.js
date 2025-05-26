"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// 📦 First function: Fetch current budget and current month's expenses
export async function getCurrentBudget(accountId) {
  try {
    // 🧑 Fetch the user from database using their Clerk User ID.
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // 💰 Fetch the first budget record for this user.
    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    // Get current month's expenses
    // 📅 Setup start and end dates for the current month.
    const currentDate = new Date();
    const startOfMonth = new Date(
        currentDate.getFullYear(),  // ➡️ year like 2025
        currentDate.getMonth(),     // ➡️ month like April (3 because 0-based)
        1                           // ➡️ day = 1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,       // ➡️ next month (so end of this month)
      0                                 // ➡️ day = 0 means last day of previous month
    );

    // aggregate means:
    // "Do some math (sum, average, count, etc.) on many records at once."
    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,                // 🎯 Belongs to this user
        type: "EXPENSE",                // ➖ Only expenses
        date: {
          gte: startOfMonth,            // 📅 From start of month
          lte: endOfMonth,              // 📅 Till end of month
        },
        accountId,
      },
      _sum: {
        amount: true,                   // ➕ Sum all 'amount' fields
      },
    });
    // 👉 Take all the amount values from the matching transactions
    // (only those filtered by userId, type, date, accountId)
    // and add them together (➕ sum them).

    // 👉 It is returning ONE object
    //     inside that object, there are two properties:
    //     budget: (your full budget info)
    //     currentExpenses: (your current month expenses)
    //     ✅ So only one thing is returned —
    //     ✅ but that thing has 2 parts inside.
    return {
    // 👉 If budget exists, return its data with amount converted to a normal number (from BigDecimal type).
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null, // ✅ No adding is happening. Only changing type is happening: for budget
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()   // ✅ No adding is happening. Only changing type is happening: for expense
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}

// 📦 Second function: Update the user's budget (or create if not exists)
export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Update or create budget
    // 🆙 Upsert means: Update if budget exists, otherwise Create a new budget.
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    // 🔄 Tell Next.js to refresh the "/dashboard" page (so new budget immediately appears without manual reload).
    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}
