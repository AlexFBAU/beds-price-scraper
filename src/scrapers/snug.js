import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';

function extractPrice(txt) {
  if (!txt) return null;
  if (/per\s*month|finance|apr/i.test(txt)) return null;
  if (/\bfrom\b/i.test(txt)) return null;
  const m = txt.replace(/\u00A0/g,' ').match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g,''));
  return Number.isFinite(n) ? n : null;
}

export async function scrapeSnug(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) find a node mentioning 150x200/king, then read a nearby price
  const priceSel = ['.price', '.product-price', '.woocommerce-Price-amount', '.amount', '[itemprop="price"]'];

  let price = null;
  $('*').each((_, el) => {
    const t = $(el).text().trim();
    if (!t || !textMatchesSize(t, size)) return;
    for (const sel of priceSel) {
      const n = extractPrice($(el).closest('[class]').find(sel).first().text());
      if (n) { price = n; return false; }
    }
    const n = extractPrice($(el).closest('[class]').text());
    if (n) { price = n; return false; }
  });

  // sanity: kingsize Regal Superb should be > £4,500 — filter small sizes
  if (price && price < 4500) price = null;

  // 2) fallback: the first main price on page (still filtered)
  if (!price) {
    for (const sel of priceSel) {
      const n = extractPrice($(sel).first().text());
      if (n && n >= 4500) { price = n; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'size-scoped price' : 'no size price found' };
}
