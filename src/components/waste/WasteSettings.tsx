import { WasteSection } from "@/components/waste/WasteBits";
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
import {
  formatWasteDate,
  type WasteConfig,
} from "@/lib/waste";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function WasteSettings({ config }: { config: WasteConfig }) {
  const configure = useMutation(api.waste.configure);
  const [thresholds, setThresholds] = useState(config.thresholds);
  const [target, setTarget] = useState(config.reductionTargetPct);
  const [costs, setCosts] = useState(config.costs);
  const [responsible, setResponsible] = useState(config.responsible.join(", "));
  const [schedule, setSchedule] = useState(config.collectionSchedule);
  const [storage, setStorage] = useState(config.storageLocations.map((item) => ({ ...item })));
  const [saving, setSaving] = useState(false);

  const updateStorage = (index: number, patch: Partial<(typeof storage)[number]>) => {
    setStorage((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const save = async () => {
    if (!responsible.trim()) {
      toast.error("Assign at least one responsible person.");
      return;
    }
    if (storage.some((location) => !location.name.trim() || location.capacity <= 0)) {
      toast.error("Every storage location needs a valid name and capacity.");
      return;
    }
    setSaving(true);
    try {
      await configure({
        categories: config.categories,
        collectionPoints: config.collectionPoints,
        stages: config.stages,
        units: config.units,
        thresholds,
        reductionTargetPct: target,
        segregation: config.segregation,
        recoveryMethods: config.recoveryMethods,
        disposalMethods: config.disposalMethods,
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
        notificationEmail: config.notificationEmail,
        costs,
        seedDemo: false,
      });
      toast.success("Waste settings saved", {
        description: "Thresholds and cost estimates apply to subsequent dashboard calculations.",
      });
    } catch (error) {
      toast.error("Could not save settings", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <WasteSection title="Thresholds and reduction target" subtitle="Positive thresholds only; these never substitute for a missing reading">
          <div className="grid gap-2.5 sm:grid-cols-2">
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
                    onChange={(event) => setThresholds((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                    className="h-9 pr-14 text-[11px]"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8.5px] text-muted-foreground">{field.suffix}</span>
                </div>
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[10px]">Reduction target</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={target}
                  onChange={(event) => setTarget(Number(event.target.value))}
                  className="h-9 pr-8 text-[11px]"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </WasteSection>

        <WasteSection title="Planning costs" subtitle="Used for estimates only, not invoices or audited accounts">
          <div className="grid gap-2.5 sm:grid-cols-2">
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
        </WasteSection>

        <WasteSection title="Ownership and storage" subtitle="Storage capacities support segregation planning">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Responsible people</Label>
              <Input value={responsible} onChange={(event) => setResponsible(event.target.value)} className="h-9 text-[11px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Collection schedule</Label>
              <Input value={schedule} onChange={(event) => setSchedule(event.target.value)} className="h-9 text-[11px]" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {storage.map((location, index) => (
              <div key={index} className="grid grid-cols-[1fr_90px_62px] gap-1.5">
                <Input value={location.name} onChange={(event) => updateStorage(index, { name: event.target.value })} className="h-8 text-[10px]" aria-label={`Storage location ${index + 1}`} />
                <Input type="number" min={1} value={location.capacity} onChange={(event) => updateStorage(index, { capacity: Number(event.target.value) })} className="h-8 text-[10px]" aria-label={`Capacity ${index + 1}`} />
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
        </WasteSection>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save settings
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <WasteSection title="Configured scope" subtitle="First-time setup is complete for this plant">
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Configured since</span>
              <span className="font-semibold text-navy">{formatWasteDate(config.completedAt)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Waste categories</span>
              <span className="font-semibold text-navy">{config.categories.length} fixed streams</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Processing stages</span>
              <span className="font-semibold text-navy">{config.stages.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Collection points</span>
              <span className="font-semibold text-navy">{config.collectionPoints.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-semibold text-navy">{formatWasteDate(config.updatedAt)}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {config.categories.map((category) => (
              <span key={category} className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[8.5px] text-muted-foreground">{category}</span>
            ))}
          </div>
        </WasteSection>

        <WasteSection title="Recovery & disposal methods" subtitle="Available when confirming a disposal">
          <div className="space-y-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-success-ink">Recovery</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {config.recoveryMethods.map((method) => (
                  <span key={method} className="rounded-md border border-success/20 bg-success/[0.05] px-1.5 py-0.5 text-[8.5px] text-success-ink">{method}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Disposal</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {config.disposalMethods.map((method) => (
                  <span key={method} className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[8.5px] text-muted-foreground">{method}</span>
                ))}
              </div>
            </div>
          </div>
        </WasteSection>

        <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> Audit and data integrity
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            Configuration, record edits and disposal confirmations are audit-logged. Source labels
            (MANUAL / IOT / SIMULATED) cannot be rewritten by settings.
          </p>
          <p className="mt-2 flex items-center gap-1 text-[8.5px] text-success-ink">
            <CheckCircle2 className="size-3" /> Shared Convex database · per-plant isolation
          </p>
        </div>
      </div>
    </div>
  );
}
