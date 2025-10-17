import got from 'got';

export async function fetchHtml(url) {
  const res = await got(url, {
    http2: true,
    timeout: { request: 20000 },
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  return res.body;
}
