import { useRef, useEffect, useState } from 'react';

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

function drawTile(ctx, tile, grid, gx, gy, x, y, size, myId, parentOwnerId = null) {
  if (tile.children) {
    const childSize = size / 8;
    const childGrid = gridify(tile.children);
    tile.children.forEach((child, i) => {
      const cx = i % 8;
      const cy = Math.floor(i / 8);
      drawTile(
        ctx,
        child,
        childGrid,
        cx,
        cy,
        x + cx * childSize,
        y + cy * childSize,
        childSize,
        myId,
        tile.owner?.id || parentOwnerId,
      );
    });
  } else {
    ctx.fillStyle = tile.owner?.color || (tile.level > 0 ? '#fff' : '#ddd');
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
  }

  if (!tile.owner && tile.claims > 0 && !tile.children) {
    drawProgress(ctx, x, y, size, tile.claims / CLAIMS_TO_OWN);
  }

  const isMine = tile.owner && tile.owner.id === myId;
  const width = grid[0].length;
  const height = grid.length;
  const neighbors = {
    top: gy > 0 ? grid[gy - 1][gx] : null,
    right: gx < width - 1 ? grid[gy][gx + 1] : null,
    bottom: gy < height - 1 ? grid[gy + 1][gx] : null,
    left: gx > 0 ? grid[gy][gx - 1] : null,
  };

  const needOutline = line => {
    if (isMine) return !line || line.owner?.id !== myId;
    if (parentOwnerId === myId) return true;
    return false;
  };

  ctx.strokeStyle = 'green';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let drew = false;
  if (needOutline(neighbors.top)) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    drew = true;
  }
  if (needOutline(neighbors.right)) {
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size, y + size);
    drew = true;
  }
  if (needOutline(neighbors.bottom)) {
    ctx.moveTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    drew = true;
  }
  if (needOutline(neighbors.left)) {
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y);
    drew = true;
  }
  if (drew) ctx.stroke();
}

export default function PixelCanvas({ world, socket, myColor }) {
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
        drawTile(
          ctx,
          tile,
          world,
          x,
          y,
          offset.x + x * rootSize,
          offset.y + y * rootSize,
          rootSize,
          myId,
        );
      });
    });
  }, [world, scale, offset, size, socket.id]);

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
