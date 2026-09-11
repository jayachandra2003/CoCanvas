import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

const signalingServers = [
  'wss://y-webrtc-signaling.fly.dev',
  'wss://webrtc-signaling.fly.dev',
  'ws://127.0.0.1:4444',
  'ws://localhost:4444',
];

const testRoom = 'zen-vector-557';
console.log(`🧪 Running Comprehensive 2-Client Live WebRTC Test on Room: "${testRoom}"...\n`);

// Client A
const docA = new Y.Doc();
const mapA = docA.getMap('elements');
const clientAUser = { clientId: 'user-A', name: 'Creative Fox', color: '#3B82F6' };
const providerA = new WebrtcProvider(`collab-room-${testRoom}`, docA, {
  signaling: signalingServers,
  WebSocketPolyfill: WebSocket,
});
providerA.awareness.setLocalState({
  user: clientAUser,
  cursor: { x: 100, y: 150 },
  activeTool: 'rectangle',
  selectedElementIds: ['rect-A'],
});
const undoManagerA = new Y.UndoManager(mapA, {
  trackedOrigins: new Set([clientAUser.clientId]),
  captureTimeout: 0,
});

// Client B
const docB = new Y.Doc();
const mapB = docB.getMap('elements');
const clientBUser = { clientId: 'user-B', name: 'Swift Falcon', color: '#10B981' };
const providerB = new WebrtcProvider(`collab-room-${testRoom}`, docB, {
  signaling: signalingServers,
  WebSocketPolyfill: WebSocket,
});
providerB.awareness.setLocalState({
  user: clientBUser,
  cursor: { x: 300, y: 400 },
  activeTool: 'ellipse',
  selectedElementIds: [],
});
const undoManagerB = new Y.UndoManager(mapB, {
  trackedOrigins: new Set([clientBUser.clientId]),
  captureTimeout: 0,
});

// Wait 1.5s for WebRTC signaling handshake
setTimeout(() => {
  console.log('--- Step 1: Signaling & Awareness Handshake ---');
  const statesA = providerA.awareness.getStates();
  const statesB = providerB.awareness.getStates();
  console.log(`Client A sees ${statesA.size} total peers`);
  console.log(`Client B sees ${statesB.size} total peers`);

  assert(statesA.size >= 2, 'Client A sees 2 peers in awareness');
  assert(statesB.size >= 2, 'Client B sees 2 peers in awareness');

  // Step 2: Client A draws a Rectangle
  console.log('\n--- Step 2: Client A draws Rectangle ---');
  docA.transact(() => {
    mapA.set('rect-A', {
      id: 'rect-A',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      strokeColor: '#3B82F6',
      fillColor: 'transparent',
      strokeWidth: 4,
      opacity: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: clientAUser.clientId,
    });
  }, clientAUser.clientId);

  // Give 500ms for P2P data sync
  setTimeout(() => {
    assert(mapB.has('rect-A'), 'Client B received rect-A from Client A in real-time');
    assert(mapB.get('rect-A').width === 200, "Client B has exact dimensions of Client A's rectangle");

    // Step 3: Client B draws an Ellipse
    console.log('\n--- Step 3: Client B draws Ellipse ---');
    docB.transact(() => {
      mapB.set('ellipse-B', {
        id: 'ellipse-B',
        type: 'ellipse',
        x: 400,
        y: 300,
        width: 120,
        height: 120,
        strokeColor: '#10B981',
        strokeWidth: 2,
        opacity: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: clientBUser.clientId,
      });
    }, clientBUser.clientId);

    setTimeout(() => {
      assert(mapA.has('ellipse-B'), 'Client A received ellipse-B from Client B in real-time');
      assert(mapA.size === 2 && mapB.size === 2, 'Both clients converge to 2 elements');

      // Step 4: Undo Isolation Test
      console.log('\n--- Step 4: Undo Isolation Test (Client A undos) ---');
      undoManagerA.undo();

      setTimeout(() => {
        assert(!mapA.has('rect-A'), 'rect-A removed on Client A');
        assert(!mapB.has('rect-A'), 'rect-A removed on Client B');
        assert(mapA.has('ellipse-B'), "Client B's ellipse remains intact on Client A");
        assert(mapB.has('ellipse-B'), "Client B's ellipse remains intact on Client B");

        // Step 5: Disconnect Test
        console.log('\n--- Step 5: Client B Disconnect Test ---');
        providerB.destroy();

        setTimeout(() => {
          const finalStatesA = providerA.awareness.getStates();
          console.log(`Client A sees ${finalStatesA.size} peer(s) after Client B closed`);
          assert(finalStatesA.size === 1, 'Client A correctly updated peer count to 1 after Client B disconnected');

          providerA.destroy();
          console.log('\n🎉 ALL LIVE WEBRTC TESTS PASSED WITH 100% SUCCESS!\n');
          process.exit(0);
        }, 1200);
      }, 500);
    }, 500);
  }, 500);
}, 1800);
