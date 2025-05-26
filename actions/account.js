"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
// Import to refresh frontend pages after changes
import { revalidatePath } from "next/cache";

// ✅ Decimal is used for balance because:
// Money needs accuracy (no rounding errors).
// Decimal is better than float for handling amounts like 10.99, 250.75.
// No small mistakes like 0.1 + 0.2 = 0.3000004.
// Prisma works better with Decimal for finance-related fields.

// Helper function: Convert Prisma Decimal fields (like balance, amount) into normal numbers
// Because Prisma's Decimal type is not a normal number — it's an object.
// You cannot directly use it in JavaScript math, JSON, or frontend.
// So we convert it to a normal number using .toNumber()
const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();    // balance = Total current money in the account.
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();  // amount = Money involved in a single transaction (spend or receive).
  }
  return serialized;
};

// ===============================
// GET a specific Account + its Transactions
// ===============================
export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: {
      id: accountId,        // Account ID passed
      userId: user.id,      // Make sure this account belongs to this user
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },  // Include all transactions ordered by latest date
      },
      _count: {
        select: { transactions: true }, // Also include number of transactions
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
  };
}

// ===============================
// BULK DELETE multiple Transactions
// ===============================
export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Step 1: Find all the transactions that will be deleted
    // Get transactions to calculate balance changes
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    // Step 2: Calculate how much to adjust balances per account
    // Group transactions by account to update balances
    // We are finding for each account, kitna paisa increase ya decrease karna hai — based on deleted transactions.
    // Because jab hum transactions delete karte hain,
    // to account ka balance bhi update karna padta hai.
    // (kyunki wo transactions pehle balance me shamil the.)
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const change =
        transaction.type === "EXPENSE"
          ? transaction.amount              // Expense: add back the money
          : -transaction.amount;            // Income: subtract the money
      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {}); // acc (accumulator) is a collector inside reduce that helps you calculate
    // the final result across all transactions easily.
    // acc remembers and updates the answer while looping through the array.
    // 👉 acc collects and builds the final result step by step.
    //     In your code:
    //     You go through each transaction one by one.
    //     For each transaction:
    //     acc updates the balance for that accountId.
    //     At the end, acc holds final balance changes for all accounts
    // 🔥
    // We need acc because:
    // 👉 We want to collect and store results (balance changes per account) while looping through all transactions.
    // Without acc, you would have no place to save and update balances during the loop.

    // Step 3: Delete transactions and update account balances in a transaction
    await db.$transaction(async (tx) => {
      // Delete transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      // Update account balances - after Deletion
      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: balanceChange,     // Adjust balance
            },
          },
        });
      }
    });

    // Step 4: Refresh pages to show updated data
    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===============================
// Update the Default Account - Make all others non-default
// ===============================
export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // First, unset any existing default account
    // // Step 1: Remove default status from any existing default accounts
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Then set the new default account
    // // Step 2: Set the selected account - (using accountId passed in prams) as the new default
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
