/**
 * Bulk Data Parsers for IPOGyani Admin Dashboard
 * 
 * These parsers allow admins to paste structured text data that gets
 * automatically mapped to database fields.
 * 
 * Supported formats:
 * 1. Financials - Key-value pairs for FY data
 * 2. Peer Comparison - Block-based format for competitor data
 * 3. GMP History - Entry-based format for historical GMP data
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FinancialData {
  fiscal_year: string
  revenue: number | null
  pat: number | null
  ebitda: number | null
  net_worth: number | null
  assets: number | null
  liabilities: number | null
  roe: number | null
  roce: number | null
  debt_equity: number | null
  eps: number | null
  book_value: number | null
}

export interface PeerCompany {
  company_name: string
  market_cap: number | null
  revenue: number | null
  pat: number | null
  pe_ratio: number | null
  pb_ratio: number | null
  roe: number | null
  roce: number | null
  debt_equity: number | null
  eps: number | null
  current_price: number | null
  is_ipo_company: boolean
}

export interface GMPEntry {
  date: string // YYYY-MM-DD
  gmp: number
  time_slot: 'morning' | 'evening'
}

export interface KPIEntry {
  kpi_type: 'dated' | 'pre_post'
  metric: string
  date_label?: string
  value?: number
  text_value?: string
}

export interface IssueDetailsData {
  total_issue_size_cr: number | null
  fresh_issue_cr: number | null
  fresh_issue_percent: number | null
  ofs_cr: number | null
  ofs_percent: number | null
  retail_quota_percent: number | null
  nii_quota_percent: number | null
  qib_quota_percent: number | null
  employee_quota_percent: number | null
  shareholder_quota_percent: number | null
  ipo_objectives: string[]
}

export interface SubscriptionEntry {
  date: string // YYYY-MM-DD
  time: string // e.g., "17:00" or "5:00 PM"
  day_number: number
  retail: number
  nii: number
  snii: number
  bnii: number
  qib: number
  total: number
  employee: number
  is_final: boolean
}

export interface ParseResult<T> {
  success: boolean
  data: T[]
  errors: string[]
}

// ============================================
// FINANCIALS PARSER
// ============================================

/**
 * Parse financial data from structured key-value text
 * 
 * Example input:
 * === FINANCIALS ===
 * FY23_REVENUE: 5.38
 * FY23_PAT: 0.23
 * FY23_EBITDA: 0.81
 * FY24_REVENUE: 7.82
 * FY24_PAT: 0.21
 * FY24_EBITDA: 1.29
 * FY25_REVENUE: 9.45
 * FY25_PAT: 0.67
 * FY25_EBITDA: 1.52
 * ROE: 40.26
 * ROCE: 46.85
 * DEBT_EQUITY: 0.15
 * EPS: 3.97
 * BOOK_VALUE: 12.50
 * === END ===
 */
