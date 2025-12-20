import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/marketing-audit",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.MARKETING_AUDIT_TARGET_URL ?? "https://fiskai.hr",
    trace: "retain-on-failure",
  },
})
