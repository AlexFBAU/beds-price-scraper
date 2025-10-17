import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { retailers } from './src/retailers.js';
import { parseSize } from './src/utils/size.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const PORT = process.env.PORT || 3000;

app.get('/', (req,res)=> res.send('Beds Are Uzzz Price Scraper — MVP running'));

app.get('/api/prices', async (req, res) => {
  const product = (req.query.product || process.env.DEFAULT_PRODUCT || '').toString();
  const sizeStr = (req.query.size || process.env.DEFAULT_SIZE_CM || '').toString();

  if (!product || !sizeStr) {
    return res.status(400).json({ error: 'product and size query params are required' });
  }

  const size = parseSize(sizeStr);
  const enabled = (process.env.RETAILERS || 'snug,furniturevillage,mynextmattress,landofbeds')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const jobs = retailers
    .filter(r => enabled.includes(r.key))
    .map(async r => {
      try {
        const data = await r.scrape(r.url(product), size);
        return { retailer: r.name, key: r.key, url: r.url(product), ...data };
      } catch (err) {
        return { retailer: r.name, key: r.key, url: r.url(product), error: err.message || String(err) };
      }
    });

  const results = await Promise.all(jobs);
  res.json({ product, size: sizeStr, results, ts: new Date().toISOString() });
});

app.listen(PORT, () => logger.info(`Price Scraper API listening on :${PORT}`));