export function parseFinancials(text: string): ParseResult<FinancialData> {
  const result: ParseResult<FinancialData> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  // Clean the text
  const cleanText = text.trim()
  
  // Parse key-value pairs
  const lines = cleanText.split('\n')
  const values: Record<string, number | null> = {}
  
  // Common ratios that apply to all years
  let commonRoe: number | null = null
  let commonRoce: number | null = null
  let commonDebtEquity: number | null = null
  let commonEps: number | null = null
  let commonBookValue: number | null = null
  
  for (const line of lines) {
    // Skip section markers and empty lines
    if (line.includes('===') || !line.trim()) continue
    
    const match = line.match(/^([A-Z0-9_]+)\s*:\s*(.+)$/i)
    if (match) {
      const [, key, valueStr] = match
      const value = parseFloat(valueStr.replace(/[₹,\s]/g, ''))
      
      if (!isNaN(value)) {
        const upperKey = key.toUpperCase()
        
        // Handle common ratios (not FY-specific)
        if (upperKey === 'ROE') {
          commonRoe = value
        } else if (upperKey === 'ROCE') {
          commonRoce = value
        } else if (upperKey === 'DEBT_EQUITY' || upperKey === 'DEBTEQUITY') {
          commonDebtEquity = value
        } else if (upperKey === 'EPS') {
          commonEps = value
        } else if (upperKey === 'BOOK_VALUE' || upperKey === 'BOOKVALUE') {
          commonBookValue = value
        } else {
          values[upperKey] = value
        }
      }
    }
  }
  
  // Group by fiscal year
  const fyPattern = /^FY(\d{2,4})_(.+)$/
  const yearData: Record<string, Partial<FinancialData>> = {}
  
  for (const [key, value] of Object.entries(values)) {
    const fyMatch = key.match(fyPattern)
    if (fyMatch) {
      let year = fyMatch[1]
      // Normalize year to 2-digit format
      if (year.length === 4) {
        year = year.slice(-2)
      }
      const field = fyMatch[2]
      
      if (!yearData[year]) {
        yearData[year] = { fiscal_year: `FY${year}` }
      }
      
      switch (field.toUpperCase()) {
        case 'REVENUE':
          yearData[year].revenue = value
          break
        case 'PAT':
        case 'PROFIT':
          yearData[year].pat = value
          break
        case 'EBITDA':
          yearData[year].ebitda = value
          break
        case 'NET_WORTH':
        case 'NETWORTH':
          yearData[year].net_worth = value
          break
        case 'ASSETS':
          yearData[year].assets = value
          break
        case 'LIABILITIES':
          yearData[year].liabilities = value
          break
        case 'ROE':
          yearData[year].roe = value
          break
        case 'ROCE':
          yearData[year].roce = value
          break
        case 'DEBT_EQUITY':
        case 'DEBTEQUITY':
          yearData[year].debt_equity = value
          break
        case 'EPS':
          yearData[year].eps = value
          break
        case 'BOOK_VALUE':
        case 'BOOKVALUE':
          yearData[year].book_value = value
          break
      }
    }
  }
  
  // Convert to array and apply common ratios
  for (const year of Object.keys(yearData).sort()) {
    const data: FinancialData = {
      fiscal_year: yearData[year].fiscal_year || `FY${year}`,
      revenue: yearData[year].revenue ?? null,
      pat: yearData[year].pat ?? null,
      ebitda: yearData[year].ebitda ?? null,
      net_worth: yearData[year].net_worth ?? null,
      assets: yearData[year].assets ?? null,
      liabilities: yearData[year].liabilities ?? null,
      roe: yearData[year].roe ?? commonRoe,
      roce: yearData[year].roce ?? commonRoce,
      debt_equity: yearData[year].debt_equity ?? commonDebtEquity,
      eps: yearData[year].eps ?? commonEps,
      book_value: yearData[year].book_value ?? commonBookValue,
    }
    result.data.push(data)
  }
  
  if (result.data.length === 0) {
    result.errors.push('No valid financial data found. Use format: FY23_REVENUE: 5.38')
  } else {
    result.success = true
  }
  
  return result
}

// ============================================
// PEER COMPARISON PARSER
// ============================================

/**
 * Parse peer comparison data from block-based text
 * 
 * Example input:
 * === PEER_COMPARISON ===
 * --- PEER 1 ---
 * NAME: Tata Power
 * MARKET_CAP: 145000
 * REVENUE: 58000
 * PAT: 4200
 * PE_RATIO: 34.5
 * PB_RATIO: 3.2
 * ROE: 12.5
 * --- PEER 2 ---
 * NAME: Adani Power
 * MARKET_CAP: 230000
 * PE_RATIO: 12.3
 * ROE: 18.2
 * --- IPO_COMPANY ---
 * NAME: Om Power Transmission
 * PE_RATIO: 22.5
 * === END ===
 */
