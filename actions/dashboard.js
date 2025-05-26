"use server";

import aj from "@/lib/arcjet";
// Importing Prisma database client instance
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
// Clerk's auth utility to get the currently authenticated user's ID
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Converts BigInt fields like balance and amount to JavaScript numbers,
 * because BigInt can't be sent directly to the frontend (JSON doesn't support it).
 */
const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber(); // Convert balance BigInt to number
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber(); // Convert amount BigInt to number
  }
  return serialized;
};


 // Fetches all accounts created by the currently logged-in user.
export async function getUserAccounts() {
  const { userId } = await auth(); // Get the current logged-in user's Clerk ID
  if (!userId) throw new Error("Unauthorized"); // If not logged in, throw error

  const user = await db.user.findUnique({
    where: { clerkUserId: userId }, // Look up the user in our DB using their Clerk ID
  });

  if (!user) {
    throw new Error("User not found"); // If no user found in DB
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id }, // Only get accounts belonging to this user
      orderBy: { createdAt: "desc" }, // Sort by latest first
      include: {
        _count: {
          select: {
            transactions: true, // Include the count of transactions in each account
          },
        },
      },
    });

    // Serialize BigInt values before returning to client
    const serializedAccounts = accounts.map(serializeTransaction);

    return serializedAccounts;
  } catch (error) {
    console.error(error.message); // Log any error
  }
}

/**
 * Creates a new account for the authenticated user.
 * Applies rate-limiting and sets account as default if it's the user's first account.
 */
export async function createAccount(data) {
  try {
    const { userId } = await auth(); // Get currently logged-in user's ID
    if (!userId) throw new Error("Unauthorized");

    const req = await request(); // Get ArcJet request (for rate limiting / bot protection)

    // Ask ArcJet if this request is allowed (rate limit check)
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Requesting 1 token
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason; // Get info about remaining tokens and reset time
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later."); // Rate limit error
      }

      throw new Error("Request blocked"); // Other ArcJet block reason
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId }, // Fetch user from DB again
    });

    if (!user) {
      throw new Error("User not found");
    }

    const balanceFloat = parseFloat(data.balance); // Convert balance to number
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount"); // If invalid number, throw error
    }

    // Check if this is the user's first account
    const existingAccounts = await db.account.findMany({
      where: { userId: user.id },
    });

    // Set default to true if it's the user's first account
    const shouldBeDefault = existingAccounts.length === 0 ? true : data.isDefault;

    // If this account is default, unset the current default account
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }, // Set all others to false
      });
    }

    // Create the new account
    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat, // Set parsed balance
        userId: user.id,       // Link account to user
        isDefault: shouldBeDefault, // Set default flag
      },
    });

    const serializedAccount = serializeTransaction(account); // Convert BigInt to number

    revalidatePath("/dashboard"); // Revalidate dashboard page (force refetch/update)

    return { success: true, data: serializedAccount }; // Return success response
  } catch (error) {
    throw new Error(error.message); // Catch any error and rethrow it
  }
}

/**
 * Gets all transactions for the authenticated user to display on the dashboard.
 */
export async function getDashboardData() {
  const { userId } = await auth(); // Get current user's ID
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId }, // Find user in our DB
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all transactions for this user, newest first
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction); // Return all transactions with BigInt converted
}
