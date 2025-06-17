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
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
  }
}

export default function PixelCanvas({ world, socket, myColor }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // remember the minimum zoom level so we can prevent zooming out past it
  const minScale = useRef(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  // Fit world height to the viewport and record the minimum scale
  useEffect(() => {
    if (!world) return;
    const scaleToFit = window.innerHeight / (world.length * TILE_PX);
    minScale.current = scaleToFit;
    const worldWidth = world[0].length * TILE_PX * scaleToFit;
    setScale(scaleToFit);
    setOffset({ x: (window.innerWidth - worldWidth) / 2, y: 0 });
  }, [world]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rootSize = TILE_PX * scale;

    world.forEach((row, y) => {
      row.forEach((tile, x) => {
        drawTile(
          ctx,
          tile,
          offset.x + x * rootSize,
          offset.y + y * rootSize,
          rootSize,
        );
      });
    });
  }, [world, scale, offset, size]);

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

    const newScale = Math.max(minScale.current, scale * factor);
    const applied = newScale / scale;
    setOffset(prev => ({
      x: x - (x - prev.x) * applied,
      y: y - (y - prev.y) * applied,
    }));
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
