import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/storybook",
  use: {
    baseURL: "http://127.0.0.1:6006",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  webServer: {
    command: "pnpm --filter @opslens/ui storybook:preview",
    url: "http://127.0.0.1:6006",
  },
});
