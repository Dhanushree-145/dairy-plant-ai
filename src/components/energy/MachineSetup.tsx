import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, numberFormatter } from "@/lib/dashboard";
import {
  buildDraft,
  categoryMeta,
  friendlyError,
  MACHINE_CATEGORIES,
  PROCESSING_STAGES,
  todayIso,
  type MachineDraft,
} from "@/lib/energy";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Factory,
  Info,
  Loader2,
  Minus,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEFAULT_COUNTS: Record<string, number> = {
  chilling: 2,
  storage: 1,
  pasteurization: 1,
  homogenization: 1,
  pumps: 2,
  packaging: 1,
  cold_storage: 1,
};

function draftsFromCounts(counts: Record<string, number>): MachineDraft[] {
  const drafts: MachineDraft[] = [];
  for (const category of MACHINE_CATEGORIES) {
    const count = counts[category.id] ?? 0;
    for (let index = 0; index < count; index += 1) {
      drafts.push(buildDraft(category.id, index));
    }
  }
  return drafts;
}

function mergeDrafts(existing: MachineDraft[], counts: Record<string, number>): MachineDraft[] {
  const next: MachineDraft[] = [];
  for (const category of MACHINE_CATEGORIES) {
    const count = counts[category.id] ?? 0;
    const kept = existing.filter((draft) => draft.category === category.id);
    for (let index = 0; index < count; index += 1) {
      next.push(kept[index] ?? buildDraft(category.id, index));
    }
  }
  return next;
}

function countsFromDrafts(drafts: MachineDraft[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const draft of drafts) {
    counts[draft.category] = (counts[draft.category] ?? 0) + 1;
  }
  return counts;
}

function payloadFromDraft(draft: MachineDraft) {
  return {
    name: draft.name.trim(),
    code: draft.code.trim().toUpperCase(),
    category: draft.category,
    stage: draft.stage,
    capacityValue: Number(draft.capacityValue),
    capacityUnit: draft.capacityUnit.trim(),
    ratedKw: Number(draft.ratedKw),
    baselineKwhPerHour: Number(draft.baselineKwhPerHour),
    installedAt: draft.installedAt,
    ...(draft.specifications.trim()
      ? { specifications: draft.specifications.trim() }
      : {}),
  };
}

function validateDrafts(drafts: MachineDraft[]): string | null {
  if (drafts.length === 0) return "Select at least one machine type to continue.";
  const codes = new Set<string>();
  for (const draft of drafts) {
    if (!draft.name.trim()) return "Every machine needs a name.";
    if (!draft.code.trim()) return `Add a machine ID for ${draft.name.trim() || "this machine"}.`;
    const code = draft.code.trim().toUpperCase();
    if (codes.has(code)) return `Machine ID ${code} is used more than once.`;
    codes.add(code);
    if (!draft.capacityUnit.trim()) return `Add a capacity unit for ${draft.name.trim()}.`;
    if (
      !Number.isFinite(draft.capacityValue) ||
      draft.capacityValue <= 0 ||
      !Number.isFinite(draft.ratedKw) ||
      draft.ratedKw <= 0 ||
      !Number.isFinite(draft.baselineKwhPerHour) ||
      draft.baselineKwhPerHour <= 0
    ) {
      return `Capacity, rated power and baseline must be above zero for ${draft.name.trim()}.`;
    }
    if (!draft.installedAt) return `Add an installation date for ${draft.name.trim()}.`;
  }
  return null;
}

