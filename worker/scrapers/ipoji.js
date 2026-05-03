
// Ported from lib/scraper/sources/gmp-ipoji.ts.
//
// ipoji renders a card grid (NOT a table). Card markup looks like:
//
//   <div class=\"ipo-card\">
//     <... title: \"Mehul Telecom Apr 17, 2026 - Apr 21, 2026 BSE SME Live\" />
//     <div class=\"ipo-card-body-stat\">
//       <span class=\"ipo-card-secondary-label\">Exp. Premium</span>
//       <span class=\"ipo-card-body-value\">3-4 (3%)</span>
//     </div>
//     ...
//   </div>
//
// If the admin-stored URL is the site-wide list page we find the card
// matching `company_name`. If the URL is a per-IPO page (which still
// usually contains a single .ipo-card or a labelled \"Exp. Premium\" stat)
// we just take the first matching value. Falls back to a labelled
// table parse for forward compatibility.

const { fetchPage, parseHTML, parseGMP, normalizeName, namesMatch } = require(\"./_utils\");

/**
 * Strip the \"Apr 17, 2026 - Apr 21, 2026 BSE SME Live\" tail from a card
 * title so the leading bit is just the company name.
 */
function cleanCardTitle(title) {
  if (!title) return \"\";
  const cut = title.split(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/
  )[0];
  return (cut || title).replace(/\s+/g, \" \").trim();
}

function extractFromCards($, targetName) {
  const cards = $(\".ipo-card\");
  if (!cards.length) return null;

  const targetNorm = normalizeName(targetName || \"\");
  let gmp = null;

  cards.each((_, card) => {
    if (gmp !== null) return;
    const $card = $(card);

    let cardMatches = !targetNorm; // if no target → take first card
    if (targetNorm) {
      const titleRaw = $card
        .find(\".ipo-card-title, .ipo-card-header, h2, h3, a\")
        .first()
        .text()
        .replace(/\s+/g, \" \")
        .trim();
      if (!titleRaw) return;
      const titleNorm = normalizeName(cleanCardTitle(titleRaw));
      cardMatches = namesMatch(targetNorm, titleNorm);
    }
    if (!cardMatches) return;

    $card.find(\".ipo-card-body-stat\").each((_, s) => {
      if (gmp !== null) return;
      const label = $(s)
        .find(\".ipo-card-secondary-label\")
        .text()
        .trim()
        .toLowerCase();
      if (!/gmp|exp\.?\s*premium|grey\s*market/.test(label)) return;
      const value = $(s).find(\".ipo-card-body-value\").text().trim();
      // Card is matched and the stat block exists → \"-\" means zero today.
      const parsed = parseGMP(value, { dashAsZero: true });
      if (parsed !== null) gmp = parsed;
    });
  });

  return gmp;
}

/**
 * Fallback for per-IPO ipoji pages that render the GMP in a labelled
 * table (e.g. \"GMP Today | ₹10\").
 */
function extractFromLabelledTable($) {
  let gmp = null;
  $(\"table tr\").each((_, tr) => {
    if (gmp !== null) return;
    const cells = $(tr).find(\"td, th\").toArray().map((c) => $(c).text().replace(/\s+/g, \" \").trim());
    if (cells.length < 2) return;
    const rowText = cells.join(\" \").toLowerCase();
    if (!/gmp|grey\s*market|exp\.?\s*premium/.test(rowText)) return;

    for (let i = 1; i < cells.length; i++) {
      const n = parseGMP(cells[i], { dashAsZero: true });
      if (n !== null) {
        gmp = n;
        return;
      }
    }
  });
  return gmp;
}

/**
 * Public entry point.
 *
 * @param {string|null} url
 * @param {string|null} companyName
 */
async function scrapeIPOji(url, companyName) {
  if (!url) {
    return { gmp: null, source: \"ipoji\", error: \"no_url\" };
  }

  const { html, error } = await fetchPage(url);
  if (error || !html) {
    return { gmp: null, source: \"ipoji\", error: error || \"fetch_failed\" };
  }

  try {
    const $ = parseHTML(html);

    let gmp = extractFromCards($, companyName);
    if (gmp === null) gmp = extractFromLabelledTable($);

    if (gmp !== null) return { gmp, source: \"ipoji\", error: null };
    return { gmp: null, source: \"ipoji\", error: \"not_found\" };
  } catch (err) {
    return {
      gmp: null,
      source: \"ipoji\",
      error: err && err.message ? err.message : \"parse_error\",
    };
  }
}

