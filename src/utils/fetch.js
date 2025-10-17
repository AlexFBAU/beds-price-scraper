import got from 'got';

const BEE = process.env.SCRAPINGBEE_API_KEY;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function fetchHtml(url) {
  if (BEE) {
    const api = 'https://app.scrapingbee.com/api/v1';
    const searchParams = {
      api_key: BEE,
      url,
      render_js: 'true',
      block_resources: 'false',
      wait: '1500',
      country_code: 'gb'  // UK view
    };
    const res = await got(api, {
      searchParams,
      timeout: { request: 30000 },
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' }
    });
    return res.body;
  }

  const res = await got(url, {
    http2: true,
    timeout: { request: 20000 },
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' }
  });
  return res.body;
}
