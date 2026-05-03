
//
// Shared primitives for the GMP scrapers. Ported from the verified
// TypeScript implementation in lib/scraper/{base,parsers,name-match}.ts
// so the Railway worker has the same parsing semantics that were
// proven against ipowatch.in / ipoji.com / investorgain.com.
//
// Exports:
//   - fetchPage(url, opts)   : axios GET with desktop UA + retry
//   - parseHTML(html)        : cheerio.load wrapper
//   - parseGMP(raw, opts)    : robust GMP cell parser (handles ₹, ranges,
//                              dash-as-zero, /-, Rs. etc.)
//   - normalizeName(name)    : strip corporate boilerplate for matching
//   - namesMatch(a, b)       : whole-word / startsWith fuzzy compare
//   - cleanGMPValue(raw)     : legacy alias kept for back-compat
//   - normalizeCompanyName   : legacy alias kept for back-compat
//
// Contract: all helpers are sync and never throw.

const axios = require(\"axios\");
const cheerio = require(\"cheerio\");

const USER_AGENT =
  \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \" +
  \"(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\";

const DEFAULT_HEADERS = {
  \"User-Agent\": USER_AGENT,
  Accept:
    \"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\",
  \"Accept-Language\": \"en-US,en;q=0.9\",
};

const RETRY_DELAYS_MS = [500, 1000, 2000];
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET a URL with desktop Chrome UA, 15s timeout per attempt, and up to
 * 3 retries (500ms / 1s / 2s) on 5xx / 429 / network errors. Returns
 * { html, error } and never throws.
 */
async function fetchPage(url, options = {}) {
  const headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
  const timeout = options.timeout || FETCH_TIMEOUT_MS;

  let lastError = null;
  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        headers,
        timeout,
        validateStatus: () => true,
        responseType: \"text\",
        transformResponse: [(data) => data],
        maxRedirects: 5,
      });

      if (response.status >= 200 && response.status < 300) {
        return { html: response.data, status: response.status, error: null };
      }

      // Retry only on 5xx / 429; surface 4xx immediately
      if (response.status < 500 && response.status !== 429) {
        return {
          html: null,
          status: response.status,
          error: `http_${response.status}`,
        };
      }

      lastError = `http_${response.status}`;
    } catch (err) {
      lastError = err && err.message ? err.message : \"fetch_failed\";
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  return { html: null, status: null, error: lastError || \"fetch_failed\" };
}

function parseHTML(html) {
  return cheerio.load(html);
}

// ---------------------------------------------------------------------------
// GMP parser (ported from lib/scraper/parsers.ts)
// ---------------------------------------------------------------------------

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-\u2013\u2014\u2212]|n\/?a|nil|none|not\s*available)$/i;

/**
 * Parse a GMP value string.
 * Handles: \"₹150\", \"150/-\", \"Rs. 150\", \"150\", \"+10\", \"-5\",
 *          \"3-4 (3%)\" → midpoint 3.5,
 *          \"₹ 5-7\"   → midpoint 6,
 *          \"-\", \"—\", \"N/A\", \"nil\", \"none\" → null
 *            (or 0 when { dashAsZero: true } is passed; use that ONLY
 *             after a row/card has been name-matched, so a \"-\" means
 *             \"explicitly zero today\" rather than \"missing data\").
 */
function parseGMP(input, options = {}) {
  if (input === null || input === undefined) return null;

  try {
    const trimmed = String(input).trim();
    if (!trimmed) return null;

    // Strip currency symbols / \"/-\" / commas BEFORE the placeholder check
    // so that \"₹-\", \"Rs. -\", \"₹ N/A\" classify correctly.
    let cleaned = trimmed
      .toLowerCase()
      .replace(/₹|rs\.?|inr/gi, \"\")
      .replace(/\/-/g, \"\")
      .replace(/,/g, \"\")
      .trim();

    if (!cleaned) return null;

    if (ZERO_PLACEHOLDER_RE.test(cleaned)) {
      return options.dashAsZero ? 0 : null;
    }

    // Range \"3-4 (3%)\" → midpoint. Keep the parenthetical % out.
    // Note: leading minus on the FIRST number means a single negative
    //       value (e.g. \"-5\"), not a range. Detect range only when there's
    //       a digit on both sides of a hyphen/dash.
    const rangeMatch = cleaned.match(
      /(-?\d+(?:\.\d+)?)\s*[-\u2013\u2014\u2212]\s*(-?\d+(?:\.\d+)?)/
    );
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1]);
      const b = parseFloat(rangeMatch[2]);
      // Only treat as a range when the second number is non-negative and
      // the two values are plausibly bounds (a <= b). Otherwise fall
      // through to the flat-number branch.
      if (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        rangeMatch[2][0] !== \"-\" &&
        a <= b
      ) {
        return Math.round(((a + b) / 2) * 100) / 100;
      }
    }

    const flatMatch = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!flatMatch) return null;
    const num = parseFloat(flatMatch[0]);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Name matching (ported from lib/scraper/name-match.ts)
// ---------------------------------------------------------------------------

const BOILERPLATE_PHRASES = [
  \"infrastructure investment trust\",
  \"real estate investment trust\",
  \"investment trust\",
];

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
];

const BOILERPLATE_TOKEN_RE = new RegExp(
  `\\b(?:${BOILERPLATE_TOKENS.join(\"|\")})\\.?\\b`,
  \"g\"
);

const MIN_SHORT_LEN = 6;

/**
 * Lowercase, strip typographic apostrophes / 's possessives, strip
 * corporate boilerplate phrases and tokens, collapse non-alphanumerics
 * to single spaces. Output is whitespace-separated [a-z0-9]+ tokens.
 */
function normalizeName(name) {
  if (!name) return \"\";
  let s = String(name).toLowerCase();

  // Fold typographic apostrophes to ASCII so \"Sai Parenteral's\" matches
  // \"Sai Parenterals\".
  s = s.replace(/[\u2018\u2019\u02BC\u2032]/g, \"'\");
  // Strip possessive 's on word boundaries.
  s = s.replace(/\b([a-z0-9]+)'s\b/g, \"$1\");

  for (const phrase of BOILERPLATE_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, \"g\"), \" \");
  }
  s = s.replace(BOILERPLATE_TOKEN_RE, \" \");
  s = s.replace(/[^a-z0-9]+/g, \" \").replace(/\s+/g, \" \").trim();
  return s;
}

/**
 * Whole-word fuzzy compare for two ALREADY-normalized names.
 *   - exact equality → true
 *   - shorter side ≥ MIN_SHORT_LEN AND
 *       (longer.startsWith(shorter)
 *        OR shorter appears in longer as contiguous whole-word run)
 *   - otherwise false (rejects reorderings).
 */
function namesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < MIN_SHORT_LEN) return false;

  if (long.startsWith(short)) return true;

  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, \"\\$&\");
  const midRe = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
  return midRe.test(long);
}

// ---------------------------------------------------------------------------
// Legacy aliases (kept so any older callers keep working)
// ---------------------------------------------------------------------------

function cleanGMPValue(raw) {
  return parseGMP(raw);
}

function normalizeCompanyName(name) {
  return normalizeName(name).replace(/\s+/g, \"\");
}

module.exports = {
  fetchPage,
  parseHTML,
  parseGMP,
  normalizeName,
  namesMatch,
  cleanGMPValue,
  normalizeCompanyName,
  USER_AGENT,
  DEFAULT_HEADERS,
};
