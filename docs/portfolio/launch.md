# Portfolio launch

OpsLens launched from merged PLAN-15 at `0230e72a68ee01b3c70c1bb61a69500066de060c`, with [passing CI](https://github.com/mikegauci/opslens/actions/runs/42505746925). This is a follow-up to [PLAN-14 / #14](https://github.com/mikegauci/opslens/issues/14).

| Surface | Host | Verification |
| --- | --- | --- |
| [App and API](https://opslens-3xy1.onrender.com/) | Render Free, Frankfurt | Public HTTPS health and database check; Overview to Nova Activity; scoped reload, sorting and details; no-key Copilot and its snapshot-pinned evidence link. Invalid analytics queries returned JSON 400, unknown API routes returned JSON 404, and both live Copilot capability flags were false. |
| PostgreSQL | Supabase Free, Ireland | Applied both repository migrations, preserving their checksums. The database rebuilt the CSV digest from 100,000 stored rows and matched `375fd02420246a314917cfb985e2f5ca445cc3ac1595438a173fb3dabd3ea7a1`. Verified TLS, runtime SELECT, absence of analytics writes, RLS and no private-schema access for Data API roles. The only security advisor finding was informational: the private quota table deliberately has no direct access policy. |
| [Storybook](https://opslens-storybook.vercel.app/) | Vercel Hobby | Public Chrome checks covered keyboard retry and empty state, narrow loading state and the [component guide](https://opslens-storybook.vercel.app/?path=/docs/guide-using-opslens-ui--docs). |

Render runs the Vite frontend and Hono API on one origin. It uses only the restricted database login and a verified TLS session pooler connection. Render auto-deploy is off; trigger a reviewed deployment after runtime changes. The demo can take a moment to wake up on the Free plan.

## Publication review

- Mirrored the advertised GitHub refs, including pull-request refs, and scanned their history with Gitleaks 8.30.1 and archive inspection. No findings. Reviewed the retained browser-failure trace for credential signatures; it covers the synthetic test environment. The tracked environment example contains local development values.
- The portfolio screenshots and walkthrough are captures of the synthetic demo. The BI comparison depicts [Apache Superset](https://github.com/apache/superset), which is licensed separately under Apache 2.0. The Superset archive contains configuration and SQL over fictional data; its connection is a credential-free localhost placeholder.
- The [MIT License](../../LICENSE) covers OpsLens source. Dependencies are installed from the lockfiles and retain their upstream licenses. Use `pnpm -r licenses list --prod` to inspect the runtime dependency inventory. The static Storybook includes [Storybook](https://github.com/storybookjs/storybook) and its [Nunito Sans](https://github.com/googlefonts/NunitoSans) font assets under their upstream terms.

Manual desktop keyboard and screen-reader review remains open. Live analytics and hosted retrieval have separate evaluation and human review gates. [Copilot release gates](../../evals/copilot/README.md) · [Retrieval review](../../evals/retrieval/README.md)
