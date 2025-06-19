const SUBDIV = 8;

export function computeOwnedBorders(
  tile,
  grid,
  gx,
  gy,
  myId,
  showOwnedBorders,
  parentOwnerId = null,
  parentNeighbors = {},
) {
  const ownerId = tile.owner?.id || parentOwnerId;
  const isMine = ownerId === myId;

  const width = grid[0].length;
  const height = grid.length;
  const neighbors = {
    top: gy > 0 ? grid[gy - 1][gx] : null,
    right: gx < width - 1 ? grid[gy][gx + 1] : null,
    bottom: gy < height - 1 ? grid[gy + 1][gx] : null,
    left: gx > 0 ? grid[gy][gx - 1] : null,
  };

  const ownerOf = (t, fallback = null) => (t ? t.owner?.id || fallback : fallback);

  function segmentsFor(dir) {
    if (!showOwnedBorders || !isMine) return [];

    let neighbor = neighbors[dir];
    let neighborOwner = ownerOf(neighbor, parentOwnerId);

    if (!neighbor) {
      neighbor = parentNeighbors[dir];
      neighborOwner = ownerOf(neighbor, parentOwnerId);
      if (parentOwnerId === ownerId) return [];
      return neighborOwner !== ownerId ? [[0, 1]] : [];
    }

    if (!neighbor.children) {
      return neighborOwner !== ownerId ? [[0, 1]] : [];
    }

    const segs = [];
    for (let i = 0; i < SUBDIV; i++) {
      let idx;
      if (dir === 'top') idx = (SUBDIV - 1) * SUBDIV + i;
      if (dir === 'bottom') idx = i;
      if (dir === 'left') idx = i * SUBDIV + (SUBDIV - 1);
      if (dir === 'right') idx = i * SUBDIV;
      const child = neighbor.children[idx];
      const childOwner = ownerOf(child, neighborOwner);
      if (childOwner !== ownerId) {
        segs.push([i / SUBDIV, (i + 1) / SUBDIV]);
      }
    }
    return segs;
  }

  return {
    top: segmentsFor('top'),
    right: segmentsFor('right'),
    bottom: segmentsFor('bottom'),
    left: segmentsFor('left'),
  };
}
