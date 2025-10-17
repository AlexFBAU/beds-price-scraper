import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';

function getPrice(txt) {
  if (!txt) return null;
  if (/per\s*month/i.test(txt)) return null;
  const m = txt.replace(/\u00A0/g,' ').match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export async function scrapeLandOfBeds(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Look for size text then grab price from nearby “price”/“amount” blocks.
  const priceSel = ['.price', '.amount', '.woocommerce-Price-amount', '.product-price', '[itemprop="price"]'];
  let price = null;

  $('*').each((_, el) => {
    const t = $(el).text().trim();
    if (!t || !textMatchesSize(t, size)) return;

    for (const sel of priceSel) {
      const n = getPrice($(el).closest('[class]').find(sel).first().text());
      if (n) { price = n; return false; }
    }
    const n = getPrice($(el).closest('[class]').text());
    if (n) { price = n; return false; }
  });

  if (!price) {
    for (const sel of priceSel) {
      const n = getPrice($(sel).first().text());
      if (n) { price = n; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'size-scoped price' : 'no size price found' };
}
