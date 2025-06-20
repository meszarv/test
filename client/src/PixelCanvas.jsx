import { useRef, useEffect, useState } from 'react';
import { computeOwnedBorders } from './utils/ownedBorders.js';

const TILE_PX = 10; // top-level tile rendered 10×10 CSS pixels
const CLAIMS_TO_OWN = 3;

function drawProgress(ctx, x, y, size, progress) {
  const seg = progress * 4; // 4 sides
  let p = seg;
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);

  // top
  if (p <= 1) {
    ctx.lineTo(x + size * p, y);
    ctx.stroke();
    return;
  }
  ctx.lineTo(x + size, y);
  p -= 1;

  // right
  if (p <= 1) {
    ctx.lineTo(x + size, y + size * p);
    ctx.stroke();
    return;
  }
  ctx.lineTo(x + size, y + size);
  p -= 1;

  // bottom
  if (p <= 1) {
    ctx.lineTo(x + size - size * p, y + size);
    ctx.stroke();
    return;
  }
  ctx.lineTo(x, y + size);
  p -= 1;

  // left
  if (p <= 1) {
    ctx.lineTo(x, y + size - size * p);
    ctx.stroke();
    return;
  }
  ctx.lineTo(x, y);
  ctx.stroke();
}

function gridify(children) {
  return children.reduce((rows, t, i) => {
    const r = Math.floor(i / 8);
    if (!rows[r]) rows[r] = [];
    rows[r].push(t);
    return rows;
  }, []);
}


function drawLines(ctx, lines) {
  lines.forEach(line => {
    ctx.save();
    ctx.globalAlpha = 0.2;
    if (line.type === 'grid') {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    } else if (line.type === 'border') {
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'green';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = line.offset.x;
      ctx.shadowOffsetY = line.offset.y;
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawTilePixels(ctx, tile, x, y, size, myId, parentOwnerId = null) {
  const isOwnedByMe = tile.owner?.id === myId;

  if (tile.children) {
    const childSize = size / 8;
    tile.children.forEach((child, i) => {
      const cx = i % 8;
      const cy = Math.floor(i / 8);
      drawTilePixels(
        ctx,
        child,
        x + cx * childSize,
        y + cy * childSize,
        childSize,
        myId,
        tile.owner?.id || parentOwnerId,
      );
    });
  } else {
    ctx.fillStyle = isOwnedByMe ? tile.owner.color : '#ccc';
    ctx.fillRect(x, y, size, size);
  }

  if (!tile.owner && tile.claims > 0 && !tile.children) {
    drawProgress(ctx, x, y, size, tile.claims / CLAIMS_TO_OWN);
  }
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
    if (n.children) return false;
    if (tile.level < n.level) return true;
    if (tile.level > n.level) return false;
    return side === 'top' || side === 'left';
  }

  edges.forEach(([side, from, to, offset, neighbor]) => {
    if (shouldDrawGrid(side, neighbor)) {
      lines.push({ from, to, tiles: [tile, neighbor], type: 'grid' });
    }

    drawGreen[side].forEach(([s, e]) => {
      if (side === 'top') {
        lines.push({
          from: { x: x + s * size, y },
          to: { x: x + e * size, y },
          tiles: [tile, neighbor],
          type: 'border',
          offset,
        });
      } else if (side === 'right') {
        lines.push({
          from: { x: x + size, y: y + s * size },
          to: { x: x + size, y: y + e * size },
          tiles: [tile, neighbor],
          type: 'border',
          offset,
        });
      } else if (side === 'bottom') {
        lines.push({
          from: { x: x + e * size, y: y + size },
          to: { x: x + s * size, y: y + size },
          tiles: [tile, neighbor],
          type: 'border',
          offset,
        });
      } else if (side === 'left') {
        lines.push({
          from: { x, y: y + e * size },
          to: { x, y: y + s * size },
          tiles: [tile, neighbor],
          type: 'border',
          offset,
        });
      }
    });
  });
}

export default function PixelCanvas({ world, socket, myColor, showGrid, showOwnedBorders }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // remember the minimum zoom level so we can prevent zooming out past it
  const minScale = useRef(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  function clampOffset(x, y, s = scale) {
    const worldWidth = world[0].length * TILE_PX * s;
    const worldHeight = world.length * TILE_PX * s;

    const centerX = (size.width - worldWidth) / 2;
    const centerY = (size.height - worldHeight) / 2;

    const minX = worldWidth > size.width ? size.width - worldWidth : centerX;
    const maxX = worldWidth > size.width ? 0 : centerX;
    const minY = worldHeight > size.height ? size.height - worldHeight : centerY;
    const maxY = worldHeight > size.height ? 0 : centerY;

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }

  // Track the viewport size so we can resize and redraw the canvas
  useEffect(() => {
    function resize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Apply the latest size to the canvas element
  useEffect(() => {
    const canvas = ref.current;
    canvas.width = size.width;
    canvas.height = size.height;
  }, [size]);

  // Keep offset within bounds whenever size or scale changes
  useEffect(() => {
    setOffset(prev => clampOffset(prev.x, prev.y));
  }, [size, scale]);

  // Fit world height to the viewport and record the minimum scale
  // Run only on first world load so panning/zoom is preserved across updates
  useEffect(() => {
    if (!world || initialized.current) return;
    const scaleToFit = window.innerHeight / (world.length * TILE_PX);
    minScale.current = scaleToFit;
    const worldWidth = world[0].length * TILE_PX * scaleToFit;
    setScale(scaleToFit);
    setOffset({ x: (window.innerWidth - worldWidth) / 2, y: 0 });
    initialized.current = true;
  }, [world]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rootSize = TILE_PX * scale;
    const myId = socket.id;

    world.forEach((row, y) => {
      row.forEach((tile, x) => {
        const px = offset.x + x * rootSize;
        const py = offset.y + y * rootSize;
        drawTilePixels(ctx, tile, px, py, rootSize, myId);
      });
    });

    const lines = [];
    world.forEach((row, y) => {
      row.forEach((tile, x) => {
        const px = offset.x + x * rootSize;
        const py = offset.y + y * rootSize;
        collectTileLines(lines, tile, world, x, y, px, py, rootSize, myId, showGrid, showOwnedBorders, null, {}, 0);
      });
    });
    drawLines(ctx, lines);
  }, [world, scale, offset, size, socket.id, showGrid, showOwnedBorders]);

  function handleClick(e) {
    const rect = ref.current.getBoundingClientRect();
    let x = (e.clientX - rect.left - offset.x) / scale;
    let y = (e.clientY - rect.top - offset.y) / scale;

    let path = [];
    let tiles = world;
    let size = TILE_PX;
    while (true) {
      const side = tiles[0].length; // root width (8) or 8 for children
      const tx = Math.floor(x / size);
      const ty = Math.floor(y / size);
      const idx = ty * side + tx;
      path.push(idx);

      const tile = tiles[ty][tx];
      if (!tile.children) break;

      // go one level deeper
      x = x % size;
      y = y % size;
      size = size / 8;
      tiles = gridify(tile.children);
    }

    socket.emit('click', { path, color: myColor });
  }

  function handleMouseDown(e) {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setOffset(prev => clampOffset(prev.x + dx, prev.y + dy));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() {
    dragging.current = false;
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;

    const newScale = Math.max(minScale.current, scale * factor);
    const applied = newScale / scale;
    setOffset(prev => clampOffset(
      x - (x - prev.x) * applied,
      y - (y - prev.y) * applied,
      newScale,
    ));
    setScale(newScale);
  }

  return (
    <canvas
      ref={ref}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="border" />
  );
}
