# 🎨 CoCanvas — Professional Real-Time Collaborative Whiteboard

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-Render.com-00C7B7?style=for-the-badge&logo=render&logoColor=white)](https://cocanvas-7gef.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.3-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**An ultra-fast, multiplayer virtual whiteboard and team collaboration workspace featuring infinite canvas rendering, live cursor tracking, interactive sticky notes, syntax code cards, procedural VFX, and integrated ChatSpace.**

[🚀 **Launch Live Application**](https://cocanvas-7gef.onrender.com) · [🐞 Report Bug](https://github.com/jayachandra2003/CoCanvas/issues) · [✨ Request Feature](https://github.com/jayachandra2003/CoCanvas/issues)

</div>

---

## 🌟 Highlights & Features

### 🖌️ Multi-Layer Whiteboard Engine
* **Infinite Pan & Smooth Zoom**: Hardware-accelerated multi-canvas architecture (Grid, Board, Draft, DOM, and VFX layers) with smooth zoom interpolation (`10%` to `500%`).
* **Drawing & Shape Tools**: Precision Pen, Highlighter, Eraser, Line, Arrow, Rectangle, Ellipse/Circle, and Rich Text boxes.
* **Selection & Transform Box**: Select, drag, resize from 8-point handles, clone, and delete any whiteboard element.
* **Built-in Templates**: One-click insertion for **Kanban Boards**, **Priority 2x2 Matrix**, and **Team Retrospective boards**.
* **Export in Multiple Formats**: Export entire board or viewport to **PNG (High-Res)**, **PDF document**, **Word DOCX**, and structured **JSON** with full re-import capability.

### 👥 Real-Time Multiplayer Collaboration
* **Live Multiplayer Presence**: Real-time cursor coordinates, user names, color rings, and live status dots.
* **Host Control & Seamless Reconnect**: Crown badge identification (`👑`) for room hosts with auto-handover on disconnect.
* **Laser Pointer & Radar Ping**: Draw disappearing glow laser trails (`K`) or ping points on the canvas (`P`) to focus team attention.
* **Instant Cursor Chat**: Press `/` or click Cursor Chat to broadcast real-time floating thought bubbles attached directly to your cursor.
* **Emoji Bursts**: Send floating celebration reaction particles anywhere on the canvas.

### 💬 ChatSpace (Integrated Sidebar Communication)
* **Docked Right-Wall Sidebar**: Clean, professional Slack/Discord-grade chat panel.
* **Smooth Wall Collapse**: Slide the chat seamlessly into the right wall with the arrow button (`>`).
* **Floating Wall Tab**: Persistent tab docked on the right screen edge with unread badge counter and audio chime alerts.
* **Room History Sync**: New and reconnecting teammates instantly receive the recent room chat thread.

### 💻 Live Code Snippet Cards & Sticky Notes
* **Interactive Code Cards**: Share multi-language code snippets (JavaScript, Python, TypeScript, HTML, CSS, Rust, Go, C++, SQL, JSON, Markdown) with auto-formatted line counters.
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
| `R` | Rectangle Shape |
| `O` | Circle / Ellipse Shape |
| `L` | Line Tool |
| `A` | Arrow Tool |
| `T` | Text Box |
| `S` | Sticky Note |
| `C` | Code Snippet Card |
| `K` | Laser Pointer |
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
* **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, Web Audio API
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
