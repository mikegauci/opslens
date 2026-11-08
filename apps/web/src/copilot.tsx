import {
  type CopilotAnswer,
  type CopilotError,
  type CopilotEvidence,
  type CopilotScope,
  copilotEvent,
  matchesCopilotScope,
} from "@opslens/analytics/copilot";
import { api } from "@opslens/contracts";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { money } from "./scope";

const errors: Record<CopilotError, string> = {
  failed: "The answer could not be verified. Retry your question.",
  timeout: "The copilot timed out. Retry your question.",
  quota: "The model is at its request limit. Try again later.",
  scope:
    "These dates are outside the available dataset. Change the dashboard filters, then apply the new scope.",
  dataset:
    "The dataset changed during this investigation. Reload the dashboard and ask again.",
  unsupported:
    "That tool request did not match the confirmed filters. Retry or adjust the dashboard filters.",
};

const limits = {
  CLARIFY:
    "Please specify the metric, period comparison or transaction slice you want to investigate.",
  NO_SOURCES:
    "There are no verified document excerpts available for this question.",
  OUTSIDE_SCOPE:
    "The question cannot be answered in this scope. Settled metrics require complete UTC settlement days. Adjust the dashboard filters, then apply the new scope.",
};

const titles = {
  summary: "Settled metric summary",
  comparison: "Equal-period comparison",
  contributions: "Provider contributions",
  activity: "Matching transactions",
  document: "Document source",
};
const providers = { nova: "Nova", orbit: "Orbit", pulse: "Pulse" };
const interval = (scope: Pick<CopilotScope, "from" | "to">) =>
  `${scope.from} → ${scope.to} (end exclusive, UTC)`;
function scopeText(scope: CopilotScope) {
  return `${interval(scope)} · ${scope.brand ?? "All brands"} · ${scope.provider ? providers[scope.provider] : "All providers"} · ${scope.basis} time · ${scope.basis === "settlement" ? "settled" : (scope.status ?? "all statuses")}`;
}
function activityLink(
  result: Extract<CopilotEvidence, { kind: "activity" }>["result"],
) {
  const { scope, dataset } = result.metadata;
  return `/activity?${new URLSearchParams({
    from: scope.from,
    to: scope.to,
    ...(scope.brand ? { brand: scope.brand } : {}),
    ...(scope.provider ? { provider: scope.provider } : {}),
    ...(scope.status ? { status: scope.status } : {}),
    basis: scope.basis,
    datasetHash: dataset.sha256,
  })}`;
}
function EvidenceCard({ item }: { item: CopilotEvidence }) {
  if (item.kind === "document") {
    return (
      <article id={`copilot-${item.id}`} tabIndex={-1} className="copilot-card">
        <h4>
          {item.result.title} · {item.id}
        </h4>
        <p>
          {item.result.documentId} · Version {item.result.version}
        </p>
        <blockquote>{item.result.excerpt}</blockquote>
        <a href={`/${item.result.source}`}>Read source document</a>
      </article>
    );
  }
  const { metadata } = item.result;
  return (
    <article id={`copilot-${item.id}`} tabIndex={-1} className="copilot-card">
      <h4>
        {titles[item.kind]} · {item.id}
      </h4>
      {item.kind === "summary" ? (
        <p>
          GGR was <strong>{money(item.result.current.ggr)}</strong> from{" "}
          {money(item.result.current.stakes)} in stakes and{" "}
          {money(item.result.current.payouts)} in payouts.{" "}
          {item.result.current.players.toLocaleString("en-IE")} distinct players
          had settled transactions.
        </p>
      ) : null}
      {item.kind === "comparison" ? (
        <>
          <p>Previous period · {interval(item.result.comparison)}</p>
          {item.result.previous && item.result.ggrChange !== null ? (
            <p>
              GGR moved from {money(item.result.previous.ggr)} to{" "}
              {money(item.result.current.ggr)}. The change was{" "}
              <strong>{money(item.result.ggrChange)}</strong>.
              {item.result.ggrChangePercent === null
                ? " A percentage change is unavailable because the previous GGR was zero or negative."
                : ""}
            </p>
          ) : (
            <p>
              The previous period falls outside the dataset. Current GGR was{" "}
              {money(item.result.current.ggr)}.
            </p>
          )}
        </>
      ) : null}
      {item.kind === "contributions" ? (
        <>
          <p>Previous period · {interval(item.result.comparison)}</p>
          {item.result.comparison.unavailableReason ? (
            <p>The previous period falls outside the dataset.</p>
          ) : null}
          {item.result.providers.length ? (
            <ul>
              {[...item.result.providers]
                .sort(
                  (a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0),
                )
                .map((row) => (
                  <li key={row.provider}>
                    {providers[row.provider]} ·{" "}
                    {row.change === null
                      ? `Current GGR ${money(row.currentGgr)}`
                      : `GGR change ${money(row.change)}`}
                  </li>
                ))}
            </ul>
          ) : (
            <p>No provider activity in the available periods.</p>
          )}
          <p>
            These are observed contributions to GGR. The dataset contains no
            evidence about operational causes.
          </p>
        </>
      ) : null}
      {item.kind === "activity" ? (
        <a href={activityLink(item.result)}>View matching transactions</a>
      ) : null}
      <p className="muted">
        {scopeText({
          ...metadata.scope,
          status: metadata.scope.status ?? undefined,
        })}
      </p>
      <small>
        EUR · Dataset {metadata.dataset.sha256.slice(0, 12)} · As of{" "}
        {metadata.dataset.asOf} · Queried {item.queriedAt}
      </small>
    </article>
  );
}

