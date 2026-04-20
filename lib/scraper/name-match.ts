// lib/scraper/name-match.ts
//
// Shared IPO-name normalization + fuzzy matching used by the GMP source
// scrapers (ipowatch, ipoji). Extracted so the same matching logic lives in
// exactly one place.
//
// Why this matters:
//   The DB's `ipos.name` frequently carries long-form legal boilerplate
//   ("Investment Trust", "Infrastructure Investment Trust", "Limited",
//   "Private Ltd", etc.) that IPO listing sites drop in favor of shorter
//   display names. Concrete live example (2026-04-20):
//
//     DB      : "Citius Transnet Investment Trust InvIT"
//     ipowatch: "Citius Transnet InvIT"
//     ipoji   : "Citius Transnet InvIT"
//
//   Matching on the raw strings — or even on lightly-normalized strings —
//   fails, and the scraper returns `null` even though the data is right
//   there on the page.
//
// Strategy:
//   1. `normalizeName` lowercases, strips corporate/structural boilerplate
//      tokens and multi-word phrases (Infrastructure Investment Trust,
//      Real Estate Investment Trust, Investment Trust, Limited, Ltd, Pvt,
//      Private, The, IPO, SME, REIT, InvIT, …), then squashes
//      non-alphanumeric characters to single spaces. With this applied,
//      both sides of the Citius example above reduce to "citius transnet".
//
//   2. `namesMatch` accepts a pair of already-normalized names as a match
//      when EITHER:
//        a. they're exactly equal, OR
//        b. the longer begins with the shorter (handles the common
//           "Foo" vs "Foo Private Limited" case even if stripping missed
//           something), OR
//        c. the shorter appears as a contiguous, whole-word token run
//           inside the longer (handles boilerplate that sits between
//           meaningful tokens, e.g. "Citius Transnet Holdings" vs
//           "Citius Transnet").
//      In all three, the shorter side must be at least 6 characters
//      post-normalization. Below that, false positives explode (e.g. "ABC"
//      matching "ABC Corp Holdings").
//
// Do NOT widen this further without running the E2E verifier. Name-match
// precision is load-bearing: the GMP sources coerce dash placeholders to
// `0` ONLY AFTER a row is matched by name, so a loose match could cause a
// different IPO's "-" to be counted as this IPO's zero.

/** Multi-word phrases to strip. Order matters — these must run BEFORE
 *  punctuation normalization so the internal spaces still exist, and
 *  before token-level stripping so "Investment Trust" gets consumed as a
 *  phrase rather than leaving a stray "trust" behind. */
const BOILERPLATE_PHRASES: readonly string[] = [
  "infrastructure investment trust",
  "real estate investment trust",
  "investment trust",
]

/** Single-token boilerplate. Each entry is an alphanumeric token matched
 *  on word boundaries (with an optional trailing `.` for abbreviations
 *  like "Ltd." and "Pvt."). */
const BOILERPLATE_TOKENS: readonly string[] = [
  "limited",
  "ltd",
  "pvt",
  "private",
  "the",
  "ipo",
  "sme",
  "reit",
  "reits",
  "invit",
  "invits",
]

const BOILERPLATE_TOKEN_RE = new RegExp(
  `\\b(?:${BOILERPLATE_TOKENS.join("|")})\\.?\\b`,
  "g",
)

/** Minimum length of the shorter normalized name required to accept any
 *  match other than exact equality. Don't lower this — see header doc. */
const MIN_SHORT_LEN = 6

/**
 * Normalize an IPO name for fuzzy matching.
 *
 * Strips common corporate/structural boilerplate and punctuation, then
 * collapses whitespace. Output is lowercase, whitespace-separated tokens
 * of `[a-z0-9]+`.
 *
 * Examples (2026-04-20 live):
 *   "Citius Transnet Investment Trust InvIT" → "citius transnet"
 *   "Citius Transnet InvIT"                  → "citius transnet"
 *   "Sai Parenterals Limited"                → "sai parenterals"
 *   "Mehul Telecom"                          → "mehul telecom"
 *   "The XYZ Pvt. Ltd."                      → "xyz"
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return ""
  let s = String(name).toLowerCase()

  // 1. Multi-word phrases first, while the internal whitespace still exists.
  for (const phrase of BOILERPLATE_PHRASES) {
    // Word-boundary on both ends keeps "investment trust" from matching
    // inside a longer compound like "superinvestmenttrustee" (not a real
    // case, just belt-and-braces).
    s = s.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ")
  }

  // 2. Single-token boilerplate.
  s = s.replace(BOILERPLATE_TOKEN_RE, " ")

  // 3. Anything non-alphanumeric → single space; then collapse runs.
  s = s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()

  return s
}

/**
 * Fuzzy-equality for two IPO names that have ALREADY been passed through
 * `normalizeName`. Returns true when the caller should treat them as the
 * same IPO.
 *
 * Contract:
 *   - Exact equality after normalization → true.
 *   - Otherwise, the shorter side must be ≥ MIN_SHORT_LEN chars; if not,
 *     return false to avoid spurious matches on tiny inputs.
 *   - `long.startsWith(short)` → true (covers residual suffix boilerplate).
 *   - `short` appears in `long` as a contiguous, whole-word token
 *     sequence → true (covers boilerplate that sat between the
 *     meaningful tokens).
 *   - Nothing else matches. This deliberately rejects reorderings like
 *     "India Cements" vs "Cements India" even though they share tokens.
 */
export function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true

  const [short, long] =
    a.length <= b.length ? [a, b] : [b, a]

  if (short.length < MIN_SHORT_LEN) return false

  // Case (b): long begins with short.
  if (long.startsWith(short)) return true

  // Case (c): short is a whole-word contiguous run inside long.
  // We escape regex metacharacters defensively — although after
  // normalization the string should be [a-z0-9 ]+, belt-and-braces.
  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const midRe = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`)
  return midRe.test(long)
}
