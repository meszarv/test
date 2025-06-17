// Simple Node + Socket.IO authoritative server that also hosts the built client
const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');

const WORLD_W = 80;
const WORLD_H = 60;
const CLAIMS_TO_OWN = 100;
const SUBDIV = 8;

// ─── data model ────────────────────────────────────────────────────────────
class Tile {
  constructor(level, owner = null) {
    this.level    = level;
    this.owner    = owner; // { id, color } | null
    this.claims   = 0;
    this.children = null;  // becomes 64‑el array after subdivision
  }
}

function createWorld() {
  return Array.from({ length: WORLD_H }, () =>
    Array.from({ length: WORLD_W }, () => new Tile(0)),
  );
}

const world = createWorld();

// (getTile, subdivide – unchanged, left out for brevity)

// ─── networking + static files ─────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// In production, serve the built React bundle
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  const staticDir = path.join(__dirname, '../client/dist');
  app.use(express.static(staticDir));
  app.get('*', (_, res) => res.sendFile(path.join(staticDir, 'index.html')));
} else {
  // quick sanity check for dev if you hit :3000 directly
  app.get('/', (_, res) => res.send('Pixeland API – dev mode'));
}

io.on('connection', socket => {
  /* …exact same Socket.IO logic as before… */
});

server.listen(3000, () =>
  console.log(`🌍  Pixeland server running on :3000  (${isProd ? 'prod' : 'dev'})`),
);