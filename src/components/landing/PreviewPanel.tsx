import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Droplets,
  Sparkles,
  ThermometerSnowflake,
  Zap,
} from "lucide-react";

const kpis = [
  {
    label: "Milk processed",
    value: "342,180",
    unit: "L",
    delta: "+4.2%",
    direction: "up" as const,
    icon: Droplets,
  },
  {
    label: "Energy",
    value: "23,480",
    unit: "kWh",
    delta: "−3.1%",
    direction: "down" as const,
    icon: Zap,
  },
];

const alerts = [
  {
    icon: ThermometerSnowflake,
    title: "Cold storage bay 3 at 6.8°C",
    meta: "Range 2–4°C · 61 min ago",
    tone: "danger",
  },
  {
    icon: Zap,
    title: "Chiller CH-02 above rated load",
    meta: "+3.4 kW · 22 min ago",
    tone: "warning",
  },
];

export function PreviewPanel() {
  return (
    <div className="relative">
      {/* Line-art dairy plant behind the product mock */}
      <svg
        aria-hidden
        viewBox="0 0 420 260"
        className="pointer-events-none absolute -bottom-16 -right-8 hidden h-auto w-[86%] text-navy/15 sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M18 228h384" strokeLinecap="round" />
        {/* silos */}
        <path d="M46 228V128a18 18 0 0 1 18-18h20a18 18 0 0 1 18 18v100" />
        <path d="M46 146h56M46 184h56" />
        <path d="M94 228V92a14 14 0 0 1 14-14h14a14 14 0 0 1 14 14v136" />
        <path d="M94 120h42M94 158h42" />
        {/* processing hall + tank */}
        <rect x="188" y="150" width="112" height="78" rx="6" />
        <path d="M188 172h112M212 150v-18h64v18" />
        <path d="M206 228v-38h22v38M252 228v-38h22v38" />
        {/* horizontal tank */}
        <rect x="326" y="166" width="78" height="46" rx="23" />
        <path d="M326 189h78M352 166v-22h26v22M344 212v16M386 212v16" />
        <circle cx="249" cy="100" r="12" />
        <path d="M249 74v14M249 112v14M223 100h14M261 100h14" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/70 bg-white/95 p-4 shadow-float backdrop-blur sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <p className="text-[12px] font-semibold text-navy">
              Sahyadri Dairy Works
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Demo
            </span>
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">
            Last 7 days
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                  <Icon className="size-3.5 text-primary/70" />
                </div>
                <p className="mt-1.5 font-display text-lg font-semibold tracking-tight text-navy">
                  {kpi.value}
                  <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                    {kpi.unit}
                  </span>
                </p>
                <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-success-ink">
                  {kpi.direction === "up" ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {kpi.delta} vs last week
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-border/70 bg-white p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold text-navy">
              Daily production
            </p>
            <p className="text-[10px] text-muted-foreground">Litres vs target</p>
          </div>
          <svg viewBox="0 0 420 120" className="mt-2 h-[92px] w-full" role="img" aria-label="Simulated daily milk production trend">
            <defs>
              <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3185D8" stopOpacity="0.26" />
                <stop offset="100%" stopColor="#3185D8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="52"
              x2="420"
              y2="52"
              stroke="#94A3B8"
              strokeDasharray="5 5"
              strokeWidth="1.2"
            />
            <path
              d="M0 92 C26 88 42 74 64 78 C88 82 104 64 130 66 C158 68 172 84 196 72 C220 60 238 44 264 50 C290 56 306 38 332 42 C356 46 384 32 420 36 L420 112 L0 112 Z"
              fill="url(#previewFill)"
            />
            <path
              d="M0 92 C26 88 42 74 64 78 C88 82 104 64 130 66 C158 68 172 84 196 72 C220 60 238 44 264 50 C290 56 306 38 332 42 C356 46 384 32 420 36"
              fill="none"
              stroke="#3185D8"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="332" cy="42" r="4" fill="#FFFFFF" stroke="#3185D8" strokeWidth="2.4" />
          </svg>
          <div className="mt-1 flex justify-between text-[9px] font-medium text-muted-foreground">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.title}
                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2"
              >
                <span
                  className={
                    alert.tone === "danger"
                      ? "flex size-6 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger"
                      : "flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning"
                  }
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-navy">
                    {alert.title}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground">{alert.meta}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute -bottom-6 -left-3 hidden w-[248px] rounded-xl border border-border bg-white p-3 shadow-card sm:block lg:-left-8"
      >
        <div className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-navy">
              Shift CIP to off-peak
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              CH-02 ran above baseline in the peak tariff block.
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-success-ink">
              <ArrowUpRight className="size-2.5" />
              ₹7,400 / month potential
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
