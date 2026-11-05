import mark from "@/assets/dairypulse-mark.svg";
import { motion } from "framer-motion";

const STAGES = ["Milk", "Energy", "Hygiene", "Waste"];

export function LoadingScreen({
  label = "Preparing your plant workspace",
}: {
  label?: string;
}) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading DairySense"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-soft [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 size-[380px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 size-[340px] rounded-full bg-success/[0.08] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-sm text-center"
      >
        <div className="relative mx-auto size-[88px]">
          <motion.span
            className="absolute inset-0 rounded-[26px] border border-primary/20"
            animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-2 rounded-[22px] border border-dashed border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[13px] flex items-center justify-center rounded-[18px] bg-white shadow-float">
            <motion.img
              src={mark}
              alt=""
              className="size-11 rounded-xl"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <motion.span
            className="absolute -right-1 top-1 size-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(49,133,216,0.12)]"
            animate={{ y: [0, 7, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <h1 className="mt-7 font-display text-[26px] font-semibold tracking-tight text-navy">
          Dairy<span className="text-primary">Sense</span>
        </h1>
        <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Plant intelligence
        </p>

        <div className="mx-auto mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary/40 via-primary to-success"
            animate={{ x: ["-110%", "220%"] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto mt-3 flex w-56 items-center justify-between gap-3 text-[10px] text-muted-foreground">
          <span>{label}</span>
          <motion.span
            className="inline-flex gap-0.5"
            aria-hidden
          >
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1 rounded-full bg-primary"
                animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: dot * 0.16,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.span>
        </div>

        <div className="mx-auto mt-8 grid w-64 grid-cols-4 gap-1.5">
          {STAGES.map((stage, index) => (
            <motion.div
              key={stage}
              className="rounded-lg border border-border/70 bg-white/70 px-1 py-1.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut",
              }}
            >
              {stage}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
