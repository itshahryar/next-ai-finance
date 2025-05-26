import { inngest } from "./client";
import { db } from "@/lib/prisma";
// Import email template for rendering emails
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";           // Function to send email
import { GoogleGenerativeAI } from "@google/generative-ai"; // Google Generative AI SDK

/* 
---------------------------------------------
1. Recurring Transaction Processing Function with Throttling:

Purpose:
This is the actual function that processes the transaction (like charging the user, updating their records, etc.).

What it does:
It is triggered by the event sent from triggerRecurringTransactions.

It performs the business logic to charge the user, update their records, etc.

1️⃣ Event Listener Setup
What it does: Tells Inngest to run this function when this event is sent.
Why: So you can trigger the function only when needed (e.g. on a schedule or by another process).

2️⃣ Throttle Setup
What it does: Limits to max 10 runs per minute per user.
Why: Prevents overloading the system or double-charging users by mistake (e.g. retries or bugs).

3️⃣ Extract User ID
What it does: Pulls the user ID from the event.
Why: You need the user ID to find and charge their transaction.

4️⃣ Get Latest Transaction
What it does: Fetches the most recent recurring transaction for the user.
Why: You only want to process the latest transaction, not an old one.

5️⃣ Check If Already Processed
What it does: Checks if the transaction is missing or already processed.
Why: Prevents duplicate charges.

6️⃣ Charge the User
What it does: Actually charges the user's payment method.

7️⃣ Return Result
What it does: Returns a success response with the charge result.

A recurring transaction is a transaction that happens again and again at regular intervals automatically, for example:
💳 Netflix subscription every month
🏠 Monthly rent
💡 Electricity bill every 30 days
💼 Salary given every 1st of the month
So we automate these using code instead of making the user re-enter them every time.

🤔 Why Not Process Too Frequently?
Let’s say a user has a subscription that is charged once per month.
If your system runs the function 10 times per minute for that user by mistake:
🔴 What can go wrong?
💸 The user is charged many times instead of once
📉 Their account balance may become incorrect

🛡️ Why Throttle?
To protect users and your app, we use throttling, which means:
Limit how often a transaction can be processed per user.

⚠️ Misunderstanding:
“Agar function 10 times chale aur har dafa paisay cut ho to to 10x ho gya na?”
No. That’s exactly what a well-designed function should prevent.

✅ What Actually Happens:
Inside your recurring transaction function, you usually check:
Has this transaction already been processed this month?
If yes → ❌ Don’t do it again
If no → ✅ Proceed and charge

Your code checks if a transaction has already been processed for the user in a given month. So, if the function runs more than once, it will check and skip the extra charges if the user has already been charged.
****Why Do We Need Throttling Then?

Throttling prevents multiple triggers of the same function within a short period.
For example, if your function is triggered 50 times in a second, each time it could process a transaction
— even if the code says "don’t do it again."

If your system isn’t throttled, you might end up running into problems like server issues,
retries, or bugs that trigger the function too many times, even though the logic says "skip."

💡 Throttling doesn't allow multiple successful payments — it limits function execution, not actual charges.

⚙️ Throttling limits how often a function can run, even if the code checks if a transaction has already been processed.
🛑 Without throttling:
The function might be triggered many times in a short period (e.g., due to retries or errors) 🔄,
wasting system resources even if the code prevents duplicate payments. 💸

✅ With throttling:
It ensures the function only runs a limited number of times (e.g., 10 times per minute) ⏱️,
preventing unnecessary processing and reducing load on the system. 🚀
---------------------------------------------
*/
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10, // Process 10 transactions - So, for each unique userId,
      // only 10 recurring transactions can be processed per minute.
      // This prevents server overload if one user has many transactions.

      period: "1m", // per minute
      key: "event.data.userId", // Throttle per user (prevent spamming)
    },
  },
    // 💡 This tells Inngest:
    // When should this function run?
    // It listens for an event named transaction.recurring.process.
    // Whenever we send this event using inngest.send(), this function is triggered.
    // 💡 The event transaction.recurring.process is a custom event you define in your code to trigger a function in Inngest.
  { event: "transaction.recurring.process" },       // Triggered by this event name
  async ({ event, step }) => {
    // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }

    // Step to process transaction
    await step.run("process-transaction", async () => {
        // Find the transaction and include account info
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: {
          account: true,    //  🔍 Why use include?
        //   When you write include: { account: true }, it means:
        //   👉 "Also bring the related account details with this transaction."
        },
      });

      // If transaction not found or not due, skip
      if (!transaction || !isTransactionDue(transaction)) return;

      // Create new transaction and update account balance in a transaction
      await db.$transaction(async (tx) => {
        // Create new transaction - // Run DB transaction for atomicity
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
          },
        });

        // Update account balance - // Calculate balance change
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

            // Update the account balance
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // Update last processed date and next recurring date
        // Update recurring transaction metadata
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
    });
  }
);

