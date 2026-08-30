"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TradeForm } from "@/components/journal/trade-form";
import type { AccountDTO, TradeDTO } from "@/lib/types";

interface TradeFormState {
  open: boolean;
  mode: "create" | "edit";
  trade: TradeDTO | null;
  defaultAccountId?: string;
  openTrigger: number;
}

interface TradeFormApi {
  openCreate: (accountId?: string) => void;
  openEdit: (trade: TradeDTO) => void;
}

const TradeFormContext = React.createContext<TradeFormApi | null>(null);

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function TradeFormProvider({
  children,
  accounts,
}: {
  children: React.ReactNode;
  accounts: AccountDTO[];
}) {
  const isMobile = useIsMobile();
  const [state, setState] = React.useState<TradeFormState>({
    open: false,
    mode: "create",
    trade: null,
    openTrigger: 0,
  });

  const api = React.useMemo<TradeFormApi>(
    () => ({
      openCreate: (accountId?: string) =>
        setState((s) => ({
          open: true,
          mode: "create",
          trade: null,
          defaultAccountId: accountId,
          openTrigger: s.openTrigger + 1,
        })),
      openEdit: (trade: TradeDTO) =>
        setState((s) => ({
          open: true,
          mode: "edit",
          trade,
          openTrigger: s.openTrigger + 1,
        })),
    }),
    []
  );

  const close = React.useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const content = (
    <TradeForm
      key={`${state.openTrigger}-${state.mode}`}
      accounts={accounts}
      trade={state.trade}
      defaultAccountId={state.defaultAccountId}
      isMobile={isMobile}
      onClose={close}
    />
  );

  return (
    <TradeFormContext.Provider value={api}>
      {children}
      {isMobile ? (
        <Sheet open={state.open} onOpenChange={(open) => !open && close()}>
          <SheetContent
            side="bottom"
            className="h-[92dvh] gap-0 overflow-y-auto p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">
              {state.mode === "edit" ? "Edit Trade" : "Add Trade"}
            </SheetTitle>
            {state.open && content}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
          <DialogContent
            className="max-h-[94vh] w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">
              {state.mode === "edit" ? "Edit Trade" : "Add Trade"}
            </DialogTitle>
            {state.open && content}
          </DialogContent>
        </Dialog>
      )}
    </TradeFormContext.Provider>
  );
}

export function useTradeForm(): TradeFormApi {
  const ctx = React.useContext(TradeFormContext);
  if (!ctx) throw new Error("useTradeForm must be used within TradeFormProvider");
  return ctx;
}