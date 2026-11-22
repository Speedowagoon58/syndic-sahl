import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthAvailabilityProvider } from "./AuthAvailability";

/**
 * Server wrapper around ClerkProvider.
 * Falls back cleanly to unauthenticated local demo mode if Clerk keys are absent locally.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";

  if (!publishableKey) {
    return (
      <AuthAvailabilityProvider enabled={false}>
        {children}
      </AuthAvailabilityProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <AuthAvailabilityProvider enabled={true}>
        {children}
      </AuthAvailabilityProvider>
    </ClerkProvider>
  );
}
