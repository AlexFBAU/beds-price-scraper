// src/scrapers/bensons.js
// Bensons for Beds — variant-aware scraper (TEMPUR-safe)
// Anchors on [data-variant-id] and [data-entity-id] so we don't grab a global price.
// Matches sizes in both cm and feet/inches (e.g., "5'0 King", "6'0 Super King").

export async function scrapeBensons(page, { sizeCm }) {
  // Small settle time for client-side hydration
  try { if (page.waitForNetworkIdle) await page.waitForNetworkIdle({ timeout: 2000 }); } catch {}

  const normal = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const cm = normal(sizeCm || '');
  const cmSpaced = normal((sizeCm || '').replace('x', ' x '));

  // TEMPUR-friendly aliases (cm + ft/in labels)
  const sizeAliases = (() => {
    const map = {
      '75x190'  : ["small single","2'6","2ft6","75x190","75 x 190"],
      '90x190'  : ["single","3'0","3ft","3ft0","90x190","90 x 190"],
      '120x190' : ["small double","4'0","4ft","120x190","120 x 190"],
      '135x190' : ["double","4'6","4ft6","135x190","135 x 190"],
      '150x200' : ["king","king size","kingsize","5'0","5ft","150x200","150 x 200"],
      '180x200' : ["super king","superking","super king size","6'0","6ft","180x200","180 x 200"],
      // Add zip & link tokens later if you support them
    };
    const base = map[cm] || [cm, cmSpaced];
    return Array.from(new Set(base.map(normal)));
  })();

  // Wait until variant blocks exist (either attribute)
  await page
    .waitForSelector('[data-variant-id], [data-entity-id]', { timeout: 15000 })
    .catch(() => {});

  const result = await page.evaluate((sizeAliases) => {
    const norm = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const nums = (s = '') => s.replace(/[^\d.]/g, '');
    const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const getVid = (el) => el.getAttribute('data-variant-id') || el.getAttribute('data-entity-id');

    // 1) Resolve selected/active variant id from DOM/JSON/URL
    const trySelectedVariantId = () => {
      // Selected element carrying variant/entity id
      const chosen = document.querySelector(
        '[aria-pressed="true"][data-variant-id], .is-selected[data-variant-id], .selected[data-variant-id], [data-variant-id].active, input[type="radio"][data-variant-id]:checked, option[data-variant-id][selected],' +
        '[aria-pressed="true"][data-entity-id], .is-selected[data-entity-id], .selected[data-entity-id], [data-entity-id].active, input[type="radio"][data-entity-id]:checked, option[data-entity-id][selected]'
      );
      if (chosen?.getAttribute) {
        const vid = getVid(chosen);
        if (vid) return vid;
      }

      // Any element that looks selected or mentions our size
      const tagged = $all('[data-variant-id], [data-entity-id]').find((el) => {
        const txt = norm(el.textContent || '');
        const sel = el.matches('.is-selected, .selected, .active, [aria-current="true"]');
        const mentionsSize = sizeAliases.some((a) => txt.includes(norm(a)));
        return sel || mentionsSize;
      });
      if (tagged) return getVid(tagged);

      // JSON state blobs with selectedVariantId
      const scripts = $all('script');
      for (const s of scripts) {
        const t = (s.getAttribute('type') || '').toLowerCase();
        const raw = s.textContent || '';
        if (!raw) continue;
        if (t.includes('json') || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
          try {
            const data = JSON.parse(raw);
            const found = [];
            const walk = (n) => {
              if (!n || typeof n !== 'object') return;
              if (Array.isArray(n)) { n.forEach(walk); return; }
              if ('selectedVariantId' in n && n.selectedVariantId) found.push(String(n.selectedVariantId));
              Object.values(n).forEach(walk);
            };
            walk(data);
            if (found.length) return found[0];
          } catch {}
        }
      }

      // URL patterns (?variant= or /variant/VID or /v/VID)
      try {
        const url = new URL(location.href);
        if (url.searchParams.has('variant')) return url.searchParams.get('variant');
        const m = url.pathname.match(/(?:variant|v|vid)[-/](\d{4,})/i);
        if (m) return m[1];
      } catch {}
      return null;
    };

    const selectedVariantId = trySelectedVariantId();

    // 2) Candidate variant elements
    const variantEls = $all('[data-variant-id], [data-entity-id]');
    if (!variantEls.length) return { error: 'No variant elements found' };

    const pickVariantEl = () => {
      if (selectedVariantId) {
        const exact = variantEls.find((el) => getVid(el) === String(selectedVariantId));
        if (exact) return exact;
      }
      // Prefer an element whose text mentions our size
      const bySize = variantEls.find((el) => {
        const txt = norm(el.textContent || '');
        return sizeAliases.some((a) => txt.includes(norm(a)));
      });
      if (bySize) return bySize;

      // Then any element that looks selected/active
      const byState = variantEls.find((el) => el.matches('.is-selected, .selected, .active, [aria-current="true"]'));
      if (byState) return byState;

      // Fallback to first (still safer than global price)
      return variantEls[0];
    };

    const target = pickVariantEl();
    if (!target) return { error: 'No target variant block' };

    // 3) Price resolution within/near the chosen variant
    const priceSelectors = [
      '[data-test*="price"]',
      '[data-qa*="price"]',
      '[class*="price"] [class*="value"]',
      '[itemprop="price"]',
      '.price__value', '.price--current', '.current-price', '.sales', '.price'
    ].join(',');

    let scope = target;
    const container = target.closest('.product, .pdp, .product-detail, form, .buybox, .price-block, section, .panel');
    if (!scope && container) scope = container;

    let priceEl = scope.querySelector(priceSelectors);
    if (!priceEl && container) priceEl = container.querySelector(priceSelectors);
    if (!priceEl) {
      // as a last attempt, take the nearest price element up to 2 levels up
      let up = target.parentElement;
      for (let i = 0; i < 2 && up && !priceEl; i++, up = up.parentElement) {
        priceEl = up.querySelector(priceSelectors);
      }
    }
    if (!priceEl) return { error: 'No price element near target variant' };

    const raw = priceEl.getAttribute('content') || priceEl.textContent || '';
    const price = Number(nums(raw));
    if (!isFinite(price) || price <= 0) return { error: 'Price not parseable' };

    // Currency sniff
    const currency =
      priceEl.getAttribute('data-currency') ||
      (document.querySelector('meta[itemprop="priceCurrency"], [itemprop="priceCurrency"]')?.getAttribute('content')) ||
      (/\bgbp\b/i.test(raw) ? 'GBP' : 'GBP');

    // Helpful for debugging: does the local text mention our size?
    const nearTxt = norm((container || target).textContent || '');
    const mentionsTargetSize = sizeAliases.some((a) => nearTxt.includes(norm(a)));

    return { price, currency, ok: true, mentionsTargetSize, selectedVariantId: selectedVariantId || null };
  }, sizeAliases);

  if (result?.ok) {
    try {
      console.log(
        '[bensons] vid=%s price=%s %s',
        result.selectedVariantId,
        result.price,
        result.mentionsTargetSize ? '' : '(size not confirmed)'
      );
    } catch {}
    return { price: result.price, currency: result.currency, promoText: null };
  }

  throw new Error('Bensons: variant-specific price not found — ' + (result?.error || 'unknown error'));
}
