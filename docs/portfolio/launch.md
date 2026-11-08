# Portfolio launch checklist

The package is ready for review in the private repository. The app and Storybook have verified local entry points. GitHub reported zero deployments when PLAN-14 began.

| Pending decision | What it enables |
| --- | --- |
| Intended audience and access | Decide who should be able to view the recording, repository, Storybook and interactive demo. |
| Hosting account and budget | Select the account, cost ceiling and host for the Node app, seeded PostgreSQL database and static Storybook. The current same-origin Node runtime has local evidence. [Runtime decision](../runtime.md#decision) |
| Repository publication | Decide whether the GitHub repository stays private with invited reviewers or becomes public. Confirm asset and dependency notices and run a pre-publication history scan before changing visibility. |
| Source license | The owner needs to choose the redistribution terms before publishing the source. The package does not include a source license. |

For a hosted recorded-mode launch, seed the exact 100,000-row snapshot and configure only the restricted database connection on the server. Keep live model options off and live document evidence disabled. Repeat the recorded investigation against the real HTTPS origin, including reload of the scoped Activity URL, the no-key Copilot state and its evidence link, and safe API failures. Verify the Storybook preview and component guide at their published origin before adding hosted links to the README. [Release verification](../release-verification.md) · [Local runtime setup](../runtime.md#fresh-checkout)

Manual desktop keyboard and screen-reader review remains open. Live analytics and hosted retrieval have separate evaluation and human review gates. [Copilot release gates](../../evals/copilot/README.md) · [Retrieval review](../../evals/retrieval/README.md)
