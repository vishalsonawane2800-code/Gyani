const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(url, options = {}) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...options.headers
      },
      timeout: options.timeout || 15000
    });
    return { html: response.data, error: null };
  } catch (error) {
    return { html: null, error: error.message };
  }
}

function parseHTML(html) {
  return cheerio.load(html);
}

function cleanGMPValue(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeCompanyName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s*(limited|ltd|ipo)\.?\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

module.exports = {
  fetchPage,
  parseHTML,
  cleanGMPValue,
  normalizeCompanyName,
  USER_AGENT
};
