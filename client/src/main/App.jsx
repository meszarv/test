import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import PixelCanvas from './PixelCanvas';

const socket = io('http://localhost:3000');

function App() {
  const [world, setWorld] = useState(null);
  const [myColor] = useState(() => `hsl(${Math.random()*360},70%,50%)`);

  useEffect(() => {
    socket.on('init', data => setWorld(data.world));
    socket.on('update', ({ path, tile }) => {
      setWorld(prev => {
        const next = structuredClone(prev);
        let ref = next;
        for (let i = 0; i < path.length; i++) {
          const idx = path[i];
          const side = i === 0 ? 80 : 8;
          const y = Math.floor(idx / side);
          const x = idx % side;
          if (i === path.length - 1) {
            ref[y][x] = tile;
          } else {
            ref = ref[y][x].children;
          }
        }
        return next;
      });
    });
  }, []);

  if (!world) return <p className="p-4 text-center">Loading world…</p>;

  return (
    <div className="flex justify-center p-4">
      <PixelCanvas world={world} socket={socket} myColor={myColor} />
    </div>
  );
}

export default App;