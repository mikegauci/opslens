import type { ReactNode } from "react";
/** Foundation shell only. Extract domain components after concrete reuse. */
export function PageShell({ children }: { children: ReactNode }) {
  return <main className="page-shell">{children}</main>;
}
