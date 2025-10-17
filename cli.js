import { retailers } from './src/retailers.js';
import { parseSize } from './src/utils/size.js';
import { toCsv } from './src/utils/csv.js';
import 'dotenv/config';
import fs from 'fs/promises';

const product = process.env.DEFAULT_PRODUCT || 'vispring-regal-superb';
const sizeStr = process.env.DEFAULT_SIZE_CM || '150x200';
const size = parseSize(sizeStr);

const enabled = (process.env.RETAILERS || 'snug,furniturevillage,mynextmattress,landofbeds')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log(`Scraping: product=${product}, size=${sizeStr}`);

const rows = [];
for (const r of retailers) {
  if (!enabled.includes(r.key)) continue;
  const url = r.url(product);
  process.stdout.write(`- ${r.name} ... `);
  try {
    const data = await r.scrape(url, size);
    console.log(data.price != null ? `£${data.price}` : 'no price');
    rows.push({ retailer: r.name, key: r.key, url, price: data.price ?? '', notes: data.notes ?? '' });
  } catch (e) {
    console.log('error');
    rows.push({ retailer: r.name, key: r.key, url, price: '', notes: `ERROR: ${e.message || e}` });
  }
}

const csv = toCsv(rows);
await fs.mkdir('output', { recursive: true });
await fs.writeFile('output/prices.csv', csv, 'utf8');
console.log('\nSaved output/prices.csv');
