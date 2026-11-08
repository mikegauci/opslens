import { createApp } from "../../apps/api/src/app";
import type { CopilotProvider } from "../../apps/api/src/copilot";
import {
  type CopilotEvent,
  type CopilotScope,
  copilotEvent,
} from "../../packages/analytics/src/copilot";
import type { AnalyticsService } from "../../packages/analytics/src/service";

export async function evaluateRequest(
  analytics: AnalyticsService,
  backend: CopilotProvider,
  question: string,
  scope: CopilotScope,
) {
  const app = createApp(async () => 1, analytics, backend);
  const start = performance.now();
  const response = await app.request("/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, question }),
  });
  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    .getReader();
  const events: CopilotEvent[] = [];
  let firstEventMs: number | null = null;
  let firstEvidenceOrAnswerMs: number | null = null;
  if (response.ok && reader) {
    let buffer = "";
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame.startsWith("data: "))
          throw new Error("Invalid evaluation event frame");
        const event = copilotEvent.parse(JSON.parse(frame.slice(6)));
        firstEventMs ??= Math.round(performance.now() - start);
        if (event.type === "evidence" || event.type === "complete")
          firstEvidenceOrAnswerMs ??= Math.round(performance.now() - start);
        events.push(event);
      }
    }
    if (buffer) throw new Error("Incomplete evaluation event frame");
  }
  return {
    status: response.status,
    firstEventMs,
    firstEvidenceOrAnswerMs,
    totalMs: Math.round(performance.now() - start),
    events,
  };
}
