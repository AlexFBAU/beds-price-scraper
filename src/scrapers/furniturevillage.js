import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

export async function scrapeFurnitureVillage(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD first (handles Offer/AggregateOffer/lowPrice)
  let price = jsonLdPrice(html);

  // 2) Search embedded scripts for price-like fields
  if (!price) {
    const scripts = $('script').toArray().map(s => $(s).contents().text());
    const fields = [
      /"salePrice"\s*:\s*([0-9]{3,5}(?:\.[0-9]{2})?)/i,
      /"price"\s*:\s*([0-9]{3,5}(?:\.[0-9]{2})?)/i,
      /"lowPrice"\s*:\s*([0-9]{3,5}(?:\.[0-9]{2})?)/i
    ];
    for (const txt of scripts) {
      for (const re of fields) {
        const m = txt.match(re);
        if (m) {
          const n = Number(m[1]);
          if (isValid(n)) { price = n; break; }
        }
      }
      if (price) break;
    }
  }

  // 3) Size-scoped DOM fallback: find nodes mentioning size; read nearby price
  if (!price) {
    const sels = ['.price', '.amount', '.product-price', '.now-price', '[itemprop="price"]'];
    $('*').each((_, el) => {
      const t = $(el).text().trim();
      if (!t || !textMatchesSize(t, size)) return;
      const scope = $(el).closest('[class]').length ? $(el).closest('[class]') : $(el).parent();
      for (const sel of sels) {
        const p = extractPriceFromText(scope.find(sel).first().text());
        if (p && isValid(p)) { price = p; return false; }
      }
      const p2 = extractPriceFromText(scope.text());
      if (p2 && isValid(p2)) { price = p2; return false; }
    });
  }

  return { price: price ?? null, notes: price ? 'script/JSON or size-scoped' : 'no size price found' };
}
