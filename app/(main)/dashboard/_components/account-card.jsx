// This is a client-side React component
"use client";

// AccountCard shows an account.
// Shows account name, balance, type, income/expense.
// Has a Switch button → you can make it the default account.
// If successfully updated → shows a success message.
// If error happens → shows error message.

// Importing icons from lucide-react
import { ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";

// Importing UI components from shadcn-ui
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// React hook
import { useEffect } from "react";

// Custom hook to handle API calls (loading, error, data)
import useFetch from "@/hooks/use-fetch";

// Importing Card components from shadcn-ui
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// For page navigation (without reloading)
import Link from "next/link";

// Action to update account's "default" status
import { updateDefaultAccount } from "@/actions/account";

// Toast notifications (success, error messages)
import { toast } from "sonner";


// ----------------------
// Component Start
// ----------------------
// It means AccountCard is a React component that expects to receive a prop called account.
// account is passed from the parent component.
// It is not created inside AccountCard.
// It is given from outside when you use <AccountCard />.
export function AccountCard({ account }) {
  // Destructure account properties
  const { name, type, balance, id, isDefault } = account;

  // Setup useFetch to call "updateDefaultAccount" action
  const {
    loading: updateDefaultLoading, // loading status
    fn: updateDefaultFn,            // function to call API
    data: updatedAccount,           // returned updated account
    error,                          // error if any
  } = useFetch(updateDefaultAccount);

  // Function to handle toggle switch (set default account)
  const handleDefaultChange = async (event) => {
    event.preventDefault(); // stop Link navigation

    // If already default, don't allow turning it off
    if (isDefault) {
      toast.warning("You need at least 1 default account");
      return;
    }

    // Otherwise call API to update the default account
    await updateDefaultFn(id);
  };

  // Watch for changes in updatedAccount and show success toast
  useEffect(() => {
    if (updatedAccount?.success) {
      toast.success("Default account updated successfully");
    }
  }, [updatedAccount]);

  // Watch for error changes and show error toast
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update default account");
    }
  }, [error]);

  // JSX UI
  return (
    // Card UI with hover shadow
    <Card className="hover:shadow-md transition-shadow group relative">
      {/* Link to go to account details page */}
      <Link href={`/account/${id}`}>
        {/* Top section with name and switch */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {name}
          </CardTitle>

          {/* Switch to set/unset default account */}
          <Switch
            checked={isDefault} // show ON if default
            onClick={handleDefaultChange} // handle change
            disabled={updateDefaultLoading} // disable if loading
          />
        </CardHeader>

        {/* Middle section with balance and account type */}
        <CardContent>
          <div className="text-2xl font-bold">
            ${parseFloat(balance).toFixed(2)} {/* show balance nicely */}
          </div>
          <p className="text-xs text-muted-foreground">
            {type.charAt(0) + type.slice(1).toLowerCase()} Account
            {/* first letter capital, rest small */}
          </p>
        </CardContent>

        {/* Bottom section with Income/Expense labels */}
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            Expense
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}