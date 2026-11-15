# 🚌 Ceylon Bus Simulator (Ceylon My Bus)

An authentic, high-octane 3D Sri Lankan bus driving simulation built with **Three.js** and **WebGL**. Drive an Ashok Leyland Viking bus along the route from **Colombo to Badulla**, pick up and drop off passengers at halts, hear real conductor calls, manage fuel, collect fares, and challenge top drivers on the live multiplayer board.

---

## 🔍 Upstream Investigation & Origin

- **Reference URL:** [https://ceylonmybus.com/](https://ceylonmybus.com/)
- **Repository Status:** **No public upstream GitHub repository exists.**
  - **Domain Registration:** The domain `ceylonmybus.com` was registered on **November 13, 2026** via GoDaddy.
  - **Deployment:** Directly deployed to **Netlify** with a Firebase backend (`kayal-super-line`).
  - **Internal Signatures:** Source code comments reveal the game was originally engineered and prototyped as a standalone **Claude WebGL artifact**:
    > `/* Shared "Top drivers" board. Hosted as a Claude artifact it keeps one row per signed-in driver in the page's shared store... */`
  - **Architecture:** The complete production bundle (3D geometry, procedural highway generation, synthesized engine audio, voice recordings, dynamic textures, and multiplayer sync) is delivered to the browser client.

This repository reconstructs the complete project, extracts the raw multimedia assets into structured directories, and provides a clean local development server and deployment guides.

---

## ⚡ Game Features

1. **Ashok Leyland Viking 3D Simulation:**
   - 4-view perspective rectification mapping (Front, Side, Rear, Roof) onto dynamic Three.js canvas UV textures.
   - Hand-painted Sri Lankan bus livery and swirl art.
   - Dynamic chassis suspension, steering tilt, and body roll physics.

2. **Route: Colombo to Badulla:**
   - Procedural Sri Lankan highway generation with elevation changes, hill country curves, roadside vegetation, palm trees, and mountain vistas.
   - Halt/bus stop network with passenger spawn routines.

3. **Authentic Audio System:**
   - Procedural Web Audio API engine sound synthesis (realistic engine RPM, throttle pitch, dynamic compression, gear shifts).
   - Air horn sound effects.
   - Real recorded Sinhala conductor voice lines:
     - `"ඉක්මන් කරන්න"` (*ikman karanna* – hurry up, at halts)
     - `"හරි හරී"` (*hare haree* – all set, off we go)

4. **Transit Economy & Service Reports:**
   - Ticket revenue collection based on distance and passenger counts.
   - Operating costs: Fuel consumption, crew wages, damage expenses, and traffic fines (speeding, collisions).
   - End-of-service summary with profit/loss metrics.

5. **Multiplayer & Real-Time Sync:**
   - Live multiplayer driver positions on the road via Firebase Realtime Database.
   - Global leaderboard for top drivers via Firestore.
   - Runs seamlessly in offline/local mode if Firebase is unconfigured.

6. **Responsive Controls:**
   - **Keyboard:** WASD / Arrow Keys (Accelerate, Brake/Reverse, Steer), Space (Handbrake), H (Horn), C (Camera toggle), M (Map toggle).
   - **Mobile / Touch:** On-screen virtual buttons for throttle, brake, and steering.

---

## 📁 Repository Structure

```
ceylon-bus-simulator/
├── index.html           # Complete self-contained 3D simulation application
├── server.py            # Zero-dependency local dev server (CORS-enabled, no-cache)
├── run.sh               # Quick execution launcher
├── .gitignore           # Git ignore rules
├── assets/
│   ├── textures/        # Extracted bus textures
│   │   ├── ref_front.webp  # Ashok Leyland Viking front mask
│   │   ├── ref_side.webp   # Side body & wheels
│   │   ├── ref_top.webp    # Roof view
│   │   └── ref_rear.webp   # Rear view
│   └── audio/           # Extracted conductor voice recordings
│       ├── hurry.m4a    # "Ikman karanna" audio clip
│       └── go.m4a       # "Hare haree" audio clip
└── README.md            # Documentation & project manual
```

---

## 🚀 Quick Start (Local Run)

### 1. Launch Dev Server
Run the included launcher:
```bash
./run.sh
```
Or directly with Python:
```bash
python3 server.py
```

### 2. Play the Game
Open your browser and navigate to:
```
http://localhost:8080
```

---

## 🎨 Customization

### Custom Bus Livery / Skins
The bus textures are located in `assets/textures/`:
- `ref_front.webp`: Front windshield, grille, and headlights.
- `ref_side.webp`: Side panels, passenger windows, and rims.
- `ref_rear.webp`: Rear windshield, emergency exit, and taillights.
- `ref_top.webp`: Roof panel.

You can modify these images to design custom Sri Lanka Transport Board (CTB/SLTB) liveries, private express bus designs, or custom paint schemes.

### Firebase Backend Configuration
In `index.html`, locate:
```javascript
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebasedatabase.app"
};
```
To run completely offline without external network calls, you can leave `apiKey` blank `""`.

---

## 🌐 Deployment

### GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Branch**, select `main` (root) and click **Save**.

### Netlify / Vercel
- Deploy directly by connecting your repository or dragging and dropping the project folder. No build step is required (pure static HTML/JS/CSS).

---

## 📜 License & Acknowledgments
- Inspired by the vibrant private and CTB bus culture of Sri Lanka.
- 3D engine powered by [Three.js](https://threejs.org/).
