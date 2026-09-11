import * as Y from 'yjs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

console.log('🧪 Starting Multi-Client Yjs CRDT Synchronization & Undo Isolation Tests...\n');

// 1. Initialize Client A
const docA = new Y.Doc();
const mapA = docA.getMap('elements');
const clientAOrigin = 'client-A';
const undoManagerA = new Y.UndoManager(mapA, {
  trackedOrigins: new Set([clientAOrigin]),
  captureTimeout: 0,
});

// 2. Initialize Client B
const docB = new Y.Doc();
const mapB = docB.getMap('elements');
const clientBOrigin = 'client-B';
const undoManagerB = new Y.UndoManager(mapB, {
  trackedOrigins: new Set([clientBOrigin]),
  captureTimeout: 0,
});

// Wire simulated bidirectional real-time sync channel
docA.on('update', (update, origin) => {
  if (origin !== 'network-sync') {
    Y.applyUpdate(docB, update, 'network-sync');
  }
});

docB.on('update', (update, origin) => {
  if (origin !== 'network-sync') {
    Y.applyUpdate(docA, update, 'network-sync');
  }
});

// Test 1: Client A draws a Rectangle
console.log('--- Test 1: Client A draws a Rectangle ---');
const rectA = {
  id: 'rect-from-A',
  type: 'rectangle',
  x: 50,
  y: 50,
  width: 200,
  height: 120,
  strokeColor: '#3B82F6',
  fillColor: 'transparent',
  strokeWidth: 4,
  opacity: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  createdBy: clientAOrigin,
};

docA.transact(() => {
  mapA.set(rectA.id, rectA);
}, clientAOrigin);

assert(mapA.size === 1, 'Doc A contains rectA');
assert(mapB.size === 1, 'Doc B synchronized rectA in real-time');
assert(mapB.get('rect-from-A').strokeColor === '#3B82F6', 'Doc B has exact properties of rectA');
assert(undoManagerA.undoStack.length === 1, 'UndoManager A has 1 item');
assert(undoManagerB.undoStack.length === 0, 'UndoManager B has 0 items (did not track remote update)');

// Test 2: Client B draws a Freehand Stroke simultaneously
console.log('\n--- Test 2: Client B draws a Freehand Stroke ---');
const strokeB = {
  id: 'stroke-from-B',
  type: 'pen',
  x: 300,
  y: 300,
  points: [{ x: 0, y: 0 }, { x: 15, y: 20 }, { x: 30, y: 40 }],
  strokeColor: '#10B981',
  strokeWidth: 2,
  opacity: 1,
  createdAt: Date.now() + 10,
  updatedAt: Date.now() + 10,
  createdBy: clientBOrigin,
};

docB.transact(() => {
  mapB.set(strokeB.id, strokeB);
}, clientBOrigin);

assert(mapB.size === 2, 'Doc B has 2 elements (rectA + strokeB)');
assert(mapA.size === 2, 'Doc A received strokeB in real-time');
assert(undoManagerA.undoStack.length === 1, 'UndoManager A still only tracks its 1 local item');
assert(undoManagerB.undoStack.length === 1, 'UndoManager B now has 1 local item');

// Test 3: Client A calls Undo -> Only rectA should be removed from BOTH docs
console.log('\n--- Test 3: Client A calls Undo (Multiplayer Undo Isolation) ---');
undoManagerA.undo();

assert(mapA.size === 1, 'Doc A has 1 element left after Client A undo');
assert(mapB.size === 1, 'Doc B has 1 element left after Client A undo');
assert(!mapA.has('rect-from-A'), 'rectA removed from Doc A');
assert(!mapB.has('rect-from-A'), 'rectA removed from Doc B');
assert(mapA.has('stroke-from-B'), "Client B's strokeB remains intact on Doc A");
assert(mapB.has('stroke-from-B'), "Client B's strokeB remains intact on Doc B");

// Test 4: Client B calls Undo -> strokeB should be removed from BOTH docs
console.log('\n--- Test 4: Client B calls Undo ---');
undoManagerB.undo();

assert(mapA.size === 0, 'Doc A is empty after both undid their changes');
assert(mapB.size === 0, 'Doc B is empty after both undid their changes');

// Test 5: Client A calls Redo -> rectA should be restored on BOTH docs
console.log('\n--- Test 5: Client A calls Redo ---');
undoManagerA.redo();

assert(mapA.size === 1, 'Doc A has 1 element after Client A redo');
assert(mapB.size === 1, 'Doc B has 1 element after Client A redo');
assert(mapA.has('rect-from-A'), 'rectA restored on Doc A');
assert(mapB.has('rect-from-A'), 'rectA restored on Doc B');

// Test 6: Client B calls Redo -> strokeB restored on BOTH docs
console.log('\n--- Test 6: Client B calls Redo ---');
undoManagerB.redo();

assert(mapA.size === 2, 'Doc A has both elements restored');
assert(mapB.size === 2, 'Doc B has both elements restored');
assert(mapA.has('rect-from-A') && mapA.has('stroke-from-B'), 'Doc A holds all elements');
assert(mapB.has('rect-from-A') && mapB.has('stroke-from-B'), 'Doc B holds all elements');

console.log('\n🎉 ALL MULTI-CLIENT CRDT SYNC & UNDO ISOLATION TESTS PASSED!\n');
