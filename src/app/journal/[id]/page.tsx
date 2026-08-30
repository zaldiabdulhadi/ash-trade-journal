import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalPageContent } from "../journal-page-content";
import { getTrade } from "@/lib/data";

export const metadata: Metadata = { title: "Trade" };
export const dynamic = "force-dynamic";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  return <JournalPageContent trade={trade} />;
}
