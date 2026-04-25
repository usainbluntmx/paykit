import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PayKit — The Agent-Native Payment SDK for Solana",
  description: "Agent-native payment SDK for autonomous AI agents on Solana. Each agent owns its keypair, signs its own transactions, and operates within enforced spend limits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}