"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTradeForm } from "@/components/journal/trade-form-context";
import { cn } from "@/lib/utils";

export function AddTradeButton({
  accountId,
  className,
  variant = "default",
  size = "default",
}: {
  accountId?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "xs";
}) {
  const { openCreate } = useTradeForm();
  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      onClick={() => openCreate(accountId)}
    >
      <Plus data-icon="inline-start" />
      Add Trade
    </Button>
  );
}