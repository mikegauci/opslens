import { api } from "@opslens/contracts";
import { PageShell } from "@opslens/ui";
import { useEffect, useState } from "react";
import "./style.css";

function RuntimeChecks() {
  const [database, setDatabase] = useState("Checking database…");
  const [stream, setStream] = useState("Connecting stream…");
  useEffect(() => {
    const controller = new AbortController();
    setDatabase("Checking database…");
    setStream("Connecting stream…");
    void api
      .GET("/api/health", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setDatabase(
            data?.database === "connected" &&
              data.result === 1 &&
              data.synthetic === true
              ? "PostgreSQL connected · SELECT 1 = 1"
              : "Database unavailable",
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setDatabase("API unavailable");
      });
    const source = new EventSource("/api/stream");
    source.addEventListener("ready", () => setStream("Runtime connected"));
    source.addEventListener("complete", () => {
      setStream("Stream complete");
      source.close();
    });
    source.onerror = () => {
      setStream("Stream unavailable");
      source.close();
    };
    return () => {
      controller.abort();
      source.close();
    };
  }, []);
  return (
    <dl aria-live="polite">
      <dt>API & database</dt>
      <dd>{database}</dd>
      <dt>Server stream</dt>
      <dd>{stream}</dd>
    </dl>
  );
}

export function Foundation() {
  const [attempt, setAttempt] = useState(0);
  return (
    <PageShell>
      <p className="eyebrow">OpsLens / Foundation</p>
      <h1>A connected foundation.</h1>
      <p className="intro">
        The first step toward a clear, evidence-backed operations investigation.
      </p>
      <section aria-labelledby="runtime-title">
        <h2 id="runtime-title">Runtime checks</h2>
        <RuntimeChecks key={attempt} />
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry checks
        </button>
      </section>
      <p className="note">
        Synthetic-data portfolio project · UTC reporting · EUR
      </p>
      <p className="note">
        Diagnostic stream only. Dataset, dashboards and AI arrive in later
        milestones.
      </p>
    </PageShell>
  );
}
