import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice } from '../utils/price.js';

// BAU price is stored in data-price on a <span> tag.
// Ignore service/finance widgets (disposal, delivery, etc.)

const SERVICE_WORDS = /(disposal|recycle|removal|collection|assembly|install|set\s*up|delivery|shipping|protector|topper|pillow|duvet|base|divan|frame|headboard|per\s*month|finance|apr)/i;

export async function scrapeBedsAreUzzz(url /*, size */) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  let price = null;

  // 1) JSON-LD as a fallback (usually correct but not always present)
  price = jsonLdPrice(html);

  // 2) Try <span data-price="£xxxx.xx">
  if (!price) {
    $('span[data-price]').each((_, el) => {
      const t = $(el).attr('data-price');
      if (!t) return;
      const context = $(el).closest('*').text() || '';
      if (SERVICE_WORDS.test(context)) return; // ignore disposal, delivery etc.
      const n = Number(t.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(n) && n > 0) { price = n; return false; }
    });
  }

  // 3) As a final backup, check any visible .price text blocks
  if (!price) {
    const sels = [
      '.summary .price', '.entry-summary .price', '.single_variation .price',
      '.product .price', '.product-price', '.woocommerce-Price-amount',
      '.amount', '[itemprop="price"]'
    ];
    for (const sel of sels) {
      const txt = $(sel).first().text();
      if (!txt || SERVICE_WORDS.test(txt)) continue;
      const n = Number(txt.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(n) && n > 0) { price = n; break; }
    }
  }

  return { price: price ?? null, notes: price ? 'BAU data-price attribute' : 'no price found' };
}
