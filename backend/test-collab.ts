import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, DrawingObject, PencilObject, RectangleObject } from '../shared/types';

const SERVER_URL = 'http://localhost:5000';
const ROOM_ID = 'TEST_ROOM_COL';

async function runCollabTest() {
  console.log('🧪 Starting CollabDraw Multi-Client Automated Integration Test...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
    }
  }

  // 1. Connect Client A (Alice)
  const clientA: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
    transports: ['websocket'],
  });

  const clientB: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
    transports: ['websocket'],
  });

  await new Promise<void>((resolve) => {
    let aConnected = false;
    let bConnected = false;

    clientA.on('connect', () => {
      aConnected = true;
      if (aConnected && bConnected) resolve();
    });

    clientB.on('connect', () => {
      bConnected = true;
      if (aConnected && bConnected) resolve();
    });
  });

  assert(clientA.connected && clientB.connected, 'Client A & Client B connected to Socket.IO server');

  // 2. Join Room
  const aJoinedPromise = new Promise<any>((res) => clientA.once('room-joined', res));
  const bJoinedPromise = new Promise<any>((res) => clientB.once('room-joined', res));
  const aNotifiedBJoined = new Promise<any>((res) => clientA.once('user-joined', res));

  clientA.emit('join-room', { roomId: ROOM_ID, userName: 'Alice' });
  const aJoinData = await aJoinedPromise;
  assert(aJoinData.self.userName === 'Alice', 'Alice joined room and received self presence');

  clientB.emit('join-room', { roomId: ROOM_ID, userName: 'Bob' });
  const bJoinData = await bJoinedPromise;
  assert(bJoinData.self.userName === 'Bob', 'Bob joined room and received self presence');

  const bNotif = await aNotifiedBJoined;
  assert(bNotif.userName === 'Bob', 'Alice notified when Bob joined room');

  // 3. Multi-user cursor tracking
  const bCursorPromise = new Promise<any>((res) => clientB.once('cursor-update', res));
  clientA.emit('cursor-move', { roomId: ROOM_ID, point: { x: 120, y: 340 } });
  const cursorUpdate = await bCursorPromise;
  assert(
    cursorUpdate.userName === 'Alice' && cursorUpdate.cursor.x === 120 && cursorUpdate.cursor.y === 340,
    'Bob received real-time cursor position from Alice'
  );

  // 4. Alice draws a Pencil stroke
  const aliceStroke: PencilObject = {
    id: `pencil_${Date.now()}_a`,
    type: 'pencil',
    roomId: ROOM_ID,
    userId: aJoinData.self.userId,
    userName: 'Alice',
    userColor: aJoinData.self.userColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    strokeColor: '#ef4444',
    strokeWidth: 4,
    points: [{ x: 10, y: 10 }, { x: 20, y: 25 }, { x: 30, y: 40 }],
    isDeleted: false,
  };

  const bReceivedStrokePromise = new Promise<DrawingObject>((res) => clientB.once('object-created', res));
  clientA.emit('object-create', { roomId: ROOM_ID, object: aliceStroke });
  const bReceivedStroke = await bReceivedStrokePromise;
  assert(
    bReceivedStroke.id === aliceStroke.id && bReceivedStroke.type === 'pencil',
    'Bob received live drawing object created by Alice'
  );

  // 5. Bob draws a Rectangle
  const bobRect: RectangleObject = {
    id: `rect_${Date.now()}_b`,
    type: 'rectangle',
    roomId: ROOM_ID,
    userId: bJoinData.self.userId,
    userName: 'Bob',
    userColor: bJoinData.self.userColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    strokeColor: '#3b82f6',
    strokeWidth: 3,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    isDeleted: false,
  };

  const aReceivedRectPromise = new Promise<DrawingObject>((res) => clientA.once('object-created', res));
  clientB.emit('object-create', { roomId: ROOM_ID, object: bobRect });
  const aReceivedRect = await aReceivedRectPromise;
  assert(
    aReceivedRect.id === bobRect.id && aReceivedRect.type === 'rectangle',
    'Alice received rectangle shape created by Bob'
  );

  // 6. Collaborative Undo Safety: Alice calls Undo
  // Should only undo Alice's stroke, keeping Bob's rectangle intact!
  const bUndoNotifPromise = new Promise<any>((res) => clientB.once('undo-performed', res));
  clientA.emit('undo', { roomId: ROOM_ID });
  const undoResult = await bUndoNotifPromise;

  assert(
    undoResult.objectId === aliceStroke.id && undoResult.isDeleted === true && undoResult.userId === aJoinData.self.userId,
    "Alice undo only soft-deleted Alice's stroke (Bob's drawing is safe)"
  );

  // 7. Collaborative Redo: Alice calls Redo
  const bRedoNotifPromise = new Promise<any>((res) => clientB.once('redo-performed', res));
  clientA.emit('redo', { roomId: ROOM_ID });
  const redoResult = await bRedoNotifPromise;
  assert(
    redoResult.objectId === aliceStroke.id && redoResult.isDeleted === false,
    "Alice redo restored Alice's stroke"
  );

  // 8. Bob disconnects
  const aUserLeftPromise = new Promise<any>((res) => clientA.once('user-left', res));
  clientB.disconnect();
  const leftData = await aUserLeftPromise;
  assert(leftData.userName === 'Bob', 'Alice notified that Bob disconnected');

  // 9. Rejoin / Persistence Verification: Client C joins the room
  const clientC: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
    transports: ['websocket'],
  });

  const cJoinedPromise = new Promise<any>((res) => clientC.once('room-joined', res));
  clientC.emit('join-room', { roomId: ROOM_ID, userName: 'Charlie' });
  const cData = await cJoinedPromise;

  assert(
    cData.room.objects.length >= 2,
    `New collaborator Charlie received full persistent board snapshot (${cData.room.objects.length} objects)`
  );

  clientA.disconnect();
  clientC.disconnect();

  console.log(`\n🎉 Test Results: ${passedTests}/${totalTests} tests passed successfully!\n`);
  process.exit(passedTests === totalTests ? 0 : 1);
}

runCollabTest().catch((err) => {
  console.error('Integration test failed with error:', err);
  process.exit(1);
});
