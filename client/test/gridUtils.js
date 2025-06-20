export function parseGrid(str) {
  const rows = str.trim().split(/\n/).map(r => r.trim().replace(/\s+/g, ''));
  const refs = {};
  const grid = rows.map((line, y) => {
    return Array.from(line).map((ch, x) => {
      const tile = { owner: ch === '.' ? null : { id: ch, color: '#' + ch }, children: null };
      if (ch !== '.') refs[ch] = { tile, x, y };
      return tile;
    });
  });
  return { grid, refs };
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function address(x, y) {
  return LETTERS[x] + String(y + 1);
}
export function addressForPath(path) {
  const parts = [];
  for (let level = 0; level < path.length; level++) {
    const idx = path[level];
    const x = idx % 8;
    const y = Math.floor(idx / 8);
    parts.push(address(x, y));
  }
  return parts.join('/');
}
