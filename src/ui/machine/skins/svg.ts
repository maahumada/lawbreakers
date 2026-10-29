import { useId } from "react";
import type { GaugeMark } from "../../../engine/display.ts";

/** A unique, CSS-safe id for SVG `<defs>` (React's ids contain colons). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Marks of one variable (none when the panel has no marks for it). */
export function marksOf(
  marks: Record<string, GaugeMark[]> | undefined,
  name: string,
): readonly GaugeMark[] {
  return marks?.[name] ?? [];
}
