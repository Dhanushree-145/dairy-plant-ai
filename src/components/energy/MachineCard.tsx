import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkline } from "@/components/energy/Sparkline";
import { StatusPill } from "@/components/energy/StatusPill";
import {
  categoryMeta,
  compactKwh,
  performanceMeta,
  relativeFrom,
  type MachineSnapshot,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";

export function MachineCard({
  machine,
  now,
  days,
  onEdit,
  onDelete,
}: {
  machine: MachineSnapshot;
  now: number;
  days: number;
  onEdit: (id: MachineSnapshot["id"]) => void;
  onDelete: (id: MachineSnapshot["id"]) => void;
}) {
  const category = categoryMeta(machine.category);
  const Icon = category.icon;
  const performance = performanceMeta(machine.performance);
  const unavailable = machine.status === "unknown";
  const sparkColor = unavailable ? "#DC4545" : machine.status === "on" ? "#3185D8" : "#8296AD";

  return (
    <div className="relative h-full">
      <Link
        to={`/dashboard/energy/machines/${machine.id}`}
        className={cn(
          "group flex h-full flex-col rounded-xl border bg-card p-4 pr-11 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float/50",
          unavailable
            ? "border-danger/35 bg-danger/[0.015] hover:border-danger/55"
            : "border-border/80 hover:border-primary/30",
        )}
        aria-label={`Open ${machine.name} details`}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              unavailable
                ? "bg-danger/10 text-danger"
                : machine.status === "on"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[13px] font-semibold text-navy">{machine.name}</p>
              <StatusPill status={machine.status} />
            </div>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              <span className="font-semibold text-navy/70">{machine.code}</span>
              {" · "}
              {category.shortLabel}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {machine.stage} stage · {machine.capacityValue.toLocaleString("en-IN")}{" "}
              {machine.capacityUnit}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-background/55 px-2.5 py-2">
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current
            </p>
            <p
              className={cn(
                "mt-0.5 text-[13px] font-semibold leading-tight",
                unavailable ? "text-danger" : "text-navy",
              )}
            >
              {unavailable ? "—" : `${machine.currentKw?.toFixed(1) ?? "0.0"} kW`}
            </p>
            {unavailable && (
              <p className="text-[8px] font-medium text-danger">No reading</p>
            )}
          </div>
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {days}-day
            </p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-navy">
              {machine.periodKwh.toLocaleString("en-IN")}
            </p>
            <p className="text-[8px] font-medium text-muted-foreground">kWh</p>
          </div>
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lifetime
            </p>
            <p className="mt-0.5 text-[13px] font-semibold leading-tight text-navy">
              {compactKwh(machine.totalKwh).replace(" kWh", "")}
            </p>
            <p className="text-[8px] font-medium text-muted-foreground">kWh</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Performance
            </span>
            <span className={cn("text-[10.5px] font-semibold", performance.tone)}>
              {machine.performance}% · {performance.label}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-700", performance.bar)}
              style={{ width: `${machine.performance}%` }}
            />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="text-[9.5px] text-muted-foreground">
              {unavailable
                ? `No telemetry for ${Math.max(1, Math.round((now - machine.lastUpdated) / 60_000))} min`
                : `Updated ${relativeFrom(machine.lastUpdated, now)}`}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View details
              <ArrowRight className="size-2.5" />
            </p>
          </div>
          <Sparkline
            values={machine.sparkline}
            color={sparkColor}
            width={74}
            height={26}
          />
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-navy"
              aria-label={`Manage ${machine.name}`}
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/energy/machines/${machine.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(machine.id)}>
              <Pencil className="size-3.5" />
              Edit machine
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(machine.id)}
              className="text-danger focus:text-danger"
            >
              <Trash2 className="size-3.5" />
              Remove machine
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
