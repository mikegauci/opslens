import "@opslens/ui/theme.css";
import {
  checkDatabase,
  checkingDatabase,
  focusRuntimeBookmark,
} from "./runtime";
import "./runtime.css";

const status = document.querySelector('[role="status"]');
const retry = document.querySelector("button");
if (!status || !retry) throw new Error("Missing runtime check controls");

let activeCheck: AbortController | undefined;
function runCheck(status: Element) {
  activeCheck?.abort();
  const controller = new AbortController();
  activeCheck = controller;
  status.textContent = checkingDatabase;
  void checkDatabase(controller.signal).then((result) => {
    if (!controller.signal.aborted) status.textContent = result;
  });
}

focusRuntimeBookmark();
retry.addEventListener("click", () => runCheck(status));
runCheck(status);
