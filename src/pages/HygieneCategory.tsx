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
  Sparkline,
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useLiveNow } from "@/hooks/use-live-now";
import {
  employeeStatus,
  formatHygieneDate,
  formatHygieneTime,
  HYGIENE_CATEGORIES,
  relativeHygieneTime,
  type HygieneCategoryData,
  type HygieneCategoryKey,
} from "@/lib/hygiene";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Loader2,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

export default function HygieneCategory() {
  const { category: rawCategory } = useParams<{ category: string }>();
  const category = HYGIENE_CATEGORIES.find((item) => item.key === rawCategory);
  const { user } = useAuth();
  const now = useLiveNow();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const data = useQuery(
    api.hygiene.category,
    category ? { category: category.key, now } : "skip",
  );

  if (!category || data === null) {
    return (
      <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-navy">Hygiene category not found</h1>
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
          <div className="h-8 w-80 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const filteredAssets = data.assets.filter((asset) => {
    const matchesSearch =
      !search.trim() ||
      `${asset.name} ${asset.code} ${asset.zone} ${asset.operator} ${asset.subtype}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const filteredEmployees = data.employees.filter((employee) => {
    const matchesSearch =
      !search.trim() ||
      `${employee.name} ${employee.employeeId} ${employee.designation} ${employee.department} ${employee.zone}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell plantName={user?.plantName} sectionLabel="Hygiene Management" activeKey="hygiene">
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/dashboard/hygiene"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Hygiene Management
          </Link>
          <span className="rounded-full border border-warning/25 bg-warning/[0.07] px-2.5 py-1 text-[9.5px] font-semibold text-warning-ink">
            Simulated evidence · demo
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl", HYGIENE_ACCENTS[data.category])}>
              {(() => {
                const Icon = HYGIENE_ICONS[data.category];
                return <Icon className="size-5" />;
              })()}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Hygiene category
              </p>
              <h1 className="mt-1 font-display text-[24px] font-semibold tracking-tight text-navy sm:text-[28px]">
                {data.meta.label}
              </h1>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
                {HYGIENE_CATEGORIES.find((item) => item.key === data.category)?.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile label="Total records" value={data.summary.total} note="Assets and people in this category" icon={ShieldCheck} tone="navy" />
          <KpiTile label="Clean & verified" value={data.summary.clean} note="QA released" icon={CheckCircle2} tone="success" />
          <KpiTile label="Unclean / failed" value={data.summary.unclean} note="Do not release to production" icon={X} tone="danger" />
          <KpiTile label="Overdue" value={data.summary.overdue} note="Cleaning window has closed" icon={RotateCcw} tone="warning" />
          <KpiTile label="Verification pending" value={data.summary.verificationPending} note="Evidence awaiting QA review" icon={ClipboardCheck} tone="primary" />
        </div>

        {data.category === "packaging" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-card">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">Packages processed</p>
              <p className="mt-1.5 font-display text-[20px] font-semibold text-navy">{data.summary.packagesProcessed.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/[0.035] p-3.5 shadow-card">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-success-ink">Approved hygiene status</p>
              <p className="mt-1.5 font-display text-[20px] font-semibold text-success-ink">{data.summary.packagesApproved.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl border border-warning/25 bg-warning/[0.045] p-3.5 shadow-card">
              <p className="text-[9.5px] font-semibold uppercase tracking-wider text-warning-ink">Not approved</p>
              <p className="mt-1.5 font-display text-[20px] font-semibold text-warning-ink">
                {Math.max(0, data.summary.packagesProcessed - data.summary.packagesApproved).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-2.5 shadow-card sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={data.category === "employees" ? "Search employee, department or zone…" : "Search asset, code, zone or operator…"}
              className="h-9 pl-8 text-[11px]"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {["all", ...(data.category === "employees" ? ["cleared", "inspection_pending", "corrective_action", "training_renewal"] : ["clean", "verification_pending", "overdue", "failed", "unknown", "cleaning"])].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition-colors",
                  statusFilter === status ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {status === "all" ? "All" : status.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <HygieneSection
            title={data.category === "employees" ? "Employee hygiene list" : "Assets and zones"}
            subtitle={`${data.category === "employees" ? filteredEmployees.length : filteredAssets.length} records match the filters`}
            className="lg:col-span-3"
          >
            {data.category === "employees" ? (
              filteredEmployees.length === 0 ? (
                <EmptyHygiene text="No employees match the current search and status filter." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredEmployees.map((employee) => {
                    const meta = employeeStatus(employee.status);
                    return (
                      <button
                        key={employee.key}
                        type="button"
                        onClick={() => setSelectedEmployee(employee.key)}
                        className="rounded-lg border border-border/60 bg-background/45 p-3 text-left transition-colors hover:border-primary/25 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-semibold text-navy">{employee.name}</p>
                            <p className="text-[9.5px] text-muted-foreground">
                              {employee.employeeId} · {employee.designation}
                            </p>
                          </div>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold", meta.className)}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-[9.5px] text-muted-foreground">
                          {employee.department} · {employee.zone}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>Last check {relativeHygieneTime(employee.lastInspectionAt, now)}</span>
                          <span className={employee.trainingDueAt < now ? "font-semibold text-warning-ink" : ""}>
                            Training {formatHygieneDate(employee.trainingDueAt)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[
                            ["PPE", employee.checks.protectiveClothing],
                            ["Hair", employee.checks.hairCovering],
                            ["Shoes", employee.checks.footwear],
                            ["No jewellery", employee.checks.jewellery],
                            ["Hands", employee.checks.handHygiene],
                          ].map(([label, pass]) => (
                            <span
                              key={String(label)}
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8.5px] font-medium",
                                pass ? "bg-success/10 text-success-ink" : "bg-danger/10 text-danger",
                              )}
                            >
                              {pass ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                              {label}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : filteredAssets.length === 0 ? (
              <EmptyHygiene text="No assets match the current search and status filter." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredAssets.map((asset) => (
                  <Link
                    key={asset.key}
                    to={`/dashboard/hygiene/asset/${asset.key}`}
                    className="rounded-lg border border-border/60 bg-background/45 p-3 transition-colors hover:border-primary/25 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-navy">{asset.name}</p>
                        <p className="text-[9.5px] text-muted-foreground">
                          {asset.code} · {asset.subtype}
                        </p>
                      </div>
                      <HygieneStatusPill status={asset.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-muted-foreground">
                      <span>Zone: {asset.zone}</span>
                      <span>Operator: {asset.operator}</span>
                      <span>Last: {relativeHygieneTime(asset.lastCleanedAt, now)}</span>
                      <span>Next: {relativeHygieneTime(asset.nextCleaningAt, now)}</span>
                    </div>
                    {asset.category === "packaging" && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                        <Package className="size-3" />
                        {(asset.packagesProcessed ?? 0).toLocaleString("en-IN")} packages processed
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5 text-[9px]">
                      <span className="text-muted-foreground">QA: {asset.verificationStatus.replace(/_/g, " ")}</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                        Open profile <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </HygieneSection>

          <div className="space-y-4 lg:col-span-2">
            <HygieneSection title="Inspection trend" subtitle="Passed versus attention · last 7 days">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inspectionTrend}>
                    <CartesianGrid stroke="#E7EEF7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: "#8296AD" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8.5, fill: "#8296AD" }} axisLine={false} tickLine={false} width={22} />
                    <Tooltip />
                    <Bar dataKey="passed" name="Passed" stackId="a" fill="#16A078" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="attention" name="Attention" stackId="a" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex justify-end gap-3 text-[9px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-success" /> Passed</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-warning" /> Attention</span>
              </div>
            </HygieneSection>

            <HygieneSection
              title="Linked sensors"
              subtitle="Latest evidence and operating range"
              action={<Cpu className="size-3.5 text-muted-foreground" />}
            >
              {data.sensors.length === 0 ? (
                <EmptyHygiene text="No sensors are linked to this category." />
              ) : (
                <div className="space-y-2">
                  {data.sensors.slice(0, 5).map((sensor) => (
                    <div key={sensor.key} className="rounded-lg border border-border/60 bg-background/45 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10.5px] font-semibold text-navy">{sensor.label}</p>
                          <p className="text-[9px] text-muted-foreground">{sensor.assetName} · {sensor.requirement}</p>
                        </div>
                        <SensorStatusPill status={sensor.status} />
                      </div>
                      <div className="mt-1.5 flex items-end justify-between">
                        <p className="font-display text-[15px] font-semibold text-navy">
                          {sensor.value} <span className="text-[9px] font-medium text-muted-foreground">{sensor.unit}</span>
                        </p>
                        <Sparkline values={sensor.history.map((point) => point.value)} color={sensor.outOfRange ? "#DC4545" : "#3185D8"} width={70} height={22} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[8.5px] text-muted-foreground">
                        <SourcePill source={sensor.source} />
                        <span>{formatHygieneTime(sensor.lastSeen)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </HygieneSection>
          </div>
        </div>

        {data.category === "laboratory" && (
          <HygieneSection
            title="Laboratory samples"
            subtitle="Uploaded reports never become satisfactory automatically — QA interpretation is required"
            action={<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">{data.samples.length} samples</span>}
          >
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/70 bg-background/60 text-[9px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Sample</th>
                    <th className="px-3 py-2 font-semibold">Location</th>
                    <th className="px-3 py-2 font-semibold">Test</th>
                    <th className="px-3 py-2 text-right font-semibold">Reading</th>
                    <th className="px-3 py-2 text-right font-semibold">Limit</th>
                    <th className="px-3 py-2 font-semibold">Interpretation</th>
                    <th className="px-3 py-2 font-semibold">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.samples.map((sample) => (
                    <tr key={sample.key} className="border-b border-border/50 text-[10.5px] last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-navy">{sample.sampleId}</p>
                        <p className="text-[9px] text-muted-foreground">{formatHygieneTime(sample.collectedAt)}</p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sample.location}</td>
                      <td className="px-3 py-2 text-muted-foreground">{sample.testType}</td>
                      <td className="px-3 py-2 text-right font-medium text-navy">{sample.reading} <span className="text-[9px] font-normal text-muted-foreground">{sample.unit}</span></td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{sample.limit} {sample.unit}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize",
                          sample.reviewStatus === "satisfactory" ? "bg-success/10 text-success-ink" : sample.reviewStatus === "unsatisfactory" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning-ink",
                        )}>
                          {sample.reviewStatus.replace(/_/g, " ")}
                        </span>
                        <p className="mt-0.5 max-w-[230px] text-[9px] leading-relaxed text-muted-foreground">{sample.interpretation}</p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sample.reportName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HygieneSection>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <HygieneSection title="Category SOP basis" subtitle="Verification rules applied by the backend">
            <ul className="space-y-2 text-[10.5px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Cleaning records move an asset to verification pending — never directly to clean.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> QA approval is required before release; rejected cleaning becomes a failure.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Offline sensors stay grey and are excluded from normal readings.</li>
            </ul>
          </HygieneSection>
          <HygieneSection title="What to do next" subtitle="Suggested workflow for the shift">
            <div className="space-y-2">
              {[
                { icon: RotateCcw, label: "Clean overdue assets", copy: "Open an asset, record the SOP procedure and submit evidence." },
                { icon: UserCheck, label: "Clear pre-shift checks", copy: "Complete authorized human inspections; no facial recognition or medical data." },
                { icon: ShieldCheck, label: "Verify evidence", copy: "QA reviews cleaning records before the asset returns to production." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-2">
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-[10.5px] font-semibold text-navy">{item.label}</p>
                      <p className="text-[9.5px] leading-relaxed text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </HygieneSection>
          <HygieneSection title="Data reliability" subtitle="How this screen handles missing evidence">
            <div className="space-y-2 text-[10px] leading-relaxed text-muted-foreground">
              <p><span className="font-semibold text-navy">Missing evidence</span> remains unknown/grey. It is not converted into a clean status.</p>
              <p><span className="font-semibold text-navy">Last communication</span> is shown with every sensor. Stale readings are not displayed as normal.</p>
              <p><span className="font-semibold text-navy">Action history</span> is persisted per plant through the shared Convex database.</p>
            </div>
          </HygieneSection>
        </div>
      </div>

      <EmployeeInspectionDialog
        employeeKey={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        now={now}
        categoryData={data}
      />
    </AppShell>
  );
}

function EmployeeInspectionDialog({
  employeeKey,
  onClose,
  now,
  categoryData,
}: {
  employeeKey: string | null;
  onClose: () => void;
  now: number;
  categoryData: HygieneCategoryData;
}) {
  const detail = useQuery(
    api.hygiene.employee,
    employeeKey ? { employeeKey, now } : "skip",
  );
  const recordInspection = useMutation(api.hygiene.recordEmployeeInspection);
  const [result, setResult] = useState<"cleared" | "corrective_action">("cleared");
  const [notes, setNotes] = useState("");
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const employee =
    detail?.employee ??
    categoryData.employees.find((item) => item.key === employeeKey) ??
    null;

  const submit = async () => {
    if (!employeeKey) return;
    setSaving(true);
    try {
      await recordInspection({
        employeeKey,
        result,
        notes: notes.trim() || undefined,
        trainingCompleted,
      });
      toast.success("Inspection recorded", {
        description: result === "cleared" ? "Employee is cleared for duty." : "Corrective action recorded.",
      });
      onClose();
    } catch (error) {
      toast.error("Could not record inspection", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(employeeKey)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-[17px] text-navy">
            {employee?.name ?? "Employee hygiene"}
          </DialogTitle>
          <DialogDescription className="text-[11.5px]">
            Authorized human inspection only. Do not record medical or biometric information.
          </DialogDescription>
        </DialogHeader>

        {employee && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                ["Protective clothing", employee.checks.protectiveClothing],
                ["Hair covering", employee.checks.hairCovering],
                ["Footwear", employee.checks.footwear],
                ["No jewellery", employee.checks.jewellery],
                ["Hand hygiene", employee.checks.handHygiene],
              ].map(([label, pass]) => (
                <span key={String(label)} className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  pass ? "bg-success/10 text-success-ink" : "bg-danger/10 text-danger",
                )}>
                  {pass ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                  {label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-3 text-[10px]">
              <div><p className="text-muted-foreground">Last inspection</p><p className="font-semibold text-navy">{formatHygieneTime(employee.lastInspectionAt)}</p></div>
              <div><p className="text-muted-foreground">Training due</p><p className="font-semibold text-navy">{formatHygieneDate(employee.trainingDueAt)}</p></div>
              <div><p className="text-muted-foreground">Department</p><p className="font-semibold text-navy">{employee.department}</p></div>
              <div><p className="text-muted-foreground">Assigned zone</p><p className="font-semibold text-navy">{employee.zone}</p></div>
            </div>

            {detail?.trainingHistory && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Training history</p>
                <div className="mt-1 space-y-1">
                  {detail.trainingHistory.map((training) => (
                    <div key={training.id} className="flex items-center justify-between rounded border border-border/60 px-2 py-1.5 text-[9.5px]">
                      <span className="text-navy">{training.title}</span>
                      <span className="text-muted-foreground">valid to {formatHygieneDate(training.validUntil)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Record inspection</p>
              <div className="flex gap-1.5">
                {(["cleared", "corrective_action"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setResult(value)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold",
                      result === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {value === "cleared" ? "Cleared for duty" : "Corrective action"}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <input type="checkbox" checked={trainingCompleted} onChange={(event) => setTrainingCompleted(event.target.checked)} />
                Training completed today (renews for 180 days)
              </label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Inspection notes or corrective coaching"
                className="min-h-[64px] text-[11px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !employeeKey}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
