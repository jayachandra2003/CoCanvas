import * as Y from 'yjs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

console.log('🧪 Starting Yjs UndoManager Verification Tests...\n');

// 1. Initialize Y.Doc & UndoManager with captureTimeout: 0 for discrete atomic user actions
const doc = new Y.Doc();
const elementsMap = doc.getMap('elements');
const localOrigin = 'local-client';

const undoManager = new Y.UndoManager(elementsMap, {
  trackedOrigins: new Set([localOrigin]),
  captureTimeout: 0,
});

// Test 1: Single Pen Stroke Add -> Undo -> Redo
console.log('--- Test 1: Freehand Pen Stroke Add -> Undo -> Redo ---');
const stroke1 = {
  id: 'stroke-1',
  type: 'pen',
  x: 100,
  y: 100,
  points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 25 }],
  strokeColor: '#FFFFFF',
  strokeWidth: 4,
  opacity: 1,
  createdAt: 1000,
  updatedAt: 1000,
  createdBy: 'local-user',
};

doc.transact(() => {
  elementsMap.set(stroke1.id, stroke1);
}, localOrigin);

assert(elementsMap.size === 1, 'elementsMap has 1 item after adding stroke');
assert(undoManager.undoStack.length === 1, 'undoStack has 1 item');
assert(undoManager.redoStack.length === 0, 'redoStack is empty');

// Undo
undoManager.undo();
assert(elementsMap.size === 0, 'elementsMap is empty after undo');
assert(undoManager.undoStack.length === 0, 'undoStack is empty after undo');
assert(undoManager.redoStack.length === 1, 'redoStack has 1 item after undo');

// Redo
undoManager.redo();
assert(elementsMap.size === 1, 'elementsMap has 1 item after redo');
assert(elementsMap.get('stroke-1').id === 'stroke-1', 'stroke-1 element restored on redo');

// Test 2: Sequence of Shape Operations (Rect, Ellipse, Line, Text)
console.log('\n--- Test 2: Multiple Shape Additions and Sequential Undo ---');
const rect = {
  id: 'rect-1',
  type: 'rectangle',
  x: 200,
  y: 200,
  width: 150,
  height: 100,
  strokeColor: '#3B82F6',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  createdAt: 2000,
  updatedAt: 2000,
  createdBy: 'local-user',
};

const text = {
  id: 'text-1',
  type: 'text',
  x: 400,
  y: 400,
  text: 'Hello World',
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
  opacity: 1,
  fontSize: 24,
  fontFamily: 'Inter',
  createdAt: 3000,
  updatedAt: 3000,
  createdBy: 'local-user',
};

doc.transact(() => {
  elementsMap.set(rect.id, rect);
}, localOrigin);

doc.transact(() => {
  elementsMap.set(text.id, text);
}, localOrigin);

assert(elementsMap.size === 3, 'elementsMap contains 3 elements (stroke, rect, text)');
assert(undoManager.undoStack.length === 3, 'undoStack contains 3 transactions');

// Undo text
undoManager.undo();
assert(elementsMap.size === 2, 'elementsMap has 2 items after undoing text');
assert(!elementsMap.has('text-1'), 'text-1 removed after undo');
assert(elementsMap.has('rect-1'), 'rect-1 still present');

// Undo rect
undoManager.undo();
assert(elementsMap.size === 1, 'elementsMap has 1 item after undoing rect');
assert(!elementsMap.has('rect-1'), 'rect-1 removed after undo');
assert(elementsMap.has('stroke-1'), 'stroke-1 still present');

// Redo rect & text
undoManager.redo();
assert(elementsMap.has('rect-1'), 'rect-1 restored after redo');
undoManager.redo();
assert(elementsMap.has('text-1'), 'text-1 restored after redo');
assert(elementsMap.size === 3, 'elementsMap restored to 3 elements');

// Test 3: Element Repositioning / Move Drag -> Undo restores coordinates
console.log('\n--- Test 3: Move Drag -> Undo restores initial coordinates ---');
doc.transact(() => {
  elementsMap.set('rect-1', {
    ...elementsMap.get('rect-1'),
    x: 550,
    y: 650,
    updatedAt: 4000,
  });
}, localOrigin);

assert(elementsMap.get('rect-1').x === 550, 'rect-1 moved to x=550');
assert(elementsMap.get('rect-1').y === 650, 'rect-1 moved to y=650');

undoManager.undo();
assert(elementsMap.get('rect-1').x === 200, 'rect-1 x restored to 200 after undo');
assert(elementsMap.get('rect-1').y === 200, 'rect-1 y restored to 200 after undo');

undoManager.redo();
assert(elementsMap.get('rect-1').x === 550, 'rect-1 x restored to 550 after redo');
assert(elementsMap.get('rect-1').y === 650, 'rect-1 y restored to 650 after redo');

// Test 4: Eraser / Object Deletion -> Undo restores deleted element
console.log('\n--- Test 4: Eraser Delete -> Undo restores deleted element ---');
doc.transact(() => {
  elementsMap.delete('stroke-1');
}, localOrigin);

assert(!elementsMap.has('stroke-1'), 'stroke-1 deleted');
assert(elementsMap.size === 2, 'elementsMap now has 2 elements');

undoManager.undo();
assert(elementsMap.has('stroke-1'), 'stroke-1 restored after undoing eraser delete');
assert(elementsMap.size === 3, 'elementsMap restored to 3 elements');

undoManager.redo();
assert(!elementsMap.has('stroke-1'), 'stroke-1 deleted again after redo');

console.log('\n🎉 ALL YJS UNDO/REDO TESTS PASSED PERFECTLY!\n');
