import { Brand } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  Loader2,
  Lock,
  Mail,
  Phone,
  ScanSearch,
  Sparkles,
  User,
} from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

const REMEMBERED_EMAIL_KEY = "dairypulse:remembered-email";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().min(1, "Enter your email address").email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(8, "Enter a valid phone number")
      .regex(/^[+]?[\d][\d\s-]{7,16}$/, "Use digits, spaces or + prefix only"),
    plantName: z.string().trim().min(2, "Enter your dairy plant or company name"),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type LoginValues = z.infer<typeof loginSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function friendlyAuthError(error: unknown, mode: "login" | "signup"): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/InvalidSecret|InvalidAccountId|invalid credentials/i.test(raw)) {
    return "That email and password don't match our records.";
  }
  if (/TooManyFailedAttempts|too many/i.test(raw)) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (/already exists|already been registered|already in use/i.test(raw)) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/Password must be at least/i.test(raw)) {
    return "Your password must be at least 8 characters long.";
  }
  if (/invalid email/i.test(raw)) {
    return "Enter a valid email address.";
  }
  if (/VLY_INTEGRATION_KEY|Could not send/i.test(raw)) {
    return "The sign-in email could not be sent right now. Please use your password.";
  }
  return raw || (mode === "login" ? "Sign in failed. Please try again." : "Could not create the account. Please try again.");
}

const opsStages = [
  { icon: Gauge, label: "Monitor", copy: "Production, energy, hygiene and waste in one view" },
  { icon: ScanSearch, label: "Detect", copy: "Idle load, temperature drift and yield losses" },
  { icon: Sparkles, label: "Optimize", copy: "Ranked actions with the saving attached" },
];

export default function AuthPage({
  mode = "login",
  redirectAfterAuth,
}: {
  mode?: "login" | "signup";
  redirectAfterAuth?: string;
}) {
  return (
    <Suspense fallback={null}>
      <AuthScreen mode={mode} redirectAfterAuth={redirectAfterAuth} />
    </Suspense>
  );
}

