import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { wasteCategoryMeta, wasteSource } from "@/lib/waste";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function WasteSourcePill({ source }: { source: string }) {
  const meta = wasteSource(source);
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[8px] font-semibold tracking-wide",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function WasteCategoryBadge({ category }: { category: string }) {
  const meta = wasteCategoryMeta(category);
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold", meta.accent)}>
      <Icon className="size-2.5" />
      {category}
    </span>
  );
}

export function WasteSection({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border border-border/80 bg-card p-3.5 shadow-card", className)}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[13px] font-semibold text-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WasteKpi({
  label,
  value,
  note,
  icon: Icon,
  tone = "navy",
  source,
}: {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  tone?: "navy" | "success" | "danger" | "warning" | "primary";
  source?: string;
}) {
  const tones = {
    navy: "border-border/80 bg-card text-navy",
    success: "border-success/20 bg-success/[0.035] text-success-ink",
    danger: "border-danger/20 bg-danger/[0.035] text-danger",
    warning: "border-warning/25 bg-warning/[0.045] text-warning-ink",
    primary: "border-primary/20 bg-primary/[0.035] text-primary",
  } as const;
  const iconTones = {
    navy: "bg-navy/[0.06] text-navy",
    success: "bg-success/10 text-success-ink",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning-ink",
    primary: "bg-primary/10 text-primary",
  } as const;

  return (
    <div className={cn("rounded-xl border p-3.5 shadow-card", tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] opacity-70">{label}</p>
        <span className={cn("flex size-6 items-center justify-center rounded-md", iconTones[tone])}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-2 font-display text-[21px] font-semibold leading-none tracking-tight">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {note && <p className="text-[9px] leading-relaxed opacity-70">{note}</p>}
        {source && <WasteSourcePill source={source} />}
      </div>
    </div>
  );
}

export function EmptyWaste({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-8 text-center">
      <p className="text-[11px] text-muted-foreground">{text}</p>
    </div>
  );
}

export function DemoDataBadge() {
  return (
    <Badge variant="outline" className="border-warning/30 bg-warning/[0.07] text-[8.5px] font-semibold text-warning-ink">
      DEMO ANALYTICS · LABELLED SOURCES
    </Badge>
  );
}

export function ReliabilityNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.035] px-3 py-2 text-[9.5px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}
