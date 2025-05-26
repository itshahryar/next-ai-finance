// This allows us to interact with the database using Prisma's ORM features.
import { PrismaClient } from "@prisma/client";

// Check if a Prisma client instance already exists on the global object.
// If not, create a new instance. This is useful in development environments
// to avoid creating multiple Prisma clients during hot-reloads (e.g., in Next.js).
export const db = globalThis.prisma || new PrismaClient();

// If the current environment is not production,
// store the Prisma client instance in the global object.
// This ensures that during development (with hot-reloading),
// we reuse the same Prisma client instance instead of creating a new one every time.
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

// Prisma Client is your bridge between your backend app and your database.
// It lets you talk to the database using clean, readable code — without writing raw SQL.