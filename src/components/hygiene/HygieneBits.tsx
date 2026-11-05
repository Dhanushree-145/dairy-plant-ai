import { cn } from "@/lib/utils";
import {
  hygieneStatus,
  sensorStatus,
  sourceLabel,
  type HygieneCategoryKey,
} from "@/lib/hygiene";
import {
  Beaker,
  Boxes,
  Building2,
  FlaskConical,
  Package,
  ShieldCheck,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export const HYGIENE_ICONS: Record<HygieneCategoryKey, LucideIcon> = {
  equipment: Boxes,
  tankers: Truck,
  employees: Users,
  packaging: Package,
  laboratory: FlaskConical,
  environment: Building2,
};

export const HYGIENE_ACCENTS: Record<HygieneCategoryKey, string> = {
  equipment: "bg-primary/10 text-primary",
  tankers: "bg-navy/10 text-navy",
  employees: "bg-success/10 text-success-ink",
  packaging: "bg-warning/10 text-warning-ink",
  laboratory: "bg-[#7EA6D8]/20 text-[#2E6699]",
  environment: "bg-[#16A078]/10 text-success-ink",
};

export function HygieneStatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const meta = hygieneStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {label ?? meta.label}
    </span>
  );
}

export function SensorStatusPill({ status }: { status: string }) {
  const meta = sensorStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap",
        meta.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function SourcePill({ source }: { source: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider",
        source === "iot"
          ? "border-primary/25 bg-primary/[0.07] text-primary"
          : source === "manual"
            ? "border-success/25 bg-success/[0.07] text-success-ink"
            : "border-warning/25 bg-warning/[0.07] text-warning-ink",
      )}
    >
      {sourceLabel(source)}
    </span>
  );
}

export function Sparkline({
  values,
  color = "#3185D8",
  width = 96,
  height = 30,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={color}
        fillOpacity={0.08}
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "navy";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success-ink",
    warning: "bg-warning/10 text-warning-ink",
    danger: "bg-danger/10 text-danger",
    navy: "bg-navy/10 text-navy",
  };
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <span className={cn("flex size-6 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-3" />
        </span>
      </div>
      <p className="mt-2 font-display text-[22px] font-semibold leading-none tracking-tight text-navy">
        {value}
        {unit && <span className="ml-1 text-[10px] font-medium text-muted-foreground">{unit}</span>}
      </p>
      {note && <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

export function HygieneSection({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[14px] font-semibold text-navy">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

export function HygieneWorkflowStrip() {
  const steps = [
    "Sensor reading",
    "Backend evaluation",
    "Cleaning / action",
    "Evidence submitted",
    "QA verification",
    "Release & dashboard",
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-card">
      <span className="mr-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Release workflow
      </span>
      {steps.map((step, index) => (
        <span key={step} className="flex items-center gap-1.5">
          <span className="rounded-full bg-background px-2 py-1 text-[9.5px] font-medium text-navy/75">
            {step}
          </span>
          {index < steps.length - 1 && <span className="text-[10px] text-muted-foreground/50">→</span>}
        </span>
      ))}
      <span className="ml-auto text-[9px] text-muted-foreground">
        No evidence never becomes “clean”.
      </span>
    </div>
  );
}

export function EmptyHygiene({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-8 text-center">
      <Beaker className="mx-auto size-5 text-muted-foreground/50" />
      <p className="mt-2 text-[11px] text-muted-foreground">{text}</p>
    </div>
  );
}
