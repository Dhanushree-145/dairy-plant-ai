import { AlertItem } from "@/components/energy/AlertItem";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertStatus, EnergyAlert } from "@/lib/energy";
import { cn } from "@/lib/utils";
import {
  BellRing,
  CircleAlert,
  Info,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = "all" | AlertStatus;
type SeverityFilter = "all" | "critical" | "warning";

export function AlertsTab({
  alerts,
  now,
}: {
  alerts: EnergyAlert[];
  now: number;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const counts = useMemo(
    () => ({
      active: alerts.filter((alert) => alert.status === "active").length,
      acknowledged: alerts.filter((alert) => alert.status === "acknowledged").length,
      resolved: alerts.filter((alert) => alert.status === "resolved").length,
      critical: alerts.filter(
        (alert) => alert.severity === "critical" && alert.status !== "resolved",
      ).length,
    }),
    [alerts],
  );

  const visible = alerts.filter((alert) => {
    if (statusFilter !== "all" && alert.status !== statusFilter) return false;
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
    return true;
  });

  const summary = [
    {
      label: "Active",
      value: counts.active,
      icon: TriangleAlert,
      tone: "bg-danger/10 text-danger",
    },
    {
      label: "Critical open",
      value: counts.critical,
      icon: CircleAlert,
      tone: "bg-warning/10 text-warning-ink",
    },
    {
      label: "Acknowledged",
      value: counts.acknowledged,
      icon: ShieldCheck,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Resolved",
      value: counts.resolved,
      icon: BellRing,
      tone: "bg-success/10 text-success-ink",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-card"
            >
              <span className={cn("flex size-8 items-center justify-center rounded-lg", item.tone)}>
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-[18px] font-semibold leading-tight text-navy">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-background p-0.5">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["acknowledged", "Acknowledged"],
              ["resolved", "Resolved"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                statusFilter === value
                  ? "bg-white text-navy shadow-sm"
                  : "text-muted-foreground hover:text-navy",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={severityFilter}
            onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}
          >
            <SelectTrigger className="h-8 w-[150px] text-[11px]" aria-label="Severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            className="h-8 gap-1 px-2 text-[10.5px] text-muted-foreground"
            title="Email delivery is not configured in this build"
          >
            <Mail className="size-3" />
            Email digest
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] text-muted-foreground">
          Showing <span className="font-semibold text-navy">{visible.length}</span> of{" "}
          {alerts.length} machine alerts
        </p>
        <p className="text-[10px] text-muted-foreground">Most urgent first</p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
          <BellRing className="mx-auto size-6 text-muted-foreground/50" />
          <p className="mt-2 text-[13px] font-semibold text-navy">No alerts in this view</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Change the status or severity filter to see other machine alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((alert) => (
            <AlertItem key={alert.key} alert={alert} now={now} />
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
          <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
            <BellRing className="size-3.5 text-primary" />
            Notification channels
          </h2>
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/55 px-2.5 py-2">
              <div>
                <p className="text-[11px] font-semibold text-navy">In-app alerts</p>
                <p className="text-[9.5px] text-muted-foreground">
                  Header bell and the Alerts tab
                </p>
              </div>
              <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success-ink">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/55 px-2.5 py-2">
              <div>
                <p className="text-[11px] font-semibold text-navy">Email digest</p>
                <p className="text-[9.5px] text-muted-foreground">
                  Manager summaries and escalations
                </p>
              </div>
              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                Not connected
              </span>
            </div>
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-muted-foreground">
            Email delivery is not configured in this build. Alerts are stored and
            acknowledged in-app; an email provider can be connected to send the same
            digest to plant managers.
          </p>
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
          <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
            <Info className="size-3.5 text-primary" />
            Detection rules
          </h2>
          <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            <li>Daily energy above the configured baseline by 13% or more.</li>
            <li>Efficiency score below 84 against the 90 target, or below 74 for critical.</li>
            <li>Refrigeration temperature above 4.5°C against the 2–4°C range.</li>
            <li>Machine ON while drawing under 45% of its expected load.</li>
            <li>One or more unexpected shutdowns in the recorded history.</li>
            <li>Preventive service due within seven days.</li>
            <li>Status missing from the meter — never treated as OFF.</li>
          </ul>
          <p className="mt-2 border-t border-border/70 pt-2 text-[9.5px] leading-relaxed text-muted-foreground">
            Rules run against simulated machine records. A missing reading raises a
            fault/unknown alert instead of assuming the machine is switched off.
          </p>
        </section>
      </div>
    </div>
  );
}
