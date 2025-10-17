// src/utils/price.js
import * as cheerio from 'cheerio';

export function extractPriceFromText(txt) {
  if (!txt) return null;
  // Ignore finance/monthly cues but DO NOT block low prices with thresholds
  if (/per\s*month|finance|apr/i.test(txt)) return null;
  const m = String(txt).replace(/\u00A0/g,' ')
    .match(/£\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g,''));
  return Number.isFinite(n) ? n : null;
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
            if (Number.isFinite(p) && p > 0) return p;
          }
          const p2 = Number(obj.price);
          if (Number.isFinite(p2) && p2 > 0) return p2;
        }
      } catch {}
    }
  } catch {}
  return null;
}

export function firstValidPriceBySelectors($, scope, sels) {
  for (const sel of sels) {
    const p = extractPriceFromText(scope.find(sel).first().text());
    if (p) return p;
  }
  return null;
}

// Legacy helper used by some generic scrapers
export function pickBestPrice(html) {
  return jsonLdPrice(html) || extractPriceFromText(html);
}
