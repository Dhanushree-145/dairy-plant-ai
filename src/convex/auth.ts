// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { emailOtp } from "./auth/emailOtp";

/**
 * Dairy360 uses passwordless email one-time codes. The same flow works for
 * Gmail addresses and plant domains: the gateway emails a 6-digit code only
 * when the email already has an account; unknown emails are rejected before an
 * OTP is sent.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp],
});
