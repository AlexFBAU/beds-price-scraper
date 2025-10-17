import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetch.js';
import { pickBestPrice } from '../utils/price.js';
import { textMatchesSize } from '../utils/size.js';

export async function scrapeLandOfBeds(url, size) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) Try generic price first
  let price = pickBestPrice(html);

  // 2) Try to locate a variant/options block mentioning the size and grab a nearby price
  let notes = '';
  const candidates = $('*, script').toArray().slice(0, 4000); // cap for safety
  for (const el of candidates) {
    const txt = $(el).text().trim();
    if (!txt) continue;
    if (textMatchesSize(txt, size)) {
      // look around for a price in the same parent
      const parent = $(el).closest('*');
      const ctxt = parent.text();
      const m = ctxt.match(/£\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
      if (m) {
        const val = Number(m[1].replace(/,/g,''));
        if (!isNaN(val) && val>0) { price = price ?? val; notes = 'matched size variant block'; break; }
      }
    }
  }

  return { price, notes };
}
