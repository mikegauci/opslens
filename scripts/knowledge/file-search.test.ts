import { createOpenAI } from "@ai-sdk/openai";
import { expect, test, vi } from "vitest";
import { hostedAttributes, loadCorpus, type Manifest } from "./corpus.js";
import { score } from "./evaluate.js";
import { ingestCorpus } from "./ingest.js";
import { retrieve } from "./retrieve.js";

const corpus = await loadCorpus();
const document = corpus.documents.find(
  ({ metadata }) => metadata.id === "MET-GGR",
);
if (!document) throw new Error("Missing MET-GGR fixture document");
const attributes = hostedAttributes(document.metadata, corpus.digest);
const fileId = "file-ggr";
const filename = "ggr.md";
const storeId = "vs_opslens";
const manifest: Manifest = {
  corpus: corpus.digest,
  storeId,
  files: [{ ...document.metadata, fileId }],
};

function responsesFixture(citationFileId: string) {
  return {
    id: "resp_test",
    model: "mock-responses-model",
    created_at: 1,
    output: [
      {
        type: "file_search_call",
        id: "fs_test",
        status: "completed",
        queries: ["calculate GGR"],
        results: [
          {
            attributes,
            file_id: fileId,
            filename,
            score: 0.91,
            text: "Subtract settled payouts from settled stakes.",
          },
        ],
      },
      {
        type: "message",
        id: "msg_test",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: "GGR is settled stakes minus settled payouts.",
            annotations: [
              {
                type: "file_citation",
                index: 42,
                file_id: citationFileId,
                filename,
              },
            ],
          },
        ],
      },
    ],
    usage: {
      input_tokens: 40,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 20,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 60,
    },
  };
}

test("installed Responses provider exposes independent search results and citation annotations", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    expect(JSON.parse(String(init?.body))).toMatchObject({
      include: ["file_search_call.results"],
      store: false,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [storeId],
          max_num_results: 5,
          filters: {
            type: "and",
            filters: [
              { type: "eq", key: "corpus", value: corpus.digest },
              { type: "eq", key: "scope", value: "metrics" },
              { type: "eq", key: "status", value: "current" },
            ],
          },
        },
      ],
    });
    return Response.json(responsesFixture(fileId));
  });
  const provider = createOpenAI({ apiKey: "fixture", fetch: fetcher });
  const evidence = await retrieve(provider, "mock", manifest, "What is GGR?", {
    scope: "metrics",
    historical: false,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(evidence.results).toMatchObject([
    {
      id: "MET-GGR",
      score: 0.91,
      excerpt: "Subtract settled payouts from settled stakes.",
    },
  ]);
  expect(evidence.citations).toMatchObject([
    { id: "MET-GGR", version: 1, index: 42, source: document.metadata.source },
  ]);
  const scored = score(
    { relevant: ["MET-GGR@1", "MET-STAKES@1"], required: ["MET-GGR@1"] },
    evidence,
  );
  expect(scored).toMatchObject({
    precision: 1,
    recall: 0.5,
    citationPrecision: 1,
    missingRequiredCitations: [],
  });
  expect(score({ relevant: [], required: [] }, evidence)).toMatchObject({
    precision: 0,
    recall: null,
    citationPrecision: 0,
  });
});

test("rejects a citation for a file that was never retrieved", async () => {
  const provider = createOpenAI({
    apiKey: "fixture",
    fetch: async () => Response.json(responsesFixture("file-unseen")),
  });
  await expect(
    retrieve(provider, "mock", manifest, "What is GGR?", {
      scope: null,
      historical: false,
    }),
  ).rejects.toThrow("File citation did not match retrieved evidence");
});

test("recovers an interrupted upload, polls indexing and makes reruns read-only", async () => {
  const oneDocument = { ...corpus, documents: [document] };
  let upload: { id: string; filename: string } | undefined;
  let indexed = false;
  let postCount = 0;
  const completed = { id: fileId, attributes, status: "completed" };
  const fetcher: typeof fetch = async (input, init) => {
    const { pathname } = new URL(String(input));
    const attachments = `/v1/vector_stores/${storeId}/files`;
    if (init?.method === "POST") {
      postCount++;
      if (pathname === "/v1/files" && init.body instanceof FormData) {
        const file = init.body.get("file");
        expect(file).toBeInstanceOf(File);
        if (!(file instanceof File)) throw new Error("Missing upload");
        expect(await file.text()).toContain("ID: MET-GGR");
        upload = { id: fileId, filename: file.name };
        return Response.json(upload);
      }
      expect(pathname).toBe(attachments);
      expect(JSON.parse(String(init.body))).toEqual({
        file_id: fileId,
        attributes,
      });
      if (postCount === 2) return new Response(null, { status: 503 });
      return Response.json({ ...completed, status: "in_progress" });
    }
    if (pathname === `${attachments}/${fileId}`) {
      indexed = true;
      return Response.json(completed);
    }
    expect(["/v1/files", attachments]).toContain(pathname);
    const data =
      pathname === "/v1/files"
        ? upload
          ? [upload]
          : []
        : indexed
          ? [completed]
          : [];
    return Response.json({ data, has_more: false });
  };
  const wait = async () => {};
  await expect(
    ingestCorpus(oneDocument, storeId, "fixture", fetcher, wait),
  ).rejects.toThrow("HTTP 503");
  expect(
    await ingestCorpus(oneDocument, storeId, "fixture", fetcher, wait),
  ).toEqual(manifest);
  expect(
    await ingestCorpus(oneDocument, storeId, "fixture", fetcher, wait),
  ).toEqual(manifest);
  expect(postCount).toBe(3);
});

test("rejects duplicate or modified hosted versions before writing anything", async () => {
  const existing = { id: fileId, attributes, status: "completed" };
  for (const data of [
    [existing, { ...existing, id: "file-duplicate" }],
    [{ ...existing, attributes: { ...attributes, sha256: "different" } }],
  ]) {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ data, has_more: false }),
    );
    await expect(
      ingestCorpus(corpus, storeId, "fixture", fetcher),
    ).rejects.toThrow("foreign, changed or duplicate");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  }
});
