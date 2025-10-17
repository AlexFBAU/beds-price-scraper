import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice, extractPriceFromText, firstValidPriceBySelectors } from '../utils/price.js';
import { textMatchesSize } from '../utils/size.js';

const PRICE_SELS = ['.price','.product-price','.amount','[itemprop="price"]','.sale-price','#pd-price','.pd__price'];

export async function scrapeDreams(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD
  let price = jsonLdPrice(html);

  // 2) Obvious PDP price containers
  if (!price) {
    for (const sel of PRICE_SELS) {
      const p = extractPriceFromText($(sel).first().text());
      if (p) { price = p; break; }
    }
  }

  // 3) Size-scoped fallback
  if (!price) {
    $('*').each((_, el) => {
      const t = $(el).text().trim();
      if (!t || !textMatchesSize(t, size)) return;
      const scope = $(el).closest('[class]').length ? $(el).closest('[class]') : $(el).parent();
      price = firstValidPriceBySelectors($, scope, PRICE_SELS) || extractPriceFromText(scope.text());
      if (price) return false;
    });
  }

  return { price: price ?? null, notes: price ? 'pdp/size-scoped' : 'no price found' };
}
