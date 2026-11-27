import { cn } from "@/lib/utils";

/**
 * Tiny renderer for the curriculum's markdown-lite:
 * paragraphs separated by blank lines, **bold**, bullet lines starting with "- ".
 * Nothing else is interpreted; raw text is never injected as HTML.
 */
export function LessonText({ text, className }: { text: string; className?: string }) {
  const blocks = splitBlocks(text);
  return (
    <div className={cn("space-y-4 text-[0.9375rem] leading-7 text-fg/90 sm:text-base sm:leading-7", className)}>
      {blocks.map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="space-y-2">
            {block.items.map((item, j) => (
              <li key={j} className="relative pl-5">
                <span aria-hidden="true" className="absolute left-0.5 top-[0.7em] size-1.5 rounded-full bg-accent" />
                {renderInline(item)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-pretty">
            {renderInline(block.text)}
          </p>
        ),
      )}
    </div>
  );
}

type Block = { kind: "para"; text: string } | { kind: "list"; items: string[] };

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: "para", text: para.join(" ") });
      para = [];
    }
    if (list.length) {
      blocks.push({ kind: "list", items: list });
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      if (para.length) {
        blocks.push({ kind: "para", text: para.join(" ") });
        para = [];
      }
      list.push(line.replace(/^[-*•]\s+/, ""));
      continue;
    }
    if (list.length) {
      blocks.push({ kind: "list", items: list });
      list = [];
    }
    para.push(line);
  }
  flush();
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
