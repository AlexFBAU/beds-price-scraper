import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { jsonLdPrice, extractPriceFromText } from '../utils/price.js';

// BAU: main cash price is in .sale-price (when on offer). Fall back to other PDP price blocks.
// Ignore service/add-on widgets (disposal, delivery, finance, etc.)

const SERVICE_NEGATIVE = [
  'disposal','recycle','removal','collection',
  'assembly','install','set up',
  'delivery','shipping',
  'protector','topper','pillow','duvet',
  'base','divan','frame','headboard',
  'per month','finance','apr'
];

function isServicey(txt='') {
  const s = String(txt).toLowerCase();
  return SERVICE_NEGATIVE.some(k => s.includes(k));
}

export async function scrapeBedsAreUzzz(url /*, size */) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 0) Try JSON-LD (sometimes already correct)
  let price = jsonLdPrice(html);

  // 1) Hard target BAU sale price
  if (!price) {
    const saleTxt = $('.sale-price').first().text();
    const p = extractPriceFromText(saleTxt);
    if (p) price = p;
  }

  // 2) If no sale-price, try regular PDP price containers
  if (!price) {
    const sels = [
      '.summary .price',
      '.entry-summary .price',
      '.product .price',
      '.product-price',
      '.woocommerce-Price-amount',
      '.amount',
      '[itemprop="price"]'
    ];
    for (const sel of sels) {
      const txt = $(sel).first().text();
      if (isServicey($(sel).first().closest('*').text())) continue; // skip service blocks
      const p = extractPriceFromText(txt);
      if (p) { price = p; break; }
    }
  }

  // 3) Last resort: scan big sections, skip anything that looks like a service widget
  if (!price) {
    let best = null;
    $('.product, .summary, .entry-summary, main, .site-content, body').each((_, el) => {
      const scope = $(el);
      const text = scope.text();
      if (isServicey(text)) return;
      const p = extractPriceFromText(text);
      if (p && (!best || p > best)) best = p;
    });
    price = best;
  }

  return { price: price ?? null, notes: price ? 'BAU .sale-price/PDP price' : 'no price found' };
}