export function parsePeerComparison(text: string): ParseResult<PeerCompany> {
  const result: ParseResult<PeerCompany> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  // Split into blocks
  const blocks = text.split(/---\s*(?:PEER\s*\d*|IPO_COMPANY)\s*---/i)
  
  for (const block of blocks) {
    if (!block.trim() || block.includes('===')) continue
    
    const peer: Partial<PeerCompany> = {
      is_ipo_company: block.toLowerCase().includes('ipo_company') || 
                      text.split(block)[0]?.toLowerCase().includes('ipo_company')
    }
    
    const lines = block.split('\n')
    
    for (const line of lines) {
      if (!line.trim() || line.includes('===')) continue
      
      const match = line.match(/^([A-Z_]+)\s*:\s*(.+)$/i)
      if (match) {
        const [, key, valueStr] = match
        const upperKey = key.toUpperCase()
        
        if (upperKey === 'NAME' || upperKey === 'COMPANY_NAME' || upperKey === 'COMPANY') {
          peer.company_name = valueStr.trim()
        } else {
          const value = parseFloat(valueStr.replace(/[₹,\s]/g, ''))
          if (!isNaN(value)) {
            switch (upperKey) {
              case 'MARKET_CAP':
              case 'MARKETCAP':
              case 'MCAP':
                peer.market_cap = value
                break
              case 'REVENUE':
                peer.revenue = value
                break
              case 'PAT':
              case 'PROFIT':
                peer.pat = value
                break
              case 'PE_RATIO':
              case 'PE':
              case 'P_E':
                peer.pe_ratio = value
                break
              case 'PB_RATIO':
              case 'PB':
              case 'P_B':
                peer.pb_ratio = value
                break
              case 'ROE':
                peer.roe = value
                break
              case 'ROCE':
                peer.roce = value
                break
              case 'DEBT_EQUITY':
              case 'DEBTEQUITY':
              case 'D_E':
                peer.debt_equity = value
                break
              case 'EPS':
                peer.eps = value
                break
              case 'PRICE':
              case 'CURRENT_PRICE':
              case 'CMP':
                peer.current_price = value
                break
              case 'IS_IPO':
              case 'IPO':
                peer.is_ipo_company = value === 1 || valueStr.toLowerCase() === 'true' || valueStr.toLowerCase() === 'yes'
                break
            }
          }
        }
      }
    }
    
    // Only add if we have at least a company name
    if (peer.company_name) {
      result.data.push({
        company_name: peer.company_name,
        market_cap: peer.market_cap ?? null,
        revenue: peer.revenue ?? null,
        pat: peer.pat ?? null,
        pe_ratio: peer.pe_ratio ?? null,
        pb_ratio: peer.pb_ratio ?? null,
        roe: peer.roe ?? null,
        roce: peer.roce ?? null,
        debt_equity: peer.debt_equity ?? null,
        eps: peer.eps ?? null,
        current_price: peer.current_price ?? null,
        is_ipo_company: peer.is_ipo_company ?? false,
      })
    }
  }
  
  if (result.data.length === 0) {
    result.errors.push('No valid peer companies found. Use format: --- PEER 1 --- followed by NAME: Company')
  } else {
    result.success = true
  }
  
  return result
}

// ============================================
// GMP HISTORY PARSER
// ============================================

/**
 * Parse GMP history data from entry-based text
 * 
 * Example input:
 * === GMP_HISTORY ===
 * --- ENTRY ---
 * DATE: 2026-04-10
 * TIME_SLOT: morning
 * GMP: 2.5
 * --- ENTRY ---
 * DATE: 2026-04-10
 * TIME_SLOT: evening
 * GMP: 3.0
 * --- ENTRY ---
 * DATE: 2026-04-09
 * TIME_SLOT: morning
 * GMP: 3.5
 * === END ===
 */
export function parseGMPHistory(text: string): ParseResult<GMPEntry> {
  const result: ParseResult<GMPEntry> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  // Split into entry blocks
  const entryBlocks = text.split(/---\s*ENTRY\s*---/i)
  
  for (const block of entryBlocks) {
    if (!block.trim() || block.includes('===')) continue
    
    const entry: Partial<GMPEntry> = {}
    const lines = block.split('\n')
    
    for (const line of lines) {
      if (!line.trim() || line.includes('===')) continue
      
      const match = line.match(/^([A-Z_]+)\s*:\s*(.+)$/i)
      if (match) {
        const [, key, value] = match
        const upperKey = key.toUpperCase()
        
        switch (upperKey) {
          case 'DATE':
            // Support various date formats and convert to YYYY-MM-DD
            const dateStr = value.trim()
            // Try YYYY-MM-DD format first
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              entry.date = dateStr
            } 
            // Try DD-MM-YYYY format
            else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('-')
              entry.date = `${yyyy}-${mm}-${dd}`
            }
            // Try DD/MM/YYYY format
            else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('/')
              entry.date = `${yyyy}-${mm}-${dd}`
            }
            break
          case 'TIME_SLOT':
          case 'TIMESLOT':
          case 'SLOT':
            const slot = value.trim().toLowerCase()
            if (slot === 'morning' || slot === 'evening') {
              entry.time_slot = slot
            } else if (slot === 'am' || slot === '12pm' || slot === '12:00') {
              entry.time_slot = 'morning'
            } else if (slot === 'pm' || slot === '10pm' || slot === '22:00') {
              entry.time_slot = 'evening'
            }
            break
          case 'GMP':
            const gmpValue = parseFloat(value.replace(/[₹Rs.,\s]/g, ''))
            if (!isNaN(gmpValue)) {
              entry.gmp = gmpValue
            }
            break
        }
      }
    }
    
    // Validate and add entry
    if (entry.date && entry.gmp !== undefined) {
      result.data.push({
        date: entry.date,
        gmp: entry.gmp,
        time_slot: entry.time_slot || 'morning', // Default to morning if not specified
      })
    }
  }
  
  if (result.data.length === 0) {
    result.errors.push('No valid GMP entries found. Use format: --- ENTRY --- followed by DATE: and GMP:')
  } else {
    result.success = true
  }
  
  return result
}

