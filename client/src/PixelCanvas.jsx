import { useRef, useEffect } from 'react';

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

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');

    canvas.width = world[0].length * TILE_PX;
    canvas.height = world.length * TILE_PX;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.forEach((row, y) => {
      row.forEach((tile, x) => {
        drawTile(ctx, tile, x * TILE_PX, y * TILE_PX, TILE_PX);
      });
    });
  }, [world]);

  function handleClick(e) {
    const rect = ref.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    let path = [];
    let tiles = world;
    let size = TILE_PX;
    while (true) {
      const side = tiles[0].length; // 80 for root, 8 for children, …
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

  return <canvas ref={ref} onClick={handleClick} className="border" />;
}