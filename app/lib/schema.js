import { z } from "zod";

export const accountSchema = z
  .object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"]),
  balance: z.string().min(1, "Initial balance is required"),
  isDefault: z.boolean().default(false),
});

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().min(1, "Amount is required"),
    description: z.string().optional(),
    date: z.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
  })
  .superRefine((data, ctx) => { // to add checks (check multiple fields together)
  // validations -> using - data / ctx -> some function
    // if form is submitted -  If the transaction is marked as recurring (isRecurring = true),
    // then 'recurringInterval' must be provided, otherwise add a validation error:
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,  // Custom error code for validation
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"], // give error on the path (recurringInterval) - defined above!
      });
    }
  });
  // But superRefine is used when you want to check multiple fields together or apply special rules.

  // “If the user says the transaction is recurring, then they must also choose how often it repeats (daily, weekly, etc).”

// Because regular validation (like z.string().min(1)) only works field by field.
// But this rule needs to check two fields together:
// isRecurring (a checkbox)
// recurringInterval (a dropdown)
