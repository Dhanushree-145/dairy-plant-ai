import { Brand } from "@/components/brand/Logo";
import { PreviewPanel } from "@/components/landing/PreviewPanel";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  Droplets,
  Gauge,
  HeartPulse,
  Leaf,
  LineChart,
  Recycle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

const stages = [
  {
    step: "01",
    name: "Monitor",
    icon: Gauge,
    copy: "Milk intake, product output, machine load, cold-storage temperature and waste — pulled into one owner's overview instead of five registers.",
    points: ["Production vs target", "Energy per litre", "Cold chain status"],
  },
  {
    step: "02",
    name: "Detect",
    icon: ScanSearch,
    copy: "The overview compares each record against its benchmark and flags what moved: idle load, temperature drift, yield loss and overdue cleaning.",
    points: ["Abnormal consumption", "Yield & wastage drift", "Overdue maintenance"],
  },
  {
    step: "03",
    name: "Optimize",
    icon: Sparkles,
    copy: "Every finding is paired with a recommended action, the reasoning behind it and the monthly saving it is worth to the plant.",
    points: ["Ranked by impact", "Reasoning shown", "Savings estimated"],
  },
];

const modules = [
  { name: "Milk & Production", icon: Droplets },
  { name: "Energy & Machines", icon: Zap },
  { name: "Hygiene & Quality", icon: ShieldCheck },
  { name: "Waste Management", icon: Recycle },
  { name: "Inventory & Maintenance", icon: Boxes },
  { name: "Cost & Profit", icon: Wallet },
  { name: "Reports & Analytics", icon: BarChart3 },
  { name: "Alerts & Notifications", icon: BellRing },
];

