// src/retailers.js
import { scrapeBedsAreUzzz } from './scrapers/bedsareuzzz.js';
import { scrapeBensons }     from './scrapers/bensons.js';
import { scrapeDreams }      from './scrapers/dreams.js';

const env = (k, d) => (process.env[k] && process.env[k].trim()) || d;

// Set these in Render → Environment (or .env locally)
const urls = {
  bau:     () => env('BAU_URL',     ''), // Beds Are Uzzz
  bensons: () => env('BENSONS_URL', ''), // Bensons for Beds
  dreams:  () => env('DREAMS_URL',  '')  // Dreams
};

export const retailers = [
  { key: 'bau',     name: 'Beds Are Uzzz',      url: urls.bau,     scrape: scrapeBedsAreUzzz },
  { key: 'bensons', name: 'Bensons for Beds',   url: urls.bensons, scrape: scrapeBensons     },
  { key: 'dreams',  name: 'Dreams',             url: urls.dreams,  scrape: scrapeDreams      },
];
