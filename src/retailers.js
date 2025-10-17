import { scrapeSnug } from './scrapers/snug.js';
import { scrapeFurnitureVillage } from './scrapers/furniturevillage.js';
import { scrapeMyNextMattress } from './scrapers/mynextmattress.js';
import { scrapeLandOfBeds } from './scrapers/landofbeds.js';

// You can override any URL via environment variables, e.g. LOB_URL, MNM_URL, etc.
const env = (k, d) => process.env[k] && process.env[k].trim() ? process.env[k].trim() : d;

const urls = {
  snug:              () => env('SNUG_URL', 'https://www.snug-interiors.com/vispring-regal-superb-mattress/p417'),
  furniturevillage:  () => env('FV_URL',   'https://www.furniturevillage.co.uk/regal-superb-pocket-sprung-mattress/ZFRSP000000000045867.html'),
  mynextmattress:    () => env('MNM_URL',  'https://www.mynextmattress.co.uk/vispring-regal-superb-mattress'),
  landofbeds:        () => env('LOB_URL',  'https://www.landofbeds.co.uk/vispring/regal-superb-mattress') // <-- updated guessy slug
};

export const retailers = [
  { key: 'snug', name: 'Snug Interiors',          url: urls.snug,             scrape: scrapeSnug },
  { key: 'furniturevillage', name: 'Furniture Village', url: urls.furniturevillage, scrape: scrapeFurnitureVillage },
  { key: 'mynextmattress', name: 'My Next Mattress',    url: urls.mynextmattress,   scrape: scrapeMyNextMattress },
  { key: 'landofbeds', name: 'Land of Beds',            url: urls.landofbeds,       scrape: scrapeLandOfBeds },
];
