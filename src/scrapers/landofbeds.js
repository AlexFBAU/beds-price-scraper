import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

export async function scrapeLandOfBeds(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD (Offer / AggregateOffer) is most reliable
  let price = jsonLdPrice(html);

  // 2) Fallback: obvious price blocks on PDP
  if (!price) {
    for (const sel of ['.price','.product-price','.amount','.woocommerce-Price-amount','[itemprop="price"]','#ourPrice','.now-price']) {
      const p = extractPriceFromText($(sel).first().text());
      if (p && isValid(p)) { price = p; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'pdp/validated' : 'no price found' };
}
