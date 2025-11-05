import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "./providers/WalletProvider";
import Navbar from "./components/Navbar";
import Sidebar from './components/Sidebar';
import RequestStatusMonitor from './components/RequestStatusMonitor';
import ReceiverNotificationMonitor from './components/ReceiverNotificationMonitor';
import { ThemeProvider } from './components/ThemeProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cofounder - Web3 Developer Collaboration",
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
          <ThemeProvider>
            {/* Temporarily disabled to avoid rate limiting */}
            {/* <RequestStatusMonitor /> */}
            {/* <ReceiverNotificationMonitor /> */}
            <Sidebar />
            <div className="ml-64">
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
