import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "positive" | "negative";
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-px hover:border-border/80 hover:shadow-card-hover lg:p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {tone !== "default" && (
          <span
            className={cn(
              "size-[5px] shrink-0 rounded-full",
              tone === "positive" ? "bg-emerald-500" : "bg-rose-500"
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "mt-2.5 font-semibold tabular-nums tracking-tight",
          "text-xl lg:text-2xl",
          tone === "positive" && "text-emerald-500",
          tone === "negative" && "text-rose-500",
          valueClassName
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}