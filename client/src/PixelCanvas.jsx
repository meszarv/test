import { useRef, useEffect, useState } from 'react';

const TILE_PX = 10; // top‑level tile rendered 10×10 CSS pixels

function drawTile(ctx, tile, x, y, size) {
  if (tile.children) {
    const childSize = size / 8;
    tile.children.forEach((child, i) => {
      const cx = i % 8;
      const cy = Math.floor(i / 8);
      drawTile(ctx, child, x + cx * childSize, y + cy * childSize, childSize);
    });
  } else {
    ctx.fillStyle = tile.owner?.color || '#ddd';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(x, y, size, size);
  }
}

export default function PixelCanvas({ world, socket, myColor }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');

    canvas.width = world[0].length * TILE_PX;
    canvas.height = world.length * TILE_PX;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    world.forEach((row, y) => {
      row.forEach((tile, x) => {
        drawTile(ctx, tile, x * TILE_PX, y * TILE_PX, TILE_PX);
      });
    });
  }, [world, scale, offset]);

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
      tiles = tile.children.reduce((rows, t, i) => {
        const r = Math.floor(i / 8);
        if (!rows[r]) rows[r] = [];
        rows[r].push(t);
        return rows;
      }, []);
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
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
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
    setOffset(prev => ({
      x: x - (x - prev.x) * factor,
      y: y - (y - prev.y) * factor,
    }));
    setScale(prev => Math.max(0.2, Math.min(10, prev * factor)));
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
