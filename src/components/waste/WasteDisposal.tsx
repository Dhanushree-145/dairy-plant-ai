import {
  EmptyWaste,
  WasteCategoryBadge,
  WasteSection,
  WasteSourcePill,
} from "@/components/waste/WasteBits";
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
import { useAuth } from "@/hooks/use-auth";
import {
  formatQuantity,
  formatWasteTime,
  type WasteConfig,
  type WasteDashboardData,
  type WasteRecord,
} from "@/lib/waste";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function WasteDisposal({
  data,
  config,
}: {
  data: WasteDashboardData;
  config: WasteConfig;
}) {
  const { user } = useAuth();
  const addDisposal = useMutation(api.waste.addDisposal);
  const pending = useMemo(
    () => data.records.filter((record) => record.disposalStatus === "Pending disposal"),
    [data.records],
  );
  const [selected, setSelected] = useState<WasteRecord["id"][]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [method, setMethod] = useState(config.recoveryMethods[0] ?? "Recycled");
  const [destination, setDestination] = useState("Authorized vendor");
  const [collectedBy, setCollectedBy] = useState(user?.name ?? "Plant manager");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRecords = pending.filter((record) => selected.includes(record.id));
  const selectedMass = selectedRecords.reduce(
    (total, record) => total + (record.category === "Wastewater" ? 0 : record.quantity),
    0,
  );
  const selectedLiquid = selectedRecords.reduce(
    (total, record) => total + (record.category === "Wastewater" ? record.quantity : 0),
    0,
  );

  const storageSummary = useMemo(() => {
    const map = new Map<string, { records: number; quantities: Map<string, number> }>();
    for (const record of pending) {
      const entry = map.get(record.storageLocation) ?? { records: 0, quantities: new Map<string, number>() };
      entry.records += 1;
      entry.quantities.set(record.unit, (entry.quantities.get(record.unit) ?? 0) + record.quantity);
      map.set(record.storageLocation, entry);
    }
    return [...map.entries()];
  }, [pending]);

  const toggle = (id: WasteRecord["id"]) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.length === pending.length ? [] : pending.slice(0, 40).map((record) => record.id),
    );
  };

  const submit = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one pending record.");
      return;
    }
    if (method.trim().length < 2 || destination.trim().length < 2) {
      toast.error("Choose a method and record the destination.");
      return;
    }
    setSaving(true);
    try {
      await addDisposal({
        recordIds: selected,
        method,
        destination,
        collectedBy,
        notes: notes.trim() || undefined,
      });
      toast.success("Disposal confirmed", {
        description: `${selected.length} records updated · ${method} · ${destination}.`,
      });
      setSelected([]);
      setNotes("");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Could not confirm disposal", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WasteSection
        title="Pending segregation & disposal"
        subtitle="Select weighed or verified records, then confirm the recovery or disposal route."
        className="lg:col-span-2"
        action={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={toggleAll} disabled={pending.length === 0}>
              {selected.length === pending.length && pending.length > 0 ? "Clear all" : "Select all"}
            </Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={() => setDialogOpen(true)} disabled={selected.length === 0}>
              <PackageCheck className="size-3" /> Confirm disposal
            </Button>
          </div>
        }
      >
        {pending.length === 0 ? (
          <EmptyWaste text="No records are waiting for disposal in the current view." />
        ) : (
          <div className="space-y-1.5">
            {pending.slice(0, 40).map((record) => (
              <label
                key={record.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors",
                  selected.includes(record.id)
                    ? "border-primary/30 bg-primary/[0.045]"
                    : "border-border/60 bg-background/40 hover:border-primary/20",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(record.id)}
                  onChange={() => toggle(record.id)}
                  className="mt-0.5 size-3.5 accent-[#146C60]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <WasteCategoryBadge category={record.category} />
                      <WasteSourcePill source={record.source} />
                    </div>
                    <p className="font-semibold text-navy">{formatQuantity(record.quantity, record.unit)}</p>
                  </div>
                  <p className="mt-1 text-[9.5px] text-muted-foreground">
                    {record.stage} · {[record.machineCode, record.batchId].filter(Boolean).join(" · ") || "No machine / batch"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap justify-between gap-1 text-[8.5px] text-muted-foreground">
                    <span>{record.storageLocation} · {record.employee}</span>
                    <span>{formatWasteTime(record.recordedAt)}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {pending.length > 40 && (
          <p className="mt-2 text-[9px] text-muted-foreground">Showing the 40 most recent pending records. Use Records to inspect the full list.</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2 text-[9.5px]">
          <span className="text-muted-foreground">
            <span className="font-semibold text-navy">{selected.length}</span> selected ·{" "}
            <span className="font-semibold text-navy">{selectedMass.toFixed(1)}</span> kg eq.
            {selectedLiquid > 0 && <> · <span className="font-semibold text-navy">{selectedLiquid.toLocaleString("en-IN")}</span> L wastewater</>}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" /> Confirmation is audit-logged
          </span>
        </div>
      </WasteSection>

      <div className="space-y-4">
        <WasteSection title="Storage load" subtitle="Pending quantities by configured location">
          {storageSummary.length === 0 ? (
            <EmptyWaste text="No pending storage load." />
          ) : (
            <div className="space-y-1.5">
              {storageSummary.map(([location, value]) => (
                <div key={location} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10.5px] font-semibold text-navy">{location}</p>
                    <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[8px] font-semibold text-warning-ink">{value.records} records</span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {[...value.quantities.entries()].map(([unit, quantity]) => formatQuantity(quantity, unit)).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </WasteSection>

        <WasteSection title="Disposal history" subtitle="Confirmed handovers, collections and recoveries" action={<Truck className="size-3.5 text-muted-foreground" />}>
          {data.disposals.length === 0 ? (
            <EmptyWaste text="No disposal has been confirmed yet." />
          ) : (
            <div className="space-y-1.5">
              {data.disposals.slice(0, 8).map((disposal) => (
                <div key={disposal.id} className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10.5px] font-semibold text-navy">{disposal.method}</p>
                      <p className="text-[9px] text-muted-foreground">{disposal.destination} · {disposal.recordCount} records</p>
                    </div>
                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                  </div>
                  <p className="mt-1 text-[8.5px] text-muted-foreground">
                    {formatWasteTime(disposal.collectedAt)} · {disposal.collectedBy}
                  </p>
                  {disposal.notes && <p className="mt-0.5 text-[8.5px] italic text-muted-foreground">{disposal.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </WasteSection>

        <div className="rounded-xl border border-success/20 bg-success/[0.035] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-success-ink">
            <Recycle className="size-3.5" /> Recovery is not automatically waste
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            Cream, saleable by-products and recoverable material must be classified by an authorized
            person. Disposal methods are configured in Settings.
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(next) => !next && setDialogOpen(false)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-[16px] text-navy">Confirm disposal</DialogTitle>
            <DialogDescription className="text-[11px]">
              {selected.length} records · {selectedMass.toFixed(1)} kg eq.
              {selectedLiquid > 0 ? ` · ${selectedLiquid.toLocaleString("en-IN")} L wastewater` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10.5px]">Recovery / disposal method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...config.recoveryMethods, ...config.disposalMethods].map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10.5px]">Destination</Label>
              <Input value={destination} onChange={(event) => setDestination(event.target.value)} className="h-9 text-[11px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10.5px]">Collected by</Label>
              <Input value={collectedBy} onChange={(event) => setCollectedBy(event.target.value)} className="h-9 text-[11px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10.5px]">Handover notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Manifest or weighbridge reference…" className="min-h-[54px] text-[11px]" />
            </div>
            <div className="rounded-md border border-primary/15 bg-primary/[0.035] p-2 text-[9px] leading-relaxed text-muted-foreground">
              Confirming sets the selected records to recycled or disposed and stores a disposal
              event. Recovery volumes remain separate from generated waste totals.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || selected.length === 0}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Confirm {selected.length} records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
