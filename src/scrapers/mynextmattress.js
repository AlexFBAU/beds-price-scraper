import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';
import { jsonLdPrice, extractPriceFromText, isValid } from '../utils/price.js';

const isKingText = (s) => /\bking\b|150\s*[x×]\s*200/i.test(String(s||''));

export async function scrapeMyNextMattress(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD: sometimes already keyed to current selection; keep as candidate but not final
  let candidate = jsonLdPrice(html);

  // 2) Woo variations JSON → choose size-matching variation, prefer highest valid price
  const form = $('form.variations_form[data-product_variations]').first();
  const raw = form.attr('data-product_variations');
  if (raw) {
    try {
      const variations = JSON.parse(raw);
      let best = null;
      for (const v of variations) {
        const attrs = v?.attributes || {};
        const attrText = Object.values(attrs).join(' ');
        const blob = [
          attrText,
          v?.variation_description || '',
          v?.sku || '',
          v?.price_html || ''
        ].join(' ');
        if (!textMatchesSize(blob, size) && !isKingText(attrText)) continue;

        // numeric first
        const nums = [v.display_price, v.display_regular_price]
          .map(x => Number(x))
          .filter(n => isValid(n));
        const htmlPrice = extractPriceFromText(v.price_html);
        const maybe = nums.length ? Math.max(...nums) : (htmlPrice && isValid(htmlPrice) ? htmlPrice : null);

        if (maybe && (!best || maybe > best)) best = maybe;
      }
      if (best) candidate = best;
    } catch {/* ignore */}
  }

  // 3) Fallback: visible price blocks (validated)
  if (!candidate) {
    for (const sel of ['.price','.product-price','.woocommerce-Price-amount','.amount','[itemprop="price"]']) {
      const p = extractPriceFromText($(sel).first().text());
      if (p && isValid(p)) { candidate = p; break; }
    }
  }

  return { price: candidate ?? null, notes: candidate ? 'variation Kingsize/validated' : 'no size price found' };
}
