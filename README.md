# CollabDraw

> **"Draw together. Create together."**  
> A high-performance, SaaS-grade real-time collaborative whiteboard engineered for low-latency multiplayer sketching, diagramming, and state synchronization.

---

## 🌟 Table of Contents
1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Real-Time Synchronization Engine](#real-time-synchronization-engine)
6. [Multi-Layer Rendering & Performance Optimizations](#multi-layer-rendering--performance-optimizations)
7. [Collaborative Undo / Redo Architecture](#collaborative-undo--redo-architecture)
8. [Data Model & Persistence](#data-model--persistence)
9. [Interview Q&A & Technical Deep-Dive](#interview-qa--technical-deep-dive)
10. [Local Development Guide](#local-development-guide)
11. [Environment Variables](#environment-variables)
12. [Production Deployment Guide](#production-deployment-guide)
13. [Testing Guide](#testing-guide)
14. [Future Scalability Roadmap](#future-scalability-roadmap)

---

## 🚀 Overview

**CollabDraw** is a full-stack real-time collaborative vector drawing platform built with Next.js 14, HTML5 Canvas API, Node.js/Express, TypeScript, Socket.IO, and MongoDB Atlas. 

Unlike basic canvas apps that send heavy pixel snapshots over WebSockets, CollabDraw is engineered with an **operation-based delta synchronization protocol**, **requestAnimationFrame multi-layer rendering**, **sub-16ms local latency optimistic execution**, and a **user-scoped tombstone history stack** for collaborative undo/redo safety.

---

## ✨ Key Features

- **Multiplayer Drawing**: Concurrent multi-user drawing with zero jitter or locking.
- **Rich Vector Toolkit**:
  - **Select & Move**: Bounding box hit-testing and drag-and-drop transformation.
  - **Pencil / Brush**: Organic quadratic bezier curve smoothing for natural stylus/mouse strokes.
  - **Geometry Shapes**: Lines, directional Arrows, Rectangles (with rounded corners & fills), and Circles/Ellipses.
  - **Text Tool**: Inline rich typography placement with multi-line auto-wrapping.
  - **Object-Level Eraser**: Precise geometric hit-testing for non-destructive stroke/shape removal.
- **Real-Time Multiplayer Cursors**: Live remote cursor tracking with user name badges and distinct vibrant color assignments.
- **Collaborative Presence**: Live collaborator roster with avatars, initials, and real-time connection status indicators (🟢 Connected, 🟡 Reconnecting, 🔴 Disconnected).
- **Collaborative-Safe Undo/Redo**: User-partitioned action history — your undo never deletes your teammate's simultaneous work.
- **Canvas Viewport Controls**: Infinite-feel virtual canvas with zoom focal centering (10% to 500%), Spacebar + drag panning, and a real-time minimap.
- **Export Formats**: One-click export to high-resolution PNG, scalable vector SVG, or structured JSON snapshots.
- **State Persistence**: In-memory active room registry with debounced MongoDB Atlas persistence and graceful offline fallback.

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │               Client A (Next.js)             │
                               │  - Multi-Layer Canvas (Static + Draft + UI)  │
                               │  - Optimistic Local Execution Loop           │
                               │  - Throttled Delta Emitter (~30ms)           │
                               └──────────────────────┬───────────────────────┘
                                                      │ WebSocket (Socket.IO)
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CollabDraw Backend (Node.js + Express)                                 │
│                                                                                                        │
│  ┌───────────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────────────┐  │
│  │   Zod Event Validation    │───▶│    In-Memory RoomManager  │───▶│   User-Scoped Undo/Redo Stack  │  │
│  │ (Coordinate/Payload Guard)│    │(Active Objects & Presence)│    │  (Tombstone State Management)  │  │
│  └───────────────────────────┘    └─────────────┬─────────────┘    └────────────────────────────────┘  │
│                                                 │                                                      │
│                                                 ▼ (Async Debounced Sync)                               │
│                                  ┌─────────────────────────────┐                                       │
│                                  │   Canvas Persistence Service│                                       │
│                                  └──────────────┬──────────────┘                                       │
└─────────────────────────────────────────────────┼──────────────────────────────────────────────────────┘
                                                  │ Mongoose ODM
                                                  ▼
                                   ┌─────────────────────────────┐
                                   │  MongoDB Atlas (Durable DB) │
                                   │  - Rooms                    │
                                   │  - DrawingObjects           │
                                   └─────────────────────────────┘
                                                  ▲
                                                  │ WebSocket (Socket.IO)
                               ┌──────────────────┴───────────────────────────┐
                               │               Client B (Next.js)             │
                               │  - Live In-Flight Draft Stream Render        │
                               │  - Remote Multi-Cursor Position Trackers     │
                               │  - Local Canvas State Synchronization        │
                               └──────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router) + React 18 | High-performance client routing, SSR landing page, fast builds |
| **Language** | TypeScript | End-to-end type safety between client and server |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Clean, responsive, SaaS-grade UI tokens |
| **Canvas Engine** | HTML5 2D Canvas API | Sub-millisecond rendering loops, hardware acceleration |
| **Real-Time Transport** | Socket.IO (WebSockets + Polling Fallback) | Low latency, room multiplexing, auto-reconnection |
| **Backend Framework** | Node.js + Express | Lightweight, event-driven async I/O |
| **Validation** | Zod | Runtime payload safety preventing malicious data injection |
| **Database** | MongoDB Atlas (Mongoose) | Flexible JSON-like document model for vector objects |

---

## 📡 Real-Time Synchronization Engine

CollabDraw rejects naive full-canvas snapshot syncing in favor of an **event-driven delta protocol**:

1. **`join-room`**: Client transmits requested room code and display name. Server registers socket into RoomManager and returns complete `RoomState` (committed objects + active peer roster).
2. **`cursor-move`**: Throttled (~30ms) stream containing normalized world coordinates `(x, y)`. Broadcasts `cursor-update` to peers for rendering smooth multiplayer cursor tags.
3. **`draw-stream`**: While a user drags the pencil or stretches a shape, intermediate coordinate deltas are streamed in real time. Remote peers render these on their **Draft Layer** without dirtying the static canvas.
4. **`draw-stream-end` & `object-create`**: Once pointer is released, the completed geometric object is committed atomically to the server and persisted.
5. **`object-update`**: Transmits transformation deltas (position shifts, text changes) when moving shapes or editing typography.
6. **`object-delete`**: Geometric hit-tested object deletions broadcasted to peers.
7. **`undo` / `redo`**: Dispatches user-scoped tombstone reversals.

---

## ⚡ Multi-Layer Rendering & Performance Optimizations

1. **Multi-Layered Canvas Architecture**:
   - **Static Layer**: Renders all committed vector objects and background grid. Only redraws on camera pan/zoom or object mutation.
   - **Draft / In-Progress Layer**: Renders high-frequency active local strokes and remote collaborator drawing streams at 60fps via `requestAnimationFrame` without recomputing static elements.
   - **Interactive / Overlay Layer**: Handles pointer events, selection bounding boxes, resize handles, and DOM-based multiplayer cursor nametags.
2. **Bezier Curve Smoothing**:
   - Freehand pencil strokes utilize midpoint quadratic bezier interpolation (`quadraticCurveTo`), eliminating jagged line artifacts.
3. **Event Throttling & Batching**:
   - Pointer events are decoupled from network socket emission using timestamp throttling (30ms for cursors, 25ms for active stroke streams).
4. **Optimistic Local Execution**:
   - Local drawings are rendered instantly on pointer events with zero network round-trip delay.
5. **High-DPI Retina Sharpness**:
   - Automatic `devicePixelRatio` scaling ensures crisp vector lines on modern high-resolution displays.

---

## 🛡️ Collaborative Undo / Redo Architecture

In a multiplayer environment, naive global undo stacks cause critical race conditions (e.g. User A hitting Ctrl+Z could delete User B's recently drawn diagram).

### Solution: User-Scoped Tombstone Stack
- Each room maintains separate `userUndoStacks` and `userRedoStacks` keyed by `userId`.
- When User A triggers `undo`:
  1. RoomManager inspects User A's history stack.
  2. Locates User A's latest active object ID.
  3. Sets `isDeleted: true` (tombstone marker) and moves the object to User A's redo stack.
  4. Broadcasts `undo-performed` to all connected clients with `{ objectId, isDeleted: true }`.
- **Result**: User A's stroke disappears seamlessly while all concurrent drawings created by User B remain 100% untouched.

---

## 🗄️ Data Model & Persistence

### 1. MongoDB `DrawingObject` Schema
```typescript
interface IDrawingObject {
  objectId: string;      // Unique collision-free ID
  roomId: string;        // Room association
  type: string;          // 'pencil' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text'
  userId: string;        // Creator ID
  userName: string;      // Creator Name
  userColor: string;     // Creator Theme Color
  data: {
    points?: Point[];    // Freehand trajectory
    x?: number; y?: number; width?: number; height?: number;
    startX?: number; startY?: number; endX?: number; endY?: number;
    centerX?: number; centerY?: number; radiusX?: number; radiusY?: number;
    text?: string; fontSize?: number; fontFamily?: string;
    strokeColor: string; fillColor?: string; strokeWidth: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted'; opacity?: number;
  };
  isDeleted: boolean;    // Soft-delete tombstone
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Transient vs Persistent State Separation
- **Transient State** (In-Memory): Active cursor positions, live in-flight drawing streams, socket connection IDs, viewport coordinates.
- **Persistent State** (MongoDB Atlas): Board metadata, committed vector objects, soft-deletion status, creation timestamps.

---

## 🎯 Interview Q&A & Technical Deep-Dive

#### 1. Why HTML5 Canvas API over SVG or DOM elements?
> HTML5 Canvas renders directly to a bitmap buffer using hardware-accelerated 2D context. DOM/SVG nodes introduce significant memory overhead and DOM layout thrashing when handling thousands of freehand bezier points. Canvas ensures consistent 60fps performance regardless of object complexity.

#### 2. Why Socket.IO over raw WebSockets?
> Socket.IO provides built-in room multiplexing (`socket.join(roomId)`), automatic reconnection with exponential backoff, heartbeat/ping-pong health checks, and fallback to HTTP long-polling behind strict corporate firewalls.

#### 3. How do you optimize network payload during rapid mouse moves?
> We employ three key optimizations:
> 1. Delta streaming: Only point coordinates are sent, not canvas snapshots.
> 2. Time-based throttling (25-30ms window) to match human visual perception without flooding the WebSocket buffer.
> 3. Zod schema validation to reject malformed or oversized payloads.

#### 4. How does the system handle a user disconnecting and reconnecting?
> Upon disconnect, Socket.IO cleans up the user's socket from room presence and notifies other participants. When the user reconnects or refreshes, the client re-joins the room; the server pulls the latest state from memory or MongoDB and re-syncs the canvas snapshot instantly.

#### 5. How would you scale this to 10,000+ concurrent rooms?
> 1. **Horizontal Scaling with Redis Adapter**: Deploy multiple Node.js backend nodes behind an AWS ALB with `socket.io-redis` adapter for cross-node event broadcasting.
> 2. **CRDTs (Conflict-Free Replicated Data Types)**: Adopt Yjs or Automerge for peer-to-peer decentralized convergence if complex rich-text collaborative editing is required.
> 3. **Spatial Partitioning (Quadtree / R-Tree)**: Only stream drawing updates and cursor movements to users viewing the same canvas region (viewport culling).

---

## 🛠️ Local Development Guide

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Clone & Install
```bash
git clone <repository-url>
cd "Real-Time Collaborative Drawing Canvas"

# Install all workspace dependencies
npm run install:all
```

### 2. Configure Environment
Create `.env` in `backend/` and `frontend/` (or copy from `.env.example`):
```bash
# Root or Backend .env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/collabdraw # Optional (graceful in-memory fallback enabled)

# Frontend .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run Development Servers
```bash
# Concurrently starts both backend (port 5000) and frontend (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Guide

### Automated Multi-Client Test
CollabDraw includes an end-to-end multi-client integration test verifying real-time sync, cursors, presence, undo/redo, and persistence:
```bash
cd backend
npx tsx test-collab.ts
```

### Manual Multi-Window Verification
1. Open [http://localhost:3000](http://localhost:3000) in Window 1 and click **Create a Room** (e.g. `TEST01`, Name: Alice).
2. Copy the room link and open in Window 2 (Incognito or separate browser, Name: Bob).
3. **Verify Cursors**: Move the mouse in Window 1 -> Bob sees Alice's colored cursor badge moving in real time.
4. **Verify Simultaneous Drawing**: Alice draws with Pencil; Bob draws a Rectangle -> Both elements appear instantly on both screens.
5. **Verify Undo Isolation**: Alice triggers Undo (Ctrl+Z) -> Alice's pencil stroke is undone, but Bob's rectangle remains intact.
6. **Verify Refresh Persistence**: Refresh Window 2 -> Canvas loads the full existing drawings from state.

---

## 🚢 Production Deployment Guide

### Frontend Deployment (Vercel)
1. Push codebase to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Add Environment Variables:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://your-backend.onrender.com`
5. Deploy.

### Backend Deployment (Render / Railway)
1. Create a **Web Service** on [Render](https://render.com).
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm run start`
5. Add Environment Variables:
   - `PORT`: `10000` (or leave default)
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
   - `MONGODB_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/collabdraw?retryWrites=true&w=majority`
6. Deploy.

---

## 🗺️ Future Scalability Roadmap

- [ ] **Image & Asset Upload**: Drag-and-drop image placement onto canvas.
- [ ] **Sticky Notes & Comments**: Interactive collaborative comment pins with reply threads.
- [ ] **Spatial Viewport Culling**: QuadTree spatial indexing for massive canvas performance with 100k+ objects.
- [ ] **WebRTC Audio/Video**: Built-in peer-to-peer voice and video huddles inside the whiteboard room.

---

## 📄 License
MIT License. Built with ❤️ for the Software Engineering Internship Assignment.
