"use client";

import React, { createContext, useContext } from "react";

const AuthAvailabilityContext = createContext<boolean>(false);

/**
 * Exposes whether Clerk authentication is active in the current deployment
 * so client components avoid invoking Clerk hooks outside <ClerkProvider>.
 */
export function AuthAvailabilityProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthAvailabilityContext.Provider value={enabled}>
      {children}
    </AuthAvailabilityContext.Provider>
  );
}

export function useAuthEnabled(): boolean {
  return useContext(AuthAvailabilityContext);
}
