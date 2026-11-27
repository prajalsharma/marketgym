/**
 * Privy client settings. Only NEXT_PUBLIC_PRIVY_APP_ID is read (inlined at build time).
 * When it is empty, the app keeps its local / Supabase sign-in flows.
 */
import type { PrivyClientConfig } from "@privy-io/react-auth";

export const PRIVY_APP_ID: string = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const privyEnabled: boolean = PRIVY_APP_ID.length > 0;

/**
 * Email and Google only, never an embedded wallet. Privy's modal only takes hex colours,
 * so the accent mirrors the dark --accent token in app/globals.css (#8da2ff).
 */
export const PRIVY_CONFIG: PrivyClientConfig = {
  loginMethods: ["email", "google"],
  embeddedWallets: {
    ethereum: { createOnLogin: "off" },
    solana: { createOnLogin: "off" },
  },
  appearance: {
    theme: "dark",
    accentColor: "#8da2ff",
    showWalletLoginFirst: false,
  },
};

/** Only same-origin paths survive as a post-login destination. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return null;
  try {
    if (new URL(next, "https://marketgym.invalid").origin !== "https://marketgym.invalid") return null;
  } catch {
    return null;
  }
  return next;
}
