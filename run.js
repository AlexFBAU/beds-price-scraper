// run.js
import 'dotenv/config';
import { retailers } from './src/retailers.js';
import { parseSize } from './src/utils/size.js';
import { appendRows } from './integrations/sheets.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const errString = (e) => (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
const DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 1200); // delay between requests to reduce 429s

async function main() {
  const product = (process.env.DEFAULT_PRODUCT || 'tempur-pro-plus-smartcool').toString();
  const sizesStr = (process.env.SIZES || process.env.DEFAULT_SIZE_CM || '150x200').toString();
  const enabled = (process.env.RETAILERS || 'bau,bensons,dreams')
    .split(',').map(s => s.trim()).filter(Boolean);
  const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);

  console.log(`\n== Price run @ ${nowIso()} ==`);
  console.log(`Product: ${product}`);
  console.log(`Sizes:   ${sizes.join(', ')}`);
  console.log(`Retailers enabled: ${enabled.join(', ')}\n`);

  const rows = [];

  for (const sizeStr of sizes) {
    const size = parseSize(sizeStr);

    for (const r of retailers) {
      if (!enabled.includes(r.key)) continue;

      // Resolve URL (function or string). Pass size so per-size URL maps work.
      let url;
      try {
        url = (typeof r.url === 'function') ? r.url(product, sizeStr) : r.url;
      } catch (e) {
        const msg = `URL resolver error: ${errString(e)}`;
        console.error(`${r.name} (${sizeStr}) → ERROR: ${msg}`);
        rows.push([nowIso(), product, sizeStr, r.name, r.key, '', '', `ERROR: ${msg}`]);
        await sleep(DELAY_MS);
        continue;
      }

      if (!url) {
        const hint = `No URL configured for ${r.key}. Set per-size URL in src/config/urls.js or ${r.key.toUpperCase()}_URL_${sizeStr.replace(/[^0-9a-z]/gi,'_')} in env.`;
        console.error(`${r.name} (${sizeStr}) → ERROR: ${hint}`);
        rows.push([nowIso(), product, sizeStr, r.name, r.key, '', '', `ERROR: ${hint}`]);
        await sleep(DELAY_MS);
        continue;
      }

      try {
        const data = await r.scrape(url, size);
        const priceOut = (data && data.price != null) ? `£${data.price}` : 'no price';
        console.log(`${r.name} (${sizeStr}) → ${priceOut}`);
        rows.push([
          nowIso(), product, sizeStr, r.name, r.key, url,
          (data && data.price != null) ? data.price : '',
          (data && data.notes) ? data.notes : ''
        ]);
      } catch (e) {
        const msg = errString(e);
        console.error(`${r.name} (${sizeStr}) → ERROR: ${msg}`);
        rows.push([nowIso(), product, sizeStr, r.name, r.key, url, '', `ERROR: ${msg}`]);
      }

      // polite gap between retailer requests (helps avoid 429s and TLS hiccups)
      await sleep(DELAY_MS);
    }
  }

  if (!rows.length) {
    console.log('No rows to append.');
    return;
  }

  if (String(process.env.NO_SHEETS || '') === '1') {
    console.log(`Skipping Google Sheets append (NO_SHEETS=1). Would append ${rows.length} row(s).`);
    return;
  }

  try {
    await appendRows(rows);
    console.log(`\nAppended ${rows.length} row(s) to the sheet.`);
  } catch (e) {
    console.error(`\nGoogle Sheets append failed: ${errString(e)}`);
    console.error('Check SHEET_ID, SHEET_TAB, and your service-account JSON env (GCP_SA_JSON_PATH/B64/JSON).');
  }
}

main().catch(e => {
  console.error(`Fatal: ${errString(e)}`);
  process.exit(1);
});
