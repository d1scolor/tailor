"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CurrencyCode } from "@/lib/currency";

const CurrencyContext = createContext<CurrencyCode>("USD");

export function CurrencyProvider({ code, children }: { code: CurrencyCode; children: ReactNode }) {
  return <CurrencyContext.Provider value={code}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyCode() {
  return useContext(CurrencyContext);
}
