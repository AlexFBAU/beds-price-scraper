import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';

function cleanPrice(txt) {
  if (!txt) return null;
  if (/per\s*month|finance/i.test(txt)) return null;
  const m = txt.replace(/\u00A0/g,' ').match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export async function scrapeFurnitureVillage(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // FV product pages usually have variant tiles/size pickers. Find a node
  // that mentions the size, then look for price in nearby “price”/“amount” elements.
  const priceHints = ['.price', '.amount', '.product-price', '.now-price', '[itemprop="price"]'];

  let price = null;
  $('*').each((_, el) => {
    const t = $(el).text().trim();
    if (!t || !textMatchesSize(t, size)) return;
    for (const sel of priceHints) {
      const p = $(el).closest('[class]').find(sel).first().text();
      const n = cleanPrice(p);
      if (n) { price = n; return false; }
    }
    const n = cleanPrice($(el).closest('[class]').text());
    if (n) { price = n; return false; }
  });

  if (!price) {
    for (const sel of priceHints) {
      const n = cleanPrice($(sel).first().text());
      if (n) { price = n; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'size-scoped price' : 'no size price found' };
}
