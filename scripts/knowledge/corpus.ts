import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const privateDirectory = fileURLToPath(
  new URL("../../evals/runs/private/", import.meta.url),
);
export const manifestPath = `${privateDirectory}knowledge-manifest.json`;
export const storeIdSchema = z.string().regex(/^vs_[a-zA-Z0-9]+$/);
export const fileIdSchema = z.string().regex(/^file[-_][a-zA-Z0-9]+$/);
export const scopeSchema = z.enum(["metrics", "data", "runbooks"]);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);

const documentSchema = z.object({
  id: z.string().regex(/^[A-Z]+-[A-Z]+$/),
  version: z.number().int().positive(),
  title: z.string().min(1),
  effective: z.iso.date(),
  scope: scopeSchema,
  status: z.enum(["current", "historical"]),
  source: z.string(),
  sha256: digestSchema,
});
type Document = z.infer<typeof documentSchema>;
const manifestSchema = z.object({
  corpus: digestSchema,
  storeId: storeIdSchema,
  files: z.array(documentSchema.extend({ fileId: fileIdSchema })),
});

export type Corpus = Awaited<ReturnType<typeof loadCorpus>>;
export type Manifest = z.infer<typeof manifestSchema>;

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function versionKey(document: Pick<Document, "id" | "version">) {
  return `${document.id}@${document.version}`;
}

export async function loadCorpus() {
  const directory = new URL("../../knowledge/documents/", import.meta.url);
  const names = (await readdir(directory)).sort();
  const documents = await Promise.all(
    names.map(async (name) => {
      const bytes = await readFile(new URL(name, directory));
      const header = bytes
        .toString("utf8")
        .match(
          /^# ([^\n]+)\n\nID: (\S+)\nVersion: ([1-9]\d*)\nEffective: (\S+)\nScope: (\S+)\nStatus: (\S+)\nSource: (\S+)\n\n\S/,
        );
      if (!header) throw new Error(`Invalid document header in ${name}`);
      const [, title, id, version, effective, scope, status, source] = header;
      const metadata = documentSchema.parse({
        id,
        version: Number(version),
        title,
        effective,
        scope,
        status,
        source,
        sha256: sha256(bytes),
      });
      if (
        name !== `${id.toLowerCase()}-v${version}.md` ||
        source !== `knowledge/documents/${name}`
      ) {
        throw new Error(`Document identity does not match its path in ${name}`);
      }
      return { bytes, metadata };
    }),
  );
  const versions = new Set<string>();
  const current = new Set<string>();
  for (const { metadata } of documents) {
    const key = versionKey(metadata);
    if (versions.has(key)) throw new Error(`Duplicate version ${key}`);
    versions.add(key);
    if (metadata.status === "current") {
      if (current.has(metadata.id))
        throw new Error(`Multiple current versions of ${metadata.id}`);
      current.add(metadata.id);
    }
  }
  for (const { metadata } of documents) {
    if (!current.has(metadata.id))
      throw new Error(`Missing current version of ${metadata.id}`);
  }
  if (documents.length === 0) throw new Error("The corpus is empty");
  const digest = sha256(
    JSON.stringify(documents.map(({ metadata }) => metadata)),
  );
  return { documents, digest };
}

export function hostedAttributes(document: Document, corpus: string) {
  return {
    doc_id: document.id,
    version: document.version,
    effective: document.effective,
    scope: document.scope,
    status: document.status,
    sha256: document.sha256,
    corpus,
  };
}

export function matchesAttributes(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
) {
  return Object.entries(expected).every(
    ([key, value]) => actual[key] === value,
  );
}

export async function readManifest(corpus: Corpus): Promise<Manifest> {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  const local = new Map(
    corpus.documents.map(({ metadata }) => [versionKey(metadata), metadata]),
  );
  if (
    manifest.corpus !== corpus.digest ||
    manifest.files.length !== local.size ||
    new Set(manifest.files.map((file) => versionKey(file))).size !==
      local.size ||
    new Set(manifest.files.map(({ fileId }) => fileId)).size !== local.size
  ) {
    throw new Error(
      "Hosted manifest does not match this corpus. Run knowledge:ingest first.",
    );
  }
  return {
    ...manifest,
    files: manifest.files.map((file) => {
      const metadata = local.get(versionKey(file));
      if (!metadata || !matchesAttributes(file, metadata)) {
        throw new Error(`Stale hosted manifest entry ${versionKey(file)}`);
      }
      return { ...metadata, fileId: file.fileId };
    }),
  };
}
