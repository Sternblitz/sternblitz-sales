export type RangeKey = "today" | "yesterday" | "7d" | "all";

export type DateRange = {
  gte?: string;
  lt?: string;
};

export function normalizeRange(value: string | null | undefined): RangeKey {
  const normalized = (value || "all").toLowerCase();
  if (normalized === "today" || normalized === "yesterday" || normalized === "7d") {
    return normalized;
  }
  return "all";
}

export function computeDateRange(range: RangeKey): DateRange {
  const now = new Date();
  now.setMilliseconds(0);

  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { gte: start.toISOString(), lt: end.toISOString() };
  }

  if (range === "yesterday") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { gte: start.toISOString(), lt: end.toISOString() };
  }

  if (range === "7d") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return { gte: start.toISOString() };
  }

  return {};
}
