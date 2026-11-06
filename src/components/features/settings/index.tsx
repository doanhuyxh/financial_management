"use client";

import SettingsContextProvider from "@/components/features/settings/context";
import LedgerLockCard from "@/components/features/settings/components/ledger-lock-card";
import McpTokensCard from "@/components/features/settings/components/mcp-tokens-card";
import TransactionAuditList from "@/components/features/settings/components/transaction-audit-list";

export default function SettingsComponent() {
    return (
        <SettingsContextProvider>
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <LedgerLockCard />
                <TransactionAuditList />
                <McpTokensCard />
            </div>
        </SettingsContextProvider>
    );
}
