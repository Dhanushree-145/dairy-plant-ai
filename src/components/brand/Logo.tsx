import mark from "@/assets/dairypulse-mark.svg";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  tone = "dark",
  compact = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img src={mark} alt="" className="size-9 shrink-0 rounded-[11px]" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[17px] font-semibold tracking-tight",
              tone === "light" ? "text-white" : "text-navy",
            )}
          >
            Dairy<span className="text-primary">Sense</span>
          </span>
          <span
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.16em]",
              tone === "light" ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Plant intelligence
          </span>
        </span>
      )}
    </span>
  );
}
