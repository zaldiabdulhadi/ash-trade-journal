"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Star,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  Building2,
  ImagePlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
  createAccount,
  deleteAccount,
  setAccountStatus,
  setDefaultAccount,
  updateAccount,
} from "@/app/actions/accounts";
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES } from "@/lib/constants";
import { formatCurrency, formatPnl, formatPercent } from "@/lib/formatters";
import type { AccountDTO, AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROP_TARGET_TYPES: AccountType[] = ["PROP_FIRM", "CHALLENGE", "FUNDED"];

function isPropTargetType(t: string): boolean {
  return PROP_TARGET_TYPES.includes(t as AccountType);
}

export function AccountsManager({ accounts }: { accounts: AccountDTO[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountDTO | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (a: AccountDTO) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, targetId: string) {
    setPendingId(targetId);
    try {
      const res = await fn();
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error ?? "Action failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Accounts"
        description={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${accounts.reduce((s, a) => s + a.tradeCount, 0)} tracked trades`}
      >
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" /> Add Account
        </Button>
      </PageHeader>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="No trading accounts yet."
          description="Create an account to start journaling trades."
          action={<Button onClick={openCreate}>Add Account</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const pnl = a.currentBalance - a.initialBalance;
            const pct = a.initialBalance > 0 ? (pnl / a.initialBalance) * 100 : 0;
            const archived = a.status === "ARCHIVED";
            return (
              <div
                key={a.id}
                className={cn(
                  "relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-opacity",
                  archived && "opacity-60"
                )}
              >
                {a.isDefault && (
                  <Badge
                    variant="outline"
                    className="absolute right-3 top-3 self-start border-primary/40 bg-primary/10 text-primary"
                  >
                    <Star className="size-3" /> Default
                  </Badge>
                )}
                <div className="flex items-start gap-2 pr-16">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-sm font-semibold">
                    {a.logoUrl ? (
                      <img
                        src={a.logoUrl}
                        alt={a.name}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      a.name
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.provider ?? ACCOUNT_TYPE_LABEL[a.type as keyof typeof ACCOUNT_TYPE_LABEL] ?? a.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Balance</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {formatCurrency(a.currentBalance, a.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-sm font-medium tabular-nums", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {formatPnl(pnl, a.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {a.initialBalance > 0
                        ? `${pnl >= 0 ? "+" : ""}${formatPercent(pct)}`
                        : "—"}
                    </div>
                  </div>
                </div>

                {(() => {
                  const targetPct = a.profitTargetPercent;
                  const hasTarget =
                    isPropTargetType(a.type) &&
                    targetPct != null &&
                    targetPct > 0 &&
                    a.initialBalance > 0;
                  if (!hasTarget) return null;
                  const targetAmount = (a.initialBalance * targetPct) / 100;
                  const progress = Math.max(0, Math.min(1, pnl / targetAmount));
                  const achieved = pnl >= targetAmount;
                  const remaining = Math.max(targetAmount - pnl, 0);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Target profit</span>
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            achieved ? "text-emerald-500" : "text-foreground"
                          )}
                        >
                          {Math.round(progress * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            achieved
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : "bg-primary"
                          )}
                          style={{ width: `${Math.max(progress * 100, 2)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                        <span>
                          {achieved
                            ? "Target reached"
                            : `${formatCurrency(remaining, a.currency)} remaining`}
                        </span>
                        <span>
                          {formatCurrency(targetAmount, a.currency)} · {targetPct}%
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL[a.type as keyof typeof ACCOUNT_TYPE_LABEL] ?? a.type}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="xs" />}
                      disabled={!!pendingId}
                    >
                      {pendingId === a.id ? <Loader2 className="size-3 animate-spin" /> : "Actions"}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{a.name}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEdit(a)}>
                        <Pencil /> Edit account
                      </DropdownMenuItem>
                      {!a.isDefault && (
                        <DropdownMenuItem
                          onClick={() => run(() => setDefaultAccount(a.id), a.id)}
                        >
                          <Star /> Set as default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {archived ? (
                        <DropdownMenuItem
                          onClick={() => run(() => setAccountStatus(a.id, "ACTIVE"), a.id)}
                        >
                          <ArchiveRestore /> Restore account
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => run(() => setAccountStatus(a.id, "ARCHIVED"), a.id)}
                        >
                          <Archive /> Archive account
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Delete "${a.name}" and all ${a.tradeCount} trades? This cannot be undone.`)) {
                            run(() => deleteAccount(a.id), a.id);
                          }
                        }}
                      >
                        <Trash2 /> Delete account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AccountFormDialog
        key={editing?.id ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function AccountFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AccountDTO | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState(editing?.name ?? "");
  const [provider, setProvider] = React.useState(editing?.provider ?? "");
  const [type, setType] = React.useState(editing?.type ?? "BROKER");
  const [initialBalance, setInitialBalance] = React.useState(
    editing?.initialBalance != null ? String(editing.initialBalance) : ""
  );
  const [profitTargetPercent, setProfitTargetPercent] = React.useState(
    editing?.profitTargetPercent != null ? String(editing.profitTargetPercent) : ""
  );
  const [currency, setCurrency] = React.useState(editing?.currency ?? "USD");
  const [status, setStatus] = React.useState(editing?.status ?? "ACTIVE");
  const [isDefault, setIsDefault] = React.useState(editing?.isDefault ?? false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    editing?.logoUrl ?? null
  );
  const [removeLogo, setRemoveLogo] = React.useState(false);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setLogoFile(f);
    setRemoveLogo(false);
    setLogoPreview(f ? URL.createObjectURL(f) : (editing?.logoUrl ?? null));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setRemoveLogo(true);
    setLogoPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", name.trim());
    fd.set("provider", provider.trim());
    fd.set("type", type);
    fd.set("initialBalance", initialBalance || "0");
    fd.set(
      "profitTargetPercent",
      isPropTargetType(type) ? profitTargetPercent.trim() : ""
    );
    fd.set("currency", currency.trim().toUpperCase() || "USD");
    fd.set("status", status);
    fd.set("isDefault", String(isDefault));
    if (logoFile) fd.append("logo", logoFile);
    if (removeLogo && editing) fd.set("removeLogo", "true");
    try {
      const res = editing ? await updateAccount(fd) : await createAccount(fd);
      if (res.ok) {
        toast.success(editing ? "Account updated" : "Account created");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="acc-name">Account name</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="FTMO $10K"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-provider">Broker / Prop firm</Label>
              <Input
                id="acc-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="FTMO"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Account type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-balance">Initial balance</Label>
              <Input
                id="acc-balance"
                inputMode="decimal"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-currency">Currency</Label>
              <Input
                id="acc-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
              />
            </div>
            {isPropTargetType(type) && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="acc-target">Target profit (%)</Label>
                <Input
                  id="acc-target"
                  inputMode="decimal"
                  value={profitTargetPercent}
                  onChange={(e) => setProfitTargetPercent(e.target.value)}
                  placeholder="8"
                />
                <p className="text-xs text-muted-foreground">
                  Progress bar will show on the account card. Leave empty to disable.
                </p>
              </div>
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Logo / Prop firm badge</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-sm font-semibold">
                  {logoPreview && !removeLogo ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <ImagePlus className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                    <ImagePlus className="size-3.5" />
                    {logoFile ? "Change logo" : "Choose logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  {editing && logoPreview && !removeLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex w-fit items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <X className="size-3" /> Remove logo
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG atau WebP · maks 1.5MB. Tampil di share card.
              </p>
            </div>
            {editing && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={isDefault}
              onCheckedChange={(c) => setIsDefault(c === true)}
            />
            Set as default account
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}