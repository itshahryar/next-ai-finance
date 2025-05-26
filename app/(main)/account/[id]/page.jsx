import { Suspense } from "react";
import { getAccountWithTransactions } from "@/actions/account";
import { BarLoader } from "react-spinners";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";

export default async function AccountPage({ params }) {

    //  getAccountWithTransactions() is a function (you wrote it in @/actions/account)
    //  It fetches account info + transactions from the database.
  const accountData = await getAccountWithTransactions(params.id);

  if (!accountData) {
    notFound();
  }

//   If accountData looks like:
//     {
//     id: 1,
//     name: "My Bank",
//     type: "CHECKING",
//     balance: 500,
//     _count: { transactions: 5 },
//     transactions: [ /* list of transactions */ ]
//     }
//     **you will get**:
//     transactions → only the list of transactions
//     account → everything else (id, name, type, balance, _count)
  // ✅ Take transactions out separately
  // ✅ Put everything else inside a new object called account.
  // { transactions, ...account } = separate kar diya transactions aur account ko.
  // Taake chart aur table ko sirf transactions pass kar saken,
  // aur heading me account name / balance show kar saken.
  const { transactions, ...account } = accountData;

  return (
    <div className="space-y-8 px-5">
        {/* Left side - Account name and type */}
      <div className="flex gap-4 items-end justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-title capitalize">
            {account.name}
          </h1>
          <p className="text-muted-foreground">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "} {/* Account type: First letter capitalized */}
            Account
          </p>
        </div>

        {/* Right side - Balance and number of transactions */}
        <div className="text-right pb-2">
          <div className="text-xl sm:text-2xl font-bold">
            ${parseFloat(account.balance).toFixed(2)}   {/* Show account balance with two decimal places */}
          </div>
          <p className="text-sm text-muted-foreground">
            {account._count.transactions} Transactions
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <AccountChart transactions={transactions} />
      </Suspense>

      {/* Transactions Table */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <TransactionTable transactions={transactions} />
      </Suspense>
    </div>
  );
}
