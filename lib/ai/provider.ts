/**
 * Model provider boundary. The rest of lib/ai only ever sees `LanguageModel`,
 * a tiny interface that returns raw JSON text for a strict JSON-schema request.
 * Tests pass a fake implementation; production wraps the OpenAI Responses API.
 *
 * `getModel()` returns null when OPENAI_API_KEY is unset or DEMO_MODE=true, and
 * every caller must handle null by running its deterministic/offline path.
 */
import OpenAI from "openai";
import { getEnv } from "@/lib/config/env";

/** Strict JSON-schema text format, as accepted by the OpenAI Responses API. */
export interface JsonSchemaFormat {
  type: "json_schema";
  name: string;
  schema: Record<string, unknown>;
  strict: boolean;
}

export interface StructuredRequest {
  system: string;
  user: string;
  format: JsonSchemaFormat;
  timeoutMs: number;
  temperature?: number;
}

export interface LanguageModel {
  /** human-readable model name, recorded for diagnostics */
  name: string;
  /** returns the raw JSON text the model produced; throws on transport failure */
  generateJson(request: StructuredRequest): Promise<string>;
}

let cachedModel: LanguageModel | null | undefined;

/** Wraps an OpenAI client as a LanguageModel. Exported for tests and custom wiring. */
export function createOpenAiModel(client: OpenAI, modelName: string): LanguageModel {
  return {
    name: modelName,
    async generateJson(request: StructuredRequest): Promise<string> {
      const response = await client.responses.create(
        {
          model: modelName,
          input: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
          text: { format: request.format },
          temperature: request.temperature ?? 0.2,
        },
        { timeout: request.timeoutMs },
      );
      return response.output_text;
    },
  };
}

/** Null when no key is configured or demo mode is on. */
export function getModel(): LanguageModel | null {
  if (cachedModel !== undefined) return cachedModel;
  const env = getEnv();
  if (!env.openaiEnabled || !env.OPENAI_API_KEY) {
    cachedModel = null;
    return cachedModel;
  }
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  cachedModel = createOpenAiModel(client, env.OPENAI_MODEL);
  return cachedModel;
}

/** test helper */
export function resetModelCache(): void {
  cachedModel = undefined;
}
