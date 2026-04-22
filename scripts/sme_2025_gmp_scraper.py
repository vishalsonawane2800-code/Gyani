"""
IPO Central Scraper - 2025 SME IPOs
Adapted from 2026 Mainboard scraper. Key fixes for SME 2025:

  1. Subscription table on SME pages uses column header "Individual" instead
     of "Retail" (see FlySBS Aviation page). Parser now accepts both.
  2. Added "-ipo-gmp-review-price/" URL suffix (FlySBS uses this exact form).
     Kept other suffixes so any SME page variant still works.
  3. Nifty history backfilled from 2024-11-01 so 2025 listings have enough
     lookback for the 3D / 1W / 1M returns.
  4. "Listing On" for SME is "NSE EMERGE" or "BSE SME" - listing-performance
     parser already keys off the substring "nse"/"sme", so no change needed.
  5. Added a lightweight save-on-exit guard: if the run crashes mid-way we
     still dump whatever we have, so you don't burn hours re-scraping.

Run:   python sme_2025_gmp_scraper.py
Needs: pip install requests beautifulsoup4 pandas openpyxl yfinance
"""

import atexit
import math
import re
import time
from datetime import datetime, timedelta

import pandas as pd
import requests
from bs4 import BeautifulSoup

try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False
    print("!  yfinance not installed - Nifty columns will be empty.")

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://ipocentral.in/",
}
BASE = "https://ipocentral.in/"
SLEEP = 2
DEBUG = False

# URL suffixes (tried in order). Added "-ipo-gmp-review-price/" which is the
# real suffix used on FlySBS Aviation + most other SME 2025 pages.
URL_SUFFIXES = [
    "-ipo-gmp-review-price/",
    "-ipo-gmp-price-date-details/",
    "-ipo-gmp-price-allotment-profit-estimate/",
    "-ipo-gmp-price-date-allotment/",
    "-ipo-gmp-price-allotment/",
    "-ipo-gmp-review-price-allotment/",
    "-ipo-gmp-price-date/",
    "-ipo-allotment-subscription-gmp/",
    "-ipo-gmp-allotment/",
    "-ipo-review-gmp-price/",
    "-ipo-details/",
    "-ipo/",
]

# Seed list. Add / remove SME 2025 slugs here - slug = text before
# "-ipo-gmp-..." in the URL. The scraper is tolerant of suffix changes.
SME_IPOS_2025 = {
    "flysbs-aviation": "FlySBS Aviation",
    # Add more 2025 SME IPOs here, e.g.:
    # "shanti-gold": "Shanti Gold",
    # "aditya-infotech": "Aditya Infotech",
}

COLUMNS = [
    "IPO Name", "Listing Date", "Sector", "Retail Quota (%)",
    "Issue Price Upper", "Listing Price", "Closing Price NSE",
    "Listing Gain (%)", "Listing gains on closing Basis (%)",
    "Day Change After Listing (%)",
    "QIB Day3 Subscription", "HNI/NII Day3 Subscription", "Retail Day3 Subscription",
    "Day1 Subscription", "Day2 Subscription", "Day3 Subscription",
    "GMP percentage D1", "GMP percentage D2", "GMP percentage D3",
    "GMP percentage D4", "GMP percentage D5",
    "Peer PE", "Debt/Equity", "IPO PE", "Latest EBIDTA",
    "PE vs Sector Ratio",
    "Nifty 3D Return (%)", "Nifty 1W Return (%)", "Nifty 1M Return (%)",
    "Nifty During IPO Window (%)", "Market Sentiment Score",
    "Issue Size (Cr)", "Fresh Issue", "OFS",
    "GMP Day-1", "GMP Day-2", "GMP Day-3", "GMP Day-4", "GMP Day-5",
]

# ----------------------------------------------------------------------------
# Low-level helpers
# ----------------------------------------------------------------------------

def _get(url, timeout=15):
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        return r if r.status_code == 200 else None
    except Exception:
        return None

def find_page(slug):
    for suffix in URL_SUFFIXES:
        url = BASE + slug + suffix
        r = _get(url)
        if r:
            print(f"    OK  {url}")
            return url, BeautifulSoup(r.text, "html.parser")
    parts = slug.split("-")
    for i in range(len(parts) - 1, 0, -1):
        shorter = "-".join(parts[:i])
        for suffix in URL_SUFFIXES:
            url = BASE + shorter + suffix
            r = _get(url)
            if r:
                print(f"    OK  {url}  (truncated slug)")
                return url, BeautifulSoup(r.text, "html.parser")
    return None, None

