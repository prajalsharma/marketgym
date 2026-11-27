/**
 * Postgres repository without a database: SQL-free helpers (schema identifier,
 * schema.sql rendering, row mappers) plus the repository driven by a fake
 * postgres.js `sql` that records every statement.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSchemaIdentifier, isUuid, mapRows, profileRow, renderSchemaSql, toAttempt, toPortfolio, toProfile, attemptRow, portfolioRow } from "@/lib/db/postgres/mappers";
import { PostgresRepository, schemaSqlPath, type Sql } from "@/lib/db/postgres/postgres-repository";
import { ALICE, BOB, portfolio, uuid } from "./repository-contract";

const SCHEMA_SQL = readFileSync(path.resolve(__dirname, "../../../lib/db/postgres/schema.sql"), "utf8");

describe("schema identifier", () => {
  it("accepts plain lowercase identifiers", () => {
    expect(assertSchemaIdentifier("marketgym")).toBe("marketgym");
    expect(assertSchemaIdentifier("mg_prod_2")).toBe("mg_prod_2");
  });

  it.each(['marketgym"; drop schema public cascade; --', "MarketGym", "1abc", "a-b", "a.b", "", "x".repeat(42)])("rejects %j", (bad) => {
    expect(() => assertSchemaIdentifier(bad)).toThrow();
  });

  it.each(["public", "pg_catalog", "information_schema"])("refuses the reserved schema %s", (reserved) => {
    expect(() => assertSchemaIdentifier(reserved)).toThrow(/reserved/);
  });
});

describe("schema.sql", () => {
  const rendered = renderSchemaSql(SCHEMA_SQL, "marketgym");
  const code = rendered
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");

  it("renders every placeholder as the quoted schema", () => {
    expect(rendered).not.toContain("__SCHEMA__");
    expect(rendered).toContain('create schema if not exists "marketgym";');
    expect(rendered).toContain('"marketgym".users');
  });

  it("never touches public or auth, and has no Supabase policies", () => {
    expect(code).not.toMatch(/\bpublic\./i);
    expect(code).not.toMatch(/\bauth\./i);
    expect(code).not.toMatch(/create\s+policy/i);
    expect(code).not.toMatch(/create\s+extension/i);
  });

  it("enables row level security on every table it creates", () => {
    const tables = [...code.matchAll(/create table if not exists "marketgym"\.(\w+)/g)].map((m) => m[1]);
    const rls = new Set([...code.matchAll(/alter table "marketgym"\.(\w+) enable row level security/g)].map((m) => m[1]));
    expect(tables).toEqual(expect.arrayContaining(["users", "profiles", "scenarios", "scenario_attempts", "paper_portfolios", "market_snapshots"]));
    for (const t of tables) expect(rls.has(t), `${t} has RLS`).toBe(true);
  });

  it("points every user_id at the schema's users table", () => {
    const userIdCols = code.match(/user_id uuid not null references "marketgym"\.users\(id\)/g) ?? [];
    const allUserIdCols = code.match(/^\s*user_id /gm) ?? [];
    expect(userIdCols.length).toBe(allUserIdCols.length);
    expect(code).toMatch(/privy_did text unique not null/);
    expect(code).not.toMatch(/wallet|address/i);
  });

  it("refuses an unsafe schema name at render time", () => {
    expect(() => renderSchemaSql(SCHEMA_SQL, 'x"; drop table y; --')).toThrow();
  });
});

describe("row mappers", () => {
  it("maps timestamptz Dates to ISO strings", () => {
    const [p] = mapRows(
      "t",
      [
        {
          id: ALICE,
          display_name: "Ada",
          experience_level: "new",
          learning_goal: "read-market-data",
          preferred_learning_style: "concise",
          interests: [],
          onboarding_completed_at: null,
          created_at: new Date("2026-11-27T10:00:00Z"),
          updated_at: new Date("2026-11-27T11:00:00Z"),
        },
      ],
      profileRow,
      toProfile,
    );
    expect(p).toMatchObject({ id: ALICE, displayName: "Ada", createdAt: "2026-11-27T10:00:00.000Z", updatedAt: "2026-11-27T11:00:00.000Z", onboardingCompletedAt: null });
  });

  it("omits a null template id and takes portfolio ids from the row, not the JSON", () => {
    const a = toAttempt(
      attemptRow.parse({ id: uuid(1), user_id: ALICE, scenario_id: uuid(2), template_id: null, skill_ids: ["x"], submitted_answer: "a", hints_used: 0, feedback: {}, created_at: new Date() }),
    );
    expect("templateId" in a).toBe(false);
    const p = toPortfolio(portfolioRow.parse({ id: uuid(3), user_id: ALICE, portfolio: { ...portfolio(uuid(9), BOB) } }));
    expect(p.id).toBe(uuid(3));
    expect(p.userId).toBe(ALICE);
  });

  it("throws on schema drift instead of leaking bad rows", () => {
    expect(() => mapRows("t", [{ id: 1 }], profileRow, toProfile)).toThrow(/failed validation/);
  });

  it("recognises uuids", () => {
    expect(isUuid(ALICE)).toBe(true);
    expect(isUuid("local-demo-user")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

// ---------- fake postgres.js ----------

interface Recorded {
  text: string;
  values: unknown[];
}
const FRAG = Symbol("fragment");
interface Frag extends PromiseLike<unknown[]> {
  [FRAG]: true;
  text: string;
  values: unknown[];
}

function fakeSql(respond: (q: Recorded) => unknown[] = () => []): { sql: Sql; log: Recorded[] } {
  const log: Recorded[] = [];
  const make = (text: string, values: unknown[]): Frag => ({
    [FRAG]: true,
    text,
    values,
    then(onFul, onRej) {
      const q = { text, values };
      log.push(q);
      return Promise.resolve()
        .then(() => respond(q))
        .then(onFul, onRej);
    },
  });
  const tag = (strings: TemplateStringsArray, ...vals: unknown[]): Frag => {
    let text = strings[0]!;
    const values: unknown[] = [];
    vals.forEach((v, i) => {
      if (v && typeof v === "object" && FRAG in v) {
        const f = v as Frag;
        text += f.text;
        values.push(...f.values);
      } else {
        values.push(v);
        text += `$${values.length}`;
      }
      text += strings[i + 1]!;
    });
    return make(text.replace(/\s+/g, " ").trim(), values);
  };
  const sql = Object.assign(tag, {
    unsafe: (text: string) => make(text, []),
    json: (v: unknown) => ({ json: v }),
    begin: async (cb: (tx: unknown) => Promise<unknown>) => cb(sql),
  });
  return { sql: sql as unknown as Sql, log };
}

describe("PostgresRepository (fake sql)", () => {
  it("applies schema.sql once per process, under an advisory lock, before the first query", async () => {
    const { sql, log } = fakeSql();
    const repo = new PostgresRepository(sql, "marketgym", async () => SCHEMA_SQL);
    await repo.listPortfolios(ALICE);
    await repo.listMastery(ALICE);
    const ddl = log.filter((q) => q.text.includes("create schema if not exists"));
    expect(ddl).toHaveLength(1);
    expect(ddl[0]!.text).toContain('"marketgym".paper_portfolios');
    expect(log[0]!.text).toContain("pg_advisory_xact_lock");
    expect(log.indexOf(ddl[0]!)).toBeLessThan(log.findIndex((q) => q.text.includes("from paper_portfolios")));
  });

  it("retries the schema after a failed first attempt", async () => {
    const { sql } = fakeSql();
    let calls = 0;
    const repo = new PostgresRepository(sql, "marketgym", async () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return SCHEMA_SQL;
    });
    await expect(repo.listPortfolios(ALICE)).rejects.toThrow("boom");
    await expect(repo.listPortfolios(ALICE)).resolves.toEqual([]);
    expect(calls).toBe(2);
  });

  it("filters every learner read by user_id", async () => {
    const { sql, log } = fakeSql();
    const repo = new PostgresRepository(sql, "marketgym", async () => SCHEMA_SQL);
    await repo.getLatestDiagnostic(ALICE);
    await repo.listAttempts(ALICE, { scenarioId: uuid(1), limit: 5 });
    await repo.getMastery(ALICE, "markets.price");
    await repo.listMastery(ALICE);
    await repo.getReview(ALICE, uuid(2));
    await repo.listReviews(ALICE, { pending: true });
    await repo.getCoachSession(ALICE, "coach_x");
    await repo.listCoachSessions(ALICE, 5);
    await repo.listActivity(ALICE, 5);
    await repo.getPortfolio(ALICE, uuid(3));
    await repo.listPortfolios(ALICE);
    await repo.listKnowledgeCheckResults(ALICE, "markets.price");
    const reads = log.filter((q) => q.text.startsWith("select") && !q.text.includes("pg_advisory"));
    expect(reads).toHaveLength(12);
    for (const q of reads) {
      expect(q.text, q.text).toMatch(/where user_id = \$1/);
      expect(q.values[0]).toBe(ALICE);
    }
    expect(log.some((q) => /\bpublic\./.test(q.text) && !q.text.includes("create schema"))).toBe(false);
  });

  it("never queries with a non-uuid user id", async () => {
    const { sql, log } = fakeSql();
    const repo = new PostgresRepository(sql, "marketgym", async () => SCHEMA_SQL);
    expect(await repo.listPortfolios("local-demo-user")).toEqual([]);
    expect(await repo.getPortfolio(ALICE, "not-a-uuid")).toBeNull();
    expect(await repo.getProfile("' or 1=1 --")).toBeNull();
    expect(log).toHaveLength(0);
  });

  it("guards portfolio upserts by owner and throws when the id belongs to someone else", async () => {
    const { sql, log } = fakeSql(() => []);
    const repo = new PostgresRepository(sql, "marketgym", async () => SCHEMA_SQL);
    await expect(repo.savePortfolio(portfolio(uuid(31), BOB))).rejects.toThrow(/another user/);
    const upsert = log.find((q) => q.text.startsWith("insert into paper_portfolios"))!;
    expect(upsert.text).toContain("where paper_portfolios.user_id = excluded.user_id");
    expect(upsert.values).toContain(BOB);
  });

  it("upserts a Privy user by DID and reports whether it was new; stores no wallet data", async () => {
    const created = new Date("2026-11-27T10:00:00Z");
    const { sql, log } = fakeSql((q) => (q.text.startsWith("insert into users") ? [{ id: ALICE, privy_did: "did:privy:abc", display_name: "Learner", created_at: created, inserted: true }] : []));
    const repo = new PostgresRepository(sql, "marketgym", async () => SCHEMA_SQL);
    const { user, isNew } = await repo.upsertPrivyUser("did:privy:abc", "Learner");
    expect(isNew).toBe(true);
    expect(user).toEqual({ id: ALICE, privyDid: "did:privy:abc", displayName: "Learner", createdAt: created.toISOString() });
    const insert = log.find((q) => q.text.startsWith("insert into users"))!;
    expect(insert.text).toContain("on conflict (privy_did)");
    expect(insert.values).toEqual(["did:privy:abc", "Learner"]);
  });

  it("reads schema.sql from the repo path at runtime", () => {
    expect(schemaSqlPath().endsWith(path.join("lib", "db", "postgres", "schema.sql"))).toBe(true);
  });
});
