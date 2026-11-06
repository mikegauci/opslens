import { responseSchemas } from "@opslens/analytics/schemas";
import { api, type paths } from "@opslens/contracts";
import { useEffect, useState } from "react";
import type { Query } from "./scope";

type Endpoint = "/api/summary" | "/api/trend" | "/api/contributions";
type Result<P extends Endpoint> =
  paths[P]["get"]["responses"][200]["content"]["application/json"];
export function usePanel<P extends Endpoint>(
  path: P,
  query: Query,
  attempt: number,
) {
  const key = JSON.stringify(query);
  const [state, setState] = useState<{
    data?: Result<P>;
    scope?: Query;
    requestKey?: string;
    attempt?: number;
    loading: boolean;
    error?: string;
  }>({ loading: true });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const snapshot: Query = JSON.parse(key);
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    void api
      .GET(path as Endpoint, {
        params: { query: snapshot },
        signal: controller.signal,
      })
      .then((result) => {
        if (!active) return;
        if (!result.data)
          throw new Error(
            result.response.status === 400
              ? "This scope is outside the dataset or invalid. Adjust the dates or reset filters."
              : "Analytics unavailable. Retry this panel.",
          );
        const kind = path.slice(5) as "summary" | "trend" | "contributions";
        const parsed = responseSchemas[kind].safeParse(result.data);
        if (!parsed.success)
          throw new Error("Invalid analytics response. Retry this panel.");
        const validated = parsed.data;
        const scope = validated.metadata.scope;
        if (
          scope.from !== snapshot.from ||
          scope.to !== snapshot.to ||
          scope.brand !== snapshot.brand ||
          scope.provider !== snapshot.provider ||
          scope.basis !== "settlement" ||
          scope.status !== "settled"
        )
          throw new Error(
            "Returned scope does not match the requested filters. Retry this panel.",
          );
        setState({
          data: validated as Result<P>,
          scope: snapshot,
          requestKey: key,
          attempt,
          loading: false,
        });
      })
      .catch((error: unknown) => {
        if (active)
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Analytics unavailable. Retry this panel.",
          }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, key, attempt]);
  return {
    ...state,
    stale:
      !!state.data &&
      (state.requestKey !== key ||
        state.attempt !== attempt ||
        state.loading ||
        !!state.error),
  };
}
