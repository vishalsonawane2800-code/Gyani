// scripts/verify-scrapers-e2e.ts
//
// End-to-end verification script for the GMP + Subscription scrapers.
//
// What it does (NO database writes):
//   1. Calls each scraper module with fixture IPOs that exist right now on
//      the live pages.
//   2. Prints what each source returned and whether it parsed sane numbers.
//   3. Exits non-zero if any "should pass" case came back null.
//
// Run with:
//   set -a && source /vercel/share/.env.project && set +a && \
//   pnpm exec tsx scripts/verify-scrapers-e2e.ts
//
// Fixtures below are pulled from the live listing pages as of 2026-04-20
// (the same snapshot captured in ai_ref/SCRAPER_CONTEXT.md). If those IPOs
// have since listed/closed, update the fixture names — the script's goal is
// simply to exercise each scraper against a name that currently appears on
// its source.

import { scrapeIPOWatchGMP } from "@/lib/scraper/sources/gmp-ipowatch"
import { scrapeIpojiGMP } from "@/lib/scraper/sources/gmp-ipoji"
import { scrapeChittorgarhSubscription } from "@/lib/scraper/sources/subscription-chittorgarh"
import { parseGMP } from "@/lib/scraper/parsers"

type GmpCase = {
  label: string
  ipo: { company_name: string; ipowatch_gmp_url?: string | null }
  shouldFind: boolean
}

type SubCase = {
  label: string
  ipo: { chittorgarh_url: string | null; company_name: string | null; slug?: string | null }
  shouldFind: boolean
}

const GMP_CASES: GmpCase[] = [
  {
    label: "IPOWatch listing - active SME IPO (Mehul Telecom)",
    ipo: { company_name: "Mehul Telecom", ipowatch_gmp_url: null },
    shouldFind: true,
  },
  {
    label: "IPOWatch listing - zero-GMP IPO (Adisoft Technologies)",
    // GMP of 0 is still a valid value, not a failure.
    ipo: { company_name: "Adisoft Technologies", ipowatch_gmp_url: null },
    shouldFind: true,
  },
  {
    label: "IPOWatch listing - non-existent IPO (must return null)",
    ipo: { company_name: "Definitely Not A Real IPO XYZ123", ipowatch_gmp_url: null },
    shouldFind: false,
  },
  {
    // Regression guard for the Apr-2026 name-match bug. DB carries the
    // long-form legal name "Citius Transnet Investment Trust InvIT" but
    // IPOWatch lists the row under just "Citius Transnet InvIT". The
    // shared name-match helper (lib/scraper/name-match.ts) must strip
    // "investment trust" + "invit" so both sides normalize to
    // "citius transnet" and the row matches. If Citius Transnet has since
    // closed / listed, swap this fixture for another live mainboard
    // InvIT / REIT — the point is the long-form-name → short-form-name
    // reduction, not this specific company.
    label: "IPOWatch listing - long-form InvIT name (Citius Transnet)",
    ipo: {
      company_name: "Citius Transnet Investment Trust InvIT",
      ipowatch_gmp_url: null,
    },
    shouldFind: true,
  },
  {
    label: "ipoji cards - active SME IPO (Mehul Telecom)",
    ipo: { company_name: "Mehul Telecom" },
    shouldFind: true,
  },
  {
    // Paired with the IPOWatch case above, but the assertion differs.
    // The point of THIS case: the shared name-match helper must still
    // LOCATE the ipoji card for the long-form DB name (otherwise the
    // scraper would throw or silently walk every card). But ipoji
    // renders its InvIT / REIT cards without an "Exp. Premium" stat
    // block at all (only Offer Price / Lot Size / Subscription /
    // Issue Size), so returning null here is the correct scraper
    // output. Treating it as 0 would collide with the
    // PropShare-Celestia post-close guard below — the two cards are
    // structurally identical on the list page, and the averaging
    // pipeline in app/api/cron/scrape-gmp/route.ts only requires
    // numeric data from AT LEAST ONE source (IPOWatch covers Citius).
    label: "ipoji cards - long-form InvIT name (Citius Transnet, no GMP expected)",
    ipo: { company_name: "Citius Transnet Investment Trust InvIT" },
    shouldFind: false,
  },
  {
    // PropShare Celestia is a mainboard REIT currently in "Allotment Awaited"
    // state on ipoji — its card intentionally has no "Exp. Premium" field,
    // so gmp=null is the correct outcome, not a failure.
    label: "ipoji cards - post-close IPO (PropShare Celestia, no GMP expected)",
    ipo: { company_name: "PropShare Celestia" },
    shouldFind: false,
  },
]

const SUB_CASES: SubCase[] = [
  {
    label: "Chittorgarh - no URL configured (must return null, no crash)",
    ipo: { chittorgarh_url: null, company_name: "Mehul Telecom", slug: "mehul-telecom" },
    shouldFind: false,
  },
  {
    label: "Chittorgarh - live mainboard IPO (Citius Transnet InvIT)",
    ipo: {
      chittorgarh_url: "https://www.chittorgarh.com/ipo/citius-transnet-invit-ipo/2862/",
      company_name: "Citius Transnet InvIT",
      slug: "citius-transnet-invit",
    },
    shouldFind: true,
  },
]

type Result = { label: string; ok: boolean; detail: string }

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "null"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

