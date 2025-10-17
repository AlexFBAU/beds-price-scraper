import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice, extractPriceFromText, firstValidPriceBySelectors } from '../utils/price.js';

const PRICE_SELS = [
  '.now-price', '.sales', '.sale-price',
  '#ourPrice', '.product-price', '.price',
  '.amount', '[itemprop="price"]'
];

const isKing = (s='') => /\bking\b|150\s*[x×]\s*200/i.test(s);

export async function scrapeBensons(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) JSON-LD first (often already discounted on PDP)
  let price = jsonLdPrice(html);

  // 2) Prefer "now/sale" price containers
  if (!price) {
    for (const sel of PRICE_SELS) {
      const p = extractPriceFromText($(sel).first().text());
      if (p) { price = p; break; }
    }
  }

  // 3) Size check: if the page shows size chips, make sure King/150x200 is selected
  // (common patterns: chips with aria-selected="true" or .active)
  const selectedChip = $('[aria-selected="true"], .is-selected, .active, .selected').first();
  if (selectedChip.length) {
    const chipText = selectedChip.text();
    if (!isKing(chipText)) {
      // If selected isn’t King, try to scope to a nearby container that mentions King
      $('*').each((_, el) => {
        const t = $(el).text().trim();
        if (!t || !isKing(t)) return;
        const scope = $(el).closest('[class]').length ? $(el).closest('[class]') : $(el).parent();
        const scoped = firstValidPriceBySelectors($, scope, PRICE_SELS) || extractPriceFromText(scope.text());
        if (scoped) { price = scoped; return false; }
      });
    }
  }

  return { price: price ?? null, notes: price ? 'pdp/now-price scoped' : 'no price found' };
}
