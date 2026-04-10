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

Use "morning" for 12 PM data and "evening" for 10 PM data.`
}
