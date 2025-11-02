import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "./providers/WalletProvider";
import Navbar from "./components/Navbar";
import { ToastContainer } from "./components/Toast";
import { NotificationProvider } from "./components/NotificationProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevCol - Web3 Developer Collaboration",
  description: "A decentralized platform for developers to collaborate on projects using Solana blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <NotificationProvider />
          <ToastContainer />
          <Navbar />
          <main className="min-h-screen bg-gray-900">
            {children}
          </main>
        </WalletContextProvider>
      </body>
    </html>
  );
}
