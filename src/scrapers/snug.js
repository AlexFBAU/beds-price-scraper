import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { textMatchesSize } from '../utils/size.js';

// Helper: get a clean £price from text, ignoring per-month etc.
function extractPrice(txt) {
  if (!txt) return null;
  if (/per\s*month/i.test(txt)) return null;
  const m = txt.replace(/\u00A0/g,' ').match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

export async function scrapeSnug(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Snug uses option lists for size — find the size option/label then find the nearby price
  // Prefer elements with price classes to avoid picking finance widgets.
  const priceSelectors = [
    '.price', '.product-price', '.woocommerce-Price-amount', '.amount',
    '[data-price]', '[itemprop="price"]'
  ];

  // 1) Look for any element mentioning 150x200 / king
  let foundPrice = null;
  $('*').each((_, el) => {
    const txt = $(el).text().trim();
    if (!txt) return;
    if (!textMatchesSize(txt, size)) return;

    // search descendants & ancestors for a price element
    for (const sel of priceSelectors) {
      const d = $(el).closest('*').find(sel).first();
      const cand = extractPrice(d.text());
      if (cand) { foundPrice = cand; return false; }
    }
    // fallback: scan context text
    const cand = extractPrice($(el).closest('*').text());
    if (cand) { foundPrice = cand; return false; }
  });

  // 2) final fallback: pick the first “main” price on the page
  if (!foundPrice) {
    for (const sel of priceSelectors) {
      const cand = extractPrice($(sel).first().text());
      if (cand) { foundPrice = cand; break; }
    }
  }

  return { price: foundPrice ?? null, notes: foundPrice ? 'size-scoped price' : 'no size price found' };
}
