import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayKit — AI Agent Payments on Solana",
  description: "SDK de pagos para agentes de IA autónomos en Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}