// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

/**
 * Email + password provider used by the DairyPulse login and sign-up pages.
 * Sign-up collects the owner's name, phone and plant name alongside the
 * credential, so those land on the user document.
 */
const password = Password({
  profile(params) {
    const email = String(params.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      throw new Error("Email is required");
    }
    return {
      email,
      name: typeof params.name === "string" ? params.name.trim() : undefined,
      phone: typeof params.phone === "string" ? params.phone.trim() : undefined,
      plantName:
        typeof params.plantName === "string"
          ? params.plantName.trim()
          : undefined,
    };
  },
  validatePasswordRequirements(pass) {
    if (pass.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Anonymous, password],
});
