/**
 * Regression tests for the 2026-11 security audit findings.
 */
import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/client/privy";
import { toNewsEvidence } from "@/lib/market-data/sosovalue/normalise";
import { ApiError, readJson } from "@/lib/server/api";
import { clientIp } from "@/lib/server/rate-limit";
import type { DataProvenance } from "@/lib/types";

const prov: DataProvenance = { kind: "live", provider: "sosovalue", sourceUrl: "x", fetchedAt: "2026-11-27T00:00:00.000Z" };

describe("post-login redirect only accepts same-site paths", () => {
  it.each(["/app", "/app/portfolio?tab=2", "/app/learn/markets#top"])("allows %s", (p) => expect(safeNext(p)).toBe(p));
  it.each(["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "https://evil.example", "/x?u=https://evil.example", "javascript:alert(1)", ""])("rejects %j", (p) =>
    expect(safeNext(p)).toBeNull(),
  );
});

describe("news links", () => {
  const base = { id: "1", title: "t", content: "<p>c</p>", release_time: 1795651200000 } as unknown as Parameters<typeof toNewsEvidence>[0];
  it("drops non-http(s) links from the provider", () => {
    const ev = toNewsEvidence({ ...base, original_link: "javascript:alert(1)", source_link: "data:text/html,x" } as typeof base, prov);
    expect(ev.sourceUrl).toBe("https://sosovalue.com");
  });
  it("keeps https links", () => {
    const ev = toNewsEvidence({ ...base, original_link: "https://example.com/a" } as typeof base, prov);
    expect(ev.sourceUrl).toBe("https://example.com/a");
  });
});

describe("JSON bodies", () => {
  it("rejects form-encoded and text/plain bodies (cross-site form posts)", async () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", ""]) {
      const req = new Request("http://localhost/api/x", { method: "POST", headers: type ? { "content-type": type } : {}, body: '{"a":1}' });
      await expect(readJson(req)).rejects.toBeInstanceOf(ApiError);
    }
    const ok = new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: '{"a":1}' });
    expect(await readJson(ok)).toEqual({ a: 1 });
  });
});

describe("rate-limit client address", () => {
  it("prefers the platform-set header over a client-supplied x-forwarded-for", () => {
    const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "6.6.6.6", "x-real-ip": "1.2.3.4" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
});
