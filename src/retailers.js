import { scrapeSnug } from './scrapers/snug.js';
import { scrapeFurnitureVillage } from './scrapers/furniturevillage.js';
import { scrapeMyNextMattress } from './scrapers/mynextmattress.js';
import { scrapeLandOfBeds } from './scrapers/landofbeds.js';

// Product URL resolvers centralised here so you can swap product slugs later
const urls = {
  snug: (product) => `https://www.snug-interiors.com/vispring-regal-superb-mattress/p417`,
  furniturevillage: (product) => `https://www.furniturevillage.co.uk/regal-superb-pocket-sprung-mattress/ZFRSP000000000045867.html`,
  mynextmattress: (product) => `https://www.mynextmattress.co.uk/vispring-regal-superb-mattress`,
  landofbeds: (product) => `https://www.landofbeds.co.uk/vispring/mattresses/regal-superb/`
};

export const retailers = [
  { key: 'snug', name: 'Snug Interiors', url: urls.snug, scrape: scrapeSnug },
  { key: 'furniturevillage', name: 'Furniture Village', url: urls.furniturevillage, scrape: scrapeFurnitureVillage },
  { key: 'mynextmattress', name: 'My Next Mattress', url: urls.mynextmattress, scrape: scrapeMyNextMattress },
  { key: 'landofbeds', name: 'Land of Beds', url: urls.landofbeds, scrape: scrapeLandOfBeds },
];
