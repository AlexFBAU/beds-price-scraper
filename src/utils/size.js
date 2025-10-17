export function parseSize(sizeStr) {
  // accepts '150x200' or '150 x 200' or 'Kingsize'
  const s = sizeStr.trim().toLowerCase();
  const out = { width: 150, length: 200, aliases: ['kingsize','king size','king'] };
  const m = s.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})/);
  if (m) {
    out.width = Number(m[1]);
    out.length = Number(m[2]);
  } else if (s.includes('king')) {
    out.width = 150; out.length = 200;
  }
  out.patterns = [
    `${out.width}x${out.length}`,
    `${out.width} x ${out.length}`,
    `${out.width} × ${out.length}`,
    String(out.width),
    ...out.aliases
  ];
  return out;
}

export function textMatchesSize(text, size) {
  const t = (text||'').toLowerCase();
  return size.patterns.some(p => t.includes(String(p)));
}
