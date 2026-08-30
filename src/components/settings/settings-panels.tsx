"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Moon, Sun, Monitor, Type } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resetAllData } from "@/app/actions/accounts";
import { updateBrandSettings } from "@/app/actions/settings";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsAppearance() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const Icon = THEME_OPTIONS.find((o) => o.value === theme)?.icon ?? Palette;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Palette className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium">Theme</div>
          <div className="text-xs text-muted-foreground">
            Currently {resolvedTheme ?? theme}
          </div>
        </div>
      </div>
      <Select value={theme ?? "dark"} onValueChange={(v) => v && setTheme(v)}>
        <SelectTrigger size="sm" className="w-fit min-w-32">
          <Icon />
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          {THEME_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <o.icon /> {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SettingsBranding({
  initialBrandName,
  initialBrandTagline,
}: {
  initialBrandName: string;
  initialBrandTagline: string;
}) {
  const router = useRouter();
  const [brandName, setBrandName] = React.useState(initialBrandName);
  const [brandTagline, setBrandTagline] = React.useState(initialBrandTagline);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("brandName", brandName.trim());
    fd.set("brandTagline", brandTagline.trim());
    const res = await updateBrandSettings(fd);
    setSaving(false);
    if (res.ok) {
      toast.success("Branding updated");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not save branding");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Type className="size-4" />
        </span>
        <div>
          <div className="text-sm font-medium">Journal branding</div>
          <div className="text-xs text-muted-foreground">
            Shown in the sidebar and on the top-right of share/recap cards.
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ash Trade Journal"
            maxLength={60}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="brand-tagline">Tagline</Label>
          <Input
            id="brand-tagline"
            value={brandTagline}
            onChange={(e) => setBrandTagline(e.target.value)}
            placeholder="local · personal"
            maxLength={40}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save branding
        </Button>
      </div>
    </form>
  );
}

export function SettingsDangerZone() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (
      !confirm(
        "This will permanently delete ALL accounts, trades and screenshots. This cannot be undone. Are you absolutely sure?"
      )
    ) {
      setConfirming(false);
      return;
    }
    setBusy(true);
    const res = await resetAllData();
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      toast.success("All data has been reset");
      router.replace("/");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not reset data");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">Reset all data</div>
        <div className="text-xs text-muted-foreground">
          Delete every account, trade and screenshot in this journal.
        </div>
      </div>
      <Button
        variant={confirming ? "destructive" : "outline"}
        size="sm"
        onClick={handleReset}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : confirming ? (
          "Click again to confirm"
        ) : (
          "Reset"
        )}
      </Button>
    </div>
  );
}