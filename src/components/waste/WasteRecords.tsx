import {
  DemoDataBadge,
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
  disposalStatusMeta,
  downloadCsv,
  formatQuantity,
  formatWasteTime,
  type WasteConfig,
  type WasteDashboardData,
  type WasteRecord,
  wasteCategoryMeta,
} from "@/lib/waste";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatusFilter = "all" | "pending" | "handled";

export function WasteRecords({
  data,
  config,
}: {
  data: WasteDashboardData;
  config: WasteConfig;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [visible, setVisible] = useState(25);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WasteRecord | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.category,
          record.stage,
          record.machineCode,
          record.batchId,
          record.employee,
          record.reason,
          record.storageLocation,
          record.recoveryMethod,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory = category === "all" || record.category === category;
      const matchesSource = source === "all" || record.source === source;
      const matchesStatus =
        status === "all" ||
        (status === "pending"
          ? record.disposalStatus === "Pending disposal"
          : record.disposalStatus !== "Pending disposal");
      return matchesSearch && matchesCategory && matchesSource && matchesStatus;
    });
  }, [category, data.records, search, source, status]);

  const exportFiltered = () => {
    downloadCsv(`dairysense-waste-records-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Recorded at", "Category", "Quantity", "Unit", "Source", "Stage", "Machine", "Batch", "Responsible", "Reason", "Disposal status", "Recovery method", "Storage", "Verification"],
      ...filtered.map((record) => [
        formatWasteTime(record.recordedAt),
        record.category,
        record.quantity,
        record.unit,
        record.source.toUpperCase(),
        record.stage,
        record.machineCode ?? "",
        record.batchId ?? "",
        record.employee,
        record.reason,
        record.disposalStatus,
        record.recoveryMethod,
        record.storageLocation,
        record.verificationStatus,
      ]),
    ]);
  };

  return (
    <WasteSection
      title="Waste records"
      subtitle="Every record keeps its source label, stage, machine, batch and disposal state."
      action={
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={exportFiltered} disabled={filtered.length === 0}>
            <Download className="size-3" /> CSV
          </Button>
          <Button size="sm" className="h-7 text-[10px]" onClick={() => setAddOpen(true)}>
            <Plus className="size-3" /> Add record
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/50 p-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search machine, batch, employee, reason…"
            className="h-8 pl-8 text-[10.5px]"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:flex">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 min-w-0 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {config.categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-8 min-w-0 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="manual">MANUAL</SelectItem>
              <SelectItem value="iot">IOT</SelectItem>
              <SelectItem value="simulated">SIMULATED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-8 min-w-0 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All disposal</SelectItem>
              <SelectItem value="pending">Pending disposal</SelectItem>
              <SelectItem value="handled">Handled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[9px] text-muted-foreground">
        <span>{filtered.length} of {data.records.length} records in this view · {data.periodRecords} in the {data.rangeDays}-day period</span>
        <DemoDataBadge />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-2"><EmptyWaste text="No waste records match the current filters." /></div>
      ) : (
        <>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/70 bg-background/60 text-[8.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2.5 py-2 font-semibold">Recorded</th>
                  <th className="px-2.5 py-2 font-semibold">Category</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Quantity</th>
                  <th className="px-2.5 py-2 font-semibold">Source</th>
                  <th className="px-2.5 py-2 font-semibold">Stage / machine / batch</th>
                  <th className="px-2.5 py-2 font-semibold">Responsible</th>
                  <th className="px-2.5 py-2 font-semibold">Storage</th>
                  <th className="px-2.5 py-2 font-semibold">Disposal</th>
                  <th className="px-2.5 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, visible).map((record) => {
                  const disposal = disposalStatusMeta(record.disposalStatus);
                  return (
                    <tr key={record.id} className="border-b border-border/45 text-[10px] last:border-0 hover:bg-background/45">
                      <td className="whitespace-nowrap px-2.5 py-2 text-muted-foreground">{formatWasteTime(record.recordedAt)}</td>
                      <td className="px-2.5 py-2"><WasteCategoryBadge category={record.category} /></td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold text-navy">{formatQuantity(record.quantity, record.unit)}</td>
                      <td className="px-2.5 py-2"><WasteSourcePill source={record.source} /></td>
                      <td className="px-2.5 py-2">
                        <p className="font-medium text-navy">{record.stage}</p>
                        <p className="text-[8.5px] text-muted-foreground">
                          {[record.machineCode, record.batchId].filter(Boolean).join(" · ") || "No machine / batch"}
                        </p>
                      </td>
                      <td className="px-2.5 py-2 text-muted-foreground">{record.employee}</td>
                      <td className="px-2.5 py-2 text-muted-foreground">{record.storageLocation}</td>
                      <td className="px-2.5 py-2">
                        <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold", disposal.className)}>
                          {disposal.label}
                        </span>
                        <p className="mt-0.5 max-w-[130px] truncate text-[8.5px] text-muted-foreground">{record.recoveryMethod}</p>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditing(record)} aria-label={`Edit ${record.category} record`}>
                          <Pencil className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible < filtered.length && (
            <div className="mt-2 flex justify-center">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setVisible((count) => count + 25)}>
                Show 25 more
              </Button>
            </div>
          )}
        </>
      )}

      <p className="mt-2 text-[8.5px] leading-relaxed text-muted-foreground">
        Missing readings are not shown as zero. Edits reset verification to pending review and are
        audit-logged per plant.
      </p>

      {addOpen && (
        <AddRecordDialog
          key={config.updatedAt}
          open
          onClose={() => setAddOpen(false)}
          config={config}
          defaultEmployee={user?.name ?? ""}
        />
      )}
      {editing && (
        <EditRecordDialog
          key={editing.id}
          record={editing}
          onClose={() => setEditing(null)}
          config={config}
        />
      )}
    </WasteSection>
  );
}

function AddRecordDialog({
  open,
  onClose,
  config,
  defaultEmployee,
}: {
  open: boolean;
  onClose: () => void;
  config: WasteConfig;
  defaultEmployee: string;
}) {
  const addRecord = useMutation(api.waste.addRecord);
  const [category, setCategory] = useState(config.categories[0] ?? "Milk waste");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(wasteCategoryMeta(config.categories[0] ?? "Milk waste").unit);
  const [source, setSource] = useState<"manual" | "iot" | "simulated">("manual");
  const [stage, setStage] = useState(config.stages[0] ?? "");
  const [machineCode, setMachineCode] = useState("");
  const [batchId, setBatchId] = useState("");
  const [employee, setEmployee] = useState(defaultEmployee || config.responsible[0] || "");
  const [reason, setReason] = useState("");
  const [storageLocation, setStorageLocation] = useState(config.storageLocations[0]?.name ?? "");
  const [notes, setNotes] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [saving, setSaving] = useState(false);

  const changeCategory = (next: string) => {
    setCategory(next);
    setUnit(wasteCategoryMeta(next).unit);
  };

  const submit = async () => {
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Record a reason for the waste.");
      return;
    }
    if (employee.trim().length < 2) {
      toast.error("Record the responsible employee.");
      return;
    }
    setSaving(true);
    try {
      await addRecord({
        category,
        quantity: parsed,
        unit,
        source,
        stage,
        machineCode: machineCode.trim() || undefined,
        batchId: batchId.trim() || undefined,
        employee,
        reason,
        storageLocation,
        notes: notes.trim() || undefined,
        evidenceName: evidenceName.trim() || undefined,
        disposalStatus: "Pending disposal",
        recoveryMethod: "Not assigned",
      });
      toast.success("Waste record added", {
        description: `${category} · ${parsed} ${unit} · ${source.toUpperCase()} · pending disposal.`,
      });
      setQuantity("");
      setReason("");
      setNotes("");
      setEvidenceName("");
      onClose();
    } catch (error) {
      toast.error("Could not add waste record", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[17px] text-navy">Add waste record</DialogTitle>
          <DialogDescription className="text-[11px]">
            New records start as pending disposal. Do not use this form for saleable product,
            recoverable cream or other by-products.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[10px]">Category</Label>
            <Select value={category} onValueChange={changeCategory}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {config.categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Quantity</Label>
            <div className="flex gap-1.5">
              <Input type="number" min={0} step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-9 text-[11px]" />
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} className="h-9 w-16 text-[11px]" aria-label="Unit" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as typeof source)}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">MANUAL · human entry</SelectItem>
                <SelectItem value="iot">IOT · connected device</SelectItem>
                <SelectItem value="simulated">SIMULATED · demo only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Processing stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {config.stages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Responsible employee</Label>
            <Input value={employee} onChange={(event) => setEmployee(event.target.value)} className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Machine code <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input value={machineCode} onChange={(event) => setMachineCode(event.target.value)} placeholder="PM-01" className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Batch ID <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input value={batchId} onChange={(event) => setBatchId(event.target.value)} placeholder="B-2405" className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[10px]">Reason</Label>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Transfer line flush loss, seal failure…" className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Storage location</Label>
            <Select value={storageLocation} onValueChange={setStorageLocation}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {config.storageLocations.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Evidence reference <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input value={evidenceName} onChange={(event) => setEvidenceName(event.target.value)} placeholder="Weighbridge slip or photo reference" className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[10px]">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[54px] text-[11px]" />
          </div>
        </div>

        <div className="rounded-md border border-warning/25 bg-warning/[0.05] p-2 text-[9px] leading-relaxed text-warning-ink">
          Source label is permanent on the record. SIMULATED entries are demo data, not plant
          measurements. Records with missing readings are never assumed to be zero.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Add record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRecordDialog({
  record,
  onClose,
  config,
}: {
  record: WasteRecord;
  onClose: () => void;
  config: WasteConfig;
}) {
  const updateRecord = useMutation(api.waste.updateRecord);
  const [quantity, setQuantity] = useState(String(record.quantity));
  const [reason, setReason] = useState(record.reason);
  const [disposalStatus, setDisposalStatus] = useState(record.disposalStatus);
  const [recoveryMethod, setRecoveryMethod] = useState(record.recoveryMethod);
  const [notes, setNotes] = useState(record.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Record a reason for the change.");
      return;
    }
    setSaving(true);
    try {
      await updateRecord({
        recordId: record.id,
        quantity: parsed,
        reason,
        disposalStatus,
        recoveryMethod,
        notes: notes.trim() || undefined,
      });
      toast.success("Waste record updated", { description: "Verification returned to pending review." });
      onClose();
    } catch (error) {
      toast.error("Could not update record", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[16px] text-navy">Edit waste record</DialogTitle>
          <DialogDescription className="text-[11px]">
            {record.category} · {formatWasteTime(record.recordedAt)} · {record.source.toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10.5px]">Quantity ({record.unit})</Label>
            <Input type="number" min={0} step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Disposal status</Label>
            <Select value={disposalStatus} onValueChange={setDisposalStatus}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Pending disposal", "Recycled", "Recovered", "Disposed", "Treated"].map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Recovery / disposal method</Label>
            <Select value={recoveryMethod} onValueChange={setRecoveryMethod}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Not assigned">Not assigned</SelectItem>
                {[...config.recoveryMethods, ...config.disposalMethods].map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Reason for change</Label>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[54px] text-[11px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
