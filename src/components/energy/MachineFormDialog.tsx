import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  buildDraft,
  categoryMeta,
  draftFromRecord,
  friendlyError,
  MACHINE_CATEGORIES,
  nextAvailableCode,
  PROCESSING_STAGES,
  todayIso,
  type MachineDraft,
  type MachineRecord,
} from "@/lib/energy";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

export function MachineFormDialog({
  open,
  onOpenChange,
  machine,
  existingCodes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: MachineRecord | null;
  existingCodes: string[];
}) {
  const editing = machine !== null;
  const [draft, setDraft] = useState<MachineDraft>(() => {
    if (machine) return draftFromRecord(machine);
    const base = buildDraft("chilling", 0);
    return { ...base, code: nextAvailableCode("chilling", existingCodes) };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const createBatch = useMutation(api.machines.createBatch);
  const updateMachine = useMutation(api.machines.update);

  const changeCategory = (categoryId: string) => {
    const category = categoryMeta(categoryId);
    setDraft((current) => ({
      ...current,
      category: categoryId,
      stage: category.defaultStage,
      capacityValue: category.defaultCapacity,
      capacityUnit: category.capacityUnit,
      ratedKw: category.defaultRatedKw,
      baselineKwhPerHour:
        Math.round(category.defaultRatedKw * category.dutyFactor * 10) / 10,
      code: editing ? current.code : nextAvailableCode(categoryId, existingCodes),
    }));
  };

  const submit = async () => {
    setError(null);
    if (!draft.name.trim() || !draft.code.trim()) {
      setError("Machine name and machine ID are required.");
      return;
    }
    if (
      !Number.isFinite(draft.capacityValue) ||
      draft.capacityValue <= 0 ||
      !Number.isFinite(draft.ratedKw) ||
      draft.ratedKw <= 0 ||
      !Number.isFinite(draft.baselineKwhPerHour) ||
      draft.baselineKwhPerHour <= 0
    ) {
      setError("Capacity, rated power and baseline load must be greater than zero.");
      return;
    }
    if (!draft.capacityUnit.trim()) {
      setError("Add a capacity unit, for example L/h or packs/h.");
      return;
    }

    setSaving(true);
    try {
      if (editing && machine) {
        await updateMachine({ machineId: machine._id, ...payloadFromDraft(draft) });
        toast.success("Machine updated", {
          description: `${draft.name.trim()} now uses the new configuration.`,
        });
      } else {
        await createBatch({ machines: [payloadFromDraft(draft)] });
        toast.success("Machine registered", {
          description: `${draft.name.trim()} is now part of your fleet.`,
        });
      }
      onOpenChange(false);
    } catch (submitError) {
      const message = friendlyError(submitError);
      setError(message);
      toast.error("Could not save machine", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-0 sm:w-full">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle className="font-display text-[17px] text-navy">
            {editing ? "Edit machine" : "Add a machine"}
          </DialogTitle>
          <DialogDescription className="text-[11.5px] leading-relaxed">
            {editing
              ? "Update the equipment record. New readings follow the revised baseline after saving."
              : "Register one piece of equipment. You can add the rest of the fleet from the setup wizard or this dialog."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="machine-name" className="text-[11.5px] font-medium text-navy">
              Machine name
            </Label>
            <Input
              id="machine-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Chilling system 1"
              className="h-9 text-[12.5px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="machine-code" className="text-[11.5px] font-medium text-navy">
              Machine ID
            </Label>
            <Input
              id="machine-code"
              value={draft.code}
              onChange={(event) =>
                setDraft((current) => ({ ...current, code: event.target.value }))
              }
              placeholder="CH-01"
              className="h-9 text-[12.5px] uppercase placeholder:normal-case"
            />
            <p className="text-[10px] text-muted-foreground">
              Unique within your plant. Used on every alert and report.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11.5px] font-medium text-navy">Category</Label>
            <Select value={draft.category} onValueChange={changeCategory}>
              <SelectTrigger className="h-9 w-full text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MACHINE_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11.5px] font-medium text-navy">
              Processing stage
            </Label>
            <Select
              value={draft.stage}
              onValueChange={(stage) => setDraft((current) => ({ ...current, stage }))}
            >
              <SelectTrigger className="h-9 w-full text-[12.5px]">
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

          <div className="space-y-1.5">
            <Label htmlFor="machine-capacity" className="text-[11.5px] font-medium text-navy">
              Capacity
            </Label>
            <div className="flex gap-2">
              <Input
                id="machine-capacity"
                type="number"
                min={1}
                value={draft.capacityValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    capacityValue: Number(event.target.value),
                  }))
                }
                className="h-9 text-[12.5px]"
              />
              <Input
                aria-label="Capacity unit"
                value={draft.capacityUnit}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    capacityUnit: event.target.value,
                  }))
                }
                className="h-9 w-24 text-[12.5px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="machine-rated" className="text-[11.5px] font-medium text-navy">
              Rated power (kW)
            </Label>
            <Input
              id="machine-rated"
              type="number"
              min={0.1}
              step="0.1"
              value={draft.ratedKw}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ratedKw: Number(event.target.value),
                  baselineKwhPerHour:
                    Math.round(
                      Number(event.target.value) *
                        categoryMeta(current.category).dutyFactor *
                        10,
                    ) / 10,
                }))
              }
              className="h-9 text-[12.5px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="machine-baseline" className="text-[11.5px] font-medium text-navy">
              Baseline load (kWh/h)
            </Label>
            <Input
              id="machine-baseline"
              type="number"
              min={0.1}
              step="0.1"
              value={draft.baselineKwhPerHour}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  baselineKwhPerHour: Number(event.target.value),
                }))
              }
              className="h-9 text-[12.5px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Expected average load at normal duty. Anomaly alerts compare against it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="machine-installed" className="text-[11.5px] font-medium text-navy">
              Installation date
            </Label>
            <Input
              id="machine-installed"
              type="date"
              max={todayIso()}
              value={draft.installedAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, installedAt: event.target.value }))
              }
              className="h-9 text-[12.5px]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="machine-specs" className="text-[11.5px] font-medium text-navy">
              Specifications <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="machine-specs"
              value={draft.specifications}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  specifications: event.target.value,
                }))
              }
              placeholder="Make, model, refrigerant, temperature range, controller…"
              rows={2}
              className="resize-none text-[12.5px]"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[11.5px] text-danger sm:col-span-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-8 text-[11.5px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={saving}
            className="h-8 min-w-[112px] text-[11.5px]"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving
              </>
            ) : editing ? (
              "Save changes"
            ) : (
              "Add machine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
