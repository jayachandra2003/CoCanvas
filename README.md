# CoCanvas

A real-time collaborative whiteboard with multi-page support, live cursor tracking, voice-enabled chat, and versatile drawing tools.

[Live Demo](https://cocanvas-7gef.onrender.com)

---

## Features

- **Multi-Page & Canvas Modes**: Switch between structured multi-page slides (ideal for presentations) and an infinite canvas with pan and zoom.
- **Real-Time Collaboration**: Low-latency multi-user drawing, live cursor tracking, laser pointer, and floating cursor chat.
- **Drawing Tools**: 9 brush types (pen, pencil, calligraphy, watercolor, airbrush, etc.), shapes, customizable fills, and sticky notes.
- **Smart Code Cards**: Interactive code snippets supporting multiple languages (JavaScript, Python, C++, TypeScript, HTML, CSS, and more) with auto-indentation.
- **Role Management**: Host and Co-Host controls with Presentation Mode (view-only for audience) and Friendly Mode (open collaboration).
- **Integrated Chat**: In-room text chat with unread counters and continuous multi-language voice typing.
- **Export Options**: Export boards to high-res PNG (2x), PDF, Word (.docx), or export/import JSON session data.
- **Customization**: Dark/Light theme toggle, customizable user avatars with circular crop tool, and built-in board templates (Kanban, Matrix, Retro).

---

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, Web Audio API, Web Speech API
- **Styling**: CSS3 (custom responsive design, dark/light themes)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [npm](https://www.npmjs.com)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jayachandra2003/CoCanvas.git
   cd CoCanvas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select / Move Tool |
| `P` | Pen Tool |
| `H` | Highlighter |
| `E` | Eraser |
| `R` | Rectangle |
| `O` | Circle / Ellipse |
| `L` | Line |
| `A` | Arrow |
| `T` | Text Box |
| `S` | Sticky Note |
| `C` | Code Snippet Card |
| `K` | Laser Pointer |
| `/` | Live Cursor Chat |
| `Alt + C` | Toggle Collaborator Cursors |
| `Space + Drag` | Pan Canvas |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + +` / `Ctrl + -` | Zoom In / Out |
| `Ctrl + 0` | Reset Zoom |
| `Delete` / `Backspace` | Delete Selected Item |

---

## Project Structure

```text
CoCanvas/
├── public/
│   ├── index.html       # Application markup
│   ├── style.css        # Layout & theme styles
│   ├── client.js        # Canvas engine, event handlers & socket client
│   └── logo.png         # Brand assets
├── server.js            # Express server & Socket.IO room management
├── package.json         # Project dependencies and scripts
└── README.md            # Documentation
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Jaya Chandra Vennam**
- GitHub: [@jayachandra2003](https://github.com/jayachandra2003)