async function runGmp(c: GmpCase): Promise<Result> {
  const isIpoji = c.label.startsWith("ipoji")
  try {
    const out = isIpoji
      ? await scrapeIpojiGMP(c.ipo as { company_name: string })
      : await scrapeIPOWatchGMP(c.ipo)
    const gmp = out?.gmp ?? null
    const gotData = gmp !== null
    const ok = c.shouldFind ? gotData : !gotData
    return {
      label: c.label,
      ok,
      detail: `gmp=${fmt(gmp)} (expected ${c.shouldFind ? "value" : "null"})`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { label: c.label, ok: false, detail: `threw: ${msg}` }
  }
}

async function runSub(c: SubCase): Promise<Result> {
  try {
    const out = await scrapeChittorgarhSubscription(c.ipo)
    const gotData =
      !!out &&
      (out.total != null || out.retail != null || out.nii != null || out.qib != null)
    const ok = c.shouldFind ? gotData : !gotData
    return {
      label: c.label,
      ok,
      detail: `snapshot=${fmt(out)} (expected ${c.shouldFind ? "value" : "null"})`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { label: c.label, ok: false, detail: `threw: ${msg}` }
  }
}

type ParserCase = {
  label: string
  fn: () => unknown
  expected: unknown
}

const PARSER_CASES: ParserCase[] = [
  // Default behavior: dash / N/A / "—" → null (preserves backward compat).
  { label: "parseGMP('-') (no opts)            → null", fn: () => parseGMP("-"), expected: null },
  { label: "parseGMP('—') (no opts)            → null", fn: () => parseGMP("—"), expected: null },
  { label: "parseGMP('N/A') (no opts)          → null", fn: () => parseGMP("N/A"), expected: null },
  { label: "parseGMP('') (no opts)             → null", fn: () => parseGMP(""), expected: null },
  // Numeric values still parse correctly with or without options.
  { label: "parseGMP('₹0')                      → 0",    fn: () => parseGMP("₹0"), expected: 0 },
  { label: "parseGMP('₹ 5')                     → 5",    fn: () => parseGMP("₹ 5"), expected: 5 },
  { label: "parseGMP('150/-')                   → 150",  fn: () => parseGMP("150/-"), expected: 150 },
  // dashAsZero: true → dash placeholders become 0; truly empty stays null.
  { label: "parseGMP('-',  {dashAsZero})        → 0",    fn: () => parseGMP("-",  { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('—',  {dashAsZero})        → 0",    fn: () => parseGMP("—",  { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('–',  {dashAsZero})        → 0",    fn: () => parseGMP("–",  { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('--', {dashAsZero})        → 0",    fn: () => parseGMP("--", { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('₹-', {dashAsZero})        → 0",    fn: () => parseGMP("₹-", { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('N/A',{dashAsZero})        → 0",    fn: () => parseGMP("N/A",{ dashAsZero: true }), expected: 0 },
  { label: "parseGMP('NA', {dashAsZero})        → 0",    fn: () => parseGMP("NA", { dashAsZero: true }), expected: 0 },
  { label: "parseGMP('',   {dashAsZero})        → null", fn: () => parseGMP("",   { dashAsZero: true }), expected: null },
  { label: "parseGMP(null, {dashAsZero})        → null", fn: () => parseGMP(null, { dashAsZero: true }), expected: null },
  // dashAsZero must NOT affect real numbers.
  { label: "parseGMP('₹ 5', {dashAsZero})       → 5",    fn: () => parseGMP("₹ 5", { dashAsZero: true }), expected: 5 },
  { label: "parseGMP('₹0',  {dashAsZero})       → 0",    fn: () => parseGMP("₹0",  { dashAsZero: true }), expected: 0 },
]

function runParserCases(): Result[] {
  const out: Result[] = []
  for (const c of PARSER_CASES) {
    try {
      const got = c.fn()
      const ok = got === c.expected
      out.push({
        label: c.label,
        ok,
        detail: `got=${fmt(got)} expected=${fmt(c.expected)}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      out.push({ label: c.label, ok: false, detail: `threw: ${msg}` })
    }
  }
  return out
}

async function main(): Promise<void> {
  console.log("=".repeat(72))
  console.log("IPOGyani scraper e2e verification")
  console.log("Time:", new Date().toISOString())
  console.log("=".repeat(72))

  const results: Result[] = []

  console.log("\n--- parseGMP unit cases (dashAsZero contract) ---")
  for (const r of runParserCases()) {
    results.push(r)
    console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.label}`)
    if (!r.ok) console.log(`       ${r.detail}`)
  }

  console.log("\n--- GMP sources (IPOWatch, ipoji) ---")
  for (const c of GMP_CASES) {
    const r = await runGmp(c)
    results.push(r)
    console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.label}`)
    console.log(`       ${r.detail}`)
  }

  console.log("\n--- Subscription sources (Chittorgarh) ---")
  for (const c of SUB_CASES) {
    const r = await runSub(c)
    results.push(r)
    console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.label}`)
    console.log(`       ${r.detail}`)
  }

  const failed = results.filter((r) => !r.ok)
  console.log("\n" + "=".repeat(72))
  console.log(`Summary: ${results.length - failed.length}/${results.length} passed`)
  if (failed.length > 0) {
    console.log("\nFailures:")
    for (const f of failed) console.log(`  - ${f.label}: ${f.detail}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("verify-scrapers-e2e crashed:", err)
  process.exit(2)
})
