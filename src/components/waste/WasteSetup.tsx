import { Button } from "@/components/ui/button";
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
import {
  DEFAULT_COLLECTION_POINTS,
  DEFAULT_COSTS,
  DEFAULT_DISPOSAL_METHODS,
  DEFAULT_RECOVERY_METHODS,
  DEFAULT_SEGREGATION,
  DEFAULT_STAGES,
  DEFAULT_STORAGE,
  DEFAULT_THRESHOLDS,
  DEFAULT_WASTE_CATEGORIES,
  formatInr,
  WASTE_CATEGORIES,
  wasteCategoryMeta,
} from "@/lib/waste";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Database,
  Loader2,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Scope", icon: Building2 },
  { id: 2, label: "Thresholds", icon: Scale },
  { id: 3, label: "Costs & demo", icon: ShieldCheck },
] as const;

export function WasteSetup() {
  const { user } = useAuth();
  const configure = useMutation(api.waste.configure);
  const [step, setStep] = useState(1);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [storage, setStorage] = useState(DEFAULT_STORAGE.map((item) => ({ ...item })));
  const [reductionTarget, setReductionTarget] = useState(12);
  const [costs, setCosts] = useState(DEFAULT_COSTS);
  const [responsible, setResponsible] = useState(
    user?.name ? `${user.name}, Plant manager` : "Plant manager",
  );
  const [schedule, setSchedule] = useState("Daily · 06:00 and 17:00 collection round");
  const [saving, setSaving] = useState(false);

  const updateStorage = (index: number, patch: Partial<(typeof storage)[number]>) => {
    setStorage((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const next = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (storage.some((location) => !location.name.trim() || location.capacity <= 0)) {
        toast.error("Every storage location needs a name and a capacity above zero.");
        return;
      }
      setStep(3);
      return;
    }
    submit();
  };

  const submit = async () => {
    if (!responsible.trim()) {
      toast.error("Assign at least one responsible person.");
      return;
    }
    setSaving(true);
    try {
      const result = await configure({
        categories: DEFAULT_WASTE_CATEGORIES,
        collectionPoints: DEFAULT_COLLECTION_POINTS,
        stages: DEFAULT_STAGES,
        units: ["L", "kg"],
        thresholds,
        reductionTargetPct: reductionTarget,
        segregation: DEFAULT_SEGREGATION,
        recoveryMethods: DEFAULT_RECOVERY_METHODS,
        disposalMethods: DEFAULT_DISPOSAL_METHODS,
        responsible: responsible
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
        collectionSchedule: schedule,
        storageLocations: storage.map((location) => ({
          name: location.name.trim(),
          capacity: location.capacity,
          unit: location.unit,
        })),
        notificationEmail: user?.email,
        costs,
        seedDemo: true,
      });
      toast.success("Waste management configured", {
        description: `${result.seeded} SIMULATED demo records were created. Real manual and IOT records stay labelled.`,
      });
    } catch (error) {
      toast.error("Could not save waste configuration", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            First-time setup · configured once per plant
          </p>
          <h1 className="mt-1 font-display text-[26px] font-semibold tracking-tight text-navy">
            Set up Waste Management
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
            Define the six waste streams, thresholds, storage and costs your plant will track. This
            wizard appears only until the plant is configured.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/[0.07] px-3 py-1 text-[9.5px] font-semibold text-warning-ink">
          <Database className="size-3" /> SIMULATED demo data after setup
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {STEPS.map((item) => {
          const Icon = item.icon;
          const active = step === item.id;
          const done = step > item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5",
                active ? "border-primary/30 bg-primary/[0.045]" : done ? "border-success/20 bg-success/[0.035]" : "border-border/70 bg-card",
              )}
            >
              <span className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                active ? "bg-primary text-white" : done ? "bg-success text-white" : "bg-muted text-muted-foreground",
              )}>
                {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Step {item.id}</p>
                <p className={cn("truncate text-[10.5px] font-semibold", active ? "text-primary" : "text-navy")}>{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-border/80 bg-card p-4 shadow-card sm:p-5">
        {step === 1 && (
          <div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 size-4 text-primary" />
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">Plant scope and waste streams</h2>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  DairySense tracks exactly these six streams. Recoverable cream, by-products and
                  saleable product are not automatically classified as waste.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {WASTE_CATEGORIES.map((category) => {
                const meta = wasteCategoryMeta(category);
                const Icon = meta.icon;
                return (
                  <div key={category} className="rounded-lg border border-border/70 bg-background/45 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("flex size-7 items-center justify-center rounded-md border", meta.accent)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-semibold text-success-ink">
                        <Check className="size-2.5" /> Included
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-navy">{category}</p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{meta.description}</p>
                    <p className="mt-1 text-[8.5px] font-medium uppercase tracking-wider text-muted-foreground">Base unit: {meta.unit}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border/70 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="size-3" /> Collection points
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {DEFAULT_COLLECTION_POINTS.map((point) => (
                    <span key={point} className="rounded-md bg-muted/70 px-2 py-0.5 text-[9px] text-muted-foreground">{point}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="size-3" /> Processing stages tracked
                </p>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
                  {DEFAULT_STAGES.length} stages from raw milk reception through CIP and wastewater
                  treatment. Every record captures a stage, and optionally a machine and batch.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 size-4 text-primary" />
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">Thresholds, target and storage</h2>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  Thresholds drive the attention state on dashboards. A threshold is not a reading
                  and never replaces missing data.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "milkLitres" as const, label: "Milk waste", suffix: "L / day" },
                { key: "wastewaterLitres" as const, label: "Wastewater", suffix: "L / day" },
                { key: "packagingKg" as const, label: "Packaging waste", suffix: "kg / day" },
                { key: "rejectedKg" as const, label: "Rejected product", suffix: "kg / day" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[10px]">{field.label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={thresholds[field.key]}
                      onChange={(event) =>
                        setThresholds((current) => ({ ...current, [field.key]: Number(event.target.value) }))
                      }
                      className="h-9 pr-14 text-[11px]"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8.5px] text-muted-foreground">{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_2fr]">
              <div className="space-y-1">
                <Label className="text-[10px]">Reduction target</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    value={reductionTarget}
                    onChange={(event) => setReductionTarget(Number(event.target.value))}
                    className="h-9 pr-8 text-[11px]"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                </div>
                <p className="text-[9px] leading-relaxed text-muted-foreground">Compared against the previous period of equal length.</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="size-3" /> Storage locations
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {storage.map((location, index) => (
                    <div key={index} className="grid grid-cols-[1fr_90px_62px] gap-1.5">
                      <Input
                        value={location.name}
                        onChange={(event) => updateStorage(index, { name: event.target.value })}
                        className="h-8 text-[10px]"
                        aria-label={`Storage location ${index + 1}`}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={location.capacity}
                        onChange={(event) => updateStorage(index, { capacity: Number(event.target.value) })}
                        className="h-8 text-[10px]"
                        aria-label={`Capacity ${index + 1}`}
                      />
                      <Select value={location.unit} onValueChange={(value) => updateStorage(index, { unit: value })}>
                        <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 text-primary" />
              <div>
                <h2 className="font-display text-[15px] font-semibold text-navy">Costs, ownership and demo data</h2>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  Cost values are planning estimates, not invoices or audited accounts. You can
                  change them later in Settings.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { key: "milkPerLitre" as const, label: "Milk loss", suffix: "₹ / L" },
                { key: "packagingPerKg" as const, label: "Packaging", suffix: "₹ / kg" },
                { key: "disposalPerKg" as const, label: "Disposal", suffix: "₹ / kg" },
                { key: "wastewaterPerLitre" as const, label: "Wastewater treatment", suffix: "₹ / L" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[10px]">{field.label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={costs[field.key]}
                      onChange={(event) => setCosts((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                      className="h-9 pr-12 text-[11px]"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8.5px] text-muted-foreground">{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Responsible people</Label>
                <Input value={responsible} onChange={(event) => setResponsible(event.target.value)} className="h-9 text-[11px]" placeholder="Plant manager, QA officer…" />
                <p className="text-[9px] text-muted-foreground">Comma-separated. Used for ownership and record attribution.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Collection schedule</Label>
                <Input value={schedule} onChange={(event) => setSchedule(event.target.value)} className="h-9 text-[11px]" />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/[0.055] p-3">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-warning-ink">
                <Database className="size-3.5" /> Demo records will be created
              </p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-warning-ink/85">
                To make every chart and report explorable without hardware, setup seeds 30 days of
                clearly labelled SIMULATED records. MANUAL and IOT records you add later are labelled
                separately. No generated value is presented as a real plant reading.
              </p>
            </div>

            <div className="mt-3 grid gap-2 rounded-lg bg-background/60 p-3 text-[10px] sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Categories</p>
                <p className="font-semibold text-navy">6 streams</p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage capacity</p>
                <p className="font-semibold text-navy">{storage.reduce((total, item) => total + item.capacity, 0).toLocaleString("en-IN")} total units</p>
              </div>
              <div>
                <p className="text-muted-foreground">Planning cost rate</p>
                <p className="font-semibold text-navy">{formatInr(costs.milkPerLitre)}/L milk</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <div className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <CheckCircle2 className="size-3 text-success" />
            Setup runs once. Missing readings stay missing.
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep((current) => current - 1)} disabled={saving}>
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next} disabled={saving}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {step === 3 ? "Configure waste" : "Continue"}
              {!saving && step < 3 && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
