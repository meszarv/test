import assert from 'assert';
import { computeOwnedBorders } from '../src/utils/ownedBorders.js';
import { parseGrid, address, addressForPath } from './gridUtils.js';

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

(function testCousinDifferentLevelDifferentOwners() {
  const leftParent = makeTile('otherA');
  leftParent.children = Array.from({ length: 64 }, () => makeTile(null));
  const boundaryChild = makeTile('otherA');
  leftParent.children[7] = boundaryChild; // top-right child
  boundaryChild.children = Array.from({ length: 64 }, () => makeTile(null));
  const grand = makeTile('me');
  boundaryChild.children[7] = grand; // top-right grandchild

  const rightParent = makeTile('otherB');
  const grandRows = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => boundaryChild.children[y * 8 + x]));

  const res = computeOwnedBorders(grand, grandRows, 7, 0, 'me', true, 'otherA', { right: rightParent });
  const full = [[0, 1]];
  assert.deepStrictEqual(res.right, full);
})();

(function testCousinDifferentLevelSameOwner() {
  const leftParent = makeTile('me');
  leftParent.children = Array.from({ length: 64 }, () => makeTile(null));
  const boundaryChild = makeTile('me');
  leftParent.children[7] = boundaryChild; // top-right child
  boundaryChild.children = Array.from({ length: 64 }, () => makeTile(null));
  const grand = makeTile('me');
  boundaryChild.children[7] = grand; // top-right grandchild

  const rightParent = makeTile('me');
  const grandRows = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => boundaryChild.children[y * 8 + x]));

  const res = computeOwnedBorders(grand, grandRows, 7, 0, 'me', true, 'me', { right: rightParent });
  assert.deepStrictEqual(res.right, []);
})();

(function testAdjacentParentsChildrenSameOwner() {
  const leftParent = makeTile('otherA');
  leftParent.children = Array.from({ length: 64 }, () => makeTile(null));
  const leftChild = makeTile('me');
  leftParent.children[7] = leftChild; // top-right child

  const rightParent = makeTile('otherB');
  rightParent.children = Array.from({ length: 64 }, () => makeTile(null));
  const rightChild = makeTile('me');
  rightParent.children[0] = rightChild; // top-left child

  const leftRows = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => leftParent.children[y * 8 + x]));
  const rightRows = Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => rightParent.children[y * 8 + x]));

  const resLeft = computeOwnedBorders(leftChild, leftRows, 7, 0, 'me', true, 'otherA', { right: rightParent });
  assert.deepStrictEqual(resLeft.right, []);

  const resRight = computeOwnedBorders(rightChild, rightRows, 0, 0, 'me', true, 'otherB', { left: leftParent });
  assert.deepStrictEqual(resRight.left, []);
})();

(function testGridHelpers() {
  const { grid, refs } = parseGrid(`
    A.
    .B
  `);
  assert.strictEqual(address(refs.A.x, refs.A.y), 'A1');
  assert.strictEqual(address(refs.B.x, refs.B.y), 'B2');
  const path = [refs.B.y * 8 + refs.B.x];
  assert.strictEqual(addressForPath(path), 'B2');
})();

console.log('owned border tests passed');
