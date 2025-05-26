"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBudget } from "@/actions/budget";

export function BudgetProgress({ initialBudget, currentExpenses }) {
    // State for whether we are currently editing the budget.
  const [isEditing, setIsEditing] = useState(false);
  
  // State to hold the new budget value while editing.
  // ❓Why not just use useState("") directly?
    // Because we want to show the current budget amount in the input when the page loads.
    // We don't use just "" because we want to pre-fill the input with the current budget.
  const [newBudget, setNewBudget] = useState(
    initialBudget?.amount?.toString() || ""     // So, newBudget becomes "500" (string form).
    // If budget exists → show "500" in input.
    // If not → fallback to empty string "".

    // The input needs a string, not a number.
    // So we convert 500 → "500" using .toString().
  );

  // useFetch custom hook setup for updating budget
  const {
    loading: isLoading,
    fn: updateBudgetFn,
    data: updatedBudget,
    error,
  } = useFetch(updateBudget);

  // Calculate the percentage of budget used
  const percentUsed = initialBudget
    ? (currentExpenses / initialBudget.amount) * 100
    : 0;

  // Function to handle updating the budget
    // asynchronous function — it talks to the server or database, which takes time.
    // await - Wait for server to finish updating
  const handleUpdateBudget = async () => {
    // newBudget is a string (like "500"), since it comes from an <input>.
    // But we need a number to do math or send it to backend.
    const amount = parseFloat(newBudget);   // Convert the new budget to number // "500" → 500

    // If not a valid number or <= 0, show error toast
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Call the update function
    await updateBudgetFn(amount);
  };

  // Function to cancel editing and reset input
  const handleCancel = () => {
    setNewBudget(initialBudget?.amount?.toString() || "");  // Reset input value
    setIsEditing(false);    // Exit editing mode
  };

  // When updatedBudget changes and update was successful
//   ✅ What happens?
//     You click ✅ (Check) to update budget
//     updateBudgetFn() runs → sends data to backend
//     When backend replies, updatedBudget gets the result
//     This triggers useEffect
//     Inside useEffect, we:
//     ❌ Close the input (setIsEditing(false))
//     ✅ Show success message (toast.success(...))
  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);                              // Exit editing mode
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]); // This useEffect runs only when updatedBudget changes.
  // It holds the response after calling updateBudgetFn() (like success or error).

  // When there's an error, show an error toast
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update budget");
    }
  }, [error]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">
            Monthly Budget (Default Account)
          </CardTitle>

          {/* Budget amount or input field if editing */}
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32"
                  placeholder="Enter amount"
                  autoFocus
                  disabled={isLoading}
                />
                {/* Check button to submit */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUpdateBudget}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                {/* Cancel button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <>
                {/* Show current budget usage if not editing */}
                <CardDescription>
                  {initialBudget
                    ? `$${currentExpenses.toFixed(
                        2
                      )} of $${initialBudget.amount.toFixed(2)} spent`
                    : "No budget set"}
                </CardDescription>
                {/* Edit button to enable editing mode */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      {/* Card content showing the progress bar */}
      <CardContent>
        {initialBudget && (
          <div className="space-y-2">
            <Progress
              value={percentUsed}
              extraStyles={`${
                // add to Progress component
                percentUsed >= 90
                  ? "bg-red-500"
                  : percentUsed >= 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
            />
            <p className="text-xs text-muted-foreground text-right">
              {percentUsed.toFixed(1)}% used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
