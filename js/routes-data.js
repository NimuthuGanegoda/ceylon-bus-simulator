/**
 * World Bus Simulator 3.0 — Global Routes, OSRM World Generator & Geodesic Engine
 * Authentic GPS waypoints across all continents, Haversine distances,
 * real ASL elevation, OSRM + Nominatim "Drive Anywhere on Earth" generator,
 * scale-locked distance/time physics, and zero-kink Catmull-Rom splines.
 */
(function () {
  'use strict';

  const DEG = Math.PI / 180;
  const EARTH_R = 6371000;
  const CUSTOM_LS_KEY = 'slbus_custom_routes_v1';

  const ZONE_SPECS = {
    town:    { idx: 0, vmax: 11.0, mist: 0.02, pop: 1.00, traf: 4.5, roll: 0.05 },
    paddy:   { idx: 1, vmax: 15.5, mist: 0.04, pop: 0.35, traf: 2.3, roll: 0.25 },
    coconut: { idx: 2, vmax: 14.5, mist: 0.06, pop: 0.55, traf: 2.5, roll: 0.35 },
    lake:    { idx: 3, vmax: 13.0, mist: 0.14, pop: 0.45, traf: 1.6, roll: 0.50 },
    jungle:  { idx: 4, vmax: 12.0, mist: 0.30, pop: 0.12, traf: 0.9, roll: 0.65 },
    hills:   { idx: 5, vmax: 10.5, mist: 0.78, pop: 0.12, traf: 0.7, roll: 0.30 },
    rubber:  { idx: 6, vmax: 12.5, mist: 0.42, pop: 0.55, traf: 1.7, roll: 0.45 },
    village: { idx: 7, vmax: 13.0, mist: 0.18, pop: 0.50, traf: 1.5, roll: 0.35 }
  };

  function haversineKm(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * DEG;
    const dLng = (lng2 - lng1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_R * Math.asin(Math.sqrt(Math.min(1, a))) / 1000;
  }

  function compassBearing(lat1, lng1, lat2, lng2) {
    const y = Math.sin((lng2 - lng1) * DEG) * Math.cos(lat2 * DEG);
    const x = Math.cos(lat1 * DEG) * Math.sin(lat2 * DEG) -
      Math.sin(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.cos((lng2 - lng1) * DEG);
    return ((Math.atan2(y, x) / DEG) + 360) % 360;
  }

  // Flagship World Routes across Sri Lanka + All Continents
  const ROUTES_CATALOG = {
    r99: {
      id: 'r99', num: '99', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#38bdf8',
      name: 'Colombo (Pettah) → Badulla',
      shortName: 'Colombo – Badulla',
      highway: 'A4 High Level & Uva Highland Highway',
      desc: 'Sri Lanka’s legendary highland express: navigate Pettah traffic, cross Ratnapura plains, climb misty Beragala & Haputale hairpins (1,431 m ASL), and descend into Badulla.',
      realKm: 229.8, realDurationMin: 375, defaultScale: 10,
      targetFareRev: 52000, fareBase: 60, farePerKm: 5.8,
      compulsoryTea: true, roadStyle: 'mixed', defaultBus: 'viking', lanes: 2,
      tags: ['Sri Lanka', '229.8 km', '1,431 m Climb', 'Tea Break'],
      waypoints: [
        { lat: 6.9355, lng: 79.8538, elev: 4,    name: 'Pettah Bus Stand',   sin: 'කොළඹ කොටුව', zone: 'town',    lim: 40, halt: true, term: 'start' },
        { lat: 6.9158, lng: 79.8634, elev: 7,    name: 'Maradana / Borella', zone: 'town',    lim: 40, halt: false },
        { lat: 6.8729, lng: 79.8889, elev: 11,   name: 'Nugegoda',           zone: 'town',    lim: 50, halt: true },
        { lat: 6.8482, lng: 79.9265, elev: 16,   name: 'Maharagama',         zone: 'town',    lim: 50, halt: true },
        { lat: 6.8414, lng: 79.9654, elev: 21,   name: 'Kottawa',            zone: 'town',    lim: 50, halt: true },
        { lat: 6.8439, lng: 80.0029, elev: 26,   name: 'Homagama',           zone: 'town',    lim: 50, halt: true },
        { lat: 6.8902, lng: 80.1045, elev: 24,   name: 'Hanwella Bridge',    zone: 'paddy',   lim: 60, halt: false, bridge: true },
        { lat: 6.9522, lng: 80.2126, elev: 29,   name: 'Avissawella',        zone: 'paddy',   lim: 60, halt: true, timing: true },
        { lat: 6.8485, lng: 80.2682, elev: 38,   name: 'Eheliyagoda',        zone: 'paddy',   lim: 60, halt: true, rest: true },
        { lat: 6.7640, lng: 80.3280, elev: 45,   name: 'Kuruwita',           zone: 'coconut', lim: 55, halt: false, bridge: true },
        { lat: 6.6828, lng: 80.3992, elev: 34,   name: 'Ratnapura',          zone: 'coconut', lim: 50, halt: true, timing: true },
        { lat: 6.6490, lng: 80.5010, elev: 75,   name: 'Lellopitiya',        zone: 'coconut', lim: 50, halt: true },
        { lat: 6.6250, lng: 80.5440, elev: 110,  name: 'Pelmadulla',         zone: 'coconut', lim: 50, halt: true, bridge: true },
        { lat: 6.6481, lng: 80.7042, elev: 436,  name: 'Balangoda',          zone: 'lake',    lim: 50, halt: true, rest: true, timing: true },
        { lat: 6.6890, lng: 80.7610, elev: 520,  name: 'Imbulpe',            zone: 'lake',    lim: 45, halt: true },
        { lat: 6.7091, lng: 80.7852, elev: 590,  name: 'Belihuloya',         zone: 'jungle',  lim: 40, halt: true, bridge: true },
        { lat: 6.7590, lng: 80.9025, elev: 1090, name: 'Beragala',           zone: 'hills',   lim: 35, halt: true },
        { lat: 6.7657, lng: 80.9510, elev: 1431, name: 'Haputale',           zone: 'hills',   lim: 30, halt: true, timing: true },
        { lat: 6.8018, lng: 80.9602, elev: 1245, name: 'Diyatalawa',         zone: 'rubber',  lim: 40, halt: true, rest: true },
        { lat: 6.8329, lng: 80.9860, elev: 1230, name: 'Bandarawela',        zone: 'rubber',  lim: 40, halt: true, timing: true },
        { lat: 6.8685, lng: 81.0315, elev: 1020, name: 'Kumbalwela',         zone: 'village', lim: 45, halt: true },
        { lat: 6.8962, lng: 81.0454, elev: 910,  name: 'Demodara',           zone: 'village', lim: 45, halt: true, bridge: true },
        { lat: 6.9535, lng: 81.0365, elev: 750,  name: 'Hali-Ela',           zone: 'village', lim: 50, halt: true },
        { lat: 6.9934, lng: 81.0550, elev: 680,  name: 'Badulla Bus Stand',  sin: 'බදුල්ල', zone: 'village', lim: 40, halt: true, term: 'end' }
      ]
    },

    r138: {
      id: 'r138', num: '138', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#f59e0b',
      name: 'Colombo Metro Express (Pettah → Homagama)',
      shortName: '138 Metro Busway',
      highway: 'Colombo High Level Metro Corridor',
      desc: 'True 1:1 REAL-TIME urban rapid transit! Dedicated yellow Metro Bus Lanes, Colombo skyline, flyovers, and pneumatic AC doors.',
      realKm: 24.0, realDurationMin: 48, defaultScale: 1,
      targetFareRev: 26000, fareBase: 40, farePerKm: 12.0,
      compulsoryTea: false, roadStyle: 'metro', defaultBus: 'metro', lanes: 4,
      tags: ['Sri Lanka', '1:1 Real-Time', '24.0 km', 'Metro AC'],
      waypoints: [
        { lat: 6.9355, lng: 79.8538, elev: 4,  name: 'Pettah Central Stand', sin: 'පිටකොටුව', zone: 'town', lim: 40, halt: true, term: 'start' },
        { lat: 6.9292, lng: 79.8576, elev: 6,  name: 'Lake House / Fort',    zone: 'town', lim: 45, halt: true },
        { lat: 6.9178, lng: 79.8628, elev: 8,  name: 'Town Hall / Nelum',    zone: 'town', lim: 50, halt: true },
        { lat: 6.9062, lng: 79.8669, elev: 9,  name: 'Public Library / Reid',zone: 'town', lim: 50, halt: false },
        { lat: 6.8942, lng: 79.8698, elev: 10, name: 'Thummulla Junction',   zone: 'town', lim: 50, halt: true, timing: true },
        { lat: 6.8855, lng: 79.8742, elev: 9,  name: 'Havelock Town',        zone: 'town', lim: 50, halt: true },
        { lat: 6.8781, lng: 79.8796, elev: 8,  name: 'Kirulapone Bridge',    zone: 'town', lim: 50, halt: true, bridge: true },
        { lat: 6.8712, lng: 79.8878, elev: 11, name: 'Kohuwala Junction',    zone: 'town', lim: 50, halt: true },
        { lat: 6.8649, lng: 79.8997, elev: 12, name: 'Nugegoda Flyover',     zone: 'town', lim: 50, halt: true, timing: true },
        { lat: 6.8588, lng: 79.9096, elev: 14, name: 'Delkanda Market',      zone: 'town', lim: 50, halt: true },
        { lat: 6.8532, lng: 79.9182, elev: 15, name: 'Nawinna Hospital',     zone: 'town', lim: 50, halt: true },
        { lat: 6.8482, lng: 79.9265, elev: 18, name: 'Maharagama Clock',     zone: 'town', lim: 45, halt: true, timing: true },
        { lat: 6.8471, lng: 79.9412, elev: 19, name: 'Pannipitiya Bridge',   zone: 'town', lim: 55, halt: true, bridge: true },
        { lat: 6.8435, lng: 79.9562, elev: 22, name: 'Makumbura MMC',        zone: 'town', lim: 55, halt: true },
        { lat: 6.8414, lng: 79.9654, elev: 21, name: 'Kottawa Town',         zone: 'town', lim: 50, halt: true, timing: true },
        { lat: 6.8428, lng: 79.9851, elev: 24, name: 'Godagama Highlevel',   zone: 'paddy', lim: 60, halt: true },
        { lat: 6.8439, lng: 80.0029, elev: 26, name: 'Homagama Terminal',    sin: 'හෝමාගම', zone: 'town', lim: 40, halt: true, term: 'end' }
      ]
    },

    r100: {
      id: 'r100', num: '100', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#f59e0b',
      name: 'Colombo Fort → Galle Rd 4-Lane → Panadura',
      shortName: '100 Galle Rd 4-Lane',
      highway: 'A2 Colombo–Panadura 4-Lane Arterial',
      desc: 'Authentic modern Sri Lankan 4-lane urban dual carriageway: drive along Galle Face, Bambalapitiya, Dehiwala, Mt. Lavinia & Moratuwa with painted median curbs, slow-lane tuk-tuks & 1:1 traffic.',
      realKm: 29.7, realDurationMin: 58, defaultScale: 1,
      targetFareRev: 28000, fareBase: 40, farePerKm: 11.5,
      compulsoryTea: false, roadStyle: 'fourlane', defaultBus: 'metro', lanes: 4,
      tags: ['Sri Lanka', '4-Lane Arterial', '29.7 km', '1:1 Real-Time'],
      waypoints: [
        { lat: 6.9344, lng: 79.8428, elev: 4,  name: 'Colombo Fort Terminus', sin: 'කොළඹ කොටුව', zone: 'town', lim: 45, halt: true, term: 'start' },
        { lat: 6.9218, lng: 79.8465, elev: 5,  name: 'Galle Face Green',      zone: 'coconut', lim: 50, halt: true },
        { lat: 6.8938, lng: 79.8552, elev: 6,  name: 'Bambalapitiya Jn',      zone: 'town',    lim: 50, halt: true, timing: true },
        { lat: 6.8745, lng: 79.8598, elev: 7,  name: 'Wellawatte Savoy',      zone: 'town',    lim: 50, halt: true },
        { lat: 6.8515, lng: 79.8639, elev: 8,  name: 'Dehiwala Flyover',      zone: 'town',    lim: 50, halt: true, timing: true },
        { lat: 6.8305, lng: 79.8669, elev: 9,  name: 'Mount Lavinia Jn',      zone: 'coconut', lim: 55, halt: true },
        { lat: 6.8125, lng: 79.8732, elev: 11, name: 'Ratmalana Airport',     zone: 'town',    lim: 60, halt: true },
        { lat: 6.7745, lng: 79.8825, elev: 9,  name: 'Moratuwa Town',         zone: 'town',    lim: 50, halt: true, timing: true },
        { lat: 6.7420, lng: 79.8935, elev: 8,  name: 'Gorakana Bridge',       zone: 'lake',    lim: 60, halt: false, bridge: true },
        { lat: 6.7132, lng: 79.9026, elev: 7,  name: 'Panadura Central Stand',sin: 'පානදුර', zone: 'town', lim: 40, halt: true, term: 'end' }
      ]
    },

    e03: {
      id: 'e03', num: 'E03', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#38bdf8',
      name: 'Colombo Fort → New Kelani Bridge → Katunayake BIA',
      shortName: 'E03 Airport Expy',
      highway: 'E03 Colombo–Katunayake 4-Lane Expressway',
      desc: 'Sri Lanka’s 4-lane Airport Expressway across the Kalyani Golden Gate Cable Bridge, Peliyagoda Hub & Muthurajawela lagoon into Bandaranaike International Airport.',
      realKm: 33.6, realDurationMin: 34, defaultScale: 1,
      targetFareRev: 34000, fareBase: 140, farePerKm: 13.0,
      compulsoryTea: false, roadStyle: 'expressway', defaultBus: 'express', lanes: 4,
      tags: ['Sri Lanka', '4-Lane Expy', '33.6 km', 'BIA Airport'],
      waypoints: [
        { lat: 6.9355, lng: 79.8538, elev: 4,  name: 'Colombo Bastian Mawatha', sin: 'කොටුව බැස්ටියන්', zone: 'town', lim: 50, halt: true, term: 'start' },
        { lat: 6.9548, lng: 79.8780, elev: 14, name: 'New Kelani Cable Bridge', zone: 'town',    lim: 70,  halt: false, bridge: true },
        { lat: 6.9685, lng: 79.8865, elev: 9,  name: 'Peliyagoda E03 Gate',     zone: 'paddy',   lim: 80,  halt: true, timing: true },
        { lat: 7.0185, lng: 79.8835, elev: 6,  name: 'Kerawalapitiya Link',     zone: 'lake',    lim: 100, halt: false },
        { lat: 7.0785, lng: 79.8920, elev: 7,  name: 'Ja-Ela Interchange',      zone: 'coconut', lim: 100, halt: true, timing: true },
        { lat: 7.1365, lng: 79.8895, elev: 9,  name: 'Seeduwa Lagoon Viaduct',  zone: 'paddy',   lim: 100, halt: false, bridge: true },
        { lat: 7.1635, lng: 79.8868, elev: 10, name: 'Katunayake Expy Exit',    zone: 'coconut', lim: 70,  halt: true },
        { lat: 7.1715, lng: 79.8842, elev: 11, name: 'Bandaranaike Airport BIA',sin: 'කටුනායක ගුවන්තොටුපළ', zone: 'town', lim: 40, halt: true, term: 'end' }
      ]
    },

    r01: {
      id: 'r01', num: '01', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#22c55e',
      name: 'Colombo Fort → Kandy (A1 Royal Highway)',
      shortName: 'Colombo – Kandy',
      highway: 'A1 Colombo–Kandy Royal Highway',
      desc: 'Cross the Kelani river bridge through palm plains, Kegalle foothills, and Kadugannawa Rock Pass into Kandy.',
      realKm: 115.6, realDurationMin: 185, defaultScale: 5,
      targetFareRev: 39000, fareBase: 60, farePerKm: 6.8,
      compulsoryTea: true, roadStyle: 'mixed', defaultBus: 'viking', lanes: 2,
      tags: ['Sri Lanka', '115.6 km', 'Kadugannawa Pass', 'Kandy'],
      waypoints: [
        { lat: 6.9344, lng: 79.8428, elev: 4,   name: 'Colombo Fort',       sin: 'කොළඹ කොටුව', zone: 'town',    lim: 40, halt: true, term: 'start' },
        { lat: 6.9532, lng: 79.8825, elev: 6,   name: 'Peliyagoda Bridge',  zone: 'town',    lim: 50, halt: true, bridge: true },
        { lat: 7.0018, lng: 79.9512, elev: 14,  name: 'Kadawatha Expy Gate',zone: 'town',    lim: 55, halt: true },
        { lat: 7.0922, lng: 80.0145, elev: 28,  name: 'Yakkala / Gampaha',  zone: 'coconut', lim: 60, halt: true },
        { lat: 7.1432, lng: 80.0956, elev: 36,  name: 'Nittambuwa',         zone: 'coconut', lim: 55, halt: true, timing: true },
        { lat: 7.2248, lng: 80.1972, elev: 52,  name: 'Warakapola',         zone: 'paddy',   lim: 60, halt: true, rest: true },
        { lat: 7.2485, lng: 80.2685, elev: 85,  name: 'Galigamuwa',         zone: 'rubber',  lim: 55, halt: true },
        { lat: 7.2513, lng: 80.3464, elev: 165, name: 'Kegalle',            zone: 'rubber',  lim: 50, halt: true, timing: true },
        { lat: 7.2528, lng: 80.4468, elev: 235, name: 'Mawanella',          zone: 'rubber',  lim: 50, halt: true, bridge: true },
        { lat: 7.2547, lng: 80.5242, elev: 515, name: 'Kadugannawa Pass',   zone: 'hills',   lim: 35, halt: true, tunnel: true, rest: true },
        { lat: 7.2698, lng: 80.5955, elev: 490, name: 'Peradeniya Bridge',  zone: 'jungle',  lim: 45, halt: true, bridge: true, timing: true },
        { lat: 7.2906, lng: 80.6337, elev: 505, name: 'Kandy Goods Shed',   sin: 'මහනුවර', zone: 'village', lim: 40, halt: true, term: 'end' }
      ]
    },

    e01: {
      id: 'e01', num: 'E01', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#60a5fa',
      name: 'Makumbura MMC → Galle → Matara (Expressway)',
      shortName: 'E01 Southern Expy',
      highway: 'E01 Southern Expressway (4-Lane Divided)',
      desc: '4-lane divided luxury coach expressway with Jersey median barriers, overhead gantries, and 100 km/h cruising.',
      realKm: 126.4, realDurationMin: 88, defaultScale: 5,
      targetFareRev: 48000, fareBase: 160, farePerKm: 8.8,
      compulsoryTea: false, roadStyle: 'expressway', defaultBus: 'express', lanes: 4,
      tags: ['Sri Lanka', '126.4 km', '4-Lane Divided', '100 km/h'],
      waypoints: [
        { lat: 6.8435, lng: 79.9562, elev: 22, name: 'Makumbura MMC Expy',   sin: 'මාකුඹුර', zone: 'town',    lim: 60,  halt: true, term: 'start' },
        { lat: 6.7620, lng: 79.9880, elev: 24, name: 'Kahathuduwa Gate',     zone: 'paddy',   lim: 100, halt: false },
        { lat: 6.6650, lng: 80.0110, elev: 19, name: 'Gelanigama Exit',      zone: 'paddy',   lim: 100, halt: true },
        { lat: 6.5350, lng: 80.0480, elev: 28, name: 'Dodangoda Expy',       zone: 'rubber',  lim: 100, halt: true, timing: true },
        { lat: 6.4090, lng: 80.0950, elev: 32, name: 'Welipenna Service',    zone: 'coconut', lim: 90,  halt: true, rest: true },
        { lat: 6.2780, lng: 80.1550, elev: 25, name: 'Kurundugaha Exit',     zone: 'rubber',  lim: 100, halt: true, timing: true },
        { lat: 6.1350, lng: 80.2280, elev: 16, name: 'Gin River Viaduct',    zone: 'paddy',   lim: 100, halt: false, bridge: true },
        { lat: 6.0642, lng: 80.2498, elev: 14, name: 'Pinnaduwa / Galle',    zone: 'town',    lim: 70,  halt: true, timing: true },
        { lat: 6.0080, lng: 80.4220, elev: 12, name: 'Imaduwa – Kokmaduwa',  zone: 'coconut', lim: 100, halt: true },
        { lat: 5.9690, lng: 80.5290, elev: 8,  name: 'Godagama Gate',        zone: 'town',    lim: 60,  halt: true },
        { lat: 5.9485, lng: 80.5470, elev: 5,  name: 'Matara Expy Terminal', sin: 'මාතර', zone: 'town', lim: 40, halt: true, term: 'end' }
      ]
    },

    r02: {
      id: 'r02', num: '02', region: 'Sri Lanka', country: 'LK', biome: 'tropical',
      trafficSide: 'LHT', currency: 'Rs', tzOffset: 5.5, accentColor: '#2dd4bf',
      name: 'Colombo (Galle Face) → Galle → Matara Coast',
      shortName: 'A2 Galle Coast',
      highway: 'A2 Indian Ocean Coastal Highway',
      desc: 'Follow the palm-fringed shoreline beside Indian Ocean surf past Kalutara, Bentota Lagoon, and Galle Dutch Fort.',
      realKm: 158.0, realDurationMin: 230, defaultScale: 8,
      targetFareRev: 44000, fareBase: 55, farePerKm: 6.4,
      compulsoryTea: true, roadStyle: 'coastal', defaultBus: 'metro', lanes: 2,
      tags: ['Sri Lanka', '158.0 km', 'Indian Ocean', 'Galle Fort'],
      waypoints: [
        { lat: 6.9271, lng: 79.8441, elev: 3,  name: 'Galle Face / Fort',    sin: 'ගාලු මුවදොර', zone: 'town', lim: 40, halt: true, term: 'start' },
        { lat: 6.8302, lng: 79.8632, elev: 4,  name: 'Mount Lavinia Beach',  zone: 'coconut', lim: 50, halt: true },
        { lat: 6.7730, lng: 79.8816, elev: 4,  name: 'Moratuwa Coast',       zone: 'town',    lim: 50, halt: true },
        { lat: 6.7132, lng: 79.9026, elev: 5,  name: 'Panadura',             zone: 'town',    lim: 55, halt: true, bridge: true, timing: true },
        { lat: 6.5854, lng: 79.9607, elev: 6,  name: 'Kalutara Bodhiya',     zone: 'coconut', lim: 50, halt: true, bridge: true },
        { lat: 6.4258, lng: 79.9958, elev: 4,  name: 'Bentota Lagoon',       zone: 'lake',    lim: 55, halt: true, rest: true, timing: true },
        { lat: 6.2395, lng: 80.0548, elev: 5,  name: 'Ambalangoda',          zone: 'coconut', lim: 55, halt: true },
        { lat: 6.1395, lng: 80.1063, elev: 4,  name: 'Hikkaduwa Coral Bay',  zone: 'coconut', lim: 50, halt: true, timing: true },
        { lat: 6.0305, lng: 80.2170, elev: 5,  name: 'Galle Dutch Fort',     zone: 'town',    lim: 45, halt: true, rest: true, timing: true },
        { lat: 5.9735, lng: 80.4295, elev: 6,  name: 'Weligama Bay',         zone: 'coconut', lim: 55, halt: true },
        { lat: 5.9485, lng: 80.5353, elev: 5,  name: 'Matara Bus Stand',     sin: 'මාතර', zone: 'town', lim: 40, halt: true, term: 'end' }
      ]
    },

    uk_11: {
      id: 'uk_11', num: '11', region: 'Europe', country: 'UK', biome: 'temperate',
      trafficSide: 'LHT', currency: '£', tzOffset: 0, accentColor: '#ef4444',
      name: 'London Route 11: Victoria → Westminster → Bank → Liverpool St',
      shortName: 'London Central 11',
      highway: 'Central London Heritage Busway',
      desc: 'Iconic 1:1 REAL-TIME drive across the heart of London: Victoria Station, Westminster Abbey, Big Ben, Trafalgar Square, Fleet Street, and St. Paul’s.',
      realKm: 9.8, realDurationMin: 42, defaultScale: 1,
      targetFareRev: 18000, fareBase: 30, farePerKm: 18.0,
      compulsoryTea: false, roadStyle: 'metro', defaultBus: 'metro', lanes: 4,
      tags: ['Europe · UK', '1:1 Real-Time', '9.8 km', 'Westminster & City'],
      waypoints: [
        { lat: 51.4952, lng: -0.1439, elev: 12, name: 'Victoria Station',    zone: 'town', lim: 32, halt: true, term: 'start' },
        { lat: 51.4995, lng: -0.1273, elev: 8,  name: 'Westminster Abbey',   zone: 'town', lim: 32, halt: true },
        { lat: 51.5034, lng: -0.1266, elev: 9,  name: 'Whitehall Cenotaph',  zone: 'town', lim: 32, halt: false },
        { lat: 51.5080, lng: -0.1281, elev: 15, name: 'Trafalgar Square',    zone: 'town', lim: 32, halt: true, timing: true },
        { lat: 51.5122, lng: -0.1180, elev: 14, name: 'Strand / Aldwych',    zone: 'town', lim: 32, halt: true },
        { lat: 51.5141, lng: -0.1043, elev: 11, name: 'Fleet Street',        zone: 'town', lim: 32, halt: true },
        { lat: 51.5138, lng: -0.0984, elev: 18, name: 'St. Paul’s Cathedral',zone: 'town', lim: 32, halt: true, timing: true },
        { lat: 51.5134, lng: -0.0886, elev: 14, name: 'Bank Junction',       zone: 'town', lim: 32, halt: true },
        { lat: 51.5178, lng: -0.0823, elev: 15, name: 'Liverpool St Hub',    zone: 'town', lim: 30, halt: true, term: 'end' }
      ]
    },

    jp_fuji: {
      id: 'jp_fuji', num: 'FUJI', region: 'Asia', country: 'JP', biome: 'japan',
      trafficSide: 'LHT', currency: '¥', tzOffset: 9, accentColor: '#f472b6',
      name: 'Tokyo Shinjuku → Kawaguchiko → Mt. Fuji 5th Station',
      shortName: 'Tokyo – Mt. Fuji',
      highway: 'Chuo Expressway & Fuji Subaru Line',
      desc: 'Depart Shinjuku Expressway Terminal, glide across Yamanashi valleys, and climb forested volcanic switchbacks to 2,305 m ASL on Mount Fuji.',
      realKm: 114.0, realDurationMin: 145, defaultScale: 5,
      targetFareRev: 46000, fareBase: 100, farePerKm: 7.5,
      compulsoryTea: true, roadStyle: 'mixed', defaultBus: 'express', lanes: 2,
      tags: ['Asia · Japan', '114.0 km', '2,305 m ASL', 'Mt. Fuji Climb'],
      waypoints: [
        { lat: 35.6886, lng: 139.7006, elev: 42,   name: 'Shinjuku Basta Terminal', zone: 'town',    lim: 50, halt: true, term: 'start' },
        { lat: 35.6708, lng: 139.4800, elev: 58,   name: 'Chofu / Fuchu Expy',      zone: 'town',    lim: 80, halt: true },
        { lat: 35.6350, lng: 139.2600, elev: 185,  name: 'Hachioji Junction',       zone: 'village', lim: 80, halt: true, timing: true },
        { lat: 35.6160, lng: 139.1800, elev: 320,  name: 'Sagamiko Lake Pass',      zone: 'lake',    lim: 70, halt: true, bridge: true },
        { lat: 35.6052, lng: 138.9430, elev: 480,  name: 'Otsuki Interchange',      zone: 'jungle',  lim: 70, halt: true, rest: true },
        { lat: 35.5340, lng: 138.8950, elev: 720,  name: 'Tsuru / Oshino',          zone: 'village', lim: 60, halt: true },
        { lat: 35.4983, lng: 138.7686, elev: 855,  name: 'Kawaguchiko Station',     zone: 'lake',    lim: 50, halt: true, rest: true, timing: true },
        { lat: 35.4420, lng: 138.7420, elev: 1420, name: 'Subaru Line Toll Gate',   zone: 'hills',   lim: 40, halt: true },
        { lat: 35.3980, lng: 138.7360, elev: 1920, name: 'Ohiradai Lookout',        zone: 'hills',   lim: 35, halt: true },
        { lat: 35.3955, lng: 138.7330, elev: 2305, name: 'Mt. Fuji 5th Station',    zone: 'hills',   lim: 30, halt: true, term: 'end' }
      ]
    },

    eu_alps: {
      id: 'eu_alps', num: 'E35', region: 'Europe', country: 'CH/IT', biome: 'alpine',
      trafficSide: 'RHT', currency: '€', tzOffset: 1, accentColor: '#93c5fd',
      name: 'Zürich → Gotthard Alpine Pass → Lugano → Milan',
      shortName: 'Zürich – Alps – Milan',
      highway: 'Swiss A2 Gotthard Trans-Alpine Corridor',
      desc: 'Cross turquoise alpine lakes (Lucerne & Lugano), tackle the snow-dusted 2,106 m Gotthard Pass switchbacks, and roll into northern Italy.',
      realKm: 278.0, realDurationMin: 245, defaultScale: 10,
      targetFareRev: 54000, fareBase: 140, farePerKm: 8.2,
      compulsoryTea: true, roadStyle: 'mixed', defaultBus: 'express', lanes: 2,
      tags: ['Europe · Alps', '278.0 km', '2,106 m Pass', 'Trans-Border'],
      waypoints: [
        { lat: 47.3769, lng: 8.5417,  elev: 408,  name: 'Zürich Carparkplatz',   zone: 'town',    lim: 50, halt: true, term: 'start' },
        { lat: 47.0502, lng: 8.3093,  elev: 436,  name: 'Lucerne / Lake Pier',   zone: 'lake',    lim: 70, halt: true, timing: true },
        { lat: 46.8804, lng: 8.6444,  elev: 458,  name: 'Altdorf Uri Valley',    zone: 'village', lim: 80, halt: true },
        { lat: 46.6345, lng: 8.5944,  elev: 1444, name: 'Andermatt Alpine Town', zone: 'hills',   lim: 50, halt: true, rest: true, timing: true },
        { lat: 46.5594, lng: 8.5670,  elev: 2106, name: 'Gotthard Pass Summit',  zone: 'hills',   lim: 40, halt: true },
        { lat: 46.5280, lng: 8.6095,  elev: 1175, name: 'Airolo Ticino',         zone: 'hills',   lim: 60, halt: true },
        { lat: 46.1956, lng: 9.0176,  elev: 230,  name: 'Bellinzona Castles',    zone: 'village', lim: 80, halt: true, timing: true },
        { lat: 46.0037, lng: 8.9511,  elev: 273,  name: 'Lugano Lakefront',      zone: 'lake',    lim: 60, halt: true, rest: true },
        { lat: 45.8081, lng: 9.0852,  elev: 201,  name: 'Como Border Gate',      zone: 'village', lim: 80, halt: true },
        { lat: 45.4859, lng: 9.2043,  elev: 122,  name: 'Milan Centrale Bay',    zone: 'town',    lim: 45, halt: true, term: 'end' }
      ]
    },

    us_ne: {
      id: 'us_ne', num: 'I-95', region: 'Americas', country: 'US', biome: 'temperate',
      trafficSide: 'RHT', currency: '$', tzOffset: -5, accentColor: '#3b82f6',
      name: 'New York Port Authority → I-95 → Boston South',
      shortName: 'NYC – Boston I-95',
      highway: 'I-95 Northeast Corridor Express',
      desc: 'Depart Manhattan, cross Long Island Sound viaducts, power through New England forests & Providence, and arrive in Boston.',
      realKm: 346.0, realDurationMin: 255, defaultScale: 10,
      targetFareRev: 56000, fareBase: 180, farePerKm: 9.0,
      compulsoryTea: true, roadStyle: 'expressway', defaultBus: 'electro', lanes: 4,
      tags: ['Americas · US', '346.0 km', 'I-95 4-Lane', 'High-Speed'],
      waypoints: [
        { lat: 40.7570, lng: -73.9903, elev: 14, name: 'NYC Port Authority',     zone: 'town',    lim: 45,  halt: true, term: 'start' },
        { lat: 40.8517, lng: -73.9527, elev: 65, name: 'George Washington Bridge',zone: 'town',    lim: 80,  halt: false, bridge: true },
        { lat: 41.0534, lng: -73.5387, elev: 12, name: 'Stamford TransCenter',   zone: 'town',    lim: 95,  halt: true },
        { lat: 41.3083, lng: -72.9279, elev: 8,  name: 'New Haven Union',        zone: 'village', lim: 105, halt: true, timing: true },
        { lat: 41.3557, lng: -72.0995, elev: 18, name: 'New London Gold Bridge', zone: 'lake',    lim: 105, halt: true, bridge: true, rest: true },
        { lat: 41.8240, lng: -71.4128, elev: 24, name: 'Providence Terminal',    zone: 'town',    lim: 95,  halt: true, timing: true },
        { lat: 42.3519, lng: -71.0552, elev: 9,  name: 'Boston South Station',   zone: 'town',    lim: 45,  halt: true, term: 'end' }
      ]
    },

    ae_e11: {
      id: 'ae_e11', num: 'E11', region: 'Middle East', country: 'AE', biome: 'desert',
      trafficSide: 'RHT', currency: 'AED', tzOffset: 4, accentColor: '#fbbf24',
      name: 'Dubai (Ibn Battuta) → Sheikh Zayed E11 → Abu Dhabi',
      shortName: 'Dubai – Abu Dhabi E11',
      highway: 'E11 Sheikh Mohammed Bin Rashid Desert Expy',
      desc: 'Ultra-fast desert superhighway between Dubai and Abu Dhabi across shimmering golden sand seas, date palms, and futuristic skyline towers.',
      realKm: 112.0, realDurationMin: 75, defaultScale: 5,
      targetFareRev: 44000, fareBase: 140, farePerKm: 8.5,
      compulsoryTea: false, roadStyle: 'expressway', defaultBus: 'electro', lanes: 4,
      tags: ['Middle East · UAE', '112.0 km', '110 km/h Desert', 'EV Spec'],
      waypoints: [
        { lat: 25.0408, lng: 55.1202, elev: 6,  name: 'Dubai Ibn Battuta Hub', zone: 'town',   lim: 60,  halt: true, term: 'start' },
        { lat: 24.9182, lng: 54.9875, elev: 8,  name: 'Jebel Ali Free Zone',   zone: 'paddy',  lim: 110, halt: true },
        { lat: 24.7820, lng: 54.7850, elev: 14, name: 'Ghantoot Oasis Gate',   zone: 'paddy',   lim: 110, halt: true, rest: true },
        { lat: 24.6480, lng: 54.6350, elev: 11, name: 'Al Samha Desert Expy',  zone: 'coconut',lim: 110, halt: true, timing: true },
        { lat: 24.5320, lng: 54.5110, elev: 9,  name: 'Yas Island Interchange',zone: 'village',lim: 100, halt: true, bridge: true },
        { lat: 24.4709, lng: 54.3773, elev: 7,  name: 'Abu Dhabi Central Stn', zone: 'town',   lim: 45,  halt: true, term: 'end' }
      ]
    },

    za_ch: {
      id: 'za_ch', num: 'CPT', region: 'Africa', country: 'ZA', biome: 'mediterranean',
      trafficSide: 'LHT', currency: 'R', tzOffset: 2, accentColor: '#34d399',
      name: 'Cape Town → Chapman’s Peak Drive → Cape Point',
      shortName: 'Cape Town – Cape Point',
      highway: 'M6 Chapman’s Peak Atlantic Cliff Drive',
      desc: 'One of Earth’s most dramatic cliffside coastal drives: Table Mountain shadow, Camps Bay surf, sheer Atlantic drops, and Cape of Good Hope.',
      realKm: 68.0, realDurationMin: 95, defaultScale: 5,
      targetFareRev: 34000, fareBase: 80, farePerKm: 8.5,
      compulsoryTea: false, roadStyle: 'coastal', defaultBus: 'express', lanes: 2,
      tags: ['Africa · South Africa', '68.0 km', 'Cliff Coast', 'Scenic'],
      waypoints: [
        { lat: -33.9188, lng: 18.4233, elev: 14,  name: 'Cape Town Civic Hub',   zone: 'town',    lim: 45, halt: true, term: 'start' },
        { lat: -33.9508, lng: 18.3775, elev: 22,  name: 'Camps Bay Atlantic',    zone: 'coconut', lim: 55, halt: true },
        { lat: -34.0439, lng: 18.3565, elev: 18,  name: 'Hout Bay Harbour',      zone: 'lake',    lim: 50, halt: true, timing: true },
        { lat: -34.0865, lng: 18.3601, elev: 165, name: 'Chapman’s Peak Cliff',  zone: 'hills',   lim: 40, halt: true, rest: true },
        { lat: -34.1325, lng: 18.3821, elev: 32,  name: 'Noordhoek Dunes',       zone: 'village', lim: 60, halt: true },
        { lat: -34.1945, lng: 18.4310, elev: 16,  name: 'Simon’s Town',          zone: 'coconut', lim: 50, halt: true, timing: true },
        { lat: -34.3568, lng: 18.4960, elev: 85,  name: 'Cape Point Terminal',   zone: 'hills',   lim: 35, halt: true, term: 'end' }
      ]
    },

    br_rio: {
      id: 'br_rio', num: 'BR-101', region: 'Americas', country: 'BR', biome: 'tropical',
      trafficSide: 'RHT', currency: 'R$', tzOffset: -3, accentColor: '#10b981',
      name: 'Rio de Janeiro Copacabana → Costa Verde → Paraty',
      shortName: 'Rio – Costa Verde – Paraty',
      highway: 'BR-101 Rodovia Rio–Santos',
      desc: 'Golden Brazilian beaches, misty Atlantic Mata rainforest peaks, bay viaducts, and colonial Paraty cobbles.',
      realKm: 248.0, realDurationMin: 260, defaultScale: 10,
      targetFareRev: 50000, fareBase: 90, farePerKm: 6.2,
      compulsoryTea: true, roadStyle: 'coastal', defaultBus: 'express', lanes: 2,
      tags: ['Americas · Brazil', '248.0 km', 'Rainforest Coast', 'Scenic'],
      waypoints: [
        { lat: -22.9711, lng: -43.1822, elev: 5,   name: 'Rio Copacabana Bay',  zone: 'town',    lim: 45, halt: true, term: 'start' },
        { lat: -22.9990, lng: -43.3650, elev: 8,   name: 'Barra da Tijuca',     zone: 'town',    lim: 60, halt: true },
        { lat: -22.9245, lng: -43.8810, elev: 18,  name: 'Itaguaí Sepetiba Bay',zone: 'coconut', lim: 70, halt: true, timing: true },
        { lat: -22.9612, lng: -44.0410, elev: 145, name: 'Mangaratiba Lookouts',zone: 'jungle',  lim: 55, halt: true, rest: true },
        { lat: -23.0067, lng: -44.3181, elev: 12,  name: 'Angra dos Reis',      zone: 'lake',    lim: 60, halt: true, bridge: true, timing: true },
        { lat: -23.2178, lng: -44.7131, elev: 9,   name: 'Paraty Historic Bay', zone: 'village', lim: 40, halt: true, term: 'end' }
      ]
    },

    au_gor: {
      id: 'au_gor', num: 'B100', region: 'Oceania', country: 'AU', biome: 'temperate',
      trafficSide: 'LHT', currency: 'A$', tzOffset: 10, accentColor: '#0ea5e9',
      name: 'Melbourne → Great Ocean Road → Twelve Apostles',
      shortName: 'Melbourne – Great Ocean Rd',
      highway: 'B100 Great Ocean Touring Highway',
      desc: 'World-renowned Southern Ocean cliffs: sweep past Geelong bays, Torquay surf beaches, Lorne switchbacks, and Cape Otway.',
      realKm: 243.0, realDurationMin: 245, defaultScale: 10,
      targetFareRev: 51000, fareBase: 110, farePerKm: 6.5,
      compulsoryTea: true, roadStyle: 'coastal', defaultBus: 'express', lanes: 2,
      tags: ['Oceania · Australia', '243.0 km', 'Ocean Cliffs', 'Touring'],
      waypoints: [
        { lat: -37.8183, lng: 144.9525, elev: 12,  name: 'Melbourne Southern Cross', zone: 'town',    lim: 50, halt: true, term: 'start' },
        { lat: -38.1499, lng: 144.3617, elev: 14,  name: 'Geelong Waterfront',       zone: 'town',    lim: 70, halt: true },
        { lat: -38.3326, lng: 144.3257, elev: 22,  name: 'Torquay Surf Beach',       zone: 'coconut', lim: 80, halt: true, timing: true },
        { lat: -38.5416, lng: 143.9756, elev: 45,  name: 'Lorne Coastal Cliffs',     zone: 'hills',   lim: 60, halt: true, rest: true },
        { lat: -38.7580, lng: 143.6710, elev: 18,  name: 'Apollo Bay',               zone: 'lake',    lim: 65, halt: true, timing: true },
        { lat: -38.7650, lng: 143.5110, elev: 160, name: 'Otway Rainforest Ridge',   zone: 'jungle',  lim: 60, halt: true },
        { lat: -38.6621, lng: 143.1051, elev: 36,  name: 'Twelve Apostles Point',    zone: 'village', lim: 45, halt: true, term: 'end' }
      ]
    },

    sg_kl: {
      id: 'sg_kl', num: 'NSE', region: 'Asia', country: 'SG/MY', biome: 'tropical',
      trafficSide: 'LHT', currency: '$', tzOffset: 8, accentColor: '#a855f7',
      name: 'Singapore Marina Bay → Tuas Link → Kuala Lumpur',
      shortName: 'Singapore – Kuala Lumpur',
      highway: 'North–South Expressway (E2)',
      desc: '4-lane cross-border ASEAN international express coach from Marina Bay across the Tuas Causeway through Johor & Melaka to KL Sentral.',
      realKm: 352.0, realDurationMin: 270, defaultScale: 10,
      targetFareRev: 58000, fareBase: 160, farePerKm: 7.4,
      compulsoryTea: true, roadStyle: 'expressway', defaultBus: 'express', lanes: 4,
      tags: ['Asia · SG/MY', '352.0 km', 'Cross-Border Expy', '4-Lane'],
      waypoints: [
        { lat: 1.2834, lng: 103.8607, elev: 6,  name: 'Singapore Marina Bay',  zone: 'town',    lim: 50,  halt: true, term: 'start' },
        { lat: 1.3480, lng: 103.6350, elev: 10, name: 'Tuas Second Link',      zone: 'lake',    lim: 80,  halt: true, bridge: true },
        { lat: 1.5640, lng: 103.6190, elev: 28, name: 'Senai / Johor Expy',    zone: 'coconut', lim: 110, halt: true, timing: true },
        { lat: 2.0460, lng: 102.9310, elev: 42, name: 'Pagoh Service Plaza',   zone: 'rubber',  lim: 110, halt: true, rest: true },
        { lat: 2.2750, lng: 102.2880, elev: 24, name: 'Ayer Keroh Melaka',     zone: 'paddy',   lim: 110, halt: true, timing: true },
        { lat: 2.7297, lng: 101.9381, elev: 52, name: 'Seremban Toll Gate',    zone: 'village', lim: 100, halt: true },
        { lat: 3.1342, lng: 101.6861, elev: 45, name: 'KL Sentral Terminal',   zone: 'town',    lim: 45,  halt: true, term: 'end' }
      ]
    }
  };

  function loadCustomRoutes() {
    try {
      const raw = JSON.parse(localStorage.getItem(CUSTOM_LS_KEY) || '[]');
      if (Array.isArray(raw)) {
        raw.forEach(r => {
          if (r && r.id && Array.isArray(r.waypoints) && r.waypoints.length >= 2) {
            ROUTES_CATALOG[r.id] = r;
          }
        });
      }
    } catch (e) {}
  }

  function saveCustomRoute(routeObj) {
    if (!routeObj || !routeObj.id) return;
    ROUTES_CATALOG[routeObj.id] = routeObj;
    try {
      const existing = JSON.parse(localStorage.getItem(CUSTOM_LS_KEY) || '[]');
      const list = Array.isArray(existing) ? existing.filter(x => x && x.id !== routeObj.id) : [];
      list.unshift(routeObj);
      localStorage.setItem(CUSTOM_LS_KEY, JSON.stringify(list.slice(0, 12)));
    } catch (e) {}
  }

  function registerRoutesBatch(routeArray) {
    if (!Array.isArray(routeArray)) return 0;
    let added = 0;
    routeArray.forEach(r => {
      if (r && r.id && Array.isArray(r.waypoints) && r.waypoints.length >= 2) {
        ROUTES_CATALOG[r.id] = Object.assign({}, ROUTES_CATALOG[r.id] || {}, r);
        added++;
      }
    });
    return added;
  }

  function inferBiome(lat, maxElev) {
    const a = Math.abs(lat);
    if (maxElev > 1500) return 'alpine';
    if (a < 18) return 'tropical';
    if (a >= 18 && a < 30) return 'desert';
    if (a < 42) return 'mediterranean';
    return 'temperate';
  }

  function parseCoordPair(str) {
    const m = String(str || '').trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
    return { lat, lng, label: lat.toFixed(3) + ', ' + lng.toFixed(3) };
  }

  function fetchWithTimeout(url, opts, ms) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch unavailable'));
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 4500) : null;
    return fetch(url, Object.assign({}, opts || {}, { signal: ctrl ? ctrl.signal : undefined }))
      .finally(() => { if (timer) clearTimeout(timer); });
  }

  async function geocodePlace(query) {
    const direct = parseCoordPair(query);
    if (direct) return direct;
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(String(query || '').trim());
    const resp = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 5000);
    if (!resp.ok) throw new Error('Geocoder HTTP ' + resp.status);
    const data = await resp.json();
    if (!data || !data.length) throw new Error('Location not found: ' + query);
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: (data[0].display_name || query).split(',')[0].trim()
    };
  }

  function simplifyGeoCoords(coords, tolDeg) {
    if (!Array.isArray(coords) || coords.length <= 2) return coords || [];
    const keep = new Uint8Array(coords.length);
    keep[0] = 1; keep[coords.length - 1] = 1;
    const stack = [[0, coords.length - 1]];
    while (stack.length) {
      const pair = stack.pop(), i0 = pair[0], i1 = pair[1];
      if (i1 - i0 <= 1) continue;
      const ax = coords[i0][0], ay = coords[i0][1], bx = coords[i1][0], by = coords[i1][1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let maxD = -1, idx = -1;
      for (let i = i0 + 1; i < i1; i++) {
        const px = coords[i][0], py = coords[i][1];
        const t = l2 <= 1e-18 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > tolDeg && idx >= 0) {
        keep[idx] = 1;
        stack.push([i0, idx], [idx, i1]);
      }
    }
    const out = [];
    for (let i = 0; i < coords.length; i++) if (keep[i]) out.push(coords[i]);
    return out;
  }

  async function createGlobalCustomRoute(fromText, toText, opts) {
    const o = opts || {};
    const p1 = o.p1 || await geocodePlace(fromText);
    const p2 = o.p2 || await geocodePlace(toText);

    let coords = null;
    let totalKm = 0;
    let durationMin = 0;
    let usedOsrm = false;

    // Fetch full high-resolution road driving geometry via public OSRM API
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
      const r = await fetchWithTimeout(osrmUrl, null, 6000);
      if (r.ok) {
        const j = await r.json();
        if (j.routes && j.routes[0] && j.routes[0].geometry && j.routes[0].geometry.coordinates.length >= 2) {
          coords = j.routes[0].geometry.coordinates; // [lng, lat]
          totalKm = Math.max(2.0, (j.routes[0].distance || 0) / 1000);
          durationMin = Math.max(8, Math.round((j.routes[0].duration || 0) / 60 * 1.15));
          usedOsrm = true;
        }
      }
    } catch (e) {}

    // Offline / trans-oceanic geodesic fallback
    if (!coords) {
      totalKm = Math.max(3.5, haversineKm(p1.lat, p1.lng, p2.lat, p2.lng) * 1.18);
      durationMin = Math.max(10, Math.round(totalKm / 55 * 60));
      coords = [];
      for (let i = 0; i <= 14; i++) {
        const f = i / 14;
        coords.push([p1.lng + (p2.lng - p1.lng) * f, p1.lat + (p2.lat - p1.lat) * f]);
      }
    }

    // Preserve real highway/street curvature in roadShape (up to ~220 vertices)
    let tol = 0.00012;
    let shapeRaw = simplifyGeoCoords(coords, tol);
    while (shapeRaw.length > 220) { tol *= 1.35; shapeRaw = simplifyGeoCoords(coords, tol); }

    // Subsample evenly into 8..22 navigable waypoints / bus stops
    const targetCount = Math.min(22, Math.max(8, Math.round(totalKm / 15) + 6));
    const sampled = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(coords.length - 1, Math.round(i / (targetCount - 1) * (coords.length - 1)));
      sampled.push({ lng: coords[idx][0], lat: coords[idx][1] });
    }

    // Fetch real-world ASL elevations via Open-Meteo (free CORS API), fallback cleanly
    let elevs = sampled.map((_, i) => Math.round(25 + Math.sin(i / sampled.length * Math.PI) * 60));
    try {
      const lats = sampled.map(p => p.lat.toFixed(4)).join(',');
      const lngs = sampled.map(p => p.lng.toFixed(4)).join(',');
      const er = await fetchWithTimeout(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`, null, 4500);
      if (er.ok) {
        const ej = await er.json();
        if (Array.isArray(ej.elevation) && ej.elevation.length === sampled.length) {
          elevs = ej.elevation.map(v => Math.max(2, Math.round(v || 10)));
        }
      }
    } catch (e) {}

    const roadShape = usedOsrm && shapeRaw.length >= 12 ? shapeRaw.map(c => {
      let bestE = elevs[0], bestD = 1e9;
      for (let i = 0; i < sampled.length; i++) {
        const d = (sampled[i].lat - c[1]) ** 2 + (sampled[i].lng - c[0]) ** 2;
        if (d < bestD) { bestD = d; bestE = elevs[i]; }
      }
      return [Number(c[1].toFixed(5)), Number(c[0].toFixed(5)), bestE];
    }) : undefined;

    const maxElev = Math.max(...elevs);
    const midLat = (p1.lat + p2.lat) / 2;
    const biome = inferBiome(midLat, maxElev);
    const express = totalKm > 60 && o.roadStyle !== 'mixed';
    const defScale = totalKm <= 30 ? 1 : totalKm <= 140 ? 5 : 10;

    const waypoints = sampled.map((pt, idx) => {
      const isStart = idx === 0, isEnd = idx === sampled.length - 1;
      const el = elevs[idx];
      const zone = (isStart || isEnd) ? 'town' : (el > 950 ? 'hills' : express ? 'paddy' : idx % 3 === 1 ? 'village' : 'coconut');
      const lim = isStart || isEnd ? 40 : express ? 95 : el > 800 ? 45 : 60;
      const midLabel = `Sector ${idx} (${pt.lat.toFixed(2)}°, ${pt.lng.toFixed(2)}°)`;
      return {
        lat: pt.lat,
        lng: pt.lng,
        elev: el,
        name: isStart ? (p1.label + ' Terminal') : isEnd ? (p2.label + ' Terminal') : midLabel,
        zone,
        lim,
        halt: isStart || isEnd || idx % 2 === 0,
        timing: idx === Math.floor(sampled.length / 2),
        rest: totalKm > 80 && idx === Math.floor(sampled.length / 2),
        term: isStart ? 'start' : isEnd ? 'end' : undefined
      };
    });

    const id = 'custom_' + Math.random().toString(36).slice(2, 8);
    const routeObj = {
      id,
      isCustom: true,
      source: usedOsrm ? 'OSRM Live' : 'Geodesic 3D',
      num: 'GLB',
      region: 'Custom',
      country: 'WORLD',
      biome,
      trafficSide: 'LHT',
      currency: '$',
      tzOffset: Math.round(((p1.lng + p2.lng) / 2) / 15),
      accentColor: '#38bdf8',
      name: `${p1.label} → ${p2.label}`,
      shortName: `${p1.label} – ${p2.label}`,
      highway: 'Custom Global Highway Corridor',
      desc: `Generated live from OpenStreetMap OSRM driving geometry & global elevation data (${totalKm.toFixed(1)} km · ${maxElev} m peak ASL).`,
      realKm: Number(totalKm.toFixed(1)),
      realDurationMin: durationMin,
      defaultScale: defScale,
      targetFareRev: Math.round(totalKm * 220),
      fareBase: 60,
      farePerKm: 7.2,
      compulsoryTea: totalKm > 100,
      roadStyle: express ? 'expressway' : 'mixed',
      defaultBus: express ? 'express' : 'metro',
      lanes: express ? 4 : 2,
      tags: ['Global Custom', `${totalKm.toFixed(1)} km`, `${maxElev} m Max ASL`, 'OSRM Live'],
      waypoints,
      roadShape
    };

    saveCustomRoute(routeObj);
    return routeObj;
  }

  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [
      0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
      0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
    ];
  }

  function buildRouteGeometry(routeId, customScale) {
    const r = ROUTES_CATALOG[routeId] || ROUTES_CATALOG.r99;
    const parsedScale = Number(customScale);
    const scaleFactor = (Number.isFinite(parsedScale) && parsedScale > 0) ? parsedScale : r.defaultScale;
    const wps = r.waypoints;
    const extShape = (Array.isArray(r.roadShape) && r.roadShape.length >= 12)
      ? r.roadShape
      : (window.ROUTE_PATHS && Array.isArray(window.ROUTE_PATHS[r.id]) && window.ROUTE_PATHS[r.id].length >= 12 ? window.ROUTE_PATHS[r.id] : null);
    const hasRealRoad = !!extShape;

    const wpKm = [0];
    for (let i = 1; i < wps.length; i++) {
      wpKm.push(wpKm[i - 1] + haversineKm(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng));
    }
    const rawGeoKm = Math.max(0.2, wpKm[wpKm.length - 1] || r.realKm);
    const roadMul = hasRealRoad ? 1.0 : (r.realKm / rawGeoKm);

    const lat0 = hasRealRoad ? extShape[0][0] : wps[0].lat;
    const lng0 = hasRealRoad ? extShape[0][1] : wps[0].lng;
    const cosLat = Math.max(0.15, Math.cos(lat0 * DEG));
    const toXZ = (lat, lng) => [
      ((lng - lng0) * cosLat * 111320) / scaleFactor * roadMul,
      ((lat0 - lat) * 111320) / scaleFactor * roadMul
    ];

    const anchors = wps.map((w, idx) => {
      const xz = toXZ(w.lat, w.lng);
      return { x: xz[0], z: xz[1], w, realKm: (wpKm[idx] / rawGeoKm) * r.realKm };
    });

    // Build geometry control nodes from real OSRM road polyline if present, else route waypoints
    const rawNodes = hasRealRoad
      ? extShape.map(pt => {
          const xz = toXZ(pt[0], pt[1]);
          let bestIdx = 0, bestD = 1e18;
          for (let j = 0; j < wps.length; j++) {
            const d = (wps[j].lat - pt[0]) ** 2 + (wps[j].lng - pt[1]) ** 2;
            if (d < bestD) { bestD = d; bestIdx = j; }
          }
          const rw = wps[bestIdx] || wps[0];
          return {
            x: xz[0], z: xz[1],
            w: { lat: pt[0], lng: pt[1], elev: pt[2] !== undefined ? pt[2] : (rw.elev || 10), zone: rw.zone || 'town', lim: rw.lim || 60, name: rw.name }
          };
        })
      : anchors;

    // Shortcut tight self-crossing OSRM cloverleaf / ramp spirals so multi-lane roads never overlap themselves
    if (hasRealRoad && rawNodes.length > 8) {
      let i = 0;
      while (i < rawNodes.length - 4) {
        let arc = 0, spliced = false;
        const maxJ = Math.min(rawNodes.length - 1, i + 28);
        for (let j = i + 1; j <= maxJ; j++) {
          arc += Math.hypot(rawNodes[j].x - rawNodes[j - 1].x, rawNodes[j].z - rawNodes[j - 1].z);
          if (j >= i + 2 && arc > 42) {
            const chord = Math.hypot(rawNodes[j].x - rawNodes[i].x, rawNodes[j].z - rawNodes[i].z);
            if (chord < 25) {
              rawNodes.splice(i + 1, j - i - 1);
              spliced = true;
              break;
            }
          }
        }
        if (!spliced) i++;
      }
    }

    const a0 = rawNodes[0], a1 = rawNodes[Math.min(1, rawNodes.length - 1)];
    const d0 = Math.hypot(a1.x - a0.x, a1.z - a0.z) || 1;
    const t0x = (a1.x - a0.x) / d0, t0z = (a1.z - a0.z) / d0;

    const bN = rawNodes[rawNodes.length - 1], bP = rawNodes[Math.max(0, rawNodes.length - 2)];
    const d1 = Math.hypot(bN.x - bP.x, bN.z - bP.z) || 1;
    const t1x = (bN.x - bP.x) / d1, t1z = (bN.z - bP.z) / d1;

    const leadIn = { x: a0.x - t0x * 360, z: a0.z - t0z * 360, w: Object.assign({}, rawNodes[0].w, { name: (wps[0].name || 'Start') + ' Approach' }) };
    const leadOut = { x: bN.x + t1x * 360, z: bN.z + t1z * 360, w: Object.assign({}, bN.w, { name: (wps[wps.length - 1].name || 'End') + ' Exit' }) };
    const ctrlPts = [leadIn, ...rawNodes, leadOut];

    const dense = [];
    for (let s = 0; s < ctrlPts.length - 1; s++) {
      const p0 = ctrlPts[Math.max(0, s - 1)];
      const p1 = ctrlPts[s];
      const p2 = ctrlPts[s + 1];
      const p3 = ctrlPts[Math.min(ctrlPts.length - 1, s + 2)];
      const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const steps = Math.max(hasRealRoad ? 4 : 16, Math.round(segLen / 5));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const pos = catmullRom([p0.x, p0.z], [p1.x, p1.z], [p2.x, p2.z], [p3.x, p3.z], t);
        const lat = p1.w.lat + (p2.w.lat - p1.w.lat) * t;
        const lng = p1.w.lng + (p2.w.lng - p1.w.lng) * t;
        const elevASL = p1.w.elev + (p2.w.elev - p1.w.elev) * (t * t * (3 - 2 * t));
        const elevFactor = scaleFactor <= 1.2 ? 1.0 : 1 / (scaleFactor * 0.52);
        const elevY = Math.max(1.8, elevASL * elevFactor);
        dense.push({
          x: pos[0], z: pos[1], y: elevY, elevM: elevASL,
          lat, lng,
          lim: t < 0.5 ? p1.w.lim : p2.w.lim,
          zoneName: t < 0.5 ? p1.w.zone : p2.w.zone
        });
      }
    }
    dense.push({
      x: leadOut.x, z: leadOut.z,
      y: Math.max(1.8, leadOut.w.elev * (scaleFactor <= 1.2 ? 1.0 : 1 / (scaleFactor * 0.52))),
      elevM: leadOut.w.elev, lat: leadOut.w.lat, lng: leadOut.w.lng,
      lim: leadOut.w.lim, zoneName: leadOut.w.zone
    });

    if (!hasRealRoad) {
      const rawL = [0];
      for (let i = 1; i < dense.length; i++) rawL.push(rawL[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z));
      const totalRaw = rawL[rawL.length - 1];

      for (let i = 4; i < dense.length - 4; i++) {
        const d = dense[i], prev = dense[i - 3], next = dense[i + 3];
        const dx = next.x - prev.x, dz = next.z - prev.z, len = Math.hypot(dx, dz) || 1;
        const nx = dz / len, nz = -dx / len;
        const arc = rawL[i];
        const endFade = Math.min(1, Math.min(arc, totalRaw - arc) / 480);
        const zoneAmp = d.zoneName === 'hills' ? 32 : d.zoneName === 'jungle' ? 22 : r.roadStyle === 'expressway' ? 12 : d.zoneName === 'town' ? 5 : 15;
        const wl = d.zoneName === 'hills' ? 280 : 520;
        const wave = endFade * zoneAmp * (Math.sin(arc / wl * Math.PI * 2) * 0.65 + Math.sin(arc / (wl * 0.49) * Math.PI * 2 + 1.1) * 0.35);
        d.x += nx * wave;
        d.z += nz * wave;
      }
    }

    const segL = [0];
    for (let i = 1; i < dense.length; i++) segL.push(segL[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z));
    let worldTotal = segL[segL.length - 1];
    const targetPDS = (scaleFactor <= 1.2 && r.realKm > 60) ? 4.0 : 2.5;
    const PLEN = Math.max(400, Math.min(16000, Math.round(worldTotal / targetPDS)));
    let actualPDS = worldTotal / PLEN;

    const PATH = [];
    let k = 1;
    for (let j = 0; j < PLEN; j++) {
      const tgt = j * actualPDS;
      while (k < dense.length - 1 && segL[k] < tgt) k++;
      const a = dense[k - 1], b = dense[k];
      const f = (tgt - segL[k - 1]) / Math.max(1e-6, segL[k] - segL[k - 1]);
      const u = j / PLEN;
      const zName = f < 0.5 ? a.zoneName : b.zoneName;
      const zSpec = ZONE_SPECS[zName] || ZONE_SPECS.town;
      const zw = [0, 0, 0, 0, 0, 0, 0, 0];
      zw[zSpec.idx] = 1;
      PATH.push({
        x: a.x + (b.x - a.x) * f,
        z: a.z + (b.z - a.z) * f,
        y: a.y + (b.y - a.y) * f,
        elevM: a.elevM + (b.elevM - a.elevM) * f,
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
        km: 0,
        lim: f < 0.5 ? a.lim : b.lim,
        zoneName: zName,
        zone: zSpec.idx,
        zw,
        vmax: r.roadStyle === 'expressway' ? Math.max(zSpec.vmax, (f < 0.5 ? a.lim : b.lim) / 3.6 * 0.92) : zSpec.vmax,
        mist: zSpec.mist,
        curv: 0,
        tx: 0, tz: 1, u
      });
    }

    for (let pass = 0; pass < 4; pass++) {
      const ys = PATH.map(p => p.y);
      const rad = 16;
      for (let j = 0; j < PLEN; j++) {
        let s = 0, c = 0;
        for (let m = -rad; m <= rad; m++) { s += ys[Math.max(0, Math.min(PLEN - 1, j + m))]; c++; }
        PATH[j].y = s / c;
      }
    }
    const maxDy = actualPDS * 0.092;
    for (let j = 1; j < PLEN; j++) {
      const dy = PATH[j].y - PATH[j - 1].y;
      if (Math.abs(dy) > maxDy) PATH[j].y = PATH[j - 1].y + Math.sign(dy) * maxDy;
    }

    // Smooth compressed sharp turns and unfold tight hairpin loops so divided lanes never self-fold
    const xzPasses = hasRealRoad ? (scaleFactor > 3 ? 8 : scaleFactor > 1.3 ? 5 : 3) : 2;
    for (let pass = 0; pass < xzPasses; pass++) {
      const xs = PATH.map(p => p.x), zs = PATH.map(p => p.z);
      for (let j = 2; j < PLEN - 2; j++) {
        PATH[j].x = (xs[j - 2] + xs[j - 1] * 2 + xs[j] * 4 + xs[j + 1] * 2 + xs[j + 2]) / 10;
        PATH[j].z = (zs[j - 2] + zs[j - 1] * 2 + zs[j] * 4 + zs[j + 1] * 2 + zs[j + 2]) / 10;
      }
    }

    if (hasRealRoad && PLEN > 30) {
      const minR = r.roadStyle === 'expressway' ? 40 : r.roadStyle === 'metro' ? 28 : 24;
      const minArcIdx = Math.max(12, Math.ceil(32 / actualPDS));
      const maxArcIdx = Math.min(PLEN - 1, Math.ceil(950 / actualPDS));
      const minSep = r.roadStyle === 'expressway' ? 28 : 22;
      for (let pass = 0; pass < 26; pass++) {
        let adjusted = false;
        for (const wSpan of [3, 6]) {
          const xs = PATH.map(p => p.x), zs = PATH.map(p => p.z);
          const maxAng = (2 * wSpan * actualPDS) / minR;
          for (let j = wSpan + 2; j < PLEN - wSpan - 2; j++) {
            const v1x = xs[j] - xs[j - wSpan], v1z = zs[j] - zs[j - wSpan];
            const v2x = xs[j + wSpan] - xs[j], v2z = zs[j + wSpan] - zs[j];
            const ang = Math.atan2(Math.abs(v1x * v2z - v1z * v2x), v1x * v2x + v1z * v2z);
            if (ang > maxAng) {
              const blend = Math.min(0.68, 0.25 + 0.43 * (ang - maxAng) / Math.max(0.15, ang));
              const mx = (xs[j - wSpan] + xs[j + wSpan]) * 0.5;
              const mz = (zs[j - wSpan] + zs[j + wSpan]) * 0.5;
              PATH[j].x += (mx - xs[j]) * blend;
              PATH[j].z += (mz - zs[j]) * blend;
              adjusted = true;
            }
          }
        }
        if (pass < 14) {
          for (let i = 10; i < PLEN - 10; i += 4) {
            for (let j = i + minArcIdx; j < Math.min(PLEN - 10, i + maxArcIdx); j += 4) {
              const dx = PATH[j].x - PATH[i].x, dz = PATH[j].z - PATH[i].z;
              const dist = Math.hypot(dx, dz);
              if (dist < minSep) {
                const push = (minSep - dist) * 0.34;
                const ux = dist > 0.01 ? dx / dist : 0;
                const uz = dist > 0.01 ? dz / dist : 1;
                for (let m = -3; m <= 3; m++) {
                  const wt = 1 - Math.abs(m) * 0.22;
                  PATH[i + m].x -= ux * push * wt; PATH[i + m].z -= uz * push * wt;
                  PATH[j + m].x += ux * push * wt; PATH[j + m].z += uz * push * wt;
                }
                adjusted = true;
              }
            }
          }
        }
        if (!adjusted) break;
      }

      // Re-resample XYZ uniformly along the smoothed centerline so PDS stays constant
      const sArc = [0];
      for (let j = 1; j < PLEN; j++) {
        sArc.push(sArc[j - 1] + Math.hypot(PATH[j].x - PATH[j - 1].x, PATH[j].z - PATH[j - 1].z));
      }
      const newTotal = sArc[PLEN - 1];
      if (newTotal > 100) {
        const newPDS = newTotal / (PLEN - 1);
        const orig = PATH.map(p => ({ x: p.x, z: p.z, y: p.y }));
        let sk = 1;
        for (let j = 0; j < PLEN; j++) {
          const tgt = j * newPDS;
          while (sk < PLEN - 1 && sArc[sk] < tgt) sk++;
          const a = orig[sk - 1], b = orig[sk];
          const f = (tgt - sArc[sk - 1]) / Math.max(1e-6, sArc[sk] - sArc[sk - 1]);
          PATH[j].x = a.x + (b.x - a.x) * f;
          PATH[j].z = a.z + (b.z - a.z) * f;
          PATH[j].y = a.y + (b.y - a.y) * f;
        }
        worldTotal = newTotal;
        actualPDS = newPDS;
      }
    }

    for (let j = 0; j < PLEN; j++) {
      const a = PATH[Math.max(0, j - 3)], b = PATH[Math.min(PLEN - 1, j + 3)];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
      PATH[j].tx = dx / len;
      PATH[j].tz = dz / len;
    }
    for (let j = 4; j < PLEN - 4; j++) {
      const a = PATH[j - 4], b = PATH[j + 4];
      let dh = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz);
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      PATH[j].curv = Math.abs(dh) / (8 * actualPDS);
    }

    const leadSamples = Math.max(20, Math.min(Math.floor(PLEN * 0.16), Math.round(350 / actualPDS)));
    let minSearch = leadSamples;
    const endLimit = PLEN - 1 - leadSamples;
    const landmarks = anchors.map((anc, ai) => {
      const maxEnd = Math.max(minSearch, endLimit - Math.max(0, (anchors.length - 1 - ai) * 8));
      let bestI = minSearch, bestD = 1e18;
      if (ai === 0) bestI = leadSamples;
      else if (ai === anchors.length - 1) bestI = endLimit;
      else {
        for (let j = minSearch; j <= maxEnd; j++) {
          const d = (PATH[j].x - anc.x) ** 2 + (PATH[j].z - anc.z) ** 2;
          if (d < bestD) { bestD = d; bestI = j; }
        }
      }
      minSearch = Math.min(endLimit, bestI + 8);
      return {
        i: bestI,
        u: bestI / PLEN,
        name: anc.w.name,
        sin: anc.w.sin || anc.w.name,
        lat: anc.w.lat,
        lng: anc.w.lng,
        elev: anc.w.elev,
        realKm: anc.realKm,
        zone: anc.w.zone,
        lim: anc.w.lim,
        halt: !!anc.w.halt,
        rest: !!anc.w.rest,
        bridge: !!anc.w.bridge,
        tunnel: !!anc.w.tunnel,
        timing: !!anc.w.timing,
        term: anc.w.term || null
      };
    });

    const startI = Math.max(20, landmarks[0].i);
    const destI = Math.max(startI + 40, landmarks[landmarks.length - 1].i);
    const drivableSamples = Math.max(10, destI - startI);
    const drivableWorldM = drivableSamples * actualPDS;
    const exactKmPerMeter = r.realKm / drivableWorldM;

    for (let j = 0; j < PLEN; j++) {
      PATH[j].km = (j - startI) * actualPDS * exactKmPerMeter;
    }

    let minX = 1e12, maxX = -1e12, minZ = 1e12, maxZ = -1e12;
    for (let j = 0; j < PLEN; j++) {
      const p = PATH[j];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    return {
      route: r,
      scaleFactor,
      exactKmPerWorldKm: r.realKm / (drivableWorldM / 1000),
      PDS: actualPDS,
      PLEN,
      worldTotal,
      drivableWorldM,
      START_I: startI,
      DEST_I: destI,
      bounds: { minX, maxX, minZ, maxZ },
      PATH,
      landmarks,
      ZONE_SPECS
    };
  }

  loadCustomRoutes();

  window.ROUTES_ENGINE = {
    catalog: ROUTES_CATALOG,
    ZONE_SPECS,
    haversineKm,
    compassBearing,
    buildRouteGeometry,
    registerRoutesBatch,
    saveCustomRoute,
    geocodePlace,
    createGlobalCustomRoute
  };
})();
