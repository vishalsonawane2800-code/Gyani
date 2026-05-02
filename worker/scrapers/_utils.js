const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchHtml(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function parseGmpNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/,/g, "").trim();
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(ipo|limited|ltd|pvt|private)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameMatches(target, candidate) {
  const a = normalizeName(target);
  const b = normalizeName(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const overlap = aTokens.filter((t) => bTokens.has(t)).length;
  return overlap >= Math.min(2, aTokens.length);
}

export function average(nums) {
  const valid = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Number((sum / valid.length).toFixed(2));
}
