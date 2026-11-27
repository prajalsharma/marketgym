/**
 * Re-mounts on every navigation inside /app, so each page gets the same short
 * entrance: the wrapper fades in while the page's top-level sections rise and
 * sharpen in order (see .page-enter in app/globals.css). Pure CSS so it runs
 * before hydration and never hides content; reduced-motion safe.
 */
export default function PlatformTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter animate-fade-in">{children}</div>;
}
