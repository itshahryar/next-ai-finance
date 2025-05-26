"use client";

// Initializes a form using react-hook-form integrated with zod schema for validation.
// If in edit mode, populates the form with initial transaction data; otherwise, sets defaults for new transaction.
// Uses a custom useFetch hook to manage API calls for creating or updating a transaction.
// Defines a submit handler that parses amount to float and calls the appropriate API function (create/update).
// Integrates a receipt scanner component (only when adding new) that can auto-fill fields upon scanning.
// Watches form fields like type and isRecurring for dynamic UI changes and filters categories based on type.
// Uses Next.js useRouter and useSearchParams to handle navigation and get edit parameters.
// On successful form submission, shows a toast notification, resets the form, and navigates to the account page.
// Renders a form UI with inputs/selects for transaction type, amount, account, category, date, description, and recurring settings.
// Shows validation errors below inputs if any.
// Shows loading spinner on submit button while API request is in progress.

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({
    // These props are passed from a parent component
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {
  const router = useRouter();                       // Next.js router for navigation
  const searchParams = useSearchParams();           // Get URL parameters - like IDs or flags that affect what you display or do.
                                                    // (like ?edit=123) to know, for example, which item to edit.
  const editId = searchParams.get("edit");
//=================================================================================================================
  // Initialize react-hook-form with validation schema and default values
  const {
    register,                       // method to register input fields
    handleSubmit,                   // method to handle form submission
    formState: { errors },          // form errors object
    watch,                          // watch specific form fields for changes
    setValue,                       // manually set a field value
    getValues,                      // get current form values
    reset,                          // reset form fields
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:

    // If editing and initial data present, prefill form with it
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),                      // convert to string for input - Because HTML input fields expect strings, so numbers must be converted to strings for the input to show correctly.
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category,
            date: new Date(initialData.date),                           // convert to Date object - Because date inputs or date pickers often need a Date object, not just a string, to work properly.
            isRecurring: initialData.isRecurring,               // This just copies the value of isRecurring from the initial data into the form.
            // This is a conditional spread.
            // If initialData.recurringInterval has a value, then include recurringInterval in the form.
            // If it doesn’t have a value, then don’t add recurringInterval at all.
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }

          // Defaults when creating a new transaction
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id,     // accountId is set to the default account’s ID (the account marked as default in the list).
            date: new Date(),
            isRecurring: false,
          },
  });
//=================================================================================================================
  // Custom hook to handle transaction creation or update
  const {
    loading: transactionLoading,                                            // loading state
    fn: transactionFn,                                                      // function to call API
    data: transactionResult,                                                // response data from the server after the request finishes.
    // editMode ? updateTransaction : createTransaction means:
    // If you are editing an existing transaction (editMode is true), use the update function.
    // If you are creating a new one (editMode is false), use the create function.
  } = useFetch(editMode ? updateTransaction : createTransaction);
//=================================================================================================================
  // Form submit handler
  const onSubmit = (data) => {
    // Convert amount to float before sending + copies all the data
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    // editMode is passed as a prop - It is defined by the parent component
    // If editing, update the transaction - it calls the update function transactionFn with the transaction ID (editId) and the new data.
    if (editMode) {
      transactionFn(editId, formData);
    } 
    // If not, create a new transaction.
    else {
      transactionFn(formData);
    }
  };
//=================================================================================================================
// When receipt scanner finishes scanning
  const handleScanComplete = (scannedData) => {
    if (scannedData) {
      setValue("amount", scannedData.amount.toString());            // set amount field
      setValue("date", new Date(scannedData.date));                 // set date field
      if (scannedData.description) {
        setValue("description", scannedData.description);           // set description if present
      }
      if (scannedData.category) {
        setValue("category", scannedData.category);                 // set category if present
      }
      toast.success("Receipt scanned successfully");                // show success message
    }
  };
//=================================================================================================================
// Effect to respond to transaction result changes → React hook that watches for changes.
  useEffect(() => {
    // ✅ It means the API call is done and was successful.
    if (transactionResult?.success && !transactionLoading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      router.push(`/account/${transactionResult.data.accountId}`);
    }
  }, [transactionResult, transactionLoading, editMode]);
//=================================================================================================================
// Watch some fields for dynamic UI changes
  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");
//=================================================================================================================
// Filter categories based on selected type (expense/income)
  const filteredCategories = categories.filter(
    (category) => category.type === type
  );
//=================================================================================================================
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Show receipt scanner only when creating new transaction */}
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      {/* Transaction type select */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          onValueChange={(value) => setValue("type", value)}        // update form on change
          defaultValue={type}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount and Account */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Amount input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        {/* Account select */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            onValueChange={(value) => setValue("accountId", value)}
            defaultValue={getValues("accountId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>

            {/* Map user accounts as options */}
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (${parseFloat(account.balance).toFixed(2)})
                </SelectItem>
              ))}
              {/* Button to create a new account */}
              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      {/* Category select filtered by type - This block shows a dropdown menu where the user can select a category (like Food, Rent, etc.) for the transaction.*/}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          onValueChange={(value) => setValue("category", value)}
          defaultValue={getValues("category")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          {/* 👉 This contains all the dropdown options - It loops over filteredCategories: */}
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Date picker with popover */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => setValue("date", date)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Description validation error */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input placeholder="Enter description" {...register("description")} />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Recurring transaction toggle */}
      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <label className="text-base font-medium">Recurring Transaction</label>
          <div className="text-sm text-muted-foreground">
            Set up a recurring schedule for this transaction
          </div>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
      </div>

      {/* Show recurring interval select only if recurring is enabled */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select
            onValueChange={(value) => setValue("recurringInterval", value)}
            defaultValue={getValues("recurringInterval")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={transactionLoading}>
          {transactionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}

