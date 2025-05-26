"use server";

import { db } from "@/lib/prisma";
// Importing a function to subtract days from a date (helps create past dates).
import { subDays } from "date-fns";

// Hardcoded dummy IDs for the account and user (used in the seed data).
const ACCOUNT_ID = "account-id";
const USER_ID = "user-id";

// Categories with their typical amount ranges
// Define categories with typical transaction ranges
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

// ----------------- Helper Functions -----------------

// Helper to generate random amount within a range // Function to generate a random amount between min and max
function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));    // Generate a random number within the given range and round it to 2 decimal places.
}

// Helper to get random category and amount based on the transaction type (INCOME/EXPENSE)
function getRandomCategory(type) {
    // Get the list of categories for the given type.
  const categories = CATEGORIES[type];
    // Pick a random category from that list.
  const category = categories[Math.floor(Math.random() * categories.length)];
    // Generate a random amount within the selected category's range.
  const amount = getRandomAmount(category.range[0], category.range[1]);
    // Return both category name and amount.
  return { category: category.name, amount };
}

// ----------------- Main Function -----------------
export async function seedTransactions() {
  try {
    // Generate 90 days of transactions
    // Array to store all generated transactions.
    const transactions = [];
    let totalBalance = 0;       // Variable to calculate the final account balance.

    // Loop over the last 90 days (including today)
    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);       // Create a date `i` days ago from today.

      // Generate 1-3 transactions per day
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        // 40% chance of income, 60% chance of expense  // Randomly decide the type (40% income, 60% expense).
        const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const { category, amount } = getRandomCategory(type);   // Get random category and amount based on type.

        const transaction = {
          id: crypto.randomUUID(),      // Generate a unique ID for the transaction.
          type,
          amount,
          description: `${              // Create a readable description (e.g., "Received salary" or "Paid for groceries").
            type === "INCOME" ? "Received" : "Paid for"
          } ${category}`,
          date,
          category,
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          createdAt: date,
          updatedAt: date,
        };

         // Adjust total balance (add for income, subtract for expense).
        totalBalance += type === "INCOME" ? amount : -amount;
        // Add the transaction to the list.
        transactions.push(transaction);
      }
    }

    // Insert transactions in batches and update account balance
    await db.$transaction(async (tx) => {
      // Clear existing transactions
      await tx.transaction.deleteMany({
        where: { accountId: ACCOUNT_ID },
      });

      // Insert new transactions
      await tx.transaction.createMany({
        data: transactions,
      });

      // Update account balance
      await tx.account.update({
        where: { id: ACCOUNT_ID },
        data: { balance: totalBalance },
      });
    });

    return {
      success: true,
      message: `Created ${transactions.length} transactions`,
    };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error.message };
  }
}
