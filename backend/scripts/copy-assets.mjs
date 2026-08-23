import { cpSync, existsSync } from "node:fs"

// tsc only emits .ts -> .js; it never copies binary assets (logo.jpg) into
// dist/. Mirroring src/assets -> dist/assets keeps the relative path used by
// lib/storeConfig.ts (../assets/logo.jpg from dist/lib) valid after build.
if (existsSync("src/assets")) {
  cpSync("src/assets", "dist/assets", { recursive: true })
}
