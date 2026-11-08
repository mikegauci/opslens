import { activityQuery } from "@opslens/analytics/schemas";
import { defaultQuery, parseOverview } from "./scope";

export function parseActivity(search: string) {
  const p = new URLSearchParams(search);
  const contextKeys = ["comparisonFrom", "comparisonTo", "origin", "view"];
  if ([...p.keys()].some((k) => p.getAll(k).length !== 1)) return null;
  const context = Object.fromEntries(
    [...p].filter(([k]) => contextKeys.includes(k)),
  );
  const input = Object.fromEntries(
    [...p].filter(([k]) => !contextKeys.includes(k)),
  );
  const parsed = activityQuery.safeParse({
    ...defaultQuery,
    limit: "100",
    ...input,
  });
  if (!parsed.success) return null;
  if (context.view && !["pages", "virtual"].includes(context.view)) return null;
  if (
    context.origin &&
    !(context.origin.startsWith("/?") && parseOverview(context.origin.slice(2)))
  )
    return null;
  const comparison =
    context.comparisonFrom || context.comparisonTo
      ? parseOverview(
          new URLSearchParams({
            from: context.comparisonFrom ?? "",
            to: context.comparisonTo ?? "",
          }).toString(),
        )
      : undefined;
  if (comparison === null) return null;
  return {
    query: parsed.data,
    context,
    comparison,
    view: context.view ?? "pages",
  };
}
export type ActivityScope = NonNullable<ReturnType<typeof parseActivity>>;
export function explorerUrl(scope: ActivityScope) {
  const p = new URLSearchParams(scope.context);
  for (const [key, value] of Object.entries(scope.query))
    if (value !== undefined) p.set(key, String(value));
  return `/activity?${p}`;
}
