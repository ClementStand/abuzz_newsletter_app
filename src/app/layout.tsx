
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ChatBubble from "@/components/chat/ChatBubble";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CompetitorHQ",
  description: "Daily Competitor Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
