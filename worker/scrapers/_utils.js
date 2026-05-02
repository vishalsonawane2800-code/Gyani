
//
// Shared primitives for the worker's GMP scrapers. Ported and hardened from
// lib/scraper/{base,name-match,parsers}.ts with improvements tuned for the
// Railway worker:
//
//   - fetchWithRetry      : native fetch, retries on 5xx/429, abortable timeout
//   - normalizeName       : strips typographic apostrophes, boilerplate tokens
//                           (limited, ltd, pvt, invit, reit, ...), multi-word
//                           phrases (\"investment trust\"), punctuation
//   - namesMatch          : exact / startsWith / contiguous-token match
//   - parseGMP            : handles ₹10, +10, 10, ₹10-12 (range → midpoint),
//                           \"10 GMP\", \"Rs. 10/-\", dash/N-A-as-zero
//
// Contract: helpers NEVER throw except fetchWithRetry on final failure.

export const DESKTOP_UA =
  \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \" +
  \"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\"

export const DESKTOP_HEADERS = {
  \"User-Agent\": DESKTOP_UA,
  Accept:
    \"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\",
  \"Accept-Language\": \"en-US,en;q=0.9\",
}

const RETRY_DELAYS_MS = [500, 1000, 2000]
const FETCH_TIMEOUT_MS = 15_000

/**
 * Fetch a URL with up to 3 retries on 5xx/429, 15s per-attempt abort timeout.
 * Throws the last error if every attempt fails.
 */
export async function fetchWithRetry(url, options = {}) {
  const maxAttempts = RETRY_DELAYS_MS.length + 1
  let lastError = null
  const headers = { ...DESKTOP_HEADERS, ...(options.headers || {}) }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal })
      if (res.ok) return res
      if (res.status < 500 && res.status !== 429) return res
      lastError = new Error(`HTTP ${res.status} ${res.statusText}`)
    } catch (err) {
      lastError = err
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
    }
  }
  throw lastError || new Error(`fetchWithRetry: ${url} failed`)
}

// ─────────────────────────────────────────────────────────────
// Name normalization & matching
// ─────────────────────────────────────────────────────────────

/** Phrases stripped BEFORE token normalization so the internal spaces
 *  survive and the whole phrase is removed as a unit. */
const BOILERPLATE_PHRASES = [
  \"infrastructure investment trust\",
  \"real estate investment trust\",
  \"investment trust\",
]

const BOILERPLATE_TOKENS = [
  \"limited\",
  \"ltd\",
  \"pvt\",
  \"private\",
  \"the\",
  \"ipo\",
  \"sme\",
  \"reit\",
  \"reits\",
  \"invit\",
  \"invits\",
]

const BOILERPLATE_TOKEN_RE = new RegExp(
  `\\b(?:${BOILERPLATE_TOKENS.join(\"|\")})\\.?\\b`,
  \"g\",
)

/** Minimum shorter-name length to accept any non-exact match. */
const MIN_SHORT_LEN = 6

/**
 * Normalize an IPO name for fuzzy matching.
 *
 * Lowercase, fold typographic apostrophes, strip possessive `'s`, remove
 * corporate boilerplate (limited, ltd, pvt, invit, reit, ...), collapse
 * non-alphanumerics to single space.
 *
 * Examples:
 *   \"Sai Parenteral's\"                        → \"sai parenterals\"  (possessive removed -> \"sai parenterals\")
 *   \"Sai Parenterals Limited\"                 → \"sai parenterals\"
 *   \"Mehul Telecom Limited\"                   → \"mehul telecom\"
 *   \"Citius Transnet Investment Trust InvIT\"  → \"citius transnet\"
 *   \"The XYZ Pvt. Ltd.\"                       → \"xyz\"
 */
export function normalizeName(name) {
  if (!name || typeof name !== \"string\") return \"\"
  let s = name.toLowerCase()

  // Fold typographic apostrophes/quotes to ASCII apostrophe first so
  // \"Sai Parenteral's\" and \"Sai Parenteral's\" normalize identically.
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, \"'\")
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '\"')

  // Drop possessive 's / s' (after apostrophe folding). Handles
  // \"Parenteral's\" → \"Parenterals\" effectively by dropping the apostrophe.
  s = s.replace(/'s\b/g, \"s\").replace(/'/g, \"\")

  // Multi-word boilerplate phrases first — while whitespace still intact.
  for (const phrase of BOILERPLATE_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, \"g\"), \" \")
  }

  // Single-token boilerplate (ltd/pvt/...).
  s = s.replace(BOILERPLATE_TOKEN_RE, \" \")

  // Collapse non-alphanumerics → space; squash runs.
  s = s.replace(/[^a-z0-9]+/g, \" \").replace(/\s+/g, \" \").trim()
  return s
}

/**
 * Fuzzy-equality for two names already passed through normalizeName.
 *
 *   exact equality                              → true
 *   shorter.length < MIN_SHORT_LEN              → false
 *   long.startsWith(short)                      → true
 *   short appears as contiguous whole-word span → true
 *
 * Deliberately rejects reorderings like \"India Cements\" vs \"Cements India\".
 */
export function namesMatch(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length < MIN_SHORT_LEN) return false
  if (long.startsWith(short)) return true
  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, \"\\$&\")
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(long)
}

// ─────────────────────────────────────────────────────────────
// GMP value parsing
// ─────────────────────────────────────────────────────────────

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-–—−]|n\/?a|nil|none|not\s*available)$/i

/**
 * Parse a GMP cell value.
 *
 * Accepts every format seen on Indian IPO sites:
 *   \"₹10\" → 10
 *   \"+10\" → 10
 *   \"10\"  → 10
 *   \"₹-10\" → -10
 *   \"₹ 10-12\"  → 11    (midpoint of range)
 *   \"10-12 (5%)\" → 11
 *   \"10 GMP\"   → 10
 *   \"Rs. 10/-\" → 10
 *   \"-\" / \"—\" / \"N/A\" / \"\" → null, or 0 when { dashAsZero: true }
 *
 * @param {string|null|undefined} raw
 * @param {{ dashAsZero?: boolean }} [opts]
 * @returns {number|null}
 */
export function parseGMP(raw, { dashAsZero = false } = {}) {
  if (raw === null || raw === undefined) return null
  let s = String(raw).trim()
  if (!s) return null

  // Strip currency markers, \"/-\" suffix, commas, percent-in-parens
  s = s
    .replace(/₹|rs\.?|inr/gi, \"\")
    .replace(/\/-/g, \"\")
    .replace(/,/g, \"\")
    .replace(/\([^)]*%\)/g, \"\") // remove \"(3%)\" etc
    .replace(/\b(gmp|grey\s*market\s*premium|premium|today)\b/gi, \"\")
    .trim()

  if (!s) return null
  if (ZERO_PLACEHOLDER_RE.test(s)) return dashAsZero ? 0 : null

  // Range first: \"10-12\" or \"10 - 12\" → midpoint.
  // Keep optional leading signs on BOTH sides so \"-3 to 5\" still parses.
  const rangeMatch = s.match(/([+\-]?\d+(?:\.\d+)?)\s*[-–—]\s*([+\-]?\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1])
    const b = parseFloat(rangeMatch[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.round(((a + b) / 2) * 100) / 100
    }
  }

  // Single value: strip leading + sign, first signed number.
  const flat = s.match(/[+\-]?\d+(?:\.\d+)?/)
  if (!flat) return null
  const n = parseFloat(flat[0].replace(/^\+/, \"\"))
  return Number.isFinite(n) ? n : null
}
"
Observation: Create successful: /app/worker/scrapers/_utils.js
