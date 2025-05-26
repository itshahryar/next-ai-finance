"use server"; 
// Marks this file for server-side execution in Next.js App Router.
import { auth } from "@clerk/nextjs/server"; 
// Imports Clerk's server-side authentication helper.
import { db } from "@/lib/prisma"; 
// Imports Prisma client instance for database operations.
import { revalidatePath } from "next/cache"; 
// Allows revalidating cached paths (for ISR/SSG updates).
import { GoogleGenerativeAI } from "@google/generative-ai"; 
// Imports the Google Gemini AI SDK for generative tasks.
import aj from "@/lib/arcjet"; 
// Imports ArcJet configuration for rate limiting.
import { request } from "@arcjet/next"; 
// Imports a helper to wrap incoming request metadata (used by ArcJet).

// Initialize Gemini AI instance with API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to convert BigInt/Decimal Prisma amount to number
const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

/* -------------------------------------------------------------------------- */
/*                             CREATE TRANSACTION                             */
/* -------------------------------------------------------------------------- */

// Summary: Creates a new transaction and updates the account balance.

// Flow:
// 1. Authenticate user.
// 2. Check rate limit using ArcJet.
// 3. Validate account ownership.
// 4. Calculate balance change (based on income/expense).
// 5. Use Prisma transaction to:
//      Create the transaction.
//      Update the account balance.
// 6. Revalidate cache for dashboard and account.
// 7. Return success with transaction data.

// The data comes from the user input in the frontend UI. User fills a form on the frontend.
export async function createTransaction(data) {
  try {
    const { userId } = await auth(); // Get authenticated user's Clerk ID
    if (!userId) throw new Error("Unauthorized"); // ❌ If not logged in, throw an error

/* -------------------------------- ArcJet ------------------------------------------ */
// 📌 Real-life Example:

// Imagine a user clicks "Add Transaction" 100 times rapidly — this could:
//   Flood your database
//   Slow down the server
//   Cause bugs

// With ArcJet:
//   You can limit the number of actions (e.g., 10 per minute).
//   If user exceeds that, ArcJet denies the request and tells them to wait.

    // This line gets the current HTTP request object
    // — needed by ArcJet to check who made the request and from where.
    const req = await request(); // Get the current request object for ArcJet protection

    //                METHOD - aj.protect(...)
    // Asks ArcJet to approve or deny the request based on rate limiting
    // Apply ArcJet rate limiting policy
    // This method checks:
    //   Who made the request (userId)
    //   How many "tokens" they are trying to use

    //   ArcJet then decides:
    //   ✅ Allow the request
    //   ⛔ Deny it (e.g., too many requests in a short time — rate limit exceeded)
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Try to consume 1 token
    });

    // If rate limit exceeded / ⛔ What if the request is denied?
    // decision.isDenied()	Checks if the request should be blocked
    // reason.isRateLimit()	Specifically checks if it's due to too many requests (rate limit hit)
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });
        throw new Error("Too many requests. Please try again later.");
      }
      throw new Error("Request blocked"); // Blocked for another reason
    }
/* -------------------------------------------------------------------------- */
    // Fetch user from database using Clerk ID
    /* ------------------------------db.user------------------------------------- */
    // db.user is NOT a function by itself.
    // db is your database client instance.
    // user is a model/table name inside that client.

    // Your model is named User (uppercase) in the schema,
    // but when using it in code, the ORM changes it to db.user (lowercase) to access it.
    // So, db.user means your User model — just lowercase for code use.
    /* -------------------------------------------------------------------------- */
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    // Fetch account from DB to verify it belongs to the user
    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });
    if (!account) throw new Error("Account not found");

    /* ------------------------CALCULATIONS------------------------------ */
    // Calculate balance change (+ for income, - for expense)
    // Checks if the transaction is an expense or income:
    //    If it's an expense, the amount becomes negative.
    //    Then it adds/subtracts the amount to/from the current balance.
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;
    //-----------------------------------------------------------------------

    // Create transaction + update account balance using transaction block
    // ✅ What is db.$transaction?
    // It is used to run multiple database operations together safely.
    const transaction = await db.$transaction(async (tx) => {
        // 🧾 Create a new transaction:
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,  // All data fields (like amount, description, etc.)
          userId: user.id,    // The userId (linked to this user)
          nextRecurringDate:  // A nextRecurringDate if it’s a recurring transaction.
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval) 
              // This function calculates the next date for a recurring transaction.
              // neeche function likha hoa hai ta k utny days add kar den ... current k andar !!
              // Example: 
              // 💸 The next transaction will automatically happen on June 19, 2025 (i.e., one month after the original date).
              // If date = "2025-05-19" and interval = "MONTHLY" → returns "2025-06-19".
              : null,
        },
      });

      // Update account balance after transaction
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      // one is inside to get data....  just sends the saved transaction data back to your code for further use.
      return newTransaction;
    });

    // Revalidate dashboard and account path to reflect changes
    // Both views depend on updated data, so we must revalidate both pages to keep everything fresh and correct.
    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    // is the final return from the function, sending a clean, usable response to the caller/ frontend.
    // the other is to send data out.
    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                            GET SINGLE TRANSACTION                          */
