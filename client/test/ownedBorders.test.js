import assert from 'assert';
import { computeOwnedBorders } from '../src/utils/ownedBorders.js';

function makeTile(id) {
  return { owner: id ? { id, color: '#' + id } : null, children: null };
}

// simple grid helper
function grid(rows) {
  return rows;
}

(function testDifferentNeighbor() {
  const myTile = makeTile('me');
  const other = makeTile('other');
  const world = grid([[myTile, other]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', true);
  assert.deepStrictEqual(res, { top: true, right: true, bottom: true, left: true });
})();

(function testSameOwnerNeighbor() {
  const myTile = makeTile('me');
  const myTile2 = makeTile('me');
  const world = grid([[myTile, myTile2]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', true);
  assert.deepStrictEqual(res, { top: true, right: false, bottom: true, left: true });
})();

(function testBordersDisabled() {
  const myTile = makeTile('me');
  const world = grid([[myTile]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', false);
  assert.deepStrictEqual(res, { top: false, right: false, bottom: false, left: false });
})();

(function testWorldEdge() {
  const myTile = makeTile('me');
  const world = grid([[myTile]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', true);
  assert.deepStrictEqual(res, { top: true, right: true, bottom: true, left: true });
})();

(function testNotMineNoOutline() {
  const otherTile = makeTile('other');
  const world = grid([[otherTile]]);
  const res = computeOwnedBorders(otherTile, world, 0, 0, 'me', true);
  assert.deepStrictEqual(res, { top: false, right: false, bottom: false, left: false });
})();

(function testChildBoundaryWithDifferentNeighbor() {
  const parent = makeTile('me');
  const childA = makeTile('me');
  const childB = makeTile('me');
  parent.children = [childA, childB];
  const childGrid = [[childA, childB]];
  const neighbor = makeTile('other');
  // compute border for rightmost child; neighbor is on the right at parent level
  const res = computeOwnedBorders(childB, childGrid, 1, 0, 'me', true, 'me');
  assert.deepStrictEqual(res, { top: false, right: false, bottom: false, left: false });
})();

(function testChildWorldEdgeNoOutline() {
  const parent = makeTile('me');
  const child = makeTile('me');
  parent.children = [child];
  const childGrid = [[child]];
  const res = computeOwnedBorders(child, childGrid, 0, 0, 'me', true, 'me');
  assert.deepStrictEqual(res, { top: false, right: false, bottom: false, left: false });
})();

console.log('owned border tests passed');
