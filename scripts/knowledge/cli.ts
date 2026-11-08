import { loadCorpus } from "./corpus.js";
import { evaluate, loadCases } from "./evaluate.js";
import { ingestCommand } from "./ingest.js";

try {
  const [, , command, caseId, ...extra] = process.argv;
  if (extra.length || (caseId && command !== "eval"))
    throw new Error("Invalid knowledge command arguments");
  const corpus = await loadCorpus();
  switch (command) {
    case "check": {
      const suite = await loadCases(corpus);
      console.log(
        `Validated ${corpus.documents.length} documents and ${suite.cases.length} retrieval cases. Corpus SHA-256: ${corpus.digest}`,
      );
      break;
    }
    case "ingest":
      await ingestCommand(corpus);
      break;
    case "eval":
      await evaluate(corpus, caseId);
      break;
    default:
      throw new Error(
        "Use knowledge:check, knowledge:ingest or knowledge:eval",
      );
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Knowledge command failed",
  );
  process.exitCode = 1;
}
