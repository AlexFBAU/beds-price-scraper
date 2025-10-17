import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

export async function scrapeFurnitureVillage(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD first (Offer/AggregateOffer)
  let price = jsonLdPrice(html);

  // 2) Try obvious PDP price containers (after JS render)
  if (!price) {
    const sels = [
      '.price', '.now-price', '.product-price', '.amount',
      '[itemprop="price"]', '#ourPrice', '.pdpPricing', '.pdp-price', '.sales'
    ];
    for (const sel of sels) {
      const p = extractPriceFromText($(sel).first().text());
      if (p && isValid(p)) { price = p; break; }
    }
  }

  // 3) Size-scoped fallback: find text mentioning king/150x200 and read nearby price
  if (!price) {
    const sels = ['.price', '.now-price', '.product-price', '.amount', '[itemprop="price"]'];
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

  return { price: price ?? null, notes: price ? 'pdp/validated' : 'no size price found' };
}