/* 
---------------------------------------------
2. 🔁 triggerRecurringTransactions —

Purpose:
This is like a scheduler or trigger.
It runs at a specific time (like every day at 12 AM) to check if there are any transactions that need to be processed (like monthly bills or rent).

What it does:
It doesn't process transactions itself.
It simply checks if any transactions are due (like monthly rent, subscription, etc.), and if yes, it sends an event to Inngest to trigger the next step.

📌 Meaning:
Ye function roz chalta hai (daily) aur check karta hai:
"Kis user ka transaction (jaise rent ya Netflix) repeat hona hai aaj?"

🧠 Why Needed?
Soch lo kisi user ka har month rent cut hota hai —
✅ Ye function har din check karega ki:
Aaj uska rent ka din hai?
Agar haan, to ek event bhejega (transaction.recurring.process) taake actual payment process ho jaye.

⚙️ Example:
👤 User A ka rent har 1 tareekh ko lagta hai.
🕐 triggerRecurringTransactions 1 tareekh ko subah check karega.
📤 Agar due hai to Inngest ko bolega:
"Chalao processRecurringTransaction function":
📌 Yani ye function chalay ga jo user ka rent process karega (payment katay ga, date update karega, etc.)

1️⃣ Run every day
This function runs daily (automatically) using a schedule like "0 0 * * *" (means midnight daily).
🕛 "Run once daily to check who has payments due."

2️⃣ Get today's date
It gets the current date to compare with transaction due dates.
📅 "What date is today? Let me check if any user’s transaction is due."

3️⃣ Find due recurring transactions
It searches the database for all transactions that:
Are recurring
Have a nextPaymentDate equal to today
🔍 "Find all transactions that are scheduled for today."

4️⃣ Trigger process event
For every due transaction, it sends an event
📤 "Tell Inngest to now process this specific transaction."

5️⃣ Inngest handles the event
This event starts the function processRecurringTransaction to actually charge the user.
💳 "Okay, now charge the user and update payment history."

*/
// Trigger recurring transactions with batching
// 🕒 This runs every day at midnight to check which recurring transactions need to be processed.
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions", // Unique ID,
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" }, // Daily at midnight at 12am
  async ({ step }) => {
    // Step 1: Get all active recurring transactions that are due
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessed: null },  // Never processed
              {
                nextRecurringDate: {        // Due now or past
                  lte: new Date(),
                },
              },
            ],
          },
        });
      }
    );

    // Send event for each recurring transaction in batches
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));

      // Send events directly using inngest.send()
      await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
  }
);

/*
3. Monthly Report Generation
This function generates financial insights based on a user's financial data, like their:
income, expenses, and spending patterns for a particular month.

Setup: The function initializes an AI model using your API key.
Generate Prompt: It prepares a detailed prompt with financial data.
AI Response: The function sends the prompt to the AI and retrieves insights.
Clean Response: It cleans the response and formats it into a JSON array.
Return Insights: If successful, it returns the insights; if there’s an error, it returns default insights.

*/

// Asynchronous function to generate financial insights for a given month
// stats: This contains the financial data like total income, total expenses, and expense categories.
// It's usually fetched from a database or API based on the user's financial transactions.
// month: Provided by the user or dynamically set based on the current month.
async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);         // Initialize the Google Generative AI model using the API key stored in environment variables
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });     // Get the specific generative model (Gemini 1.5 flash) for generating content

  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: $${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    // Send the prepared prompt to the model
    const result = await model.generateContent(prompt);
    // Get the response from the model
    const response = result.response;
    // Extract the text content from the response
    const text = response.text();
    // Clean the text to remove any unnecessary formatting (like code block markers)
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    // Parse the cleaned text into a JSON array of strings (the insights) and return it
    return JSON.parse(cleanedText);
     // If there’s an error during the AI model processing, log the error and return default insights
     // If the AI model fails to generate insights (due to an error), the catch block is triggered.
     // The error is logged to the console with console.error("Error generating insights:", error);.
     // Then, it returns all three default insights as an array:
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}

