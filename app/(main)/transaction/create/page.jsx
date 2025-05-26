// 🔍 Summary:
// This page handles both adding a new transaction and editing an existing one.
// If the URL contains a query param like ?edit=some_id, it fetches the transaction data and loads it into the form.
// It passes accounts, categories, edit mode, and initial data into the AddTransactionForm component to render a reusable form.

// Importing function to get user accounts (bank accounts, wallets, etc.) from the dashboard actions
import { getUserAccounts } from "@/actions/dashboard";
// Importing the default list of transaction categories (e.g., Food, Travel, etc.)
import { defaultCategories } from "@/data/categories";
// Importing the component for the form to add or edit a transaction
import { AddTransactionForm } from "../_components/transaction-form";
// Importing function to get a single transaction by ID (used for editing a transaction)
import { getTransaction } from "@/actions/transaction";

// Exporting an asynchronous React Server Component that renders the "Add Transaction" page
export default async function AddTransactionPage({ searchParams }) {
  // Fetch all user accounts (to choose from while adding a transaction)
  const accounts = await getUserAccounts();

  // Extract the `edit` parameter from the URL's query string
  // Example: /add-transaction?edit=123 → editId = 123
  const editId = searchParams?.edit;

  // Declare a variable to hold initial data if editing an existing transaction
  let initialData = null;

  // If `editId` exists, it means user is editing an existing transaction
  // The page looks at the URL to see if there is an edit ID (like ?edit=123).
  // If there is an edit ID, it means you are editing a transaction, so editMode is set to true.
  // If there is no edit ID, it means you are adding a new transaction, so editMode is false.
  // This editMode (true or false) is then sent to the form component so it knows if it should show the form for editing or adding.
  if (editId) {
    // Fetch the existing transaction details using the provided `editId`
    const transaction = await getTransaction(editId);
    // Assign the fetched transaction to `initialData` for pre-filling the form
    initialData = transaction;
  }

  // JSX returned by the component – the main UI
  return (
    <div className="max-w-3xl mx-auto px-5">
      {/* Header section with a title, centered on small screens and aligned left on medium+ screens */}
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">Add Transaction</h1>
      </div>

      {/* Render the AddTransactionForm component with required props */}
      <AddTransactionForm
        accounts={accounts} // user’s available accounts to choose from
        categories={defaultCategories} // predefined categories like Food, Rent, etc.
        editMode={!!editId} // boolean indicating whether we’re editing (true if editId exists)
        initialData={initialData} // pre-filled form data when editing
      />
    </div>
  );
}