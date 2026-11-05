import { AppShell } from "@/components/dashboard/AppShell";
import {
  EmptyHygiene,
  HYGIENE_ACCENTS,
  HYGIENE_ICONS,
  HygieneSection,
  HygieneStatusPill,
  KpiTile,
  SensorStatusPill,
  SourcePill,
} from "@/components/hygiene/HygieneBits";
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
import { useLiveNow } from "@/hooks/use-live-now";
import {
  formatHygieneTime,
  HYGIENE_CATEGORIES,
  relativeHygieneTime,
  type HygieneAssetData,
} from "@/lib/hygiene";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Droplets,
  FileCheck2,
  Gauge,
  History,
  Loader2,
  Package,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

type AssetSensor = HygieneAssetData["sensors"][number];

export default function HygieneAsset() {
  const { assetKey } = useParams<{ assetKey: string }>();
  const { user } = useAuth();
  const now = useLiveNow();
  const [cleaningOpen, setCleaningOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sensorReading, setSensorReading] = useState<AssetSensor | null>(null);

  const data = useQuery(api.hygiene.asset, assetKey ? { assetKey, now } : "skip");

  if (data === null) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-navy">Asset not found</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            This hygiene asset may have been removed or you followed an old link.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/dashboard/hygiene">
              <ArrowLeft className="size-3.5" /> Back to Hygiene
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
        <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  const { asset } = data;
  const category = HYGIENE_CATEGORIES.find((item) => item.key === asset.category);
  const Icon = HYGIENE_ICONS[asset.category];
  const isPending = asset.verificationStatus === "pending" || asset.status === "verification_pending";

  return (
    <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/dashboard/hygiene/category/${asset.category}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            {category?.label ?? "Hygiene category"}
          </Link>
          <span className="rounded-full border border-warning/25 bg-warning/[0.07] px-2.5 py-1 text-[9.5px] font-semibold text-warning-ink">
            Simulated evidence · demo
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", HYGIENE_ACCENTS[asset.category])}>
                <Icon className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[22px] font-semibold tracking-tight text-navy sm:text-[26px]">
                    {asset.name}
                  </h1>
                  <HygieneStatusPill status={asset.status} />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {asset.code} · {asset.subtype} · {asset.stage}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>Zone: <span className="font-medium text-navy">{asset.zone}</span></span>
                  <span>Operator: <span className="font-medium text-navy">{asset.operator}</span></span>
                  <span>Interval: <span className="font-medium text-navy">every {asset.intervalHours} hr</span></span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVerifyOpen(true)}
                disabled={!isPending}
                title={isPending ? undefined : "Record cleaning first — QA can only verify pending evidence."}
              >
                <ShieldCheck className="size-3.5" /> QA verify
              </Button>
              <Button size="sm" onClick={() => setCleaningOpen(true)}>
                <RotateCcw className="size-3.5" /> Record cleaning
              </Button>
            </div>
          </div>

          {isPending && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[10.5px] text-warning-ink">
              <ClipboardCheck className="size-3.5 shrink-0" />
              <span className="font-semibold">Verification pending.</span>
              <span>This asset cannot be released until QA reviews the cleaning evidence.</span>
            </div>
          )}
          {asset.status === "failed" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2 text-[10.5px] text-danger">
              <XCircle className="size-3.5 shrink-0" />
              <span className="font-semibold">Cleaning failure.</span>
              <span>Hold this asset out of production and record a new cleaning cycle.</span>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Last clean"
            value={asset.lastCleanedAt ? relativeHygieneTime(asset.lastCleanedAt, now) : "No evidence"}
            note={formatHygieneTime(asset.lastCleanedAt)}
            icon={Sparkles}
            tone="primary"
          />
          <KpiTile
            label="Next clean due"
            value={asset.nextCleaningAt ? relativeHygieneTime(asset.nextCleaningAt, now) : "Not scheduled"}
            note={formatHygieneTime(asset.nextCleaningAt)}
            icon={CalendarClock}
            tone={asset.nextCleaningAt && asset.nextCleaningAt < now ? "danger" : "success"}
          />
          <KpiTile
            label="QA verification"
            value={asset.verificationStatus.replace(/_/g, " ")}
            note={asset.verifiedBy ? `${asset.verifiedBy} · ${formatHygieneTime(asset.verifiedAt)}` : "No QA decision recorded"}
            icon={FileCheck2}
            tone={asset.verificationStatus === "approved" ? "success" : asset.verificationStatus === "rejected" ? "danger" : "warning"}
          />
          <KpiTile
            label={asset.category === "packaging" ? "Packages processed" : "Cleaning interval"}
            value={asset.category === "packaging" ? (asset.packagesProcessed ?? 0).toLocaleString("en-IN") : `${asset.intervalHours} hr`}
            note={asset.category === "packaging" ? `${(asset.packagesApproved ?? 0).toLocaleString("en-IN")} under approved hygiene` : "Per SOP schedule"}
            icon={asset.category === "packaging" ? Package : Timer}
            tone="navy"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <HygieneSection
            title="Live sensor evidence"
            subtitle="Offline or stale sensors are never treated as normal"
            className="lg:col-span-2"
            action={<span className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground"><Cpu className="size-3" /> {data.sensors.length} linked</span>}
          >
            {data.sensors.length === 0 ? (
              <EmptyHygiene text="No sensors are linked to this asset. Record manual evidence instead." />
            ) : (
              <div className="space-y-3">
                {data.sensors.map((sensor) => (
                  <div key={sensor.key} className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11.5px] font-semibold text-navy">{sensor.label}</p>
                        <p className="text-[9.5px] text-muted-foreground">
                          {sensor.unit} · requirement {sensor.requirement}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SensorStatusPill status={sensor.status} />
                        <SourcePill source={sensor.source} />
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:items-center">
                      <div>
                        <p className={cn(
                          "font-display text-[24px] font-semibold leading-none",
                          sensor.status === "offline" ? "text-muted-foreground" : sensor.outOfRange ? "text-danger" : "text-navy",
                        )}>
                          {sensor.value}
                          <span className="ml-1 text-[10px] font-medium text-muted-foreground">{sensor.unit}</span>
                        </p>
                        <p className="mt-1 text-[9px] text-muted-foreground">
                          Last communication {formatHygieneTime(sensor.lastSeen)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-[10px]"
                          onClick={() => setSensorReading(sensor)}
                        >
                          <Gauge className="size-3" /> Record reading
                        </Button>
                      </div>
                      <div className="h-[96px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sensor.history}>
                            <CartesianGrid stroke="#EDF2F9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} interval={5} />
                            <YAxis tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={24} domain={["auto", "auto"]} />
                            <Tooltip contentStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="value" stroke={sensor.outOfRange ? "#DC4545" : "#3185D8"} strokeWidth={1.6} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HygieneSection>

          <HygieneSection title="SOP and asset profile" subtitle="The standard applied when cleaning is recorded">
            <p className="rounded-lg bg-primary/[0.045] p-2.5 text-[10.5px] leading-relaxed text-navy">
              {asset.sop}
            </p>
            <dl className="mt-3 space-y-1.5">
              {Object.entries(asset.details).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3 border-b border-border/50 pb-1.5 text-[10px] last:border-0">
                  <dt className="capitalize text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                  </dt>
                  <dd className="text-right font-medium text-navy">{value}</dd>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-1.5 text-[10px]">
                <dt className="text-muted-foreground">Status source</dt>
                <dd className="text-right font-medium text-navy">Reading + QA verification</dd>
              </div>
              <div className="flex items-start justify-between gap-3 text-[10px]">
                <dt className="text-muted-foreground">Recorded by</dt>
                <dd className="text-right font-medium text-navy">{asset.operator}</dd>
              </div>
            </dl>
            {asset.stateNotes && (
              <div className="mt-3 rounded-lg border border-warning/25 bg-warning/[0.05] p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-warning-ink">Latest note</p>
                <p className="mt-1 text-[10px] leading-relaxed text-warning-ink">{asset.stateNotes}</p>
              </div>
            )}
          </HygieneSection>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <HygieneSection
            title="CIP / cleaning stages"
            subtitle="Stage readings and requirements for the last cycle"
            action={<Droplets className="size-3.5 text-muted-foreground" />}
          >
            <div className="space-y-2">
              {data.cipStages.map((stage, index) => {
                const stageStatus =
                  stage.status === "completed"
                    ? "border-success/25 bg-success/[0.05]"
                    : stage.status === "failed"
                      ? "border-danger/25 bg-danger/[0.05]"
                      : stage.status === "in_progress"
                        ? "border-primary/25 bg-primary/[0.05]"
                        : "border-border/60 bg-background/40";
                const StageIcon = stage.status === "completed" ? CheckCircle2 : stage.status === "failed" ? XCircle : RotateCcw;
                return (
                  <div key={stage.stage} className={cn("flex items-start gap-2.5 rounded-lg border p-2.5", stageStatus)}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10.5px] font-semibold text-navy">{stage.stage}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] capitalize text-muted-foreground">
                          <StageIcon className="size-3" />
                          {stage.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">{stage.reading} · {stage.requirement}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Stage data is simulated demo evidence. A completed stage alone does not release the asset.
            </p>
          </HygieneSection>

          <HygieneSection
            title="Cleaning history"
            subtitle="Recorded and seeded evidence for this asset"
            action={<History className="size-3.5 text-muted-foreground" />}
          >
            <div className="space-y-2">
              {data.history.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-semibold text-navy">{entry.procedure}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {entry.operator} · {formatHygieneTime(entry.cleanedAt)}
                    </p>
                    {entry.notes && <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-semibold",
                    entry.outcome.toLowerCase().includes("approved")
                      ? "bg-success/10 text-success-ink"
                      : entry.outcome.toLowerCase().includes("rejected")
                        ? "bg-danger/10 text-danger"
                        : "bg-yellow-100 text-yellow-800",
                  )}>
                    {entry.outcome}
                  </span>
                </div>
              ))}
            </div>
          </HygieneSection>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <HygieneSection title="Release rules" subtitle="Enforced by the shared Convex backend">
            <ul className="space-y-2 text-[10px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Recording cleaning moves the asset to verification pending.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> QA approval is the only path to clean and verified.</li>
              <li className="flex gap-2"><XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" /> QA rejection marks a failure and requires re-cleaning.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> Missing or stale evidence stays unknown, never clean.</li>
            </ul>
          </HygieneSection>
          <HygieneSection title="Final rinse trend" subtitle="Most recent linked sensor history">
            {data.sensors[0] ? (
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sensors[0].history}>
                    <CartesianGrid stroke="#EDF2F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fontSize: 7.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={26} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="value" stroke="#16A078" strokeWidth={1.8} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyHygiene text="No linked sensor history." />
            )}
          </HygieneSection>
          <HygieneSection title="Evidence source" subtitle="Transparency for managers and auditors">
            <div className="space-y-2 text-[10px] leading-relaxed text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Recorded cleanings</span>
                <span className="font-semibold text-navy">{data.history.filter((entry) => entry.source === "recorded").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Seeded demo cycles</span>
                <span className="font-semibold text-navy">{data.history.filter((entry) => entry.source === "seeded").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Data badge</span>
                <span className="rounded-full border border-warning/25 bg-warning/[0.07] px-2 py-0.5 text-[9px] font-semibold text-warning-ink">SIMULATED</span>
              </div>
              <p className="border-t border-border/60 pt-2">Recorded actions are real for this plant account. Seeded values are demo evidence and are labelled as simulated.</p>
            </div>
          </HygieneSection>
        </div>
      </div>

      {cleaningOpen && (
        <RecordCleaningDialog
          key={`${asset.key}-cleaning`}
          open
          onClose={() => setCleaningOpen(false)}
          assetKey={asset.key}
          assetName={asset.name}
          defaultOperator={asset.operator}
          defaultProcedure={asset.sop.split("·")[0]?.trim() ?? asset.sop}
        />
      )}
      {isPending && verifyOpen && (
        <VerifyAssetDialog
          key={`${asset.key}-verify`}
          open
          onClose={() => setVerifyOpen(false)}
          assetKey={asset.key}
          assetName={asset.name}
        />
      )}
      {sensorReading && (
        <SensorReadingDialog
          key={sensorReading.key}
          sensor={sensorReading}
          onClose={() => setSensorReading(null)}
        />
      )}
    </AppShell>
  );
}

function RecordCleaningDialog({
  open,
  onClose,
  assetKey,
  assetName,
  defaultOperator,
  defaultProcedure,
}: {
  open: boolean;
  onClose: () => void;
  assetKey: string;
  assetName: string;
  defaultOperator: string;
  defaultProcedure: string;
}) {
  const recordCleaning = useMutation(api.hygiene.recordCleaning);
  const [operator, setOperator] = useState(defaultOperator);
  const [procedure, setProcedure] = useState(defaultProcedure);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await recordCleaning({ assetKey, operator, procedure, notes: notes.trim() || undefined });
      toast.success("Cleaning recorded", {
        description: "Asset is now verification pending. QA must release it before production.",
      });
      setNotes("");
      onClose();
    } catch (error) {
      toast.error("Could not record cleaning", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[16px] text-navy">Record cleaning · {assetName}</DialogTitle>
          <DialogDescription className="text-[11px]">
            Record the SOP procedure and evidence. This creates a verification-pending record, not a clean release.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10.5px]">Operator</Label>
            <Input value={operator} onChange={(event) => setOperator(event.target.value)} className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Procedure used</Label>
            <Textarea value={procedure} onChange={(event) => setProcedure(event.target.value)} className="min-h-[74px] text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Evidence notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Rinse conductivity, chemical concentration, deviations…"
              className="min-h-[56px] text-[11px]"
            />
          </div>
          <div className="rounded-md border border-warning/25 bg-warning/[0.05] p-2 text-[9.5px] leading-relaxed text-warning-ink">
            Missing evidence is not treated as clean. The asset stays blocked until QA verifies this record.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || procedure.trim().length < 3}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Submit for QA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VerifyAssetDialog({
  open,
  onClose,
  assetKey,
  assetName,
}: {
  open: boolean;
  onClose: () => void;
  assetKey: string;
  assetName: string;
}) {
  const verifyAsset = useMutation(api.hygiene.verifyAsset);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reviewer, setReviewer] = useState("Dr. A. Deshpande (QA)");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await verifyAsset({
        assetKey,
        approved: decision === "approve",
        reviewer,
        notes: notes.trim() || undefined,
      });
      toast.success(decision === "approve" ? "Asset released" : "Cleaning rejected", {
        description: decision === "approve"
          ? "Asset is clean and verified for production."
          : "Asset is marked failed and must be re-cleaned.",
      });
      onClose();
    } catch (error) {
      toast.error("Could not record QA decision", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[16px] text-navy">QA verification · {assetName}</DialogTitle>
          <DialogDescription className="text-[11px]">
            Review the cleaning evidence before release. Approval is required for the asset to become clean.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setDecision("approve")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[10.5px] font-semibold",
                decision === "approve" ? "border-success/40 bg-success/10 text-success-ink" : "border-border text-muted-foreground",
              )}
            >
              <CheckCircle2 className="size-3.5" /> Approve & release
            </button>
            <button
              type="button"
              onClick={() => setDecision("reject")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[10.5px] font-semibold",
                decision === "reject" ? "border-danger/40 bg-danger/10 text-danger" : "border-border text-muted-foreground",
              )}
            >
              <XCircle className="size-3.5" /> Reject cleaning
            </button>
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">QA reviewer</Label>
            <Input value={reviewer} onChange={(event) => setReviewer(event.target.value)} className="h-9 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Verification notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Evidence reviewed, reason for rejection, corrective instruction…"
              className="min-h-[56px] text-[11px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} variant={decision === "approve" ? "default" : "destructive"}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {decision === "approve" ? "Approve & release" : "Reject cleaning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SensorReadingDialog({
  sensor,
  onClose,
}: {
  sensor: AssetSensor | null;
  onClose: () => void;
}) {
  const recordReading = useMutation(api.hygiene.recordSensorReading);
  const [value, setValue] = useState("");
  const [source, setSource] = useState<"manual" | "iot" | "simulated">("manual");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!sensor) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      toast.error("Enter a numeric reading.");
      return;
    }
    setSaving(true);
    try {
      await recordReading({ sensorKey: sensor.key, value: parsed, source });
      toast.success("Reading recorded", { description: `${sensor.label} · ${parsed} ${sensor.unit}` });
      setValue("");
      onClose();
    } catch (error) {
      toast.error("Could not record reading", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(sensor)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-[16px] text-navy">Record sensor reading</DialogTitle>
          <DialogDescription className="text-[11px]">
            {sensor ? `${sensor.label} · expected ${sensor.requirement}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10.5px]">Reading ({sensor?.unit})</Label>
            <Input
              type="number"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={sensor ? String(sensor.value) : ""}
              className="h-9 text-[11px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10.5px]">Source</Label>
            <Select value={source} onValueChange={(next) => setSource(next as typeof source)}>
              <SelectTrigger className="h-9 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">MANUAL · human entry</SelectItem>
                <SelectItem value="iot">IOT · connected device</SelectItem>
                <SelectItem value="simulated">SIMULATED · demo data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[9px] leading-relaxed text-muted-foreground">
            Readings outside the operating range are shown as attention. A missing reading is never converted to zero.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !value.trim()}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save reading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
