/* =========================================================
   F1 MANAGER 2025 — RACE.JS (STABLE + LINK TL/QUALI/RACE)
   - Consome Season Store (TL/Quali) + Economy Staff
   - Mantém jogabilidade já construída (apenas liga dados)
   ========================================================= */

(function () {
  "use strict";

  /* =========================
     SEASON + ECON KEYS
     ========================= */
  const SEASON_KEY = "f1m2025_season_state";
  const ECON_KEY = "f1m2025_economy";

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
    for (const k of Object.keys(patch)) {
      const pv = patch[k];
      const bv = out[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv)) out[k] = deepMerge(bv || {}, pv);
      else out[k] = pv;
    }
    return out;
  }

  function loadSeason() {
    try {
      const raw = localStorage.getItem(SEASON_KEY);
      if (!raw) return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
      const obj = JSON.parse(raw);
      return deepMerge({ version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} }, obj);
    } catch (e) {
      return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
    }
  }

  function loadEconomy() {
    try {
      const raw = localStorage.getItem(ECON_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function staffModifiers(staff) {
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const pitLevel = clamp(Number(staff?.pitCrewLevel ?? 3), 1, 5);
    const tyreLevel = clamp(Number(staff?.tyreEngineerLevel ?? 3), 1, 5);
    const setupLevel = clamp(Number(staff?.setupEngineerLevel ?? 3), 1, 5);

    return {
      pitTimeFactor: 1.12 - pitLevel * 0.045,
      tyreWearFactor: 1.08 - tyreLevel * 0.03,
      consistencyBoost: 0.90 - setupLevel * 0.06
    };
  }

  /* =========================
     PARAMS / CONSTANTES
     ========================= */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP 2025";
  const userTeamKey =
    (params.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      "ferrari"
    ).toLowerCase();

  localStorage.setItem("f1m2025_user_team", userTeamKey);

  const VIEW_W = 1000;
  const VIEW_H = 600;

  const TICK_DT_CAP_MS = 60;
  const SAMPLES = 700;
  const DEFAULT_RACE_LAPS = 12;

  let speedMultiplier = 1;

  /* =========================
     DADOS BASE (COM BOR)
     ========================= */
  const DRIVERS_2025 = [
    { code: "VER", name: "Verstappen", team: "redbull", rating: 96 },
    { code: "PER", name: "Perez", team: "redbull", rating: 89 },

    { code: "LEC", name: "Leclerc", team: "ferrari", rating: 94 },
    { code: "SAI", name: "Sainz", team: "ferrari", rating: 91 },

    { code: "HAM", name: "Hamilton", team: "mercedes", rating: 93 },
    { code: "RUS", name: "Russell", team: "mercedes", rating: 90 },

    { code: "NOR", name: "Norris", team: "mclaren", rating: 92 },
    { code: "PIA", name: "Piastri", team: "mclaren", rating: 89 },

    { code: "ALO", name: "Alonso", team: "astonmartin", rating: 90 },
    { code: "STR", name: "Stroll", team: "astonmartin", rating: 84 },

    { code: "OCO", name: "Ocon", team: "alpine", rating: 86 },
    { code: "GAS", name: "Gasly", team: "alpine", rating: 86 },

    { code: "ALB", name: "Albon", team: "williams", rating: 85 },
    { code: "SAR", name: "Sargeant", team: "williams", rating: 80 },

    { code: "TSU", name: "Tsunoda", team: "rb", rating: 84 },
    { code: "RIC", name: "Ricciardo", team: "rb", rating: 85 },

    // SAUBER (BOR no lugar de BOT)
    { code: "BOR", name: "Bortoleto", team: "sauber", rating: 83 },
    { code: "ZHO", name: "Zhou", team: "sauber", rating: 82 },

    { code: "MAG", name: "Magnussen", team: "haas", rating: 82 },
    { code: "HUL", name: "Hulkenberg", team: "haas", rating: 84 }
  ];

  const TRACK_BASE_LAP_TIME_MS = {
    australia: 91500, bahrain: 96500, saudiarabia: 90000, japan: 90500, china: 97500,
    miami: 93000, imola: 91500, monaco: 75500, canada: 92000, spain: 90500,
    austria: 67500, britain: 89500, hungary: 78000, belgium: 107000, netherlands: 73000,
    monza: 80000, singapore: 103000, austin: 96500, mexico: 78500, brazil: 74000,
    lasvegas: 93000, qatar: 83500, abudhabi: 88500
  };

  const TRACK_RACE_LAPS = { monaco: 18, austria: 16, netherlands: 16, brazil: 16 };

  const TEAM_COLOR = {
    redbull: "#1e4cff", ferrari: "#ff2a2a", mercedes: "#00ffd2", mclaren: "#ff8a00",
    alpine: "#2aa7ff", astonmartin: "#00a877", haas: "#dcdcdc", rb: "#5a6cff",
    sauber: "#7cff00", williams: "#00a3ff"
  };

  /* =========================
     DOM REFS
     ========================= */
  const elTrackContainer = document.getElementById("track-container");
  const elDriversList = document.getElementById("drivers-list");
  const elGpTitle = document.getElementById("gp-title");
  const elTeamLogoTop = document.getElementById("teamLogoTop");
  const elLapLabel = document.getElementById("race-lap-label");
  const elPodiumHost = document.getElementById("podium-modal");
  const elBackLobby = document.getElementById("btnBackLobby");
  const speedBtns = Array.from(document.querySelectorAll(".speed-btn"));

  const userCard0 = document.getElementById("user-driver-card-0");
  const userCard1 = document.getElementById("user-driver-card-1");

  if (elGpTitle) elGpTitle.textContent = gpName;

  if (elTeamLogoTop) {
    elTeamLogoTop.src = `assets/teams/${userTeamKey}.png`;
    elTeamLogoTop.onerror = () => {
      if (userTeamKey === "astonmartin") elTeamLogoTop.src = "assets/teams/aston_martin.png";
    };
  }

  /* =========================
     LOAD SEASON + STAFF + SETUP + GRID
     ========================= */
  const season = loadSeason();
  const econ = loadEconomy();
  const staff = econ?.staff || season?.staff || { pitCrewLevel: 3, tyreEngineerLevel: 3, setupEngineerLevel: 3 };
  const staffMods = staffModifiers(staff);

  // Setup do usuário vindo do TL/Oficina (via Season Store)
  const userSetup = (season?.setup && season.setup.track === trackKey) ? season.setup : null;
  const setupFactors = userSetup?.factors || null;

  // Grid vindo da Quali (Season Store) ou fallback do last_qualy
  function loadGridPayload() {
    if (season?.qualifying?.grid && season.qualifying.track === trackKey) return season.qualifying;
    try {
      const raw = localStorage.getItem("f1m2025_last_qualy");
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && obj.grid && obj.track === trackKey) return obj;
    } catch (e) {}
    return null;
  }
  const qualyPayload = loadGridPayload();

  /* =========================
     STATE
     ========================= */
  const raceState = {
    trackKey,
    gpName,
    userTeamKey,

    pathPoints: [],
    svg: null,

    baseLapMs: TRACK_BASE_LAP_TIME_MS[trackKey] || 92000,
    totalLaps: TRACK_RACE_LAPS[trackKey] || DEFAULT_RACE_LAPS,

    timeMs: 0,
    lastTs: 0,

    cars: [],
    finished: false,
    podiumShown: false
  };

  /* =========================
     HELPERS
     ========================= */
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function formatMs(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const mm = String(m).padStart(1, "0");
    const ss = String(s).padStart(2, "0");
    const t = Math.floor((ms % 1000) / 10);
    const tt = String(t).padStart(2, "0");
    return `${mm}:${ss}.${tt}`;
  }

  function safeText(s) { return String(s || "").replace(/[<>]/g, ""); }

  function markActiveSpeed(btn) {
    speedBtns.forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  function getUserDrivers() {
    const list = raceState.cars.filter((c) => c.team === userTeamKey);
    return list.length >= 2 ? list.slice(0, 2) : raceState.cars.slice(0, 2);
  }

  function setUserStatus(cardIndex, text) {
    const card = cardIndex === 0 ? userCard0 : userCard1;
    if (!card) return;
    const statusEl = card.querySelector(".user-status");
    if (statusEl) statusEl.textContent = text;
  }

  function getUserButton(index, action) {
    return document.querySelector(`.user-btn[data-index="${index}"][data-action="${action}"]`);
  }

  function setBtnState(btn, state) {
    if (!btn) return;
    btn.classList.remove("active", "pending", "flash");
    if (state) btn.classList.add(state);
  }

  function flashBtn(btn) {
    if (!btn) return;
    btn.classList.add("flash");
    setTimeout(() => btn && btn.classList.remove("flash"), 180);
  }

  /* =========================
     SVG LOAD + PATH SAMPLE
     ========================= */
  async function loadTrackSvg(track) {
    if (!elTrackContainer) return;

    elTrackContainer.innerHTML = "";
    elTrackContainer.classList.add("track-container");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "track-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 1000 600`);
    elTrackContainer.appendChild(svg);

    raceState.svg = svg;

    let text = "";
    try {
      const resp = await fetch(`assets/tracks/${track}.svg`, { cache: "no-store" });
      text = await resp.text();
    } catch (e) {
      console.error("Erro carregando SVG da pista:", e);
      svg.innerHTML = `<text x="20" y="40" fill="#fff">Erro ao carregar assets/tracks/${track}.svg</text>`;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const path = doc.querySelector("path");

    if (!path) {
      console.error("Nenhum <path> encontrado no SVG da pista.");
      svg.innerHTML = `<text x="20" y="40" fill="#fff">SVG inválido: sem &lt;path&gt;</text>`;
      return;
    }

    let pts = [];
    try {
      const len = path.getTotalLength();
      for (let i = 0; i < SAMPLES; i++) {
        const p = path.getPointAtLength((len * i) / SAMPLES);
        pts.push({ x: p.x, y: p.y });
      }
    } catch (e) {
      console.error("Falha ao amostrar path:", e);
      svg.innerHTML = `<text x="20" y="40" fill="#fff">Path inválido (sem geometria)</text>`;
      return;
    }

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;

    const pad = 22;
    const norm = pts.map((p) => ({
      x: pad + ((p.x - minX) / w) * (1000 - pad * 2),
      y: pad + ((p.y - minY) / h) * (600 - pad * 2)
    }));

    raceState.pathPoints = norm;

    svg.innerHTML = "";

    const polyOuter = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyOuter.setAttribute("points", norm.map((p) => `${p.x},${p.y}`).join(" "));
    polyOuter.setAttribute("fill", "none");
    polyOuter.setAttribute("stroke", "#555");
    polyOuter.setAttribute("stroke-width", "18");
    polyOuter.setAttribute("stroke-linecap", "round");
    polyOuter.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polyOuter);

    const polyInner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyInner.setAttribute("points", norm.map((p) => `${p.x},${p.y}`).join(" "));
    polyInner.setAttribute("fill", "none");
    polyInner.setAttribute("stroke", "#ffffff");
    polyInner.setAttribute("stroke-width", "6");
    polyInner.setAttribute("stroke-linecap", "round");
    polyInner.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polyInner);

    const carsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    carsLayer.setAttribute("id", "cars-layer");
    svg.appendChild(carsLayer);
  }

  function getPositionOnTrack(progress01) {
    const pts = raceState.pathPoints;
    if (!pts.length) return { x: 0, y: 0, angle: 0 };

    const total = pts.length;
    const idxFloat = progress01 * total;

    let i0 = Math.floor(idxFloat);
    let i1 = (i0 + 1) % total;
    const t = idxFloat - i0;

    if (i0 >= total) i0 = total - 1;
    if (i1 >= total) i1 = 0;

    const p0 = pts[i0];
    const p1 = pts[i1];

    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return { x, y, angle };
  }

  /* =========================
     GRID APPLY (Quali → Race)
     - Sem mudar mecânica, apenas ordem inicial
     ========================= */
  function applyQualyGridInitialProgress(cars) {
    if (!qualyPayload?.grid || !Array.isArray(qualyPayload.grid)) return;

    const gridSorted = qualyPayload.grid.slice().sort((a, b) => (a.position || 99) - (b.position || 99));
    const byNameTeam = new Map();
    gridSorted.forEach((g) => {
      const key = `${String(g.name || "").toLowerCase()}|${String(g.teamKey || "").toLowerCase()}`;
      byNameTeam.set(key, g.position || 99);
    });

    // mapeia pelo nome+time (qualy não tem code no payload atual)
    cars.forEach((c) => {
      const key = `${String(c.name || "").toLowerCase()}|${String(c.team || "").toLowerCase()}`;
      c.gridPos = byNameTeam.has(key) ? byNameTeam.get(key) : null;
    });

    const ordered = cars.slice().sort((a, b) => {
      const pa = a.gridPos || 999;
      const pb = b.gridPos || 999;
      return pa - pb;
    });

    // progresso inicial espaçado (sem alterar física)
    const base = 0.03;
    const spacing = 0.0024;
    ordered.forEach((c, i) => {
      let p = base - i * spacing;
      while (p < 0) p += 1;
      c.progress = p;
      c.laps = 0;
      c.lapStartMs = 0;
    });
  }

  /* =========================
     CARS (DOTS)
     ========================= */
  function buildCars() {
    const svg = raceState.svg;
    if (!svg) return;

    const carsLayer = svg.querySelector("#cars-layer");
    if (!carsLayer) return;

    raceState.cars = DRIVERS_2025.map((d, idx) => {
      const ratingCenter = 90;
      const ratingDelta = (d.rating || 85) - ratingCenter;

      let skillFactor = 1 - ratingDelta * 0.006;
      skillFactor = clamp(skillFactor, 0.70, 1.20);

      const targetLapMs = raceState.baseLapMs * skillFactor;
      const speedBase = 1 / targetLapMs;

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "car-dot");
      dot.setAttribute("r", d.team === userTeamKey ? "7" : "6");
      dot.setAttribute("fill", TEAM_COLOR[d.team] || "#ffffff");
      dot.setAttribute("stroke", d.team === userTeamKey ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)");
      dot.setAttribute("stroke-width", "2");
      dot.setAttribute("opacity", "0.98");
      carsLayer.appendChild(dot);

      return {
        ...d,
        index: idx,
        face: `assets/faces/${d.code}.png`,
        teamLogo: `assets/teams/${d.team}.png`,

        laps: 0,
        progress: Math.random(),
        speedBase,

        tyre: 100,
        car: 100,
        engineMode: 2,
        aggrMode: 2,
        ers: 50,
        pushing: false,
        saving: false,

        pitRequest: false,
        pitQueued: false,
        inPit: false,
        pitRemainingMs: 0,

        bestLapMs: null,
        lastLapMs: null,
        lapStartMs: 0,

        finished: false,
        finishTimeMs: null,

        dotEl: dot,

        gridPos: null
      };
    });

    // aplica grid inicial (se existir)
    applyQualyGridInitialProgress(raceState.cars);

    raceState.cars.forEach((c) => (c.lapStartMs = 0));
  }

  function fillUserCards() {
    const userDrivers = getUserDrivers();

    [userCard0, userCard1].forEach((card, i) => {
      const drv = userDrivers[i];
      if (!card || !drv) return;

      const img = card.querySelector(".user-face");
      const nameEl = card.querySelector(".user-name");
      const teamEl = card.querySelector(".user-team");
      const statusEl = card.querySelector(".user-status");

      if (img) {
        img.src = drv.face;
        img.onerror = () => img.removeAttribute("src");
      }
      if (nameEl) nameEl.textContent = drv.name;
      if (teamEl) teamEl.textContent = drv.team.toUpperCase();
      if (statusEl) statusEl.textContent = "Normal";
    });
  }

  function setupUIEvents() {
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = Number(btn.getAttribute("data-speed") || "1");
        speedMultiplier = v === 2 ? 2 : v === 4 ? 4 : 1;
        markActiveSpeed(btn);
      });
    });

    if (elBackLobby) {
      elBackLobby.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }

    document.querySelectorAll(".user-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index") || "0");
        const action = btn.getAttribute("data-action") || "";
        const userDrivers = getUserDrivers();
        const drv = userDrivers[idx];
        if (!drv) return;

        if (action === "pit") {
          drv.pitRequest = true;
          drv.pitQueued = true;
          setUserStatus(idx, "PIT solicitado");
          setBtnState(getUserButton(idx, "pit"), "pending");
          flashBtn(getUserButton(idx, "pit"));
          return;
        }

        if (action === "push") {
          drv.pushing = !drv.pushing;
          if (drv.pushing) drv.saving = false;
          setBtnState(getUserButton(idx, "push"), drv.pushing ? "active" : null);
          setBtnState(getUserButton(idx, "save"), drv.saving ? "active" : null);
          setUserStatus(idx, drv.pushing ? "Ataque" : "Normal");
          return;
        }

        if (action === "save") {
          drv.saving = !drv.saving;
          if (drv.saving) drv.pushing = false;
          setBtnState(getUserButton(idx, "save"), drv.saving ? "active" : null);
          setBtnState(getUserButton(idx, "push"), drv.pushing ? "active" : null);
          setUserStatus(idx, drv.saving ? "Economizar" : "Normal");
          return;
        }

        if (action === "engineUp") { drv.engineMode = clamp(drv.engineMode + 1, 1, 4); flashBtn(btn); return; }
        if (action === "engineDown") { drv.engineMode = clamp(drv.engineMode - 1, 1, 4); flashBtn(btn); return; }

        if (action === "aggrUp") { drv.aggrMode = clamp(drv.aggrMode + 1, 1, 4); flashBtn(btn); return; }
        if (action === "aggrDown") { drv.aggrMode = clamp(drv.aggrMode - 1, 1, 4); flashBtn(btn); return; }

        if (action === "ers") {
          drv.ers = clamp(drv.ers + 18, 0, 100);
          flashBtn(btn);
          setUserStatus(idx, "ERS Boost");
          return;
        }
      });
    });
  }

  /* =========================
     SETUP APPLY (TL/Oficina → Race)
     - Apenas para o time do usuário
     - Efeito controlado (não “reinventa” sensação)
     ========================= */
  function userSetupPaceFactor() {
    if (!setupFactors) return { pace: 1.0, wear: 1.0 };
    const ts = Number(setupFactors.topSpeedFactor ?? 1);
    const gr = Number(setupFactors.gripFactor ?? 1);
    const tw = Number(setupFactors.tyreWearFactor ?? 1);

    const pace = clamp(1.0 + (ts - 1) * 0.55 + (gr - 1) * 0.45, 0.92, 1.06);
    const wear = clamp(tw, 0.75, 1.45);
    return { pace, wear };
  }

  /* =========================
     SIM / TELEMETRIA
     ========================= */
  function updateTelemetryAndWear(car, dtMs) {
    const baseWear = 0.0021;
    const aggrFactor = 0.85 + car.aggrMode * 0.10;
    const pushFactor = car.pushing ? 1.18 : 1.0;
    const saveFactor = car.saving ? 0.88 : 1.0;

    // aplica setup do usuário no desgaste (somente userTeam)
    const us = (car.team === userTeamKey) ? userSetupPaceFactor() : { pace: 1.0, wear: 1.0 };

    const wear =
      (dtMs / 1000) *
      baseWear *
      aggrFactor *
      pushFactor *
      saveFactor *
      staffMods.tyreWearFactor *
      us.wear;

    car.tyre = clamp(car.tyre - wear * 100, 0, 100);

    const carWear = (dtMs / 1000) * 0.00035 * pushFactor;
    car.car = clamp(car.car - carWear * 100, 0, 100);

    const ersDelta = (dtMs / 1000) * (car.pushing ? -3.2 : car.saving ? +2.4 : +0.8);
    car.ers = clamp(car.ers + ersDelta, 0, 100);
  }

  function computeSpeedFactor(car) {
    const engineFactor = 0.88 + car.engineMode * 0.05;
    const tyreFactor = 0.72 + (car.tyre / 100) * 0.35;
    const carFactor = 0.80 + (car.car / 100) * 0.25;

    const noise = (Math.random() - 0.5) * 0.0025 * staffMods.consistencyBoost;

    const push = car.pushing ? 1.02 : 1.0;
    const save = car.saving ? 0.985 : 1.0;

    // aplica setup do usuário no ritmo (somente userTeam)
    const us = (car.team === userTeamKey) ? userSetupPaceFactor() : { pace: 1.0, wear: 1.0 };

    return (engineFactor * tyreFactor * carFactor * push * save + noise) * us.pace;
  }

  function pitTotalTimeMs() {
    const pitLane = 18000 + Math.random() * 6000;
    const service = 2200 + Math.random() * 1200;
    return pitLane + service;
  }

  function handlePit(car, dtMs) {
    if (car.finished) return;

    if (car.inPit) {
      car.pitRemainingMs = Math.max(0, car.pitRemainingMs - dtMs * speedMultiplier);
      if (car.pitRemainingMs <= 0) {
        car.inPit = false;
        car.pitRequest = false;
        car.pitQueued = false;
        car.tyre = 100;
        car.car = clamp(car.car + 6, 0, 100);
      }
    }
  }

  function maybeFinishLap(car, prevProgress, newProgress) {
    if (car.finished) return;

    if (prevProgress < 1 && newProgress >= 1) {
      const lapEndMs = raceState.timeMs;
      const lapMs = lapEndMs - car.lapStartMs;

      car.lastLapMs = lapMs;
      car.bestLapMs = car.bestLapMs == null ? lapMs : Math.min(car.bestLapMs, lapMs);
      car.lapStartMs = lapEndMs;

      // PIT no fechamento de volta (determinístico)
      if (car.pitRequest && !car.inPit) {
        car.inPit = true;

        const base = pitTotalTimeMs();
        let total = base * staffMods.pitTimeFactor;

        const errorRoll = Math.random();
        if (errorRoll < 0.07) total += 1200 + Math.random() * 2200;
        if (errorRoll < 0.02) total += 2500 + Math.random() * 3500;

        car.pitRemainingMs = total;
      }

      car.laps += 1;

      if (car.laps >= raceState.totalLaps) {
        car.finished = true;
        car.finishTimeMs = raceState.timeMs;
      }
    }
  }

  function updateCars(dtMs) {
    raceState.cars.forEach((car) => {
      if (car.finished) return;

      handlePit(car, dtMs);

      const pitFactor = car.inPit ? 0.001 : 1.0;

      updateTelemetryAndWear(car, dtMs);

      const factor = computeSpeedFactor(car) * pitFactor;

      const delta = dtMs * car.speedBase * speedMultiplier * factor;

      let next = car.progress + delta;

      while (next >= 1) {
        maybeFinishLap(car, car.progress, 1);
        next -= 1;
        car.progress = 0;
      }

      car.progress = next;
    });
  }

  function computeOrder() {
    const cars = raceState.cars.slice();

    cars.sort((a, b) => {
      const da = (a.laps || 0) + (a.progress || 0);
      const db = (b.laps || 0) + (b.progress || 0);
      if (db !== da) return db - da;

      if (a.finished && b.finished) return (a.finishTimeMs || 0) - (b.finishTimeMs || 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return 0;
    });

    return cars;
  }

  function renderCars() {
    raceState.cars.forEach((car) => {
      if (!car.dotEl) return;

      const pos = getPositionOnTrack(car.progress);
      car.dotEl.setAttribute("cx", String(pos.x));
      car.dotEl.setAttribute("cy", String(pos.y));
      car.dotEl.setAttribute("opacity", car.inPit ? "0.55" : "0.98");
    });
  }

  function updateUserTelemetry() {
    const userDrivers = getUserDrivers();

    userDrivers.forEach((drv, i) => {
      const tyreEl = document.getElementById(`user-tyre-${i}`);
      const carEl = document.getElementById(`user-car-${i}`);
      const engEl = document.getElementById(`user-engine-${i}`);
      const agEl = document.getElementById(`user-aggr-${i}`);
      const ersEl = document.getElementById(`user-ers-${i}`);

      if (tyreEl) tyreEl.textContent = `${Math.round(drv.tyre)}%`;
      if (carEl) carEl.textContent = `${Math.round(drv.car)}%`;
      if (engEl) engEl.textContent = `M${drv.engineMode}`;
      if (agEl) agEl.textContent = `A${drv.aggrMode}`;
      if (ersEl) ersEl.textContent = `${Math.round(drv.ers)}%`;

      const status = drv.inPit
        ? "No PIT"
        : drv.pitQueued
        ? "PIT pendente"
        : drv.pushing
        ? "Ataque"
        : drv.saving
        ? "Economizar"
        : "Normal";

      setUserStatus(i, status);

      setBtnState(getUserButton(i, "push"), drv.pushing ? "active" : null);
      setBtnState(getUserButton(i, "save"), drv.saving ? "active" : null);
      setBtnState(getUserButton(i, "pit"), drv.pitQueued ? "pending" : null);

      if (!drv.pitQueued && !drv.pitRequest && !drv.inPit) {
        setBtnState(getUserButton(i, "pit"), null);
      }
    });
  }

  function renderHUD(order) {
    if (!elDriversList) return;

    elDriversList.innerHTML = "";

    const leader = order[0];
    const leaderDist = (leader.laps || 0) + (leader.progress || 0);

    order.forEach((car, idx) => {
      const dist = (car.laps || 0) + (car.progress || 0);
      const gap = (leaderDist - dist) * raceState.baseLapMs;

      const card = document.createElement("div");
      card.className = "driver-card" + (idx === 0 ? " leader" : "");

      const posEl = document.createElement("div");
      posEl.className = "driver-pos";
      posEl.textContent = String(idx + 1);

      const teamLogo = document.createElement("img");
      teamLogo.className = "driver-team-logo";
      teamLogo.src = `assets/teams/${car.team}.png`;
      teamLogo.alt = car.team;
      teamLogo.onerror = () => {
        if (car.team === "astonmartin") teamLogo.src = "assets/teams/aston_martin.png";
      };

      const face = document.createElement("img");
      face.className = "driver-face";
      face.src = car.face;
      face.alt = car.name;
      face.onerror = () => face.removeAttribute("src");

      const info = document.createElement("div");
      info.className = "driver-info";
      info.innerHTML = `
        <div class="driver-name-text">${safeText(car.name)}</div>
        <div class="driver-team-text">${safeText(car.team).toUpperCase()}</div>
      `;

      const stats = document.createElement("div");
      stats.className = "driver-stats";

      const lapStr = car.finished
        ? "Final"
        : `V${Math.min(car.laps + 1, raceState.totalLaps)}/${raceState.totalLaps}`;

      const gapStr = idx === 0 ? "LÍDER" : `+${formatMs(Math.max(0, gap))}`;

      stats.innerHTML = `
        <div class="stat-line"><span>${lapStr}</span><span>${gapStr}</span></div>
        <div class="stat-line"><span>Pneu</span><span>${Math.round(car.tyre)}%</span></div>
      `;

      card.appendChild(posEl);
      card.appendChild(teamLogo);
      card.appendChild(face);
      card.appendChild(info);
      card.appendChild(stats);

      elDriversList.appendChild(card);
    });

    if (elLapLabel && leader) {
      const lapNow = leader.finished
        ? raceState.totalLaps
        : clamp(leader.laps + 1, 1, raceState.totalLaps);
      elLapLabel.textContent = `Volta ${lapNow}/${raceState.totalLaps}`;
    }

    updateUserTelemetry();
  }

  function allFinished() { return raceState.cars.every((c) => c.finished); }

  function buildPodiumModal(podium) {
    if (!elPodiumHost) return;

    elPodiumHost.style.display = "block";
    elPodiumHost.className = "podium-modal";

    const podiumCards = podium.slice(0, 3).map((c, idx) => {
      const cls = idx === 0 ? "first" : idx === 1 ? "second" : "third";
      const pos = idx === 0 ? "1º" : idx === 1 ? "2º" : "3º";

      return `
        <div class="podium-card ${cls}">
          <div class="podium-pos">${pos}</div>
          <img class="podium-face" src="${c.face}" onerror="this.removeAttribute('src')" alt="${safeText(c.name)}"/>
          <div class="podium-name">${safeText(c.name)}</div>
          <div class="podium-team">${safeText(c.team).toUpperCase()}</div>
          <div style="margin-top:6px;">
            <img src="assets/teams/${c.team}.png"
                 onerror="if('${c.team}'==='astonmartin'){this.src='assets/teams/aston_martin.png'}"
                 alt="${safeText(c.team)}"
                 style="height:18px; width:auto; object-fit:contain; opacity:.95;" />
          </div>
        </div>
      `;
    });

    elPodiumHost.innerHTML = `
      <div class="podium-content">
        <h2>🏁 Fim da Corrida — Pódio</h2>
        <div class="podium-cards">
          ${podiumCards.join("")}
        </div>
        <button class="podium-close" id="podiumCloseBtn">FECHAR</button>
      </div>
    `;

    const closeBtn = document.getElementById("podiumCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        elPodiumHost.className = "podium-modal hidden";
        elPodiumHost.style.display = "none";
        elPodiumHost.innerHTML = "";
      });
    }
  }

  function maybeEndRace() {
    if (raceState.finished) return;
    if (!allFinished()) return;

    raceState.finished = true;

    const order = computeOrder();
    const podium = order.slice(0, 3);

    if (!raceState.podiumShown) {
      raceState.podiumShown = true;
      buildPodiumModal(podium);
    }
  }

  function gameLoop(ts) {
    if (!raceState.lastTs) raceState.lastTs = ts;
    let dt = ts - raceState.lastTs;
    raceState.lastTs = ts;

    dt = clamp(dt, 0, TICK_DT_CAP_MS);
    raceState.timeMs += dt * speedMultiplier;

    updateCars(dt);
    const order = computeOrder();

    renderCars();
    renderHUD(order);

    maybeEndRace();

    if (!raceState.finished) requestAnimationFrame(gameLoop);
  }

  async function initRace() {
    if (!elTrackContainer) {
      console.error("race.html sem #track-container");
      return;
    }

    await loadTrackSvg(trackKey);

    buildCars();
    fillUserCards();
    setupUIEvents();

    speedMultiplier = 1;
    if (speedBtns && speedBtns.length) markActiveSpeed(speedBtns[0]);

    updateUserTelemetry();

    requestAnimationFrame(gameLoop);
  }

  window.addEventListener("DOMContentLoaded", initRace);
})();