def clean_num(x):
    if x is None:
        return None
    s = re.sub(r"[,\s]", "", str(x)).replace("INR", "").replace("x", "").strip()
    s = s.replace("\u20b9", "")  # rupee
    try:
        return float(s)
    except Exception:
        return None

def upper_band(text):
    nums = re.findall(r"[\d]+(?:\.\d+)?", text.replace(",", ""))
    return float(nums[-1]) if nums else None

def crore_val(text):
    m = re.findall(r"([\d,.]+)\s*(?:crore|cr)\b", text, re.IGNORECASE)
    return float(m[-1].replace(",", "")) if m else None

def parse_date(raw):
    raw = raw.strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%d-%b-%Y", "%B %d, %Y",
                "%d/%m/%Y", "%Y-%m-%d", "%d %b %y", "%d-%b-%y"):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.strftime("%d-%b-%y"), dt
        except Exception:
            pass
    return raw, None

def _pct_from_parens(text):
    m = re.search(r"\((up|down)\s*([\d.]+)%\)", text, re.IGNORECASE)
    if m:
        sign = 1 if m.group(1).lower() == "up" else -1
        return round(sign * float(m.group(2)), 2)
    return None

def _price_inr(text):
    m = re.search(r"(?:INR|\u20b9)\s*([\d,]+(?:\.\d+)?)", text)
    return float(m.group(1).replace(",", "")) if m else None

# ----------------------------------------------------------------------------
# Table parsers
# ----------------------------------------------------------------------------

def parse_details_table(soup):
    d = {}
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for tr in rows:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            key = cells[0].lower()
            val = cells[1].strip()

            if "ipo dates" in key and "open_date_raw" not in d:
                m = re.match(r"(\d+)\s*[\u2013\-]\s*(\d+)\s+(\w+)\s+(\d{4})", val)
                if m:
                    d1, d2, mon, yr = m.groups()
                    d["open_date_raw"] = f"{d1} {mon} {yr}"
                    d["close_date_raw"] = f"{d2} {mon} {yr}"
                else:
                    d["open_date_raw"] = val

            if any(k in key for k in ("ipo opening date", "ipo open date", "issue open")):
                d["open_date_raw"] = val
            if any(k in key for k in ("ipo closing date", "ipo close date", "issue close")):
                d["close_date_raw"] = val
            if "listing date" in key and "open" not in key:
                d["listing_date_raw"] = val

            if any(k in key for k in ("issue price", "price band", "offer price",
                                      "cut off price", "price range")):
                v = upper_band(val)
                if v:
                    d.setdefault("issue_price", v)

            if "fresh issue" in key:
                v = crore_val(val)
                if v:
                    d["fresh"] = v
            if "offer for sale" in key or key.strip() == "ofs":
                v = crore_val(val)
                if v:
                    d["ofs"] = v
            if "total ipo size" in key or (
                "issue size" in key and "fresh" not in key and "offer" not in key
            ):
                v = crore_val(val)
                if v:
                    d["issue_size"] = v

            if ("sector" in key or "industry" in key) and len(val) > 1:
                d.setdefault("sector", val)

        # Allocation inside details section (some SME pages merge these)
        hdr_cells = [c.get_text(" ", strip=True).lower() for c in rows[0].find_all(["th", "td"])] if rows else []
        if any("investor category" in h or "category" in h for h in hdr_cells):
            for tr in rows[1:]:
                cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
                if len(cells) >= 2 and (
                    "retail" in cells[0].lower() or "individual" in cells[0].lower()
                ):
                    d["retail_quota"] = cells[-1].replace("%", "").strip()

    return d


