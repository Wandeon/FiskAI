// Test setup for vitest with jsdom environment
// This file is run before each test file

import { beforeEach } from "vitest"

// Reset any global state before each test
beforeEach(() => {
  // Clear localStorage to reset persisted Zustand stores
  if (typeof localStorage !== "undefined") {
    localStorage.clear()
  }
})
