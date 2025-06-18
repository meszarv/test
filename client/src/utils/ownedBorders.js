export function computeOwnedBorders(tile, grid, gx, gy, myId, showOwnedBorders, parentOwnerId = null) {
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

  const neighborOwnerId = line => line ? (line.owner?.id || parentOwnerId) : parentOwnerId;
  const needOutline = line => isMine && neighborOwnerId(line) !== ownerId;

  return {
    top: showOwnedBorders && needOutline(neighbors.top),
    right: showOwnedBorders && needOutline(neighbors.right),
    bottom: showOwnedBorders && needOutline(neighbors.bottom),
    left: showOwnedBorders && needOutline(neighbors.left),
  };
}
