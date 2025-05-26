// Import the current user from Clerk's Next.js server SDK
import { currentUser } from "@clerk/nextjs/server";

// Import the Prisma client instance from your custom Prisma config
import { db } from "./prisma";

// This function checks if the current user exists in the database, and creates them if not
export const checkUser = async () => {
  // Get the currently authenticated user from Clerk
  const user = await currentUser();

  // If no user is authenticated (not logged in), return null
  if (!user) {
    return null;
  }

  try {
    // Try to find the user in the database using their Clerk user ID
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id, // match by Clerk's user ID
      },
    });

    // If the user exists in the database, return the user record
    if (loggedInUser) {
      return loggedInUser;
    }

    // If user is not found, construct a full name from Clerk's user data
    const name = `${user.firstName} ${user.lastName}`;

    // Create a new user record in the database using Clerk's user details
    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id, // store Clerk's user ID
        name, // user's full name
        imageUrl: user.imageUrl, // profile picture from Clerk
        email: user.emailAddresses[0].emailAddress, // first email address from Clerk
      },
    });

    // Return the newly created user record
    return newUser;
  } catch (error) {
    // Log any errors that occur during the database operations
    console.log(error.message);
  }
};
