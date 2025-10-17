// run.js
import 'dotenv/config';
import { retailers } from './src/retailers.js';
import { parseSize } from './src/utils/size.js';
import { appendRows } from './src/integrations/sheets.js';

async function main() {
  const product = process.env.DEFAULT_PRODUCT || 'tempur-pro-plus-smartcool';
  const sizesStr = process.env.SIZES || process.env.DEFAULT_SIZE_CM || '150x200';
  const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
  const enabled = (process.env.RETAILERS || 'bau,bensons,dreams')
    .split(',').map(s => s.trim()).filter(Boolean);

  const rows = [];
  for (const sizeStr of sizes) {
    const size = parseSize(sizeStr);
    for (const r of retailers) {
      if (!enabled.includes(r.key)) continue;
      const url = r.url(product);
      try {
        const data = await r.scrape(url, size);
        rows.push([new Date().toISOString(), product, sizeStr, r.name, r.key, url, data.price ?? '', data.notes ?? '']);
        console.log(`${r.name} (${sizeStr}) →`, data.price ?? 'no price');
      } catch (e) {
        rows.push([new Date().toISOString(), product, sizeStr, r.name, r.key, url, '', `ERROR: ${e.message || e}`]);
        console.log(`${r.name} (${sizeStr}) → ERROR`);
      }
    }
  }

  if (rows.length) {
    await appendRows(rows);
    console.log(`Appended ${rows.length} row(s) to the sheet.`);
  } else {
    console.log('No rows to append.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