/*
4. This function generates monthly financial reports for users.

1. Schedule:
It runs automatically on the first day of each month, as specified by the cron expression 0 0 1 * *.

2. Fetch Users:
The fetch-users step retrieves all users from the database, along with their associated account details (include: { accounts: true }).

3. Generate Report for Each User:
For each user, it does the following:

i). Last Month's Stats:
It calculates the stats for the last month (using setMonth(lastMonth.getMonth() - 1)).

ii). Financial Insights:
It uses the generateFinancialInsights function to analyze the financial data and generate 3 actionable insights.

iii). Send Email:
An email is sent to the user with the financial report, including the stats and insights for the last month.

4. Final Output:
After processing all users, it returns the number of users processed: { processed: users.length }.
To:
1️⃣ Track success: Shows how many users were processed.
2️⃣ Monitor issues: Useful for debugging if not all users were processed.
3️⃣ Confirm completion: Confirms that the task is finished.
4️⃣ Assist in workflows: Helps trigger next steps in automation or systems.
*/

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" }, // First day of each month
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });

        // Generate AI insights
        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// 3. Budget Alerts with Event Batching
/*
🔧 Function Definition:
checkBudgetAlerts: Defines the function to check for budget alerts.

🕒 **cron: "0 /6 * * ":
Runs the function every 6 hours (using cron schedule).

📊 Fetch Budget Data:
db.budget.findMany: Fetches all budgets from the database, including the related user and their default accounts.
include: { user: { include: { accounts: { where: { isDefault: true }}}}}: Fetches the user's default account along with the budget.

🔄 Loop Through Budgets:
Iterates through each budget and checks if the user has a default account to proceed with the checks.

💸 Transaction Calculations:
db.transaction.aggregate: Aggregates (sums) the transaction amounts where the transaction type is an expense.

📈 Budget Usage Calculation:
percentageUsed: Calculates how much of the budget has been used by dividing total expenses by the budget amount.

⚠️ Condition to Send Alert:
If the budget usage is 80% or more, and if an alert has either not been sent yet or the alert was sent in a previous month, it sends an alert.

📧 Send Email:
Sends an email to the user notifying them that their budget is near or has exceeded 80%.

🔄 Update Last Alert Sent:
Updates the database to mark that the alert has been sent.
*/

export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" }, // Every 6 hours

  async ({ step }) => {
    // Fetch all budgets along with related user and account data
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {                       // Include user data related to each budget
            include: {
              accounts: {               // Include account details for the user
                where: {
                  isDefault: true,      // Filter to get only the default account
                },
              },
            },
          },
        },
      });
    });

    // Loop over each budget to check if an alert should be sent
    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];   // Get the first account, which is marked as default
      if (!defaultAccount) continue; // Skip if no default account

      // Check the budget for each user (within their default account)
      await step.run(`check-budget-${budget.id}`, async () => {
        // Using startDate.setDate(1) is just a convenient way to set the date to the 1st of the current month
        // without manually handling the year and month.
        const startDate = new Date();
        startDate.setDate(1); // Start of current month

        // Calculate the total expenses for the default account from the beginning of the month
        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,              // Filter transactions by the user ID
            accountId: defaultAccount.id,       // Filter by the default account ID
            type: "EXPENSE",                    // Only consider expenses, not income or other transaction types
            date: {
              gte: startDate,                   // Filter transactions from the start of the current month
            },
          },
          _sum: {   // Sum the amounts of these transactions
            amount: true,
          },
        });

         // Total expenses for the month; defaults to 0 if no expenses exist
        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount; // The set budget amount
        const percentageUsed = (totalExpenses / budgetAmount) * 100;    // Calculate percentage of the budget used

        // Check if the user has exceeded the budget by 80% or more, and if an alert should be sent
        if (
          percentageUsed >= 80 &&       // Check if the usage exceeds the threshold (80% of budget)
          // If no alert has been sent before, or if the last alert was sent in a previous month
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          await sendEmail({
            to: budget.user.email,                                      // Send to the user's email
            subject: `Budget Alert for ${defaultAccount.name}`,         // Email subject line
            react: EmailTemplate({
              userName: budget.user.name,                               // User's name to personalize the email
              type: "budget-alert",                                     // Type of the email template

              data: {
                percentageUsed, // Display the percentage used in the budget
                budgetAmount: parseInt(budgetAmount).toFixed(1),    // Display budget amount formatted to 1 decimal
                totalExpenses: parseInt(totalExpenses).toFixed(1),  // Display total expenses formatted to 1 decimal
                accountName: defaultAccount.name,   // Display the default account name in the email
              },
            }),
          });

          // Update the budget to track when the last alert was sent
          await db.budget.update({
            where: { id: budget.id },                   // Identify the budget by its ID
            data: { lastAlertSent: new Date() },        // Set the last alert sent date to the current date
          });
        }
      });
    }
  }
);