function FeatureVisual({ kind }: { kind: "production" | "energy" | "health" | "alerts" }) {
  if (kind === "production") {
    const bars = [58, 66, 61, 74, 69, 82, 77];
    return (
      <div className="flex h-24 items-end gap-1.5">
        {bars.map((height, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={
                index === 5
                  ? "w-full rounded-t-[3px] bg-primary"
                  : "w-full rounded-t-[3px] bg-primary/25"
              }
              style={{ height: `${height}%` }}
            />
            <span className="text-[8px] text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"][index]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "energy") {
    return (
      <div className="flex h-24 flex-col justify-between rounded-lg bg-background/70 p-3">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold text-navy">0.066</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            kWh / litre
          </span>
        </div>
        <svg viewBox="0 0 200 46" className="h-11 w-full" preserveAspectRatio="none">
          <path
            d="M0 34 C20 30 28 20 46 24 C66 28 74 14 94 18 C114 22 124 10 146 14 C166 18 180 8 200 10"
            fill="none"
            stroke="#16A078"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0 34 C20 30 28 20 46 24 C66 28 74 14 94 18 C114 22 124 10 146 14 C166 18 180 8 200 10 L200 46 L0 46 Z"
            fill="#16A078"
            fillOpacity="0.1"
          />
        </svg>
        <p className="text-[10px] font-medium text-success-ink">−3.1% vs previous week</p>
      </div>
    );
  }

  if (kind === "health") {
    return (
      <div className="flex h-24 items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#EDF2F8" strokeWidth="9" />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="#3185D8"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="201"
              strokeDashoffset="36"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-xl font-semibold text-navy">82</span>
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
              / 100
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {[
            ["Production", 91],
            ["Energy", 76],
            ["Hygiene", 94],
          ].map(([label, score]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                <span>{label}</span>
                <span className="text-navy">{score}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-danger/15 bg-danger/[0.06] px-2.5 py-2">
        <span className="size-1.5 shrink-0 rounded-full bg-danger" />
        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-navy">
          Cold storage bay 3 at 6.8°C
        </p>
        <span className="text-[9px] font-semibold text-danger">Critical</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/[0.07] px-2.5 py-2">
        <span className="size-1.5 shrink-0 rounded-full bg-warning" />
        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-navy">
          CIP cycle overdue on vat CV-04
        </p>
        <span className="text-[9px] font-semibold text-warning-ink">Warning</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/[0.06] px-2.5 py-2">
        <Sparkles className="size-3 shrink-0 text-success" />
        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-navy">
          Shift CIP to off-peak · ₹7,400/mo
        </p>
        <ArrowUpRight className="size-3 shrink-0 text-success" />
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link to="/" aria-label="DairyPulse home">
            <Brand />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#platform" className="transition-colors hover:text-navy">
              Platform
            </a>
            <a href="#how" className="transition-colors hover:text-navy">
              How it works
            </a>
            <a href="#roadmap" className="transition-colors hover:text-navy">
              Modules
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pointer-events-none absolute inset-0 bg-grid-soft [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
          <div className="pointer-events-none absolute -left-32 top-0 size-[460px] rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-24 size-[420px] rounded-full bg-success/[0.08] blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-28 lg:pt-20">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 py-1 pl-1.5 pr-3 text-[11px] font-medium text-muted-foreground shadow-sm"
              >
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  V1
                </span>
                Built for dairy plant owners
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="mt-5 font-display text-balance text-[38px] font-semibold leading-[1.06] tracking-tight text-navy sm:text-5xl lg:text-[56px]"
              >
                See the losses your{" "}
                <span className="relative whitespace-nowrap text-primary">
                  shift report
                  <svg
                    aria-hidden
                    viewBox="0 0 200 10"
                    className="absolute -bottom-1 left-0 h-2 w-full text-primary/35"
                    preserveAspectRatio="none"
                  >
                    <path d="M2 7 Q50 2 100 6 T198 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                hides.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12 }}
                className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base"
              >
                DairyPulse gives you one owner's view of milk processed, products
                made, energy burned and waste generated — then points at the
                machines, batches and hygiene gaps quietly costing you money.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Button asChild size="lg" className="h-11 px-6 text-[15px] shadow-sm">
                  <Link to="/signup">
                    Get started free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 border-border bg-white px-6 text-[15px] text-navy hover:bg-white/80"
                >
                  <Link to="/login">Open the dashboard</Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-success" />
                  No sensor hardware needed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-success" />
                  Sample plant data included
                </span>
              </motion.div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
              <PreviewPanel />
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-border/60 bg-white/60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:px-8">
            <span className="text-navy/45">Built for</span>
            <span className="flex items-center gap-1.5">
              <Droplets className="size-3.5 text-primary/70" /> Milk processing
            </span>
            <span className="flex items-center gap-1.5">
              <Wrench className="size-3.5 text-primary/70" /> Butter & ghee lines
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary/70" /> Paneer & cheese
            </span>
            <span className="flex items-center gap-1.5">
              <Leaf className="size-3.5 text-primary/70" /> Cold chain & effluent
            </span>
          </div>
        </section>

        {/* Monitor / Detect / Optimize */}
        <section id="how" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Monitor · Detect · Optimize
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              A control room, not another register.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Most plant software stops at showing numbers. DairyPulse carries
              the same record through three jobs so an owner can act before the
              month closes.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.name}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.07 }}
                  className="group relative flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-display text-xs font-semibold tracking-[0.2em] text-muted-foreground/60">
                      {stage.step}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-navy">
                    {stage.name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {stage.copy}
                  </p>
                  <ul className="mt-5 space-y-1.5 border-t border-border/70 pt-4">
                    {stage.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-[12px] font-medium text-navy/80"
                      >
                        <span className="size-1 rounded-full bg-primary/60" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* What the overview shows */}
        <section
          id="platform"
          className="relative border-y border-border/60 bg-white/70 py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
              <motion.div {...fadeUp} className="lg:sticky lg:top-24">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <HeartPulse className="size-3.5" />
                  Version 1 · Overview
                </span>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                  The morning screen for the person who owns the numbers.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Four questions, answered in one scroll: what did we process,
                  what did it cost in energy, how much did we lose, and what
                  needs a decision today?
                </p>
                <div className="mt-7 rounded-xl border border-border bg-background/60 p-4 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-navy">Honest by design.</span>{" "}
                  Demo figures are labelled as simulated sample records. Nothing
                  on the dashboard claims to be a live sensor reading.
                </div>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    kind: "production" as const,
                    icon: LineChart,
                    title: "Daily production performance",
                    copy: "Milk received versus processed against the day's target, with the week's trend.",
                  },
                  {
                    kind: "energy" as const,
                    icon: Zap,
                    title: "Energy per litre",
                    copy: "The one efficiency ratio that moves plant costs — tracked across the period.",
                  },
                  {
                    kind: "health" as const,
                    icon: Gauge,
                    title: "Overall plant performance",
                    copy: "A weighted score across production, energy, hygiene and waste, with the weak pillar exposed.",
                  },
                  {
                    kind: "alerts" as const,
                    icon: BellRing,
                    title: "Pending alerts & actions",
                    copy: "Critical issues first, each tied to a module, a metric and a recommended next step.",
                  },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.article
                      key={feature.title}
                      {...fadeUp}
                      transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-card"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />
                        <h3 className="text-[13px] font-semibold text-navy">
                          {feature.title}
                        </h3>
                      </div>
                      <div className="mt-4">
                        <FeatureVisual kind={feature.kind} />
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                        {feature.copy}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap / scope */}
        <section id="roadmap" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <motion.div {...fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                On the roadmap
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                One overview now. Eight modules next.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Version 1 deliberately ships the Overview dashboard for plant
                owners. Every later module builds on the same records and the
                same navigation you can already see in the sidebar.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Shipped in v1
            </span>
          </motion.div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              {...fadeUp}
              className="flex flex-col justify-between rounded-2xl border border-primary/25 bg-primary/[0.06] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
                  <Gauge className="size-4" />
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success-ink">
                  Live
                </span>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold text-navy">Overview</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  KPIs, performance, alerts and recommendations
                </p>
              </div>
            </motion.div>

            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={module.name}
                  {...fadeUp}
                  className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      v2
                    </span>
                  </div>
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-navy">{module.name}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Connected by the same plant record model
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-20 sm:px-8">
          <motion.div
            {...fadeUp}
            className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-navy px-6 py-14 sm:px-12 lg:px-16"
          >
            <div className="pointer-events-none absolute inset-0 bg-grid-navy opacity-60" />
            <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-primary/25 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
                  Start your morning differently
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  One screen. Every litre accounted for.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  Create a plant account, open the overview and see where the
                  simulated plant is losing money — then decide what to fix
                  first.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-11 bg-white px-6 text-navy hover:bg-white/90">
                  <Link to="/signup">
                    Create your plant account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 border-white/20 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
              Smart dairy plant monitoring and decision support. Built as a
              24-hour hackathon project, starting with the owner's overview.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[12px] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-navy">Product</p>
              <a href="#platform" className="block text-muted-foreground hover:text-primary">
                Overview
              </a>
              <a href="#roadmap" className="block text-muted-foreground hover:text-primary">
                Modules
              </a>
              <a href="#how" className="block text-muted-foreground hover:text-primary">
                How it works
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-navy">Account</p>
              <Link to="/login" className="block text-muted-foreground hover:text-primary">
                Sign in
              </Link>
              <Link to="/signup" className="block text-muted-foreground hover:text-primary">
                Create account
              </Link>
              <Link to="/dashboard" className="block text-muted-foreground hover:text-primary">
                Dashboard
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-navy">Data status</p>
              <p className="text-muted-foreground">Simulated sample records</p>
              <p className="text-muted-foreground">No live sensors connected</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>© {new Date().getFullYear()} DairyPulse. Hackathon demonstration build.</p>
            <p className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-warning" />
              Dashboard figures are simulated, not real-time readings
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
