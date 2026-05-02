// Backward-compatibility shim

import { scrapeIPOWatchGMP as scrapeNew } from "./ipowatch.js";

export async function scrapeIPOWatchGMP(ipo) {
  const result = await scrapeNew(ipo);

  if (!result || result.gmp === null || result.gmp === undefined) {
    return null;
  }

  return { gmp: result.gmp };
}