/*
lastAlertDate.getMonth(): This gets the month (0-11 months) of the lastAlertDate.
currentDate.getMonth(): This gets the month (0-11 months) of the currentDate.
If both months are different, it means the alert was sent in a previous month.

lastAlertDate.getFullYear(): This gets the full year of the lastAlertDate.
currentDate.getFullYear(): This gets the full year of the currentDate.
If the years are different, it means the alert was sent in a previous year.
*/
function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

// Utility functions

// To check whether a recurring transaction is due to be processed (e.g. rent, subscription).
// ✅ Example:
// nextRecurringDate: April 1, 2025
// today: April 30, 2025
// ➡️ It returns true — the transaction is due.
function isTransactionDue(transaction) {
  // If no lastProcessed date, transaction is due
  // 📅 No Previous Processing:
  if (!transaction.lastProcessed) return true;

  // 📆 Get Today's Date:
  const today = new Date();
  // ⏳ Get the Next Scheduled Date:
  const nextDue = new Date(transaction.nextRecurringDate);

  // Compare with nextDue date
  // ✅ If the nextDue date is today or earlier, then it's time to process the transaction.
  return nextDue <= today;
}

// To calculate the next due date for a recurring transaction (daily, weekly, monthly, or yearly).
// 🧠 The function takes:
// date: the current or last processed date
// interval: the type of recurrence (e.g. "DAILY", "MONTHLY")
// ✅ Example:
// If today is 2025-04-30 and interval is "MONTHLY"
// → This function will return 2025-05-30.
function calculateNextRecurringDate(date, interval) {
    // 📅 Make a copy of the given date (so the original doesn't get changed).
  const next = new Date(date);
  // 🔄 Check what type of recurrence it is. and move to next one!!!!
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// To get all transactions of a specific user for a specific month from the database.
// 🔧 This is an async function that takes:
// userId: the user whose data we need
// month: a date object (e.g. April 2025) to know which month we want stats for
async function getMonthlyStats(userId, month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);     // 📅 This creates the first day of the given month.
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);   // 📅 This gives the last day of that same month.

  // 🔍 Now it fetches all transactions from the database...
// 📌 ...where:
// the userId matches
// and the transaction date is between start and end of the month
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // To calculate total income, total expenses, and category-wise expense summary
  // from all transactions for the month.
  // 🔁 This uses .reduce() to go through each transaction t and build a stats object.

    // 📌 t is:
    //     Each individual transaction from the transactions array.
    //     It’s passed automatically by reduce() on every loop.
    // 📌 stats is:
    //     An accumulator object that stores and updates the total results (like income, expenses, etc.).
    //     It's passed back into the function on each loop, getting updated with each transaction.

    //  At the end, .reduce() returns the final stats object containing the monthly report.
  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();       // 💰 Converts the amount from a Decimal/BigInt to a plain number.
      // 🧾 If it’s an expense, add to the totalExpenses.
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        // 📊 It also adds the amount to its category (e.g. Food, Rent).
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        // 💵 If it’s not an expense, treat it as income and add to totalIncome.
        stats.totalIncome += amount;
      }
      return stats;
    },
    // 📦 This is the initial stats object, starting everything from 0.
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
}
