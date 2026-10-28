/** Whether the player asked for less motion. Read at call time so a change applies immediately. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/** Scroll `el` into view if any part of it is outside the viewport. */
export function revealElement(el: Element | null, block: ScrollLogicalPosition = "nearest"): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= window.innerHeight) return;
  el.scrollIntoView({ block, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
