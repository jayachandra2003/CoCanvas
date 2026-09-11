import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Initialize Firebase only if valid configuration is provided
if (
  typeof window !== 'undefined' &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (error) {
    console.warn('[Firebase] Initialization skipped or failed:', error);
  }
}

/**
 * Saves a Yjs binary update snapshot to Firestore for zero-peer rehydration.
 */
export async function saveRoomSnapshotToFirestore(
  roomId: string,
  updateBinary: Uint8Array
): Promise<void> {
  if (!db) return;
  try {
    // Convert Uint8Array to Base64 string for Firestore document storage
    let binary = '';
    const bytes = new Uint8Array(updateBinary);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Update = btoa(binary);

    const roomRef = doc(db, 'canvas_rooms', roomId);
    await setDoc(
      roomRef,
      {
        snapshot: base64Update,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firestore Snapshot] Save failed (non-blocking):', error);
  }
}

/**
 * Loads the latest room snapshot from Firestore if no peers are currently online.
 */
export async function loadRoomSnapshotFromFirestore(
  roomId: string
): Promise<Uint8Array | null> {
  if (!db) return null;
  try {
    const roomRef = doc(db, 'canvas_rooms', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data || !data.snapshot) return null;

    const binaryString = atob(data.snapshot);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.warn('[Firestore Snapshot] Load failed (non-blocking):', error);
    return null;
  }
}