/* -------------------------------------------------------------------------- */
export async function getTransaction(id) {
  // GET Authenticate user ID from Clerk auth
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Find user in the database by their Clerk ID
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  // Find transaction by ID and ensure it belongs to user
  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

/* -------------------------------------------------------------------------- */
/*                            UPDATE TRANSACTION                              */
/* -------------------------------------------------------------------------- */
export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    // Get the original transaction from the DB, including its linked account
    // “Linked account” means the account related to that transaction.
    // “Linked account” can be any bank account or financial account where the transaction happened.
    // Example:
    // If you spend money from your savings account, that savings account is the linked account.
    // If you get money in your checking account, that checking account is the linked account.
    // It means the account connected to that transaction.
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,                   // transaction ID to update
        userId: user.id,      // must belong to the logged-in user
      },
      include: {
        account: true,    // also get related account details
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");
    /* ------------------------CALCULATIONS------------------------------ */
    // Calculate old and new balance change

    // Calculate the old balance change caused by the original transaction
    // If it was an expense, amount is negative, else positive for income
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    // Calculate the new balance change based on updated data
    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    // Calculate the net difference in balance change (new - old) / This tells how much to adjust the account balance
    const netBalanceChange = newBalanceChange - oldBalanceChange;
    /* ----------------------------------------------------------------- */

    // Update transaction and balance in DB
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                           GET ALL USER TRANSACTIONS                        */
/* -------------------------------------------------------------------------- */

/* ----------------------------query--------------------------------- */
// 🧩 query is a parameter of the function, so it comes from wherever you call this function.

// ...query is called the spread operator.
// It takes all the properties inside the query object and adds them one by one into the place where it is used.

// 🔹 findMany — fetches many records, so you can add filters (...query) to get only some of them.
// 🔹 findUnique — fetches one record by unique key, so no filters like ...query are needed or used.

// 📥 In this function, it means:
// If you give some filters like { category: "food", date: "2025-05-20" } in query, those filters will be added to the search conditions.
//  🔍  So, only transactions matching those filters will be fetched.
//  🧾 If you give an empty query (no filters), it fetches all transactions for the user.

// ✅ In simple words: ...query lets you filter the results by any fields you want, but it’s optional.
/* ------------------------------------------------------------------ */
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query, // Optional filters (like date, category, etc.)
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc", // Most recent first
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                             SCAN RECEIPT IMAGE                             */
/* -------------------------------------------------------------------------- */
export async function scanReceipt(file) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // -------------------------------------------------------------------
    //                      Why do we need this binary (ArrayBuffer)?
    // The file on your computer is made of binary data — raw 0s and 1s.
    // Before sending, you first read this raw binary data into memory as an ArrayBuffer.
    // This lets your program access the exact bytes of the image and To work with the file content in JavaScript.
    // This lets us read or convert the file data properly.

    //                      Why convert binary to Base64 string?
    // Raw binary can’t be sent easily over text-based protocols like HTTP:
    // because it may contain bytes that break the format.

    // Base64 is a way to encode binary data into plain text (letters, numbers, +, /):
    // which can safely travel over the internet.

    // Base64 is a way to represent binary data as text using only letters, numbers, and symbols.
    // Many APIs, like the AI model here, expect image data as a text string (because it’s easier to send over the internet).
    // -------------------------------------------------------------------
    // Convert the uploaded file into an ArrayBuffer (raw binary data)
    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64"); // Convert to base64

    // Prompt to instruct Gemini on how to analyze receipt
    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )

      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object
    `;

    // Send request to Gemini with the image data + prompt
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,     // The receipt image data / This is the actual receipt image, but in base64 format.
          mimeType: file.type,    // The file type you are sending (like image/png or image/jpeg)
        },
      },
      prompt,
    ]);

    // Wait for the AI model's response
    const response = await result.response;

    // Extract the text from the response
    const text = response.text();
    
    // ✅ PURPOSE:
    // Gemini sometimes returns its output inside Markdown code block tags, like this:
    // ```json
    // {
    //   "amount": 12.34,
    //   "date": "2025-05-21",
    //   "description": "Milk and Bread",
    //   "merchantName": "SuperMart",
    //   "category": "groceries"
    // }
    // ```
    // These triple backticks (``` or ```json) are used in formatting, but they are not valid JSON.

    // 🛑 PROBLEM:
    // If we try to parse this response directly using JSON.parse(), it will throw an error because
    // JSON.parse() expects *only* valid JSON, not markdown code blocks or extra characters.

    // 🔧 SOLUTION:
    // Use a regular expression to remove any ``` or ```json from the start/end of the string.
    // `.replace(/```(?:json)?\n?/g, "")` finds and removes:
    // - ```
    // - ```json
    // - The newline (\n) after the tag, if present.

    // ✅ RESULT:
    // Now the cleaned text looks like valid JSON only, and JSON.parse() can convert it to an object
    // without crashing or throwing an error.
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim(); // Clean code blocks

    try {
      // cleanedText is a string from Gemini AI,
      // but to use it in your code as data (like numbers, dates, texts),
      // you need it as a JavaScript object.
      const data = JSON.parse(cleanedText); // Parse Gemini response.... It converts the cleaned text (string) into a JavaScript object.
      return {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: data.category,
        merchantName: data.merchantName,
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error("Failed to scan receipt");
  }
}

/* -------------------------------------------------------------------------- */
/*                  CALCULATE NEXT DATE FOR RECURRING PAYMENTS                */
/* -------------------------------------------------------------------------- */
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

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
