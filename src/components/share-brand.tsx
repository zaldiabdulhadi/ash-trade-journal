"use client";

import { useBrand } from "@/components/brand-provider";

export function ShareBrandBadge({
  logoUrl,
  alt = "Prop firm",
}: {
  logoUrl?: string | null;
  alt?: string;
}) {
  const { brandName } = useBrand();

  if (logoUrl) {
    return (
      <div className="flex h-14 max-w-[240px] shrink-0 items-center justify-center rounded-2xl bg-white/95 px-5 py-2">
        <img
          src={logoUrl}
          alt={alt}
          className="max-h-11 w-auto max-w-[200px] object-contain"
        />
      </div>
    );
  }
  return (
    <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-slate-200 uppercase ring-1 ring-white/10">
      {brandName}
    </div>
  );
}