// ============================================
// KPI PARSER
// ============================================

/**
 * Parse KPI data from structured text
 * 
 * Example input:
 * === KPI ===
 * DATE_LABEL_1: Dec 31, 2025
 * DATE_LABEL_2: Mar 31, 2025
 * ROE_1: 24.28
 * ROE_2: 35.83
 * ROCE_1: 26.53
 * ROCE_2: 41.76
 * DEBT_EQUITY_1: 0.32
 * DEBT_EQUITY_2: 0.26
 * RONW_1: 19.50
 * RONW_2: 30.40
 * PAT_MARGIN_1: 8.45
 * PAT_MARGIN_2: 7.84
 * EBITDA_MARGIN_1: 12.38
 * EBITDA_MARGIN_2: 12.66
 * PRICE_TO_BOOK: 5.93
 * EPS_PRE: 8.28
 * EPS_POST: 9.10
 * PE_PRE: 21.13
 * PE_POST: 19.23
 * PROMOTER_HOLDING_PRE: 92.26
 * PROMOTER_HOLDING_POST: 68.92
 * MARKET_CAP: 599.29
 * PROMOTERS: Kalpesh Dhanjibhai Patel, Kanubhai Patel and Vasantkumar Narayanbhai Patel are the company's promoters.
 * DISCLAIMER: The financial data is based on...
 * === END ===
 */
export function parseKPI(text: string): ParseResult<KPIEntry> {
  const result: ParseResult<KPIEntry> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  const lines = text.split('\n')
  const values: Record<string, string> = {}
  
  for (const line of lines) {
    if (line.includes('===') || !line.trim()) continue
    
    const match = line.match(/^([A-Z0-9_]+)\s*:\s*(.+)$/i)
    if (match) {
      values[match[1].toUpperCase()] = match[2].trim()
    }
  }

  // Extract date labels
  const dateLabels = [values.DATE_LABEL_1, values.DATE_LABEL_2].filter(Boolean)

  // Dated KPIs (with _1 and _2 suffixes)
  const datedMetrics = ['ROE', 'ROCE', 'DEBT_EQUITY', 'RONW', 'PAT_MARGIN', 'EBITDA_MARGIN']
  
  for (const metric of datedMetrics) {
    const val1 = values[`${metric}_1`]
    const val2 = values[`${metric}_2`]
    
    if (val1 && dateLabels[0]) {
      const value = parseFloat(val1)
      if (!isNaN(value)) {
        result.data.push({
          kpi_type: 'dated',
          metric: metric.toLowerCase(),
          date_label: dateLabels[0],
          value,
        })
      }
    }
    if (val2 && dateLabels[1]) {
      const value = parseFloat(val2)
      if (!isNaN(value)) {
        result.data.push({
          kpi_type: 'dated',
          metric: metric.toLowerCase(),
          date_label: dateLabels[1],
          value,
        })
      }
    }
  }

  // Price to book (single value)
  if (values.PRICE_TO_BOOK) {
    const value = parseFloat(values.PRICE_TO_BOOK)
    if (!isNaN(value)) {
      result.data.push({
        kpi_type: 'dated',
        metric: 'price_to_book',
        value,
      })
    }
  }

  // Pre/Post IPO metrics
  const prePostMetrics = ['EPS', 'PE', 'PROMOTER_HOLDING']
  
  for (const metric of prePostMetrics) {
    const preVal = values[`${metric}_PRE`]
    const postVal = values[`${metric}_POST`]
    
    if (preVal) {
      const value = parseFloat(preVal)
      if (!isNaN(value)) {
        result.data.push({
          kpi_type: 'pre_post',
          metric: metric.toLowerCase(),
          date_label: 'pre',
          value,
        })
      }
    }
    if (postVal) {
      const value = parseFloat(postVal)
      if (!isNaN(value)) {
        result.data.push({
          kpi_type: 'pre_post',
          metric: metric.toLowerCase(),
          date_label: 'post',
          value,
        })
      }
    }
  }

  // Market Cap
  if (values.MARKET_CAP) {
    const value = parseFloat(values.MARKET_CAP)
    if (!isNaN(value)) {
      result.data.push({
        kpi_type: 'pre_post',
        metric: 'market_cap',
        value,
      })
    }
  }

  // Text fields
  if (values.PROMOTERS) {
    result.data.push({
      kpi_type: 'pre_post',
      metric: 'promoters',
      text_value: values.PROMOTERS,
    })
  }
  if (values.DISCLAIMER) {
    result.data.push({
      kpi_type: 'pre_post',
      metric: 'disclaimer',
      text_value: values.DISCLAIMER,
    })
  }

  if (result.data.length === 0) {
    result.errors.push('No valid KPI data found. Use format: ROE_1: 24.28')
  } else {
    result.success = true
  }

  return result
}

