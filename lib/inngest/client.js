import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "finance-platform", // Unique app ID
  name: "Finance Platform",
  // Optional custom retry function to define how retries are handled for failed function
  retryFunction: async (attempt) => ({
    // Introduces a delay before retrying: 2^attempt * 1000 milliseconds
    // e.g., for attempt 1 → 2^1 * 1000 = 2000ms delay
    delay: Math.pow(2, attempt) * 1000,
    // Sets the maximum number of retry attempts to 2
    maxAttempts: 2,
  }),
});