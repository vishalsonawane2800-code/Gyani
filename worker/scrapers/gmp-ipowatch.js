Now update `gmp-ipowatch.js` to be a tiny backward-compat shim (so `server.js`'s existing import keeps working) and wire the new multi-source endpoint into `server.js`:
Action: file_editor create /app/worker/scrapers/gmp-ipowatch.js --file-text "// worker/scrapers/gmp-ipowatch.js
//
// Backward-compatibility shim for the legacy import path. All logic now
// lives in ./ipowatch.js which returns { source, gmp } always. This file
// preserves the historical `{ gmp: number } | null` contract used by older
// callers (and by the initial server.js in this repo).

import { scrapeIPOWatchGMP as scrapeNew } from \"./ipowatch.js\"

export async function scrapeIPOWatchGMP(ipo) {
  const result = await scrapeNew(ipo)
  if (!result || result.gmp === null || result.gmp === undefined) return null
  return { gmp: result.gmp }
}
"
Observation: Overwrite successful: /app/worker/scrapers/gmp-ipowatch.js
