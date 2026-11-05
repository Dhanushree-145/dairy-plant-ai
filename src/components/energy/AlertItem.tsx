import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import {
  ALERT_STATUS_META,
  ALERT_TYPE_LABELS,
  formatTime,
  friendlyError,
  relativeFrom,
  SEVERITY_META,
  type AlertStatus,
  type EnergyAlert,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AlertItem({
  alert,
  now,
  compact = false,
}: {
  alert: EnergyAlert;
  now: number;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<AlertStatus | null>(null);
  const setAlertState = useMutation(api.energy.setAlertState);
  const severity = SEVERITY_META[alert.severity];
  const status = ALERT_STATUS_META[alert.status];
  const typeLabel = ALERT_TYPE_LABELS[alert.issueType] ?? alert.issueType;

  const update = async (next: AlertStatus) => {
    setPending(next);
    try {
      await setAlertState({ alertKey: alert.key, status: next });
      toast.success(
        next === "acknowledged"
          ? "Alert acknowledged"
          : next === "resolved"
            ? "Alert resolved"
            : "Alert reopened",
        { description: `${alert.machineName} · ${typeLabel}` },
      );
    } catch (error) {
      toast.error("Could not update alert", { description: friendlyError(error) });
    } finally {
      setPending(null);
    }
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-card shadow-card",
        alert.status === "resolved"
          ? "border-border/70 opacity-80"
          : alert.severity === "critical"
            ? "border-danger/25"
            : "border-warning/25",
        compact ? "p-3.5" : "p-4 sm:p-5",
      )}
    >
      <div className="flex flex-wrap items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            alert.severity === "critical"
              ? "bg-danger/10 text-danger"
              : alert.severity === "warning"
                ? "bg-warning/10 text-warning-ink"
                : "bg-primary/10 text-primary",
          )}
        >
          <TriangleAlert className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[12.5px] font-semibold text-navy">{alert.title}</h3>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider",
                severity.chip,
              )}
            >
              {severity.label}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[8.5px] font-semibold",
                status.chip,
              )}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            <span className="font-semibold text-navy/75">{alert.machineName}</span> ·{" "}
            {alert.machineCode} · {typeLabel} · detected {formatTime(alert.detectedAt)} (
            {relativeFrom(alert.detectedAt, now)})
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/55 px-2.5 py-2">
          <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current reading
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-navy">
            {alert.currentLabel}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/55 px-2.5 py-2">
          <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Normal / expected
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-navy">
            {alert.expectedLabel}
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 rounded-lg bg-primary/[0.045] px-2.5 py-2">
        <ArrowRight className="mt-0.5 size-3 shrink-0 text-primary" />
        <p className="text-[10.5px] leading-relaxed text-navy/75">
          <span className="font-semibold text-navy">Recommended action: </span>
          {alert.recommendation}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
        <p className="text-[9px] text-muted-foreground">
          {alert.statusUpdatedAt
            ? `Manager update ${relativeFrom(alert.statusUpdatedAt, now)}`
            : "Awaiting manager review"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {alert.status === "active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("acknowledged")}
              disabled={pending !== null}
              className="h-7 gap-1 text-[10.5px]"
            >
              <Check className="size-3" />
              {pending === "acknowledged" ? "Saving…" : "Acknowledge"}
            </Button>
          )}
          {alert.status !== "resolved" && (
            <Button
              type="button"
              size="sm"
              onClick={() => update("resolved")}
              disabled={pending !== null}
              className="h-7 gap-1 bg-success text-white text-[10.5px] hover:bg-success/90"
            >
              <CheckCheck className="size-3" />
              {pending === "resolved" ? "Saving…" : "Resolve"}
            </Button>
          )}
          {alert.status !== "active" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update("active")}
              disabled={pending !== null}
              className="h-7 gap-1 text-[10.5px] text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Reopen
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
