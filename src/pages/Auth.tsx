import { Brand } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Gauge,
  Loader2,
  Mail,
  Phone,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "convex/react";
import { z } from "zod";

const REMEMBERED_EMAIL_KEY = "dairy360:remembered-email";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address, such as name@gmail.com"),
});
type EmailValues = z.infer<typeof emailSchema>;

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address, such as name@gmail.com"),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .regex(/^[+]?[\d][\d\s-]{7,16}$/, "Use digits, spaces or + prefix only"),
  plantName: z.string().trim().min(2, "Enter your dairy plant or company name"),
});
type SignUpValues = z.infer<typeof signUpSchema>;

type SignUpProfile = {
  name: string;
  phone: string;
  plantName: string;
};

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

function friendlyAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/TooManyFailedAttempts|too many|rate limit/i.test(raw)) {
    return "Too many codes requested. Please wait a few minutes and try again.";
  }
  if (/InvalidSecret|InvalidAccountId|invalid code|expired/i.test(raw)) {
    return "That code is not valid or has expired. Request a new one.";
  }
  if (/invalid email/i.test(raw)) {
    return "Enter a valid email address.";
  }
  if (/user not found|no such account|account not found/i.test(raw)) {
    return "That email address was not used to create an account. Please use a different email.";
  }
  if (/VLY_INTEGRATION|Could not send|sign-in code/i.test(raw)) {
    return "We could not send the code right now. Try again in a moment.";
  }
  return raw || "We could not complete sign-in. Please try again.";
}

