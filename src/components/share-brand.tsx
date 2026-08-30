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
      <div className="flex h-24 max-w-[340px] shrink-0 items-center justify-center px-5 py-2">
        {/* Remove solid background to support transparency */}
        <img
          src={logoUrl}
          alt={alt}
          className="max-h-24 w-auto max-w-[300px] rounded-full object-contain"
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