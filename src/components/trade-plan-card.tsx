"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PlanRow {
  key: string;
  value: string;
}

interface PlanSection {
  title: string;
  rows: PlanRow[];
  tags: string[];
}

function parseTradePlanText(plan: string): PlanSection[] {
  const sections: PlanSection[] = [];
  for (const rawSection of plan.split(/\n\s*\n/)) {
    const lines = rawSection
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const title = lines[0].toUpperCase().replace(/\s+/g, " ");
    const isNarrative = /^(DAILY|H4|H1)\b/.test(title);
    const isConfluence = /^LTF/.test(title);
    if (!isNarrative && !isConfluence) continue;

    const rows: PlanRow[] = [];
    const tags: string[] = [];
    for (const raw of lines.slice(1)) {
      const sep = raw.indexOf(" - ");
      if (sep > 0) {
        rows.push({
          key: raw.slice(0, sep).trim(),
          value: raw.slice(sep + 3).trim(),
        });
      } else {
        tags.push(raw);
      }
    }

    const confluenceTags = isConfluence
      ? [...new Set(lines.slice(1).join(" ").split(/\s+/).filter(Boolean))]
      : tags;

    sections.push({ title, rows, tags: confluenceTags });
  }
  return sections;
}

export function TradePlanCard({
  plan,
  className,
}: {
  plan: string;
  className?: string;
}) {
  const sections = React.useMemo(() => parseTradePlanText(plan), [plan]);
  if (sections.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {sections.map((s) => (
        <div
          key={s.title}
          className="rounded-lg border border-border bg-muted/40 p-3"
        >
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-primary/80" />
            {s.title}
          </div>

          {s.rows.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {s.rows.map((r) => (
                <span
                  key={`${s.title}-${r.key}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-sm ring-1 ring-border"
                >
                  <span className="text-muted-foreground">{r.key}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {r.value}
                  </span>
                </span>
              ))}
            </div>
          )}

          {s.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}