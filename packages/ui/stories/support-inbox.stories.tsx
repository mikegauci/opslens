import {
  AsyncState,
  FilterBar,
  MetricCard,
  Panel,
  StatusBadge,
} from "@opslens/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const queues = [
  { id: "all", label: "All queues", open: 12, unassigned: 4 },
  { id: "billing", label: "Billing", open: 5, unassigned: 2 },
  { id: "archive", label: "Archive", open: 0, unassigned: 0 },
];

function SupportInbox({
  initialState,
}: {
  initialState: "ready" | "loading" | "error";
}) {
  const [state, setState] = useState(initialState);
  const [queue, setQueue] = useState("all");
  const counts = queues.find(({ id }) => id === queue) ?? queues[0];
  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <p>
        <StatusBadge>Sample data</StatusBadge>
      </p>
      <h1>Support inbox</h1>
      <p>Review open requests before the next shift.</p>
      <FilterBar
        aria-label="Inbox filters"
        onSubmit={(event) => {
          event.preventDefault();
          setQueue(String(new FormData(event.currentTarget).get("queue")));
        }}
        style={{ marginBottom: 16 }}
      >
        <label>
          Queue
          <select name="queue" defaultValue="all">
            {queues.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply queue</button>
      </FilterBar>
      <Panel
        title="Shift handoff"
        actions={
          <button
            type="button"
            disabled={state === "loading"}
            onClick={() => setState("ready")}
          >
            {state === "error" ? "Retry counts" : "Refresh counts"}
          </button>
        }
      >
        <div role="status">
          {state === "loading" ? (
            <AsyncState variant="loading">Loading queue counts…</AsyncState>
          ) : state === "ready" && counts.open === 0 ? (
            <AsyncState variant="empty">
              No open requests. Choose another queue.
            </AsyncState>
          ) : state === "ready" ? (
            <p>{counts.open} open requests</p>
          ) : null}
        </div>
        {state === "error" ? (
          <AsyncState variant="error">
            Queue counts could not be loaded.
          </AsyncState>
        ) : null}
        {state === "ready" && counts.open > 0 ? (
          <div style={{ display: "grid", gap: "var(--ops-gap)" }}>
            <MetricCard
              title="Needs assignment"
              value={counts.unassigned}
              detail="Pick an owner before handoff"
              variant="featured"
            />
            <MetricCard
              title="Assigned"
              value={counts.open - counts.unassigned}
              detail="Has an owner"
            />
          </div>
        ) : null}
      </Panel>
    </main>
  );
}

const meta = {
  title: "Compositions/Support inbox",
  component: SupportInbox,
  args: { initialState: "ready" },
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof SupportInbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const QueueReview: Story = {};
export const Loading: Story = { args: { initialState: "loading" } };
export const RetryWithKeyboard: Story = { args: { initialState: "error" } };
