/**
 * Re-mounts on every navigation inside /app, so each page gets the same short
 * entrance: the page fades up and its top-level sections follow in order
 * (see .page-enter in app/globals.css). Pure CSS, reduced-motion safe.
 */
export default function PlatformTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
