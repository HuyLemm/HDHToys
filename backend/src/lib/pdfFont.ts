import { existsSync } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/**
 * Resolves to node_modules/dejavu-fonts-ttf regardless of OS or where the
 * project is deployed — unlike an absolute filesystem path, this works the
 * same on Windows, Linux containers, etc. because it goes through Node's own
 * module resolution.
 */
function resolveBundledFontPath(): string | null {
  try {
    const packageJsonPath = require.resolve("dejavu-fonts-ttf/package.json")
    return path.join(path.dirname(packageJsonPath), "ttf", "DejaVuSans.ttf")
  } catch {
    return null
  }
}

const CANDIDATES = [
  process.env.INVOICE_FONT_PATH,
  resolveBundledFontPath(),
  // OS-specific fallbacks in case the bundled font is ever unavailable.
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter((p): p is string => Boolean(p))

let cached: string | null | undefined

/**
 * pdfkit's built-in standard fonts (Helvetica, Times) have no Vietnamese glyphs.
 * DejaVu Sans (bundled as a dependency) has full Vietnamese coverage in a
 * single portable TTF, so it's the primary choice; if that somehow fails to
 * resolve, PDFs fall back to Helvetica and Vietnamese diacritics render as tofu.
 */
export function resolveUnicodeFontPath(): string | null {
  if (cached !== undefined) return cached
  cached = CANDIDATES.find((p) => existsSync(p)) ?? null
  return cached
}
