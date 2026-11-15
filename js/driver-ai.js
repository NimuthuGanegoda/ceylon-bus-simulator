/**
 * World Bus Simulator 3.0 — Online-Learning Player AI Model (2-Layer Neural Policy)
 * Observes live 8D telemetry (limit, curve, grade, lead gap, closing speed, wet,
 * red signals, bus halts) during human driving, trains via Backprop + Momentum SGD,
 * adapts Rival AI behavior, and powers AI Co-Pilot / Autopilot (KeyP).
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'wbs_driver_ai_v1';
  const N_IN = 8;
  const N_HID = 12;
  const N_OUT = 4;

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const sig = (z) => 1 / (1 + Math.exp(-clamp(z, -12, 12)));
  const tanh = Math.tanh ? (z) => Math.tanh(z) : (z) => {
    const e = Math.exp(2 * clamp(z, -10, 10));
    return (e - 1) / (e + 1);
  };

  function seededWeight(i, j, scale) {
    const s = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453;
    return ((s - Math.floor(s)) * 2 - 1) * scale;
  }

  function createInitialState() {
    const w1 = new Array(N_IN * N_HID).fill(0).map((_, k) => seededWeight(k % N_IN, Math.floor(k / N_IN), 0.25));
    const b1 = new Array(N_HID).fill(0);
    const w2 = new Array(N_HID * N_OUT).fill(0).map((_, k) => seededWeight(k % N_HID + 20, Math.floor(k / N_HID), 0.18));
    // Expert Sri Lankan Highway Driver Prior Biases:
    // Out 0: paceRatio sig(~0.42) -> 0.55 + 0.80 * 0.60 ~= 1.03x limit on open road
    // Out 1: throttleAggression sig(0.35) ~= 0.59
    // Out 2: brakeEarliness sig(0.45) ~= 0.61
    // Out 3: hornRate sig(-1.35) ~= 0.21
    const b2 = [0.22, 0.35, 0.45, -1.35];

    // Add direct domain priors to W1 + W2 alignment on key features
    // Hidden unit 0: curve sensitivity (+x1), unit 1: traffic proximity (+x3/+x4),
    // unit 2: signal/halt stopping (+x6/+x7), unit 3: rain caution (+x5), unit 4: limit (+x0)
    w1[1 * N_HID + 0] = 0.85;
    w1[3 * N_HID + 1] = 0.90;
    w1[4 * N_HID + 1] = 0.65;
    w1[6 * N_HID + 2] = 0.95;
    w1[7 * N_HID + 2] = 0.80;
    w1[5 * N_HID + 3] = 0.85;
    w1[0 * N_HID + 4] = 0.80;

    // Connect semantic hidden units cleanly to policy outputs
    w2[0 * N_OUT + 0] = -0.75; // curve reduces pace
    w2[1 * N_OUT + 0] = -0.80; // traffic ahead reduces pace
    w2[2 * N_OUT + 0] = -0.95; // signal/halt reduces pace
    w2[3 * N_OUT + 0] = -0.35; // wet road moderates pace
    w2[4 * N_OUT + 0] = 0.40;  // higher speed limit increases pace

    w2[1 * N_OUT + 2] = 0.85;  // traffic closing increases brake demand
    w2[2 * N_OUT + 2] = 0.95;  // signal/halt increases brake demand
    w2[3 * N_OUT + 2] = 0.35;  // rain increases brake earliness
    w2[1 * N_OUT + 3] = 0.95;  // close traffic increases air-horn rate

    return {
      version: 1,
      samples: 0,
      driveSec: 0,
      lossEma: 0.085,
      lossHist: [0.085],
      w1, b1, w2, b2,
      vw1: new Array(N_IN * N_HID).fill(0),
      vb1: new Array(N_HID).fill(0),
      vw2: new Array(N_HID * N_OUT).fill(0),
      vb2: new Array(N_OUT).fill(0),
      stats: {
        avgPaceRatio: 0.96,
        avgThrAggr: 0.58,
        avgBrkEarly: 0.60,
        avgWetDrop: 0.14,
        avgCurveCaution: 0.62,
        avgHornRate: 0.18
      }
    };
  }

  let st = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.w1) && parsed.w1.length === N_IN * N_HID) {
        st = Object.assign(createInitialState(), parsed);
      }
    }
  } catch (e) {}

  let saveCounter = 0;
  let lastFeatures = [0.5, 0, 0, 0, 0, 0, 0, 0];
  let lastPred = [0.96, 0.58, 0.60, 0.18];
  let autopilotOn = false;
  let rivalAdaptOn = true;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function buildFeatures(obs) {
    const limKmh = clamp(obs.limitKmh || 50, 25, 120);
    return [
      clamp(limKmh / 110, 0.2, 1.0),
      clamp((obs.curv || 0) * 45, 0, 1),
      clamp((obs.grade || 0) * 6, -1, 1),
      clamp(1 - (obs.leadDist !== undefined ? obs.leadDist : 120) / 70, 0, 1),
      clamp((obs.closingSpd || 0) / 14, -1, 1),
      clamp(obs.wet || 0, 0, 1),
      clamp(1 - (obs.sigDist !== undefined ? obs.sigDist : 150) / 85, 0, 1),
      clamp(1 - (obs.haltDist !== undefined ? obs.haltDist : 160) / 110, 0, 1)
    ];
  }

  function forward(x) {
    const h = new Array(N_HID);
    for (let j = 0; j < N_HID; j++) {
      let sum = st.b1[j];
      for (let i = 0; i < N_IN; i++) sum += x[i] * st.w1[i * N_HID + j];
      h[j] = tanh(sum);
    }
    const y = new Array(N_OUT);
    for (let k = 0; k < N_OUT; k++) {
      let sum = st.b2[k];
      for (let j = 0; j < N_HID; j++) sum += h[j] * st.w2[j * N_OUT + k];
      y[k] = sig(sum);
    }
    return { h, y };
  }

  function observe(obs) {
    if (!obs) return null;
    const x = buildFeatures(obs);
    lastFeatures = x;
    const fwd = forward(x);
    lastPred = [
      0.55 + fwd.y[0] * 0.80,
      fwd.y[1],
      fwd.y[2],
      fwd.y[3]
    ];

    const dt = clamp(obs.dt || 0.016, 0.001, 0.1);
    const spdKmh = Math.abs(obs.kmh || 0);
    const limKmh = clamp(obs.limitKmh || 50, 25, 120);

    // Only train network weights when human is manually driving and moving (> 3 km/h)
    if (!autopilotOn && spdKmh > 3.5) {
      const obsRatioNorm = clamp(((spdKmh / limKmh) - 0.55) / 0.80, 0.02, 0.98);
      const tgt = [
        obsRatioNorm,
        obs.thr ? clamp(0.65 + spdKmh / 140, 0.5, 0.98) : 0.20,
        obs.brake ? 0.95 : (x[3] > 0.45 && !obs.thr ? 0.72 : 0.18),
        obs.horn ? 0.96 : (x[3] > 0.55 ? 0.08 : fwd.y[3])
      ];

      // Sample mask: train output 0 mostly when cruising / not stopped at red light or halt
      const wOut = [
        (x[6] < 0.25 && x[7] < 0.25 && spdKmh > 12) ? 1.0 : 0.25,
        1.0,
        1.0,
        obs.horn ? 1.4 : 0.22
      ];

      let mse = 0;
      const dOut = new Array(N_OUT);
      for (let k = 0; k < N_OUT; k++) {
        const err = (fwd.y[k] - tgt[k]) * wOut[k];
        mse += err * err;
        dOut[k] = err * fwd.y[k] * (1 - fwd.y[k]);
      }
      mse /= N_OUT;

      const dHid = new Array(N_HID);
      for (let j = 0; j < N_HID; j++) {
        let s = 0;
        for (let k = 0; k < N_OUT; k++) s += dOut[k] * st.w2[j * N_OUT + k];
        dHid[j] = s * (1 - fwd.h[j] * fwd.h[j]);
      }

      const lr = 0.015;
      const mom = 0.82;
      const decay = 0.00015;
      for (let j = 0; j < N_HID; j++) {
        for (let k = 0; k < N_OUT; k++) {
          const idx = j * N_OUT + k;
          const grad = dOut[k] * fwd.h[j] + decay * st.w2[idx];
          st.vw2[idx] = mom * st.vw2[idx] - lr * grad;
          st.w2[idx] = clamp(st.w2[idx] + st.vw2[idx], -3.5, 3.5);
        }
      }
      for (let k = 0; k < N_OUT; k++) {
        st.vb2[k] = mom * st.vb2[k] - lr * dOut[k];
        st.b2[k] = clamp(st.b2[k] + st.vb2[k], -3.5, 3.5);
      }
      for (let i = 0; i < N_IN; i++) {
        for (let j = 0; j < N_HID; j++) {
          const idx = i * N_HID + j;
          const grad = dHid[j] * x[i] + decay * st.w1[idx];
          st.vw1[idx] = mom * st.vw1[idx] - lr * grad;
          st.w1[idx] = clamp(st.w1[idx] + st.vw1[idx], -3.5, 3.5);
        }
      }
      for (let j = 0; j < N_HID; j++) {
        st.vb1[j] = mom * st.vb1[j] - lr * dHid[j];
        st.b1[j] = clamp(st.b1[j] + st.vb1[j], -3.5, 3.5);
      }

      st.samples += 1;
      st.driveSec += dt;
      st.lossEma = st.lossEma * 0.985 + mse * 0.015;
      if (st.samples % 25 === 0) {
        st.lossHist.push(+st.lossEma.toFixed(5));
        if (st.lossHist.length > 60) st.lossHist.shift();
      }

      // Update interpretable behavioral EMA metrics
      const a = 0.008;
      if (x[6] < 0.2 && x[7] < 0.2 && spdKmh > 14) {
        st.stats.avgPaceRatio = st.stats.avgPaceRatio * (1 - a) + clamp(spdKmh / limKmh, 0.5, 1.45) * a;
      }
      if (obs.thr) st.stats.avgThrAggr = st.stats.avgThrAggr * (1 - a) + clamp(0.5 + fwd.y[1] * 0.5, 0.2, 1) * a;
      if (obs.brake) st.stats.avgBrkEarly = st.stats.avgBrkEarly * (1 - a) + clamp(0.4 + x[3] * 0.5, 0.2, 1) * a;
      if (x[1] > 0.25) {
        const caution = clamp(1.2 - spdKmh / limKmh, 0.1, 1);
        st.stats.avgCurveCaution = st.stats.avgCurveCaution * (1 - a * 2) + caution * a * 2;
      }
      if (x[5] > 0.2) {
        const drop = clamp(1.05 - spdKmh / limKmh, 0, 0.55);
        st.stats.avgWetDrop = st.stats.avgWetDrop * (1 - a * 2) + drop * a * 2;
      }
      st.stats.avgHornRate = st.stats.avgHornRate * 0.996 + (obs.horn ? 1 : 0) * 0.004;

      if (++saveCounter >= 120) {
        saveCounter = 0;
        saveState();
      }
    }
    return lastPred;
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function computeAutopilot(ctx) {
    const x = buildFeatures(ctx);
    const { y } = forward(x);
    const paceRatio = clamp(0.62 + y[0] * 0.66, 0.65, 1.25);
    const thrAggr = y[1];
    const brkEarly = y[2];
    const hornProb = y[3];

    const limMs = clamp((ctx.limitKmh || 50) / 3.6, 6, 33);
    const curvMs = Math.sqrt(2.8 / Math.max(ctx.curv || 0, 1e-4));
    let tgtSpd = Math.min(limMs * paceRatio, curvMs, (ctx.maxBusKmh || 105) / 3.6);

    // Respect red signals
    if (ctx.sigDist < 90) {
      tgtSpd = Math.min(tgtSpd, ctx.sigDist < 8.5 ? 0 : Math.sqrt(2 * 2.1 * Math.max(0, ctx.sigDist - 8.5)));
    }
    // Pull in smoothly for active stopping bus halt if doors aren't already handling
    if (ctx.haltStopDist !== undefined && ctx.haltStopDist < 85) {
      tgtSpd = Math.min(tgtSpd, ctx.haltStopDist < 2.2 ? 0 : Math.sqrt(2 * 1.9 * Math.max(0, ctx.haltStopDist - 1.5)));
    }
    if (ctx.doorsOpen) tgtSpd = 0;

    // Traffic gap management & smart lane overtake bias
    let wantOvt = false;
    let aiHorn = false;
    const lDist = ctx.leadDist !== undefined ? ctx.leadDist : 150;
    const safeGap = 10 + brkEarly * 14 + ctx.speed * 0.45;

    if (lDist < safeGap && ctx.sigDist > 60 && !ctx.doorsOpen) {
      const lSpd = ctx.leadSpd !== undefined ? ctx.leadSpd : tgtSpd;
      if (ctx.canOvertake && lSpd < tgtSpd - 2.2 && paceRatio > 0.88 && lDist < 42) {
        wantOvt = true;
      } else {
        const allowGap = Math.max(0, lDist - 6.5);
        tgtSpd = Math.min(tgtSpd, lSpd * 0.92 + Math.sqrt(2 * 2.3 * allowGap));
        if (lDist < 18 && hornProb > 0.28 && ctx.speed > 4) aiHorn = true;
      }
    }

    // Desired lateral offset: pull gently to passing lane when overtaking, otherwise own lane (or kerb bay when stopping)
    let laneTarget = ctx.laneHome || 6.0;
    if (wantOvt) laneTarget = ctx.lanePass !== undefined ? ctx.lanePass : (laneTarget * 0.48);
    else if (ctx.haltStopDist !== undefined && ctx.haltStopDist < 55) laneTarget += (ctx.haltBayBias || 1.6);

    const aimPt = ctx.aimPointAt ? ctx.aimPointAt(clamp(13 + ctx.speed * 0.72, 13, 36), laneTarget) : null;
    let steerCmd = 0;
    if (aimPt) {
      const wantH = Math.atan2(aimPt.x - ctx.px, aimPt.z - ctx.pz);
      const errH = wrapAngle(wantH - ctx.heading);
      steerCmd = clamp(errH * 1.35, -1, 1);
    }

    const diff = tgtSpd - ctx.speed;
    let thr = false, brake = false, hb = false, retarder = false;
    if (tgtSpd <= 0.4 && ctx.speed < 2.2) {
      brake = true;
      if (ctx.speed < 0.5) hb = true;
    } else if (diff > 0.35 + (1 - thrAggr) * 0.5) {
      thr = true;
    } else if (diff < -(1.4 - brkEarly * 0.7)) {
      brake = true;
      retarder = ctx.speed > 10;
    } else if (diff < -0.7 && ctx.grade < -0.025) {
      retarder = true;
    }

    lastPred = [paceRatio, thrAggr, brkEarly, hornProb];
    return {
      thr, brake, hb, retarder, steerCmd, horn: aiHorn, wantOvt,
      blinkL: wantOvt && (ctx.isLHT !== false ? false : true),
      blinkR: wantOvt && (ctx.isLHT !== false ? true : false),
      targetKmh: Math.round(tgtSpd * 3.6)
    };
  }

  function getSummary() {
    const p = st.stats;
    let archetype = '🧠 Learning Your Style...';
    if (st.samples >= 60) {
      if (p.avgPaceRatio >= 1.12 && p.avgHornRate >= 0.25) archetype = '⚡ Musou Highway Interceptor';
      else if (p.avgPaceRatio >= 1.04 && p.avgThrAggr >= 0.65) archetype = '🔥 Express Fast-Liner';
      else if (p.avgCurveCaution >= 0.68 && p.avgBrkEarly >= 0.65) archetype = '🛡️ Defensive Precision Master';
      else archetype = '🌿 Balanced Intercity Captain';
    } else if (st.samples > 0) {
      archetype = '🎓 Calibrating (' + st.samples + '/60 samples)';
    } else {
      archetype = '🧭 Base Neural Prior (Ready)';
    }

    return {
      archetype,
      samples: st.samples,
      driveMin: +(st.driveSec / 60).toFixed(1),
      lossEma: +st.lossEma.toFixed(4),
      lossHist: st.lossHist.slice(),
      autopilotOn,
      rivalAdaptOn,
      traits: {
        pacePct: Math.round(clamp((p.avgPaceRatio - 0.55) / 0.80, 0, 1) * 100),
        throttlePct: Math.round(p.avgThrAggr * 100),
        brakePct: Math.round(p.avgBrkEarly * 100),
        cautionPct: Math.round(p.avgCurveCaution * 100),
        wetPct: Math.round(clamp(p.avgWetDrop / 0.45, 0, 1) * 100),
        hornPct: Math.round(clamp(p.avgHornRate * 2.5, 0, 1) * 100)
      },
      rivalPaceMul: clamp(0.88 + (p.avgPaceRatio - 0.85) * 0.55, 0.85, 1.28),
      rivalAggrBias: clamp(p.avgThrAggr * 0.6 + p.avgHornRate * 0.5, 0.15, 0.95)
    };
  }

  global.DRIVER_AI = {
    observe,
    computeAutopilot,
    getSummary,
    isAutopilot: () => autopilotOn,
    setAutopilot: (v) => { autopilotOn = !!v; return autopilotOn; },
    toggleAutopilot: () => { autopilotOn = !autopilotOn; return autopilotOn; },
    isRivalAdapt: () => rivalAdaptOn,
    setRivalAdapt: (v) => { rivalAdaptOn = !!v; return rivalAdaptOn; },
    resetModel: () => { st = createInitialState(); saveState(); return getSummary(); },
    exportJSON: () => JSON.stringify({ model: 'WorldBus3-DriverAI', summary: getSummary(), weights: st }, null, 2),
    save: saveState
  };
})(window);
