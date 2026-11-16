import type {
  Curriculum,
  ExerciseKind,
  ExerciseTemplate,
  KnowledgeCheck,
  LearningPath,
  Misconception,
  Module,
  Skill,
} from "@/lib/types/curriculum";
import { skills } from "./skills";
import { misconceptions } from "./misconceptions";
import { marketsModule } from "./modules/markets";
import { newsModule } from "./modules/news";
import { etfModule } from "./modules/etf";
import { indexesModule } from "./modules/indexes";
import { orderbookModule } from "./modules/orderbook";
import { reasoningModule } from "./modules/reasoning";

const modules: Module[] = [
  marketsModule,
  newsModule,
  etfModule,
  indexesModule,
  orderbookModule,
  reasoningModule,
].sort((a, b) => a.sequence - b.sequence);

const path: LearningPath = {
  id: "crypto-market-analyst-foundations",
  title: "Crypto Market Analyst Foundations",
  description:
    "Learn to read a crypto market the way an analyst does: prices, volume and market cap; news as claims rather than facts; ETF flows and what they cannot tell you; index weights; the inside of an order book; and how to write a thesis with evidence, gaps, confidence and an invalidation. No price predictions and no trading advice.",
  difficulty: 3,
  published: true,
  moduleIds: modules.map((m) => m.id),
};

export const curriculum: Curriculum = {
  path,
  modules,
  skills,
  misconceptions,
};

// ---------- indexes for O(1) lookups ----------
const skillById = new Map<string, Skill>(skills.map((s) => [s.id, s]));
const moduleById = new Map<string, Module>(modules.map((m) => [m.id, m]));
const moduleBySkillId = new Map<string, Module>();
const templateById = new Map<string, ExerciseTemplate>();
const knowledgeCheckById = new Map<string, KnowledgeCheck>();
const misconceptionById = new Map<string, Misconception>(
  misconceptions.map((m) => [m.id, m]),
);

for (const mod of modules) {
  moduleBySkillId.set(mod.id, mod);
  for (const id of mod.skillIds) moduleBySkillId.set(id, mod);
  for (const t of mod.exercises) templateById.set(t.id, t);
  for (const kc of mod.knowledgeChecks) knowledgeCheckById.set(kc.id, kc);
}

export function getSkill(id: string): Skill | undefined {
  return skillById.get(id);
}

export function getModule(id: string): Module | undefined {
  return moduleById.get(id);
}

/** Accepts a leaf skill id ("markets.price") or a module skill id ("markets"). */
export function getModuleForSkill(skillId: string): Module | undefined {
  return moduleBySkillId.get(skillId);
}

export function getExerciseTemplate(id: string): ExerciseTemplate | undefined {
  return templateById.get(id);
}

export function listExerciseTemplates(filter?: {
  skillId?: string;
  kind?: ExerciseKind;
}): ExerciseTemplate[] {
  const all = modules.flatMap((m) => m.exercises);
  return all.filter((t) => {
    if (filter?.kind && t.kind !== filter.kind) return false;
    if (filter?.skillId) {
      const sid = filter.skillId;
      const matchesLeaf = t.skillIds.includes(sid);
      const matchesModule = t.skillIds.some((s) => s.split(".")[0] === sid);
      if (!matchesLeaf && !matchesModule) return false;
    }
    return true;
  });
}

export function getKnowledgeCheck(id: string): KnowledgeCheck | undefined {
  return knowledgeCheckById.get(id);
}

/** Accepts a leaf skill id or a module skill id. */
export function listKnowledgeChecks(skillId: string): KnowledgeCheck[] {
  return modules
    .flatMap((m) => m.knowledgeChecks)
    .filter((kc) => kc.skillId === skillId || kc.skillId.split(".")[0] === skillId);
}

export function getMisconception(id: string): Misconception | undefined {
  return misconceptionById.get(id);
}

export type {
  Curriculum,
  ExerciseKind,
  ExerciseTemplate,
  KnowledgeCheck,
  LearningPath,
  Misconception,
  Module,
  Skill,
};
