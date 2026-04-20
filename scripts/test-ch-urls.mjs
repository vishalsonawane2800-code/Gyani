function deriveSubscriptionUrl(detailUrl) {
  try {
    const u = new URL(detailUrl)
    if (!/chittorgarh\.com$/i.test(u.hostname)) return null
    const m = u.pathname.match(/^\/ipo\/([^/]+)\/(\d+)\/?$/)
    if (!m) return null
    const [, slug, id] = m
    return `https://www.chittorgarh.com/ipo_subscription/${slug}/${id}/`
  } catch {
    return null
  }
}

const tests = [
  "https://www.chittorgarh.com/ipo/sai-parenterals-ipo/2681/",
  "https://www.chittorgarh.com/ipo/sai-parenterals-ipo/2681",
  "https://www.chittorgarh.com/ipo_subscription/sai-parenterals-ipo/2681/",
  "https://www.chittorgarh.com/ipo/foo-ipo/",
  "https://other.com/ipo/foo/123/",
  null,
  "",
]
for (const t of tests) {
  console.log(JSON.stringify(t), "=>", t ? deriveSubscriptionUrl(t) : null)
}

// Live fetch check: do both URLs return 200?
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const urls = [
  "https://www.chittorgarh.com/ipo/sai-parenterals-ipo/2681/",
  "https://www.chittorgarh.com/ipo_subscription/sai-parenterals-ipo/2681/",
]
console.log("\n--- live fetch ---")
for (const u of urls) {
  const r = await fetch(u, { headers: { "User-Agent": UA } })
  const t = r.ok ? await r.text() : ""
  const tables = (t.match(/<table/g) || []).length
  console.log(`  ${u}\n    status=${r.status} tables=${tables} size=${t.length}`)
}
