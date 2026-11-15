/* ==========================================================================
   WORLD BUS SIMULATOR 3.0 — GITHUB-HOSTED REPOSITORY DATABASE ENGINE
   Uses GitHub (repository JSON files + GitHub REST API + GitHub PRs/Issues)
   as the serverless database and primary host—zero local backend required.
   ========================================================================== */
(function (global) {
  'use strict';

  const DEFAULT_OWNER = 'RaidenShogun-AI';
  const DEFAULT_REPO = 'ceylon-bus-simulator';
  const DEFAULT_BRANCH = 'main';
  const ISSUE_CACHE_KEY = 'wbs_gh_issues_v1';
  const ISSUE_TTL_MS = 5 * 60 * 1000;

  function detectRepo() {
    let owner = DEFAULT_OWNER;
    let repo = DEFAULT_REPO;
    try {
      const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
      const parts = location.pathname.split('/').filter(Boolean);
      if (m && parts.length >= 1) {
        owner = m[1].toLowerCase() === DEFAULT_OWNER.toLowerCase() ? DEFAULT_OWNER : m[1];
        repo = parts[0].toLowerCase() === DEFAULT_REPO.toLowerCase() ? DEFAULT_REPO : parts[0];
      }
    } catch (e) {}
    return { owner, repo, branch: DEFAULT_BRANCH };
  }

  const REPO = detectRepo();
  const RAW_BASE = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.branch}`;
  const API_BASE = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;
  const HTML_BASE = `https://github.com/${REPO.owner}/${REPO.repo}`;

  const state = {
    loaded: false,
    source: 'repo-static',
    routes: [],
    leaders: [],
    hallOfFame: [],
    fleet: [],
    activeChallenge: null,
    lastSync: 0,
    repoSlug: `${REPO.owner}/${REPO.repo}`
  };

  async function fetchJsonWithFallback(relPath) {
    const clean = relPath.replace(/^\.?\//, '');
    try {
      const r = await fetch('./' + clean, { cache: 'no-cache' });
      if (r.ok) return await r.json();
    } catch (e) {}
    try {
      const r2 = await fetch(`${RAW_BASE}/${clean}`, { cache: 'no-cache' });
      if (r2.ok) return await r2.json();
    } catch (e) {}
    return null;
  }

  async function fetchGitHubIssuesCached() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(ISSUE_CACHE_KEY) || 'null');
      if (raw && (Date.now() - raw.at) < ISSUE_TTL_MS && Array.isArray(raw.items)) {
        return raw.items;
      }
    } catch (e) {}
    try {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 3500) : null;
      const r = await fetch(`${API_BASE}/issues?state=all&per_page=20`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: ctrl ? ctrl.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (!r.ok) return [];
      const items = await r.json();
      if (Array.isArray(items)) {
        try {
          sessionStorage.setItem(ISSUE_CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
        } catch (e) {}
        return items;
      }
    } catch (e) {}
    return [];
  }

  function parseIssueRecord(issue) {
    if (!issue || !issue.body) return null;
    try {
      const m = issue.body.match(/```json\s*([\s\S]*?)```/i);
      if (!m) return null;
      const obj = JSON.parse(m[1]);
      if (obj && obj.nick && Number(obj.money || obj.score) > 0) {
        return {
          id: 'gh_issue_' + issue.number,
          nick: String(obj.nick).slice(0, 18),
          money: Math.round(Number(obj.money || obj.score) || 0),
          best: Math.round(Number(obj.best || obj.score || obj.money) || 0),
          pax: Number(obj.pax) | 0,
          trips: Math.max(1, Number(obj.trips) | 0),
          route: String(obj.route || ''),
          country: String(obj.country || 'WORLD'),
          ach: Array.isArray(obj.ach) ? obj.ach : ['route'],
          verified: (issue.labels || []).some(l => /approved|verified/i.test(l.name || ''))
        };
      }
    } catch (e) {}
    return null;
  }

  async function loadAll() {
    const [routesDoc, hofDoc, fleetDoc] = await Promise.all([
      fetchJsonWithFallback('data/world-routes.json'),
      fetchJsonWithFallback('data/hall-of-fame.json'),
      fetchJsonWithFallback('data/fleet.json')
    ]);

    if (routesDoc && Array.isArray(routesDoc.routes)) {
      state.routes = routesDoc.routes;
      if (global.ROUTES_ENGINE && typeof global.ROUTES_ENGINE.registerRoutesBatch === 'function') {
        global.ROUTES_ENGINE.registerRoutesBatch(state.routes);
      }
    }
    if (hofDoc) {
      state.leaders = Array.isArray(hofDoc.leaders) ? hofDoc.leaders : [];
      state.hallOfFame = Array.isArray(hofDoc.hallOfFame) ? hofDoc.hallOfFame : [];
      state.activeChallenge = hofDoc.activeChallenge || null;
    }
    if (fleetDoc && Array.isArray(fleetDoc.fleet)) {
      state.fleet = fleetDoc.fleet;
    }

    // Mark repository DB ready immediately after loading static /data/*.json files
    state.loaded = true;
    state.lastSync = Date.now();
    state.source = 'github-db';
    try {
      global.dispatchEvent(new CustomEvent('github-db-ready', { detail: state }));
    } catch (e) {}

    // Non-blocking optional live GitHub REST API sync (community records submitted via Issues/PRs)
    fetchGitHubIssuesCached().then(issues => {
      const issueRows = issues.map(parseIssueRecord).filter(Boolean);
      if (!issueRows.length) return;
      const byNick = new Map();
      state.leaders.concat(issueRows).forEach(r => {
        const key = (r.nick || '').toLowerCase();
        const prev = byKeyGet(byNick, key);
        if (!prev || r.money > prev.money) byNick.set(key, r);
      });
      state.leaders = Array.from(byNick.values()).sort((a, b) => b.money - a.money);
      state.lastSync = Date.now();
      try {
        global.dispatchEvent(new CustomEvent('github-db-ready', { detail: state }));
      } catch (e) {}
    }).catch(() => {});

    return state;
  }

  function byKeyGet(map, k) {
    return map.get(k);
  }

  function buildRecordIssueUrl(entry) {
    const payload = {
      nick: String(entry.nick || 'Driver').slice(0, 18),
      route: String(entry.route || ''),
      bus: String(entry.bus || ''),
      score: Math.round(Number(entry.score) || 0),
      money: Math.round(Number(entry.money || entry.score) || 0),
      pax: Number(entry.pax) | 0,
      trips: Math.max(1, Number(entry.trips) | 0),
      km: Number((entry.km || 0).toFixed(1)),
      submittedAt: new Date().toISOString()
    };
    const title = `[Record] ${payload.nick} · ${payload.route || 'World Route'} · ${payload.score} pts`;
    const body = [
      '### 🏆 Verified World Bus Simulator Trip Telemetry',
      'Submitted directly from GitHub Pages client (`https://' + REPO.owner.toLowerCase() + '.github.io/' + REPO.repo + '/`).',
      '',
      '```json',
      JSON.stringify(payload, null, 2),
      '```'
    ].join('\n');
    return `${HTML_BASE}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }

  function buildRouteSubmissionUrl(routeObj) {
    const title = `[World Route] ${routeObj.name || routeObj.shortName || 'New Global Corridor'}`;
    const cleanRoute = Object.assign({}, routeObj, {
      id: (routeObj.id || 'community_route').replace(/[^a-z0-9_]/gi, '_')
    });
    const body = [
      '### 🌍 Community World Bus Corridor Submission',
      'Paste / add this route object into `data/world-routes.json` via Pull Request (trusted PRs auto-merge via CI).',
      '',
      '```json',
      JSON.stringify(cleanRoute, null, 2),
      '```'
    ].join('\n');
    return `${HTML_BASE}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }

  global.GITHUB_DB = {
    repo: REPO,
    state,
    loadAll,
    buildRecordIssueUrl,
    buildRouteSubmissionUrl,
    getRepoUrl: () => HTML_BASE,
    getDatabaseUrl: () => `${HTML_BASE}/tree/${REPO.branch}/data`,
    getPrUrl: () => `${HTML_BASE}/edit/${REPO.branch}/data/world-routes.json`
  };
})(window);
