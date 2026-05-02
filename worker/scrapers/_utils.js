// worker/scrapers/_utils.js

export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const DESKTOP_HEADERS = {
  "User-Agent": DESKTOP_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const RETRY_DELAYS_MS = [500, 1000, 2000];
const FETCH_TIMEOUT_MS = 15000;

export async function fetchWithRetry(url, options = {}) {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  let lastError = null;
  const headers = { ...DESKTOP_HEADERS, ...(options.headers || {}) };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) return res;

      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError || new Error(`fetchWithRetry failed: ${url}`);
}

// ---------------- NAME NORMALIZATION ----------------

const BOILERPLATE_PHRASES = [
  "infrastructure investment trust",
  "real estate investment trust",
  "investment trust",
];

const BOILERPLATE_TOKENS = [
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
];

const BOILERPLATE_TOKEN_RE = new RegExp(
  `\\b(?:${BOILERPLATE_TOKENS.join("|")})\\.?\\b`,
  "g"
);

const MIN_SHORT_LEN = 6;

export function normalizeName(name) {
  if (!name || typeof name !== "string") return "";

  let s = name.toLowerCase();

  // normalize quotes
  s = s.replace(/[\u2018\u2019]/g, "'");

  // remove possessive
  s = s.replace(/'s\b/g, "s").replace(/'/g, "");

  // remove phrases
  for (const phrase of BOILERPLATE_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
  }

  // remove tokens
  s = s.replace(BOILERPLATE_TOKEN_RE, " ");

  // cleanup
  s = s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

  return s;
}

export function namesMatch(a, b) {
  if (!a || !b) return false;

  if (a === b) return true;

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];

  if (short.length < MIN_SHORT_LEN) return false;

  if (long.startsWith(short)) return true;

  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(long);
}

// ---------------- GMP PARSER ----------------

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-–—−]|n\/?a|nil|none|not\s*available)$/i;

export function parseGMP(raw, { dashAsZero = false } = {}) {
  if (raw === null || raw === undefined) return null;

  let s = String(raw).trim();
  if (!s) return null;

  s = s
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/\/-/g, "")
    .replace(/,/g, "")
    .replace(/\([^)]*%\)/g, "")
    .replace(/\b(gmp|premium|today)\b/gi, "")
    .trim();

  if (!s) return null;

  if (ZERO_PLACEHOLDER_RE.test(s)) {
    return dashAsZero ? 0 : null;
  }

  // range case (10-12)
  const range = s.match(/([+\-]?\d+(?:\.\d+)?)\s*[-–—]\s*([+\-]?\d+(?:\.\d+)?)/);
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (!isNaN(a) && !isNaN(b)) {
      return Math.round((a + b) / 2);
    }
  }

  // single value
  const match = s.match(/[+\-]?\d+(?:\.\d+)?/);
  if (!match) return null;

  const val = parseFloat(match[0].replace("+", ""));
  return isNaN(val) ? null : val;
}
