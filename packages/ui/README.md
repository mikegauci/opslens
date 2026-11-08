# OpsLens UI

A private, source-distributed React workspace package. Overview and Activity share `Panel`, `FilterBar`, `StatusBadge` and `AsyncState`. Overview uses `MetricCard` for formatted reporting values. The Support inbox composition uses the same public exports with local sample data.

## Use in another workspace app

1. Add `"@opslens/ui": "workspace:*"` to the app's dependencies and use React 19.3.1, the package peer. The app's bundler needs to compile TypeScript/JSX and resolve CSS exports, as the workspace Vite app does.
2. Run `pnpm install` from the workspace root and commit the lockfile update.
3. Import the theme once and apply its scope class. Keep data fetching, business rules and value formatting in the consuming app.

```tsx
import "@opslens/ui/theme.css";
import { AsyncState, MetricCard, Panel } from "@opslens/ui";

export function InboxSummary({ loading, open }: { loading: boolean; open: number }) {
  return (
    <div className="opslens-theme">
      <Panel title="Inbox summary">
        <div role="status">
          {loading ? <AsyncState variant="loading">Loading requests…</AsyncState> : null}
        </div>
        {loading ? null : <MetricCard title="Open" value={open} detail="Across all queues" />}
      </Panel>
    </div>
  );
}
```

## Update and verify

Run `pnpm --filter @opslens/ui storybook` and open [Storybook on port 6006](http://127.0.0.1:6006). The **Using OpsLens UI** guide covers tokens, component contracts, state announcements and keyboard steps. The preview loads the shared theme independently of the application.

Make component and token changes in this package, update the affected stories and run `pnpm check:storybook` for the static build and browser checks. Run the consuming app's checks too, including the Overview-to-Activity journey for this repository. Review public prop or token changes against both screens and the sample composition in the same PR.

Workspace consumers pick up source changes on checkout. To distribute to a separate repository, first establish a versioned package and compile JavaScript and declaration exports with the CSS asset included. The current package has no registry release.
