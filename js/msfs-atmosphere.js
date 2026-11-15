/* ==========================================================================
   CEYLON BUS SIMULATOR 3.0 — MSFS ATMOSPHERIC SKY, CLOUDS & WEATHER ENGINE
   Features:
     - Physical Rayleigh / Mie Atmospheric Scattering Sky Shader
     - Real Solar Arc + Shadow Frustum Tracking across arbitrary 230km world
     - Procedural Starfield + Tropical Moon + Sunset Horizon Glow
     - Drifting Multi-Layer Cumulus & Monsoon Clouds
     - Tropical Thunderstorm Lightning Flash + WebAudio Thunder Crackle
   ========================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function createSkySystem(scene, sun, hemi) {
    const uniforms = {
      uSunDir: { value: new THREE.Vector3(0.4, 0.75, 0.45).normalize() },
      uZenith: { value: new THREE.Color(0x1f5ec9) },
      uHorizon: { value: new THREE.Color(0xbeddf6) },
      uNight: { value: 0.0 },
      uCloud: { value: 0.2 },
      uLightning: { value: 0.0 },
      uTime: { value: 0.0 }
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms,
      vertexShader: [
        'varying vec3 vDir;',
        'void main(){',
        '  vDir = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uSunDir;',
        'uniform vec3 uZenith;',
        'uniform vec3 uHorizon;',
        'uniform float uNight;',
        'uniform float uCloud;',
        'uniform float uLightning;',
        'uniform float uTime;',
        'varying vec3 vDir;',
        'float hash3(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
        'float vnoise2(vec2 p){',
        '  vec2 i=floor(p), f=fract(p);',
        '  vec2 u=f*f*(3.0-2.0*f);',
        '  float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);',
        '  float b=fract(sin(dot(i+vec2(1.0,0.0),vec2(127.1,311.7)))*43758.5453);',
        '  float c=fract(sin(dot(i+vec2(0.0,1.0),vec2(127.1,311.7)))*43758.5453);',
        '  float d=fract(sin(dot(i+vec2(1.0,1.0),vec2(127.1,311.7)))*43758.5453);',
        '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);',
        '}',
        'float fbmSky(vec2 p){',
        '  float s=0.0, a=0.5;',
        '  for(int i=0;i<4;i++){ s+=a*vnoise2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }',
        '  return s;',
        '}',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float h = clamp(d.y, 0.0001, 1.0);',
        '  // Multi-stage Rayleigh scattering gradient (horizon haze -> cobalt zenith)',
        '  vec3 col = mix(uHorizon, uZenith, pow(h, 0.46));',
        '  if(d.y < 0.0) col = mix(uHorizon * 0.78, uHorizon * 0.42, clamp(-d.y * 3.0, 0.0, 1.0));',
        '  float sunDot = clamp(dot(d, normalize(uSunDir)), 0.0001, 1.0);',
        '  // Wide Mie aureole + bright solar corona + crisp sun disc',
        '  float halo = pow(sunDot, 5.0) * 0.18 + pow(sunDot, 18.0) * (0.42 - 0.25 * uCloud);',
        '  float disc = smoothstep(0.9991, 0.99978, sunDot) * (1.0 - uCloud * 0.85);',
        '  vec3 sunTint = mix(vec3(1.0, 0.54, 0.20), vec3(1.0, 0.97, 0.90), clamp(uSunDir.y * 2.1, 0.0, 1.0));',
        '  col += sunTint * (halo + disc * 3.2) * (1.0 - uNight * 0.92);',
        '  // Procedural high-altitude MSFS FBM sky cloud layer with sunlit rim',
        '  if(d.y > 0.015){',
        '    vec2 uv = d.xz / (d.y + 0.14);',
        '    float cov = fbmSky(uv * 0.85 + vec2(uTime * 0.004, -uTime * 0.002));',
        '    float wisps = fbmSky(uv * 2.1 - vec2(uTime * 0.007, uTime * 0.003));',
        '    float density = smoothstep(0.56 - uCloud * 0.28, 0.84 - uCloud * 0.18, cov * 0.72 + wisps * 0.28);',
        '    float horizonFade = smoothstep(0.015, 0.16, d.y);',
        '    vec3 cloudLit = mix(vec3(0.97, 0.98, 1.0), sunTint * 1.08, pow(sunDot, 3.0) * 0.65);',
        '    vec3 cloudShadow = mix(vec3(0.58, 0.66, 0.76), uHorizon * 0.88, 0.45);',
        '    cloudLit = mix(cloudLit, cloudShadow * 0.35, uNight);',
        '    vec3 cCol = mix(cloudShadow, cloudLit, clamp(0.45 + sunDot * 0.55 - wisps * 0.25, 0.0, 1.0));',
        '    col = mix(col, cCol, density * horizonFade * clamp(0.42 + uCloud * 0.55, 0.3, 0.92));',
        '  }',
        '  // Sunset / Sunrise warm atmospheric band near horizon toward sun azimuth',
        '  float duskBand = exp(-abs(d.y) * 8.5) * pow(sunDot, 1.9) * (1.0 - abs(uSunDir.y));',
        '  col += vec3(1.0, 0.44, 0.16) * duskBand * 0.95 * (1.0 - uNight);',
        '  // Night stars & cool moonlight corona',
        '  if(uNight > 0.05 && d.y > 0.02){',
        '    vec3 cell = floor(d * 310.0);',
        '    float st = hash3(cell);',
        '    if(st > 0.996){',
        '      float tw = 0.6 + 0.4 * sin(uTime * 3.2 + st * 95.0);',
        '      col += vec3(0.88, 0.93, 1.0) * uNight * (1.0 - uCloud * 0.85) * tw * 1.55;',
        '    }',
        '    vec3 moonDir = normalize(vec3(-uSunDir.x, abs(uSunDir.y) + 0.38, -uSunDir.z));',
        '    float md = clamp(dot(d, moonDir), 0.0001, 1.0);',
        '    float moonDisc = smoothstep(0.9991, 0.9995, md);',
        '    col += vec3(0.75, 0.86, 1.0) * (pow(md, 14.0) * 0.16 + pow(md, 48.0) * 0.32 + moonDisc * 1.7) * uNight * (1.0 - uCloud * 0.7);',
        '  }',
        '  // Thunderstorm sheet lightning flash',
        '  col += vec3(0.75, 0.85, 1.0) * uLightning * 0.95;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });

    const sky = new THREE.Mesh(new THREE.SphereGeometry(7600, 36, 24), skyMat);
    scene.add(sky);

    // Volumetric-style drifting multi-lobe 3D cumulus & monsoon cloud deck
    const cloudGroup = new THREE.Group();
    sky.add(cloudGroup);
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256;
    cloudCanvas.height = 256;
    const cg = cloudCanvas.getContext('2d');
    const lobes = [
      [128, 128, 72, 0.85], [82, 138, 52, 0.75], [174, 136, 54, 0.75],
      [104, 102, 50, 0.82], [152, 106, 48, 0.80], [128, 152, 62, 0.60]
    ];
    lobes.forEach(([cx, cy, rad, al]) => {
      const cGrad = cg.createRadialGradient(cx, cy - rad * 0.15, rad * 0.1, cx, cy, rad);
      cGrad.addColorStop(0, `rgba(255,255,255,${al})`);
      cGrad.addColorStop(0.55, `rgba(236,243,252,${(al * 0.62).toFixed(2)})`);
      cGrad.addColorStop(1, 'rgba(220,230,245,0.0)');
      cg.fillStyle = cGrad;
      cg.beginPath();
      cg.arc(cx, cy, rad, 0, TAU);
      cg.fill();
    });
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);
    const cloudMat = new THREE.SpriteMaterial({
      map: cloudTex,
      fog: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.68,
      color: 0xffffff
    });

    const clouds = [];
    for (let i = 0; i < 84; i++) {
      const sp = new THREE.Sprite(cloudMat);
      const ang = (i / 84) * TAU + (i % 7) * 0.11;
      const dist = 1350 + ((i * 419) % 3600);
      const baseX = Math.cos(ang) * dist;
      const baseZ = Math.sin(ang) * dist;
      const baseY = 380 + ((i * 197) % 620);
      sp.position.set(baseX, baseY, baseZ);
      sp.scale.set(680 + (i % 7) * 140, 210 + (i % 4) * 52, 1);
      cloudGroup.add(sp);
      clouds.push({ sp, baseX, baseZ, speed: 5 + (i % 6) * 2.2 });
    }

    let nextLightning = 12;
    let lightningVal = 0;

    function triggerThunderSound(audioCtx, masterGain) {
      if (!audioCtx || audioCtx.state !== 'running') return;
      try {
        const now = audioCtx.currentTime;
        const dur = 2.4;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.pow(1 - i / data.length, 1.8) * (0.5 + 0.5 * Math.sin(i * 0.002));
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(160, now);
        filt.frequency.exponentialRampToValueAtTime(45, now + dur);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        src.connect(filt);
        filt.connect(gain);
        gain.connect(masterGain || audioCtx.destination);
        src.start(now);
      } catch (e) {}
    }

    function update(dt, state) {
      const {
        clockHours,
        busX,
        busY,
        busZ,
        rain,
        fog,
        cloudCover,
        lightsOn,
        simT,
        audioCtx,
        masterGain
      } = state;

      uniforms.uTime.value = simT || 0;
      sky.position.set(busX || 0, busY || 0, busZ || 0);

      // Compute realistic solar arc from 24h Sri Lankan time (sunrise ~06:00, zenith ~12:15, sunset ~18:15)
      const hr = ((clockHours % 24) + 24) % 24;
      const sunAngle = ((hr - 6.0) / 12.25) * PI; // 0 at 06:00 sunrise, PI/2 at 12:07, PI at 18:15 sunset
      const sunY = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle) * 0.85;
      const sunZ = 0.42;

      const sDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
      uniforms.uSunDir.value.copy(sDir);

      // Smooth twilight / night blend
      const nightFactor = clamp((0.12 - sunY) / 0.34, 0, 1);
      const goldenFactor = clamp(1 - Math.abs(sunY - 0.08) / 0.25, 0, 1) * (1 - nightFactor);
      uniforms.uNight.value = nightFactor;
      uniforms.uCloud.value = clamp(cloudCover || 0.2, 0, 1);

      // Monsoon thunderstorm lightning during heavy rain
      if (rain > 0.62) {
        nextLightning -= dt;
        if (nextLightning <= 0) {
          lightningVal = 1.0;
          nextLightning = 7 + Math.random() * 14;
          setTimeout(() => triggerThunderSound(audioCtx, masterGain), 350 + Math.random() * 600);
        }
      }
      lightningVal = Math.max(0, lightningVal - dt * 3.8);
      uniforms.uLightning.value = lightningVal;

      // Sky Zenith & Horizon Color Harmonies (Tropical Azure -> Amber Dusk -> Deep Tropical Night)
      const cZen = new THREE.Color(0x1f5ec9)
        .lerp(new THREE.Color(0x526175), clamp(rain * 0.85, 0, 0.8))
        .lerp(new THREE.Color(0x060b16), nightFactor);
      const cHor = new THREE.Color(0xc5e1f5)
        .lerp(new THREE.Color(0xff9f59), goldenFactor * 0.72)
        .lerp(new THREE.Color(0x6e7b88), clamp(rain * 0.8, 0, 0.75))
        .lerp(new THREE.Color(0x111a2c), nightFactor);

      uniforms.uZenith.value.copy(cZen);
      uniforms.uHorizon.value.copy(cHor);

      // Sync cloud tint & density
      cloudMat.opacity = clamp(0.45 + (cloudCover || 0.2) * 0.5, 0.2, 0.92) * (1 - nightFactor * 0.55);
      cloudMat.color
        .setHex(0xffffff)
        .lerp(new THREE.Color(0xffb47a), goldenFactor * 0.65)
        .lerp(new THREE.Color(0x667385), clamp(rain * 0.85, 0, 0.8))
        .lerp(new THREE.Color(0x1a263a), nightFactor);

      // Gently drift clouds across the sky dome
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.sp.position.x = ((c.baseX + (simT || 0) * c.speed + 4800) % 9600) - 4800;
      }

      // Position Directional Sun Light & Tight Player Shadow Frustum
      const lightDir = sunY > 0.04 ? sDir : new THREE.Vector3(-sDir.x, Math.max(0.35, Math.abs(sunY)), -sDir.z).normalize();
      if (sun) {
        sun.target.position.set(busX || 0, busY || 0, busZ || 0);
        sun.position.copy(sun.target.position).addScaledVector(lightDir, 130);
        sun.target.updateMatrixWorld();

        const dayStr = Math.max(0.18, 2.35 * (1 - nightFactor * 0.88) * (1 - rain * 0.55));
        sun.intensity = dayStr + lightningVal * 2.2;
        sun.color
          .setHex(0xfff1dc)
          .lerp(new THREE.Color(0xff9b54), goldenFactor * 0.75)
          .lerp(new THREE.Color(0x6e90c9), nightFactor);
      }

      if (hemi) {
        hemi.intensity = clamp(0.68 - nightFactor * 0.42 - rain * 0.15 + lightningVal * 0.6, 0.16, 1.1);
        hemi.color.copy(cHor);
      }

      // Sync atmospheric distance fog
      if (scene.fog) {
        scene.fog.color.copy(cHor);
        const fogScale = Math.max(fog || 0, rain * 0.45) * (lightsOn ? 0.78 : 1.0);
        scene.fog.near = 260 * (1 - fogScale * 0.85);
        scene.fog.far = 4200 * (1 - fogScale * 0.86);
      }

      return {
        isNight: nightFactor > 0.52,
        isDarkOrRain: nightFactor > 0.42 || rain > 0.35 || fog > 0.45,
        sunY: sunY,
        nightFactor: nightFactor
      };
    }

    return { sky, skyMat, cloudGroup, update };
  }

  global.MSFS_ATMOSPHERE = { createSkySystem };
})(window);
