import type { ComponentProps, ReactNode, Ref } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="page-shell">{children}</main>;
}

type PanelProps = {
  title: string;
  actions?: ReactNode;
  busy?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  headingLevel?: 1 | 2;
  children: ReactNode;
};

/** A named region for related content. Actions follow the heading in tab order. */
export function Panel({
  title,
  actions,
  busy,
  headingRef,
  headingLevel = 2,
  children,
}: PanelProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className="ops-panel" aria-label={title} aria-busy={busy}>
      <div className="ops-panel-heading">
        <Heading ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {title}
        </Heading>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** A native form for labelled filter fields, submit and reset controls. */
export function FilterBar({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      {...props}
      className={className ? `ops-filter-bar ${className}` : "ops-filter-bar"}
    />
  );
}

/** A compact text label. Supply meaningful text for the status or context. */
export function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="ops-badge">{children}</span>;
}

type AsyncStateProps = {
  variant: "loading" | "empty" | "notice" | "error";
  children: ReactNode;
};

/** Inline feedback. Put routine updates in a persistent status region. */
export function AsyncState({ variant, children }: AsyncStateProps) {
  return (
    <p
      className="ops-state"
      data-variant={variant}
      role={variant === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}

type MetricCardProps = {
  title: string;
  value: ReactNode;
  detail: ReactNode;
  variant?: "default" | "featured";
};

/** Present a preformatted value and its comparison or context. */
export function MetricCard({
  title,
  value,
  detail,
  variant = "default",
}: MetricCardProps) {
  return (
    <article className="ops-metric" data-variant={variant} aria-label={title}>
      <h3>{title}</h3>
      <p className="ops-metric-value">{value}</p>
      <p className="ops-metric-detail">{detail}</p>
    </article>
  );
}
