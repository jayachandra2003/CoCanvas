# 🎨 CoCanvas — Professional Real-Time Collaborative Whiteboard

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-Render.com-00C7B7?style=for-the-badge&logo=render&logoColor=white)](https://cocanvas-7gef.onrender.com)
[![Version](https://img.shields.io/badge/Version-4.0_Latest-8B5CF6?style=for-the-badge)](https://github.com/jayachandra2003/CoCanvas)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.3-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**An ultra-fast, multiplayer virtual whiteboard and team collaboration workspace featuring Fixed Multi-Page Mode, Infinite Canvas Playground, page-isolated live cursor tracking, multi-language continuous voice chat, MS Paint realistic brushes, interactive sticky notes, smart code cards, and procedural VFX.**

[🚀 **Launch Live Application**](https://cocanvas-7gef.onrender.com) · [🐞 Report Bug](https://github.com/jayachandra2003/CoCanvas/issues) · [✨ Request Feature](https://github.com/jayachandra2003/CoCanvas/issues)

</div>

---

## 🌟 Highlights & Features (Version 4.0)

### 📄 Fixed Multi-Page Mode & Infinite Playground
* **Fixed Multi-Page Workspace**: Clean, single-window multi-page canvas tailored for structured presentations, lectures, and mobile/desktop alignment.
* **Page-Isolated Real-Time Drawings**: Each page maintains its own isolated drawing elements and history.
* **Bottom Page Navigation Dock**: Add pages, jump instantly with the page selector menu, fit page to window, and delete pages.
* **Smart Presentation Sync**: In **Host Mode**, page flips and canvas mode changes automatically synchronize to guide all audience members; in **Friendly Mode**, users freely explore pages independently.
* **Page-Isolated Collaborators**: Remote cursors, live pencil strokes, laser trails, and emoji reactions only appear on the specific page you are actively viewing.
* **Infinite Playground Mode**: Switch to an unconstrained infinite whiteboard with hardware-accelerated pan and zoom (`10%` to `500%`).

### 🖌️ Multi-Layer Whiteboard & MS Paint Brush Engine
* **9 MS Paint Realistic Brushes**: Standard Brush, Calligraphy Pen 1 & 2, Airbrush/Spray, Oil Brush, Crayon, Marker, Natural Pencil, and Watercolor Brush with live stroke previews.
* **Drawing & Shape Tools**: Precision Pen, Highlighter, Eraser, Line, Arrow, Rectangle, Ellipse/Circle, and Rich Text boxes.
* **Shape Color & Fill Styles**: Transparent outlines (`🚫 None`), 25% soft translucent fills (`✨ Tint`), and 100% opaque fills (`⬛ Solid`), with customizable stroke and fill palettes.
* **Selection & Transform Box**: Select, drag, resize from 8-point handles, clone, and delete any whiteboard element.
* **Built-in Templates**: One-click insertion for **Kanban Boards**, **Priority 2x2 Matrix**, and **Team Retrospective boards**.
* **Export in Multiple Formats**: Export entire board or viewport to **PNG (High-Res 2x)**, **PDF document**, **Word DOCX**, and structured **JSON** with full re-import capability.

### 👥 Real-Time Multiplayer & Role Management
* **Host Presentation Mode vs. Friendly Mode**: Switch between *Presentation Mode* (locks participant drawing tools into view-only presentation for webinars/classrooms) and *Friendly Mode* (full collaborative drawing for everyone).
* **Room Roles & Member Hub**: Top-right dropdown modal anchored under teammate avatars to inspect participants, jump camera directly to any collaborator's view, and manage roles in real time.
* **Transfer Host & Co-Host Privileges**: Primary Host (`👑`) can pass ownership or designate multiple Co-Hosts (`⭐`) to share presentation controls.
* **🛡️ 2-Kick Permanent Ban Anti-Abuse**: Host kick tracking per session with automated permanent room blacklist enforcement on a 2nd kick to protect sessions from disruptive users.
* **Smart Host Succession**: Automatic priority host handover upon disconnect, prioritizing online Co-Hosts before other participants.
* **Collaborator Cursor Toggle**: 1-click toggle (`Alt + C`) to show or hide remote peer cursors for distraction-free canvas recording.
* **Laser Pointer & Radar Ping**: Draw disappearing glow laser trails (`K`) or ping points on the canvas (`P`) to focus team attention.
* **Instant Cursor Chat**: Press `/` or click Cursor Chat to broadcast real-time floating thought bubbles attached directly to your cursor.
* **Emoji Reaction Particles & Stickers**: Send floating celebration reaction particles anywhere on the canvas or drop emoji stickers.
* **🔔 Compact Top-Right Notifications**: Redesigned sleek toast notifications docked directly below the top bar with smooth slide animations.

### 💬 ChatSpace & Multi-Language Voice Typing
* **🎙️ Multi-Language Continuous Voice Typing**: Hands-free voice recognition with continuous listening (no premature cutoffs) and automatic real-time translation of any spoken language (Hindi, Telugu, Tamil, Spanish, French, German, Japanese, etc.) directly into English!
* **Docked Right-Wall Sidebar**: Clean, professional Slack/Discord-grade chat panel.
* **Smooth Wall Collapse & Unread Badges**: Slide the chat into the right wall (`>`) with live notification badge counter and sound chime alerts for new unread messages.
* **Room History Sync**: New and reconnecting teammates instantly receive the recent room chat thread.

### 🗺️ Enhanced Radar Minimap
* **Expanded Viewport Radar**: Real-time canvas radar preview (`165px × 105px`) with click-to-fly navigation.
* **Adaptive Collision Avoidance**: Automatically repositions on laptop screens and split-browser windows to guarantee zero overlap with canvas tools.

### 💻 Smart Code Snippet Compiler & Sticky Notes
* **Smart Code IDE Engine**: Interactive multi-language code cards (Java, Python, C++, TypeScript, JavaScript, Rust, Go, HTML, CSS, JSON, Markdown) with auto-closing bracket pairs, smart enter expansion, and intelligent auto-indentation.
* **Color-Themed Sticky Notes**: Editable sticky notes with Pastel themes (Yellow, Sky, Pink, Mint, Purple, Peach).

### 🎨 Neo-Brutalist Design & Web Audio Synthesizer
* **Dark & Light Mode**: Instant theme switcher with glassmorphism, high-contrast borders, and custom background patterns.
* **Procedural Sound Engine**: Zero-dependency Web Audio API synthesizer for clicks, pop feedback, radar pings, and emoji chimes (with 1-click global mute).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select & Move Tool |
| `P` | Pen / Freehand Draw |
| `H` | Highlighter |
| `E` | Eraser |
| `B` / `F` | Paint Bucket / Fill with Color |
| `R` | Rectangle Shape |
| `O` | Circle / Ellipse Shape |
| `L` | Line Tool |
| `A` | Arrow Tool |
| `T` | Text Box |
| `S` | Sticky Note |
| `C` | Code Snippet Card |
| `K` | Laser Pointer |
| `Alt + C` | Toggle Collaborators' Cursors (Show/Hide) |
| `/` | Instant Cursor Chat |
| `Ctrl + Z` | Undo action |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo action |
| `Ctrl + +` / `Ctrl + -` | Zoom In / Out |
| `Ctrl + 0` | Reset Zoom to 100% |
| `Space + Drag` | Pan Canvas Viewport |
| `Delete` / `Backspace` | Delete Selected Item |

---

## 🛠️ Technology Stack

* **Backend**: Node.js, Express 5, Socket.io 4.8
* **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, Web Audio API, Web Speech API
* **Translation**: Fast real-time multi-lingual auto-translation engine
* **Styling**: Modern CSS3, Neo-Brutalist Design System, CSS Grid & Flexbox
* **Multi-Layer Rendering**: Layered HTML5 Canvas (Grid Canvas, Board Canvas, Draft Canvas, VFX Layer, DOM Layer)

---

## 🚀 Quick Start & Local Development

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher recommended)
* [npm](https://www.npmjs.com) (installed with Node.js)
* [Git](https://git-scm.com)

### 1. Clone the Repository
```bash
git clone https://github.com/jayachandra2003/CoCanvas.git
cd CoCanvas
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Local Server
```bash
npm start
```

### 4. Open in Browser
Visit **`http://localhost:3000`** in your browser. Open multiple tabs or windows to test real-time multiplayer drawing and ChatSpace!

---

## 📁 Project Directory Structure

```text
CoCanvas/
├── public/
│   ├── index.html               # Main Web App Markup & Modals
│   ├── style.css                # Neo-Brutalist & Dark/Light Theme Styles
│   ├── client.js                # Canvas Engine, VFX, Sound & Socket Client
│   ├── favicon.svg              # Brand Icon
│   └── logo.png                 # Logo Asset
├── server.js                    # Express + Socket.io Multiplayer Backend
├── package.json                 # Project Metadata & Scripts
├── .gitignore                   # Git Ignore Rules
├── LICENSE                      # MIT Open-Source License
└── README.md                    # Project Documentation
```

---

## 🌐 Deployment

CoCanvas can be deployed effortlessly to any Node.js cloud platform with WebSocket support:

### Deploy to Render
1. Create a new **Web Service** on [Render.com](https://render.com).
2. Connect your **`jayachandra2003/CoCanvas`** GitHub repo.
3. Configure:
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
4. Click **Deploy Web Service**!

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👤 Author

**Jaya Chandra Vennam**
* GitHub: [@jayachandra2003](https://github.com/jayachandra2003)
* Live Application: [CoCanvas on Render](https://cocanvas-7gef.onrender.com)