// ============================================
// ISSUE DETAILS PARSER
// ============================================

/**
 * Parse issue details data from structured text
 * 
 * Example input:
 * === ISSUE_DETAILS ===
 * TOTAL_ISSUE_SIZE_CR: 150
 * FRESH_ISSUE_CR: 100
 * FRESH_ISSUE_PERCENT: 66.67
 * OFS_CR: 50
 * OFS_PERCENT: 33.33
 * RETAIL_QUOTA_PERCENT: 35
 * NII_QUOTA_PERCENT: 15
 * QIB_QUOTA_PERCENT: 50
 * EMPLOYEE_QUOTA_PERCENT: 0
 * SHAREHOLDER_QUOTA_PERCENT: 0
 * OBJECTIVE_1: Working capital requirements
 * OBJECTIVE_2: Repayment of borrowings
 * OBJECTIVE_3: General corporate purposes
 * === END ===
 */
export function parseIssueDetails(text: string): ParseResult<IssueDetailsData> {
  const result: ParseResult<IssueDetailsData> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  const lines = text.split('\n')
  const values: Record<string, string> = {}
  const objectives: string[] = []
  
  for (const line of lines) {
    if (line.includes('===') || !line.trim()) continue
    
    const match = line.match(/^([A-Z0-9_]+)\s*:\s*(.+)$/i)
    if (match) {
      const key = match[1].toUpperCase()
      const value = match[2].trim()
      
      // Handle objectives separately
      if (key.startsWith('OBJECTIVE_') || key === 'OBJECTIVE') {
        objectives.push(value)
      } else {
        values[key] = value
      }
    }
  }

  // Parse numeric values
  const parseNum = (key: string): number | null => {
    const val = values[key]
    if (!val) return null
    const num = parseFloat(val.replace(/[₹Rs,\s]/g, ''))
    return isNaN(num) ? null : num
  }

  const issueDetails: IssueDetailsData = {
    total_issue_size_cr: parseNum('TOTAL_ISSUE_SIZE_CR') ?? parseNum('TOTAL_ISSUE_SIZE') ?? parseNum('ISSUE_SIZE'),
    fresh_issue_cr: parseNum('FRESH_ISSUE_CR') ?? parseNum('FRESH_ISSUE'),
    fresh_issue_percent: parseNum('FRESH_ISSUE_PERCENT'),
    ofs_cr: parseNum('OFS_CR') ?? parseNum('OFS'),
    ofs_percent: parseNum('OFS_PERCENT'),
    retail_quota_percent: parseNum('RETAIL_QUOTA_PERCENT') ?? parseNum('RETAIL_QUOTA') ?? parseNum('RETAIL'),
    nii_quota_percent: parseNum('NII_QUOTA_PERCENT') ?? parseNum('NII_QUOTA') ?? parseNum('NII'),
    qib_quota_percent: parseNum('QIB_QUOTA_PERCENT') ?? parseNum('QIB_QUOTA') ?? parseNum('QIB'),
    employee_quota_percent: parseNum('EMPLOYEE_QUOTA_PERCENT') ?? parseNum('EMPLOYEE_QUOTA') ?? parseNum('EMPLOYEE'),
    shareholder_quota_percent: parseNum('SHAREHOLDER_QUOTA_PERCENT') ?? parseNum('SHAREHOLDER_QUOTA') ?? parseNum('SHAREHOLDER'),
    ipo_objectives: objectives,
  }

  // Validate - at minimum we need total issue size
  if (issueDetails.total_issue_size_cr === null && issueDetails.fresh_issue_cr === null) {
    result.errors.push('Missing required field: TOTAL_ISSUE_SIZE_CR or FRESH_ISSUE_CR')
    return result
  }

  // If total not provided but fresh + ofs are, calculate it
  if (issueDetails.total_issue_size_cr === null && issueDetails.fresh_issue_cr !== null) {
    issueDetails.total_issue_size_cr = (issueDetails.fresh_issue_cr || 0) + (issueDetails.ofs_cr || 0)
  }

  // Calculate percentages if not provided
  if (issueDetails.total_issue_size_cr && issueDetails.total_issue_size_cr > 0) {
    if (issueDetails.fresh_issue_percent === null && issueDetails.fresh_issue_cr !== null) {
      issueDetails.fresh_issue_percent = Math.round((issueDetails.fresh_issue_cr / issueDetails.total_issue_size_cr) * 100 * 100) / 100
    }
    if (issueDetails.ofs_percent === null && issueDetails.ofs_cr !== null) {
      issueDetails.ofs_percent = Math.round((issueDetails.ofs_cr / issueDetails.total_issue_size_cr) * 100 * 100) / 100
    }
  }

  result.data.push(issueDetails)
  result.success = true
  
  return result
}

