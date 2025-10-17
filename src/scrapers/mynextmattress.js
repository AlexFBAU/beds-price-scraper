import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

export async function scrapeMyNextMattress(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD often has the cash price
  let price = jsonLdPrice(html);

  // 2) WooCommerce: variations JSON on the form
  if (!price) {
    const form = $('form.variations_form[data-product_variations]').first();
    const raw = form.attr('data-product_variations');
    if (raw) {
      try {
        const variations = JSON.parse(raw);
        for (const v of variations) {
          // combine attributes + text blobs to check size match
          const blob = [
            v?.attributes ? Object.values(v.attributes).join(' ') : '',
            v?.variation_description || '',
            v?.sku || '',
            v?.price_html || ''
          ].join(' ').toLowerCase();
          if (!textMatchesSize(blob, size)) continue;

          // numeric price first
          const numeric = Number(v.display_price ?? v.display_regular_price);
          if (isValid(numeric)) { price = numeric; break; }

          // price HTML fallback
          const htmlPrice = extractPriceFromText(v.price_html);
          if (htmlPrice && isValid(htmlPrice)) { price = htmlPrice; break; }
        }
      } catch {/* ignore */}
    }
  }

  // 3) Fallback to visible price blocks (still validated and > MIN)
  if (!price) {
    for (const sel of ['.price','.product-price','.woocommerce-Price-amount','.amount','[itemprop="price"]']) {
      const p = extractPriceFromText($(sel).first().text());
      if (p && isValid(p)) { price = p; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'variation JSON/validated' : 'no size price found' };
}
