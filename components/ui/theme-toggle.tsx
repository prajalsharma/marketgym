"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light";
export const THEME_STORAGE_KEY = "mg-theme";

/**
 * Inline this in <head> (lead owns layout.tsx) to apply a saved light theme
 * before first paint and avoid a flash:
 *   <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
 * Dark is the default, so nothing runs when no preference is stored.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
}

export interface ThemeToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Show the word next to the icon. */
  showLabel?: boolean;
}

/**
 * Reads/writes data-theme on <html>, persisted to localStorage. Dark by default.
 * Renders as "dark" until mounted so server and client markup match.
 */
const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, showLabel = false, ...props }, ref) => {
    const [theme, setTheme] = React.useState<Theme>("dark");

    React.useEffect(() => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const initial: Theme = stored === "light" ? "light" : readTheme();
      if (initial === "light") document.documentElement.setAttribute("data-theme", "light");
      setTheme(initial);
    }, []);

    const next: Theme = theme === "dark" ? "light" : "dark";
    const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          applyTheme(next);
          setTheme(next);
        }}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-transparent px-2 text-sm text-muted",
          "transition-colors duration-(--duration-fast) hover:bg-surface-raised hover:text-fg",
          className,
        )}
        {...props}
      >
        {theme === "dark" ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )}
        {showLabel ? <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span> : null}
      </button>
    );
  },
);
ThemeToggle.displayName = "ThemeToggle";

export { ThemeToggle };
