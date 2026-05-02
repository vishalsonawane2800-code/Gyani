// Shared primitives for GMP scrapers

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

      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAYS_MS[attempt])
      );
    }
  }

  throw lastError || new Error(`fetch failed`);
}

// ── Name normalization ──

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

  s = s.replace(/[\u2018\u2019]/g, "'");
  s = s.replace(/'s\b/g, "s").replace(/'/g, "");

  for (const phrase of BOILERPLATE_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
  }

  s = s.replace(BOILERPLATE_TOKEN_RE, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();

  return s;
}

export function namesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const [short, long] =
    a.length <= b.length ? [a, b] : [b, a];

  if (short.length < MIN_SHORT_LEN) return false;
  if (long.startsWith(short)) return true;

  return new RegExp(`\\b${short}\\b`).test(long);
}

// ── GMP parsing ──

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-–—−]|n\/?a|nil|none)$/i;

export function parseGMP(raw, { dashAsZero = false } = {}) {
  if (!raw) return null;

  let s = String(raw)
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/\/-/g, "")
    .replace(/\([^)]*%\)/g, "")
    .trim();

  if (!s) return null;
  if (ZERO_PLACEHOLDER_RE.test(s))
    return dashAsZero ? 0 : null;

  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  }

  const match = s.match(/[+\-]?\d+/);
  return match ? parseFloat(match[0]) : null;
}
