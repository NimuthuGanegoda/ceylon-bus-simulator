# 🌍 World Bus Simulator 3.0 — Sovereign Edition

A photorealistic, Microsoft Flight Simulator-inspired 3D global bus driving simulator built with **Three.js (vendored `r128`)** and **WebGL**, **hosted and database-backed directly by GitHub** (`RaidenShogun-AI/ceylon-bus-simulator` + GitHub Pages).

▶ **Play Live on GitHub Pages:** [https://raidenshogun-ai.github.io/ceylon-bus-simulator/](https://raidenshogun-ai.github.io/ceylon-bus-simulator/)

---

## ✨ Key Capabilities in Version 3.0

### 🌐 Entire World Coverage & Custom "Drive Anywhere on Earth"
- **14 Built-In Flagship Global Corridors across all inhabited continents:**
  - **Sri Lanka:** Route 99 (Colombo–Badulla A4 Highlands), Route 138 (Colombo Metro AC), Route 01 (Colombo–Kandy), E01 (Southern Expressway), Route 02 (Colombo–Galle Coast)
  - **Asia:** Tokyo → Mt. Fuji Expressway (`jp_fuji`), Singapore → Kuala Lumpur (`sg_kl`)
  - **Europe:** London Route 11 Heritage (`uk_11`), Zürich → Milan Alps / Gotthard (`eu_alps`)
  - **Americas:** NYC → Boston Northeast Corridor (`us_ne`), Rio de Janeiro → Petrópolis Sierra (`br_rio`)
  - **Middle East:** Dubai → Abu Dhabi E11 (`ae_e11`)
  - **Africa:** Cape Town → Cape Point Coastal (`za_ch`)
  - **Oceania:** Melbourne → Great Ocean Road (`au_gor`)
- **Live Global OSRM & Elevation Route Builder:** Enter any two cities or coordinates anywhere on Earth (`City, Country` or `lat,lng`) in the lobby to plot a 3D drivable corridor using Nominatim, OSRM road geometry, Open-Meteo terrain elevation, and regional biome theming.

### 🗄️ 100% GitHub-Hosted & Serverless GitHub Database
- Zero local backend dependencies or third-party cloud lock-in.
- All canonical **routes**, **fleet chassis**, **global leaderboard records**, and **Hall of Fame** entries live right inside [`/data/*.json`](./data/) synced by [`js/github-db.js`](./js/github-db.js) + public GitHub REST API issues & PRs.
- Trusted Pull Requests that pass `.github/workflows/ci-verify.yml` automatically merge via `.github/workflows/auto-merge.yml`.

### 🚌 MSFS-Grade Driving & Precision Time/KM Lock
- **Exact Speed-Time-KM Physics Lock:** Driving at `60 km/h` covers `1.0 real km` per clock minute (`ΔRealKm / ΔClockHours === SpeedKmh`) in `1:1` real-time scale or `1:5` / `1:10` corridor scales, synced with regional timezone daylight & volumetric atmospheric Rayleigh sky scattering (`js/msfs-atmosphere.js`).
- **4 Detailed 3D Animated Fleet Chassis (`js/bus-models.js`):**
  - **Colombo Metro AC Low-Floor** (LED destination matrix, sliding dual doors, rooftop HVAC)
  - **Ashok Leyland Viking 193** (Classic Sri Lankan private express & liveries)
  - **Yutong Luxury Expressway Coach** (High-deck aerodynamic highway cruiser)
  - **Sovereign Electro AC EV** (Zero-emission electric coach with regenerative braking)
- **Live Google Maps & VFR Terrain Radar (`js/map-engine.js`):** Real-time minimap and expandable full-screen satellite map (`M`) across Google Hybrid Satellite, Google Road, ESRI World Imagery, OpenStreetMap, and VFR Elevation Vector modes.

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` / `Up Arrow` | Throttle / Accelerate |
| `S` / `Down Arrow` | Service Air Brakes / Reverse |
| `A` / `D` or `Left` / `Right` | Dynamic Speed-Adaptive Steering |
| `Space` | Parking Handbrake |
| `K` | Windshield Wipers (rain-adaptive) |
| `B` | Downhill Exhaust Retarder |
| `Shift` | Adaptive Highway Cruise Control |
| `Q` / `E` / `X` | Left Indicator / Right Indicator / Hazard Flashers |
| `L` | Headlights & High-Beam Illuminators |
| `H` / `J` | Air Horn / Polyphonic Musical Horn |
| `V` | Dynamic / Clear / Rain / Fog Weather Cycle |
| `C` | 4-Mode Camera (Chase 3D, Driver Cockpit, Bumper Cam, Orbit Drone) |
| `M` / `+` / `-` | Full World Satellite Map & Zoom Radar |
| `R` / `I` / `U` | Lane Realignment / Journey Info / Clean UI Toggle |

---

## 📁 Repository Structure

```
ceylon-bus-simulator/
├── index.html                      # World Bus 3.0 simulation core, UI & WebGL engine
├── data/
│   ├── world-routes.json           # Canonical database of 14 global bus corridors
│   ├── fleet.json                  # Canonical fleet specifications database
│   └── hall-of-fame.json           # Verified global leaderboard & Hall of Fame records
├── js/
│   ├── vendor/three.min.js         # Self-contained vendored Three.js r128
│   ├── github-db.js                # GitHub REST/raw JSON DB sync & Issue/PR builders
│   ├── routes-data.js              # Global route catalog + live OSRM/Elevation builder
│   ├── bus-models.js               # Detailed animated 3D bus models & LED matrices
│   ├── map-engine.js               # World coastline + Google/ESRI/OSM/VFR radar renderer
│   ├── msfs-atmosphere.js          # Volumetric Rayleigh/Mie sky & dynamic clouds
│   └── assets-pack.js              # Embedded textures & Web Audio assets
├── .github/workflows/
│   ├── ci-verify.yml               # Syntax, JSON DB, & global route geometry verifier
│   └── auto-merge.yml              # Trusted PR auto-approval & squash auto-merge
├── server.py                       # Optional local static HTTP server for offline testing
└── README.md                       # Project documentation
```
