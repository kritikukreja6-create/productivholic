import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// NEW: Import the Toaster
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Productivholic",
  description: "The ultimate focus and accountability platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        {children}
        {/* NEW: Add the Toaster component */}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '12px',
            },
          }} 
        />
      </body>
    </html>
  );
}