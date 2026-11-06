import { writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import { createApp } from "../apps/api/src/app";

const response = await createApp(async () => 1).request("/api/openapi.json");
const schema = await response.json();
await writeFile(
  "packages/contracts/openapi.json",
  `${JSON.stringify(schema, null, 2)}\n`,
);
await writeFile(
  "packages/contracts/src/schema.d.ts",
  astToString(await openapiTS(schema)),
);
