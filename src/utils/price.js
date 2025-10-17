import * as cheerio from 'cheerio';

export function findJsonLdPrice(html) {
  try {
    const $ = cheerio.load(html);
    const scripts = $('script[type="application/ld+json"]');
    for (const el of scripts.toArray()) {
      const txt = $(el).contents().text();
      try {
        const json = JSON.parse(txt);
        const candidates = Array.isArray(json) ? json : [json];
        for (const obj of candidates) {
          // Try Offer / AggregateOffer
          const offers = obj.offers || obj.offers?.offers;
          if (offers) {
            const arr = Array.isArray(offers) ? offers : [offers];
            for (const off of arr) {
              const p = off.price || off.priceSpecification?.price || off.lowPrice;
              if (p && !isNaN(Number(p))) return Number(p);
            }
          }
          if (obj.price && !isNaN(Number(obj.price))) return Number(obj.price);
        }
      } catch {}
    }
  } catch {}
  return null;
}

export function findMetaPrice(html) {
  try {
    const $ = cheerio.load(html);
    const meta = $('[itemprop="price"], [property="product:price:amount"]');
    for (const el of meta.toArray()) {
      const content = $(el).attr('content') || $(el).attr('value') || $(el).text();
      const num = Number((content||'').replace(/[^0-9.]/g,''));
      if (!isNaN(num) && num>0) return num;
    }
  } catch {}
  return null;
}

export function findRegexPrice(html) {
  const m = html.match(/£\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
  if (m) {
    const val = Number(m[1].replace(/,/g,''));
    if (!isNaN(val)) return val;
  }
  return null;
}

export function pickBestPrice(html) {
  return findJsonLdPrice(html) ?? findMetaPrice(html) ?? findRegexPrice(html);
}
