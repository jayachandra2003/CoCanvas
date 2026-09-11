const ADJECTIVES = [
  'swift',
  'bright',
  'cosmic',
  'clever',
  'silent',
  'vibrant',
  'epic',
  'golden',
  'lucid',
  'neon',
  'stellar',
  'radiant',
  'zen',
];

const NOUNS = [
  'canvas',
  'studio',
  'sketch',
  'board',
  'vector',
  'pixel',
  'space',
  'nexus',
  'draft',
  'orbit',
  'matrix',
  'prism',
];

export function generateRoomId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
}
