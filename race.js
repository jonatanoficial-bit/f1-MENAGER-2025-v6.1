// ==========================================================
// F1 MANAGER 2025 — RACE.JS (SVG + HUD + GRID + CONTROLES)
// Etapa 1: corrigir HUD/GRID + logo + piloto 2 (robusto)
// - Mantém compatibilidade com o seu race.html atual (IDs)
// - Usa grid salvo da Qualy (localStorage f1m2025_last_qualy)
// - Fallback se PilotMarketSystem ou assets faltarem
// ==========================================================

(() => {
  'use strict';

  // ------------------------------
  // CONFIG
  // ------------------------------
  const TRACK_BASE_LAP_TIME_MS = {
    australia: 80000,
    bahrain: 91000,
    jeddah: 88000,
    imola: 76000,
    monaco: 72000,
    canada: 77000,
    spain: 78000,
    austria: 65000,
    silverstone: 83000,
    hungary: 77000,
    spa: 115000,
    zandvoort: 74000,
    monza: 78000,
    singapore: 100000,
    suzuka: 82000,
    qatar: 87000,
    austin: 89000,
    mexico: 77000,
    brazil: 70000,
    abu_dhabi: 84000
  };

  const DEFAULT_TOTAL_LAPS = 15; // pode ajustar depois
  const PATH_SAMPLES = 420;

  // ------------------------------
  // HELPERS
  // ------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function safeText(el, txt) {
    if (el) el.textContent = txt;
  }

  function safeSetImg(img, src, fallback) {
    if (!img) return;
    img.onerror = null;
    img.src = src || '';
    img.onerror = () => {
      img.onerror = null;
      if (fallback) img.src = fallback;
    };
  }

  function formatTemp(n) {
    if (!isFinite(n)) return '--';
    return `${Math.round(n)}°C`;
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeJSON(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {}
  }

  function getQuery() {
    return new URLSearchParams(location.search);
  }

  // ------------------------------
  // DOM (IDs do seu race.html)
  // ------------------------------
  const dom = {
    teamLogoTop: null,
    gpTitle: null,
    lapLabel: null,
    weatherLabel: null,
    trackTempLabel: null,
    trackContainer: null,
    driversList: null,
    userCards: [],
    speedBtns: []
  };

  function mapDOM() {
    dom.teamLogoTop = document.getElementById('teamLogoTop');
    dom.gpTitle = document.getElementById('gp-title');
    dom.lapLabel = document.getElementById('race-lap-label');
    dom.weatherLabel = document.getElementById('weather-label');
    dom.trackTempLabel = document.getElementById('tracktemp-label');
    dom.trackContainer = document.getElementById('track-container');
    dom.driversList = document.getElementById('drivers-list');

    dom.userCards = [
      document.getElementById('user-driver-card-0'),
      document.getElementById('user-driver-card-1')
    ].filter(Boolean);

    dom.speedBtns = Array.from(document.querySelectorAll('.speed-btn'));
  }

  // ------------------------------
  // PILOTS / RUNTIME LIST
  // ------------------------------
  const FALLBACK_DRIVERS = [
    { id: 'VER', code: 'VER', name: 'Max Verstappen', teamKey: 'redbull', teamName: 'Red Bull Racing', rating: 98, color: '#ffb300', logo: 'assets/logos/redbull.png' },
    { id: 'PER', code: 'PER', name: 'Sergio Pérez', teamKey: 'redbull', teamName: 'Red Bull Racing', rating: 94, color: '#ffb300', logo: 'assets/logos/redbull.png' },
    { id: 'LEC', code: 'LEC', name: 'Charles Leclerc', teamKey: 'ferrari', teamName: 'Ferrari', rating: 95, color: '#ff0000', logo: 'assets/logos/ferrari.png' },
    { id: 'SAI', code: 'SAI', name: 'Carlos Sainz', teamKey: 'ferrari', teamName: 'Ferrari', rating: 93, color: '#ff0000', logo: 'assets/logos/ferrari.png' },
    { id: 'HAM', code: 'HAM', name: 'Lewis Hamilton', teamKey: 'mercedes', teamName: 'Mercedes', rating: 95, color: '#00e5ff', logo: 'assets/logos/mercedes.png' },
    { id: 'RUS', code: 'RUS', name: 'George Russell', teamKey: 'mercedes', teamName: 'Mercedes', rating: 93, color: '#00e5ff', logo: 'assets/logos/mercedes.png' },
    { id: 'NOR', code: 'NOR', name: 'Lando Norris', teamKey: 'mclaren', teamName: 'McLaren', rating: 94, color: '#ff8c1a', logo: 'assets/logos/mclaren.png' },
    { id: 'PIA', code: 'PIA', name: 'Oscar Piastri', teamKey: 'mclaren', teamName: 'McLaren', rating: 92, color: '#ff8c1a', logo: 'assets/logos/mclaren.png' },
    { id: 'ALO', code: 'ALO', name: 'Fernando Alonso', teamKey: 'aston', teamName: 'Aston Martin', rating: 94, color: '#00b894', logo: 'assets/logos/aston.png' },
    { id: 'STR', code: 'STR', name: 'Lance Stroll', teamKey: 'aston', teamName: 'Aston Martin', rating: 88, color: '#00b894', logo: 'assets/logos/aston.png' },
    { id: 'GAS', code: 'GAS', name: 'Pierre Gasly', teamKey: 'alpine', teamName: 'Alpine', rating: 90, color: '#4c6fff', logo: 'assets/logos/alpine.png' },
    { id: 'OCO', code: 'OCO', name: 'Esteban Ocon', teamKey: 'alpine', teamName: 'Alpine', rating: 90, color: '#4c6fff', logo: 'assets/logos/alpine.png' },
    { id: 'TSU', code: 'TSU', name: 'Yuki Tsunoda', teamKey: 'racingbulls', teamName: 'Racing Bulls', rating: 89, color: '#7f00ff', logo: 'assets/logos/racingbulls.png' },
    { id: 'LAW', code: 'LAW', name: 'Liam Lawson', teamKey: 'racingbulls', teamName: 'Racing Bulls', rating: 88, color: '#7f00ff', logo: 'assets/logos/racingbulls.png' },
    { id: 'HUL', code: 'HUL', name: 'Nico Hülkenberg', teamKey: 'haas', teamName: 'Haas', rating: 89, color: '#ffffff', logo: 'assets/logos/haas.png' },
    { id: 'MAG', code: 'MAG', name: 'Kevin Magnussen', teamKey: 'haas', teamName: 'Haas', rating: 87, color: '#ffffff', logo: 'assets/logos/haas.png' },
    { id: 'ALB', code: 'ALB', name: 'Alex Albon', teamKey: 'williams', teamName: 'Williams Racing', rating: 89, color: '#0984e3', logo: 'assets/logos/williams.png' },
    { id: 'SAR', code: 'SAR', name: 'Logan Sargeant', teamKey: 'williams', teamName: 'Williams Racing', rating: 86, color: '#0984e3', logo: 'assets/logos/williams.png' },
    { id: 'BOR', code: 'BOR', name: 'Gabriel Bortoleto', teamKey: 'sauber', teamName: 'Sauber / Audi', rating: 88, color: '#00cec9', logo: 'assets/logos/sauber.png' },
    { id: 'RIC', code: 'RIC', name: 'Daniel Ricciardo', teamKey: 'free', teamName: 'Free Agent', rating: 86, color: '#cccccc', logo: 'assets/logos/free.png' }
  ];

  function getRuntimeDriversList() {
    const fallback = FALLBACK_DRIVERS.slice();

    try {
      if (typeof window.PilotMarketSystem === 'undefined') return fallback;

      if (typeof window.PilotMarketSystem.init === 'function') window.PilotMarketSystem.init();

      const teams = (typeof window.PilotMarketSystem.getTeams === 'function')
        ? window.PilotMarketSystem.getTeams()
        : null;

      if (!teams || !teams.length) return fallback;

      const byCode = {};
      fallback.forEach(d => { if (d && d.code) byCode[String(d.code).toUpperCase()] = d; });

      const list = [];
      teams.forEach(teamKey => {
        const active = window.PilotMarketSystem.getActiveDriversForTeam(teamKey) || [];
        active.forEach(p => {
          const code = String(p.code || p.id || '').toUpperCase();
          if (!code) return;

          const preset = byCode[code];

          list.push({
            id: String(p.id || code),
            code,
            name: String(p.name || preset?.name || code),
            teamKey: String(p.teamKey || preset?.teamKey || teamKey || 'free'),
            teamName: String(p.teamName || preset?.teamName || teamKey || 'Team'),
            rating: Number(p.rating || preset?.rating || 75),
            color: String(p.color || preset?.color || '#ffffff'),
            logo: String(p.logo || preset?.logo || `assets/logos/${String(p.teamKey || teamKey)}.png`)
          });
        });
      });

      if (!list.length) return fallback;
      return list;
    } catch (e) {
      console.warn('PilotMarketSystem indisponível na corrida. Usando fallback.', e);
      return fallback;
    }
  }

  function perfMultiplierByCode(code) {
    try {
      if (typeof window.PilotMarketSystem === 'undefined') return 1;
      if (typeof window.PilotMarketSystem.getPilot !== 'function') return 1;
      const p = window.PilotMarketSystem.getPilot(String(code || '').toUpperCase());
      if (!p) return 1;

      const rating = clamp(Number(p.rating || 75), 40, 99);
      const form = clamp(Number(p.form || 55), 0, 100);

      const ratingMul = 1 + ((rating - 92) * 0.0025);
      const formMul = 1 + ((form - 55) * 0.0012);
      return clamp(ratingMul * formMul, 0.90, 1.08);
    } catch {
      return 1;
    }
  }

  // ------------------------------
  // STATE
  // ------------------------------
  const state = {
    track: 'australia',
    gp: 'GP 2025',
    userTeam: 'ferrari',
    baseLapMs: 90000,
    totalLaps: DEFAULT_TOTAL_LAPS,

    weather: 'Seco',
    trackTemp: 26,

    pathPoints: [],
    visuals: [],

    running: true,
    speedMultiplier: 1,
    lastFrame: null,

    lapNumber: 1,

    drivers: [] // runtime state
  };

  // ------------------------------
  // TRACK SVG → pathPoints
  // ------------------------------
  function getPositionOnTrack(progress) {
    const pts = state.pathPoints;
    if (!pts.length) return { x: 0, y: 0 };

    const total = pts.length;
    const idxFloat = progress * total;
    let i0 = Math.floor(idxFloat);
    let i1 = (i0 + 1) % total;
    const t = idxFloat - i0;

    if (i0 >= total) i0 = total - 1;
    if (i1 >= total) i1 = 0;

    const p0 = pts[i0];
    const p1 = pts[i1];

    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    };
  }

  async function loadTrackSvg(trackKey) {
    if (!dom.trackContainer) return;
    dom.trackContainer.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'track-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 1000 600');
    dom.trackContainer.appendChild(svg);

    let text;
    try {
      const resp = await fetch(`assets/tracks/${trackKey}.svg`, { cache: 'no-store' });
      text = await resp.text();
    } catch (e) {
      console.error('Erro carregando SVG da pista:', e);
      return;
    }

    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');

    // tenta path, depois polyline, depois polygon
    let pathEl = doc.querySelector('path');
    let polyEl = doc.querySelector('polyline, polygon');

    let ptsRaw = [];

    try {
      if (pathEl && typeof pathEl.getTotalLength === 'function') {
        const len = pathEl.getTotalLength();
        for (let i = 0; i < PATH_SAMPLES; i++) {
          const p = pathEl.getPointAtLength((len * i) / PATH_SAMPLES);
          ptsRaw.push({ x: p.x, y: p.y });
        }
      } else if (polyEl) {
        const pointsAttr = polyEl.getAttribute('points') || '';
        ptsRaw = pointsAttr
          .trim()
          .split(/\s+/)
          .map(pair => pair.split(',').map(Number))
          .filter(a => a.length === 2 && isFinite(a[0]) && isFinite(a[1]))
          .map(([x, y]) => ({ x, y }));
      }
    } catch (e) {
      console.error('Falha ao extrair pontos do SVG:', e);
    }

    if (!ptsRaw.length) {
      console.error('Nenhum path/polyline válido encontrado no SVG da pista.');
      return;
    }

    // normaliza para 1000x600
    const xs = ptsRaw.map(p => p.x);
    const ys = ptsRaw.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = (maxX - minX) || 1;
    const h = (maxY - minY) || 1;

    state.pathPoints = ptsRaw.map(p => ({
      x: ((p.x - minX) / w) * 1000,
      y: ((p.y - minY) / h) * 600
    }));

    // desenha pista
    const trackLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    trackLine.setAttribute('points', state.pathPoints.map(p => `${p.x},${p.y}`).join(' '));
    trackLine.setAttribute('fill', 'none');
    trackLine.setAttribute('stroke', '#555');
    trackLine.setAttribute('stroke-width', '18');
    trackLine.setAttribute('stroke-linecap', 'round');
    trackLine.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(trackLine);

    const innerLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    innerLine.setAttribute('points', state.pathPoints.map(p => `${p.x},${p.y}`).join(' '));
    innerLine.setAttribute('fill', 'none');
    innerLine.setAttribute('stroke', '#aaaaaa');
    innerLine.setAttribute('stroke-width', '6');
    innerLine.setAttribute('stroke-linecap', 'round');
    innerLine.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(innerLine);

    // bolinhas brancas (traçado)
    state.pathPoints.forEach(p => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
      c.setAttribute('r', 2.5);
      c.setAttribute('fill', '#ffffff');
      svg.appendChild(c);
    });

    // bandeira
    const flagPoint = state.pathPoints[0];
    const flag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    flag.setAttribute('x', flagPoint.x);
    flag.setAttribute('y', flagPoint.y - 10);
    flag.setAttribute('fill', '#ffffff');
    flag.setAttribute('font-size', '18');
    flag.setAttribute('text-anchor', 'middle');
    flag.textContent = '🏁';
    svg.appendChild(flag);

    // cria carros (visuais)
    state.visuals = state.drivers.map(d => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      body.setAttribute('r', 6);
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1.5');
      body.setAttribute('fill', d.color || '#ffffff');
      g.appendChild(body);

      if (String(d.teamKey).toLowerCase() === String(state.userTeam).toLowerCase()) {
        const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tri.setAttribute('points', '0,-10 6,0 -6,0');
        tri.setAttribute('fill', d.color || '#ffffff');
        g.appendChild(tri);
      }

      svg.appendChild(g);
      return { id: d.id, g };
    });
  }

  // ------------------------------
  // GRID (usa Qualy se existir)
  // ------------------------------
  function buildStartingGrid(runtimeDrivers) {
    const qualy = readJSON('f1m2025_last_qualy');

    // se existir grid salvo e bater com pista, usa ele
    if (qualy && Array.isArray(qualy.grid) && qualy.track && String(qualy.track) === String(state.track)) {
      const byId = new Map();
      runtimeDrivers.forEach(d => byId.set(String(d.id), d));
      runtimeDrivers.forEach(d => byId.set(String(d.code), d)); // fallback por code

      const ordered = [];
      qualy.grid
        .slice()
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .forEach(item => {
          const hit = byId.get(String(item.id)) || byId.get(String(item.code || ''));
          if (hit) ordered.push(hit);
        });

      // completa se faltar gente
      runtimeDrivers.forEach(d => {
        if (!ordered.find(x => String(x.id) === String(d.id))) ordered.push(d);
      });

      return ordered.slice(0, 20);
    }

    // sem qualy: retorna ordem por rating (desc) com ruído leve
    return runtimeDrivers
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) + (Math.random() - 0.5) * 2)
      .slice(0, 20);
  }

  // ------------------------------
  // INIT DRIVERS STATE
  // ------------------------------
  function initDrivers() {
    const runtime = getRuntimeDriversList();
    const grid = buildStartingGrid(runtime);

    state.drivers = grid.map((drv, idx) => {
      const ratingCenter = 92;
      const ratingDelta = (drv.rating || 75) - ratingCenter;
      const skillFactor = 1 - ratingDelta * 0.006; // maior rating = menor tempo

      const perf = perfMultiplierByCode(drv.code || drv.id);
      const targetLapMs = state.baseLapMs * clamp(skillFactor, 0.75, 1.35) / perf;

      return {
        ...drv,
        index: idx,

        // corrida
        progress: (idx * 0.02) % 1, // espaça no grid
        laps: 0,

        // ritmo
        speedBase: 1 / targetLapMs, // volta por ms (1x)
        speedVar: 0,

        // estado simples
        tyre: 'M',          // M = médio (placeholder etapa 1)
        ers: 50,
        engineMode: 'M2',   // placeholder etapa 1
        aggr: 'A2',         // placeholder etapa 1

        // pit
        requestPit: false,
        inPit: false,
        pitMsLeft: 0
      };
    });
  }

  // ------------------------------
  // TOP LOGO + USER CARDS
  // ------------------------------
  function applyTopTeamBranding() {
    const teamKey = String(state.userTeam || 'ferrari').toLowerCase();

    // tenta achar um piloto do userTeam
    const any = state.drivers.find(d => String(d.teamKey).toLowerCase() === teamKey) || state.drivers[0];

    const logoSrc = (any && any.logo) ? any.logo : `assets/logos/${teamKey}.png`;
    safeSetImg(dom.teamLogoTop, logoSrc, `assets/logos/${teamKey}.png`);
  }

  function fillUserCards() {
    const teamKey = String(state.userTeam).toLowerCase();
    let teamDrivers = state.drivers.filter(d => String(d.teamKey).toLowerCase() === teamKey);

    // garante 2 pilotos para não quebrar o HUD (se o mercado vier errado)
    if (teamDrivers.length < 2) {
      const fill = state.drivers.filter(d => !teamDrivers.includes(d)).slice(0, 2 - teamDrivers.length);
      teamDrivers = teamDrivers.concat(fill);
    }
    teamDrivers = teamDrivers.slice(0, 2);

    teamDrivers.forEach((drv, i) => {
      const card = dom.userCards[i];
      if (!card) return;

      const nameEl = card.querySelector('.user-name');
      const teamEl = card.querySelector('.user-team');
      const faceEl = card.querySelector('.user-face');
      const logoEl = card.querySelector('.user-logo');

      safeText(nameEl, drv?.name || `Piloto ${i + 1}`);
      safeText(teamEl, drv?.teamName || '');

      const faceSrc = drv?.code ? `assets/faces/${drv.code}.png` : 'assets/faces/default.png';
      safeSetImg(faceEl, faceSrc, 'assets/faces/default.png');

      const teamLogo = drv?.logo || `assets/logos/${String(drv?.teamKey || teamKey)}.png`;
      safeSetImg(logoEl, teamLogo, `assets/logos/${String(drv?.teamKey || teamKey)}.png`);

      // liga botões PIT do card (se existirem)
      const pitBtn = card.querySelector('.btn-pit, .pit-btn, [data-action=\"pit\"]');
      if (pitBtn) {
        pitBtn.onclick = () => {
          // request pit para esse piloto
          const target = state.drivers.find(x => String(x.id) === String(drv.id));
          if (target) target.requestPit = true;
        };
      }
    });
  }

  // ------------------------------
  // SPEED CONTROLS
  // ------------------------------
  function setupSpeedControls() {
    if (!dom.speedBtns.length) return;

    dom.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.speed || '1') || 1;
        state.speedMultiplier = clamp(v, 0.25, 8);

        dom.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ------------------------------
  // LOOP
  // ------------------------------
  function loop(ts) {
    if (state.lastFrame == null) state.lastFrame = ts;

    const dt = (ts - state.lastFrame) * state.speedMultiplier;
    state.lastFrame = ts;

    if (state.running) {
      update(dt);
      render();
    }

    requestAnimationFrame(loop);
  }

  // ------------------------------
  // UPDATE SIM
  // ------------------------------
  function update(dtMs) {
    if (!state.pathPoints.length) return;

    // atualiza carros
    for (const d of state.drivers) {
      // PIT LOGIC (simples etapa 1)
      if (d.requestPit && !d.inPit) {
        d.requestPit = false;
        d.inPit = true;
        d.pitMsLeft = 6000 + Math.random() * 2500; // 6.0s a 8.5s
      }

      if (d.inPit) {
        d.pitMsLeft -= dtMs;
        // enquanto no pit, anda bem devagar
        const slow = d.speedBase * 0.12;
        d.progress += slow * dtMs;

        if (d.pitMsLeft <= 0) {
          d.inPit = false;
          d.pitMsLeft = 0;

          // troca pneu (placeholder simples)
          d.tyre = (d.tyre === 'M') ? 'H' : 'M';
        }
      } else {
        // ruído leve de ritmo
        const noise = 1 + (Math.random() - 0.5) * 0.06; // +/- 3%
        const speed = d.speedBase * noise;
        d.progress += speed * dtMs;
      }

      // completou volta
      while (d.progress >= 1) {
        d.progress -= 1;
        d.laps += 1;
      }
    }

    // volta atual = líder
    const leader = getLeader();
    const leaderLap = leader ? leader.laps : 0;
    state.lapNumber = clamp(leaderLap + 1, 1, state.totalLaps);
    safeText(dom.lapLabel, `Volta ${state.lapNumber}`);

    // fim de corrida (etapa 1: encerra quando líder termina)
    if (leader && leader.laps >= state.totalLaps) {
      state.running = false;
      // salva resultado simples
      const ordered = getOrderByRace();
      writeJSON('f1m2025_last_race', {
        track: state.track,
        gp: state.gp,
        timestamp: Date.now(),
        results: ordered.map((d, i) => ({
          position: i + 1,
          id: d.id,
          code: d.code,
          name: d.name,
          teamKey: d.teamKey,
          teamName: d.teamName,
          laps: d.laps
        }))
      });
    }
  }

  // ------------------------------
  // ORDER / GAP
  // ------------------------------
  function getOrderByRace() {
    return state.drivers
      .slice()
      .sort((a, b) => {
        // distância total (voltas + progresso)
        const da = a.laps + a.progress;
        const db = b.laps + b.progress;
        if (db !== da) return db - da;
        // desempate por rating
        return (b.rating || 0) - (a.rating || 0);
      });
  }

  function getLeader() {
    const ordered = getOrderByRace();
    return ordered[0] || null;
  }

  // ------------------------------
  // RENDER (SVG + LIST)
  // ------------------------------
  function render() {
    if (!state.pathPoints.length) return;
    if (!state.visuals.length) return;

    // carros no SVG
    const byId = new Map(state.drivers.map(d => [String(d.id), d]));

    state.visuals.forEach(v => {
      const d = byId.get(String(v.id));
      if (!d) return;
      const pos = getPositionOnTrack(d.progress);
      v.g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    });

    // lista grid
    renderDriversList();
  }

  function renderDriversList() {
    if (!dom.driversList) return;

    const ordered = getOrderByRace();
    const leader = ordered[0] || null;
    const leaderDist = leader ? (leader.laps + leader.progress) : 0;

    dom.driversList.innerHTML = '';

    ordered.forEach((d, idx) => {
      const row = document.createElement('div');
      row.className = 'driver-row';

      const pos = document.createElement('div');
      pos.className = 'driver-pos';
      pos.textContent = `${idx + 1}`;

      const info = document.createElement('div');
      info.className = 'driver-info';

      const face = document.createElement('img');
      face.className = 'driver-face';
      safeSetImg(face, `assets/faces/${d.code}.png`, 'assets/faces/default.png');
      face.alt = d.name;

      const text = document.createElement('div');
      text.className = 'driver-text';

      const nm = document.createElement('div');
      nm.className = 'driver-name';
      nm.textContent = d.name || d.code || 'Piloto';

      const tm = document.createElement('div');
      tm.className = 'driver-team';
      tm.textContent = d.teamName || d.teamKey || '';

      text.appendChild(nm);
      text.appendChild(tm);

      info.appendChild(face);
      info.appendChild(text);

      const stats = document.createElement('div');
      stats.className = 'driver-stats';

      const dist = (d.laps + d.progress);
      const gap = leader ? (leaderDist - dist) : 0;
      const gapSec = Math.max(0, gap) * (state.baseLapMs / 1000); // aproximação

      stats.innerHTML = `
        <div class="stat-line">Voltas <span>${d.laps}</span></div>
        <div class="stat-line">Gap <span>${idx === 0 ? 'LEADER' : `+${gapSec.toFixed(3)}`}</span></div>
        <div class="stat-line">Pneu <span>${d.tyre}${d.inPit ? ' (PIT)' : ''}</span></div>
      `;

      row.appendChild(pos);
      row.appendChild(info);
      row.appendChild(stats);

      if (String(d.teamKey).toLowerCase() === String(state.userTeam).toLowerCase()) {
        row.classList.add('user-team-row');
      }

      dom.driversList.appendChild(row);
    });
  }

  // ------------------------------
  // INIT
  // ------------------------------
  async function init() {
    mapDOM();

    const q = getQuery();
    state.track = q.get('track') || 'australia';
    state.gp = q.get('gp') || 'GP da Austrália 2025';
    state.userTeam = q.get('userTeam') || localStorage.getItem('f1m2025_user_team') || 'ferrari';
    state.baseLapMs = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;

    // UI topo
    safeText(dom.gpTitle, state.gp);
    safeText(dom.weatherLabel, state.weather);
    safeText(dom.trackTempLabel, formatTemp(state.trackTemp));
    safeText(dom.lapLabel, `Volta ${state.lapNumber}`);

    setupSpeedControls();
    initDrivers();

    // aplica branding/driver cards antes e depois (pra evitar “sumir”)
    applyTopTeamBranding();
    fillUserCards();

    await loadTrackSvg(state.track);

    // reaplica (garante que visual não quebrou e piloto2 sempre aparece)
    applyTopTeamBranding();
    fillUserCards();

    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);

  // ------------------------------
  // EXPORTS (compat)
  // ------------------------------
  window.setRaceSpeed = function setRaceSpeed(mult) {
    state.speedMultiplier = clamp(Number(mult || 1), 0.25, 8);
  };

  // Se seu HTML chama setQualySpeed por engano
  window.setQualySpeed = window.setRaceSpeed;

})();
