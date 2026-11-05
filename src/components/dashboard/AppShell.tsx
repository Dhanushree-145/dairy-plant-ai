import { Brand } from "@/components/brand/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { formatRelativeMinutes, initials } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Milk,
  Recycle,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export type ShellAlert = {
  id: string;
  title: string;
  module: string;
  severity: "critical" | "warning";
  minutesAgo: number;
};

type NavItem = {
  name: string;
  icon: LucideIcon;
  available: boolean;
  key?: "overview" | "energy";
  to?: string;
};

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", icon: LayoutDashboard, available: true, key: "overview", to: "/dashboard" },
  { name: "Milk & Production", icon: Milk, available: false },
  {
    name: "Energy & Machines",
    icon: Zap,
    available: true,
    key: "energy",
    to: "/dashboard/energy",
  },
  { name: "Hygiene & Quality", icon: ShieldCheck, available: false },
  { name: "Waste Management", icon: Recycle, available: false },
  { name: "Inventory & Maintenance", icon: Boxes, available: false },
  { name: "Cost & Profit", icon: Wallet, available: false },
  { name: "Reports & Analytics", icon: BarChart3, available: false },
  { name: "Alerts & Notifications", icon: Bell, available: false },
];

export function AppShell({
  children,
  plantName,
  alertCount,
  alerts,
  sectionLabel = "Overview",
  activeKey = "overview",
  onViewAlerts,
}: {
  children: ReactNode;
  plantName?: string;
  alertCount: number;
  alerts: ShellAlert[];
  sectionLabel?: string;
  activeKey?: "overview" | "energy";
  onViewAlerts?: () => void;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ownerName = user?.name ?? "Plant owner";
  const plant = plantName ?? user?.plantName ?? "Sahyadri Dairy Works";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const viewAlerts = () => {
    setMobileOpen(false);
    if (onViewAlerts) {
      onViewAlerts();
      return;
    }
    document.getElementById("pending-alerts")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleLockedModule = (name: string) => {
    setMobileOpen(false);
    toast("Module not in this build", {
      description: `${name} is scheduled after the live Overview and Energy & Machines modules.`,
      icon: <Sparkles className="size-4 text-primary" />,
    });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
        <Brand tone="light" />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{plant}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">
              Plant owner workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-4 scrollbar-slim">
        <p className="px-2.5 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/38">
          Plant modules
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if (!item.available) {
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => handleLockedModule(item.name)}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-white/[0.06] hover:text-white/85"
                  >
                    <Icon className="size-4 shrink-0 text-sidebar-foreground/45" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="rounded border border-white/10 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      v2
                    </span>
                  </button>
                </li>
              );
            }

            const active = item.key === activeKey;
            return (
              <li key={item.name}>
                <Link
                  to={item.to ?? "/dashboard"}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.09] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white/90",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-sidebar-foreground/45",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {active ? (
                    <ChevronRight className="size-3.5 text-white/40" />
                  ) : (
                    item.key === "energy" && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-primary">
                        Live
                      </span>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-sidebar-border p-3">
        <div className="rounded-xl border border-warning/20 bg-warning/[0.08] p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-warning">
            <span className="size-1.5 rounded-full bg-warning" />
            Simulated dataset
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-sidebar-foreground/55">
            Demo plant and machine records. No live sensors are connected.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-white">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white">{ownerName}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {user?.email ?? "Plant owner"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[286px] border-r-0 bg-sidebar p-0 sm:max-w-[286px] [&>button]:hidden">
          <SheetTitle className="sr-only">Plant modules</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border p-2 text-navy transition-colors hover:bg-muted lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-[12px]">
              <span className="hidden text-muted-foreground sm:inline">Workspace</span>
              <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:inline" />
              <span className="truncate font-semibold text-navy">{sectionLabel}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-warning/25 bg-warning/[0.07] px-2.5 py-1 text-[10.5px] font-semibold text-warning-ink md:inline-flex">
                <span className="size-1.5 rounded-full bg-warning" />
                Demo data
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative rounded-lg border border-border p-2 text-navy/70 transition-colors hover:bg-muted hover:text-navy"
                    aria-label={`${alertCount} pending alerts`}
                  >
                    <Bell className="size-4" />
                    {alertCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex size-[17px] items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-white">
                        {alertCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[320px] p-0">
                  <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
                    <div>
                      <p className="text-[12px] font-semibold text-navy">Pending alerts</p>
                      <p className="text-[10px] text-muted-foreground">
                        From the simulated plant dataset
                      </p>
                    </div>
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                      {alertCount} open
                    </span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto p-1">
                    {alerts.slice(0, 3).map((alert) => (
                      <DropdownMenuItem
                        key={alert.id}
                        onClick={viewAlerts}
                        className="items-start gap-2.5 px-2.5 py-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                            alert.severity === "critical"
                              ? "bg-danger/10 text-danger"
                              : "bg-warning/10 text-warning",
                          )}
                        >
                          <TriangleAlert className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-semibold text-navy">
                            {alert.title}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {alert.module} · {formatRelativeMinutes(alert.minutesAgo)}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                    {alerts.length === 0 && (
                      <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        No open alerts.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={viewAlerts}
                    className="flex w-full items-center justify-between border-t border-border/70 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-muted/60"
                  >
                    View all pending alerts
                    <ChevronRight className="size-3.5" />
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden h-8 w-px bg-border sm:block" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg p-0.5 pr-1.5 transition-colors hover:bg-muted"
                    aria-label="Account menu"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
                      {initials(user?.name)}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block max-w-[130px] truncate text-[11.5px] font-semibold text-navy">
                        {ownerName}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Plant owner
                      </span>
                    </span>
                    <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block text-[12px] font-semibold text-navy">
                      {ownerName}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={viewAlerts}>
                    <Bell className="size-4" />
                    Pending alerts
                    <span className="ml-auto rounded-full bg-danger/10 px-1.5 text-[10px] font-semibold text-danger">
                      {alertCount}
                    </span>
                  </DropdownMenuItem>
                  {user?.plantName && (
                    <DropdownMenuItem disabled>
                      <Building2 className="size-4" />
                      <span className="truncate">{user.plantName}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-danger focus:text-danger"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-border/70 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              DairyPulse · Overview + Energy & Machines ·{" "}
              <span className="text-navy/70">Monitor → Detect → Optimize</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-warning" />
              Simulated data — not live sensor readings
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
