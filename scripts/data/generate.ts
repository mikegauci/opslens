import { mkdir, readFile, writeFile } from "node:fs/promises";
import { artifact } from "./dataset";

const exports = [artifact(10_000), artifact(100_000)];
const manifest = `${JSON.stringify(
  exports.map((item) => item.manifest),
  null,
  2,
)}\n`;
if (process.argv.includes("--check")) {
  if ((await readFile("data/manifest.json", "utf8")) !== manifest)
    throw new Error(
      "Dataset manifest drift; review generator changes and regenerate",
    );
} else {
  await mkdir("data/generated", { recursive: true });
  for (const item of exports) {
    await writeFile(`data/generated/${item.manifest.file}`, item.content);
    await writeFile(
      `data/generated/${item.manifest.file}.manifest.json`,
      `${JSON.stringify(item.manifest, null, 2)}\n`,
    );
  }
  await writeFile("data/manifest.json", manifest);
}
console.log(
  exports
    .map((item) => `${item.manifest.rowCount}: ${item.manifest.sha256}`)
    .join("\n"),
);
