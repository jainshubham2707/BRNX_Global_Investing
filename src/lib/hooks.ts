"use client";

import { usePrivy as usePrivyOriginal } from "@privy-io/react-auth";

const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id";

// Safe wrapper that works even when Privy isn't configured
export function useAuth() {
  if (!hasPrivy) {
    return {
      ready: true,
      authenticated: true, // Allow access in dev mode
      user: { email: { address: "demo@borderless.app" } } as ReturnType<typeof usePrivyOriginal>["user"],
      login: () => {},
      logout: () => {},
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePrivyOriginal();
}
