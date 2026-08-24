import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// vitest.config.ts doesn't enable `test.globals`, so @testing-library/react's
// built-in auto-cleanup (which only hooks a global afterEach) never fires —
// register it explicitly, or DOM from one test leaks into the next.
afterEach(() => cleanup())
