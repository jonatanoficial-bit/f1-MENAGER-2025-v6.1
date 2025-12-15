/* =========================================================
   F1 MANAGER 2025 — RACE.JS (COMPLETO)
   - SVG track render + cars
   - Leaderboard + user cards
   - PIT funcional + troca de pneus
   - Modos (ECO/NORMAL/ATAQUE), Motor, Agressividade, ERS
   - Clima (seco/chuva) afetando pneus e ritmo
   - Grid vindo do Q3 (localStorage)
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------
     Helpers / DOM
  ----------------------------*/
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const fmt3 = (n) => (Math.round(n * 1000) / 1000).toFixed(3);

  function safeJSONParse(str, fallback = null) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function getParams() {
    const u = new URL(location.href);
    const p = u.searchParams;
    return {
      track: (p.get("track") || "australia").trim(),
      gp: decodeURIComponent(p.get("gp") || "GP"),
      userTeam: (p.get("userTeam") || "ferrari").trim()
    };
  }

  const PARAMS = getParams();

  /* ---------------------------
     DOM targets (existem no seu HTML)
  ----------------------------*/
  const elTrackContainer = $("#track-container");
  const elDriversList = $("#drivers-list");
  const elTeamLogoTop = $("#teamLogoTop");
  const elGpTitle = $("#gp-title");
  const elLapLabel = $("#lap-label");
  const elWeatherLabel = $("#weather-label");
  const elTrackTempLabel = $("#tracktemp-label");

  const elUserCard0 = $("#user-driver-card-0");
  const elUserCard1 = $("#user-driver-card-1");

  const speedBtns = {
    x1: $("#speed-1x"),
    x2: $("#speed-2x"),
    x4: $("#speed-4x"),
  };

  /* ---------------------------
     Assets / Defaults
  ----------------------------*/
  const TEAM_COLORS = {
    ferrari: "#d40000",
    redbull: "#1e2a5a",
    mercedes: "#00d2be",
    mclaren: "#ff8700",
    astonmartin: "#006f62",
    alpine: "#2293d1",
    williams: "#005aff",
    haas: "#b6babd",
    rb: "#2b4cff",
    sauber: "#00ff7f",
    "sauber/audi": "#00ff7f",
    audi: "#00ff7f",
    "free agent": "#888888",
    freeagent: "#888888",
  };

  const TYRE = {
    S: { name: "S", grip: 1.06, deg: 1.35 }, // Soft
    M: { name: "M", grip: 1.03, deg: 1.05 }, // Medium
    H: { name: "H", grip: 1.01, deg: 0.85 }, // Hard
    I: { name: "I", grip: 0.96, deg: 0.60 }, // Inter
    W: { name: "W", grip: 0.93, deg: 0.55 }, // Wet
  };

  const MODE = {
    SAVE:   { label: "ECONOMIA", tyreWearMul: 0.80, paceMul: 1.025, ersGain: 0.9 },
    NORMAL: { label: "NORMAL",   tyreWearMul: 1.00, paceMul: 1.000, ersGain: 1.0 },
    PUSH:   { label: "ATAQUE",   tyreWearMul: 1.30, paceMul: 0.985, ersGain: 0.8 },
  };

  const ENGINE = {
    1: { label: "ECO",    paceMul: 1.020, wearMul: 0.85 },
    2: { label: "NORM",   paceMul: 1.000, wearMul: 1.00 },
    3: { label: "PUSH",   paceMul: 0.985, wearMul: 1.15 },
  };

  const AGGR = {
    1: { label: "A1", paceMul: 1.010, wearMul: 0.90 },
    2: { label: "A2", paceMul: 1.000, wearMul: 1.00 },
    3: { label: "A3", paceMul: 0.992, wearMul: 1.08 },
    4: { label: "A4", paceMul: 0.985, wearMul: 1.15 },
  };

  /* ---------------------------
     Grid: puxar da Quali (Q3)
     - tenta várias chaves para não quebrar
  ----------------------------*/
  function loadGridFromStorage() {
    const keys = [
      "f1m2025_q3_grid",
      "f1m2025_last_qualy",
      "f1m2025_grid",
      "lastQualyGrid",
      "qualyResults",
    ];

    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const parsed = safeJSONParse(raw, null);
      if (!parsed) continue;

      // aceita array direto
      if (Array.isArray(parsed) && parsed.length >= 10) return parsed;

      // aceita objeto com grid/results
      if (parsed.grid && Array.isArray(parsed.grid) && parsed.grid.length >= 10) return parsed.grid;
      if (parsed.results && Array.isArray(parsed.results) && parsed.results.length >= 10) return parsed.results;
      if (parsed.q3 && Array.isArray(parsed.q3) && parsed.q3.length >= 10) return parsed.q3;
    }
    return null;
  }

  /* ---------------------------
     Fallback drivers (se não vier do sistema)
  ----------------------------*/
  function buildFallbackGrid() {
    // 20 pilotos genéricos (para não quebrar nunca)
    const teams = ["redbull","ferrari","mercedes","mclaren","astonmartin","alpine","williams","haas","rb","sauber"];
    const names = [
      "Max Verstappen","Sergio Pérez","Charles Leclerc","Carlos Sainz","Lewis Hamilton","George Russell",
      "Lando Norris","Oscar Piastri","Fernando Alonso","Lance Stroll","Pierre Gasly","Esteban Ocon",
      "Alex Albon","Logan Sargeant","Kevin Magnussen","Oliver Bearman","Yuki Tsunoda","Liam Lawson",
      "Nico Hülkenberg","Gabriel Bortoleto"
    ];
    return names.map((n, i) => ({
      name: n,
      team: teams[Math.floor(i/2)] || "free agent",
      code: n.split(" ").slice(-1)[0].slice(0,3).toUpperCase(),
      face: "",
      rating: 78 + (20 - i) * 0.5,
      gridPos: i + 1,
    }));
  }

  /* ---------------------------
     Weather (persistente por GP)
  ----------------------------*/
  function loadOrCreateWeather() {
    const key = `f1m2025_weather_${PARAMS.track}`;
    const raw = localStorage.getItem(key);
    const parsed = raw ? safeJSONParse(raw, null) : null;
    if (parsed && parsed.type) return parsed;

    // 20% chance chuva (ajuste se quiser)
    const isRain = Math.random() < 0.20;
    const w = {
      type: isRain ? "Chuva" : "Seco",
      wetness: isRain ? lerp(0.35, 0.85, Math.random()) : 0,
      trackTemp: isRain ? Math.round(18 + Math.random()*8) : Math.round(24 + Math.random()*10),
    };
    localStorage.setItem(key, JSON.stringify(w));
    return w;
  }

  /* ---------------------------
     Setup link (não quebra se não existir)
     - você pediu ligação com setup/treino/quali
     - aqui já consumimos se estiver salvo
  ----------------------------*/
  function loadSetupForUserTeam() {
    const keys = ["f1m2025_setup", "carSetup", "setupData"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = safeJSONParse(raw, null);
      if (parsed) return parsed;
    }
    return null;
  }

  /* ---------------------------
     SVG Track render
  ----------------------------*/
  async function loadTrackSVG(track) {
    // tenta caminhos comuns
    const candidates = [
      `assets/tracks/${track}.svg`,
      `assets/tracks/${track}/${track}.svg`,
      `assets/${track}.svg`,
    ];

    let svgText = null;
    for (const url of candidates) {
      try {
        const r = await fetch(url, { cache: "no-cache" });
        if (r.ok) { svgText = await r.text(); break; }
      } catch {}
    }

    if (!svgText) {
      // fallback: desenha um retângulo para não quebrar UI
      return {
        svgEl: null,
        pathEl: null,
        points: makeSimpleOvalPoints(900),
      };
    }

    // injeta SVG
    elTrackContainer.innerHTML = svgText;
    const svgEl = elTrackContainer.querySelector("svg");
    if (!svgEl) {
      return { svgEl: null, pathEl: null, points: makeSimpleOvalPoints(900) };
    }

    // força viewBox / responsivo
    svgEl.setAttribute("width", "100%");
    svgEl.setAttribute("height", "100%");
    svgEl.style.display = "block";

    // pega o "melhor" path do SVG
    const paths = Array.from(svgEl.querySelectorAll("path"));
    let pathEl = null;

    if (paths.length) {
      // pega o path com maior comprimento (geralmente é a pista)
      let best = paths[0];
      let bestLen = 0;
      for (const p of paths) {
        try {
          const L = p.getTotalLength();
          if (L > bestLen) { bestLen = L; best = p; }
        } catch {}
      }
      pathEl = best;

      // estiliza pista (sem alterar sua arte, só garantindo contraste)
      try {
        pathEl.style.fill = "none";
        pathEl.style.stroke = pathEl.style.stroke || "#d7d7d7";
        pathEl.style.strokeWidth = pathEl.style.strokeWidth || "6";
        pathEl.style.strokeLinecap = "round";
        pathEl.style.strokeLinejoin = "round";
        pathEl.style.filter = "drop-shadow(0 0 6px rgba(255,255,255,0.15))";
      } catch {}
    }

    const points = pathEl ? samplePathPoints(pathEl, 1200) : makeSimpleOvalPoints(900);
    return { svgEl, pathEl, points };
  }

  function samplePathPoints(pathEl, n = 1000) {
    const pts = [];
    let total = 0;
    try { total = pathEl.getTotalLength(); } catch { total = 1; }
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const p = pathEl.getPointAtLength(total * t);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  function makeSimpleOvalPoints(n = 600) {
    const pts = [];
    const cx = 500, cy = 400, rx = 320, ry = 180;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    }
    return pts;
  }

  /* ---------------------------
     Car markers
  ----------------------------*/
  function createCarMarker(driver) {
    const d = document.createElement("div");
    d.className = "car-dot";
    d.style.position = "absolute";
    d.style.width = "8px";
    d.style.height = "8px";
    d.style.borderRadius = "50%";
    d.style.transform = "translate(-50%,-50%)";
    d.style.boxShadow = "0 0 10px rgba(255,255,255,0.25)";
    d.style.border = "1px solid rgba(255,255,255,0.5)";
    d.style.background = driver.color;
    d.title = `${driver.name} (${driver.team})`;
    elTrackContainer.appendChild(d);
    return d;
  }

  function placeCar(marker, pt) {
    marker.style.left = `${pt.x}px`;
    marker.style.top = `${pt.y}px`;
  }

  /* ---------------------------
     Race simulation
  ----------------------------*/
  const state = {
    ready: false,
    speedMul: 1,
    tickMs: 50,
    timeMs: 0,
    lapCount: 58, // default; pode ajustar por pista depois
    weather: loadOrCreateWeather(),
    setup: loadSetupForUserTeam(),
    points: null,
    drivers: [],
    markers: new Map(),
    running: true,
  };

  function deriveLapCount(track) {
    // simples: você pode expandir por pista
    const map = {
      australia: 58,
      bahrain: 57,
      saudiarabia: 50,
      japan: 53,
      china: 56,
      miami: 57,
      imola: 63,
      monaco: 78,
      canada: 70,
      spain: 66,
      austria: 71,
      britain: 52,
      hungary: 70,
      belgium: 44,
      netherlands: 72,
      italy: 53,
      singapore: 62,
      usa: 56,
      mexico: 71,
      brazil: 71,
      lasvegas: 50,
      qatar: 57,
      abudhabi: 58,
    };
    return map[track] || 55;
  }

  function pickStartingTyre(weather) {
    if (weather.type === "Chuva") {
      // se muito molhado -> W, senão I
      return weather.wetness > 0.65 ? "W" : "I";
    }
    return "M";
  }

  function teamKeyNormalize(team) {
    return (team || "").toLowerCase().trim();
  }

  function driverColor(team) {
    const key = teamKeyNormalize(team);
    return TEAM_COLORS[key] || "#bdbdbd";
  }

  function computeBasePaceMs(driver) {
    // base por rating + um toque de variação
    // menor = mais rápido
    const rating = clamp(driver.rating ?? 80, 50, 99);
    const base = 92000 - (rating - 70) * 600; // ~92s a ~74s
    const jitter = (Math.random() - 0.5) * 800;
    return base + jitter;
  }

  function weatherPaceMul(weather, tyre) {
    if (weather.type !== "Chuva") return 1.0;

    // se chove, slicks sofrem muito
    if (tyre === "S" || tyre === "M" || tyre === "H") {
      return lerp(1.10, 1.28, clamp(weather.wetness, 0, 1));
    }
    // inter/wet melhor na chuva
    if (tyre === "I") return lerp(1.03, 1.10, clamp(weather.wetness, 0, 1));
    if (tyre === "W") return lerp(1.00, 1.06, clamp(weather.wetness, 0, 1));
    return 1.15;
  }

  function tyreDegPerLap(driver, weather) {
    const t = TYRE[driver.tyre] || TYRE.M;
    let base = 1.0 * t.deg;

    // mais quente, mais desgaste (seco)
    if (weather.type !== "Chuva") {
      const temp = weather.trackTemp || 28;
      base *= lerp(0.92, 1.15, clamp((temp - 18) / 18, 0, 1));
    } else {
      // chuva reduz desgaste de slick? mas aumenta risco
      base *= 0.85;
    }

    base *= MODE[driver.mode]?.tyreWearMul ?? 1.0;
    base *= ENGINE[driver.engine]?.wearMul ?? 1.0;
    base *= AGGR[driver.aggr]?.wearMul ?? 1.0;

    // se slick na chuva, desgaste sobe (patinação)
    if (weather.type === "Chuva" && (driver.tyre === "S" || driver.tyre === "M" || driver.tyre === "H")) {
      base *= 1.35;
    }

    return base;
  }

  function paceThisLapMs(driver, weather) {
    const base = driver.basePaceMs;
    const tyre = TYRE[driver.tyre] || TYRE.M;

    const wearPenalty = lerp(0.0, 0.09, clamp((1 - driver.tyreWear) / 0.8, 0, 1)); // até +9%
    const modeMul = MODE[driver.mode]?.paceMul ?? 1.0;
    const engMul = ENGINE[driver.engine]?.paceMul ?? 1.0;
    const aggrMul = AGGR[driver.aggr]?.paceMul ?? 1.0;
    const rainMul = weatherPaceMul(weather, driver.tyre);

    // ERS boost dá ganho temporário, mas gasta ERS
    const ersBoostMul = driver.ersBoostActive ? 0.985 : 1.0;

    // setup: se existir, aplica um bônus leve
    let setupMul = 1.0;
    if (state.setup && state.setup.balance != null) {
      // exemplo genérico: “balance” perto de 50 é bom
      const dist = Math.abs((state.setup.balance || 50) - 50);
      setupMul *= lerp(0.995, 1.010, clamp(dist / 50, 0, 1));
    }

    // composto (mais grip = mais rápido)
    const gripMul = 1 / tyre.grip;

    // resultado
    return base * (1 + wearPenalty) * modeMul * engMul * aggrMul * rainMul * ersBoostMul * setupMul * gripMul;
  }

  function pitTimeMs(driver) {
    // base pit stop (pode sofisticar depois)
    // chuva costuma +0.8s
    const base = 21500 + Math.random() * 1800;
    const rain = state.weather.type === "Chuva" ? 800 : 0;
    return base + rain;
  }

  function chooseAutoNextTyre(driver) {
    const w = state.weather;
    if (w.type === "Chuva") return (w.wetness > 0.65 ? "W" : "I");

    // seco: alterna M/H/S dependendo desgaste
    if (driver.tyre === "S") return "M";
    if (driver.tyre === "M") return "H";
    return "M";
  }

  function normalizeGridItem(it, idx) {
    // aceita vários formatos vindos da Quali
    const name = it.name || it.driverName || it.pilotName || it.piloto || `Piloto ${idx+1}`;
    const team = it.team || it.equipe || it.teamName || it.constructor || "free agent";
    const code = it.code || it.abbr || it.short || (name.split(" ").slice(-1)[0].slice(0,3).toUpperCase());
    const rating = it.rating ?? it.ovr ?? it.skill ?? (78 + (20 - idx) * 0.6);
    const face = it.face || it.photo || it.avatar || it.img || "";
    const logo = it.logo || it.teamLogo || it.logoUrl || "";
    const gridPos = it.gridPos || it.pos || it.position || (idx + 1);

    return { name, team, code, rating, face, logo, gridPos };
  }

  function buildDrivers(grid) {
    const weather = state.weather;

    const full = (grid && grid.length >= 10)
      ? grid.map((it, idx) => normalizeGridItem(it, idx))
      : buildFallbackGrid();

    // garante 20
    const drivers20 = full.slice(0, 20);
    while (drivers20.length < 20) drivers20.push(normalizeGridItem({}, drivers20.length));

    return drivers20
      .sort((a, b) => (a.gridPos ?? 999) - (b.gridPos ?? 999))
      .map((it, i) => {
        const teamKey = teamKeyNormalize(it.team);
        const tyre = pickStartingTyre(weather);

        return {
          id: `${it.code}_${i}`,
          name: it.name,
          team: it.team,
          teamKey,
          code: it.code,
          rating: it.rating,
          face: it.face,
          logo: it.logo,
          color: driverColor(it.team),
          gridPos: i + 1,

          // corrida
          basePaceMs: computeBasePaceMs(it),
          lap: 0,
          prog: 0,          // 0..1 no traçado
          dist: 0,          // lap + prog
          totalTimeMs: 0,   // “tempo acumulado” para gaps

          tyre,
          tyreWear: 1.0,    // 1.0 = 100%
          mode: "NORMAL",
          engine: 2,        // 1..3
          aggr: 2,          // 1..4
          ers: 0.50,        // 0..1
          ersBoostActive: false,

          // pit
          pitRequest: false,
          pitting: false,
          pitRemainMs: 0,
          nextTyre: tyre,
        };
      });
  }

  /* ---------------------------
     UI rendering
  ----------------------------*/
  function setHeader() {
    if (elGpTitle) elGpTitle.textContent = PARAMS.gp;
    if (elTeamLogoTop && PARAMS.userTeam) {
      // tenta usar seu logo existente em assets
      const logoCandidates = [
        `assets/teams/${PARAMS.userTeam}.png`,
        `assets/logos/${PARAMS.userTeam}.png`,
        `assets/ui/${PARAMS.userTeam}.png`,
      ];
      // coloca o primeiro; se falhar, mantém o que já tinha
      const img = elTeamLogoTop;
      const tryNext = (i) => {
        if (i >= logoCandidates.length) return;
        img.src = logoCandidates[i];
        img.onerror = () => tryNext(i + 1);
      };
      tryNext(0);
    }

    if (elWeatherLabel) {
      elWeatherLabel.textContent = `Clima: ${state.weather.type}`;
    }
    if (elTrackTempLabel) {
      elTrackTempLabel.textContent = `Pista: ${state.weather.trackTemp}°C`;
    }
  }

  function renderLapLabel() {
    if (!elLapLabel) return;
    const maxLap = state.lapCount;
    const leader = getSortedDrivers()[0];
    const lap = leader ? clamp(leader.lap + 1, 1, maxLap) : 1;
    elLapLabel.textContent = `Volta ${lap} / ${maxLap}`;
  }

  function getSortedDrivers() {
    // ordena por distância (lap+prog) e depois menor totalTime
    return [...state.drivers].sort((a, b) => {
      if (b.dist !== a.dist) return b.dist - a.dist;
      return a.totalTimeMs - b.totalTimeMs;
    });
  }

  function gapToLeaderMs(driver, leader) {
    if (!leader) return 0;
    // aproximação: diferença de “tempo acumulado” + diferença de distância convertida em tempo
    const distDiff = (leader.dist - driver.dist);
    const pace = paceThisLapMs(leader, state.weather);
    const distMs = distDiff * pace; // heurística
    return Math.max(0, (driver.totalTimeMs - leader.totalTimeMs) + distMs);
  }

  function renderDriversList() {
    if (!elDriversList) return;
    const sorted = getSortedDrivers();
    const leader = sorted[0];

    // garante 20 no grid visual (se por algum motivo vier menos)
    const list = sorted.slice(0, 20);

    elDriversList.innerHTML = "";
    list.forEach((d, idx) => {
      const row = document.createElement("div");
      row.className = "driver-row";

      const gapMs = d === leader ? 0 : gapToLeaderMs(d, leader);
      const gapText = d === leader ? "LEADER" : `+${fmt3(gapMs/1000)}`;

      row.innerHTML = `
        <div class="pos">${idx + 1}</div>
        <div class="pill">
          <div class="dot" style="background:${d.color}"></div>
          <div class="meta">
            <div class="name">${escapeHtml(d.name)}</div>
            <div class="team">${escapeHtml(d.team)}</div>
            <div class="mini">Voltas: ${d.lap} · Pneu: ${d.tyre} · ${Math.round(d.tyreWear*100)}%</div>
          </div>
        </div>
        <div class="gap">${gapText}</div>
      `;
      elDriversList.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderUserCard(cardEl, driver) {
    if (!cardEl || !driver) return;

    // subelementos (se existirem) — se não existirem, não quebra
    const nameEl = cardEl.querySelector(".user-name");
    const teamEl = cardEl.querySelector(".user-team");
    const tyreEl = cardEl.querySelector(".user-tyre");
    const wearEl = cardEl.querySelector(".user-wear");
    const ersEl = cardEl.querySelector(".user-ers");
    const modeEl = cardEl.querySelector(".user-mode");
    const engEl = cardEl.querySelector(".user-engine");
    const aggrEl = cardEl.querySelector(".user-aggr");
    const faceEl = cardEl.querySelector("img.user-face");
    const logoEl = cardEl.querySelector("img.user-logo");

    if (nameEl) nameEl.textContent = driver.name;
    if (teamEl) teamEl.textContent = driver.team;

    if (tyreEl) tyreEl.textContent = driver.tyre;
    if (wearEl) wearEl.textContent = `${Math.round(driver.tyreWear*100)}%`;
    if (ersEl) ersEl.textContent = `${Math.round(driver.ers*100)}%`;

    if (modeEl) modeEl.textContent = MODE[driver.mode]?.label || driver.mode;
    if (engEl) engEl.textContent = ENGINE[driver.engine]?.label || `M${driver.engine}`;
    if (aggrEl) aggrEl.textContent = AGGR[driver.aggr]?.label || `A${driver.aggr}`;

    // imagens (se seu HTML tiver)
    if (faceEl && driver.face) {
      faceEl.src = driver.face;
      faceEl.onerror = () => { faceEl.style.display = "none"; };
    }
    if (logoEl) {
      // prioridade: logo vindo do sistema; fallback por pasta
      const candidates = [];
      if (driver.logo) candidates.push(driver.logo);

      const tk = driver.teamKey || teamKeyNormalize(driver.team);
      candidates.push(`assets/logos/${tk}.png`);
      candidates.push(`assets/teams/${tk}.png`);
      candidates.push(`assets/ui/${tk}.png`);

      const tryNext = (i) => {
        if (i >= candidates.length) return;
        logoEl.src = candidates[i];
        logoEl.onerror = () => tryNext(i + 1);
      };
      tryNext(0);
    }
  }

  function renderUserCards() {
    // userTeam: tenta encontrar dois pilotos dessa equipe
    const userTeamKey = teamKeyNormalize(PARAMS.userTeam);
    let userDrivers = state.drivers.filter(d => d.teamKey === userTeamKey);

    // fallback: se não achou, pega dois primeiros
    if (userDrivers.length < 2) userDrivers = getSortedDrivers().slice(-2);

    const d0 = userDrivers[0] || state.drivers[0];
    const d1 = userDrivers[1] || state.drivers[1];

    renderUserCard(elUserCard0, d0);
    renderUserCard(elUserCard1, d1);
  }

  /* ---------------------------
     Controls (botões)
  ----------------------------*/
  function bindSpeedButtons() {
    const setActive = (mul) => {
      state.speedMul = mul;
      // classes (se existirem no seu CSS)
      Object.values(speedBtns).forEach(b => b && b.classList.remove("active"));
      if (mul === 1 && speedBtns.x1) speedBtns.x1.classList.add("active");
      if (mul === 2 && speedBtns.x2) speedBtns.x2.classList.add("active");
      if (mul === 4 && speedBtns.x4) speedBtns.x4.classList.add("active");
    };

    if (speedBtns.x1) speedBtns.x1.addEventListener("click", () => setActive(1));
    if (speedBtns.x2) speedBtns.x2.addEventListener("click", () => setActive(2));
    if (speedBtns.x4) speedBtns.x4.addEventListener("click", () => setActive(4));

    setActive(1);
  }

  function bindUserButtons() {
    const btns = $$(".user-btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const idxStr = btn.getAttribute("data-idx");
        const idx = idxStr ? parseInt(idxStr, 10) : 0;

        // resolve driver pelo idx (0/1) na equipe do usuário
        const userTeamKey = teamKeyNormalize(PARAMS.userTeam);
        let userDrivers = state.drivers.filter(d => d.teamKey === userTeamKey);
        if (userDrivers.length < 2) userDrivers = state.drivers.slice(0, 2);

        const driver = userDrivers[idx] || userDrivers[0];
        if (!driver) return;

        handleUserAction(driver, action);
        renderUserCards();
      });
    });
  }

  function handleUserAction(driver, action) {
    switch (action) {
      case "pit":
        // PIT: solicita e define próximo pneu automático (por enquanto)
        driver.pitRequest = true;
        driver.nextTyre = chooseAutoNextTyre(driver);
        break;

      case "push":
        driver.mode = "PUSH";
        break;

      case "save":
        driver.mode = "SAVE";
        break;

      case "ers":
        // toggle boost
        driver.ersBoostActive = !driver.ersBoostActive;
        break;

      case "engineUp":
        driver.engine = clamp(driver.engine + 1, 1, 3);
        break;

      case "engineDown":
        driver.engine = clamp(driver.engine - 1, 1, 3);
        break;

      case "aggrUp":
        driver.aggr = clamp(driver.aggr + 1, 1, 4);
        break;

      case "aggrDown":
        driver.aggr = clamp(driver.aggr - 1, 1, 4);
        break;

      default:
        break;
    }
  }

  /* ---------------------------
     Main tick
  ----------------------------*/
  function tick(dtMs) {
    const dt = dtMs * state.speedMul;

    state.timeMs += dt;

    const maxLap = state.lapCount;
    const pts = state.points;
    if (!pts || pts.length < 10) return;

    for (const d of state.drivers) {
      // se terminou corrida, para
      if (d.lap >= maxLap) continue;

      // PIT processing
      if (d.pitting) {
        d.pitRemainMs -= dt;
        d.totalTimeMs += dt;

        if (d.pitRemainMs <= 0) {
          d.pitting = false;
          d.pitRequest = false;

          // aplica troca de pneu
          d.tyre = d.nextTyre || d.tyre;
          d.tyreWear = 1.0;

          // pequeno “reset” de ritmo por pneus novos
          d.basePaceMs = Math.max(65000, d.basePaceMs * 0.995);
        }
        // durante pit, mantemos o carro “parado” num ponto fixo da pista (pit entry)
        continue;
      }

      // ritmo da volta (ms)
      const lapPace = paceThisLapMs(d, state.weather);

      // ERS regen/consumo
      if (d.ersBoostActive) {
        d.ers = clamp(d.ers - (dt / 22000), 0, 1);
        if (d.ers <= 0.02) d.ersBoostActive = false;
      } else {
        d.ers = clamp(d.ers + (dt / (26000 / (MODE[d.mode]?.ersGain ?? 1.0))), 0, 1);
      }

      // avanço de progresso
      const progAdvance = dt / lapPace; // 1.0 = 1 volta
      d.prog += progAdvance;
      d.totalTimeMs += dt;

      // desgaste por “fração de volta”
      const degLap = tyreDegPerLap(d, state.weather);
      const degNow = (degLap / 1.0) * progAdvance; // proporcional
      d.tyreWear = clamp(d.tyreWear - degNow * 0.010, 0.01, 1.0);

      // Se pediu pit: entra quando cruzar a linha (fim de volta)
      if (d.pitRequest && d.prog >= 0.985) {
        d.pitting = true;
        d.pitRemainMs = pitTimeMs(d);
        // penaliza tempo acumulado imediatamente (realista)
        d.totalTimeMs += d.pitRemainMs;
        d.prog = 0.02; // sai do pit logo após a linha
        d.lap = Math.min(d.lap + 1, maxLap);
      }

      // completou volta
      while (d.prog >= 1.0) {
        d.prog -= 1.0;
        d.lap += 1;

        // tempo “oficial” de volta
        d.lastLapMs = lapPace;

        // se pneus muito gastos, fica mais lento
        if (d.tyreWear < 0.30) d.basePaceMs *= 1.003;

        // AI pit: quando desgaste baixo ou chuva troca slick
        if (!d.pitRequest && !d.pitting) {
          const wantPitForWear = d.tyreWear < 0.28 && d.lap < maxLap - 2;
          const wrongTyreInRain = (state.weather.type === "Chuva") && (d.tyre === "S" || d.tyre === "M" || d.tyre === "H");
          const wantPitForRain = wrongTyreInRain && d.lap < maxLap - 2;

          if (wantPitForWear || wantPitForRain) {
            d.pitRequest = true;
            d.nextTyre = chooseAutoNextTyre(d);
          }
        }

        // terminou?
        if (d.lap >= maxLap) {
          d.prog = 1.0;
          break;
        }
      }

      d.dist = d.lap + d.prog;

      // atualizar marcador na pista
      const idx = Math.floor(d.prog * (pts.length - 1));
      const pt = pts[clamp(idx, 0, pts.length - 1)];
      const marker = state.markers.get(d.id);
      if (marker) placeCar(marker, pt);
    }

    // UI refresh
    renderLapLabel();
    renderDriversList();
    renderUserCards();
  }

  /* ---------------------------
     Init
  ----------------------------*/
  async function init() {
    try {
      state.lapCount = deriveLapCount(PARAMS.track);
      setHeader();
      bindSpeedButtons();

      // SVG + points
      const { points } = await loadTrackSVG(PARAMS.track);
      state.points = points;

      // grid
      const grid = loadGridFromStorage() || buildFallbackGrid();
      state.drivers = buildDrivers(grid);

      // cria markers (20)
      for (const d of state.drivers) {
        const marker = createCarMarker(d);
        state.markers.set(d.id, marker);

        // posiciona no começo (grid)
        const pt = state.points[Math.floor((d.gridPos - 1) * 3) % state.points.length];
        placeCar(marker, pt);
      }

      // listeners dos botões dos cards (PIT etc.)
      bindUserButtons();

      // primeira render
      renderLapLabel();
      renderDriversList();
      renderUserCards();

      state.ready = true;

      // loop
      let last = performance.now();
      const loop = (now) => {
        const dt = now - last;
        last = now;

        if (state.running) tick(clamp(dt, 10, 60));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch (e) {
      console.error("Race init error:", e);
    }
  }

  init();

})();