async function readEvents(
  body: ReadableStream<Uint8Array>,
  receive: (event: ReturnType<typeof copilotEvent.parse>) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > 80_000) throw new Error("Invalid stream");
      buffer += decoder.decode(next.value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) throw new Error("Invalid stream");
        receive(copilotEvent.parse(JSON.parse(line.slice(6))));
      }
    }
    if (buffer || decoder.decode()) throw new Error("Incomplete stream");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type State =
  | "idle"
  | "submitting"
  | "searching"
  | "answering"
  | "cancelled"
  | "error"
  | "complete";
const statusText: Partial<Record<State, string>> = {
  submitting: "Sending question…",
  searching: "Checking evidence…",
  answering: "Preparing answer…",
  cancelled: "Stopped. You can retry this question.",
  complete: "Answer ready.",
};

export function Copilot({ dashboardScope }: { dashboardScope: CopilotScope }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const hasOpened = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const active = useRef<AbortController | null>(null);
  const [scope, setScope] = useState(dashboardScope);
  const [question, setQuestion] = useState("");
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    documents: boolean;
  }>();
  const [state, setState] = useState<State>("idle");
  const [evidence, setEvidence] = useState<CopilotEvidence[]>([]);
  const [answer, setAnswer] = useState<CopilotAnswer>();
  const [error, setError] = useState("");
  const { datasetHash: activeHash, ...activeFilters } = dashboardScope;
  const { datasetHash: pinnedHash, ...pinnedFilters } = scope;
  const changed =
    JSON.stringify(activeFilters) !== JSON.stringify(pinnedFilters) ||
    (!!activeHash && !!pinnedHash && activeHash !== pinnedHash);
  const running =
    state === "submitting" || state === "searching" || state === "answering";
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAvailability(undefined);
    void api
      .GET("/api/copilot", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setAvailability(data ?? { available: false, documents: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setAvailability({ available: false, documents: false });
      });
    return () => controller.abort();
  }, [open]);

  function stop() {
    if (!active.current) return;
    active.current.abort();
    active.current = null;
    setState("cancelled");
  }

  function applyScope() {
    stop();
    setScope(dashboardScope);
    setEvidence([]);
    setAnswer(undefined);
    setState("idle");
    input.current?.focus();
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !availability?.available || !question.trim()) return;
    const request = new AbortController();
    active.current = request;
    setEvidence([]);
    setAnswer(undefined);
    setState("submitting");
    const seen = new Set<string>();
    let datasetHash = scope.datasetHash;
    let terminal:
      | Extract<
          ReturnType<typeof copilotEvent.parse>,
          { type: "complete" | "error" }
        >
      | undefined;
    try {
      const { data, response } = await api.POST("/api/copilot", {
        body: { question, scope },
        parseAs: "stream",
        signal: request.signal,
      });
      if (active.current !== request) return;
      if (response.status === 503) {
        setError(
          "Live copilot is unavailable. You can continue investigating in the dashboard.",
        );
        setState("error");
        return;
      }
      if (
        !data ||
        !response.headers.get("content-type")?.startsWith("text/event-stream")
      ) {
        throw new Error(errors.failed);
      }
      await readEvents(data, (event) => {
        if (active.current !== request) return;
        if (terminal !== undefined) throw new Error(errors.failed);
        switch (event.type) {
          case "searching":
          case "answering":
            setState(event.type);
            break;
          case "evidence": {
            const item = event.evidence;
            if (seen.has(item.id)) throw new Error(errors.failed);
            if (item.kind !== "document") {
              const { metadata } = item.result;
              const provider =
                item.kind === "activity" && !scope.provider
                  ? metadata.scope.provider
                  : scope.provider;
              if (
                !matchesCopilotScope(
                  { ...scope, provider, datasetHash },
                  metadata,
                )
              )
                throw new Error(errors.dataset);
              datasetHash = metadata.dataset.sha256;
            }
            seen.add(item.id);
            setEvidence((items) => [...items, item]);
            break;
          }
          case "error":
            terminal = event;
            break;
          case "complete":
            if (
              typeof event.answer === "object" &&
              event.answer.references.some((id) => !seen.has(id))
            )
              throw new Error(errors.failed);
            terminal = event;
            break;
        }
      });
      if (active.current !== request) return;
      if (!terminal) throw new Error(errors.failed);
      if (terminal.type === "error") throw new Error(errors[terminal.code]);
      setAnswer(terminal.answer);
      setState("complete");
    } catch (failure) {
      if (active.current !== request) return;
      setError(
        failure instanceof Error &&
          Object.values(errors).includes(failure.message)
          ? failure.message
          : errors.failed,
      );
      setState("error");
    } finally {
      if (active.current === request) active.current = null;
    }
  }

  const cited = typeof answer === "object" ? answer.references : [];
  const sources = evidence.filter((item) => item.kind === "document");
  const figures = evidence.filter((item) => item.kind !== "document");
  const rank = (id: string) => {
    const index = cited.indexOf(id);
    return index === -1 ? cited.length : index;
  };
  const ordered = figures.sort((a, b) => rank(a.id) - rank(b.id));
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          // The first open adopts the dashboard's active filters.
          if (!hasOpened.current) setScope(dashboardScope);
          hasOpened.current = true;
          dialog.current?.showModal();
          setOpen(true);
          input.current?.focus();
        }}
      >
        Ask Copilot
      </button>
      <dialog
        ref={dialog}
        className="drawer copilot-drawer"
        aria-labelledby="copilot-title"
        onClose={() => {
          stop();
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <header className="copilot-heading">
          <div>
            <p className="eyebrow">OpsLens investigation</p>
            <h2 id="copilot-title">Copilot</h2>
          </div>
          <button
            type="button"
            className="ops-quiet"
            onClick={() => dialog.current?.close()}
          >
            Close copilot
          </button>
        </header>
        <div className="copilot-card">
          <strong>Confirmed scope</strong>
          <p>{scopeText(scope)}</p>
          {changed ? (
            <>
              <p>
                Dashboard scope changed. The current investigation still uses
                the confirmed filters above.
              </p>
              <button type="button" className="ops-quiet" onClick={applyScope}>
                Use current dashboard filters
              </button>
              <p>{scopeText(dashboardScope)}</p>
            </>
          ) : null}
        </div>
        {availability?.available === false ? (
          <p role="status">
            Live copilot is unavailable. Overview and Activity are available for
            manual investigation.
          </p>
        ) : null}
        {availability?.available && !availability.documents ? (
          <p className="muted">
            Document sources are unavailable in this session.
          </p>
        ) : null}
        <form onSubmit={ask} className="copilot-form">
          <label htmlFor="copilot-question">Question about this scope</label>
          <textarea
            ref={input}
            id="copilot-question"
            value={question}
            rows={3}
            maxLength={600}
            required
            readOnly={running}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="copilot-actions">
            {running ? (
              <button
                key="stop"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  stop();
                  input.current?.focus();
                }}
              >
                Stop answer
              </button>
            ) : (
              <button
                key="ask"
                type="submit"
                disabled={!availability?.available || !question.trim()}
              >
                {state === "error" || state === "cancelled"
                  ? "Retry question"
                  : "Ask question"}
              </button>
            )}
          </div>
        </form>
        {availability?.available && state === "idle" ? (
          <div className="copilot-actions">
            {(scope.basis === "settlement"
              ? [
                  "How did GGR change from the preceding period?",
                  "Which providers contributed most? Show matching transactions.",
                ]
              : ["Show matching transactions for this placement scope."]
            ).map((suggestion) => (
              <button
                type="button"
                className="ops-quiet"
                key={suggestion}
                onClick={() => {
                  setQuestion(suggestion);
                  input.current?.focus();
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <p role="status">{statusText[state]}</p>
        {state === "error" ? <p role="alert">{error}</p> : null}
        {answer ? (
          <section aria-label="Answer">
            <h3>Answer</h3>
            {typeof answer === "string" ? (
              <p>{limits[answer]}</p>
            ) : (
              <ul>
                {answer.references.map((id) => {
                  const item = evidence.find(
                    (candidate) => candidate.id === id,
                  );
                  return (
                    <li key={id}>
                      <a href={`#copilot-${id}`}>
                        {item?.kind === "document"
                          ? item.result.title
                          : item && titles[item.kind]}{" "}
                        · {id}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
        {ordered.length ? (
          <section aria-label="Verified evidence">
            <h3>Verified evidence</h3>
            {!answer ? (
              <p>Checks completed so far. The answer is incomplete.</p>
            ) : null}
            {ordered.map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </section>
        ) : null}
        {sources.length ? (
          <section aria-label="Sources">
            <h3>Sources</h3>
            {sources.map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </section>
        ) : null}
      </dialog>
    </>
  );
}