const opsStages = [
  { icon: Gauge, label: "Monitor", copy: "Milk intake, product output and plant costs in one view" },
  { icon: ScanSearch, label: "Detect", copy: "Yield gaps, cost leakage and loss-making batches" },
  { icon: Sparkles, label: "Optimize", copy: "Ranked actions with the profit impact attached" },
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
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const saveProfile = useMutation(api.profile.saveProfile);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth ?? "/dashboard",
  );
  const isSignup = mode === "signup";

  const [rememberedEmail] = useState(readRememberedEmail);
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: rememberedEmail },
  });
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: rememberedEmail, phone: "", plantName: "" },
  });

  const [step, setStep] = useState<"details" | "code">("details");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingProfile, setPendingProfile] = useState<SignUpProfile | null>(null);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated && step === "details") {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect, step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const rememberEmail = (email: string) => {
    try {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } catch {
      // A blocked storage API must not block sign-in.
    }
  };

  const requestCode = async (email: string, profile: SignUpProfile | null) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const normalized = email.trim().toLowerCase();
      await signIn("email-otp", { email: normalized, existingUserRequired: true });
      setPendingEmail(normalized);
      setPendingProfile(profile);
      setCode("");
      setStep("code");
      setResendIn(45);
      rememberEmail(normalized);
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = emailForm.handleSubmit(async (values) => {
    await requestCode(values.email, null);
  });

  const handleSignUpSubmit = signUpForm.handleSubmit(async (values) => {
    await requestCode(values.email, {
      name: values.name.trim(),
      phone: values.phone.trim(),
      plantName: values.plantName.trim(),
    });
  });

  const saveProfileIfNeeded = async () => {
    if (!pendingProfile) return;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await saveProfile(pendingProfile);
        return;
      } catch (error) {
        if (attempt === 2) {
          // The account is already verified; don't strand the user on this screen.
          console.warn("Profile save after OTP failed", error);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6 || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {        await signIn("email-otp", { email: pendingEmail, code });
        await saveProfileIfNeeded();
        rememberEmail(pendingEmail);
        navigate(redirect, { replace: true });
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || isSubmitting) return;
    await requestCode(pendingEmail, pendingProfile);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-navy p-10 lg:flex xl:w-[42%] xl:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-navy opacity-50" />
        <div className="pointer-events-none absolute -left-24 bottom-0 size-[380px] rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-success/10 blur-3xl" />

        <div className="relative">
          <Link to="/" className="inline-flex">
            <Brand tone="light" />
          </Link>

          <h1 className="mt-16 max-w-sm font-display text-[34px] font-semibold leading-[1.12] tracking-tight text-white">
            From milk intake to product profit, in one morning view.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            One owner-facing workspace for milk, production, energy, cost and profit —
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
                    <p className="text-[13px] font-semibold text-white">{stage.label}</p>
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
            <span className="font-display text-4xl font-semibold leading-none text-white">82</span>
            <span className="pb-1 text-xs text-white/50">/ 100 · Good</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {[
              ["Prod", 91],
              ["Energy", 76],
              ["Hygiene", 94],
              ["Profit", 84],
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

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Brand />
          </Link>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="hidden sm:inline">
              {isSignup ? "Already have an account?" : "        New to Dairy360?"}
            </span>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link
                to={`${isSignup ? "/login" : "/signup"}${
                  searchParams.toString() ? `?${searchParams.toString()}` : ""
                }`}
              >
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
                {step === "code"
                  ? "Passwordless access"
                  : isSignup
                    ? "Plant owner account"
                    : "Welcome back"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-navy">
                {step === "code"
                  ? "Enter your email code"
                  : isSignup
                    ? "Create your plant account"
                    : "                Sign in to Dairy360"}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {step === "code"
                  ? `We emailed a 6-digit code to ${pendingEmail}. It expires in 15 minutes.`
                  : isSignup
                    ? "No password needed. Tell us who runs the plant, then verify your email."
                    : "Enter your email and we will send a one-time code. No password required."}
              </p>

              {step === "code" ? (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-center">
                    <InputOTP
                      value={code}
                      onChange={setCode}
                      maxLength={6}
                      disabled={isSubmitting}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && code.length === 6 && !isSubmitting) {
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

                  {formError && <FormError message={formError} />}

                  <Button
                    type="button"
                    className="h-11 w-full text-[14px]"
                    onClick={verifyCode}
                    disabled={isSubmitting || code.length !== 6}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify &amp; open workspace
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("details");
                        setFormError(null);
                        setCode("");
                      }}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-primary"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="size-3.5" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={() => void resendCode()}
                      disabled={resendIn > 0 || isSubmitting}
                      className="text-[11.5px] font-medium text-primary disabled:text-muted-foreground"
                    >
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                  </div>

                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    Use the same email address you entered. The code works for Gmail,
                    Google Workspace and other plant email domains.
                  </p>
                </div>
              ) : isSignup ? (
                <form className="mt-6 space-y-4" onSubmit={handleSignUpSubmit} noValidate>
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
                      placeholder="owner@gmail.com"
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

                  <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-[11px] leading-relaxed text-navy/70">
                      We email a 6-digit code to verify the address. If we do not have an
                      account for this email, requesting the code will fail with "enter a valid
                      email id".
                    </p>
                  </div>

                  <FormError message={formError} />

                  <Button type="submit" className="h-11 w-full text-[14px]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending code…
                      </>
                    ) : (
                      <>
                        Send my sign-up code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    By creating an account you agree that this build uses clearly
                    labelled simulated plant records for demonstration.
                  </p>
                </form>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit} noValidate>
                  <Field
                    id="login-email"
                    label="Email address"
                    icon={<Mail className="size-4" />}
                    error={emailForm.formState.errors.email?.message}
                  >
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="owner@gmail.com"
                      aria-invalid={!!emailForm.formState.errors.email}
                      className="h-11 pl-10"
                      {...emailForm.register("email")}
                    />
                  </Field>

                  <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-[11px] leading-relaxed text-navy/70">
                      We send a 6-digit one-time code to your inbox. Use it within 15
                      minutes to sign in. No password is needed.
                    </p>
                  </div>

                  <FormError message={formError} />

                  <Button type="submit" className="h-11 w-full text-[14px]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending code…
                      </>
                    ) : (
                      <>
                        Email me a sign-in code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="size-3 text-success" />
                    Passwordless · works with Gmail
                  </div>
                </form>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border/70 bg-white/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-navy">Demo build:</span> plant
              production, costs and profit are calculated from a clearly labelled
              simulated dataset. No live sensors are connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={id} className="text-[12px] font-medium text-navy">
          {label}
        </Label>
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
