import { seedTransactions } from "@/actions/seed";

export async function GET() {
  const result = await seedTransactions();      // When a GET request comes to this endpoint, it calls the seedTransactions() function.
  // await means it waits until seedTransactions() finishes running (because it's async).
  return Response.json(result);
}

// You are creating an API endpoint that will respond to GET requests.
// export means this function is exposed (can be accessed by the system/server).
// async because the seedTransactions() function does asynchronous (database) operations.

// When someone hits this GET endpoint,
// It runs seedTransactions() to create dummy transactions in the database,
// Then returns a JSON response showing success or failure!
