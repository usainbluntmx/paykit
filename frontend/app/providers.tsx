"use client";

import { ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const HELIUS_RPC = "https://devnet.helius-rpc.com/?api-key=9e6102c0-b874-4588-949c-d05694a4a34c";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ConnectionProvider endpoint={HELIUS_RPC}>
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}