# Beds Are Uzzz — Price Scraper (MVP)

A lightweight, **hostable** Node.js scraper that pulls mattress prices from multiple retailer product pages and exposes them via an API.

## Why this version will work better
- Falls back through **multiple price sources**: JSON‑LD (`offers.price`), microdata, and robust currency regex.
- **Size-aware** parsing (e.g. matches “150x200”, “150 x 200”, “Kingsize”).
- Clean, **single-file scrapers** per retailer + shared utilities.
- **Express API**: `GET /api/prices?product=vispring-regal-superb&size=150x200`
- **CLI**: `npm run scrape` prints a table and writes `output/prices.csv`

> No headless browser is used by default to keep it simple, cheap, and reliable on hosts like Render Free.
> If a site is heavily scripted, we can add Playwright later behind a feature flag for just that site.

---

## Setup (Local)
1. Install Node 18+
2. Unzip the project
3. In the project folder:
   ```bash
   npm install
   cp .env.example .env
   # edit .env if you want to override defaults
   npm run scrape
   npm start
   ```
4. Open http://localhost:3000/api/prices?product=vispring-regal-superb&size=150x200

## Deploy on Render (Free)
1. Create a new **Web Service**
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment: Node 18+ (default ok)

If Render idles on free tier, the API will cold start automatically on first hit.

## Add/Change Retailers
- Add a new file in `scrapers/` exporting `scrape(url, sizeCm)`.
- Register it in `retailers.js` with a `name`, `url`, and the scraper function.

## Notes
- This MVP aims to parse **public** product pages. Be mindful of each site’s Terms of Service and robots.txt.
- For daily scheduled emails + Google Sheets updates, we can add a cron worker next.
