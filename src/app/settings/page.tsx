import type { Metadata } from "next";
import { TableProperties } from "lucide-react";
import Link from "next/link";

import { CardShell } from "@/components/ui/card-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
  SettingsAppearance,
  SettingsBranding,
  SettingsDangerZone,
} from "@/components/settings/settings-panels";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" description="Preferences and data management" />

      <CardShell title="Appearance" description="How the journal looks on your device">
        <SettingsAppearance />
      </CardShell>

      <CardShell
        title="Branding"
        description="Name shown in the sidebar and on share cards"
      >
        <SettingsBranding
          initialBrandName={settings.brandName}
          initialBrandTagline={settings.brandTagline}
        />
      </CardShell>

      <CardShell title="Data" description="Destructive actions for your local journal">
        <SettingsDangerZone />
      </CardShell>

      <CardShell title="About" description="ash-trade-journal">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <TableProperties className="size-4" />
          </span>
          <div className="text-sm">
            <div className="font-medium">ash-trade-journal v0.1.0</div>
            <div className="text-xs text-muted-foreground">
              A local-first trading journal. All data lives in your browser
              device&apos;s SQLite database.
            </div>
          </div>
        </div>
      </CardShell>

      <p className="text-xs text-muted-foreground">
        Docs and source:{" "}
        <Link href="/" className="text-primary underline-offset-2 hover:underline">
          localhost
        </Link>
      </p>
    </div>
  );
}