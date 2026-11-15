# 🚌 Ceylon Bus Simulator 2.0 — Eternal Express

An authentic, high-octane 3D Sri Lankan bus driving simulation built with **Three.js** and **WebGL**. Drive an Ashok Leyland Viking bus along the scenic, winding highway from **Colombo to Badulla**, pick up passengers at halts, sound the legendary Sri Lankan musical air horns, manage fuel and fares, switch custom bus liveries, and conquer monsoon weather and police checkpoints.

---

## ⚡ What's New in Version 2.0

### 🛠️ Critical Fixes & Stability
* **Fixed Loading Freeze ("Still loading… if this stays, reload the page"):**
  * **Multi-Tier WebGL Context Fallbacks:** Tries high-performance WebGL &rarr; default WebGL &rarr; low-power software fallback.
  * **Context Diagnostics Screen:** If WebGL is completely disabled in the browser, displays a clear, actionable guide on how to turn on hardware acceleration with a single click.
  * **Watchdog Guarantee Timers:** 3.5s image texture watchdog and 6s loader watchdog ensure the game boot sequence never hangs indefinitely.
* **Web Audio Autoplay Fix:** Seamlessly initializes and resumes the Web Audio API on first user interaction without browser security blocks.
* **Embedded SVG Favicon:** Prevents browser `404 favicon.ico` console errors.

### 🎨 2.0 Features & Enhancements
1. **Interactive Livery & Skin Customizer:**
   * 🚌 **Classic Private Viking** (Original blue/cyan Lankan express)
   * 🇱🇰 **SLTB / CTB National Red & Cream** (Official Sri Lanka Transport Board)
   * ⚡ **Raiden Musou Electro Violet** (Sovereign Inazuma lightning purple)
   * 🌸 **Guuji Miko Sakura Line** (Sacred kitsune sakura pink & vermilion)
   * 🟢 **Southern Emerald VIP Coach** (Luxury green express)
   * 🦁 **Lion Gold Superline** (Highway warrior gold)
2. **Interactive HUD 2.0 Toolbar:**
   * 💡 **Headlights (`L` key):** Working spotlights that illuminate the highway, foliage, and rain.
   * 🎶 **Polyphonic Musical Horn (`J` key):** Authentic Sri Lankan private bus melody horn synthesized via Web Audio oscillators!
   * 🌦️ **Weather / Time-of-Day Cycle (`V` key):** Switch between Dynamic &rarr; Sunny Clear &rarr; Monsoon Rain &rarr; Hill Country Mist.
   * 🎥 **Camera Angle (`C` key):** Third-person chase, First-person driver cockpit view, and Showcase orbit drone.
   * 🎨 **Livery Switcher:** Cycle paint schemes on the fly while driving!
3. **Cockpit Interior View:**
   * True first-person perspective from behind the steering wheel with dashboard instruments, speed display, and gear indicator.

---

## 🎮 Controls

### Desktop Keyboard
| Key | Action |
|---|---|
| `W` / `Up Arrow` | Accelerate (Throttle) |
| `S` / `Down Arrow` | Brake / Reverse |
| `A` / `D` or `Left` / `Right` | Steer Left / Right |
| `Space` | Handbrake |
| `H` | Continuous Heavy Air Horn |
| `J` | **Sri Lankan Musical Melody Horn** 🎶 |
| `L` | **Headlights Toggle** 💡 |
| `V` | **Weather & Time Cycle** 🌦️ |
| `C` | **Camera Mode** (Chase, Driver Seat, Showcase) 🎥 |
| `M` | Expand Route Map |
| `I` | Journey & Ticket Revenue Info |
| `R` | Reset Bus Position (if stuck/overturned) |

### Mobile / Touch
* Responsive touch pedal buttons for steering (◀ / ▶), throttle (▲), and brake (■).
* Interactive HUD 2.0 toolbar for instant Lights, Melody Horn, Weather, Camera, and Livery selection.

---

## 🚀 Quick Start (Local Run)

### 1. Launch Dev Server
```bash
cd /home/nimuthu/ceylon-bus-simulator
./run.sh
```
Or directly with Python:
```bash
python3 server.py
```

### 2. Play
Open your browser at:
```
http://localhost:8080
```

---

## 📁 Repository Structure

```
ceylon-bus-simulator/
├── index.html           # Complete Ceylon Bus 2.0 engine & UI
├── server.py            # Local development server (CORS-enabled, no-cache, log sink)
├── run.sh               # Quick execution launcher
├── .gitignore           # Git ignore rules
├── assets/
│   ├── textures/        # Extracted Ashok Leyland Viking textures
│   │   ├── ref_front.webp  # Windshield, grille & headlights
│   │   ├── ref_side.webp   # Side panels, passenger windows & rims
│   │   ├── ref_top.webp    # Roof view
│   │   └── ref_rear.webp   # Rear view & emergency exit
│   └── audio/           # Extracted conductor voice recordings
│       ├── hurry.m4a    # "Ikman karanna" (ඉක්මන් කරන්න)
│       └── go.m4a       # "Hare haree" (හරි හරී)
└── README.md            # Documentation & project manual
```

---

## 🌐 Deployment (GitHub Pages / Netlify / Vercel)

This project has **zero external build dependencies**. It is pure static HTML5/WebGL/JS:
* **GitHub Pages:** Push to GitHub, go to **Settings > Pages**, set branch to `main`, root `/`, and save.
* **Netlify / Vercel:** Connect the repository or drag and drop the folder.

---

## 📜 Upstream Investigation & Credits
* Original concept and gameplay prototype discovered on `ceylonmybus.com` (deployed to Netlify via Claude artifact on Nov 13, 2026; no public upstream repository).
* Reconstructed, patched, and evolved into **Version 2.0** by **Nimuthu Raiden**.
