/**
 * Listed SME IPOs Data Folder
 * 
 * This folder contains data for all previously listed SME IPOs.
 * SME IPOs are listed on NSE SME and BSE SME platforms.
 * 
 * Structure:
 * - data/listed-sme-ipos/index.ts (this file - exports all listed SME IPOs)
 * - data/listed-sme-ipos/2026/2026.csv (SME IPOs listed in 2026)
 * - data/listed-sme-ipos/2025/2025.csv (SME IPOs listed in 2025)
 * 
 * Each row in the CSV represents a listed SME IPO with complete performance data.
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import type { ListedIPO } from '@/lib/data';

export interface ListedIpoRecord {
  'IPO Name': string;
  'Listing Date': string;
  Sector: string;
  'Retail Quota (%)': string;
  'Issue Price Upper': string;
  'Listing Price': string;
  'Closing Price NSE': string;
  'Listing Gain (%)': string;
  'Listing gains on closing Basis (%)': string;
  'Day Change After Listing (%)': string;
  'QIB Day3 Subscription': string;
  'HNI/NII Day3 Subscription': string;
  'Retail Day3 Subscription': string;
  'Day1 Subscription': string;
  'Day2 Subscription': string;
  'Day3 Subscription': string;
  [key: string]: string;
}

/**
 * Parse a CSV file and convert to typed ListedIpoRecord array
 */
function parseCsv(csvPath: string): ListedIpoRecord[] {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const result = Papa.parse<ListedIpoRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return result.data || [];
}

/**
 * Get all available years from CSV folder structure
 */
export function getSmeAvailableYears(): number[] {
  const baseDir = path.join(process.cwd(), 'data', 'listed-sme-ipos');
  if (!fs.existsSync(baseDir)) return [];

  const dirs = fs.readdirSync(baseDir);
  const years = dirs
    .filter((d) => /^\d{4}$/.test(d) && !d.startsWith('.'))
    .map((d) => parseInt(d, 10))
    .sort((a, b) => b - a);

  return years;
}

/**
 * Get all SME IPOs from a specific year
 */
export function getListedSmeIposByYear(year: number): ListedIpoRecord[] {
  const csvPath = path.join(process.cwd(), 'data', 'listed-sme-ipos', String(year), `${year}.csv`);
  const records = parseCsv(csvPath);

  return records.map((r) => ({
    ...r,
    // Ensure exchange is marked as SME for consistency
    Exchange: r.Exchange || 'NSE SME',
  }));
}

/**
 * Convert CSV record to ListedIPO card format
 */
export function toListedIpoCard(record: ListedIpoRecord, year: number): ListedIPO {
  const dateStr = record['Listing Date'] || '';
  const ipoName = record['IPO Name'] || '';
  const sector = record.Sector || '';

  // Parse listing date
  const dateObj = new Date(dateStr);
  const listDate = dateObj.toISOString().split('T')[0];

  // Extract first 2 letters for abbreviation
  const abbr = ipoName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';

  // Convert gain percentage
  const gainStr = record['Listing Gain (%)'] || '0';
  const gainPct = parseFloat(gainStr) || 0;

  // Convert subscriptions
  const retailSubStr = record['Retail Day3 Subscription'] || record['Day3 Subscription'] || '0';
  const niiSubStr = record['HNI/NII Day3 Subscription'] || '0';
  const qibSubStr = record['QIB Day3 Subscription'] || '0';
  const totalSubStr = record['Day3 Subscription'] || '0';

  const retailSub = parseFloat(retailSubStr) || 0;
  const niiSub = parseFloat(niiSubStr) || 0;
  const qibSub = parseFloat(qibSubStr) || 0;
  const totalSub = parseFloat(totalSubStr) || 0;

  // Create slug from IPO name
  const slug = ipoName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return {
    id: 0, // Will be set by caller
    name: ipoName,
    slug,
    abbr,
    exchange: ('NSE SME' as const),
    sector,
    bgColor: '#fdf2f8', // Light pink for SME
    fgColor: '#7c2d5f', // Dark magenta for SME
    listDate,
    issuePrice: parseFloat(record['Issue Price Upper']) || 0,
    listPrice: parseFloat(record['Listing Price']) || 0,
    gainPct,
    subTimes: totalSub,
    year: String(year),
    subscription: {
      retail: retailSub,
      nii: niiSub,
      qib: qibSub,
      total: totalSub,
      day: 3,
      isFinal: true,
    },
  };
}

/**
 * Get all SME IPOs and convert to card format
 */
export function getAllListedSmeIpos(): ListedIPO[] {
  const years = getSmeAvailableYears();
  const allIpos: ListedIPO[] = [];
  let id = 1000; // Start from 1000 to avoid conflicts with mainboard IPOs

  for (const year of years) {
    const records = getListedSmeIposByYear(year);
    for (const record of records) {
      const ipo = toListedIpoCard(record, year);
      ipo.id = id++;
      allIpos.push(ipo);
    }
  }

  return allIpos;
}
