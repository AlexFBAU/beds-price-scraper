import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

export async function scrapeLandOfBeds(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD Offer/AggregateOffer
  let price = jsonLdPrice(html);

  // 2) Common PDP price selectors (after JS):
  if (!price) {
    const sels = [
      '.price', '.product-price', '#ourPrice', '.now-price',
      '.amount', '.woocommerce-Price-amount', '[itemprop="price"]'
    ];
    for (const sel of sels) {
      const p = extractPriceFromText($(sel).first().text());
      if (p && isValid(p)) { price = p; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'pdp/validated' : 'no price found' };
}
