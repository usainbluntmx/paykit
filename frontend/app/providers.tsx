"use client";

import { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const HELIUS_RPC = process.env.NEXT_PUBLIC_HELIUS_RPC!;

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ConnectionProvider endpoint={HELIUS_RPC}>
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}