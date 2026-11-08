import type { paths } from "@opslens/contracts";
export type Query = paths["/api/summary"]["get"]["parameters"]["query"];
export const defaultQuery: Query = {
  from: "2026-09-22T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
};
export const day = (timestamp: string) => timestamp.slice(0, 10);
export const shiftDay = (timestamp: string, days: number) =>
  new Date(Date.parse(timestamp) + days * 86400000).toISOString();
export const range = (q: { from: string; to: string }) =>
  `${day(q.from)} – ${day(shiftDay(q.to, -1))} UTC`;
export const scopeLabel = (q: Query) =>
  `${range(q)} · ${q.brand ?? "All brands"} · ${q.provider ?? "All providers"} · Settled / settlement time`;
export function parseOverview(search: string): Query | null {
  const params = new URLSearchParams(search);
  if (
    [...params.keys()].some(
      (k) =>
        !["from", "to", "brand", "provider"].includes(k) ||
        params.getAll(k).length !== 1,
    )
  )
    return null;
  const from = params.get("from") ?? defaultQuery.from;
  const to = params.get("to") ?? defaultQuery.to;
  const validDate = (t: string) =>
    /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(t) &&
    Number.isFinite(Date.parse(t)) &&
    new Date(t).toISOString() === t;
  if (
    !validDate(from) ||
    !validDate(to) ||
    from >= to ||
    Date.parse(to) - Date.parse(from) > 90 * 86400000
  )
    return null;
  const brand = params.get("brand");
  const provider = params.get("provider");
  if (brand !== null && brand !== "harbor" && brand !== "summit") return null;
  if (
    provider !== null &&
    provider !== "nova" &&
    provider !== "orbit" &&
    provider !== "pulse"
  )
    return null;
  return {
    from,
    to,
    ...(brand ? { brand } : {}),
    ...(provider ? { provider } : {}),
  };
}
export const overviewUrl = (q: Query) => `/?${new URLSearchParams(q)}`;
export function activityUrl(
  q: Query,
  comparison: { from: string; to: string },
  hash: string,
  origin: Query,
) {
  return `/activity?${new URLSearchParams({ ...q, basis: "settlement", status: "settled", sort: "date", direction: "desc", comparisonFrom: comparison.from, comparisonTo: comparison.to, datasetHash: hash, origin: overviewUrl(origin) })}`;
}

const euros = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
export const money = (value: number) => euros.format(value / 100);