// ============================================
// SUBSCRIPTION HISTORY PARSER
// ============================================

/**
 * Parse subscription history data from structured text
 * 
 * Example input:
 * === SUBSCRIPTION_HISTORY ===
 * --- ENTRY ---
 * DATE: 2026-04-10
 * TIME: 17:00
 * DAY: 1
 * RETAIL: 0.45
 * NII: 0.23
 * SNII: 0.12
 * BNII: 0.11
 * QIB: 0.05
 * TOTAL: 0.25
 * EMPLOYEE: 0
 * IS_FINAL: false
 * --- ENTRY ---
 * DATE: 2026-04-11
 * TIME: 17:00
 * DAY: 2
 * RETAIL: 1.85
 * NII: 0.98
 * QIB: 0.45
 * TOTAL: 1.12
 * === END ===
 */
export function parseSubscriptionHistory(text: string): ParseResult<SubscriptionEntry> {
  const result: ParseResult<SubscriptionEntry> = { success: false, data: [], errors: [] }
  
  if (!text || typeof text !== 'string') {
    result.errors.push('No text provided')
    return result
  }

  // Split into entry blocks
  const entryBlocks = text.split(/---\s*ENTRY\s*---/i)
  
  for (const block of entryBlocks) {
    if (!block.trim() || block.includes('===')) continue
    
    const entry: Partial<SubscriptionEntry> = {
      snii: 0,
      bnii: 0,
      employee: 0,
      is_final: false,
    }
    const lines = block.split('\n')
    
    for (const line of lines) {
      if (!line.trim() || line.includes('===')) continue
      
      const match = line.match(/^([A-Z_]+)\s*:\s*(.+)$/i)
      if (match) {
        const [, key, value] = match
        const upperKey = key.toUpperCase()
        
        switch (upperKey) {
          case 'DATE':
            // Support various date formats and convert to YYYY-MM-DD
            const dateStr = value.trim()
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              entry.date = dateStr
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('-')
              entry.date = `${yyyy}-${mm}-${dd}`
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('/')
              entry.date = `${yyyy}-${mm}-${dd}`
            }
            break
          case 'TIME':
            entry.time = value.trim()
            break
          case 'DAY':
          case 'DAY_NUMBER':
            entry.day_number = parseInt(value) || 1
            break
          case 'RETAIL':
            entry.retail = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'NII':
            entry.nii = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'SNII':
          case 'S_NII':
            entry.snii = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'BNII':
          case 'B_NII':
            entry.bnii = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'QIB':
            entry.qib = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'TOTAL':
            entry.total = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'EMPLOYEE':
            entry.employee = parseFloat(value.replace(/[x,\s]/g, '')) || 0
            break
          case 'IS_FINAL':
          case 'FINAL':
            entry.is_final = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1'
            break
        }
      }
    }
    
    // Validate and add entry - need at minimum date and retail
    if (entry.date && entry.retail !== undefined) {
      result.data.push({
        date: entry.date,
        time: entry.time || '17:00',
        day_number: entry.day_number || 1,
        retail: entry.retail || 0,
        nii: entry.nii || 0,
        snii: entry.snii || 0,
        bnii: entry.bnii || 0,
        qib: entry.qib || 0,
        total: entry.total || 0,
        employee: entry.employee || 0,
        is_final: entry.is_final || false,
      })
    }
  }
  
  if (result.data.length === 0) {
    result.errors.push('No valid subscription entries found. Use format: --- ENTRY --- followed by DATE: and RETAIL:')
  } else {
    result.success = true
  }
  
  return result
}

// ============================================
// FORMAT TEMPLATES (for display in UI)
// ============================================

export const FINANCIALS_TEMPLATE = `=== FINANCIALS ===
FY23_REVENUE: 5.38
FY23_PAT: 0.23
FY23_EBITDA: 0.81
FY24_REVENUE: 7.82
FY24_PAT: 0.21
FY24_EBITDA: 1.29
FY25_REVENUE: 9.45
FY25_PAT: 0.67
FY25_EBITDA: 1.52
ROE: 40.26
ROCE: 46.85
DEBT_EQUITY: 0.15
EPS: 3.97
BOOK_VALUE: 12.50
=== END ===`

