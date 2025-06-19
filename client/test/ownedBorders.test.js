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
  const full = [[0, 1]];
  assert.deepStrictEqual(res, { top: full, right: full, bottom: full, left: full });
})();

(function testSameOwnerNeighbor() {
  const myTile = makeTile('me');
  const myTile2 = makeTile('me');
  const world = grid([[myTile, myTile2]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', true);
  const full = [[0, 1]];
  assert.deepStrictEqual(res, { top: full, right: [], bottom: full, left: full });
})();

(function testBordersDisabled() {
  const myTile = makeTile('me');
  const world = grid([[myTile]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', false);
  assert.deepStrictEqual(res, { top: [], right: [], bottom: [], left: [] });
})();

(function testWorldEdge() {
  const myTile = makeTile('me');
  const world = grid([[myTile]]);
  const res = computeOwnedBorders(myTile, world, 0, 0, 'me', true);
  const full = [[0, 1]];
  assert.deepStrictEqual(res, { top: full, right: full, bottom: full, left: full });
})();

(function testNotMineNoOutline() {
  const otherTile = makeTile('other');
  const world = grid([[otherTile]]);
  const res = computeOwnedBorders(otherTile, world, 0, 0, 'me', true);
  assert.deepStrictEqual(res, { top: [], right: [], bottom: [], left: [] });
})();

(function testChildBoundaryWithDifferentNeighbor() {
  const parent = makeTile('me');
  const childA = makeTile('me');
  const childB = makeTile('me');
  parent.children = [childA, childB];
  const childGrid = [[childA, childB]];
  const neighbor = makeTile('other');
  const res = computeOwnedBorders(childB, childGrid, 1, 0, 'me', true, 'me', { right: neighbor });
  assert.deepStrictEqual(res, { top: [], right: [], bottom: [], left: [] });
})();

(function testChildWorldEdgeNoOutline() {
  const parent = makeTile('me');
  const child = makeTile('me');
  parent.children = [child];
  const childGrid = [[child]];
  const res = computeOwnedBorders(child, childGrid, 0, 0, 'me', true, 'me');
  assert.deepStrictEqual(res, { top: [], right: [], bottom: [], left: [] });
})();

(function testParentChildSharedEdge() {
  const top = makeTile('me');
  const neighborParent = makeTile('other');
  neighborParent.children = Array.from({ length: 64 }, () => makeTile(null));
  const child = makeTile('me');
  neighborParent.children[0] = child; // top-left child
  const childRows = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => neighborParent.children[y * 8 + x]));
  const world = [[top, neighborParent]];
  const resTop = computeOwnedBorders(top, world, 0, 0, 'me', true);
  const expected = [];
  for (let i = 1; i < 8; i++) expected.push([i / 8, (i + 1) / 8]);
  assert.deepStrictEqual(resTop.right, expected);
  const resChild = computeOwnedBorders(child, childRows, 0, 0, 'me', true, 'other', { top });
  assert.deepStrictEqual(resChild.top, []);
})();

console.log('owned border tests passed');
