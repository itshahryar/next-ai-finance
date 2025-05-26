// Tells Next.js this file will run on the client side
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form"; // For form handling
import { zodResolver } from "@hookform/resolvers/zod"; // To integrate Zod validation schema
import { Loader2 } from "lucide-react"; // Loading spinner icon
import useFetch from "@/hooks/use-fetch"; // Custom hook for API calls
import { toast } from "sonner"; // For toast notifications

// Importing UI components from your design system
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Actions and validation schema
import { createAccount } from "@/actions/dashboard"; // Server action to create account
import { accountSchema } from "@/app/lib/schema"; // Validation rules using Zod

// Component to create new account using a drawer UI

// @@@@@@@ childern @@@@@@@@
// The children prop allows you to embed any content you want inside the CreateAccountDrawer component.

// In React, children is like a box that holds whatever you put inside a component.

// <DrawerTrigger asChild>{children}</DrawerTrigger>
// This means that whatever content you pass inside the CreateAccountDrawer component
// (like a button, text, or any element) will be rendered inside the DrawerTrigger.

//If you want a button that opens the drawer when clicked, you could do something like this:
// <CreateAccountDrawer>
//  <Button>Create Account</Button>
// </CreateAccountDrawer>

// The Button is passed to CreateAccountDrawer as children.

// Inside CreateAccountDrawer, when you write {children}, React knows to put whatever you passed
// into the component (in this case, the Button) where {children} is used.

// It allows you to reuse the CreateAccountDrawer component
// and decide what content should trigger the opening of the drawer without modifying the
// CreateAccountDrawer code each time.
// It keeps the component modular and reusable.

export function CreateAccountDrawer({ children }) {
  // Drawer open/close state
  const [open, setOpen] = useState(false);

  // Setup react-hook-form with validation and default values
  const {
    register,           // register input fields / register to connect inputs to the form
    handleSubmit,       // form submit handler
    formState: { errors }, // access validation errors
    setValue,           // manually set field value
    watch,              // watch for real-time form values
    reset,              // reset form after submit
  } = useForm({
    resolver: zodResolver(accountSchema), // Zod schema resolver
    defaultValues: {
      name: "",
      type: "CURRENT",
      balance: "",
      isDefault: false,
    },
  });

  // useFetch hook to handle API call to create account
  const {
    loading: createAccountLoading, // loading state
    fn: createAccountFn, // function to call
    error,               // any error returned
    data: newAccount,    // response data
  } = useFetch(createAccount);

  // Submit handler to trigger API call
  const onSubmit = async (data) => {
    await createAccountFn(data);
  };

  // Show success toast and reset form when account is created
  useEffect(() => {
    if (newAccount) {
      toast.success("Account created successfully");
      reset();        // clear the form
      setOpen(false); // close the drawer
    }
  }, [newAccount, reset]);

  // Show error toast if there is any error
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to create account");
    }
  }, [error]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* Trigger to open drawer */}
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      {/* Drawer content box */}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create New Account</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Account Name
              </label>
              <Input
                id="name"
                placeholder="e.g., Main Checking"
                {...register("name")}
              />
              {/* Show error if name is invalid */}
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Account type selection */}
            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Account Type
              </label>
              <Select
                onValueChange={(value) => setValue("type", value)}
                defaultValue={watch("type")}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                </SelectContent>
              </Select>
              {/* Show error if type is invalid */}
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            {/* Balance input field */}
            <div className="space-y-2">
              <label
                htmlFor="balance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Initial Balance
              </label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("balance")}
              />
              {/* Show error if balance is invalid */}
              {errors.balance && (
                <p className="text-sm text-red-500">{errors.balance.message}</p>
              )}
            </div>

            {/* Set as Default Switch */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="isDefault"
                  className="text-base font-medium cursor-pointer"
                >
                  Set as Default
                </label>
                <p className="text-sm text-muted-foreground">
                  This account will be selected by default for transactions
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={watch("isDefault")}
                onCheckedChange={(checked) => setValue("isDefault", checked)}
              />
            </div>

            {/* Buttons: Cancel and Submit */}
            <div className="flex gap-4 pt-4">
              {/* Cancel button closes the drawer */}
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>

              {/* Submit button, shows spinner while loading */}
              <Button
                type="submit"
                className="flex-1"
                disabled={createAccountLoading}
              >
                {createAccountLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
