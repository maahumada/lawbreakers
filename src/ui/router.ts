// Query-string routing: `?` title, `?missions` mission select, `?mission=NN` a mission, `?dev`
// the verifier dev page. In-app moves use history.pushState (no reload) and Back works through
// popstate. Plain `<a href="?…">` links (e.g. the results screen's "Next mission") are intercepted
// so they navigate in-app too.

import { useSyncExternalStore } from "react";

export type Route =
  | { screen: "title" }
  | { screen: "missions" }
  | { screen: "mission"; number: string }
  | { screen: "dev" };

export function parseRoute(search: string): Route {
  const params = new URLSearchParams(search);
  if (params.has("dev")) return { screen: "dev" };
  const mission = params.get("mission");
  if (mission !== null && /^\d{1,2}$/.test(mission)) {
    return { screen: "mission", number: mission.padStart(2, "0") };
  }
  if (params.has("missions")) return { screen: "missions" };
  return { screen: "title" };
}

export function routeHref(route: Route): string {
  switch (route.screen) {
    case "title":
      return "?";
    case "missions":
      return "?missions";
    case "mission":
      return `?mission=${route.number}`;
    case "dev":
      return "?dev";
  }
}

const NAVIGATE = "lawbreakers:navigate";

export function navigate(route: Route | string): void {
  const href = typeof route === "string" ? route : routeHref(route);
  // "?" alone would leave a bare "?" in the address bar: the title is the plain path.
  const target = new URL(href === "?" ? window.location.pathname : href, window.location.href);
  if (target.href === window.location.href) return;
  window.history.pushState(null, "", target);
  window.dispatchEvent(new Event(NAVIGATE));
  window.scrollTo(0, 0);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE, onChange);
  };
}

/** The current location's query string (re-renders on every navigation). */
export function useSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search);
}

/** Turn same-page `?…` link clicks into in-app navigations. Returns the cleanup. */
export function interceptLinks(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!(a instanceof HTMLAnchorElement) || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    e.preventDefault();
    navigate(url.search === "" ? "?" : url.search);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
