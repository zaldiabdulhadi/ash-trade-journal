import type { Metadata } from "next";
import { getAllAccountsIncludingArchived } from "@/lib/data";
import { AccountsManager } from "@/components/accounts/accounts-manager";

export const metadata: Metadata = {
  title: "Accounts",
};

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await getAllAccountsIncludingArchived();
  return <AccountsManager accounts={accounts} />;
}