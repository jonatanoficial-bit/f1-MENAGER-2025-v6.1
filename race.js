// ==========================================================
// F1 MANAGER 2025 — RACE.JS (ETAPA 2)
// Mantém o que já existe (SVG + HUD + GRID) e adiciona:
// - Pit stop real (troca de pneus + tempo + penalidade)
// - Meteorologia (seco/chuva + temp pista dinâmica)
// - Modos: Motor (ECO/NORMAL/ATK) e Pneus (ECO/NORMAL/ATK)
// - Integração com Setup (lê setup salvo no localStorage)
// - Grid da corrida = grid final do Q3 (localStorage f1m2025_last_qualy)
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

  const DEFAULT_TOTAL_LAPS = 18;
  const PATH_SAMPLES = 420;

  // desgaste base por volta (ajustado por clima e modo)
  const TYRE_WEAR_PER_LAP = {
    S: 0.085,
    M: 0.060,
    H: 0.040,
    I: 0.070, // intermediário
    W: 0.060  // wet
  };

  // “desgaste” reduz grip e aumenta tempo
  function wearToGrip(wear01) {
    // 0 = novo, 1 = morto
    // queda suave até 60%, depois cai mais
    const x = Math.max(0, Math.min(1, wear01));
    if (x <= 0.6) return 1 - (x * 0.18);
    return 1 - (0.6 * 0.18) - ((x - 0.6) * 0.55);
  }

  // Aderência por pneu no clima
  function tyreWeatherGripFactor(tyre, weather) {
    if (weather === 'CHUVA') {
      if (tyre === 'W') return 1.04;
      if (tyre === 'I') return 1.02;
      // slick na chuva = ruim
      if (tyre === 'S') return 0.82;
      if (tyre === 'M') return 0.86;
      if (tyre === 'H') return 0.90;
    } else {
      // seco
      if (tyre === 'S') return 1.03;
      if (tyre === 'M') return 1.00;
      if (tyre === 'H') return 0.985;
      if (tyre === 'I') return 0.92;
      if (tyre === 'W') return 0.88;
    }
    return 1.0;
  }

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
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  }

  function getQuery() {
    return new URLSearchParams(location.search);
  }

  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  // ------------------------------
  // DOM (IDs esperados no seu race.html)
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
  // FALLBACK DRIVERS (se mercado não estiver carregado)
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
  // SETUP (integração sem exigir mudanças agora)
  // Aceita várias chaves possíveis
  // ------------------------------
  function readTeamSetup(teamKey) {
    const keysToTry = [
      `f1m2025_setup_${teamKey}`,
      `f1m2025_car_setup_${teamKey}`,
      `f1m2025_setup`,
      `f1m2025_car_setup`,
      `f1m2025_last_setup`
    ];

    for (const k of keysToTry) {
      const s = readJSON(k);
      if (s && typeof s === 'object') return s;
    }

    // default neutro
    return {
      aero: 50,
      suspension: 50,
      engine: 50,
      balance: 50
    };
  }

  // converte setup em multiplicadores
  function setupToMultipliers(setup) {
    const aero = clamp(Number(setup?.aero ?? 50), 0, 100);
    const sus = clamp(Number(setup?.suspension ?? 50), 0, 100);
    const eng = clamp(Number(setup?.engine ?? 50), 0, 100);
    const bal = clamp(Number(setup?.balance ?? 50), 0, 100);

    // simplificado: melhor setup => melhora ritmo e reduz desgaste
    const paceMul =
      1 +
      ((aero - 50) * 0.0008) +
      ((sus - 50) * 0.0005) +
      ((eng - 50) * 0.0009) +
      ((bal - 50) * 0.0004);

    const wearMul =
      1 -
      ((bal - 50) * 0.0008) -
      ((sus - 50) * 0.0005);

    return {
      paceMul: clamp(paceMul, 0.94, 1.06),
      wearMul: clamp(wearMul, 0.88, 1.10)
    };
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

    weather: 'SECO', // 'SECO' | 'CHUVA'
    trackTemp: 26,   // varia

    pathPoints: [],
    visuals: [],

    running: true,
    speedMultiplier: 1,
    lastFrame: null,

    lapNumber: 1,
    lastWeatherTick: 0,

    drivers: []
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

    // pontos brancos
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

    // cria carros
    state.visuals = state.drivers.map(d => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      body.setAttribute('r', 6);
      body.setAttribute('stroke', '#000');
      body.setAttribute('stroke-width', '1.5');
      body.setAttribute('fill', d.color || '#ffffff');
      g.appendChild(body);

      // destaque do time do usuário
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
  // GRID: usa o Q3 final salvo
  // ------------------------------
  function buildStartingGrid(runtimeDrivers) {
    const qualy = readJSON('f1m2025_last_qualy');

    if (qualy && Array.isArray(qualy.grid) && qualy.track && String(qualy.track) === String(state.track)) {
      const byId = new Map();
      runtimeDrivers.forEach(d => byId.set(String(d.id), d));
      runtimeDrivers.forEach(d => byId.set(String(d.code), d));

      const ordered = [];
      qualy.grid
        .slice()
        .sort((a, b) => (a.position || 999) - (b.position || 999))
        .forEach(item => {
          const hit = byId.get(String(item.id)) || byId.get(String(item.code || ''));
          if (hit) ordered.push(hit);
        });

      runtimeDrivers.forEach(d => {
        if (!ordered.find(x => String(x.id) === String(d.id))) ordered.push(d);
      });

      return ordered.slice(0, 20);
    }

    // fallback
    return runtimeDrivers
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) + (Math.random() - 0.5) * 2)
      .slice(0, 20);
  }

  // ------------------------------
  // Meteo: inicial + variação
  // ------------------------------
  function initWeather() {
    // Se treino/quali já tiver salvo clima, você pode padronizar depois.
    // Por enquanto: chance de chuva (15%) em pistas “de chuva” (ex: spa, brazil etc)
    const rainyTracks = new Set(['spa', 'brazil', 'silverstone', 'hungary', 'monza', 'australia']);
    const baseChance = rainyTracks.has(state.track) ? 0.18 : 0.10;
    state.weather = (Math.random() < baseChance) ? 'CHUVA' : 'SECO';

    // temp base
    const baseTemp = 24 + Math.random() * 6;
    state.trackTemp = baseTemp + (state.weather === 'CHUVA' ? -4 : +1);
  }

  function tickWeather(dtMs) {
    state.lastWeatherTick += dtMs;
    if (state.lastWeatherTick < 12000) return; // a cada ~12s
    state.lastWeatherTick = 0;

    // pequena oscilação de temp
    const drift = (Math.random() - 0.5) * 1.6;
    state.trackTemp = clamp(state.trackTemp + drift, 12, 46);

    // chance de virar chuva/secar (baixa)
    const flipChance = (state.weather === 'SECO') ? 0.03 : 0.04;
    if (Math.random() < flipChance) {
      state.weather = (state.weather === 'SECO') ? 'CHUVA' : 'SECO';
      // ajuste brusco de temp
      state.trackTemp += (state.weather === 'CHUVA') ? -3 : +3;
      state.trackTemp = clamp(state.trackTemp, 12, 46);

      // quando muda, pilotos em slick na chuva sofrem mais (simples)
      if (state.weather === 'CHUVA') {
        state.drivers.forEach(d => {
          if (d.tyre === 'S' || d.tyre === 'M' || d.tyre === 'H') d.tempShockMs = 2200 + Math.random() * 1200;
        });
      } else {
        state.drivers.forEach(d => {
          if (d.tyre === 'W' || d.tyre === 'I') d.tempShockMs = 1600 + Math.random() * 900;
        });
      }
    }

    safeText(dom.weatherLabel, state.weather === 'CHUVA' ? 'Chuva' : 'Seco');
    safeText(dom.trackTempLabel, formatTemp(state.trackTemp));
  }

  // ------------------------------
  // INIT DRIVERS
  // ------------------------------
  function initDrivers() {
    const runtime = getRuntimeDriversList();
    const grid = buildStartingGrid(runtime);

    // setup do time do usuário (afeta os 2 pilotos do userTeam)
    const userTeamKey = String(state.userTeam).toLowerCase();
    const setup = readTeamSetup(userTeamKey);
    const setupMul = setupToMultipliers(setup);

    state.drivers = grid.map((drv, idx) => {
      const ratingCenter = 92;
      const ratingDelta = (drv.rating || 75) - ratingCenter;
      const skillFactor = 1 - ratingDelta * 0.006;

      const perf = perfMultiplierByCode(drv.code || drv.id);
      let targetLapMs = state.baseLapMs * clamp(skillFactor, 0.75, 1.35) / perf;

      // aplica setup se for time do usuário
      const isUser = String(drv.teamKey).toLowerCase() === userTeamKey;
      if (isUser) targetLapMs = targetLapMs / setupMul.paceMul;

      // pneus iniciais: seco => M, chuva => I
      const initialTyre = (state.weather === 'CHUVA') ? 'I' : 'M';

      return {
        ...drv,
        index: idx,

        // corrida
        progress: (idx * 0.02) % 1,
        laps: 0,

        // ritmo base
        speedBase: 1 / targetLapMs,

        // estado
        tyre: initialTyre,
        tyreWear: 0.0,      // 0 novo, 1 morto
        tyreMode: 'NORMAL', // ECO | NORMAL | ATK

        engineMode: 'NORMAL', // ECO | NORMAL | ATK
        ers: 50,

        // pit
        requestPit: false,
        pitTargetTyre: null,
        inPit: false,
        pitMsLeft: 0,

        // choque por mudança de clima
        tempShockMs: 0,

        // setup impact no desgaste (apenas userTeam)
        setupWearMul: isUser ? setupMul.wearMul : 1.0
      };
    });
  }

  // ------------------------------
  // TOP LOGO + USER CARDS + BOTÕES
  // ------------------------------
  function applyTopTeamBranding() {
    const teamKey = String(state.userTeam || 'ferrari').toLowerCase();
    const any = state.drivers.find(d => String(d.teamKey).toLowerCase() === teamKey) || state.drivers[0];
    const logoSrc = (any && any.logo) ? any.logo : `assets/logos/${teamKey}.png`;
    safeSetImg(dom.teamLogoTop, logoSrc, `assets/logos/${teamKey}.png`);
  }

  function ensurePitOverlay() {
    if (document.getElementById('pit-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pit-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.display = 'none';
    overlay.style.zIndex = '9999';

    const panel = document.createElement('div');
    panel.id = 'pit-panel';
    panel.style.position = 'absolute';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%,-50%)';
    panel.style.width = 'min(520px, 92vw)';
    panel.style.background = 'rgba(20,25,40,0.96)';
    panel.style.border = '1px solid rgba(255,255,255,0.12)';
    panel.style.borderRadius = '14px';
    panel.style.padding = '14px';
    panel.style.color = '#fff';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <div id="pit-title" style="font-weight:700;font-size:16px;">Pit Stop</div>
          <div id="pit-sub" style="opacity:.8;font-size:12px;margin-top:2px;">Escolha o pneu para a próxima saída</div>
        </div>
        <button id="pit-close" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:10px;padding:6px 10px;">Fechar</button>
      </div>

      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="pit-tyre" data-tyre="S" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;min-width:92px;">S (Macio)</button>
        <button class="pit-tyre" data-tyre="M" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;min-width:92px;">M (Médio)</button>
        <button class="pit-tyre" data-tyre="H" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;min-width:92px;">H (Duro)</button>
        <button class="pit-tyre" data-tyre="I" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;min-width:92px;">I (Inter)</button>
        <button class="pit-tyre" data-tyre="W" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;min-width:92px;">W (Chuva)</button>
      </div>

      <div style="margin-top:12px;opacity:.85;font-size:12px;">
        Clima atual: <span id="pit-weather"></span> • Pista: <span id="pit-temp"></span>
      </div>

      <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:10px;">
        <button id="pit-confirm" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,0.2);background:rgba(50,200,120,0.9);color:#081018;font-weight:700;">Confirmar</button>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hidePitOverlay();
    });

    document.getElementById('pit-close').onclick = hidePitOverlay;
  }

  let pitOverlayTargetDriverId = null;
  let pitOverlaySelectedTyre = null;

  function showPitOverlay(driver) {
    ensurePitOverlay();
    pitOverlayTargetDriverId = driver?.id ?? null;
    pitOverlaySelectedTyre = null;

    const overlay = document.getElementById('pit-overlay');
    const title = document.getElementById('pit-title');
    const w = document.getElementById('pit-weather');
    const t = document.getElementById('pit-temp');

    if (title) title.textContent = `Pit Stop — ${driver?.name || 'Piloto'}`;
    if (w) w.textContent = (state.weather === 'CHUVA') ? 'Chuva' : 'Seco';
    if (t) t.textContent = formatTemp(state.trackTemp);

    overlay.style.display = 'block';

    document.querySelectorAll('.pit-tyre').forEach(btn => {
      btn.style.outline = 'none';
      btn.style.boxShadow = 'none';
      btn.onclick = () => {
        pitOverlaySelectedTyre = btn.dataset.tyre;
        document.querySelectorAll('.pit-tyre').forEach(b => (b.style.boxShadow = 'none'));
        btn.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.35) inset';
      };
    });

    const confirm = document.getElementById('pit-confirm');
    if (confirm) {
      confirm.onclick = () => {
        if (!pitOverlayTargetDriverId || !pitOverlaySelectedTyre) return;
        const d = state.drivers.find(x => String(x.id) === String(pitOverlayTargetDriverId));
        if (d) {
          d.requestPit = true;
          d.pitTargetTyre = pitOverlaySelectedTyre;
        }
        hidePitOverlay();
      };
    }
  }

  function hidePitOverlay() {
    const overlay = document.getElementById('pit-overlay');
    if (overlay) overlay.style.display = 'none';
    pitOverlayTargetDriverId = null;
    pitOverlaySelectedTyre = null;
  }

  function bindCardButtons(card, driver) {
    // PIT
    const pitBtn =
      card.querySelector('.btn-pit, .pit-btn, [data-action="pit"]') ||
      Array.from(card.querySelectorAll('button')).find(b => /pit/i.test(b.textContent || ''));

    if (pitBtn) {
      pitBtn.onclick = () => showPitOverlay(driver);
    }

    // Modos (tentativa de capturar ECONOMIZAR / ATAQUE / NORMAL)
    const buttons = Array.from(card.querySelectorAll('button'));

    const btnEco = buttons.find(b => /econ/i.test(b.textContent || ''));
    const btnAtk = buttons.find(b => /ataq/i.test(b.textContent || ''));
    const btnNorm = buttons.find(b => /normal/i.test(b.textContent || ''));

    // Se existir, aplica para pneus + motor juntos (sem mudar HTML)
    // Depois, na Etapa 3, separaremos motor/pneu com UI melhor.
    if (btnEco) btnEco.onclick = () => { driver.engineMode = 'ECO'; driver.tyreMode = 'ECO'; };
    if (btnAtk) btnAtk.onclick = () => { driver.engineMode = 'ATK'; driver.tyreMode = 'ATK'; };
    if (btnNorm) btnNorm.onclick = () => { driver.engineMode = 'NORMAL'; driver.tyreMode = 'NORMAL'; };
  }

  function fillUserCards() {
    const teamKey = String(state.userTeam).toLowerCase();
    let teamDrivers = state.drivers.filter(d => String(d.teamKey).toLowerCase() === teamKey);

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

      bindCardButtons(card, drv);
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
  // SIM: ritmo + pneus + motor + ERS + pit
  // ------------------------------
  function tyreModeWearMul(mode) {
    if (mode === 'ECO') return 0.80;
    if (mode === 'ATK') return 1.18;
    return 1.00;
  }

  function engineModePaceMul(mode) {
    if (mode === 'ECO') return 0.985;   // mais lento
    if (mode === 'ATK') return 1.020;   // mais rápido
    return 1.000;
  }

  function engineModeWearRiskMul(mode) {
    if (mode === 'ATK') return 1.15;
    return 1.0;
  }

  function computeEffectiveSpeed(driver) {
    // grip do pneu (clima + desgaste)
    const grip = wearToGrip(driver.tyreWear) * tyreWeatherGripFactor(driver.tyre, state.weather);

    // penalidade por choque climático
    let shockMul = 1.0;
    if (driver.tempShockMs > 0) shockMul = 0.92;

    // temp de pista: muito alta degrada e perde grip
    let tempMul = 1.0;
    if (state.trackTemp > 38) tempMul -= (state.trackTemp - 38) * 0.004;
    if (state.trackTemp < 16) tempMul -= (16 - state.trackTemp) * 0.003;
    tempMul = clamp(tempMul, 0.88, 1.02);

    // motor mode afeta pace
    const engMul = engineModePaceMul(driver.engineMode);

    // ers (simples)
    const ersMul = (driver.ers > 60 && driver.engineMode === 'ATK') ? 1.008 : 1.0;

    // velocidade final
    // speedBase = voltas/ms em condição neutra
    return driver.speedBase * grip * shockMul * tempMul * engMul * ersMul;
  }

  function pitStopTimeMs(driver) {
    // base
    let t = 6500 + Math.random() * 2200;

    // chuva aumenta variação/risco
    if (state.weather === 'CHUVA') t += 700 + Math.random() * 700;

    // ataque aumenta chance de erro no box
    if (driver.engineMode === 'ATK' || driver.tyreMode === 'ATK') {
      const errChance = (state.weather === 'CHUVA') ? 0.14 : 0.09;
      if (Math.random() < errChance) t += 2500 + Math.random() * 2500; // erro de pit
    }

    return t;
  }

  function tickDriverSystems(driver, dtMs) {
    // ERS: ECO carrega, ATK gasta
    if (driver.engineMode === 'ECO') driver.ers = clamp(driver.ers + dtMs * 0.004, 0, 100);
    else if (driver.engineMode === 'ATK') driver.ers = clamp(driver.ers - dtMs * 0.007, 0, 100);
    else driver.ers = clamp(driver.ers - dtMs * 0.002, 0, 100);

    // choque de clima decai
    if (driver.tempShockMs > 0) {
      driver.tempShockMs -= dtMs;
      if (driver.tempShockMs < 0) driver.tempShockMs = 0;
    }
  }

  function applyTyreWear(driver, dtMs) {
    // desgaste proporcional ao tempo rodando (aprox)
    // converte dtMs em fração de volta baseada em velocidade atual
    const effSpeed = computeEffectiveSpeed(driver);
    const fracLap = effSpeed * dtMs; // volta/ms * ms => fração de volta

    const baseWear = TYRE_WEAR_PER_LAP[driver.tyre] ?? 0.06;
    const modeMul = tyreModeWearMul(driver.tyreMode);
    const setupMul = driver.setupWearMul ?? 1.0;

    // chuva reduz desgaste de slick mas aumenta de inter/wet se pista seca (simplificado)
    let weatherWearMul = 1.0;
    if (state.weather === 'CHUVA') {
      if (driver.tyre === 'S' || driver.tyre === 'M' || driver.tyre === 'H') weatherWearMul = 1.35;
      if (driver.tyre === 'W') weatherWearMul = 0.95;
      if (driver.tyre === 'I') weatherWearMul = 1.00;
    } else {
      if (driver.tyre === 'W') weatherWearMul = 1.35;
      if (driver.tyre === 'I') weatherWearMul = 1.22;
    }

    // motor ataque aumenta risco e desgaste geral (na vida real, afeta pneus também)
    const engineMul = engineModeWearRiskMul(driver.engineMode);

    const wearInc = baseWear * modeMul * setupMul * weatherWearMul * engineMul * fracLap;
    driver.tyreWear = clamp(driver.tyreWear + wearInc, 0, 1);
  }

  // ------------------------------
  // UPDATE + LOOP
  // ------------------------------
  function getOrderByRace() {
    return state.drivers
      .slice()
      .sort((a, b) => {
        const da = a.laps + a.progress;
        const db = b.laps + b.progress;
        if (db !== da) return db - da;
        return (b.rating || 0) - (a.rating || 0);
      });
  }

  function getLeader() {
    const ordered = getOrderByRace();
    return ordered[0] || null;
  }

  function update(dtMs) {
    if (!state.pathPoints.length) return;

    tickWeather(dtMs);

    for (const d of state.drivers) {
      tickDriverSystems(d, dtMs);

      // PIT logic
      if (d.requestPit && !d.inPit) {
        d.requestPit = false;
        d.inPit = true;
        d.pitMsLeft = pitStopTimeMs(d);
      }

      if (d.inPit) {
        d.pitMsLeft -= dtMs;

        // no pit: anda bem devagar
        const slow = d.speedBase * 0.10;
        d.progress += slow * dtMs;

        if (d.pitMsLeft <= 0) {
          d.inPit = false;
          d.pitMsLeft = 0;

          // aplica troca de pneu
          const newTyre = d.pitTargetTyre || ((state.weather === 'CHUVA') ? 'I' : 'M');
          d.tyre = newTyre;
          d.tyreWear = 0.0;
          d.pitTargetTyre = null;

          // pequena perda de ERS
          d.ers = clamp(d.ers - 6, 0, 100);
        }
      } else {
        // normal: move
        const effSpeed = computeEffectiveSpeed(d);

        // ruído leve de pilotagem
        const noise = 1 + (Math.random() - 0.5) * 0.045;

        d.progress += effSpeed * noise * dtMs;

        // desgaste do pneu
        applyTyreWear(d, dtMs);
      }

      // completa voltas
      while (d.progress >= 1) {
        d.progress -= 1;
        d.laps += 1;

        // pequena chance de “erro” se slick na chuva e desgaste alto
        if (state.weather === 'CHUVA' && (d.tyre === 'S' || d.tyre === 'M' || d.tyre === 'H')) {
          const risk = 0.02 + d.tyreWear * 0.08;
          if (Math.random() < risk) {
            d.tempShockMs = 2400 + Math.random() * 1400;
          }
        }
      }
    }

    // volta atual = líder
    const leader = getLeader();
    const leaderLap = leader ? leader.laps : 0;
    state.lapNumber = clamp(leaderLap + 1, 1, state.totalLaps);
    safeText(dom.lapLabel, `Volta ${state.lapNumber}`);

    // fim de corrida
    if (leader && leader.laps >= state.totalLaps) {
      state.running = false;

      const ordered = getOrderByRace();
      writeJSON('f1m2025_last_race', {
        track: state.track,
        gp: state.gp,
        timestamp: Date.now(),
        weather: state.weather,
        trackTemp: state.trackTemp,
        results: ordered.map((d, i) => ({
          position: i + 1,
          id: d.id,
          code: d.code,
          name: d.name,
          teamKey: d.teamKey,
          teamName: d.teamName,
          laps: d.laps,
          tyre: d.tyre,
          tyreWear: d.tyreWear
        }))
      });
    }
  }

  function render() {
    if (!state.pathPoints.length) return;
    if (!state.visuals.length) return;

    const byId = new Map(state.drivers.map(d => [String(d.id), d]));

    // carros no SVG
    state.visuals.forEach(v => {
      const d = byId.get(String(v.id));
      if (!d) return;
      const pos = getPositionOnTrack(d.progress);
      v.g.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    });

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
      const gapSec = Math.max(0, gap) * (state.baseLapMs / 1000);

      const wearPct = Math.round(d.tyreWear * 100);
      const tyreLabel = `${d.tyre}${d.inPit ? ' (PIT)' : ''}`;

      stats.innerHTML = `
        <div class="stat-line">Voltas <span>${d.laps}</span></div>
        <div class="stat-line">Gap <span>${idx === 0 ? 'LEADER' : `+${gapSec.toFixed(3)}`}</span></div>
        <div class="stat-line">Pneu <span>${tyreLabel} • ${wearPct}%</span></div>
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
  // INIT
  // ------------------------------
  async function init() {
    mapDOM();

    const q = getQuery();
    state.track = q.get('track') || 'australia';
    state.gp = q.get('gp') || 'GP da Austrália 2025';
    state.userTeam = q.get('userTeam') || localStorage.getItem('f1m2025_user_team') || 'ferrari';
    state.baseLapMs = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;

    // laps opcional via query (?laps=20)
    const lapsQ = Number(q.get('laps') || '');
    if (isFinite(lapsQ) && lapsQ >= 5 && lapsQ <= 70) state.totalLaps = Math.round(lapsQ);
    else state.totalLaps = DEFAULT_TOTAL_LAPS;

    initWeather();

    // UI topo
    safeText(dom.gpTitle, state.gp);
    safeText(dom.weatherLabel, state.weather === 'CHUVA' ? 'Chuva' : 'Seco');
    safeText(dom.trackTempLabel, formatTemp(state.trackTemp));
    safeText(dom.lapLabel, `Volta ${state.lapNumber}`);

    setupSpeedControls();

    // drivers + cards
    initDrivers();
    applyTopTeamBranding();
    fillUserCards();

    // pista (cria visuais com cores)
    await loadTrackSvg(state.track);

    // reaplica (para evitar qualquer “sumiço” de logo/card)
    applyTopTeamBranding();
    fillUserCards();

    state.lastFrame = nowMs();
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', init);

  // ------------------------------
  // EXPORTS (compat)
  // ------------------------------
  window.setRaceSpeed = function setRaceSpeed(mult) {
    state.speedMultiplier = clamp(Number(mult || 1), 0.25, 8);
  };

  window.forcePitForDriver = function forcePitForDriver(driverCodeOrId, tyre) {
    const d = state.drivers.find(x => String(x.id) === String(driverCodeOrId) || String(x.code) === String(driverCodeOrId));
    if (!d) return;
    d.requestPit = true;
    d.pitTargetTyre = tyre || null;
  };

})();
