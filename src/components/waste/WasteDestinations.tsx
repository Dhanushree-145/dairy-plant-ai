import {
  EmptyWaste,
  ReliabilityNote,
  WasteKpi,
  WasteSection,
} from "@/components/waste/WasteBits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import {
  downloadCsv,
  formatKg,
  formatQuantity,
  formatWasteTime,
  type WasteDashboardData,
} from "@/lib/waste";
import {
  ArrowRight,
  Download,
  Loader2,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Disposal = WasteDashboardData["disposals"][number];

function isRecoveredRoute(method: string) {
  const key = method.toLowerCase();
  return (
    key.includes("recycl") ||
    key.includes("recover") ||
    key.includes("biogas") ||
    key.includes("feed") ||
    key.includes("compost")
  );
}

function kgForRecord(record: WasteDashboardData["records"][number]) {
  return record.category === "Wastewater" ? 0 : record.quantity;
}

export function WasteDestinations({
  data,
  onOpenDisposal,
}: {
  data: WasteDashboardData;
  onOpenDisposal: () => void;
}) {
  const seedDestinations = useMutation(api.waste.seedDemoDestinations);
  const [seeding, setSeeding] = useState(false);
  const pending = useMemo(
    () =>
      data.records.filter(
        (record) => record.disposalStatus === "Pending disposal",
      ),
    [data.records],
  );

  const manifestedIds = useMemo(
    () => new Set(data.disposals.flatMap((disposal) => disposal.recordIds)),
    [data.disposals],
  );

  const unmanifested = useMemo(
    () =>
      data.records.filter(
        (record) =>
          record.disposalStatus !== "Pending disposal" &&
          !manifestedIds.has(record.id),
      ),
    [data.records, manifestedIds],
  );

  const destinations = useMemo(() => {
    const grouped = new Map<
      string,
      {
        destination: string;
        methods: Set<string>;
        categories: Set<string>;
        records: number;
        totalKg: number;
        lastCollectedAt: number;
        collectedBy: string;
      }
    >();
    for (const disposal of data.disposals) {
      const key = disposal.destination.trim().toLowerCase();
      const current = grouped.get(key) ?? {
        destination: disposal.destination,
        methods: new Set<string>(),
        categories: new Set<string>(),
        records: 0,
        totalKg: 0,
        lastCollectedAt: disposal.collectedAt,
        collectedBy: disposal.collectedBy,
      };
      current.methods.add(disposal.method);
      for (const category of disposal.categories) current.categories.add(category);
      current.records += disposal.recordCount;
      current.totalKg += disposal.totalKg;
      if (disposal.collectedAt >= current.lastCollectedAt) {
        current.lastCollectedAt = disposal.collectedAt;
        current.collectedBy = disposal.collectedBy;
      }
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => b.totalKg - a.totalKg);
  }, [data.disposals]);

  const pendingByStorage = useMemo(() => {
    const grouped = new Map<
      string,
      { records: number; totalKg: number; oldest: number; units: Map<string, number> }
    >();
    for (const record of pending) {
      const current = grouped.get(record.storageLocation) ?? {
        records: 0,
        totalKg: 0,
        oldest: record.recordedAt,
        units: new Map<string, number>(),
      };
      current.records += 1;
      current.totalKg += kgForRecord(record);
      current.oldest = Math.min(current.oldest, record.recordedAt);
      current.units.set(
        record.unit,
        (current.units.get(record.unit) ?? 0) + record.quantity,
      );
      grouped.set(record.storageLocation, current);
    }
    return [...grouped.entries()].sort((a, b) => b[1].totalKg - a[1].totalKg);
  }, [pending]);

  const gapsByStatus = useMemo(() => {
    const grouped = new Map<string, { records: number; totalKg: number }>();
    for (const record of unmanifested) {
      const current = grouped.get(record.disposalStatus) ?? {
        records: 0,
        totalKg: 0,
      };
      current.records += 1;
      current.totalKg += kgForRecord(record);
      grouped.set(record.disposalStatus, current);
    }
    return [...grouped.entries()];
  }, [unmanifested]);

  const recoveredKg = data.disposals
    .filter((disposal) => isRecoveredRoute(disposal.method))
    .reduce((total, disposal) => total + disposal.totalKg, 0);
  const disposedKg = data.disposals
    .filter((disposal) => !isRecoveredRoute(disposal.method))
    .reduce((total, disposal) => total + disposal.totalKg, 0);
  const pendingKg = pending.reduce(
    (total, record) => total + kgForRecord(record),
    0,
  );

  const addDemoManifests = async () => {
    setSeeding(true);
    try {
      const result = await seedDestinations({});
      toast.success("Demo destination manifests created", {
        description: `${result.inserted} SIMULATED handovers linked to existing demo records.`,
      });
    } catch (error) {
      toast.error("Could not create demo manifests", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSeeding(false);
    }
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["Destination ledger"],
      [
        "Destination",
        "Route",
        "Materials",
        "Records",
        "kg equivalent",
        "Last dispatch",
        "Custodian",
      ],
      ...destinations.map((destination) => [
        destination.destination,
        [...destination.methods].join(" / "),
        [...destination.categories].join(" / "),
        destination.records,
        destination.totalKg.toFixed(1),
        formatWasteTime(destination.lastCollectedAt),
        destination.collectedBy,
      ]),
      [],
      ["Awaiting destination"],
      ["Storage location", "Records", "kg equivalent", "Oldest record"],
      ...pendingByStorage.map(([location, value]) => [
        location,
        value.records,
        value.totalKg.toFixed(1),
        formatWasteTime(value.oldest),
      ]),
      [],
      ["Destination gaps"],
      ["Recorded status", "Records", "kg equivalent"],
      ...gapsByStatus.map(([status, value]) => [
        status,
        value.records,
        value.totalKg.toFixed(1),
      ]),
    ];
    downloadCsv("waste-destination-tracking.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WasteKpi
          label="Destinations tracked"
          value={String(destinations.length)}
          note={`${data.disposals.length} confirmed handover${data.disposals.length === 1 ? "" : "s"}`}
          icon={MapPin}
          tone="primary"
        />
        <WasteKpi
          label="Recovered / recycled"
          value={formatKg(recoveredKg)}
          note="Confirmed recovery and recycling routes"
          icon={Recycle}
          tone="success"
        />
        <WasteKpi
          label="Disposed / treated"
          value={formatKg(disposedKg)}
          note="Confirmed disposal and treatment routes"
          icon={Trash2}
          tone="navy"
        />
        <WasteKpi
          label="Awaiting destination"
          value={String(pending.length)}
          note={`${formatKg(pendingKg)} still in storage`}
          icon={PackageCheck}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <WasteSection
          title="Destination ledger"
          subtitle="Receiving facilities, routes and material grouped from confirmed handovers."
          className="lg:col-span-3"
          action={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={exportCsv}
              disabled={destinations.length === 0 && pending.length === 0}
            >
              <Download className="size-3" /> CSV
            </Button>
          }
        >
          {destinations.length === 0 ? (
            <div className="space-y-2">
              <EmptyWaste text="No confirmed destination manifests yet. Confirm a disposal to start tracking where waste goes." />
              {unmanifested.some((record) => record.source === "simulated") && (
                <div className="flex flex-col gap-2 rounded-lg border border-warning/25 bg-warning/[0.04] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[9px] leading-relaxed text-muted-foreground">
                    Existing demo waste has no destination history. Create clearly
                    labelled SIMULATED manifests to explore this tracker.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 border-warning/30 text-[10px] text-warning-ink"
                    onClick={addDemoManifests}
                    disabled={seeding}
                  >
                    {seeding ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    Create demo manifests
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[760px] border-collapse text-left text-[9.5px]">
                <thead>
                  <tr className="border-b border-border/70 bg-background/60 text-[8px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-1.5 font-semibold">Destination</th>
                    <th className="px-2 py-1.5 font-semibold">Route</th>
                    <th className="px-2 py-1.5 font-semibold">Materials</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Records</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Mass</th>
                    <th className="px-2 py-1.5 font-semibold">Last dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {destinations.map((destination) => (
                    <tr
                      key={destination.destination}
                      className="border-b border-border/45 last:border-0"
                    >
                      <td className="px-2 py-1.5">
                        <span className="flex items-start gap-1.5 font-medium text-navy">
                          <MapPin className="mt-0.5 size-3 shrink-0 text-primary" />
                          <span>
                            {destination.destination}
                            <span className="mt-0.5 flex items-center gap-1 text-[8px] font-normal text-success-ink">
                              <ShieldCheck className="size-2.5" /> Confirmed manifest
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[150px] px-2 py-1.5 text-muted-foreground">
                        {[...destination.methods].join(" / ")}
                      </td>
                      <td className="max-w-[170px] px-2 py-1.5 text-muted-foreground">
                        {[...destination.categories].join(" · ") || "Details unavailable"}
                      </td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">
                        {destination.records}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-navy">
                        {formatKg(destination.totalKg)}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {formatWasteTime(destination.lastCollectedAt)}
                        <span className="block text-[8px]">
                          {destination.collectedBy}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WasteSection>

        <div className="space-y-4 lg:col-span-2">
          <WasteSection
            title="Awaiting destination"
            subtitle="Waste still in storage has no destination until handover is confirmed."
            action={
              <Button
                size="sm"
                className="h-7 text-[10px]"
                onClick={onOpenDisposal}
              >
                Assign <ArrowRight className="size-3" />
              </Button>
            }
          >
            {pendingByStorage.length === 0 ? (
              <EmptyWaste text="Every recorded waste item has a confirmed destination." />
            ) : (
              <div className="space-y-1.5">
                {pendingByStorage.map(([location, value]) => (
                  <div
                    key={location}
                    className="rounded-lg border border-warning/20 bg-warning/[0.035] p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10.5px] font-semibold text-navy">
                        {location}
                      </p>
                      <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[8px] font-semibold text-warning-ink">
                        {value.records} records
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {[...value.units.entries()]
                        .map(([unit, quantity]) => formatQuantity(quantity, unit))
                        .join(" · ")}
                    </p>
                    <p className="mt-1 flex items-center justify-between gap-2 text-[8px] text-muted-foreground">
                      <span>Oldest: {formatWasteTime(value.oldest)}</span>
                      <span className="font-semibold text-navy">
                        {formatKg(value.totalKg)} solids
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </WasteSection>

          <WasteSection
            title="Destination gaps"
            subtitle="Closed records without a manifest cannot be assigned a receiving facility retrospectively."
            action={<Truck className="size-3.5 text-muted-foreground" />}
          >
            {gapsByStatus.length === 0 ? (
              <EmptyWaste text="No closed records are missing a destination manifest." />
            ) : (
              <div className="space-y-1.5">
                {gapsByStatus.map(([status, value]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-[9.5px]"
                  >
                    <span>
                      <span className="block font-semibold text-navy">{status}</span>
                      <span className="text-[8px] text-muted-foreground">
                        Historical record without destination
                      </span>
                    </span>
                    <span className="text-right text-muted-foreground">
                      {value.records} · {formatKg(value.totalKg)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </WasteSection>
        </div>
      </div>

      <WasteSection
        title="Recent destination trail"
        subtitle="Audit-ready sequence of confirmed collections and handovers."
        action={<Truck className="size-3.5 text-muted-foreground" />}
      >
        {data.disposals.length === 0 ? (
          <EmptyWaste text="No destination movements have been confirmed yet." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {data.disposals.slice(0, 8).map((disposal: Disposal) => (
              <article
                key={disposal.id}
                className="rounded-lg border border-border/60 bg-background/40 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold text-navy">
                    {disposal.destination}
                  </p>
                  <ShieldCheck className="size-3 shrink-0 text-success" />
                </div>
                <p className="mt-0.5 text-[8.5px] text-muted-foreground">
                  {disposal.method} · {disposal.recordCount} records
                </p>
                <p className="mt-1 text-[8.5px] text-muted-foreground">
                  {disposal.categories.join(" · ") || "Category details unavailable"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/50 pt-1 text-[8px] text-muted-foreground">
                  <span>{formatWasteTime(disposal.collectedAt)}</span>
                  <span className="font-semibold text-navy">
                    {formatKg(disposal.totalKg)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </WasteSection>

      <ReliabilityNote>
        <span className="font-semibold text-navy">Destination tracking:</span>{" "}
        quantities come from confirmed disposal manifests linked to source records.
        Pending waste is shown without an inferred destination, and historical
        records missing a manifest remain visible as tracking gaps. Simulated demo
        manifests are labelled SIMULATED.
      </ReliabilityNote>
    </div>
  );
}
