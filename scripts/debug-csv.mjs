import fs from 'node:fs';
import path from 'node:path';

const csvPath = path.join(process.cwd(), 'data/listed-ipos/2026/2026.csv');
const text = fs.readFileSync(csvPath, 'utf8');

// Tiny inline CSV parser mirroring _parse.ts
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  let rowHasContent = false;
  const pushCell = () => {
    row.push(cur.replace(/\s+/g, ' ').trim());
    cur = '';
  };
  const pushRow = () => {
    pushCell();
    if (rowHasContent) rows.push(row);
    row = [];
    rowHasContent = false;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
        if (ch !== '\n' && ch !== '\r') rowHasContent = true;
      }
    } else {
      if (ch === ',') pushCell();
      else if (ch === '"') { inQuotes = true; rowHasContent = true; }
      else if (ch === '\r') { if (text[i+1] === '\n') i++; pushRow(); }
      else if (ch === '\n') pushRow();
      else { cur += ch; if (ch !== ' ' && ch !== '\t') rowHasContent = true; }
    }
  }
  if (cur.length > 0 || row.length > 0) pushRow();
  return rows;
}

const rows = parseCsvRows(text);
console.log('total rows:', rows.length);
console.log('header cols:', rows[0].length);
console.log('header:', rows[0]);
console.log('row[1] cols:', rows[1].length);
console.log('row[1] IPO Name:', rows[1][0]);
console.log('row[1] Slug:', rows[1][rows[0].indexOf('Slug')]);