def parse_valuation_table(soup):
    d = {}
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        hdr = [c.get_text(" ", strip=True).lower() for c in rows[0].find_all(["th", "td"])]
        if not any(k in " ".join(hdr) for k in ("fy 2023", "fy2023", "fy 20", "h1 fy")):
            continue
        for tr in rows[1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            key = cells[0].lower()

            def last_val():
                for c in reversed(cells[1:]):
                    c = c.strip()
                    if c and c not in ("\u2013", "-", "\u2014", "N/A", "na"):
                        return c
                return None

            lv = last_val()
            if lv is None:
                continue

            if "pe ratio" in key or "p/e" in key:
                v = upper_band(lv)
                if v:
                    d["ipo_pe"] = v
            if "ebitda" in key:
                v = clean_num(lv)
                if v:
                    d["ebitda"] = v
            if "debt/equity" in key or "debt / equity" in key:
                v = clean_num(lv)
                if v:
                    d["debt_equity"] = v
    return d


def parse_listing_performance(soup):
    d = {}
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for tr in rows:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            key = cells[0].lower()
            val = cells[1].strip()

            if "listing date" in key and "open" not in key:
                d.setdefault("listing_date_raw", val)
            if "ipo opening date" in key or ("opening date" in key and "price" not in key):
                d.setdefault("open_date_raw", val)
            if "ipo closing date" in key or ("closing date" in key and "price" not in key):
                d.setdefault("close_date_raw", val)

            # Works for both "Opening Price on NSE" and "Opening Price on NSE SME"
            if ("opening price" in key or "listing open" in key) and "nse" in key:
                p = _price_inr(val)
                pct = _pct_from_parens(val)
                if p:
                    d["listing_price"] = p
                if pct is not None:
                    d["listing_gain"] = pct
            if "closing price" in key and "nse" in key:
                p = _price_inr(val)
                pct = _pct_from_parens(val)
                if p:
                    d["closing_price"] = p
                if pct is not None:
                    d["closing_gain"] = pct
    return d


def parse_gmp_table(soup):
    """
    SME GMP table has an extra 'Kostak' column between GMP and Subject-to-Sauda
    (see FlySBS: Date | Consolidated IPO GMP | Kostak | Subject to Sauda).
    We locate the GMP column by header substring match, so the extra column
    doesn't trip us up. 0 is a valid GMP value.
    """
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        hdr = [c.get_text(" ", strip=True).lower() for c in rows[0].find_all(["th", "td"])]
        if not (any("date" in h for h in hdr) and any("gmp" in h for h in hdr)):
            continue
        gmp_col = next((i for i, h in enumerate(hdr) if "gmp" in h), 1)

        values = []
        for tr in rows[1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if len(cells) <= gmp_col:
                continue
            raw = cells[gmp_col].strip()
            if raw in ("", "\u2013", "-", "\u2014", "N/A", "n/a", "na"):
                continue
            v = clean_num(raw)
            if v is not None:
                values.append(v)
            if len(values) == 5:
                break

        if values:
            while len(values) < 5:
                values.append("")
            return values
    return ["", "", "", "", ""]


def parse_subscription_table(soup):
    """
    SME fix: accept "Individual" as retail column header. The FlySBS page has:
      Category | QIB | NII | Individual | Total
    whereas mainboard uses "Retail". We also keep "retail" matching for
    future-proofing.
    """
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue

        hdr_idx = None
        iq = iN = ir = it = None
        for hi, tr in enumerate(rows[:4]):
            cells = [c.get_text(" ", strip=True).lower() for c in tr.find_all(["th", "td"])]
            if "qib" in cells or any("qib" in c for c in cells):
                hdr_idx = hi
                for i, h in enumerate(cells):
                    if h == "qib" or "qib" in h:
                        iq = i
                    elif "nii" in h or "hni" in h:
                        iN = i
                    # SME pages use "Individual" for retail
                    elif "retail" in h or "individual" in h:
                        ir = i
                    elif "total" in h:
                        it = i
                break

        if hdr_idx is None or None in (iq, iN, ir):
            continue
        if it is None:
            it = max(iq, iN, ir) + 1

        data_rows = []
        for tr in rows[hdr_idx + 1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if not cells:
                continue
            lbl = cells[0].lower()
            # Skip annotation rows, including the "Shares Offered" row SME
            # pages put right below the header (see FlySBS example).
            if any(k in lbl for k in ("category", "shares offered", "allotted",
                                      "anchor", "market maker")):
                continue
            if len(cells) <= max(iq, iN, ir):
                continue
            q = clean_num(cells[iq])
            n = clean_num(cells[iN])
            ret = clean_num(cells[ir])
            tot = clean_num(cells[it]) if len(cells) > it else None
            # Share-count rows slip through as huge numbers - filter them.
            if tot is not None and tot > 10_000:
                continue
            if any(v is not None for v in (q, n, ret, tot)):
                data_rows.append({
                    "date": cells[0], "qib": q, "nii": n, "retail": ret, "total": tot,
                })

        if not data_rows:
            continue

        # EOD per unique date (newest-first on page -> setdefault keeps first-seen = latest)
        seen = {}
        for row in data_rows:
            seen.setdefault(row["date"], row)
        unique = list(reversed(list(seen.values())))  # chronological

        d1 = unique[0]["total"] if len(unique) >= 1 else ""
        d2 = unique[1]["total"] if len(unique) >= 2 else ""
        last = unique[-1]
        d3 = last["total"] or ""
        qib = last["qib"] or ""
        hni = last["nii"] or ""
        ret2 = last["retail"] or ""
        return d1, d2, d3, qib, hni, ret2

    return "", "", "", "", "", ""


def parse_peer_table(soup):
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        hdr = [c.get_text(" ", strip=True).lower() for c in rows[0].find_all(["th", "td"])]
        if "company" not in hdr:
            continue
        pe_col = next((i for i, h in enumerate(hdr) if "pe" in h or "p/e" in h), None)
        if pe_col is None:
            continue
        pes = []
        for j, tr in enumerate(rows[1:]):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if len(cells) <= pe_col:
                continue
            if j == 0:
                continue
            v = cells[pe_col].strip()
            if v.lower() in ("", "na", "n.a.", "-", "\u2014", "n/a"):
                continue
            n = clean_num(v)
            if n:
                pes.append(n)
        if pes:
            return round(sum(pes) / len(pes), 2)
    return None


def fetch_sub_fallback(slug):
    parts = slug.split("-")
    for i in range(len(parts), 0, -1):
        cand = "-".join(parts[:i])
        for sfx in ("-ipo-subscription-status/",
                    "-ipo-subscription-live-status/",
                    "-ipo-subscription/"):
            r = _get(BASE + cand + sfx)
            if r:
                return BeautifulSoup(r.text, "html.parser")
    return None

# ----------------------------------------------------------------------------
# Nifty
# ----------------------------------------------------------------------------

_nifty_cache = None

def load_nifty():
    global _nifty_cache
    if _nifty_cache is not None:
        return _nifty_cache
    if not HAS_YFINANCE:
        return None
    try:
        # 2024-11-01 gives ~2 months of pre-2025 lookback so the oldest 2025
        # IPO still has a full 1M Nifty window.
        df = yf.download("^NSEI", start="2024-11-01",
                         end=datetime.today().strftime("%Y-%m-%d"), progress=False)
        s = df["Close"].squeeze()
        s.index = pd.to_datetime(s.index)
        _nifty_cache = s
        print("  OK  Nifty 50 loaded")
        return s
    except Exception as e:
        print(f"  ERR Nifty load failed: {e}")
        return None

def _nearest(nifty, dt):
    if nifty is None or dt is None:
        return None
    sub = nifty[nifty.index <= pd.Timestamp(dt)]
    return float(sub.iloc[-1]) if not sub.empty else None

def nifty_pct(nifty, dt, days_back):
    ep = _nearest(nifty, dt)
    sp = _nearest(nifty, dt - timedelta(days=days_back)) if dt else None
    return round((ep - sp) / sp * 100, 2) if ep and sp and sp != 0 else ""

def nifty_window_pct(nifty, open_dt, close_dt):
    op = _nearest(nifty, open_dt)
    cp = _nearest(nifty, close_dt)
    return round((cp - op) / op * 100, 2) if op and cp and op != 0 else ""

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

print("=" * 60)
print("  IPO Central Scraper - 2025 SME IPOs")
print("=" * 60)
nifty = load_nifty()

output_rows = []

# Guarantee partial save even if the script crashes mid-run.
def _flush():
    if output_rows:
        df_ = pd.DataFrame(output_rows, columns=COLUMNS)
        df_.to_excel("IPO_2025_SME.xlsx", index=False)
        print(f"  (atexit) saved {len(df_)} rows -> IPO_2025_SME.xlsx")
atexit.register(_flush)

for slug, name in SME_IPOS_2025.items():
    print(f"\n->  {name}")
    row = {c: "" for c in COLUMNS}
    row["IPO Name"] = name

    _, soup = find_page(slug)
    if soup is None:
        print("   MISS  Page not found")
        output_rows.append(row)
        continue

    kv = parse_details_table(soup)
    val_kv = parse_valuation_table(soup)
    list_kv = parse_listing_performance(soup)
    kv.update({k: v for k, v in list_kv.items() if v})

    retail_quota = kv.get("retail_quota", "")
    gmp = parse_gmp_table(soup)

    d1, d2, d3, qib_d3, hni_d3, ret_d3 = parse_subscription_table(soup)
    if not any([d3, qib_d3, ret_d3]):
        fb = fetch_sub_fallback(slug)
        if fb:
            d1, d2, d3, qib_d3, hni_d3, ret_d3 = parse_subscription_table(fb)

    avg_peer_pe = parse_peer_table(soup)

    listing_date_str, listing_dt = ("", None)
    if kv.get("listing_date_raw"):
        listing_date_str, listing_dt = parse_date(kv["listing_date_raw"])

    _, open_dt = parse_date(kv["open_date_raw"]) if kv.get("open_date_raw") else ("", None)
    _, close_dt = parse_date(kv["close_date_raw"]) if kv.get("close_date_raw") else ("", None)
    if listing_dt:
        if open_dt is None:
            open_dt = listing_dt - timedelta(days=7)
        if close_dt is None:
            close_dt = listing_dt - timedelta(days=4)

    issue_price = kv.get("issue_price")
    listing_price = kv.get("listing_price")
    closing_price = kv.get("closing_price")
    listing_gain = kv.get("listing_gain")
    closing_gain = kv.get("closing_gain")

    if listing_price and issue_price and listing_gain is None:
        listing_gain = round((listing_price - issue_price) / issue_price * 100, 2)
    if closing_price and issue_price and closing_gain is None:
        closing_gain = round((closing_price - issue_price) / issue_price * 100, 2)

    if issue_price is None:
        if listing_price and listing_gain:
            try:
                issue_price = round(listing_price / (1 + listing_gain / 100), 2)
            except Exception:
                pass
        if issue_price is None and closing_price and closing_gain:
            try:
                issue_price = round(closing_price / (1 + closing_gain / 100), 2)
            except Exception:
                pass

    day_change = None
    if listing_price and closing_price and listing_price != 0:
        day_change = round((closing_price - listing_price) / listing_price * 100, 2)

    ipo_pe = val_kv.get("ipo_pe") or kv.get("ipo_pe")
    debt_equity = val_kv.get("debt_equity") or kv.get("debt_equity")
    ebitda = val_kv.get("ebitda") or kv.get("ebitda")
    pe_vs_sector = round(ipo_pe / avg_peer_pe, 2) if ipo_pe and avg_peer_pe else None

    def gmp_pct(v):
        if v == "" or not issue_price:
            return ""
        try:
            return round(float(v) / issue_price * 100, 8)
        except Exception:
            return ""

    sentiment = ""
    try:
        sentiment = round(min(math.log10(max(float(d3), 1)) / math.log10(300), 1.0), 2)
    except Exception:
        pass

    n3d = nifty_pct(nifty, listing_dt, 3)
    n1w = nifty_pct(nifty, listing_dt, 7)
    n1m = nifty_pct(nifty, listing_dt, 30)
    nwin = nifty_window_pct(nifty, open_dt, close_dt)

    row.update({
        "IPO Name": name,
        "Listing Date": listing_date_str,
        "Sector": kv.get("sector", ""),
        "Retail Quota (%)": retail_quota,
        "Issue Price Upper": issue_price or "",
        "Listing Price": listing_price or "",
        "Closing Price NSE": closing_price or "",
        "Listing Gain (%)": listing_gain or "",
        "Listing gains on closing Basis (%)": closing_gain or "",
        "Day Change After Listing (%)": day_change or "",
        "QIB Day3 Subscription": qib_d3,
        "HNI/NII Day3 Subscription": hni_d3,
        "Retail Day3 Subscription": ret_d3,
        "Day1 Subscription": d1,
        "Day2 Subscription": d2,
        "Day3 Subscription": d3,
        "GMP percentage D1": gmp_pct(gmp[0]),
        "GMP percentage D2": gmp_pct(gmp[1]),
        "GMP percentage D3": gmp_pct(gmp[2]),
        "GMP percentage D4": gmp_pct(gmp[3]),
        "GMP percentage D5": gmp_pct(gmp[4]),
        "Peer PE": avg_peer_pe or "",
        "Debt/Equity": debt_equity or "",
        "IPO PE": ipo_pe or "",
        "Latest EBIDTA": ebitda or "",
        "PE vs Sector Ratio": pe_vs_sector or "",
        "Nifty 3D Return (%)": n3d,
        "Nifty 1W Return (%)": n1w,
        "Nifty 1M Return (%)": n1m,
        "Nifty During IPO Window (%)": nwin,
        "Market Sentiment Score": sentiment,
        "Issue Size (Cr)": kv.get("issue_size", "") or "",
        "Fresh Issue": kv.get("fresh", "") or "",
        "OFS": kv.get("ofs", "") or "",
        "GMP Day-1": gmp[0],
        "GMP Day-2": gmp[1],
        "GMP Day-3": gmp[2],
        "GMP Day-4": gmp[3],
        "GMP Day-5": gmp[4],
    })

    print(f"   Issue={issue_price}  Listing={listing_price}({listing_gain}%)  "
          f"Sub_D3={d3}  GMP_D1={gmp[0]}")
    output_rows.append(row)
    time.sleep(SLEEP)

df = pd.DataFrame(output_rows, columns=COLUMNS)
out = "IPO_2025_SME.xlsx"
df.to_excel(out, index=False)
print(f"\n{'=' * 60}")
print(f"  OK  Saved {len(df)} rows  ->  {out}")
print(f"{'=' * 60}")
