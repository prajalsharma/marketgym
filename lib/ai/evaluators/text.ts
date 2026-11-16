/**
 * Small deterministic text helpers shared by the rules evaluator, the
 * diagnostic scorer and the offline coach. No model, no randomness.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "for", "with", "by", "from", "as", "is", "are",
  "was", "were", "be", "been", "being", "it", "its", "this", "that", "these", "those", "there", "their", "they",
  "them", "than", "then", "so", "if", "not", "no", "yes", "do", "does", "did", "has", "have", "had", "can", "could",
  "would", "should", "will", "may", "might", "about", "into", "over", "under", "up", "down", "out", "more", "most",
  "less", "very", "just", "also", "only", "any", "some", "all", "each", "which", "what", "who", "whom", "how",
  "when", "where", "why", "we", "you", "i", "he", "she", "our", "your", "his", "her", "my", "me", "us", "one", "two",
]);

/** lowercases, strips punctuation (keeps digits, %, ., -, / inside tokens) */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9%$.,/\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** crude stemmer: plural/-ing/-ed/-ly stripped so "flows" ~ "flow", "trading" ~ "trad" */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ly")) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

/** content tokens: stemmed, stopwords removed, punctuation-only tokens removed */
export function contentTokens(text: string): string[] {
  return normalise(text)
    .split(" ")
    .map((t) => t.replace(/^[.,/$%-]+|[.,/$%-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** sentences split on . ! ? and newlines */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** share of `phrase`'s content tokens that appear in `tokens` (0..1); 0 for empty phrase */
export function tokenCoverage(phrase: string, tokens: Set<string>): number {
  const need = contentTokens(phrase);
  if (need.length === 0) return 0;
  const hit = need.filter((t) => tokens.has(t)).length;
  return hit / need.length;
}

/** true when ≥ `minRun` consecutive content tokens of the phrase appear consecutively in the text */
export function hasPhraseRun(phrase: string, textTokens: string[], minRun: number): boolean {
  const need = contentTokens(phrase);
  if (need.length < minRun) return false;
  for (let i = 0; i + minRun <= need.length; i++) {
    const run = need.slice(i, i + minRun);
    for (let j = 0; j + minRun <= textTokens.length; j++) {
      let ok = true;
      for (let k = 0; k < minRun; k++) {
        if (textTokens[j + k] !== run[k]) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
  }
  return false;
}

/** Word-boundary phrase match on normalised text. Returns the matched phrase or null. */
export function matchPhrase(text: string, phrase: string): boolean {
  const p = normalise(phrase);
  if (!p) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
  return re.test(normalise(text));
}

const NEGATIONS = ["not", "no", "never", "isnt", "doesnt", "dont", "cant", "cannot", "wont", "arent", "wasnt", "neither", "nor", "rather than", "instead of", "without"];

/**
 * True when the phrase appears and is NOT negated within the four words
 * before it in the same sentence ("volume does not show buyers" → negated).
 */
export function matchPhraseUnnegated(text: string, phrase: string): boolean {
  const p = normalise(phrase);
  if (!p) return false;
  for (const sentence of sentences(text)) {
    const norm = normalise(sentence);
    const idx = norm.indexOf(p);
    if (idx === -1) continue;
    const before = norm[idx - 1];
    const after = norm[idx + p.length];
    const boundaryOk = (before === undefined || !/[a-z0-9]/.test(before)) && (after === undefined || !/[a-z0-9]/.test(after));
    if (!boundaryOk) continue;
    const window = norm.slice(0, idx).split(" ").filter(Boolean).slice(-4).join(" ");
    const negated = NEGATIONS.some((n) => new RegExp(`(^|\\s)${n}(\\s|$)`).test(window));
    if (!negated) return true;
  }
  return false;
}

/** Parses "75,576", "$1.2B", "3.5%", "2.1m" etc. into numbers found in the text. */
export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const re = /(?<![a-z])\$?(-?\d[\d,]*(?:\.\d+)?)\s*(%|bn|b|billion|mn|m|million|k|thousand|x)?(?![a-z0-9])/gi;
  let m: RegExpExecArray | null;
  const lower = text.toLowerCase();
  while ((m = re.exec(lower)) !== null) {
    const raw = m[1].replace(/,/g, "");
    let n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    if (suffix === "k" || suffix === "thousand") n *= 1e3;
    else if (suffix === "m" || suffix === "mn" || suffix === "million") n *= 1e6;
    else if (suffix === "b" || suffix === "bn" || suffix === "billion") n *= 1e9;
    out.push(n);
  }
  return out;
}

/** |a-b| ≤ tolerance × |b| (relative), with a small absolute floor for near-zero values */
export function approxEqual(a: number, b: number, relTolerance: number, absFloor = 1e-9): boolean {
  return Math.abs(a - b) <= Math.max(Math.abs(b) * relTolerance, absFloor);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number): number {
  return Math.round(n);
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
