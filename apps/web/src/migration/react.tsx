import "@opslens/ui/theme.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  checkDatabase,
  checkingDatabase,
  focusRuntimeBookmark,
} from "./runtime";
import "./runtime.css";

function RuntimeStatus() {
  const [status, setStatus] = useState(checkingDatabase);
  const activeCheck = useRef<AbortController>(null);
  const runCheck = useCallback(() => {
    activeCheck.current?.abort();
    const controller = new AbortController();
    activeCheck.current = controller;
    setStatus(checkingDatabase);
    void checkDatabase(controller.signal).then((result) => {
      if (!controller.signal.aborted) setStatus(result);
    });
  }, []);

  useEffect(() => {
    focusRuntimeBookmark();
    runCheck();
    return () => activeCheck.current?.abort();
  }, [runCheck]);

  return (
    <main className="migration-runtime">
      <a href="/">Back to Overview</a>
      <h1>Runtime status</h1>
      <p>Migration exercise using the OpsLens synthetic-data environment.</p>
      <section aria-labelledby="runtime-checks">
        <h2 id="runtime-checks" tabIndex={-1}>
          Database check
        </h2>
        <p role="status">{status}</p>
        <button type="button" onClick={runCheck}>
          Retry check
        </button>
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(<RuntimeStatus />);
