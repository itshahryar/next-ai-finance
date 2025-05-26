import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/header";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SmartFinance AI",
  description: "Ai Integrated Finance app with nexts",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
    <html lang="en">
        <body className={`${inter.className}`}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <Toaster richColors />

        <footer className="bg-blue-50 py-12">
            <div className="container mx-auto px-4 text-center text-gray-600">
              <p>Made by Shahryar</p>
            </div>
          </footer>

      </body>
    </html>
    </ClerkProvider>
  );
}

