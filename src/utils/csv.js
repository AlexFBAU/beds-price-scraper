export function toCsv(rows) {
  if (!rows.length) return 'retailer,key,url,price,notes\n';
  const cols = Object.keys(rows[0]);
  const esc = (v) => String(v).includes(',') || String(v).includes('"')
    ? `"${String(v).replace(/"/g,'""')}"`
    : String(v);
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => esc(r[c] ?? '')).join(',')).join('\n');
  return header + '\n' + body + '\n';
}