function AuthScreen({
  mode,
  redirectAfterAuth,
}: {
  mode: "login" | "signup";
  redirectAfterAuth?: string;
}) {
  const { isLoading: authLoading, isAuthenticated, signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth ?? "/dashboard",
  );

  const [rememberedEmail] = useState(readRememberedEmail);
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: rememberedEmail, password: "" },
  });
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      plantName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(rememberedEmail.length > 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleLogin = loginForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await signIn("password", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        flow: "signIn",
      });
      try {
        if (remember) {
          window.localStorage.setItem(
            REMEMBERED_EMAIL_KEY,
            values.email.trim().toLowerCase(),
          );
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // Ignore storage failures; the session itself is already established.
      }
      navigate(redirect, { replace: true });
    } catch (error) {
      setFormError(friendlyAuthError(error, "login"));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSignUp = signUpForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await signIn("password", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        name: values.name.trim(),
        phone: values.phone.trim(),
        plantName: values.plantName.trim(),
        flow: "signUp",
      });
      navigate(redirect, { replace: true });
    } catch (error) {
      setFormError(friendlyAuthError(error, "signup"));
    } finally {
      setIsSubmitting(false);
    }
  });

  const passwordValue =
    useWatch({ control: signUpForm.control, name: "password" }) ?? "";
  const passwordChecks = [
    { label: "8+ characters", pass: passwordValue.length >= 8 },
    { label: "One letter", pass: /[A-Za-z]/.test(passwordValue) },
    { label: "One number", pass: /\d/.test(passwordValue) },
  ];

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand / narrative panel */}
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-navy p-10 lg:flex xl:w-[42%] xl:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-navy opacity-50" />
        <div className="pointer-events-none absolute -left-24 bottom-0 size-[380px] rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-success/10 blur-3xl" />

        <div className="relative">
          <Link to="/" className="inline-flex">
            <Brand tone="light" />
          </Link>

          <h1 className="mt-16 max-w-sm font-display text-[34px] font-semibold leading-[1.12] tracking-tight text-white">
            The dairy plant overview you actually open every morning.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            One owner-facing screen for production, energy, hygiene and waste —
            with the losses already found for you.
          </p>

          <div className="mt-10 space-y-5">
            {opsStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">
                      {stage.copy}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-10 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Plant performance
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
              Sample data
            </span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-4xl font-semibold leading-none text-white">
              82
            </span>
            <span className="pb-1 text-xs text-white/50">/ 100 · Good</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {[
              ["Prod", 91],
              ["Energy", 76],
              ["Hygiene", 94],
              ["Waste", 68],
            ].map(([label, score]) => (
              <div key={label as string}>
                <div className="h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={
                      (score as number) >= 80
                        ? "h-full rounded-full bg-success"
                        : (score as number) >= 72
                          ? "h-full rounded-full bg-primary"
                          : "h-full rounded-full bg-warning"
                    }
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[9px] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Brand />
          </Link>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="hidden sm:inline">
              {isSignup ? "Already have an account?" : "New to DairyPulse?"}
            </span>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to={`${isSignup ? "/login" : "/signup"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}>
                {isSignup ? "Sign in" : "Create account"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-[440px]">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {isSignup ? "Plant owner account" : "Welcome back"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-navy">
                {isSignup ? "Create your plant account" : "Sign in to DairyPulse"}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {isSignup
                  ? "Tell us who runs the plant. You can change these details later."
                  : "Use the email and password you registered with."}
              </p>

              {isSignup ? (
                <form className="mt-6 space-y-4" onSubmit={handleSignUp} noValidate>
                  <Field
                    id="name"
                    label="Full name"
                    icon={<User className="size-4" />}
                    error={signUpForm.formState.errors.name?.message}
                  >
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Asha Kulkarni"
                      aria-invalid={!!signUpForm.formState.errors.name}
                      className="h-11 pl-10"
                      {...signUpForm.register("name")}
                    />
                  </Field>

                  <Field
                    id="email"
                    label="Email address"
                    icon={<Mail className="size-4" />}
                    error={signUpForm.formState.errors.email?.message}
                  >
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@dairyplant.com"
                      aria-invalid={!!signUpForm.formState.errors.email}
                      className="h-11 pl-10"
                      {...signUpForm.register("email")}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="phone"
                      label="Phone number"
                      icon={<Phone className="size-4" />}
                      error={signUpForm.formState.errors.phone?.message}
                    >
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+91 98200 12345"
                        aria-invalid={!!signUpForm.formState.errors.phone}
                        className="h-11 pl-10"
                        {...signUpForm.register("phone")}
                      />
                    </Field>

                    <Field
                      id="plantName"
                      label="Dairy plant"
                      icon={<Building2 className="size-4" />}
                      error={signUpForm.formState.errors.plantName?.message}
                    >
                      <Input
                        id="plantName"
                        autoComplete="organization"
                        placeholder="Sahyadri Dairy Works"
                        aria-invalid={!!signUpForm.formState.errors.plantName}
                        className="h-11 pl-10"
                        {...signUpForm.register("plantName")}
                      />
                    </Field>
                  </div>

                  <Field
                    id="password"
                    label="Password"
                    icon={<Lock className="size-4" />}
                    error={signUpForm.formState.errors.password?.message}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    }
                  >
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      aria-invalid={!!signUpForm.formState.errors.password}
                      className="h-11 pl-10"
                      {...signUpForm.register("password")}
                    />
                  </Field>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-muted/70 px-3 py-2">
                    {passwordChecks.map((check) => (
                      <span
                        key={check.label}
                        className={
                          check.pass
                            ? "inline-flex items-center gap-1 text-[11px] font-medium text-success-ink"
                            : "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                        }
                      >
                        <CheckCircle2 className="size-3" />
                        {check.label}
                      </span>
                    ))}
                  </div>

                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    icon={<Lock className="size-4" />}
                    error={signUpForm.formState.errors.confirmPassword?.message}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowConfirm((value) => !value)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {showConfirm ? "Hide" : "Show"}
                      </button>
                    }
                  >
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      aria-invalid={!!signUpForm.formState.errors.confirmPassword}
                      className="h-11 pl-10"
                      {...signUpForm.register("confirmPassword")}
                    />
                  </Field>

                  <FormError message={formError} />

                  <Button type="submit" className="h-11 w-full text-[14px]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    By creating an account you agree that this hackathon build
                    uses simulated plant records for demonstration.
                  </p>
                </form>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleLogin} noValidate>
                  <Field
                    id="login-email"
                    label="Email address"
                    icon={<Mail className="size-4" />}
                    error={loginForm.formState.errors.email?.message}
                  >
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@dairyplant.com"
                      aria-invalid={!!loginForm.formState.errors.email}
                      className="h-11 pl-10"
                      {...loginForm.register("email")}
                    />
                  </Field>

                  <Field
                    id="login-password"
                    label="Password"
                    icon={<Lock className="size-4" />}
                    error={loginForm.formState.errors.password?.message}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    }
                  >
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Your password"
                      aria-invalid={!!loginForm.formState.errors.password}
                      className="h-11 pl-10"
                      {...loginForm.register("password")}
                    />
                  </Field>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(value) => setRemember(value === true)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetKey((key) => key + 1);
                        setResetOpen(true);
                      }}
                      className="text-[12px] font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <FormError message={formError} />

                  <Button type="submit" className="h-11 w-full text-[14px]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border/70 bg-white/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-navy">Demo build:</span> open the
              dashboard to explore the overview built on a simulated plant
              dataset. No live sensors are connected.
            </div>

            {!isSignup && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                {user?.plantName ? `Signed in as ${user.plantName}` : "Plant owner access"}
              </p>
            )}
          </div>
        </div>
      </div>

      <PasswordResetDialog
        key={resetKey}
        open={resetOpen}
        onOpenChange={setResetOpen}
        defaultEmail={loginForm.getValues("email")}
        onSignedIn={() => {
          setResetOpen(false);
          navigate(redirect, { replace: true });
        }}
      />
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={id} className="text-[12px] font-medium text-navy">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
          {icon}
        </span>
        {children}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger/[0.06] px-3 py-2 text-[12px] font-medium text-danger"
    >
      {message}
    </div>
  );
}

function PasswordResetDialog({
  open,
  onOpenChange,
  defaultEmail,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail: string;
  onSignedIn: () => void;
}) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!z.string().email().safeParse(trimmed).success) {
      setError("Enter the email address on your account first.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await signIn("email-otp", { email: trimmed });
      setStep("verify");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? friendlyAuthError(requestError, "login")
          : "Could not send a sign-in code.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const verifyCode = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await signIn("email-otp", { email: email.trim().toLowerCase(), code });
      onSignedIn();
    } catch {
      setError("That code is not valid or has expired. Request a new one.");
      setCode("");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">
            {step === "request" ? "Forgot your password?" : "Enter your sign-in code"}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">
            {step === "request"
              ? "Password reset emails aren't part of this hackathon build. Instead, we can email a 6-digit one-time code so you can get straight into your plant overview."
              : `We sent a 6-digit code to ${email}. It expires in 15 minutes.`}
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="reset-email" className="text-[12px] font-medium text-navy">
                Account email
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@dairyplant.com"
                className="mt-1.5 h-11"
              />
            </div>
            {error && (
              <p role="alert" className="text-[11px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={requestCode} disabled={isBusy}>
                {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Email me a code
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <InputOTP
                value={code}
                onChange={setCode}
                maxLength={6}
                disabled={isBusy}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && code.length === 6 && !isBusy) {
                    void verifyCode();
                  }
                }}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && (
              <p role="alert" className="text-center text-[11px] font-medium text-danger">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("request")} disabled={isBusy}>
                Use another email
              </Button>
              <Button onClick={verifyCode} disabled={isBusy || code.length !== 6}>
                {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify & enter
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
