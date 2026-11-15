/* ==========================================================================
   CEYLON BUS SIMULATOR 3.0 — FLEET CHASSIS & ANIMATED AI TRAFFIC ENGINE
   Includes:
     - New Colombo Metro AC Low-Floor Bus (animated sliding doors, LED matrix)
     - Ashok Leyland Viking Classic ("photo" heritage chassis adapter)
     - Yutong ZK6122H9 Southern Expressway Luxury Coach
     - Sovereign Electro Express Zero-Emission Coach
     - Animated AI Traffic Vehicles (spinning wheels, brake lamps, headlights,
       turn indicators, police interceptors, & AI Colombo Metro AC buses)
   ========================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const PI = Math.PI;

  const CATALOG = {
    metro: {
      id: 'metro',
      name: 'Colombo Metro AC',
      badge: 'NEW 3.0 · LOW-FLOOR',
      tagline: 'Modern Euro-6 Air-Conditioned City Transit · Dual Pneumatic Doors',
      lengthM: 11.8,
      widthM: 2.55,
      heightM: 3.18,
      floorY: 0.36,
      roofY: 3.16,
      shoulderY: 1.05,
      windowTopY: 2.55,
      wheelF: 3.65,
      wheelR: -2.65,
      wheelR_m: 0.52,
      eyePos: [-0.62, 2.04, 4.92],
      lookPos: [-0.48, 1.52, 16.0],
      bumperPos: [0, 0.92, 5.95],
      powerKw: 225,
      massKg: 13800,
      maxSpeedKmh: 98,
      capacity: 76,
      gears: 6,
      autoDefault: true,
      hasDualDoors: true,
      hasAcPod: true,
      electric: false,
      palette: {
        primary: '#b91c2e',
        secondary: '#f4f6f9',
        accent: '#f5b82e',
        skirt: '#252932',
        roof: 0xf1f5f9,
        ledText: '#ffb703',
        drlColor: 0xe6f7ff
      }
    },
    viking: {
      id: 'viking',
      name: 'Ashok Leyland Viking',
      badge: 'CLASSIC PRIVATE',
      tagline: 'Iconic Hill-Country Dam Rajini · High-Rev Turbo Diesel & Manual Stick',
      lengthM: 11.1,
      widthM: 2.5,
      heightM: 3.28,
      floorY: 0.85,
      roofY: 3.28,
      shoulderY: 1.94,
      windowTopY: 2.79,
      wheelF: 3.6,
      wheelR: -2.54,
      wheelR_m: 0.56,
      eyePos: [-0.45, 2.22, 4.72],
      lookPos: [-0.32, 1.45, 14.0],
      bumperPos: [0, 1.15, 5.55],
      powerKw: 155,
      massKg: 14200,
      maxSpeedKmh: 105,
      capacity: 52,
      gears: 5,
      autoDefault: false,
      hasDualDoors: false,
      hasAcPod: false,
      electric: false,
      palette: {
        primary: '#1e63b5',
        secondary: '#edf3f9',
        accent: '#ffd84a',
        skirt: '#143a73',
        roof: 0x8e949d,
        ledText: '#ffe9a8',
        drlColor: 0xfff2cc
      }
    },
    express: {
      id: 'express',
      name: 'Yutong Luxury Coach',
      badge: 'EXPRESSWAY SPEC',
      tagline: 'High-Deck Touring Coach · Cruise, Retarder & Panoramic Glass Cockpit',
      lengthM: 12.2,
      widthM: 2.55,
      heightM: 3.68,
      floorY: 1.12,
      roofY: 3.66,
      shoulderY: 1.48,
      windowTopY: 2.98,
      wheelF: 3.8,
      wheelR: -2.75,
      wheelR_m: 0.56,
      eyePos: [-0.58, 2.28, 5.15],
      lookPos: [-0.42, 1.65, 18.0],
      bumperPos: [0, 0.98, 6.15],
      powerKw: 270,
      massKg: 15800,
      maxSpeedKmh: 122,
      capacity: 54,
      gears: 6,
      autoDefault: true,
      hasDualDoors: false,
      hasAcPod: true,
      electric: false,
      palette: {
        primary: '#0f2c59',
        secondary: '#f8fafc',
        accent: '#38bdf8',
        skirt: '#1e293b',
        roof: 0xf8fafc,
        ledText: '#38bdf8',
        drlColor: 0xdff5ff
      }
    },
    electro: {
      id: 'electro',
      name: 'Sovereign Electro AC',
      badge: 'ZERO-EMISSION',
      tagline: 'Inazuma Sovereign E-Coach · Instant Torque, Regen Retarder & Glass MFD',
      lengthM: 11.9,
      widthM: 2.55,
      heightM: 3.24,
      floorY: 0.36,
      roofY: 3.24,
      shoulderY: 1.08,
      windowTopY: 2.58,
      wheelF: 3.65,
      wheelR: -2.65,
      wheelR_m: 0.52,
      eyePos: [-0.62, 2.06, 4.95],
      lookPos: [-0.48, 1.54, 16.0],
      bumperPos: [0, 0.92, 6.0],
      powerKw: 310,
      massKg: 14400,
      maxSpeedKmh: 115,
      capacity: 64,
      gears: 2,
      autoDefault: true,
      hasDualDoors: true,
      hasAcPod: true,
      electric: true,
      palette: {
        primary: '#3b1c7a',
        secondary: '#121324',
        accent: '#e8b931',
        skirt: '#0c0d18',
        roof: 0x1b1538,
        ledText: '#c4b5fd',
        drlColor: 0xc084fc
      }
    }
  };

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function makeTex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  /* ------------------------------------------------------------------
     Dynamic LED Destination Matrix (Metro / Express / Electro)
  ------------------------------------------------------------------ */
  function createLedMatrix(routeNum, destText, subText, accentHex) {
    const c = makeCanvas(512, 96);
    const tex = makeTex(c);
    function draw(num, dest, sub) {
      const g = c.getContext('2d');
      g.fillStyle = '#07080a';
      g.fillRect(0, 0, 512, 96);
      // Subtle LED dot grid texture
      g.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 4; y < 96; y += 6) g.fillRect(0, y, 512, 1);

      const led = accentHex || '#ffb703';
      // Route number pill on left
      g.fillStyle = led;
      g.fillRect(10, 10, 118, 76);
      g.fillStyle = '#08090c';
      g.font = '900 44px "Arial Black",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(num || '138'), 69, 49, 108);

      // Scrolling / fitted destination header
      g.fillStyle = led;
      g.font = '800 30px "Segoe UI",Arial,sans-serif';
      g.textAlign = 'left';
      g.fillText(String(dest || 'PETTAH - HOMAGAMA').toUpperCase(), 144, 34, 356);

      g.fillStyle = '#9be8ff';
      g.font = '700 20px "Segoe UI",Arial,sans-serif';
      g.fillText(String(sub || 'AC LUXURY SERVICE'), 144, 70, 356);
      tex.needsUpdate = true;
    }
    draw(routeNum, destText, subText);
    return { canvas: c, tex: tex, update: draw };
  }

  /* ------------------------------------------------------------------
     MSFS-Grade Cockpit Glass MFD Texture (Inside Cab)
  ------------------------------------------------------------------ */
  function createCockpitMFD() {
    const c = makeCanvas(512, 256);
    const tex = makeTex(c);
    let lastDraw = 0;
    function update(st) {
      const now = st.simT || 0;
      if (now - lastDraw < 0.08 && lastDraw > 0) return;
      lastDraw = now;
      const g = c.getContext('2d');
      g.fillStyle = '#07101c';
      g.fillRect(0, 0, 512, 256);

      // Left Panel: Primary Flight/Drive Tape (Speed + Gear + RPM)
      g.strokeStyle = 'rgba(56,189,248,0.35)';
      g.lineWidth = 2;
      g.strokeRect(10, 10, 236, 236);

      g.fillStyle = '#38bdf8';
      g.font = 'bold 16px monospace';
      g.textAlign = 'left';
      g.fillText('SPD KM/H', 22, 34);

      g.fillStyle = '#f8fafc';
      g.font = '900 72px "Segoe UI",sans-serif';
      g.fillText(String(Math.round(st.kmh || 0)), 20, 112);

      g.fillStyle = st.gear === 'R' ? '#f87171' : '#ffd24a';
      g.font = '900 36px monospace';
      g.fillText('G:' + (st.gear || 'N'), 156, 98);

      // RPM & Boost Bar
      const rpm = Math.max(0, Math.min(1, st.rpm || 0.2));
      g.fillStyle = '#1e293b';
      g.fillRect(22, 134, 210, 16);
      g.fillStyle = rpm > 0.85 ? '#ef4444' : '#22d3ee';
      g.fillRect(22, 134, 210 * rpm, 16);
      g.fillStyle = '#94a3b8';
      g.font = '13px monospace';
      g.fillText('AIR ' + Math.round(st.airPsi || 115) + ' PSI   RET ' + (st.retarder ? 'ON' : 'OFF'), 22, 174);
      g.fillText('FUEL ' + Math.round(st.fuelPct || 94) + '%    TEMP ' + Math.round(st.tempC || 86) + 'C', 22, 198);

      // Right Panel: Nav / Route / Next Halt
      g.strokeStyle = 'rgba(74,222,128,0.35)';
      g.strokeRect(260, 10, 242, 236);
      g.fillStyle = '#4ade80';
      g.font = 'bold 16px monospace';
      g.fillText('VFR ROUTE TELEMETRY', 274, 34);

      g.fillStyle = '#e2e8f0';
      g.font = 'bold 20px "Segoe UI",sans-serif';
      g.fillText(String(st.nextHalt || 'NEXT STOP').slice(0, 19), 274, 72);

      g.fillStyle = '#fbbf24';
      g.font = 'bold 28px monospace';
      g.fillText(Math.round(st.nextDistM || 0) + ' m', 274, 108);

      g.fillStyle = '#cbd5e1';
      g.font = '14px monospace';
      g.fillText('ALT: ' + Math.round(st.elevM || 14) + ' m ASL', 274, 146);
      g.fillText('LIM: ' + Math.round(st.limitKmh || 50) + ' KM/H', 274, 170);
      g.fillText('PAX: ' + (st.pax || 0) + '  DOORS: ' + (st.doorsOpen ? 'OPEN' : 'LOCK'), 274, 194);
      g.fillStyle = st.lightsOn ? '#fde047' : '#64748b';
      g.fillText('WIPER:' + (st.wipersOn ? 'ON' : 'OFF') + ' LAMP:' + (st.lightsOn ? 'HI' : 'OFF'), 274, 222);

      tex.needsUpdate = true;
    }
    update({ kmh: 0, gear: 'N', rpm: 0.2, airPsi: 118, nextHalt: 'READY' });
    return { canvas: c, tex: tex, update: update };
  }

  /* ------------------------------------------------------------------
     Wheel Builder (Rotatable steer group + spin group)
  ------------------------------------------------------------------ */
  function buildCoachWheel(sideSign, isDual, r, isModernAlloy) {
    const group = new THREE.Group();
    const spin = new THREE.Group();
    group.add(spin);
    const width = isDual ? 0.36 : 0.27;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.92, metalness: 0.05 });
    const rimMat = new THREE.MeshStandardMaterial({
      color: isModernAlloy ? 0xd8dee6 : 0x8d95a0,
      metalness: isModernAlloy ? 0.85 : 0.65,
      roughness: isModernAlloy ? 0.22 : 0.38
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e222a, roughness: 0.6, metalness: 0.4 });

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 24).rotateZ(PI / 2), tireMat);
    tire.castShadow = true;
    spin.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, width + 0.014, 18).rotateZ(PI / 2), rimMat);
    spin.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, width + 0.04, 12).rotateZ(PI / 2), darkMat);
    spin.add(hub);

    // Lug bolts / spoke pattern so spinning motion reads crisply at every speed
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(width + 0.025, r * 0.09, r * 0.44), darkMat);
      spoke.position.set(sideSign * 0.004, Math.sin(a) * r * 0.38, Math.cos(a) * r * 0.38);
      spoke.rotation.x = a;
      spin.add(spoke);
    }
    return { group: group, spin: spin };
  }

  /* ------------------------------------------------------------------
     Side Livery Texture Generator for Monocoque Buses (Metro/Express/Electro)
  ------------------------------------------------------------------ */
  function createSideTexture(spec, cfg, routeObj, isLeft) {
    const c = makeCanvas(1024, 384);
    const g = c.getContext('2d');
    const pal = Object.assign({}, spec.palette, cfg && cfg.skinPalette ? cfg.skinPalette : {});

    // Base body paint
    const grad = g.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, pal.secondary);
    grad.addColorStop(0.55, pal.secondary);
    grad.addColorStop(0.56, pal.primary);
    grad.addColorStop(0.84, pal.primary);
    grad.addColorStop(0.85, pal.skirt);
    grad.addColorStop(1, pal.skirt);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 384);

    // Dynamic diagonal swoosh stripe (authentic Sri Lankan Metro & Express look)
    g.fillStyle = pal.accent;
    g.beginPath();
    if (isLeft) {
      g.moveTo(0, 225);
      g.bezierCurveTo(320, 210, 620, 295, 1024, 175);
      g.lineTo(1024, 212);
      g.bezierCurveTo(620, 330, 320, 242, 0, 255);
    } else {
      g.moveTo(1024, 225);
      g.bezierCurveTo(704, 210, 404, 295, 0, 175);
      g.lineTo(0, 212);
      g.bezierCurveTo(404, 330, 704, 242, 1024, 255);
    }
    g.closePath();
    g.fill();

    // Operator lettering & route tag
    const opName = (cfg && cfg.name) || (spec.id === 'metro' ? 'COLOMBO METRO TRANSIT' : spec.id === 'electro' ? 'SOVEREIGN ELECTRO' : 'CEYLON EXPRESSWAY');
    g.fillStyle = '#ffffff';
    g.font = '900 32px "Segoe UI",Arial,sans-serif';
    g.textAlign = 'center';
    g.fillText(opName.toUpperCase(), 512, 272, 680);

    const rBadge = (routeObj && routeObj.number ? routeObj.number + ' · ' + routeObj.shortName : 'AC CITY EXPRESS').toUpperCase();
    g.fillStyle = pal.accent;
    g.font = '800 18px "Segoe UI",Arial,sans-serif';
    g.fillText(rBadge, 512, 304, 520);

    // Subtle panel seams & wheel arch trim
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 3;
    for (let x = 140; x < 920; x += 155) {
      g.beginPath();
      g.moveTo(x, 195);
      g.lineTo(x, 384);
      g.stroke();
    }

    // Punch clean transparent rectangular bays for flush panoramic glass (except driver pillar)
    const wyTop = 32;
    const wyBot = 178;
    const bays = isLeft
      ? [[190, 320], [332, 462], [474, 595], [690, 820], [832, 955]] // gaps at front door & middle door
      : [[70, 200], [212, 345], [357, 490], [502, 635], [647, 780], [792, 955]];
    bays.forEach(([x0, x1]) => {
      g.clearRect(x0, wyTop, x1 - x0, wyBot - wyTop);
      // Black ceramic frit border
      g.strokeStyle = '#0e1116';
      g.lineWidth = 6;
      g.strokeRect(x0, wyTop, x1 - x0, wyBot - wyTop);
    });

    // Clear doorway bays on curb left side (+X) for low-floor doors
    if (isLeft && spec.hasDualDoors) {
      g.clearRect(62, wyTop, 110, 384 - wyTop - 4);
      g.clearRect(606, wyTop, 74, 384 - wyTop - 4);
    } else if (isLeft) {
      g.clearRect(62, wyTop, 102, 384 - wyTop - 4);
    }

    return makeTex(c);
  }

  /* ------------------------------------------------------------------
     Modern Monocoque Bus Builder (Colombo Metro / Yutong / Electro)
  ------------------------------------------------------------------ */
  function buildMonocoqueBus(spec, cfg, routeObj) {
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(tilt);

    const L = spec.lengthM;
    const L2 = L / 2;
    const W = spec.widthM;
    const HW = W / 2;
    const H_BOT = spec.floorY;
    const H_TOP = spec.roofY;
    const pal = Object.assign({}, spec.palette, (cfg && cfg.skinPalette) || {});

    const paintGroup = new THREE.Group();
    tilt.add(paintGroup);

    const mShell = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pal.primary),
      metalness: 0.35,
      roughness: 0.36,
      envMapIntensity: 0.85
    });
    const mRoof = new THREE.MeshStandardMaterial({
      color: pal.roof,
      metalness: 0.25,
      roughness: 0.42
    });
    const mDark = new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.65, metalness: 0.2 });
    const mChrome = new THREE.MeshStandardMaterial({ color: 0xd0d6df, metalness: 0.92, roughness: 0.18 });
    const mGlass = new THREE.MeshPhysicalMaterial({
      color: 0x10202e,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.34,
      clearcoat: 1.0,
      depthWrite: false
    });
    const mFloor = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.9 });
    const mCeiling = new THREE.MeshStandardMaterial({ color: 0xe6eaf0, roughness: 0.8 });

    const out = {
      root,
      tilt,
      cfg: Object.assign({ photo: false, interior: true }, cfg || {}),
      spec,
      wheels: [],
      doors: [],
      wipers: [],
      paint: [paintGroup]
    };

    // Underbody chassis & floor slab
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.14, L - 0.35), mFloor);
    floorMesh.position.set(0, H_BOT + 0.07, 0);
    floorMesh.castShadow = true;
    tilt.add(floorMesh);

    const chassisRail = new THREE.Mesh(new THREE.BoxGeometry(W - 0.38, 0.22, L - 0.9), mDark);
    chassisRail.position.set(0, H_BOT - 0.06, 0);
    tilt.add(chassisRail);

    // Interior floor deck & aisle strip
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W - 0.18, 0.04, L - 0.45), new THREE.MeshStandardMaterial({ color: 0x383d48, roughness: 0.85 }));
    deck.position.set(0, H_BOT + 0.16, 0);
    tilt.add(deck);

    // Passenger seating rows (forward facing)
    const seatGeo = new THREE.BoxGeometry(0.42, 0.72, 0.42);
    const seatMat = new THREE.MeshStandardMaterial({
      color: spec.id === 'electro' ? 0x4c1d95 : spec.id === 'express' ? 0x1e3a8a : 0x991b1b,
      roughness: 0.75
    });
    for (let z = -L2 + 1.1; z < L2 - 2.3; z += 0.86) {
      [-0.86, -0.4, 0.44, 0.88].forEach(sx => {
        if (spec.hasDualDoors && sx > 0 && Math.abs(z + 0.95) < 0.75) return; // mid-door landing space
        const s = new THREE.Mesh(seatGeo, seatMat);
        s.position.set(sx, H_BOT + 0.56, z);
        tilt.add(s);
      });
    }

    // Grab rails + Overhead parcel racks + Strip Lighting
    out.cabinMat = new THREE.MeshBasicMaterial({ color: 0xebf8ff });
    [-0.36, 0.36].forEach(rx => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, L - 1.4), out.cabinMat);
      strip.position.set(rx, H_TOP - 0.18, -0.2);
      tilt.add(strip);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L - 1.8, 8).rotateX(PI / 2), mChrome);
      rail.position.set(rx, H_TOP - 0.42, -0.3);
      tilt.add(rail);
    });

    // Interior ceiling panel
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.24, 0.08, L - 0.35), mCeiling);
    ceil.position.set(0, H_TOP - 0.1, 0);
    tilt.add(ceil);

    // Left (+X curb side) & Right (-X driver side) skinned side panels
    const sideH = H_TOP - H_BOT - 0.12;
    const sideY = H_BOT + sideH / 2 + 0.08;

    const texL = createSideTexture(spec, cfg, routeObj, true);
    const matL = new THREE.MeshStandardMaterial({ map: texL, transparent: true, alphaTest: 0.35, roughness: 0.38, metalness: 0.18, side: THREE.DoubleSide });
    const sideL = new THREE.Mesh(new THREE.PlaneGeometry(L, sideH), matL);
    sideL.position.set(HW - 0.01, sideY, 0);
    sideL.rotation.y = PI / 2;
    sideL.castShadow = true;
    paintGroup.add(sideL);

    const texR = createSideTexture(spec, cfg, routeObj, false);
    const matR = new THREE.MeshStandardMaterial({ map: texR, transparent: true, alphaTest: 0.35, roughness: 0.38, metalness: 0.18, side: THREE.DoubleSide });
    const sideR = new THREE.Mesh(new THREE.PlaneGeometry(L, sideH), matR);
    sideR.position.set(-HW + 0.01, sideY, 0);
    sideR.rotation.y = -PI / 2;
    sideR.castShadow = true;
    paintGroup.add(sideR);

    // Flush panoramic side glass panes
    const winH = spec.windowTopY - spec.shoulderY;
    const winMidY = (spec.windowTopY + spec.shoulderY) / 2;
    const glassL = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.5, winH), mGlass);
    glassL.position.set(HW - 0.03, winMidY, -0.2);
    glassL.rotation.y = PI / 2;
    tilt.add(glassL);

    const glassR = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.5, winH), mGlass);
    glassR.position.set(-HW + 0.03, winMidY, -0.2);
    glassR.rotation.y = -PI / 2;
    tilt.add(glassR);

    // Roof crown shell + AC Pod / Battery Pod
    const roofShell = new THREE.Mesh(new THREE.BoxGeometry(W - 0.14, 0.16, L - 0.25), mRoof);
    roofShell.position.set(0, H_TOP - 0.04, 0);
    roofShell.castShadow = true;
    paintGroup.add(roofShell);

    if (spec.hasAcPod) {
      const acPod = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.68, 0.28, L * 0.44),
        new THREE.MeshStandardMaterial({ color: spec.electric ? 0x3b2c7a : 0xe2e8f0, roughness: 0.35, metalness: 0.25 })
      );
      acPod.position.set(0, H_TOP + 0.16, -0.45);
      acPod.castShadow = true;
      tilt.add(acPod);
      // AC louvers
      for (let vz = -1.6; vz <= 1.2; vz += 0.9) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.06, 0.36), mDark);
        vent.position.set(0, H_TOP + 0.18, vz);
        tilt.add(vent);
      }
    }

    // Front Lower Facade + Panoramic Sloped Windscreen + Glowing LED Header Matrix
    const frontLowerH = spec.shoulderY - H_BOT + 0.08;
    const frontApron = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, frontLowerH, 0.22), mShell);
    frontApron.position.set(0, H_BOT + frontLowerH / 2, L2 - 0.08);
    frontApron.castShadow = true;
    paintGroup.add(frontApron);

    // Front bumper + chrome accent bar
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.34, 0.28), mDark);
    fBumper.position.set(0, H_BOT + 0.2, L2 + 0.04);
    tilt.add(fBumper);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.42, 0.06), mDark);
    grille.position.set(0, H_BOT + 0.68, L2 + 0.04);
    tilt.add(grille);

    const logoBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.055, 0.08), mChrome);
    logoBar.position.set(0, spec.shoulderY + 0.04, L2 + 0.04);
    tilt.add(logoBar);

    // Pillars & Header Forehead above windscreen
    const headerH = 0.44;
    const fHeader = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, headerH, 0.22), mDark);
    fHeader.position.set(0, H_TOP - headerH / 2 - 0.04, L2 - 0.08);
    tilt.add(fHeader);

    [-HW + 0.06, HW - 0.06].forEach(px => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.11, H_TOP - spec.shoulderY, 0.16), mDark);
      pil.position.set(px, (H_TOP + spec.shoulderY) / 2, L2 - 0.06);
      tilt.add(pil);
    });

    // Big Panoramic One-Piece Windscreen Glass
    const wsH = H_TOP - headerH - spec.shoulderY;
    const wsMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.24, wsH), mGlass);
    wsMesh.position.set(0, spec.shoulderY + wsH / 2, L2 + 0.02);
    tilt.add(wsMesh);

    // Animated Windshield Wipers (driven by MSFS_ATMOSPHERE / K key!)
    [-0.52, 0.44].forEach((wx, idx) => {
      const pivot = new THREE.Group();
      pivot.position.set(wx, spec.shoulderY + 0.05, L2 + 0.045);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.76, 0.025), mDark);
      arm.position.set(0, 0.36, 0);
      pivot.add(arm);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.56, 0.03), mDark);
      blade.position.set(idx === 0 ? 0.02 : -0.02, 0.65, 0.01);
      pivot.add(blade);
      pivot.rotation.z = idx === 0 ? 0.55 : -0.55;
      tilt.add(pivot);
      out.wipers.push(pivot);
    });

    // Illuminated Front LED Matrix Destination Display
    const rNum = (routeObj && routeObj.number) || (cfg && cfg.num) || '138';
    const rDest = (routeObj && routeObj.shortName) || (cfg && cfg.route) || 'PETTAH - HOMAGAMA';
    const rSub = spec.id === 'metro' ? 'COLOMBO METRO AC' : spec.id === 'electro' ? 'SOVEREIGN ELECTRO' : 'EXPRESSWAY LUXURY';
    const led = createLedMatrix(rNum, rDest, rSub, pal.ledText);
    out.ledTex = led.tex;
    out.updateLED = led.update;

    const ledMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.31), new THREE.MeshBasicMaterial({ map: led.tex }));
    ledMesh.position.set(0, H_TOP - 0.26, L2 + 0.036);
    tilt.add(ledMesh);

    // Rear Engine Bay + Rear Windshield + Spoiler + LED Tail Clusters
    const rearBody = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H_TOP - H_BOT - 0.08, 0.24), mShell);
    rearBody.position.set(0, (H_TOP + H_BOT) / 2, -L2 + 0.08);
    rearBody.castShadow = true;
    paintGroup.add(rearBody);

    const rearWin = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.52, 0.88), mDark);
    rearWin.position.set(0, H_TOP - 0.68, -L2 - 0.042);
    rearWin.rotation.y = PI;
    tilt.add(rearWin);

    const rearNumPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: led.tex }));
    rearNumPlate.position.set(0, H_TOP - 0.22, -L2 - 0.044);
    rearNumPlate.rotation.y = PI;
    tilt.add(rearNumPlate);

    // Animated Pneumatic Doors (Curb Left Side +X)
    const createDoorLeaf = (zCenter, wDoor) => {
      const doorGrp = new THREE.Group();
      doorGrp.position.set(HW + 0.01, H_BOT + 1.08, zCenter);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.02, wDoor), new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.35, metalness: 0.4 }));
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(wDoor * 0.72, 1.32), mGlass);
      pane.position.set(0.03, 0.2, 0);
      pane.rotation.y = PI / 2;
      doorGrp.add(leaf, pane);
      tilt.add(doorGrp);
      return { grp: doorGrp, baseZ: zCenter, baseX: HW + 0.01 };
    };
    const frontDoor = createDoorLeaf(L2 - 1.25, 1.02);
    out.doors.push(frontDoor);
    if (spec.hasDualDoors) {
      out.doors.push(createDoorLeaf(-1.05, 1.04));
    }

    // Modern Wing Mirrors (Aerodynamic Twin-Arm Camera/Mirror Pods)
    [-1, 1].forEach(s => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.12), mDark);
      arm.position.set(s * (HW + 0.14), H_TOP - 0.55, L2 + 0.02);
      tilt.add(arm);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.2), mShell);
      pod.position.set(s * (HW + 0.26), H_TOP - 0.68, L2 + 0.06);
      paintGroup.add(pod);
      const mirGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.39), new THREE.MeshStandardMaterial({ color: 0xbfd4e6, metalness: 0.96, roughness: 0.04 }));
      mirGlass.position.set(s * (HW + 0.26), H_TOP - 0.68, L2 - 0.044);
      mirGlass.rotation.y = PI;
      tilt.add(mirGlass);
    });

    // Headlights (DRL + Projector Pods), Taillights, & Left/Right Amber Turn Blinkers
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: pal.drlColor,
      emissiveIntensity: 0.45,
      roughness: 0.15
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xff1e1e,
      emissiveIntensity: 0.35,
      roughness: 0.25
    });
    const blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8c00, emissiveIntensity: 0.15 });
    const blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8c00, emissiveIntensity: 0.15 });
    out.hlMat = hlMat;
    out.tailMat = tailMat;
    out.blinkLMat = blinkLMat;
    out.blinkRMat = blinkRMat;

    [-1, 1].forEach(s => {
      const bm = s > 0 ? blinkLMat : blinkRMat; // +X = bus Left (curb), -X = bus Right (driver/road)
      // Front LED Projector Cluster + DRL Strip
      const fLamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.05), hlMat);
      fLamp.position.set(s * 0.96, H_BOT + 0.56, L2 + 0.06);
      tilt.add(fLamp);
      const fInd = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.055), bm);
      fInd.position.set(s * 1.19, H_BOT + 0.56, L2 + 0.055);
      tilt.add(fInd);
      // Side repeater marker
      const sInd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.18), bm);
      sInd.position.set(s * (HW + 0.012), H_BOT + 0.54, L2 - 1.5);
      tilt.add(sInd);
      // Rear LED Vertical Tail + Brake + Indicator Bar
      const rTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.05), tailMat);
      rTail.position.set(s * 1.08, H_BOT + 0.84, -L2 - 0.052);
      tilt.add(rTail);
      const rInd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.055), bm);
      rInd.position.set(s * 1.08, H_BOT + 0.42, -L2 - 0.052);
      tilt.add(rInd);
    });

    // Euro Glass Cockpit Dashboard + MFD Display + Steering Column (inside cab)
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, 0.58), mDark);
    dash.position.set(-0.62, H_BOT + 1.18, L2 - 0.46);
    tilt.add(dash);

    const mfd = createCockpitMFD();
    out.mfdTex = mfd.tex;
    out.mfdCanvas = mfd.canvas;
    out.updateMFD = mfd.update;

    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshBasicMaterial({ map: mfd.tex }));
    screenMesh.position.set(-0.62, H_BOT + 1.41, L2 - 0.68);
    screenMesh.rotation.y = PI;
    screenMesh.rotation.x = 0.28;
    tilt.add(screenMesh);

    const swGrp = new THREE.Group();
    swGrp.position.set(-0.62, H_BOT + 1.32, L2 - 0.85);
    swGrp.rotation.x = -0.88;
    swGrp.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 10, 28), mDark));
    swGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.03), mChrome));
    swGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.03), mChrome).translateY(-0.1));
    tilt.add(swGrp);
    out.wheelMesh = swGrp;

    // 4 Spinning Wheels (Steerable Front, Dual-Tire Drive Rear)
    const rW = spec.wheelR_m;
    [
      [1, spec.wheelF, false, true],
      [-1, spec.wheelF, false, true],
      [1, spec.wheelR, true, false],
      [-1, spec.wheelR, true, false]
    ].forEach(([sideSign, wz, isDual, isSteer]) => {
      const wh = buildCoachWheel(sideSign, isDual, rW, true);
      wh.group.position.set(sideSign * (HW - 0.14), rW, wz);
      wh.steer = isSteer;
      tilt.add(wh.group);
      out.wheels.push(wh);
    });

    return out;
  }

  /* ------------------------------------------------------------------
     Public Unified Bus Factory (Classic Viking + New 3.0 Fleet)
  ------------------------------------------------------------------ */
  function buildBus(modelId, cfg, routeObj, fallbackMakeBus) {
    const spec = CATALOG[modelId] || CATALOG.metro;
    if (modelId === 'viking' && typeof fallbackMakeBus === 'function') {
      const b = fallbackMakeBus(cfg);
      b.spec = spec;
      // Add animated wipers & turn mats onto classic Viking cleanly without altering its photo mesh
      const mDark = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.7 });
      b.wipers = [-0.55, 0.55].map((wx, idx) => {
        const piv = new THREE.Group();
        piv.position.set(wx, 1.98, 5.57);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.56, 0.02), mDark);
        arm.position.y = 0.27;
        piv.add(arm);
        piv.rotation.z = idx === 0 ? 0.5 : -0.5;
        b.tilt.add(piv);
        return piv;
      });
      b.doors = [];
      b.blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8800, emissiveIntensity: 0.1 });
      b.blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8800, emissiveIntensity: 0.1 });
      return b;
    }
    return buildMonocoqueBus(spec, cfg, routeObj);
  }

  /* ------------------------------------------------------------------
     Animate Doors, Wipers, Blinkers & Cockpit MFD Each Frame
  ------------------------------------------------------------------ */
  function animateBusExtras(busObj, state, dt) {
    if (!busObj) return;
    // 1. Pneumatic sliding doors
    if (busObj.doors && busObj.doors.length) {
      const target = state.doorsOpen ? 1 : 0;
      busObj._doorProg = (busObj._doorProg || 0) + (target - (busObj._doorProg || 0)) * Math.min(1, dt * 5.5);
      const p = busObj._doorProg;
      busObj.doors.forEach((d, idx) => {
        d.grp.position.x = d.baseX + p * 0.14;
        d.grp.position.z = d.baseZ + p * (idx === 0 ? 0.72 : -0.72);
      });
    }
    // 2. Windshield Wipers (smooth sinusoidal sweep + parked rest angle)
    if (busObj.wipers && busObj.wipers.length) {
      if (state.wipersOn) {
        const rate = state.rainLevel > 0.55 ? 5.6 : 3.6;
        busObj._wiperPhase = (busObj._wiperPhase || 0) + dt * rate;
        const sweep = (Math.sin(busObj._wiperPhase) * 0.5 + 0.5);
        busObj.wipers[0].rotation.z = 0.55 - sweep * 1.15;
        if (busObj.wipers[1]) busObj.wipers[1].rotation.z = -0.55 + sweep * 1.15;
      } else {
        busObj.wipers.forEach((w, idx) => {
          const rest = idx === 0 ? 0.55 : -0.55;
          w.rotation.z += (rest - w.rotation.z) * Math.min(1, dt * 8);
        });
      }
    }
    // 3. Turn indicators on exterior
    if (busObj.blinkLMat) busObj.blinkLMat.emissiveIntensity = (state.blinkL || state.hazard) && state.blinkOn ? 3.0 : 0.1;
    if (busObj.blinkRMat) busObj.blinkRMat.emissiveIntensity = (state.blinkR || state.hazard) && state.blinkOn ? 3.0 : 0.1;
    // 4. Glass Cockpit MFD screen refresh
    if (busObj.updateMFD) {
      busObj.updateMFD(state);
    }
  }

  /* ==================================================================
     ANIMATED AI TRAFFIC VEHICLE BUILDERS
     Replaces frozen static wheels with live rotating wheel assemblies,
     night-reactive headlights, brake lights, amber indicators,
     police interceptors & AI Colombo Metro AC buses.
  ================================================================== */
  const AI_MAT_CACHE = {};
  const aiMat = (key, opts) => AI_MAT_CACHE[key] || (AI_MAT_CACHE[key] = new THREE.MeshStandardMaterial(opts));
  const M_GLASS = () => aiMat('glass', { color: 0x0c1822, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.5 });
  const M_TIRE = () => aiMat('tire', { color: 0x0e0f12, roughness: 0.94, metalness: 0.04 });
  const M_RIM = () => aiMat('rim', { color: 0x8b929e, metalness: 0.78, roughness: 0.28 });
  const M_DARK = () => aiMat('dark', { color: 0x17181c, roughness: 0.72, metalness: 0.15 });
  const M_CHROME = () => aiMat('chrome', { color: 0xd0d5dd, metalness: 0.92, roughness: 0.18 });
  const M_SKIN = () => aiMat('skin', { color: 0xa8683f, roughness: 0.85 });
  const M_SHIRT = () => aiMat('shirt', { color: 0x35507a, roughness: 0.9 });
  const paintM = col => aiMat('p_' + col, { color: col, metalness: 0.5, roughness: 0.32, envMapIntensity: 1.0 });

  function mergeStaticBody(g) {
    g.updateMatrixWorld(true);
    const byMat = new Map();
    g.traverse(o => {
      if (o.isMesh) {
        const list = byMat.get(o.material);
        if (list) list.push(o);
        else byMat.set(o.material, [o]);
      }
    });
    const out = new THREE.Group();
    byMat.forEach((meshes, mat) => {
      const pos = [];
      const nor = [];
      meshes.forEach(m => {
        const gm = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        gm.applyMatrix4(m.matrixWorld);
        pos.push(...gm.attributes.position.array);
        nor.push(...gm.attributes.normal.array);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.computeBoundingSphere();
      const merged = new THREE.Mesh(geo, mat);
      merged.castShadow = true;
      out.add(merged);
    });
    return out;
  }

  function addAiWheel(root, list, x, y, z, r, w) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const spin = new THREE.Group();
    grp.add(spin);
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12).rotateZ(PI / 2), M_TIRE()));
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w + 0.01, 10).rotateZ(PI / 2), M_RIM()));
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, r * 0.14, r * 1.15), M_DARK());
    spin.add(bar);
    root.add(grp);
    list.push({ grp: grp, spin: spin, r: r });
  }

  function attachAiLights(root, layout) {
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff5d6, emissive: 0xffe8a3, emissiveIntensity: 0.2, roughness: 0.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x991111, emissive: 0xff1a0a, emissiveIntensity: 0.18, roughness: 0.3 });
    const blinkLMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8c00, emissiveIntensity: 0 });
    const blinkRMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xff8c00, emissiveIntensity: 0 });

    const { xW, zF, zR, yF, yR } = layout;
    [-1, 1].forEach(s => {
      const bm = s > 0 ? blinkLMat : blinkRMat;
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.06), hlMat);
      hl.position.set(s * xW, yF, zF);
      root.add(hl);

      const indF = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.065), bm);
      indF.position.set(s * (xW + 0.16), yF, zF - 0.02);
      root.add(indF);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), tailMat);
      tl.position.set(s * xW, yR, zR);
      root.add(tl);

      const indR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.065), bm);
      indR.position.set(s * (xW + 0.16), yR, zR);
      root.add(indR);
    });

    root.userData.hlMat = hlMat;
    root.userData.tailMat = tailMat;
    root.userData.blinkLMat = blinkLMat;
    root.userData.blinkRMat = blinkRMat;
  }

  function buildTrafficVehicle(kind, col, opts) {
    opts = opts || {};
    const body = new THREE.Group();
    const wheels = [];
    let layout = { xW: 0.62, zF: 2.1, zR: -2.12, yF: 0.72, yR: 0.78 };

    if (kind === 'car' || kind === 'police') {
      const isPolice = kind === 'police';
      const P = paintM(isPolice ? 0xf4f6f9 : col);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.56, 4.24), P);
      hull.position.set(0, 0.62, 0);
      body.add(hull);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 2.2), M_GLASS());
      cabin.position.set(0, 1.12, -0.15);
      body.add(cabin);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.08, 1.85), isPolice ? paintM(0x162b4d) : P);
      roof.position.set(0, 1.4, -0.2);
      body.add(roof);
      if (isPolice) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.14, 2.4), paintM(0x162b4d));
        stripe.position.set(0, 0.68, 0.1);
        body.add(stripe);
      }
      const root = mergeStaticBody(body);
      [-1, 1].forEach(s => {
        [1.34, -1.32].forEach(z => addAiWheel(root, wheels, s * 0.84, 0.34, z, 0.34, 0.22));
      });
      attachAiLights(root, layout);
      if (isPolice) {
        const rMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.5 });
        const bMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x0044ff, emissiveIntensity: 1.5 });
        const barR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), rMat);
        barR.position.set(-0.24, 1.5, -0.2);
        const barB = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), bMat);
        barB.position.set(0.24, 1.5, -0.2);
        root.add(barR, barB);
        root.userData.policeBeacons = [rMat, bMat];
      }
      root.userData.wheels = wheels;
      return root;
    }

    if (kind === 'van') {
      const P = paintM(col);
      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.45, 4.75), P);
      shell.position.set(0, 1.12, 0);
      body.add(shell);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.56, 3.65), M_GLASS());
      gl.position.set(0, 1.44, 0.2);
      body.add(gl);
      const ws = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 0.08), M_GLASS());
      ws.position.set(0, 1.42, 2.36);
      body.add(ws);
      const root = mergeStaticBody(body);
      [-1, 1].forEach(s => {
        [1.48, -1.45].forEach(z => addAiWheel(root, wheels, s * 0.88, 0.36, z, 0.36, 0.22));
      });
      attachAiLights(root, { xW: 0.68, zF: 2.39, zR: -2.39, yF: 0.72, yR: 0.82 });
      root.userData.wheels = wheels;
      return root;
    }

    if (kind === 'tuk') {
      const P = paintM(col);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.88, 1.6), P);
      hood.position.set(0, 0.68, -0.35);
      body.add(hood);
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.78), P);
      cowl.position.set(0, 0.65, 0.75);
      body.add(cowl);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.64, 2.15), M_DARK());
      canopy.position.set(0, 1.38, -0.1);
      body.add(canopy);
      const drv = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M_SKIN());
      drv.position.set(0, 1.24, 0.25);
      body.add(drv);
      const root = mergeStaticBody(body);
      addAiWheel(root, wheels, 0, 0.25, 1.02, 0.25, 0.14);
      [-1, 1].forEach(s => addAiWheel(root, wheels, s * 0.62, 0.25, -0.82, 0.25, 0.14));
      attachAiLights(root, { xW: 0.14, zF: 1.15, zR: -1.16, yF: 0.72, yR: 0.54 });
      root.userData.wheels = wheels;
      return root;
    }

    if (kind === 'bike') {
      const P = paintM(col);
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 1.05), P);
      tank.position.set(0, 0.78, 0.05);
      body.add(tank);
      const rider = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.28), M_SHIRT());
      rider.position.set(0, 1.15, -0.15);
      body.add(rider);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), P);
      helm.position.set(0, 1.54, -0.05);
      body.add(helm);
      const root = mergeStaticBody(body);
      [0.68, -0.66].forEach(z => addAiWheel(root, wheels, 0, 0.31, z, 0.31, 0.11));
      attachAiLights(root, { xW: 0.05, zF: 0.75, zR: -0.86, yF: 0.88, yR: 0.74 });
      root.userData.wheels = wheels;
      return root;
    }

    if (kind === 'truck') {
      const P = paintM(col);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.36, 1.85, 1.95), P);
      cab.position.set(0, 1.38, 2.35);
      body.add(cab);
      const ws = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.74, 0.08), M_GLASS());
      ws.position.set(0, 1.78, 3.34);
      body.add(ws);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.15, 5.15), aiMat('cargo_' + col, { color: 0xb5915a, roughness: 0.85 }));
      bed.position.set(0, 1.72, -1.25);
      body.add(bed);
      const root = mergeStaticBody(body);
      [-1, 1].forEach(s => {
        [2.35, -1.65, -2.75].forEach(z => addAiWheel(root, wheels, s * 1.12, 0.48, z, 0.48, 0.3));
      });
      attachAiLights(root, { xW: 0.82, zF: 3.35, zR: -3.84, yF: 0.78, yR: 0.8 });
      root.userData.wheels = wheels;
      return root;
    }

    // Fallback: AI Colombo Metro AC City Bus (used for mixed city traffic & metro corridor!)
    const routeObj = opts.routeObj || { number: '138', shortName: 'PETTAH - HOMAGAMA' };
    const metro = buildMonocoqueBus(CATALOG.metro, { name: opts.name || 'METRO AC', skinPalette: opts.skinPalette }, routeObj);
    metro.root.userData.wheels = metro.wheels.map(w => ({ grp: w.group, spin: w.spin, r: CATALOG.metro.wheelR_m }));
    metro.root.userData.hlMat = metro.hlMat;
    metro.root.userData.tailMat = metro.tailMat;
    metro.root.userData.blinkLMat = metro.blinkLMat;
    metro.root.userData.blinkRMat = metro.blinkRMat;
    return metro.root;
  }

  /* ------------------------------------------------------------------
     Update Animated AI Traffic Lamps & Wheel Rotation Each Frame
  ------------------------------------------------------------------ */
  function animateTrafficVehicle(v, dt, isDarkOrRain, blinkPulse) {
    const m = v && v.mesh;
    if (!m || !m.userData) return;
    const ud = m.userData;
    const spd = v.speed || 0;

    // 1. Spin all wheels accurately with ground distance traveled
    if (ud.wheels) {
      for (let i = 0; i < ud.wheels.length; i++) {
        const w = ud.wheels[i];
        w.spin.rotation.x += (spd * dt) / (w.r || 0.36);
      }
    }
    // 2. Night / Dusk / Rain Headlights
    if (ud.hlMat) {
      ud.hlMat.emissiveIntensity = isDarkOrRain ? 2.6 : 0.15;
    }
    // 3. Reactive Brake Lights when slowing or stopped
    if (ud.tailMat) {
      const braking = (v.acc !== undefined && v.acc < -0.45) || spd < 0.6;
      ud.tailMat.emissiveIntensity = braking ? 3.2 : (isDarkOrRain ? 0.9 : 0.2);
    }
    // 4. Amber Left / Right Overtake & Yield Blinkers
    if (ud.blinkLMat && ud.blinkRMat) {
      const ovt = v.ovt > 0;
      const yld = v.yieldT > 0.2;
      ud.blinkLMat.emissiveIntensity = yld && blinkPulse ? 3.2 : 0;
      ud.blinkRMat.emissiveIntensity = ovt && blinkPulse ? 3.2 : 0;
    }
    // 5. Police Interceptor Alternating Red / Blue Roof Beacons
    if (ud.policeBeacons) {
      ud.policeBeacons[0].emissiveIntensity = blinkPulse ? 3.5 : 0.15;
      ud.policeBeacons[1].emissiveIntensity = blinkPulse ? 0.15 : 3.5;
    }
  }

  global.BUS_MODELS = {
    catalog: CATALOG,
    buildBus,
    animateBusExtras,
    buildTrafficVehicle,
    animateTrafficVehicle,
    createLedMatrix,
    createCockpitMFD
  };
})(window);
