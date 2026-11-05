import mark from "@/assets/dairypulse-mark.svg";
import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading Dairy360"
      className="flex min-h-screen items-center justify-center bg-background"
    >
      <motion.img
        src={mark}
        alt="Dairy360"
        className="size-20 rounded-[22px] shadow-float"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: [0.65, 1, 0.65], scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </main>
  );
}