export function MachineSetup() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...DEFAULT_COUNTS }));
  const [drafts, setDrafts] = useState<MachineDraft[]>(() => draftsFromCounts(DEFAULT_COUNTS));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const createBatch = useMutation(api.machines.createBatch);

  const selectedCount = Object.values(counts).reduce((total, value) => total + value, 0);
  const plant = user?.plantName?.trim() || "your dairy plant";

  const setCount = (categoryId: string, next: number) => {
    setCounts((current) => ({
      ...current,
      [categoryId]: Math.max(0, Math.min(12, next)),
    }));
  };

  const goToDetails = () => {
    if (selectedCount === 0) {
      setError("Select at least one machine type to continue.");
      return;
    }
    if (selectedCount > 40) {
      setError("Register up to 40 machines at a time. Split a larger fleet into two batches.");
      return;
    }
    setError(null);
    setDrafts(mergeDrafts(drafts, counts));
    setStep(2);
  };

  const updateDraft = (index: number, patch: Partial<MachineDraft>) => {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const removeDraft = (index: number) => {
    const next = drafts.filter((_, draftIndex) => draftIndex !== index);
    setDrafts(next);
    setCounts(countsFromDrafts(next));
  };

  const register = async () => {
    const validation = validateDrafts(drafts);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createBatch({ machines: drafts.map(payloadFromDraft) });
      toast.success("Fleet registered", {
        description: `${drafts.length} machines are now monitored in Energy & Machines.`,
      });
    } catch (submitError) {
      const message = friendlyError(submitError);
      setError(message);
      toast.error("Could not register machines", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const estimatedDailyKwh =
    drafts.reduce((total, draft) => total + draft.baselineKwhPerHour * 22, 0) || 0;
  const estimatedMonthlyCost = estimatedDailyKwh * 30 * 8.2;
  const totalRatedKw = drafts.reduce((total, draft) => total + draft.ratedKw, 0);

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
            Energy &amp; Machines · First-time setup
          </p>
          <h1 className="mt-1.5 font-display text-[25px] font-semibold tracking-tight text-navy sm:text-[30px]">
            Register your plant equipment
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Add the machines at{" "}
            <span className="font-medium text-navy/80">{plant}</span> once. DairyPulse
            then tracks each unit from reception through cold storage. This setup does
            not appear again after registration.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warning/25 bg-warning/[0.07] px-2.5 py-1 text-[10.5px] font-semibold text-warning-ink">
          <span className="size-1.5 rounded-full bg-warning" />
          Simulated telemetry
        </span>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <section className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-navy">
                Which equipment runs in your plant?
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Set how many of each type you operate. A typical medium dairy is
                pre-filled — adjust it to match your plant.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] font-semibold text-navy">
                {selectedCount} machine{selectedCount === 1 ? "" : "s"} selected
              </span>
              {selectedCount > 40 && (
                <span className="text-[9.5px] font-medium text-danger">
                  Up to 40 machines per registration
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {MACHINE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const count = counts[category.id] ?? 0;
              const selected = count > 0;
              return (
                <div
                  key={category.id}
                  className={cn(
                    "rounded-xl border p-3.5 transition-colors",
                    selected
                      ? "border-primary/35 bg-primary/[0.035]"
                      : "border-border/80 bg-background/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[12.5px] font-semibold leading-snug text-navy">
                            {category.label}
                          </p>
                          <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            setCount(category.id, checked ? 1 : 0)
                          }
                          aria-label={`Include ${category.label}`}
                          className="mt-0.5"
                        />
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                          {category.defaultStage} · {category.defaultRatedKw} kW default
                        </p>
                        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => setCount(category.id, count - 1)}
                            disabled={count === 0}
                            aria-label={`Remove one ${category.shortLabel}`}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-navy disabled:opacity-30"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center text-[11.5px] font-semibold text-navy">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCount(category.id, count + 1)}
                            disabled={count >= 12}
                            aria-label={`Add one ${category.shortLabel}`}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-navy disabled:opacity-30"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[11.5px] text-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10.5px] text-muted-foreground">
              Need a type that is not listed? Register the closest category and rename
              the machine — custom categories arrive later.
            </p>
            <Button
              type="button"
              onClick={goToDetails}
              disabled={selectedCount === 0 || selectedCount > 40}
              className="h-8 shrink-0 gap-1.5 text-[11.5px]"
            >
              Configure machines
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-navy">
                Name and spec each machine
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Names, IDs and specs are prefilled from your category choices. Adjust
                anything before registering.
              </p>
            </div>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] font-semibold text-navy">
              {drafts.length} units · {Math.round(totalRatedKw)} kW rated
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {drafts.map((draft, index) => {
              const category = categoryMeta(draft.category);
              const Icon = category.icon;
              const unitNumber =
                drafts
                  .slice(0, index)
                  .filter((item) => item.category === draft.category).length + 1;
              return (
                <div
                  key={`${draft.category}-${index}`}
                  className="rounded-xl border border-border/80 bg-card p-4 shadow-card"
                >
                  <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-navy">
                        {category.label}
                      </p>
                      <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
                        Unit {unitNumber} · {category.defaultStage}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(index)}
                      aria-label={`Remove ${draft.name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Machine name
                      </Label>
                      <Input
                        value={draft.name}
                        onChange={(event) => updateDraft(index, { name: event.target.value })}
                        className="h-8 text-[12px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Machine ID
                      </Label>
                      <Input
                        value={draft.code}
                        onChange={(event) => updateDraft(index, { code: event.target.value })}
                        className="h-8 text-[12px] uppercase placeholder:normal-case"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Processing stage
                      </Label>
                      <Select
                        value={draft.stage}
                        onValueChange={(stage) => updateDraft(index, { stage })}
                      >
                        <SelectTrigger className="h-8 w-full text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROCESSING_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Capacity
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={draft.capacityValue}
                          onChange={(event) =>
                            updateDraft(index, {
                              capacityValue: Number(event.target.value),
                            })
                          }
                          className="h-8 text-[12px]"
                        />
                        <Input
                          aria-label="Capacity unit"
                          value={draft.capacityUnit}
                          onChange={(event) =>
                            updateDraft(index, { capacityUnit: event.target.value })
                          }
                          className="h-8 w-20 text-[12px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Rated power (kW)
                      </Label>
                      <Input
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={draft.ratedKw}
                        onChange={(event) => {
                          const ratedKw = Number(event.target.value);
                          updateDraft(index, {
                            ratedKw,
                            baselineKwhPerHour:
                              Math.round(ratedKw * category.dutyFactor * 10) / 10,
                          });
                        }}
                        className="h-8 text-[12px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Baseline (kWh/h)
                      </Label>
                      <Input
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={draft.baselineKwhPerHour}
                        onChange={(event) =>
                          updateDraft(index, {
                            baselineKwhPerHour: Number(event.target.value),
                          })
                        }
                        className="h-8 text-[12px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Installed
                      </Label>
                      <Input
                        type="date"
                        max={todayIso()}
                        value={draft.installedAt}
                        onChange={(event) =>
                          updateDraft(index, { installedAt: event.target.value })
                        }
                        className="h-8 text-[12px]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[10.5px] font-medium text-navy">
                        Specifications <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        value={draft.specifications}
                        onChange={(event) =>
                          updateDraft(index, { specifications: event.target.value })
                        }
                        placeholder="Make, model, refrigerant, controller…"
                        className="h-8 text-[12px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[11.5px] text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="h-8 gap-1.5 text-[11.5px]"
            >
              <ArrowLeft className="size-3.5" />
              Machine types
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const validation = validateDrafts(drafts);
                if (validation) {
                  setError(validation);
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="h-8 gap-1.5 text-[11.5px]"
            >
              Review registration
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h2 className="font-display text-[16px] font-semibold text-navy">
                  Review your fleet
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Check the counts and capacities before the first reading is generated.
                </p>
              </div>
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10.5px] font-semibold text-success-ink">
                Ready to register
              </span>
            </div>

            <div className="mt-3 divide-y divide-border/70">
              {MACHINE_CATEGORIES.map((category) => {
                const items = drafts.filter((draft) => draft.category === category.id);
                if (items.length === 0) return null;
                const Icon = category.icon;
                return (
                  <div key={category.id} className="flex gap-2.5 py-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-semibold text-navy">
                        {category.label}
                        <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">
                          × {items.length}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        {items
                          .map((item) => `${item.name} (${item.code.toUpperCase()})`)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="mt-2 rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[11.5px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-3 flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="h-8 gap-1.5 text-[11.5px]"
              >
                <ArrowLeft className="size-3.5" />
                Back to details
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={register}
                disabled={saving}
                className="h-8 min-w-[150px] gap-1.5 text-[11.5px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Registering fleet
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Register {drafts.length} machines
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
              <h3 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-navy">
                <Factory className="size-3.5 text-primary" />
                Setup summary
              </h3>
              <dl className="mt-3 space-y-2 text-[11.5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Machines</dt>
                  <dd className="font-semibold text-navy">{drafts.length}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Rated load</dt>
                  <dd className="font-semibold text-navy">
                    {numberFormatter.format(Math.round(totalRatedKw))} kW
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Estimated daily use</dt>
                  <dd className="font-semibold text-navy">
                    {numberFormatter.format(Math.round(estimatedDailyKwh))} kWh
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Estimated monthly cost</dt>
                  <dd className="font-semibold text-success-ink">
                    {formatCurrency(estimatedMonthlyCost)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 border-t border-border/70 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                Estimates apply a 22-hour operating day at the configured baseline and
                the ₹8.20/kWh demo tariff. They are not bills.
              </p>
            </div>

            <div className="rounded-xl border border-warning/25 bg-warning/[0.055] p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-warning-ink">
                <Info className="size-3.5" />
                Data source
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-navy/70">
                Machines start on simulated meter telemetry for this demo. Every
                reading is labelled simulated; no IoT meter, manual reading or machine
                controller is connected yet.
              </p>
              <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Zap className="size-3 text-warning" />
                You can add, edit or remove machines after registration.
              </p>
            </div>
          </div>
        </section>
      )}

      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        Machine registration is stored on your plant account. The setup appears only
        while your fleet is empty.
      </p>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { number: 1 as const, label: "Machine types" },
    { number: 2 as const, label: "Details" },
    { number: 3 as const, label: "Review" },
  ];

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-card sm:gap-2 sm:px-4">
      {steps.map((item, index) => {
        const complete = step > item.number;
        const active = step === item.number;
        return (
          <div key={item.number} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                complete
                  ? "bg-success text-white"
                  : active
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-muted-foreground",
              )}
            >
              {complete ? <Check className="size-3" /> : item.number}
            </span>
            <span
              className={cn(
                "hidden text-[11px] font-semibold sm:inline",
                active ? "text-navy" : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  "mx-0.5 h-px w-4 sm:w-10",
                  complete ? "bg-success/50" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
