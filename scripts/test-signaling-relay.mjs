import WebSocket from 'ws';

const serverUrl = 'wss://y-webrtc-signaling.fly.dev';
const topic = 'test-topic-' + Date.now();

console.log(`Testing signaling relay on ${serverUrl} with topic: ${topic}...`);

const ws1 = new WebSocket(serverUrl);
const ws2 = new WebSocket(serverUrl);

let ws1Received = false;
let ws2Received = false;

ws1.on('open', () => {
  console.log('WS1 connected');
  ws1.send(JSON.stringify({ type: 'subscribe', topics: [topic] }));
  ws1.send(JSON.stringify({ type: 'publish', topic: topic, data: { from: 'client-1', text: 'hello from 1' } }));
});

ws1.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('WS1 received:', msg);
  if (msg.data && msg.data.from === 'client-2') {
    ws1Received = true;
  }
});

ws2.on('open', () => {
  console.log('WS2 connected');
  ws2.send(JSON.stringify({ type: 'subscribe', topics: [topic] }));
  setTimeout(() => {
    ws2.send(JSON.stringify({ type: 'publish', topic: topic, data: { from: 'client-2', text: 'hello from 2' } }));
  }, 500);
});

ws2.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('WS2 received:', msg);
  if (msg.data && msg.data.from === 'client-1') {
    ws2Received = true;
  }
});

setTimeout(() => {
  console.log(`Results: ws1Received = ${ws1Received}, ws2Received = ${ws2Received}`);
  ws1.close();
  ws2.close();
  if (ws1Received || ws2Received) {
    console.log('✅ Signaling server successfully relays messages!');
  } else {
    console.log('❌ Signaling server DID NOT relay message!');
  }
  process.exit(0);
}, 3000);