export const PEER_COMPARISON_TEMPLATE = `=== PEER_COMPARISON ===
--- PEER 1 ---
NAME: Tata Power
MARKET_CAP: 145000
REVENUE: 58000
PAT: 4200
PE_RATIO: 34.5
PB_RATIO: 3.2
ROE: 12.5
--- PEER 2 ---
NAME: Adani Power
MARKET_CAP: 230000
REVENUE: 45000
PAT: 6800
PE_RATIO: 12.3
ROE: 18.2
--- IPO_COMPANY ---
NAME: Om Power Transmission
MARKET_CAP: 500
PE_RATIO: 22.5
ROE: 40.26
=== END ===`

export const GMP_HISTORY_TEMPLATE = `=== GMP_HISTORY ===
--- ENTRY ---
DATE: 2026-04-10
TIME_SLOT: morning
GMP: 2.5
--- ENTRY ---
DATE: 2026-04-10
TIME_SLOT: evening
GMP: 3.0
--- ENTRY ---
DATE: 2026-04-09
TIME_SLOT: morning
GMP: 3.5
--- ENTRY ---
DATE: 2026-04-09
TIME_SLOT: evening
GMP: 4.0
=== END ===`

export const KPI_TEMPLATE = `=== KPI ===
DATE_LABEL_1: Dec 31, 2025
DATE_LABEL_2: Mar 31, 2025
ROE_1: 24.28
ROE_2: 35.83
ROCE_1: 26.53
ROCE_2: 41.76
DEBT_EQUITY_1: 0.32
DEBT_EQUITY_2: 0.26
RONW_1: 19.50
RONW_2: 30.40
PAT_MARGIN_1: 8.45
PAT_MARGIN_2: 7.84
EBITDA_MARGIN_1: 12.38
EBITDA_MARGIN_2: 12.66
PRICE_TO_BOOK: 5.93
EPS_PRE: 8.28
EPS_POST: 9.10
PE_PRE: 21.13
PE_POST: 19.23
PROMOTER_HOLDING_PRE: 92.26
PROMOTER_HOLDING_POST: 68.92
MARKET_CAP: 599.29
PROMOTERS: Kalpesh Dhanjibhai Patel, Kanubhai Patel and Vasantkumar are the company's promoters.
DISCLAIMER: The financial data is based on the company's DRHP and RHP.
=== END ===`

export const ISSUE_DETAILS_TEMPLATE = `=== ISSUE_DETAILS ===
TOTAL_ISSUE_SIZE_CR: 150
FRESH_ISSUE_CR: 100
FRESH_ISSUE_PERCENT: 66.67
OFS_CR: 50
OFS_PERCENT: 33.33
RETAIL_QUOTA_PERCENT: 35
NII_QUOTA_PERCENT: 15
QIB_QUOTA_PERCENT: 50
EMPLOYEE_QUOTA_PERCENT: 0
SHAREHOLDER_QUOTA_PERCENT: 0
OBJECTIVE_1: Working capital requirements
OBJECTIVE_2: Repayment of borrowings
OBJECTIVE_3: Capital expenditure for expansion
OBJECTIVE_4: General corporate purposes
=== END ===`

export const SUBSCRIPTION_HISTORY_TEMPLATE = `=== SUBSCRIPTION_HISTORY ===
--- ENTRY ---
DATE: 2026-04-10
TIME: 17:00
DAY: 1
RETAIL: 0.45
NII: 0.23
SNII: 0.12
BNII: 0.11
QIB: 0.05
TOTAL: 0.25
EMPLOYEE: 0
IS_FINAL: false
--- ENTRY ---
DATE: 2026-04-11
TIME: 17:00
DAY: 2
RETAIL: 1.85
NII: 0.98
QIB: 0.45
TOTAL: 1.12
--- ENTRY ---
DATE: 2026-04-12
TIME: 17:00
DAY: 3
RETAIL: 5.24
NII: 3.12
QIB: 2.45
TOTAL: 3.85
IS_FINAL: true
=== END ===`

