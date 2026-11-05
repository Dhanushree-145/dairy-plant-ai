import { useEffect, useState } from "react";

/**
 * Returns a clock that advances once a minute. Passing it to the energy queries
 * re-runs the simulated telemetry so ON/OFF status and current load keep moving
 * while the module is open.
 */
export function useLiveNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
