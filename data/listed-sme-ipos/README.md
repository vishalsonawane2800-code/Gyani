# Listed SME IPOs - CSV Archive

This folder is the **source of truth** for the historical listed **SME** IPO
archive. It is a parallel dataset to `data/listed-ipos/` (mainboard) and uses
the **exact same CSV column layout** so the same parser, record type, and
downstream components can be reused.

Data is read from CSV at **build time** via the loader at
`lib/listed-sme-ipos/loader.ts`, which shares its parsing logic with the
mainboard loader (`lib/listed-ipos/_parse.ts`).

## How to add a year

1. Copy `_template.csv` into `<year>/<year>.csv` (e.g. `2025/2025.csv`).
2. Paste your SME rows under the header. One row per listed IPO.
3. Commit and push - the next build will pick up the new year automatically.

Two directory layouts are supported (in order of preference):

1. `data/listed-sme-ipos/<year>/<year>.csv` (recommended)
2. `data/listed-sme-ipos/<year>.csv` (flat fallback)

The loader also accepts any `*.csv` placed inside `<year>/`, so a
differently-named file (e.g. `2025/final.csv`) will still be discovered.

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

Identical to the mainboard archive. See
[`../listed-ipos/README.md`](../listed-ipos/README.md) for the full column
reference. Summary:

| Column                          | Unit        | Notes                                   |
|---------------------------------|-------------|-----------------------------------------|
| IPO Name                        | text        | Used to derive URL slug                 |
| Listing Date                    | date        | Used for sort + year bucket             |
| Sector                          | text        |                                         |
| Retail Quota (%)                | %           |                                         |
| Issue Price Upper               | INR         | Upper band of the issue price           |
| Listing Price (Rs)              | INR         | Open price on listing day               |
| Closing Price NSE               | INR         | Close price on listing day              |
| Listing Gain (%)                | %           | vs upper issue price, at open           |
| Listing gains on closing Basis  | %           | vs upper issue price, at close          |
| Day Change After Listing (%)    | %           | Day-1 -> Day-2 change                   |
| QIB Day3 Subscription           | x (times)   | Final QIB subscription                  |
| HNI/NII Day3 Subscription       | x (times)   | Final HNI/NII subscription              |
| Retail Day3 Subscription        | x (times)   | Final Retail subscription               |
| Day1-Day3 Subscription          | x           | Overall subscription per day            |
| GMP percentage D1..D5           | %           | GMP as % of issue price, per day        |
| Peer PE                         | number      | Industry peer PE                        |
| Debt/Equity                     | number      |                                         |
| IPO PE                          | number      |                                         |
| Latest EBIDTA                   | number      | INR Cr                                  |
| PE vs Sector Ratio              | number      |                                         |
| Nifty 3D / 1W / 1M Return (%)   | %           | Market context around listing           |
| Nifty During IPO Window (%)     | %           | Nifty move during issue-open window     |
| Market Sentiment Score          | 0-100       | Composite sentiment proxy               |
| Issue Size (Rs Cr)              | INR Cr      |                                         |
| Fresh Issue                     | INR Cr      |                                         |
| OFS                             | INR Cr      |                                         |
| GMP Day-1..Day-5                | INR         | Absolute GMP in rupees, per day         |

## Slugs

The URL slug is auto-derived from `IPO Name`:
- Lowercased
- Non-alphanumerics replaced with `-`
- Collapsed and trimmed

Example: `Apsis Aerocom Ltd.` -> slug `apsis-aerocom-ltd`.

## Loader API

```ts
import {
  getSmeAvailableYears,
  getListedSmeIposByYear,
  getListedSmeIpo,
  getAllListedSmeIpoParams,
  type ListedIpoRecord,
} from '@/lib/listed-sme-ipos/loader';
```

The `ListedIpoRecord` type is re-exported from the mainboard parser, so the
same UI components and table renderers can consume both archives.
