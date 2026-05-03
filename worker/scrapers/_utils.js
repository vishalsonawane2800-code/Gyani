const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const RETRY_DELAYS_MS = [500, 1000, 2000];
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        responseType: "text",
        transformResponse: [(data) => data],
        maxRedirects: 5,
      });

      if (response.status >= 200 && response.status < 300) {
        return { html: response.data, status: response.status, error: null };
      }

      if (response.status < 500 && response.status !== 429) {
        return {
          html: null,
          status: response.status,
          error: `http_${response.status}`,
        };
      }

      lastError = `http_${response.status}`;
    } catch (err) {
      lastError = err && err.message ? err.message : "fetch_failed";
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  return { html: null, status: null, error: lastError || "fetch_failed" };
}

function parseHTML(html) {
  return cheerio.load(html);
}

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-\u2013\u2014\u2212]|n\/?a|nil|none|not\s*available)$/i;

function parseGMP(input, options = {}) {
  if (input === null || input === undefined) return null;

  try {
    const trimmed = String(input).trim();
    if (!trimmed) return null;

    let cleaned = trimmed
      .toLowerCase()
      .replace(/₹|rs\.?|inr/gi, "")
      .replace(/\/-/g, "")
      .replace(/,/g, "")
      .trim();

    if (!cleaned) return null;

    if (ZERO_PLACEHOLDER_RE.test(cleaned)) {
      return options.dashAsZero ? 0 : null;
    }

    const rangeMatch = cleaned.match(
      /(-?\d+(?:\.\d+)?)\s*[-\u2013\u2014\u2212]\s*(-?\d+(?:\.\d+)?)/
    );
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1]);
      const b = parseFloat(rangeMatch[2]);
      if (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        rangeMatch[2][0] !== "-" &&
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

function normalizeName(name) {
  if (!name) return "";
  let s = String(name).toLowerCase();
  s = s.replace(/[\u2018\u2019\u02BC\u2032]/g, "'");
  s = s.replace(/\b([a-z0-9]+)'s\b/g, "$1");

  for (const phrase of BOILERPLATE_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
  }
  s = s.replace(BOILERPLATE_TOKEN_RE, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < MIN_SHORT_LEN) return false;

  if (long.startsWith(short)) return true;

  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const midRe = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
  return midRe.test(long);
}

function cleanGMPValue(raw) {
  return parseGMP(raw);
}

function normalizeCompanyName(name) {
  return normalizeName(name).replace(/\s+/g, "");
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
