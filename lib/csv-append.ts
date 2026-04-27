import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * CSV Append Utility for Listed IPOs
 * 
 * Automatically appends newly listed IPO data to the correct CSV file
 * (Mainboard or SME, year-specific).
 * 
 * Used by: app/api/admin/ipos/[id]/migrate-listed/route.ts
 */

export interface ListedIPORow {
  ipoName: string
  listingDate: string
  sector: string | null
  retailQuotaPct: number | null
  issuePriceUpper: number | null
  listingPrice: number
  closingPrice: number | null
  listingGainPct: number | null
  listingGainClosingPct: number | null
  dayChangeAfterListingPct: number | null
  qibDay3Sub: number | null
  niiDay3Sub: number | null
  retailDay3Sub: number | null
  day1Sub: number | null
  day2Sub: number | null
  day3Sub: number | null
  gmpPctD1: number | null
  gmpPctD2: number | null
  gmpPctD3: number | null
  gmpPctD4: number | null
  gmpPctD5: number | null
  peerPE: number | null
  debtEquity: number | null
  ipoPE: number | null
  latestEbitda: number | null
  peVsSectorRatio: number | null
  nifty3DReturn: number | null
  nifty1WReturn: number | null
  nifty1MReturn: number | null
  niftyDuringIpoWindow: number | null
  marketSentimentScore: number | null
  issueSize: number | null
  freshIssue: number | null
  ofs: number | null
  gmpDay1: number | null
  gmpDay2: number | null
  gmpDay3: number | null
  gmpDay4: number | null
  gmpDay5: number | null
  gmpPrediction: string | null
  aiPrediction: number | null
  predictionAccuracy: number | null
}

/**
 * Format a value for CSV output
 * - null/undefined → ""
 * - string with comma → wrap in quotes and escape quotes
 * - number → as-is
 */
function formatCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const str = String(value)
  
  // If contains comma, quote it
  if (str.includes(',')) {
    return `"${str.replace(/"/g, '""')}"` // Escape internal quotes
  }
  
  return str
}

/**
 * Convert a ListedIPORow object to CSV row string
 */
export function rowToCSVLine(row: ListedIPORow): string {
  const values = [
    row.ipoName,
    row.listingDate,
    row.sector,
    row.retailQuotaPct,
    row.issuePriceUpper,
    row.listingPrice,
    row.closingPrice,
    row.listingGainPct,
    row.listingGainClosingPct,
    row.dayChangeAfterListingPct,
    row.qibDay3Sub,
    row.niiDay3Sub,
    row.retailDay3Sub,
    row.day1Sub,
    row.day2Sub,
    row.day3Sub,
    row.gmpPctD1,
    row.gmpPctD2,
    row.gmpPctD3,
    row.gmpPctD4,
    row.gmpPctD5,
    row.peerPE,
    row.debtEquity,
    row.ipoPE,
    row.latestEbitda,
    row.peVsSectorRatio,
    row.nifty3DReturn,
    row.nifty1WReturn,
    row.nifty1MReturn,
    row.niftyDuringIpoWindow,
    row.marketSentimentScore,
    row.issueSize,
    row.freshIssue,
    row.ofs,
    row.gmpDay1,
    row.gmpDay2,
    row.gmpDay3,
    row.gmpDay4,
    row.gmpDay5,
    row.gmpPrediction,
    row.aiPrediction,
    row.predictionAccuracy,
  ]
  
  return values.map(formatCsvValue).join(',')
}

/**
 * Get the CSV file path for a given year and exchange
 */
function getCsvPath(year: number, isSme: boolean): string {
  const folder = isSme ? 'listed-sme-ipos' : 'listed-ipos'
  return join(process.cwd(), 'data', folder, String(year), `${year}.csv`)
}

/**
 * Get the header row for the CSV
 */
function getCsvHeader(): string {
  return 'IPO Name,Listing Date,Sector,Retail Quota (%),Issue Price Upper,Listing Price (Rs),Closing Price NSE,Listing Gain (%),Listing gains on closing Basis (%),Day Change After Listing (%),QIB Day3 Subscription,HNI/NII Day3 Subscription,Retail Day3 Subscription,Day1 Subscription,Day2 Subscription,Day3 Subscription,GMP percentage D1,GMP percentage D2,GMP percentage D3,GMP percentage D4,GMP percentage D5,Peer PE,Debt/Equity,IPO PE,Latest EBIDTA,PE vs Sector Ratio,Nifty 3D Return (%),Nifty 1W Return (%),Nifty 1M Return (%),Nifty During IPO Window (%),Market Sentiment Score,Issue Size (Rs Cr),Fresh Issue,OFS,GMP Day-1,GMP Day-2,GMP Day-3,GMP Day-4,GMP Day-5,GMP Prediction,IPOGyani AI Prediction,Prediction Accuracy (%)'
}

/**
 * Append an IPO row to the CSV file
 * 
 * @param year - Listing year (e.g., 2026)
 * @param isSme - true for SME IPO, false for Mainboard
 * @param row - The IPO row data to append
 * @returns Promise<{success: boolean, message: string, filePath?: string}>
 */
export async function appendToListedCsv(
  year: number,
  isSme: boolean,
  row: ListedIPORow
): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const csvPath = getCsvPath(year, isSme)
    const csvDir = csvPath.substring(0, csvPath.lastIndexOf('/'))
    
    // Ensure directory exists
    if (!existsSync(csvDir)) {
      await mkdir(csvDir, { recursive: true })
    }
    
    let csvContent = ''
    
    // Read existing file if it exists
    if (existsSync(csvPath)) {
      csvContent = await readFile(csvPath, 'utf-8')
      
      // Check if IPO already exists (by name)
      const lines = csvContent.split('\n').filter(l => l.trim())
      const ipoAlreadyExists = lines.some(
        line => line.includes(row.ipoName) && !line.startsWith('IPO Name')
      )
      
      if (ipoAlreadyExists) {
        return {
          success: false,
          message: `IPO "${row.ipoName}" already exists in CSV for year ${year}`,
          filePath: csvPath,
        }
      }
    } else {
      // Create new file with header
      csvContent = getCsvHeader()
    }
    
    // Append new row
    const csvLine = rowToCSVLine(row)
    const newContent = csvContent.endsWith('\n')
      ? `${csvContent}${csvLine}\n`
      : `${csvContent}\n${csvLine}\n`
    
    // Write back to file
    await writeFile(csvPath, newContent, 'utf-8')
    
    return {
      success: true,
      message: `Successfully appended "${row.ipoName}" to ${isSme ? 'SME' : 'Mainboard'} CSV for ${year}`,
      filePath: csvPath,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: `Failed to append to CSV: ${errorMessage}`,
    }
  }
}

/**
 * Check if an IPO already exists in the CSV
 */
export async function ipoExistsInCsv(
  year: number,
  isSme: boolean,
  ipoName: string
): Promise<boolean> {
  try {
    const csvPath = getCsvPath(year, isSme)
    
    if (!existsSync(csvPath)) {
      return false
    }
    
    const content = await readFile(csvPath, 'utf-8')
    const lines = content.split('\n')
    
    return lines.some(
      line => line.includes(ipoName) && !line.startsWith('IPO Name')
    )
  } catch {
    return false
  }
}
