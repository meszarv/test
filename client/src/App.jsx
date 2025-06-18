import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import PixelCanvas from './PixelCanvas';
import Toolbar from './Toolbar';

const socket = io('http://localhost:3000');

function App() {
  const [world, setWorld] = useState(null);
  const [myColor] = useState(() => `hsl(${Math.random()*360},70%,50%)`);
  const [showGrid, setShowGrid] = useState(true);
  const [showBorders, setShowBorders] = useState(true);

  useEffect(() => {
    socket.on('init', data => setWorld(data.world));
    socket.on('update', ({ path, tile }) => {
      setWorld(prev => {
        const next = structuredClone(prev);
        let ref = next;
        for (let i = 0; i < path.length; i++) {
          const idx = path[i];
          if (i === 0) {
            const side = ref[0].length;
            const y = Math.floor(idx / side);
            const x = idx % side;
            if (path.length === 1) {
              ref[y][x] = tile;
            } else {
              ref = ref[y][x].children;
            }
          } else {
            if (i === path.length - 1) {
              ref[idx] = tile;
            } else {
              ref = ref[idx].children;
            }
          }
        }
        return next;
      });
    });
  }, []);

  if (!world) return <p className="p-4 text-center">Loading world…</p>;

  return (
    <>
      <Toolbar
        showGrid={showGrid}
        toggleGrid={() => setShowGrid(prev => !prev)}
        showBorders={showBorders}
        toggleBorders={() => setShowBorders(prev => !prev)}
      />
      <PixelCanvas
        world={world}
        socket={socket}
        myColor={myColor}
        showGrid={showGrid}
        showOwnedBorders={showBorders}
      />
    </>
  );
}

export default App;