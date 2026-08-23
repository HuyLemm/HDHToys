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
function resolveBundledFontPath(filename: string): string | null {
  try {
    const packageJsonPath = require.resolve("dejavu-fonts-ttf/package.json")
    return path.join(path.dirname(packageJsonPath), "ttf", filename)
  } catch {
    return null
  }
}

const REGULAR_CANDIDATES = [
  process.env.INVOICE_FONT_PATH,
  resolveBundledFontPath("DejaVuSans.ttf"),
  // OS-specific fallbacks in case the bundled font is ever unavailable.
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter((p): p is string => Boolean(p))

const BOLD_CANDIDATES = [
  process.env.INVOICE_FONT_BOLD_PATH,
  resolveBundledFontPath("DejaVuSans-Bold.ttf"),
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/segoeuib.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
].filter((p): p is string => Boolean(p))

let cachedRegular: string | null | undefined
let cachedBold: string | null | undefined

/**
 * pdfkit's built-in standard fonts (Helvetica, Times) have no Vietnamese glyphs.
 * DejaVu Sans (bundled as a dependency) has full Vietnamese coverage in a
 * single portable TTF, so it's the primary choice; if that somehow fails to
 * resolve, PDFs fall back to Helvetica and Vietnamese diacritics render as tofu.
 */
export function resolveUnicodeFontPath(): string | null {
  if (cachedRegular !== undefined) return cachedRegular
  cachedRegular = REGULAR_CANDIDATES.find((p) => existsSync(p)) ?? null
  return cachedRegular
}

/**
 * Same rationale as resolveUnicodeFontPath — Helvetica-Bold has no Vietnamese
 * glyphs either, so headings/emphasis need the DejaVu bold weight specifically
 * rather than just faking bold with the regular font.
 */
export function resolveUnicodeBoldFontPath(): string | null {
  if (cachedBold !== undefined) return cachedBold
  cachedBold = BOLD_CANDIDATES.find((p) => existsSync(p)) ?? null
  return cachedBold
}
