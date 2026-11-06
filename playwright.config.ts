import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000/foundation",
    reuseExistingServer: false,
  },
});