// AI Prompt templates for generating formatted data
export const AI_PROMPTS = {
  financials: `Convert the following financial data into this exact format:
=== FINANCIALS ===
FY23_REVENUE: [value in Cr]
FY23_PAT: [value in Cr]
FY23_EBITDA: [value in Cr]
FY24_REVENUE: [value in Cr]
FY24_PAT: [value in Cr]
FY24_EBITDA: [value in Cr]
FY25_REVENUE: [value in Cr]
FY25_PAT: [value in Cr]
FY25_EBITDA: [value in Cr]
ROE: [percentage]
ROCE: [percentage]
DEBT_EQUITY: [ratio]
EPS: [value]
BOOK_VALUE: [value]
=== END ===

Use only the fiscal years available. Leave out any field without data.`,

  peerComparison: `Convert the following peer comparison data into this exact format:
=== PEER_COMPARISON ===
--- PEER 1 ---
NAME: [Company Name]
MARKET_CAP: [value in Cr]
REVENUE: [value in Cr]
PAT: [value in Cr]
PE_RATIO: [value]
PB_RATIO: [value]
ROE: [percentage]
--- PEER 2 ---
NAME: [Company Name]
[repeat fields]
--- IPO_COMPANY ---
NAME: [IPO Company Name]
[repeat fields]
=== END ===

Use "IPO_COMPANY" marker for the company that is doing the IPO. List all available metrics.`,

  gmpHistory: `Convert the following GMP history data into this exact format:
=== GMP_HISTORY ===
--- ENTRY ---
DATE: [YYYY-MM-DD]
TIME_SLOT: [morning/evening]
GMP: [value]
--- ENTRY ---
[repeat for each entry]
=== END ===

Use "morning" for 12 PM data and "evening" for 10 PM data.`,

  kpi: `Convert the following KPI data into this exact format:
=== KPI ===
DATE_LABEL_1: [First date, e.g., Dec 31, 2025]
DATE_LABEL_2: [Second date, e.g., Mar 31, 2025]
ROE_1: [ROE % for first date]
ROE_2: [ROE % for second date]
ROCE_1: [ROCE % for first date]
ROCE_2: [ROCE % for second date]
DEBT_EQUITY_1: [D/E ratio for first date]
DEBT_EQUITY_2: [D/E ratio for second date]
RONW_1: [RoNW % for first date]
RONW_2: [RoNW % for second date]
PAT_MARGIN_1: [PAT Margin % for first date]
PAT_MARGIN_2: [PAT Margin % for second date]
EBITDA_MARGIN_1: [EBITDA Margin % for first date]
EBITDA_MARGIN_2: [EBITDA Margin % for second date]
PRICE_TO_BOOK: [Price to Book Value ratio]
EPS_PRE: [EPS before IPO]
EPS_POST: [EPS after IPO]
PE_PRE: [P/E ratio before IPO]
PE_POST: [P/E ratio after IPO]
PROMOTER_HOLDING_PRE: [Promoter holding % before IPO]
PROMOTER_HOLDING_POST: [Promoter holding % after IPO]
MARKET_CAP: [Market Cap in Cr]
PROMOTERS: [Promoter names and description]
DISCLAIMER: [Any disclaimer text]
=== END ===

Use _1 suffix for first date column and _2 suffix for second date column. Use _PRE for pre-IPO and _POST for post-IPO values.`,

  issueDetails: `Convert the following issue details data into this exact format:
=== ISSUE_DETAILS ===
TOTAL_ISSUE_SIZE_CR: [Total issue size in Cr]
FRESH_ISSUE_CR: [Fresh issue amount in Cr]
FRESH_ISSUE_PERCENT: [Fresh issue percentage]
OFS_CR: [OFS amount in Cr, or 0 if no OFS]
OFS_PERCENT: [OFS percentage, or 0 if no OFS]
RETAIL_QUOTA_PERCENT: [Retail quota %]
NII_QUOTA_PERCENT: [NII quota %]
QIB_QUOTA_PERCENT: [QIB quota %]
EMPLOYEE_QUOTA_PERCENT: [Employee quota %, or 0]
SHAREHOLDER_QUOTA_PERCENT: [Shareholder quota %, or 0]
OBJECTIVE_1: [First IPO objective]
OBJECTIVE_2: [Second IPO objective]
OBJECTIVE_3: [Third IPO objective]
[Add more OBJECTIVE_N for additional objectives]
=== END ===

List all objectives of the issue from the DRHP/RHP. Use 0 for any quota not mentioned.`,

  subscriptionHistory: `Convert the following subscription data into this exact format:
=== SUBSCRIPTION_HISTORY ===
--- ENTRY ---
DATE: [YYYY-MM-DD]
TIME: [HH:MM, e.g., 17:00]
DAY: [Day number 1, 2, or 3]
RETAIL: [Retail subscription times, e.g., 1.85]
NII: [NII subscription times]
SNII: [sNII subscription times, if available]
BNII: [bNII subscription times, if available]
QIB: [QIB subscription times]
TOTAL: [Total subscription times]
EMPLOYEE: [Employee subscription times, or 0]
IS_FINAL: [true/false - true only for final day closing data]
--- ENTRY ---
[repeat for each entry]
=== END ===

Create one entry per day or per time snapshot. Mark the last entry as IS_FINAL: true if it's the final subscription data.`
}
