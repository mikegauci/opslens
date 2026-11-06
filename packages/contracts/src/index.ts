import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema";
export const createApiClient = (options?: ClientOptions) =>
  createClient<paths>(options);
export const api = createApiClient();
export type { paths } from "./schema";
