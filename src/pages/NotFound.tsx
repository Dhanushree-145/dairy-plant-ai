import { Brand } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-5 sm:px-8">
        <Link to="/" aria-label="DairySense home">
          <Brand />
        </Link>
      </div>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
        <div className="pointer-events-none absolute inset-0 bg-grid-soft [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-card">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Search className="size-5" />
          </span>
          <p className="mt-5 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Error 404
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-navy">
            This line isn't on the plant floor
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            The page you asked for doesn't exist. Head back to the dashboard to
            keep monitoring the plant.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Back home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
