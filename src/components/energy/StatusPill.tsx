import { STATUS_META, type MachineSnapshot } from "@/lib/energy";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

export function StatusPill({
  status,
  className,
  showFullLabel = false,
}: {
  status: MachineSnapshot["status"];
  className?: string;
  showFullLabel?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
        meta.chip,
        className,
      )}
    >
      {status === "unknown" ? (
        <TriangleAlert className="size-2.5" />
      ) : (
        <span className={cn("size-1.5 rounded-full", meta.dot)} />
      )}
      {showFullLabel || status !== "unknown" ? meta.label : "Fault / unknown"}
    </span>
  );
}
