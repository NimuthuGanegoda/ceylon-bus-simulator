/* ==========================================================================
   CEYLON BUS SIMULATOR 3.0 — GOOGLE MAPS DATA & MSFS VFR NAVIGATION ENGINE
   Features:
     - Web Mercator tile streaming & LRU cache:
         * Google Hybrid Satellite (mt1.google.com lyrs=y)
         * Google Maps Road Street (mt1.google.com lyrs=m)
         * OpenStreetMap / ESRI World Imagery fallbacks
         * MSFS VFR Night/Vector Chart fallback when offline
     - True Sri Lankan coastline & elevation contour underlay
     - Interactive Lobby Route Planner map + VFR Terrain Elevation Strip
     - Full-screen Interactive GPS Map (M key) with layer switcher,
       click-to-inspect Google Maps deep link, & Police/Rival/Halt markers
   ========================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Global Continent & Island Underlay Polygons ([lat, lng]) for offline/vector radar anywhere on Earth
  const WORLD_LAND = [
    // Sri Lanka
    [[9.82,80.22],[9.30,80.80],[8.55,81.24],[7.20,81.86],[6.12,81.12],[5.95,80.54],[6.03,80.21],[6.85,79.86],[8.18,79.74],[9.52,80.04]],
    // UK & Ireland
    [[58.6,-3.1],[57.5,-1.8],[56.0,-2.7],[53.0,0.2],[51.4,1.4],[50.1,-5.5],[53.4,-3.1],[56.0,-5.5]],
    [[55.2,-6.5],[53.3,-6.2],[51.5,-9.8],[54.2,-10.0]],
    // Japan
    [[45.4,141.9],[43.0,145.0],[41.5,141.0],[38.2,141.0],[35.0,140.0],[34.0,136.0],[31.4,130.5],[33.9,130.9],[36.6,136.6],[40.8,140.3]],
    // Australia
    [[-12.0,130.8],[-12.4,136.8],[-14.5,144.5],[-25.3,153.2],[-33.9,151.3],[-37.8,149.8],[-38.8,143.5],[-35.0,136.0],[-32.0,126.0],[-34.4,115.1],[-22.0,113.9],[-17.9,122.2]],
    // Europe + Africa + Asia Mainland simplified coastline
    [[36.0,-5.6],[43.5,-9.2],[48.4,-4.7],[51.0,2.5],[54.0,8.5],[57.7,10.6],[60.0,5.0],[71.0,25.0],[69.0,36.0],[66.0,60.0],[72.0,130.0],[66.0,170.0],[52.0,140.0],[40.0,129.0],[31.0,122.0],[22.3,114.2],[12.0,109.0],[1.3,103.8],[16.0,96.0],[22.0,91.0],[8.1,77.5],[23.0,68.5],[25.0,55.2],[29.0,48.0],[12.6,43.4],[11.5,51.2],[-4.0,39.7],[-26.0,32.9],[-34.5,18.4],[-22.5,14.4],[-5.0,12.0],[4.5,8.0],[6.4,3.4],[14.7,-17.5],[35.8,-5.8],[37.5,15.1],[40.5,18.0],[45.4,12.3],[43.3,5.4],[41.4,2.2]],
    // North & Central America
    [[70.0,-160.0],[70.0,-95.0],[62.0,-64.0],[47.0,-53.0],[44.6,-63.6],[40.7,-74.0],[30.0,-81.3],[25.2,-80.2],[29.5,-94.5],[21.2,-86.8],[14.0,-83.5],[9.0,-79.5],[15.5,-93.5],[23.0,-106.5],[32.5,-117.1],[37.8,-122.4],[48.4,-124.7],[59.5,-140.0],[61.2,-150.0]],
    // South America
    [[11.0,-74.8],[10.5,-62.0],[5.0,-52.0],[0.0,-49.0],[-8.0,-34.9],[-23.0,-43.2],[-34.9,-56.2],[-42.0,-64.0],[-54.8,-68.3],[-41.5,-73.8],[-33.0,-71.6],[-12.0,-77.1],[-2.2,-80.9],[5.0,-77.4]]
  ];

  const TILE_SOURCES = {
    google_hybrid: {
      id: 'google_hybrid',
      label: 'Google Hybrid Satellite',
      url: (z, x, y) => 'https://mt' + ((x + y) & 3) + '.google.com/vt/lyrs=y&hl=en&x=' + x + '&y=' + y + '&z=' + z
    },
    google_roadmap: {
      id: 'google_roadmap',
      label: 'Google Maps Street',
      url: (z, x, y) => 'https://mt' + ((x + y) & 3) + '.google.com/vt/lyrs=m&hl=en&x=' + x + '&y=' + y + '&z=' + z
    },
    esri_sat: {
      id: 'esri_sat',
      label: 'ESRI World Imagery',
      url: (z, x, y) => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x
    },
    osm: {
      id: 'osm',
      label: 'OpenStreetMap',
      url: (z, x, y) => 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png'
    },
    vector: {
      id: 'vector',
      label: 'MSFS VFR Vector Chart',
      url: null
    }
  };

  let activeLayer = 'google_hybrid';
  try {
    activeLayer = localStorage.getItem('slbus_map_layer') || 'google_hybrid';
    if (!TILE_SOURCES[activeLayer]) activeLayer = 'google_hybrid';
  } catch (e) {}

  let customApiKey = '';
  try { customApiKey = localStorage.getItem('slbus_gmaps_key') || ''; } catch (e) {}

  // LRU Tile Image Cache (max 180 tiles in memory)
  const tileCache = new Map();
  const TILE_LIMIT = 180;

  function lonToWorldX(lng, z) {
    return ((lng + 180) / 360) * Math.pow(2, z);
  }

  function latToWorldY(lat, z) {
    const rad = clamp(lat, -85.05, 85.05) * PI / 180;
    return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / PI) / 2 * Math.pow(2, z);
  }

  function getTile(sourceId, z, x, y) {
    const src = TILE_SOURCES[sourceId];
    if (!src || !src.url) return null;
    const maxT = 1 << z;
    if (y < 0 || y >= maxT) return null;
    const wx = ((x % maxT) + maxT) % maxT;
    const key = sourceId + '/' + z + '/' + wx + '/' + y;
    if (tileCache.has(key)) {
      const rec = tileCache.get(key);
      tileCache.delete(key);
      tileCache.set(key, rec);
      return rec;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const rec = { img: img, ready: false, failed: false };
    img.onload = () => { rec.ready = true; };
    img.onerror = () => { rec.failed = true; };
    let u = src.url(z, wx, y);
    if (customApiKey && sourceId.startsWith('google_')) {
      u += '&key=' + encodeURIComponent(customApiKey);
    }
    img.src = u;

    if (tileCache.size >= TILE_LIMIT) {
      const oldest = tileCache.keys().next().value;
      tileCache.delete(oldest);
    }
    tileCache.set(key, rec);
    return rec;
  }

  /* ------------------------------------------------------------------
     Draw Web Mercator Background + Google Maps Tiles Given Bounds
  ------------------------------------------------------------------ */
  function createGeoProjector(points, W, H, padFrac) {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    const dLat = Math.max(0.06, maxLat - minLat);
    const dLng = Math.max(0.06, maxLng - minLng);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    // Pick crisp zoom level (3..14) that fits bounding box cleanly inside W x H anywhere on Earth
    const pad = padFrac !== undefined ? padFrac : 0.14;
    const usableW = W * (1 - pad * 2);
    const usableH = H * (1 - pad * 2);

    let bestZ = 8;
    for (let z = 14; z >= 3; z--) {
      const wx0 = lonToWorldX(minLng, z) * 256;
      const wx1 = lonToWorldX(maxLng, z) * 256;
      const wy0 = latToWorldY(maxLat, z) * 256;
      const wy1 = latToWorldY(minLat, z) * 256;
      if ((wx1 - wx0) <= usableW && (wy1 - wy0) <= usableH) {
        bestZ = z;
        break;
      }
    }

    const cwx = lonToWorldX(midLng, bestZ) * 256;
    const cwy = latToWorldY(midLat, bestZ) * 256;

    const toPx = (lat, lng) => [
      W / 2 + (lonToWorldX(lng, bestZ) * 256 - cwx),
      H / 2 + (latToWorldY(lat, bestZ) * 256 - cwy)
    ];

    return { z: bestZ, cwx, cwy, W, H, toPx, minLat, maxLat, minLng, maxLng, dLat, dLng };
  }

  function drawMercatorUnderlay(ctx, proj, layerId) {
    const { W, H, z, cwx, cwy, toPx, minLat, maxLat, minLng, maxLng, dLat, dLng } = proj;

    // Ocean + Global Land Polygons vector chart base (works offline anywhere on Earth)
    ctx.fillStyle = layerId === 'google_roadmap' ? '#a5bfdd' : '#081524';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = layerId === 'google_roadmap' ? '#e8ece6' : '#12261e';
    ctx.strokeStyle = layerId === 'google_roadmap' ? '#7c9ec2' : 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 1.6;
    WORLD_LAND.forEach(poly => {
      ctx.beginPath();
      poly.forEach(([la, ln], i) => {
        const [x, y] = toPx(la, ln);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Adaptive Lat/Lng VFR graticule grid across any region on Earth
    const span = Math.max(dLat || 1, dLng || 1);
    const step = span > 15 ? 5 : span > 4 ? 1 : span > 1 ? 0.5 : 0.25;
    const latS = Math.floor(((minLat || -10) - span) / step) * step;
    const latE = Math.ceil(((maxLat || 10) + span) / step) * step;
    const lngS = Math.floor(((minLng || -10) - span) / step) * step;
    const lngE = Math.ceil(((maxLng || 10) + span) / step) * step;
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.lineWidth = 1;
    for (let la = Math.max(-84, latS); la <= Math.min(84, latE); la += step) {
      const [, y] = toPx(la, lngS);
      if (y >= 0 && y <= H) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    for (let ln = Math.max(-180, lngS); ln <= Math.min(180, lngE); ln += step) {
      const [x] = toPx(latS, ln);
      if (x >= 0 && x <= W) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    }

    // Stream live Google / ESRI / OSM Map Tiles on top when selected & available
    if (layerId !== 'vector') {
      const leftPx = cwx - W / 2;
      const topPx = cwy - H / 2;
      const tx0 = Math.floor(leftPx / 256);
      const tx1 = Math.floor((leftPx + W) / 256);
      const ty0 = Math.floor(topPx / 256);
      const ty1 = Math.floor((topPx + H) / 256);

      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = ty0; ty <= ty1; ty++) {
          const rec = getTile(layerId, z, tx, ty);
          if (rec && rec.ready && !rec.failed) {
            const dx = tx * 256 - leftPx;
            const dy = ty * 256 - topPx;
            try {
              ctx.drawImage(rec.img, dx, dy, 256, 256);
            } catch (e) {}
          }
        }
      }
      // Subtle contrast scrim so telemetry markers stay razor-sharp
      ctx.fillStyle = layerId === 'google_roadmap' ? 'rgba(6,12,24,0.16)' : 'rgba(4,10,18,0.28)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------------
     Lobby Interactive Route Planner Preview (Route + Elevation Chart)
  ------------------------------------------------------------------ */
  function drawLobbyPreview(canvas, routeId) {
    if (!canvas || !global.ROUTES_ENGINE) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const catalog = global.ROUTES_ENGINE.catalog;
    const r = catalog[routeId] || catalog.r99 || Object.values(catalog)[0];
    if (!r || !r.waypoints || !r.waypoints.length) return;
    let accKm = 0;
    const rawKms = r.waypoints.map((w, i) => {
      if (i > 0) accKm += global.ROUTES_ENGINE.haversineKm(r.waypoints[i - 1].lat, r.waypoints[i - 1].lng, w.lat, w.lng);
      return accKm;
    });
    const mul = accKm > 0 ? (r.realKm / accKm) : 1;
    const pts = r.waypoints.map((w, i) => ({
      lat: w.lat, lng: w.lng,
      elevM: w.elevM !== undefined ? w.elevM : (w.elev || 10),
      name: w.name,
      km: w.km !== undefined ? w.km : rawKms[i] * mul,
      road: w.road
    }));

    const mapH = Math.round(H * 0.68);
    const elevH = H - mapH;

    // 1. Top Map Frame (Web Mercator + Google Maps Data)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, mapH);
    ctx.clip();
    const proj = createGeoProjector(pts, W, mapH, 0.16);
    drawMercatorUnderlay(ctx, proj, activeLayer);

    // Route Polyline (Dual outer glow + inner bright core)
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = proj.toPx(p.lat, p.lng);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.strokeStyle = r.accentColor || '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Waypoint Pins & Town Labels
    pts.forEach((p, idx) => {
      const [x, y] = proj.toPx(p.lat, p.lng);
      const isEnd = idx === 0 || idx === pts.length - 1;
      ctx.beginPath();
      ctx.arc(x, y, isEnd ? 5.5 : 3.2, 0, TAU);
      ctx.fillStyle = idx === 0 ? '#22c55e' : idx === pts.length - 1 ? '#ef4444' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      if (isEnd || pts.length <= 7 || idx % 2 === 0) {
        ctx.font = (isEnd ? '700 10px' : '600 9px') + ' "Segoe UI",Arial,sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(p.name).width + 8;
        ctx.fillStyle = 'rgba(7,12,24,0.82)';
        ctx.fillRect(x - tw / 2, y - 18, tw, 13);
        ctx.fillStyle = isEnd ? '#fde047' : '#e2e8f0';
        ctx.fillText(p.name, x, y - 8);
      }
    });

    // Attribution badge
    ctx.fillStyle = 'rgba(7,12,24,0.78)';
    ctx.fillRect(6, 6, 210, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GPS ' + TILE_SOURCES[activeLayer].label.toUpperCase(), 12, 19);
    ctx.restore();

    // 2. Bottom MSFS Terrain Elevation Radar Strip
    ctx.fillStyle = '#070c17';
    ctx.fillRect(0, mapH, W, elevH);
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mapH); ctx.lineTo(W, mapH); ctx.stroke();

    const maxElev = Math.max(120, ...pts.map(p => p.elevM)) * 1.15;
    const padX = 16;
    const plotW = W - padX * 2;
    const plotTop = mapH + 18;
    const plotBot = H - 14;

    ctx.beginPath();
    ctx.moveTo(padX, plotBot);
    pts.forEach(p => {
      const px = padX + (p.km / r.realKm) * plotW;
      const py = plotBot - (p.elevM / maxElev) * (plotBot - plotTop);
      ctx.lineTo(px, py);
    });
    ctx.lineTo(padX + plotW, plotBot);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, plotTop, 0, plotBot);
    grad.addColorStop(0, 'rgba(56,189,248,0.48)');
    grad.addColorStop(1, 'rgba(56,189,248,0.06)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = padX + (p.km / r.realKm) * plotW;
      const py = plotBot - (p.elevM / maxElev) * (plotBot - plotTop);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VFR ELEVATION PROFILE · MAX ' + Math.round(Math.max(...pts.map(p => p.elevM))) + 'm ASL', 12, mapH + 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(r.realKm.toFixed(1) + ' KM · ' + r.realDurationMin + ' MIN SCHEDULE', W - 12, mapH + 13);
  }

  /* ------------------------------------------------------------------
     In-Game GPS Minimap (Heading-Up Smooth Canvas)
  ------------------------------------------------------------------ */
  function drawMiniMap(ctx, W, H, st) {
    const { PATH, PLEN, cx, cz, heading, mapRadius, HALTS, TEA_SPOTS, TEA, TRIP, GHOSTS, traffic, policeTrap } = st;
    const f = { x: Math.sin(heading), z: Math.cos(heading) };
    const rg = { x: -Math.cos(heading), z: Math.sin(heading) };
    const sc = W / 2 / mapRadius;
    const a = sc * rg.x, c = sc * rg.z, b = -sc * f.x, d = -sc * f.z;
    const e = W / 2 - sc * (rg.x * cx + rg.z * cz);
    const ff = H / 2 + sc * (f.x * cx + f.z * cz);
    const proj = (x, z) => [a * x + c * z + e, b * x + d * z + ff];

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 2, 0, TAU);
    ctx.clip();

    // Rich aviation radar dark backdrop + concentric range rings
    ctx.fillStyle = '#091522';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(56,189,248,0.16)';
    ctx.lineWidth = 1;
    [W * 0.18, W * 0.34].forEach(rad => {
      ctx.beginPath(); ctx.arc(W / 2, H / 2, rad, 0, TAU); ctx.stroke();
    });

    // Draw local road corridor (windowed for constant O(1) speed even at 230km 1:1 scale!)
    const curI = st.curIdx || 0;
    const span = Math.ceil((mapRadius * 1.45) / (st.PDS || 2));
    const i0 = Math.max(0, curI - span);
    const i1 = Math.min(PLEN - 1, curI + span);

    ctx.setTransform(a, b, c, d, e, ff);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const localRoad = new Path2D();
    for (let i = i0; i <= i1; i += 2) {
      const p = PATH[i];
      if (i === i0) localRoad.moveTo(p.x, p.z);
      else localRoad.lineTo(p.x, p.z);
    }
    const lw = Math.max(10, 4.8 / sc);
    ctx.strokeStyle = '#04070d';
    ctx.lineWidth = lw * 1.45;
    ctx.stroke(localRoad);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = lw;
    ctx.stroke(localRoad);

    // Active blue route ahead highlight
    const ahead = new Path2D();
    for (let i = curI; i <= i1; i++) {
      const p = PATH[i];
      if (i === curI) ahead.moveTo(p.x, p.z);
      else ahead.lineTo(p.x, p.z);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = lw * 0.58;
    ctx.stroke(ahead);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dot = (x, z, r, col, stroke) => {
      const [sx, sy] = proj(x, z);
      if (Math.hypot(sx - W / 2, sy - H / 2) > W / 2 - 4) return null;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fillStyle = col;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      return [sx, sy];
    };

    if (TEA_SPOTS) {
      TEA_SPOTS.forEach(t => {
        if (t.x === undefined) return;
        const q = dot(t.x, t.z, 5.5, TEA && TEA.done ? '#6b5a4a' : '#d97706', '#090d16');
        if (q) { ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('T', q[0], q[1] + 3); }
      });
    }

    HALTS.forEach(h => {
      if (Math.abs(h.i - curI) > span + 30) return;
      const w = h.wait && h.wait.some(p => p.state === 'wait');
      const q = dot(h.sx, h.sz, 5, w ? '#22c55e' : '#3b82f6', '#090d16');
      if (q) {
        const nw = h.wait ? h.wait.filter(p => p.state === 'wait').length : 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
        ctx.fillText('H', q[0], q[1] + 3);
        if (nw > 0) {
          ctx.fillStyle = '#4ade80'; ctx.font = 'bold 10px Arial';
          ctx.fillText(nw, q[0], q[1] - 8);
        }
      }
    });

    if (policeTrap && policeTrap.visible) {
      dot(policeTrap.x, policeTrap.z, 5, '#ef4444', '#ffffff');
    }

    for (const id in GHOSTS) {
      const g = GHOSTS[id];
      const q = dot(g.x, g.z, 6, '#38bdf8', '#fff');
      if (q) {
        ctx.fillStyle = '#bae6fd'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(g.n || '').slice(0, 6), q[0], q[1] - 8);
      }
    }

    traffic.forEach(v => {
      if (v.kind !== 'bus') return;
      if (v.rival) {
        const q = dot(v.x, v.z, 5.2, '#ec4899', '#fff');
        if (q) { ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText((v.name || '').slice(0, 3), q[0], q[1] - 7); }
      } else {
        dot(v.x, v.z, 3.4, '#f59e0b', '#090d16');
      }
    });

    // Player chevron in center
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#04070d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // True North N marker on ring edge
    const northAng = -heading - PI / 2;
    const nr = W / 2 - 11;
    const nx = W / 2 + Math.cos(northAng) * nr;
    const ny = H / 2 + Math.sin(northAng) * nr;
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', nx, ny + 3.5);

    ctx.restore();

    ctx.strokeStyle = 'rgba(56,189,248,0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 2, 0, TAU); ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(mapRadius) + 'm', W / 2, H - 6);
  }

  /* ------------------------------------------------------------------
     In-Game Full-Screen Google Maps + MSFS Terrain Radar (M Key)
  ------------------------------------------------------------------ */
  function drawBigMap(ctx, W, H, st) {
    const { PATH, PLEN, cx, cz, curIdx, heading, HALTS, TEA_SPOTS, TEA, TRIP, GHOSTS, traffic, routeGeo } = st;
    const mapH = H - 96;
    const elevH = 96;

    // Sample path points for Web Mercator fit
    const step = Math.max(1, Math.floor(PLEN / 180));
    const samples = [];
    for (let i = 0; i < PLEN; i += step) samples.push(PATH[i]);
    samples.push(PATH[PLEN - 1]);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, mapH); ctx.clip();

    const proj = createGeoProjector(samples, W, mapH, 0.1);
    drawMercatorUnderlay(ctx, proj, activeLayer);

    // Draw True Geodesic Route on top of Google Maps tiles!
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    samples.forEach((p, idx) => {
      const [x, y] = proj.toPx(p.lat, p.lng);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4.5; ctx.stroke();

    // Landmarks & Towns
    if (routeGeo && routeGeo.landmarks) {
      routeGeo.landmarks.forEach(lm => {
        const [x, y] = proj.toPx(lm.lat, lm.lng);
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#090d16'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = 'bold 11px "Segoe UI",Arial,sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(lm.name).width + 10;
        ctx.fillStyle = 'rgba(7,12,24,0.85)';
        ctx.fillRect(x - tw / 2, y - 22, tw, 16);
        ctx.fillStyle = '#fde047';
        ctx.fillText(lm.name, x, y - 10);
      });
    }

    // Helper: approximate lat/lng of any arbitrary road entity using nearest path or linear interp
    const worldToPx = (wx, wz, entitySi) => {
      if (entitySi !== undefined) {
        const p = PATH[clamp(Math.round(entitySi), 0, PLEN - 1)];
        return proj.toPx(p.lat, p.lng);
      }
      // fallback nearest from sample
      let bestP = PATH[curIdx || 0], bestD = 1e18;
      for (let i = 0; i < samples.length; i++) {
        const d = (samples[i].x - wx) ** 2 + (samples[i].z - wz) ** 2;
        if (d < bestD) { bestD = d; bestP = samples[i]; }
      }
      return proj.toPx(bestP.lat, bestP.lng);
    };

    // Halts
    HALTS.forEach(h => {
      const p = PATH[clamp(h.i, 0, PLEN - 1)];
      const [sx, sy] = proj.toPx(p.lat, p.lng);
      const nw = h.wait ? h.wait.filter(q => q.state === 'wait').length : 0;
      ctx.beginPath(); ctx.arc(sx, sy, nw > 0 ? 4.2 : 2.8, 0, TAU);
      ctx.fillStyle = nw > 0 ? '#22c55e' : '#60a5fa';
      ctx.fill();
    });

    // Rivals & Multiplayer Ghosts
    traffic.forEach(v => {
      if (!v.rival) return;
      const [sx, sy] = worldToPx(v.x, v.z, v.si);
      ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, TAU);
      ctx.fillStyle = '#ec4899'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(v.name || 'RIVAL', sx, sy - 8);
    });

    for (const id in GHOSTS) {
      const g = GHOSTS[id];
      const [sx, sy] = worldToPx(g.x, g.z);
      ctx.beginPath(); ctx.arc(sx, sy, 6.5, 0, TAU);
      ctx.fillStyle = '#38bdf8'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#bae6fd'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText(g.n || 'PLAYER', sx, sy - 10);
    }

    // Player Live Marker
    const curP = PATH[clamp(curIdx || 0, 0, PLEN - 1)];
    const [px, py] = proj.toPx(curP.lat, curP.lng);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Top Telemetry Header Overlay
    const remainKm = Math.max(0, (TRIP.total - TRIP.dist) / 1000).toFixed(1);
    const brg = Math.round(((heading * 180 / PI) % 360 + 360) % 360);
    ctx.fillStyle = 'rgba(7,12,24,0.85)';
    ctx.fillRect(0, 0, W, 38);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      'GPS TRACKER [' + TILE_SOURCES[activeLayer].label + '] · LAT ' + curP.lat.toFixed(5) + '° · LNG ' + curP.lng.toFixed(5) + '° · ALT ' + Math.round(curP.elevM) + 'm · HDG ' + String(brg).padStart(3, '0') + '° · ' + remainKm + ' km LEFT',
      14, 24
    );
    ctx.restore();

    // Bottom MSFS Elevation Radar Strip
    ctx.fillStyle = '#070c17';
    ctx.fillRect(0, mapH, W, elevH);
    ctx.strokeStyle = 'rgba(56,189,248,0.4)';
    ctx.beginPath(); ctx.moveTo(0, mapH); ctx.lineTo(W, mapH); ctx.stroke();

    const maxE = Math.max(120, ...samples.map(s => s.elevM)) * 1.15;
    const pLeft = 20, pW = W - 40, pTop = mapH + 22, pBot = H - 14;

    ctx.beginPath();
    ctx.moveTo(pLeft, pBot);
    samples.forEach((s, idx) => {
      const x = pLeft + (idx / Math.max(1, samples.length - 1)) * pW;
      const y = pBot - (s.elevM / maxE) * (pBot - pTop);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pLeft + pW, pBot);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.28)';
    ctx.fill();

    ctx.beginPath();
    samples.forEach((s, idx) => {
      const x = pLeft + (idx / Math.max(1, samples.length - 1)) * pW;
      const y = pBot - (s.elevM / maxE) * (pBot - pTop);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();

    // Player Cursor on Elevation Profile
    const progFrac = clamp((curIdx || 0) / Math.max(1, PLEN - 1), 0, 1);
    const pex = pLeft + progFrac * pW;
    const pey = pBot - (curP.elevM / maxE) * (pBot - pTop);
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pex, pTop); ctx.lineTo(pex, pBot); ctx.stroke();
    ctx.beginPath(); ctx.arc(pex, pey, 5, 0, TAU); ctx.fillStyle = '#fde047'; ctx.fill();

    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('TERRAIN ELEVATION RADAR (SEA LEVEL TO ' + Math.round(maxE / 1.15) + 'm ASL) · CLICK LAYER BUTTONS OR PRESS M TO CLOSE', 20, mapH + 15);

    // Expose live coordinates for "Open in Google Maps" deep link
    global.MAP_ENGINE.lastCoords = { lat: curP.lat, lng: curP.lng, elevM: curP.elevM, brg: brg };
  }

  function setLayer(layerId) {
    if (!TILE_SOURCES[layerId]) return;
    activeLayer = layerId;
    try { localStorage.setItem('slbus_map_layer', layerId); } catch (e) {}
  }

  function setGoogleApiKey(key) {
    customApiKey = String(key || '').trim();
    try { localStorage.setItem('slbus_gmaps_key', customApiKey); } catch (e) {}
    tileCache.clear();
  }

  function openInGoogleMaps() {
    const c = global.MAP_ENGINE.lastCoords || { lat: 6.9336, lng: 79.8501 };
    const url = 'https://www.google.com/maps/@' + c.lat.toFixed(6) + ',' + c.lng.toFixed(6) + ',16z';
    window.open(url, '_blank', 'noopener');
    return url;
  }

  global.MAP_ENGINE = {
    sources: TILE_SOURCES,
    getLayer: () => activeLayer,
    setLayer,
    setGoogleApiKey,
    getGoogleApiKey: () => customApiKey,
    openInGoogleMaps,
    drawLobbyPreview,
    drawMiniMap,
    drawBigMap,
    lastCoords: { lat: 6.9336, lng: 79.8501, elevM: 6, brg: 0 }
  };
})(window);
