import { MachineCard } from "@/components/energy/MachineCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  categoryMeta,
  MACHINE_CATEGORIES,
  PROCESSING_STAGES,
  type EnergyData,
  type MachineSnapshot,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = "all" | "on" | "off" | "unknown";

export function FleetTab({
  machines,
  breaks,
  now,
  days,
  onAdd,
  onEdit,
  onDelete,
}: {
  machines: MachineSnapshot[];
  breaks: EnergyData["categoryBreakdown"];
  now: number;
  days: number;
  onAdd: () => void;
  onEdit: (id: MachineSnapshot["id"]) => void;
  onDelete: (id: MachineSnapshot["id"]) => void;
}) {
  const [category, setCategory] = useState("all");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return machines.filter((machine) => {
      if (category !== "all" && machine.category !== category) return false;
      if (stage !== "all" && machine.stage !== stage) return false;
      if (status !== "all" && machine.status !== status) return false;
      if (
        needle &&
        !`${machine.name} ${machine.code} ${machine.stage}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [machines, category, stage, status, query]);

  const hasFilters =
    category !== "all" || stage !== "all" || status !== "all" || query.trim() !== "";

  const clearFilters = () => {
    setCategory("all");
    setStage("all");
    setStatus("all");
    setQuery("");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-navy">
              Registered machines
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {machines.length} machines across {breaks.length} categories. Select a type
              to filter the fleet.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAdd}
            className="h-8 gap-1.5 text-[11.5px]"
          >
            <Plus className="size-3.5" />
            Add machine
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
              category === "all"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-navy",
            )}
          >
            All machines
            <span className="rounded-full bg-white/70 px-1 text-[9px] text-navy">
              {machines.length}
            </span>
          </button>
          {breaks.map((entry) => {
            const meta = categoryMeta(entry.category);
            const Icon = meta.icon;
            return (
              <button
                key={entry.category}
                type="button"
                onClick={() =>
                  setCategory((current) => (current === entry.category ? "all" : entry.category))
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
                  category === entry.category
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-navy",
                )}
              >
                <Icon className="size-3" />
                {meta.shortLabel}
                <span className="rounded-full bg-white/70 px-1 text-[9px] text-navy">
                  {entry.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-card sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by machine name, ID or stage"
            className="h-8 pl-8 text-[11.5px]"
            aria-label="Search machines"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-full text-[11px] sm:w-[150px]" aria-label="Machine type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {MACHINE_CATEGORIES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.shortLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-8 w-full text-[11px] sm:w-[138px]" aria-label="Processing stage">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {PROCESSING_STAGES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-8 w-full text-[11px] sm:w-[122px]" aria-label="Machine status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="on">ON</SelectItem>
              <SelectItem value="off">OFF</SelectItem>
              <SelectItem value="unknown">Fault / unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 shrink-0 gap-1 px-2 text-[10.5px] text-muted-foreground"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] text-muted-foreground">
          Showing <span className="font-semibold text-navy">{visible.length}</span> of{" "}
          {machines.length} machines
        </p>
        <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <SlidersHorizontal className="size-3" />
          Filters apply instantly
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
          <p className="text-[13px] font-semibold text-navy">No machines match these filters</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Try a different type, stage or status, or clear the filters.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="mt-3 h-8 text-[11.5px]"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {visible.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              now={now}
              days={days}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
