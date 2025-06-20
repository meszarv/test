import assert from 'assert';
import { computeOwnedBorders } from '../src/utils/ownedBorders.js';

function gridify(children) {
  return children.reduce((rows, t, i) => {
    const r = Math.floor(i / 8);
    if (!rows[r]) rows[r] = [];
    rows[r].push(t);
    return rows;
  }, []);
}

function collectTileLines(
  lines,
  tile,
  grid,
  gx,
  gy,
  x,
  y,
  size,
  myId,
  showGrid,
  showOwnedBorders,
  parentOwnerId = null,
  parentNeighbors = {},
  depth = 0,
) {
  if (!showGrid && !showOwnedBorders) return;

  const width = grid[0].length;
  const height = grid.length;
  const neighbors = {
    top: gy > 0 ? grid[gy - 1][gx] : null,
    right: gx < width - 1 ? grid[gy][gx + 1] : null,
    bottom: gy < height - 1 ? grid[gy + 1][gx] : null,
    left: gx > 0 ? grid[gy][gx - 1] : null,
  };

  if (tile.children) {
    const childSize = size / 8;
    const childGrid = gridify(tile.children);
    tile.children.forEach((child, i) => {
      const cx = i % 8;
      const cy = Math.floor(i / 8);
      const childParentNeighbors = {};
      ['top', 'right', 'bottom', 'left'].forEach(side => {
        let n = neighbors[side] || parentNeighbors[side] || null;
        if (!neighbors[side] && parentNeighbors[side] && parentNeighbors[side].children) {
          let idx;
          if (side === 'top') idx = 7 * 8 + cx;
          if (side === 'bottom') idx = cx;
          if (side === 'left') idx = cy * 8 + 7;
          if (side === 'right') idx = cy * 8;
          n = parentNeighbors[side].children[idx];
        }
        childParentNeighbors[side] = n;
      });
      collectTileLines(
        lines,
        child,
        childGrid,
        cx,
        cy,
        x + cx * childSize,
        y + cy * childSize,
        childSize,
        myId,
        showGrid,
        showOwnedBorders,
        tile.owner?.id || parentOwnerId,
        childParentNeighbors,
        depth + 1,
      );
    });
  }

  const drawGreen = computeOwnedBorders(tile, grid, gx, gy, myId, showOwnedBorders, parentOwnerId, parentNeighbors);

  const edges = [
    ['top',    { x, y },             { x: x + size, y },             { x: 0, y: -2 }, neighbors.top],
    ['right',  { x: x + size, y },   { x: x + size, y: y + size },   { x: 2, y: 0 }, neighbors.right],
    ['bottom', { x: x + size, y: y + size }, { x, y: y + size },      { x: 0, y: 2 }, neighbors.bottom],
    ['left',   { x, y: y + size },   { x, y },                       { x: -2, y: 0 }, neighbors.left],
  ];

  function shouldDrawGrid(side, neighbor) {
    if (!showGrid || drawGreen[side].length > 0) return false;
    const n = neighbor || parentNeighbors[side] || null;
    if (!n) return true;
    if (tile.level < n.level) return true;
    if (tile.level > n.level) return false;
    return side === 'top' || side === 'left';
  }

  edges.forEach(([side, from, to, offset, neighbor]) => {
    if (shouldDrawGrid(side, neighbor)) {
      lines.push({ side, from, to });
    }
  });
}

function makeTile(level, ownerId = null) {
  return { level, owner: ownerId ? { id: ownerId, color: '#' + ownerId } : null, claims: 0, children: null };
}

(function testGridLineBetweenDifferentLevels() {
  const left = makeTile(0, 'me');
  left.children = Array.from({ length: 64 }, () => makeTile(1));
  const right = makeTile(0);
  const world = [[left, right]];
  const lines = [];
  for (let x = 0; x < 2; x++) {
    collectTileLines(lines, world[0][x], world, x, 0, x * 10, 0, 10, 'me', true, false);
  }
  const boundary = lines.find(l =>
    l.from.x === 10 && l.to.x === 10 && l.from.y === 10 && l.to.y === 0
  );
  assert.ok(boundary, 'expected grid line between subdivided and normal tiles');
})();

console.log('grid line tests passed');
