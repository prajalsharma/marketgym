/**
 * Every prompt is a versioned template: a fixed system message and a pure
 * `build(input)` that renders the user message. The version is recorded on
 * every Evaluation/CoachSession the prompt produced.
 */
export interface PromptTemplate<I> {
  version: string;
  system: string;
  build(input: I): string;
}
