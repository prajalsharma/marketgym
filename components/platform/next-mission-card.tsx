import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NextMission } from "@/lib/types/learning";
import { Badge, Button } from "@/components/ui";
import { MISSION_KIND_LABEL } from "@/lib/client/labels";
import { humanise } from "@/lib/client/format";

interface Props {
  mission: NextMission;
  skillName?: string;
  heading?: string;
}

/** The one thing to do next. Title, the engine's reason, one button. */
export function NextMissionCard({ mission, skillName, heading = "Up next" }: Props) {
  return (
    <section
      aria-labelledby="next-mission-heading"
      className="rounded-lg border border-accent/45 bg-accent-soft p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="next-mission-heading" className="text-xs font-medium text-muted">
          {heading}
        </h2>
        <Badge tone="info">{MISSION_KIND_LABEL[mission.kind]}</Badge>
        <Badge tone="neutral">{skillName ?? humanise(mission.skillId)}</Badge>
      </div>
      <p className="mt-2 text-lg font-semibold leading-snug text-balance">{mission.title}</p>
      <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{mission.reason}</p>
      <Button asChild size="lg" className="group mt-4">
        <Link href={mission.href}>
          Start
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
