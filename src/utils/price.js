// src/utils/price.js
import * as cheerio from 'cheerio';

const MIN = Number(process.env.MIN_PRICE_KING || 3000);
const MAX = Number(process.env.MAX_PRICE_KING || 10000);

export function isValid(n) {
  return Number.isFinite(n) && n >= MIN && n <= MAX;
}

export function extractPriceFromText(txt) {
  if (!txt) return null;
  if (/per\s*month|finance|apr/i.test(txt)) return null;
  if (/\bfrom\b/i.test(txt)) return null;
  const m = String(txt).replace(/\u00A0/g, ' ')
    .match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return isValid(n) ? n : null;
}

export function jsonLdPrice(html) {
  try {
    const $ = cheerio.load(html);
    const scripts = $('script[type="application/ld+json"]');
    for (const el of scripts.toArray()) {
      const raw = $(el).contents().text();
      try {
        const j = JSON.parse(raw);
        const arr = Array.isArray(j) ? j : [j];
        for (const obj of arr) {
          const offers = obj.offers || obj.offers?.offers;
          const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
          for (const o of list) {
            const p = Number(o?.price || o?.priceSpecification?.price || o?.lowPrice);
            if (isValid(p)) return p;
          }
          const p2 = Number(obj.price);
          if (isValid(p2)) return p2;
        }
      } catch {/* ignore bad JSON */}
    }
  } catch {/* ignore */}
  return null;
}

export function firstValidPriceBySelectors($, scope, sels) {
  for (const sel of sels) {
    const p = extractPriceFromText(scope.find(sel).first().text());
    if (p) return p;
  }
  return null;
}

/* ===== Backwards compatibility (older scrapers call pickBestPrice) ===== */
export function findMetaPrice(html) {
  try {
    const $ = cheerio.load(html);
    const meta = $('[itemprop="price"], [property="product:price:amount"]');
    for (const el of meta.toArray()) {
      const content = $(el).attr('content') || $(el).attr('value') || $(el).text();
      const p = extractPriceFromText(content);
      if (p) return p;
    }
  } catch {}
  return null;
}

export function findRegexPrice(html) {
  return extractPriceFromText(html);
}

export function pickBestPrice(html) {
  // old API used by initial scrapers
  return jsonLdPrice(html) ?? findMetaPrice(html) ?? findRegexPrice(html);
}
