/**
 * `callStructured`: the one way lib/ai talks to a model. Renders a versioned
 * prompt, asks for a strict JSON-schema response, enforces a timeout, retries
 * once when the output fails validation, and ALWAYS runs the result through
 * the Zod schema before returning it. Callers get a discriminated result and
 * must fall back to their deterministic path on `ok: false`.
 */
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { JsonSchemaFormat, LanguageModel } from "./provider";
import { getModel } from "./provider";
import type { PromptTemplate } from "./prompts/types";

export interface CallStructuredOptions {
  /** model-visible schema name (snake_case) */
  schemaName: string;
  /** explicit model; `undefined` means use getModel(); `null` means offline */
  model?: LanguageModel | null;
  timeoutMs?: number;
  /** retries after a schema/JSON failure (default 1) */
  retries?: number;
  temperature?: number;
}

export type StructuredResult<T> =
  | { ok: true; value: T; promptVersion: string; attempts: number; modelName: string }
  | { ok: false; reason: "no-model" | "timeout" | "transport" | "invalid-output"; error: string; promptVersion: string };

const DEFAULT_TIMEOUT_MS = 20_000;

/** Builds the strict JSON-schema text format for a Zod schema via the SDK helper. */
export function toJsonSchemaFormat(schema: z.ZodType, name: string): JsonSchemaFormat {
  const format = zodTextFormat(schema, name);
  return {
    type: "json_schema",
    name,
    schema: (format.schema ?? {}) as Record<string, unknown>,
    strict: true,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`model call timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed) as unknown;
}

export async function callStructured<T, I>(
  schema: z.ZodType<T>,
  prompt: PromptTemplate<I>,
  input: I,
  opts: CallStructuredOptions,
): Promise<StructuredResult<T>> {
  const model = opts.model === undefined ? getModel() : opts.model;
  const promptVersion = prompt.version;
  if (!model) return { ok: false, reason: "no-model", error: "no language model configured", promptVersion };

  const format = toJsonSchemaFormat(schema, opts.schemaName);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = 1 + (opts.retries ?? 1);
  const baseUser = prompt.build(input);
  let lastValidationError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const user =
      attempt === 1
        ? baseUser
        : `${baseUser}\n\nYour previous reply did not match the required JSON schema (${lastValidationError}). Reply again with valid JSON only.`;

    let raw: string;
    try {
      raw = await withTimeout(
        model.generateJson({ system: prompt.system, user, format, timeoutMs, temperature: opts.temperature }),
        timeoutMs,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const reason = /timed out|timeout/i.test(message) ? "timeout" : "transport";
      return { ok: false, reason, error: message, promptVersion };
    }

    let parsed: unknown;
    try {
      parsed = parseJson(raw);
    } catch (err) {
      lastValidationError = `not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { ok: true, value: result.data, promptVersion, attempts: attempt, modelName: model.name };
    }
    lastValidationError = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
  }
  return { ok: false, reason: "invalid-output", error: lastValidationError, promptVersion };
}
