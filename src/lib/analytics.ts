import type { AnalyticsEvent } from "./types";

/**
 * FRD §11 instrumentation. Client-side stub: logs to console in dev and
 * keeps an in-memory trail. The real pipeline ships these to Mixpanel.
 */
export interface TrackedEvent {
  event: AnalyticsEvent;
  props: Record<string, string | number | boolean>;
  at: string;
}

const trail: TrackedEvent[] = [];

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}): void {
  const entry: TrackedEvent = { event, props, at: new Date().toISOString() };
  trail.push(entry);
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", event, props);
  }
}

export function getTrail(): TrackedEvent[] {
  return [...trail];
}
