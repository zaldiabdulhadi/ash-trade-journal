"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountDTO } from "@/lib/types";

const ALL_VALUE = "__all";

export function AccountSelector({ accounts }: { accounts: AccountDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("account") ?? ALL_VALUE;
  const active = accounts.find((a) => a.id === current);

  function onSelect(value: string | null) {
    if (value == null) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) params.delete("account");
    else params.set("account", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Select value={current} onValueChange={onSelect}>
      <SelectTrigger className="h-8 w-[150px] font-medium sm:w-[170px] md:w-[200px]">
        <Layers className="text-muted-foreground" />
        <SelectValue>
          {active ? active.name : "All Accounts"}
        </SelectValue>
      </SelectTrigger>
       <SelectContent>
        <SelectItem value={ALL_VALUE}>All Accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name || a.provider || a.id.substring(0, 8) + "..."}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}