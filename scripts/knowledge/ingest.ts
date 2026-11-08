import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import {
  type Corpus,
  fileIdSchema,
  hostedAttributes,
  manifestPath,
  matchesAttributes,
  privateDirectory,
  storeIdSchema,
  versionKey,
} from "./corpus.js";

const hostedFile = z.object({
  id: fileIdSchema,
  attributes: z.record(z.string(), z.unknown()),
  status: z.enum(["in_progress", "completed", "cancelled", "failed"]),
});
const uploadedFile = z.object({ id: fileIdSchema, filename: z.string() });

export async function ingestCorpus(
  corpus: Corpus,
  storeId: string,
  apiKey: string,
  fetcher = fetch,
  wait = () => sleep(1000),
) {
  async function request<T>(
    schema: z.ZodType<T>,
    path: string,
    body?: FormData | Record<string, unknown>,
  ) {
    const headers = new Headers({ Authorization: `Bearer ${apiKey}` });
    if (body && !(body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const response = await fetcher(`https://api.openai.com/v1${path}`, {
      method: body ? "POST" : "GET",
      headers,
      body: body instanceof FormData ? body : body && JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `OpenAI ${body ? "POST" : "GET"} ${path.split("?")[0]} returned HTTP ${response.status}`,
      );
    }
    return schema.parse(await response.json());
  }

  async function list<T extends { id: string }>(
    schema: z.ZodType<T>,
    path: string,
  ) {
    const pageSchema = z.object({
      data: z.array(schema),
      has_more: z.boolean(),
    });
    const entries: T[] = [];
    let after = "";
    while (true) {
      const page = await request(pageSchema, `${path}${after}`);
      entries.push(...page.data);
      if (!page.has_more) return entries;
      const last = page.data.at(-1);
      const next = last && `&after=${encodeURIComponent(last.id)}`;
      if (!next || next === after)
        throw new Error("Invalid OpenAI file pagination cursor");
      after = next;
    }
  }

  const attachments = `/vector_stores/${storeId}/files`;
  const existing = await list(hostedFile, `${attachments}?limit=100`);
  const expected = new Map(
    corpus.documents.map(({ metadata }) => [
      versionKey(metadata),
      hostedAttributes(metadata, corpus.digest),
    ]),
  );
  const attached = new Map<string, z.infer<typeof hostedFile>>();
  for (const file of existing) {
    const key = `${file.attributes.doc_id}@${file.attributes.version}`;
    const attributes = expected.get(key);
    if (
      !attributes ||
      !matchesAttributes(file.attributes, attributes) ||
      attached.has(key)
    ) {
      throw new Error(
        `Store contains a foreign, changed or duplicate version (${key}). Use a dedicated store for this corpus or resolve the attachment conflict.`,
      );
    }
    attached.set(key, file);
  }

  const uploads =
    existing.length < expected.size
      ? await list(uploadedFile, "/files?purpose=assistants&limit=100")
      : [];
  const files = [];
  for (const { metadata, bytes } of corpus.documents) {
    const key = versionKey(metadata);
    const attributes = hostedAttributes(metadata, corpus.digest);
    let file = attached.get(key);
    if (!file) {
      const filename = `opslens-${storeId}-${key.replace("@", "-v")}-${metadata.sha256}.md`;
      const matching = uploads.filter((upload) => upload.filename === filename);
      if (matching.length > 1)
        throw new Error(
          `Multiple pending uploads for ${key}. Resolve duplicates before retrying.`,
        );
      let upload = matching[0];
      if (!upload) {
        const form = new FormData();
        form.set("purpose", "assistants");
        form.set(
          "file",
          new Blob([new Uint8Array(bytes)], { type: "text/markdown" }),
          filename,
        );
        upload = await request(uploadedFile, "/files", form);
      }
      file = await request(hostedFile, attachments, {
        file_id: upload.id,
        attributes,
      });
      if (file.id !== upload.id)
        throw new Error(`Wrong hosted file attached for ${key}`);
    }

    const fileId = file.id;
    const deadline = Date.now() + 120_000;
    while (file.status === "in_progress" && Date.now() < deadline) {
      await wait();
      file = await request(hostedFile, `${attachments}/${fileId}`);
    }
    if (
      file.id !== fileId ||
      file.status !== "completed" ||
      !matchesAttributes(file.attributes, attributes)
    ) {
      throw new Error(
        `File ${key} did not complete indexing with its expected metadata (${file.status})`,
      );
    }
    files.push({ ...metadata, fileId });
  }
  return { corpus: corpus.digest, storeId, files };
}

export async function ingestCommand(corpus: Corpus) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey)
    throw new Error(
      "Hosted ingestion unavailable. Set server-side OPENAI_API_KEY.",
    );
  const storeId = storeIdSchema.parse(process.env.OPENAI_VECTOR_STORE_ID);
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  const lockPath = `${manifestPath}.lock`;
  const pendingPath = `${manifestPath}.pending`;
  const lock = await open(lockPath, "wx", 0o600);
  try {
    const manifest = await ingestCorpus(corpus, storeId, apiKey);
    await writeFile(pendingPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(pendingPath, manifestPath);
    console.log(
      `Verified ${manifest.files.length} indexed documents. Manifest saved at ${manifestPath}`,
    );
  } finally {
    await lock.close();
    await rm(pendingPath, { force: true });
    await rm(lockPath);
  }
}
