# Listed IPOs - CSV Archive

This folder is the **source of truth** for the historical listed-IPO archive that powers:

- `/listed/<year>` - year index pages
- `/listed/<year>/<slug>` - per-IPO detail pages

Data is read from CSV at **build time** (via `generateStaticParams`), so there is
zero runtime database cost - pages are fully static and cached at the edge.

## How to add a year

1. Copy `_template.csv` to `<year>.csv` (e.g. `2024.csv`).
2. Paste your rows under the header. One row per listed IPO.
3. Commit and push - the next deploy will statically build:
   - `/listed/<year>` (sortable table)
   - `/listed/<year>/<company-slug>` (detail page per IPO)

## CSV format

- Comma-separated. UTF-8.
- First row MUST be the header exactly as in `_template.csv`.
- Empty cells are fine - use blank (`,,`) for missing data.
- Dates: `DD-MM-YYYY`, `DD/MM/YYYY` or `YYYY-MM-DD` all work.
- Numbers: no currency symbols, no thousand separators. Use `.` as decimal.
  - Good: `125.5`, `1450`, `-4.2`
  - Bad:  `Rs 125.50`, `1,450`, `4.2%`
- Wrap any value containing a comma in double quotes: `"Infra, Real Estate"`.

## Column reference

| Column                          | Unit        | Notes                                   |
|---------------------------------|-------------|-----------------------------------------|
| IPO Name                        | text        | Used to derive URL slug                 |
| Listing Date                    | date        | Used for sort + year bucket             |
| Sector                          | text        | e.g. "Fintech", "Pharma"                |
| Retail Quota (%)                | %           | Retail allocation of total issue        |
| Issue Price Upper               | INR         | Upper band of the issue price           |
| Listing Price (Rs)              | INR         | Open price on listing day               |
| Closing Price NSE               | INR         | Close price on listing day              |
| Listing Gain (%)                | %           | vs upper issue price, at open           |
| Listing gains on closing Basis  | %           | vs upper issue price, at close          |
| Day Change After Listing (%)    | %           | Day-1 -> Day-2 change                   |
| QIB Day3 Subscription           | x (times)   | Final QIB subscription                  |
| HNI/NII Day3 Subscription       | x (times)   | Final HNI/NII subscription              |
| Retail Day3 Subscription        | x (times)   | Final Retail subscription               |
| Day1 Subscription               | x           | Overall Day-1 subscription              |
| Day2 Subscription               | x           | Overall Day-2 subscription              |
| Day3 Subscription               | x           | Overall Day-3 (final) subscription      |
| GMP percentage D1..D5           | %           | GMP as % of issue price, per day        |
| Peer PE                         | number      | Industry peer PE                        |
| Debt/Equity                     | number      |                                         |
| IPO PE                          | number      |                                         |
| Latest EBIDTA                   | number      | INR Cr                                  |
| PE vs Sector Ratio              | number      | IPO PE / Peer PE                        |
| Nifty 3D Return (%)             | %           | Nifty 3-day return around listing       |
| Nifty 1W Return (%)             | %           |                                         |
| Nifty 1M Return (%)             | %           |                                         |
| Nifty During IPO Window (%)     | %           | Nifty move during issue-open window     |
| Market Sentiment Score          | 0-100       | Composite sentiment proxy               |
| Issue Size (Rs Cr)              | INR Cr      | Total issue size                        |
| Fresh Issue                     | INR Cr      |                                         |
| OFS                             | INR Cr      |                                         |
| GMP Day-1..Day-5                | INR         | Absolute GMP in rupees, per day         |

## Slugs

The URL slug is auto-derived from `IPO Name`:
- Lowercased
- Non-alphanumerics replaced with `-`
- Collapsed and trimmed

Example: `Tata Technologies Ltd.` -> `/listed/2023/tata-technologies-ltd`
