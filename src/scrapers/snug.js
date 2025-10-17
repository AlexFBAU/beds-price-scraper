import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';
import { jsonLdPrice, extractPriceFromText, firstValidPriceBySelectors } from '../utils/price.js';

const PRICE_SELS = ['.price', '.product-price', '.woocommerce-Price-amount', '.amount', '[itemprop="price"]'];

export async function scrapeSnug(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD first (often the cleanest cash price)
  let price = jsonLdPrice(html);

  // 2) Size-scoped scan: find nodes mentioning “150x200 / king”, then read a nearby price
  if (!price) {
    $('*').each((_, el) => {
      const t = $(el).text().trim();
      if (!t || !textMatchesSize(t, size)) return;
      const scope = $(el).closest('[class]').length ? $(el).closest('[class]') : $(el).parent();
      price = firstValidPriceBySelectors($, scope, PRICE_SELS) || extractPriceFromText(scope.text());
      if (price) return false;  // stop .each
    });
  }

  // 3) Fallback: first “main” price on the page (still validated)
  if (!price) {
    for (const sel of PRICE_SELS) {
      const p = extractPriceFromText($(sel).first().text());
      if (p) { price = p; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'size-scoped/validated' : 'no valid price found' };
}
