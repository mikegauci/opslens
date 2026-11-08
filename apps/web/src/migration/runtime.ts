import { api } from "@opslens/contracts";

export const checkingDatabase = "Checking database…";

export async function checkDatabase(signal: AbortSignal) {
  try {
    const { data } = await api.GET("/api/health", {
      signal,
      cache: "no-store",
    });
    return data?.database === "connected" && data.result === 1
      ? "PostgreSQL connected · SELECT 1 = 1"
      : "Database unavailable";
  } catch {
    return "API unavailable";
  }
}

export function focusRuntimeBookmark() {
  if (location.hash === "#runtime-checks")
    document.getElementById("runtime-checks")?.focus();
}
