// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { emailOtp } from "./auth/emailOtp";

/**
 * DairySense uses passwordless email one-time codes. The same flow works for
 * Gmail addresses and plant domains: the gateway emails a 6-digit code, and
 * Convex Auth creates the account on first successful verification. Profile
 * fields collected at sign-up are saved after verification by profile.ts.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp],
});
