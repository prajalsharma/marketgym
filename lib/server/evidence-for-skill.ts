/** Evidence tokens the coach should have at hand for a skill (reused by coach routes). */
import { getModuleForSkill, listExerciseTemplates } from "@/lib/curriculum";

export function evidenceRequirementsForSkill(skillId: string): string[] {
  const templates = listExerciseTemplates({ skillId });
  const fromTemplate = templates.find((t) => t.evidenceRequirements.length > 0)?.evidenceRequirements;
  if (fromTemplate) return fromTemplate;
  const moduleId = getModuleForSkill(skillId)?.id ?? skillId.split(".")[0];
  switch (moduleId) {
    case "etf":
      return ["snapshot:BTC", "etf:BTC", "news:etf"];
    case "indexes":
      return ["index:all", "snapshot:BTC"];
    case "orderbook":
      return ["orderbook:vBTC_vUSDC"];
    case "news":
      return ["snapshot:BTC", "news:market"];
    default:
      return ["snapshot:BTC", "snapshot:ETH", "news:market"];
  }
}
