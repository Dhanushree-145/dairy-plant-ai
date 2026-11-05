import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { TooltipProps } from "recharts";

export const CHART = {
  blue: "#3185D8",
  blueSoft: "#7EA6D8",
  green: "#16A078",
  amber: "#F59E0B",
  red: "#DC4545",
  navy: "#162B4D",
  grid: "#E7EEF7",
  axis: "#8296AD",
};

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  money,
  moneyKeys,
}: TooltipProps<number, string> & {
  unit?: string;
  money?: boolean;
  moneyKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-2.5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.dataKey}`} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-navy">
              {money || moneyKeys?.includes(String(entry.dataKey))
                ? formatCurrency(Number(entry.value))
                : numberFormatter.format(Number(entry.value))}
              {unit ? <span className="ml-0.5 text-[9px] font-normal">{unit}</span> : null}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <span
              className="h-px w-3 border-t border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
