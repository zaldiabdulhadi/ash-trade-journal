"use client";

import * as React from "react";

interface BrandContextValue {
  brandName: string;
  brandTagline: string;
}

const DEFAULT_BRAND: BrandContextValue = {
  brandName: "Ash Trade Journal",
  brandTagline: "local · personal",
};

const BrandContext = React.createContext<BrandContextValue>(DEFAULT_BRAND);

export function BrandProvider({
  brandName,
  brandTagline,
  children,
}: {
  brandName: string;
  brandTagline: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ brandName, brandTagline }),
    [brandName, brandTagline]
  );
  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandContextValue {
  return React.useContext(BrandContext);
}