// ==========================================================
// F1 MANAGER 2025 – RACE.JS (SVG + Tower + Pit + Staff/Setup Link)
// Mantém o visual/HTML atual. Sem depender de import/module.
// ==========================================================

(() => {
  "use strict";

  // ------------------------------
  // STORAGE / LINK ENTRE SISTEMAS
  // ------------------------------
  const SEASON_KEY = "f1m2025_season_state";      // opcional
  const CAREER_KEY = "f1m2025_career_v61";        // EconomySystem.js
  const LAST_QUALY_KEY = "f1m2025_last_qualy";    // Qualifying salva aqui
  const USER_TEAM_KEY = "f1m2025_user_team";      // setado no lobby/quali/practice

  // Oficina (setup)
  const SETUP_KEY = (teamKey) => `F1M_SETUP_${String(teamKey || "ferrari").toLowerCase()}`;
  const SETUP_IMPACT_KEY = (teamKey) => `F1M_SETUP_IMPACT_${String(teamKey || "ferrari").toLowerCase()}`;

  // ------------------------------
  // PISTA -> TEMPO BASE (ms)
  // ------------------------------
  const TRACK_BASE_LAP_TIME_MS = {
    australia: 80000,
    bahrain: 91000,
    saudi: 88000,
    jeddah: 88000,
    japan: 82000,
    suzuka: 82000,
    china: 93000,
    miami: 88000,
    imola: 76000,
    monaco: 72000,
    canada: 77000,
    spain: 78000,
    austria: 65000,
    britain: 83000,
    silverstone: 83000,
    hungary: 77000,
    belgium: 115000,
    spa: 115000,
    netherlands: 74000,
    zandvoort: 74000,
    monza: 78000,
    singapore: 100000,
    austin: 89000,
    mexico: 77000,
    brazil: 70000,
    las_vegas: 88000,
    qatar: 87000,
    abu_dhabi: 84000
  };

  // ------------------------------
  // DRIVERS FALLBACK (se qualy não existir)
  // (Mantenha coerente com seus assets/faces/XXX.png)
  // ------------------------------
  const DRIVERS_FALLBACK = [
    { code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300" },
    { code: "PER", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull Racing", rating: 92, color: "#ffb300" },

    { code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000" },
    { code: "SAI", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000" },

    { code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff" },
    { code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 92, color: "#00e5ff" },

    { code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 93, color: "#ff6f00" },
    { code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 90, color: "#ff6f00" },

    { code: "ALO", name: "Fernando Alonso", teamKey: "aston_martin", teamName: "Aston Martin", rating: 92, color: "#00c853" },
    { code: "STR", name: "Lance Stroll", teamKey: "aston_martin", teamName: "Aston Martin", rating: 86, color: "#00c853" },

    { code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#2979ff" },
    { code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 89, color: "#2979ff" },

    { code: "ALB", name: "Alexander Albon", teamKey: "williams", teamName: "Williams", rating: 88, color: "#64b5f6" },
    { code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 84, color: "#64b5f6" },

    { code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", rating: 88, color: "#90caf9" },
    { code: "RIC", name: "Daniel Ricciardo", teamKey: "rb", teamName: "RB", rating: 87, color: "#90caf9" },

    { code: "HUL", name: "Nico Hülkenberg", teamKey: "haas", teamName: "Haas", rating: 87, color: "#bdbdbd" },
    { code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 86, color: "#bdbdbd" },

    { code: "ZHO", name: "Guanyu Zhou", teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03" },
    { code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03" }
  ];

  // ------------------------------
  // HELPERS
  // ------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function safeText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(txt ?? "");
  }

  function formatGap(ms) {
    if (!isFinite(ms) || ms <= 0) return "+0.000";
    return `+${(ms / 1000).toFixed(3)}`;
  }

  function readJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function getEconomyState() {
    try {
      if (window.F1MEconomy && typeof window.F1MEconomy.getState === "function") {
        return window.F1MEconomy.getState();
      }
    } catch {}
    return readJSON(CAREER_KEY, null);
  }

  function getStaffBonuses() {
    const econ = getEconomyState() || {};
    const staff = econ.staff || {};

    const mechanics = Number(staff?.mechanics?.level ?? 50);
    const engineering = Number(staff?.engineering?.level ?? 50);
    const marketing = Number(staff?.marketing?.level ?? 50);

    const pitMul = clamp(1.08 - (mechanics / 100) * 0.16, 0.88, 1.10);
    const lapMul = clamp(1.03 - (engineering / 100) * 0.06, 0.94, 1.05);
    const tyreWearMul = clamp(1.12 - (engineering / 100) * 0.20, 0.88, 1.15);

    return { pitMul, lapMul, tyreWearMul, marketing };
  }

  function getSetupImpact(userTeamKey) {
    const impact = readJSON(SETUP_IMPACT_KEY(userTeamKey), null);
    const performanceDelta = Number(impact?.performanceDelta ?? impact?.perf ?? impact?.performance ?? 0);
    const tyreDelta = Number(impact?.tyreDelta ?? impact?.tyres ?? 0);
    const engineDelta = Number(impact?.engineDelta ?? impact?.engine ?? 0);
    return {
      lapMul: clamp(1 - performanceDelta, 0.90, 1.10),
      tyreWearMul: clamp(1 + tyreDelta, 0.85, 1.20),
      engineStressMul: clamp(1 + engineDelta, 0.85, 1.30)
    };
  }

  function resolveTeamColor(teamKey, fallbackColor) {
    return fallbackColor || "#ffffff";
  }

  // ------------------------------
  // ESTADO DE CORRIDA
  // ------------------------------
  const state = {
    track: "australia",
    gp: "GP 2025",
    userTeam: "ferrari",

    running: true,
    speed: 1,
    lastFrame: null,
    sessionTimeMs: 0,

    totalLaps: 14,
    weather: { type: "dry", trackTempC: 26 },

    safetyCar: { active: false, remainingMs: 0 },

    pathPoints: [],
    visuals: [],

    drivers: [],
  };

  // ------------------------------
  // DOM refs
  // ------------------------------
  const elTrackContainer = document.getElementById("track-container");
  const elDriversList = document.getElementById("drivers-list");
  const elSpeedButtons = Array.from(document.querySelectorAll(".speed-btn"));
  const elUserCards = [
    document.getElementById("user-driver-card-0"),
    document.getElementById("user-driver-card-1")
  ];
  const podiumModal = document.getElementById("podium-modal");

  // ------------------------------
  // INIT
  // ------------------------------
  window.addEventListener("DOMContentLoaded", initRace);

  async function initRace() {
    const params = new URLSearchParams(location.search);
    state.track = (params.get("track") || "australia").toLowerCase();
    state.gp = params.get("gp") || "GP da Austrália 2025";
    state.userTeam = (params.get("userTeam") || localStorage.getItem(USER_TEAM_KEY) || "ferrari").toLowerCase();
    localStorage.setItem(USER_TEAM_KEY, state.userTeam);

    safeText("race-title-gp", state.gp);
    safeText("race-weather", "Clima: Seco");
    safeText("race-track-temp", `Pista: ${state.weather.trackTempC}°C`);
    safeText("race-lap", "Volta 1");

    injectRaceStyles();

    setupSpeedControls();

    state.drivers = buildDriversFromQualyOrFallback();
    fillUserCards();

    await loadTrackSvg(state.track);
    state.lastFrame = nowMs();
    requestAnimationFrame(loop);

    bindUserButtons();
  }

  function injectRaceStyles() {
    if (document.getElementById("race-extra-styles")) return;
    const s = document.createElement("style");
    s.id = "race-extra-styles";
    s.textContent = `
      .speed-btn.active{ outline:2px solid rgba(255,255,255,0.25); }
      .user-btn.active{ filter:brightness(1.15); }
      #podium-modal{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.65); z-index:999; }
      #podium-modal.hidden{ display:none; }
      #podium-modal .podium-card{ width:min(560px,92vw); border-radius:16px; padding:14px 14px 12px; background:rgba(10,14,28,0.92); border:1px solid rgba(255,255,255,0.12); color:#fff; }
      #podium-modal .podium-list{ display:grid; gap:10px; margin-top:10px; }
      #podium-modal .podium-item{ display:grid; grid-template-columns:52px 52px 1fr; grid-template-rows:auto auto; column-gap:10px; align-items:center; padding:8px; border-radius:14px; background:rgba(255,255,255,0.06); }
      #podium-modal .podium-pos{ grid-row:1 / span 2; font-size:18px; font-weight:700; text-align:center; }
      #podium-modal .podium-face{ width:52px; height:52px; object-fit:cover; border-radius:12px; grid-row:1 / span 2; }
      #podium-modal .podium-name{ font-weight:700; }
      #podium-modal .podium-team{ opacity:0.85; font-size:12px; }
      #podium-modal .podium-btn{ margin-top:12px; width:100%; padding:10px 12px; border-radius:12px; background:#ffffff; border:none; font-weight:700; cursor:pointer; }
    `;
    document.head.appendChild(s);
  }

  function buildDriversFromQualyOrFallback() {
    const lastQualy = readJSON(LAST_QUALY_KEY, null);

    let baseList = [];
    if (lastQualy && Array.isArray(lastQualy.grid) && lastQualy.grid.length) {
      baseList = lastQualy.grid
        .slice()
        .sort((a, b) => Number(a.position || 999) - Number(b.position || 999))
        .map((g) => ({
          code: (g.id ? String(g.id).slice(0, 3).toUpperCase() : "") || (g.code || ""),
          name: g.name || g.id || "Piloto",
          teamKey: (g.teamKey || "ferrari").toLowerCase(),
          teamName: g.teamName || g.teamKey || "Equipe",
          rating: Number(g.rating || 85),
          color: g.color
        }));
    }

    if (!baseList.length || baseList.length < 10) {
      baseList = DRIVERS_FALLBACK.slice();
    }

    const list = baseList.slice(0, 20);
    while (list.length < 20) list.push({ ...DRIVERS_FALLBACK[list.length % DRIVERS_FALLBACK.length] });

    const staff = getStaffBonuses();
    const setupImpact = getSetupImpact(state.userTeam);

    return list.map((d, idx) => {
      const rating = clamp(Number(d.rating || 85), 40, 99);
      const baseLap = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;

      const ratingDelta = rating - 90;
      let skillMul = 1 - ratingDelta * 0.006;
      skillMul = clamp(skillMul, 0.78, 1.22);

      const isUserTeam = String(d.teamKey).toLowerCase() === state.userTeam;
      const lapMul = staff.lapMul * (isUserTeam ? setupImpact.lapMul : 1);

      const lapTarget = clamp(baseLap * skillMul * lapMul, 58000, 140000);

      return {
        id: `${d.code || "DRV"}_${idx}`,
        code: (d.code || "DRV").toUpperCase(),
        name: d.name || d.code || "Piloto",
        teamKey: String(d.teamKey || "ferrari").toLowerCase(),
        teamName: d.teamName || d.teamKey || "Equipe",
        color: resolveTeamColor(d.teamKey, d.color || "#ffffff"),

        gridPos: idx + 1,
        position: idx + 1,

        progress: clamp(0.02 * idx, 0, 0.98),
        laps: 0,

        lapTargetMs: lapTarget,
        lapAccumMs: 0,
        bestLapMs: 0,
        lastLapMs: 0,

        tyre: { compound: "M", wear: 0.02 },
        engine: { mode: "NORMAL", stress: 0.02 },
        aggression: "NORMAL",
        ers: 0.65,

        pit: { requested: false, inPit: false, remainingMs: 0, count: 0 },

        isUserTeam: isUserTeam
      };
    });
  }

  // ------------------------------
  // SVG TRACK
  // ------------------------------
  async function loadTrackSvg(trackKey) {
    if (!elTrackContainer) return;

    elTrackContainer.innerHTML = "";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "track-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 1000 600");
    elTrackContainer.appendChild(svg);

    let text = "";
    try {
      const resp = await fetch(`assets/tracks/${trackKey}.svg`, { cache: "no-store" });
      text = await resp.text();
    } catch (e) {
      console.error("Falha ao carregar SVG da pista:", e);
      return;
    }

    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const path = doc.querySelector("path");
    if (!path) {
      console.error("SVG da pista sem <path>.");
      return;
    }

    const len = path.getTotalLength();
    const samples = 450;
    const raw = [];
    for (let i = 0; i < samples; i++) {
      const p = path.getPointAtLength((len * i) / samples);
      raw.push({ x: p.x, y: p.y });
    }

    const xs = raw.map(p => p.x);
    const ys = raw.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = (maxX - minX) || 1;
    const h = (maxY - minY) || 1;

    state.pathPoints = raw.map(p => ({
      x: ((p.x - minX) / w) * 1000,
      y: ((p.y - minY) / h) * 600
    }));

    const trackOuter = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    trackOuter.setAttribute("points", state.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
    trackOuter.setAttribute("fill", "none");
    trackOuter.setAttribute("stroke", "#555");
    trackOuter.setAttribute("stroke-width", "18");
    trackOuter.setAttribute("stroke-linecap", "round");
    trackOuter.setAttribute("stroke-linejoin", "round");
    svg.appendChild(trackOuter);

    const trackInner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    trackInner.setAttribute("points", state.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
    trackInner.setAttribute("fill", "none");
    trackInner.setAttribute("stroke", "#aaaaaa");
    trackInner.setAttribute("stroke-width", "6");
    trackInner.setAttribute("stroke-linecap", "round");
    trackInner.setAttribute("stroke-linejoin", "round");
    svg.appendChild(trackInner);

    const flagP = state.pathPoints[0];
    const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    flag.setAttribute("x", flagP.x);
    flag.setAttribute("y", flagP.y - 10);
    flag.setAttribute("fill", "#ffffff");
    flag.setAttribute("font-size", "18");
    flag.setAttribute("text-anchor", "middle");
    flag.textContent = "🏁";
    svg.appendChild(flag);

    for (let i = 0; i < state.pathPoints.length; i += 10) {
      const p = state.pathPoints[i];
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", p.x);
      c.setAttribute("cy", p.y);
      c.setAttribute("r", "2.5");
      c.setAttribute("fill", "#ffffff");
      c.setAttribute("opacity", "0.35");
      svg.appendChild(c);
    }

    state.visuals = state.drivers.map((d) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      body.setAttribute("r", "6.5");
      body.setAttribute("fill", d.color || "#ffffff");
      body.setAttribute("stroke", "#000");
      body.setAttribute("stroke-width", "1.4");
      g.appendChild(body);

      if (d.isUserTeam) {
        const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        tri.setAttribute("points", "0,-11 7,0 -7,0");
        tri.setAttribute("fill", d.color || "#ffffff");
        tri.setAttribute("opacity", "0.95");
        g.appendChild(tri);
      }

      svg.appendChild(g);
      return { id: d.id, g };
    });
  }

  function getPosOnTrack(progress) {
    const pts = state.pathPoints;
    if (!pts.length) return { x: 0, y: 0 };
    const n = pts.length;
    const idxF = progress * n;
    let i0 = Math.floor(idxF) % n;
    let i1 = (i0 + 1) % n;
    const t = idxF - Math.floor(idxF);
    const p0 = pts[i0], p1 = pts[i1];
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
  }

  // ------------------------------
  // LOOP
  // ------------------------------
  function loop(ts) {
    if (state.lastFrame == null) state.lastFrame = ts;
    const dt = (ts - state.lastFrame) * (state.speed || 1);
    state.lastFrame = ts;

    if (state.running) {
      state.sessionTimeMs += dt;
      maybeTriggerRandomEvents(dt);
      updateDrivers(dt);
      updatePositionsAndUI();
      render();
      checkFinish();
    }

    requestAnimationFrame(loop);
  }

  function maybeTriggerRandomEvents(dt) {
    if (!state.safetyCar.active) {
      const chancePerMs = 0.0000007;
      if (Math.random() < chancePerMs * dt) {
        state.safetyCar.active = true;
        state.safetyCar.remainingMs = 18000 + Math.random() * 12000;
      }
    } else {
      state.safetyCar.remainingMs -= dt;
      if (state.safetyCar.remainingMs <= 0) {
        state.safetyCar.active = false;
        state.safetyCar.remainingMs = 0;
      }
    }

    if (state.weather.type === "dry") {
      const rainChance = 0.00000035;
      if (Math.random() < rainChance * dt) {
        state.weather.type = "rain";
        safeText("race-weather", "Clima: Chuva");
      }
    } else {
      const clearChance = 0.00000022;
      if (Math.random() < clearChance * dt) {
        state.weather.type = "dry";
        safeText("race-weather", "Clima: Seco");
      }
    }
  }

  function updateDrivers(dt) {
    const staff = getStaffBonuses();
    const setupImpact = getSetupImpact(state.userTeam);

    const scMul = state.safetyCar.active ? 0.45 : 1.0;
    const wetMul = state.weather.type === "rain" ? 1.12 : 1.0;

    for (const d of state.drivers) {
      if (d.pit.inPit) {
        d.pit.remainingMs -= dt;
        d.ers = clamp(d.ers + 0.00006 * dt, 0, 1);
        if (d.pit.remainingMs <= 0) {
          d.pit.inPit = false;
          d.pit.remainingMs = 0;
          d.pit.requested = false;
          d.tyre.wear = clamp(d.tyre.wear * 0.35, 0, 1);
        }
        continue;
      }

      const willPitThisLap = d.pit.requested;

      const engineMul =
        d.engine.mode === "PUSH" ? 0.985 :
        d.engine.mode === "SAVE" ? 1.015 : 1.0;

      const aggrMul =
        d.aggression === "ATTACK" ? 0.990 :
        d.aggression === "SAVE" ? 1.012 : 1.0;

      const tyreSlow = 1 + clamp(d.tyre.wear, 0, 1) * 0.06;
      const teamLapMul = d.isUserTeam ? setupImpact.lapMul : 1.0;

      const lapMs = d.lapTargetMs * staff.lapMul * teamLapMul * wetMul * tyreSlow * engineMul * aggrMul;
      const noise = 1 + (Math.random() - 0.5) * (d.isUserTeam ? 0.030 : 0.040);

      const deltaProg = (dt / Math.max(52000, lapMs)) * scMul * noise;
      d.progress += deltaProg;
      d.lapAccumMs += dt;

      const baseWearPerMs = 0.000000018;
      const wearMul =
        (d.isUserTeam ? setupImpact.tyreWearMul : 1.0) *
        staff.tyreWearMul *
        (d.aggression === "ATTACK" ? 1.25 : d.aggression === "SAVE" ? 0.85 : 1.0) *
        (state.weather.type === "rain" ? 1.08 : 1.0);

      d.tyre.wear = clamp(d.tyre.wear + baseWearPerMs * wearMul * dt, 0, 1);

      const stressBase = 0.000000010;
      const stressMul =
        (d.isUserTeam ? setupImpact.engineStressMul : 1.0) *
        (d.engine.mode === "PUSH" ? 1.45 : d.engine.mode === "SAVE" ? 0.70 : 1.0);
      d.engine.stress = clamp(d.engine.stress + stressBase * stressMul * dt, 0, 1);

      if (d.engine.mode === "PUSH") d.ers = clamp(d.ers - 0.00008 * dt, 0, 1);
      else d.ers = clamp(d.ers + 0.00003 * dt, 0, 1);

      if (d.progress >= 1) {
        d.progress -= 1;
        d.laps += 1;

        d.lastLapMs = d.lapAccumMs > 0 ? d.lapAccumMs : lapMs;
        if (!d.bestLapMs || d.lastLapMs < d.bestLapMs) d.bestLapMs = d.lastLapMs;
        d.lapAccumMs = 0;

        if (willPitThisLap) startPitStop(d, staff.pitMul);
      }
    }
  }

  function startPitStop(driver, pitMulFromStaff) {
    driver.pit.inPit = true;
    driver.pit.count += 1;

    const base = 23500;
    const variance = (Math.random() - 0.5) * 2600;
    const weatherPenalty = state.weather.type === "rain" ? 900 : 0;

    const setupImpact = getSetupImpact(state.userTeam);
    const userBonus = driver.isUserTeam ? clamp((1 - setupImpact.lapMul) * 500, -400, 400) : 0;

    const pitTime = clamp((base + variance + weatherPenalty - userBonus) * pitMulFromStaff, 18500, 33000);
    driver.pit.remainingMs = pitTime;

    flashToast(`${driver.code}: PIT STOP (${(pitTime / 1000).toFixed(1)}s)`);
  }

  // ------------------------------
  // POSIÇÕES / UI
  // ------------------------------
  function updatePositionsAndUI() {
    const ordered = state.drivers
      .slice()
      .sort((a, b) => (b.laps + b.progress) - (a.laps + a.progress));

    ordered.forEach((d, i) => { d.position = i + 1; });

    const leader = ordered[0];
    const lapDisplay = clamp((leader?.laps ?? 0) + 1, 1, state.totalLaps);
    safeText("race-lap", `Volta ${lapDisplay}`);

    renderTower(ordered);
    updateTelemetry(ordered);
  }

  function renderTower(ordered) {
    if (!elDriversList) return;

    const baseLap = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;
    const leader = ordered[0];
    const leaderDist = (leader?.laps ?? 0) + (leader?.progress ?? 0);

    elDriversList.innerHTML = "";

    ordered.forEach((d) => {
      const row = document.createElement("div");
      row.className = "driver-card";

      const dist = d.laps + d.progress;
      const gapMs = Math.max(0, (leaderDist - dist) * baseLap);

      const status = d.pit.inPit ? "PIT" : (state.safetyCar.active ? "SC" : "");

      row.innerHTML = `
        <div class="driver-pos">${d.position}</div>
        <img class="driver-face" src="assets/faces/${d.code}.png" onerror="this.src='assets/faces/default.png'" />
        <div class="driver-info">
          <div class="driver-name-text">${d.name}</div>
          <div class="driver-team-text">${d.teamName}</div>
        </div>
        <div class="driver-stats">
          <div class="stat-line"><span>${d.position === 1 ? "LÍDER" : formatGap(gapMs)}</span></div>
          <div class="stat-line"><span>${status}</span></div>
        </div>
      `;

      if (d.isUserTeam) row.classList.add("user-team-row");
      elDriversList.appendChild(row);
    });
  }

  function fillUserCards() {
    const teamDrivers = state.drivers.filter(d => d.teamKey === state.userTeam).slice(0, 2);
    teamDrivers.forEach((d, i) => {
      const card = elUserCards[i];
      if (!card) return;
      const face = card.querySelector(".user-face");
      const name = card.querySelector(".user-name");
      const team = card.querySelector(".user-team");
      const logo = card.querySelector(".user-logo");

      if (face) {
        face.src = `assets/faces/${d.code}.png`;
        face.onerror = () => { face.onerror = null; face.src = "assets/faces/default.png"; };
      }
      if (name) name.textContent = d.name;
      if (team) team.textContent = d.teamName;
      if (logo) logo.src = `assets/teams/${d.teamKey}.png`;
    });
  }

  function updateTelemetry(ordered) {
    const user = ordered.find(d => d.isUserTeam) || state.drivers.find(d => d.isUserTeam);
    if (!user) return;

    safeText("tele-speed", `${Math.round(310 * (1 - user.tyre.wear * 0.15) * (state.safetyCar.active ? 0.55 : 1))} km/h`);
    safeText("tele-throttle", `${user.engine.mode === "SAVE" ? 68 : user.engine.mode === "PUSH" ? 96 : 82}%`);
    safeText("tele-brake", `${user.aggression === "ATTACK" ? 74 : user.aggression === "SAVE" ? 58 : 66}%`);
    safeText("tele-grip", `${Math.round(100 - user.tyre.wear * 60)}%`);
    safeText("tele-tyre-temp", `${Math.round(88 + (state.weather.type === "rain" ? -4 : 2) + user.tyre.wear * 6)}°C`);
    safeText("tele-tyre-wear", `${Math.round(user.tyre.wear * 100)}%`);
    safeText("tele-fuel", `${Math.round(72 - (user.laps * (72 / state.totalLaps)))}%`);
    safeText("tele-engine-temp", `${Math.round(104 + user.engine.stress * 35)}°C`);
    safeText("tele-ers", `${Math.round(user.ers * 100)}%`);
    safeText("tele-delta", state.safetyCar.active ? "+SC" : (state.weather.type === "rain" ? "+WET" : "-"));
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  function render() {
    if (!state.visuals.length || !state.pathPoints.length) return;

    for (const v of state.visuals) {
      const d = state.drivers.find(x => x.id === v.id);
      if (!d) continue;

      const pos = getPosOnTrack(d.progress);
      const jitter = (d.position % 3) * 1.2;
      v.g.setAttribute("transform", `translate(${pos.x + jitter},${pos.y - jitter})`);
    }
  }

  // ------------------------------
  // SPEED CONTROLS + UI FEEDBACK
  // ------------------------------
  function setupSpeedControls() {
    if (!elSpeedButtons.length) return;
    elSpeedButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const sp = Number(btn.dataset.speed || "1") || 1;
        state.speed = sp;

        elSpeedButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        flashToast(`Velocidade: ${sp}x`);
      });
    });

    const first = elSpeedButtons.find(b => Number(b.dataset.speed || "1") === 1);
    if (first) first.classList.add("active");
  }

  function bindUserButtons() {
    elUserCards.forEach((card, idx) => {
      if (!card) return;
      const btnPit = card.querySelector(".btn-pit");
      const btnSave = card.querySelector(".btn-save");
      const btnAttack = card.querySelector(".btn-attack");

      const driver = state.drivers.filter(d => d.isUserTeam)[idx];
      if (!driver) return;

      if (btnPit) {
        btnPit.addEventListener("click", () => {
          driver.pit.requested = true;
          pulseButton(btnPit);
          flashToast(`${driver.code}: Pit solicitado`);
        });
      }

      if (btnSave) {
        btnSave.addEventListener("click", () => {
          driver.engine.mode = "SAVE";
          driver.aggression = "SAVE";
          setModeButtons(card, "save");
          flashToast(`${driver.code}: Economizar`);
        });
      }

      if (btnAttack) {
        btnAttack.addEventListener("click", () => {
          driver.engine.mode = "PUSH";
          driver.aggression = "ATTACK";
          setModeButtons(card, "attack");
          flashToast(`${driver.code}: Ataque`);
        });
      }

      setModeButtons(card, "normal");
    });
  }

  function setModeButtons(card, mode) {
    const btnSave = card.querySelector(".btn-save");
    const btnAttack = card.querySelector(".btn-attack");
    if (!btnSave || !btnAttack) return;

    btnSave.classList.toggle("active", mode === "save");
    btnAttack.classList.toggle("active", mode === "attack");
  }

  function pulseButton(btn) {
    if (!btn) return;
    btn.classList.add("active");
    setTimeout(() => btn.classList.remove("active"), 220);
  }

  let toastTimer = null;
  function flashToast(msg) {
    const host = document.querySelector(".race-header");
    if (!host) return;

    let el = document.getElementById("race-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "race-toast";
      el.style.position = "absolute";
      el.style.top = "56px";
      el.style.left = "12px";
      el.style.zIndex = "50";
      el.style.padding = "8px 10px";
      el.style.borderRadius = "10px";
      el.style.background = "rgba(0,0,0,0.55)";
      el.style.border = "1px solid rgba(255,255,255,0.12)";
      el.style.backdropFilter = "blur(8px)";
      el.style.fontSize = "12px";
      el.style.color = "#fff";
      host.appendChild(el);
    }

    el.textContent = msg;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el) el.textContent = "";
    }, 1500);
  }

  // ------------------------------
  // FIM DE CORRIDA + PÓDIO
  // ------------------------------
  function checkFinish() {
    const leader = state.drivers
      .slice()
      .sort((a, b) => (b.laps + b.progress) - (a.laps + a.progress))[0];

    if (!leader) return;

    if (leader.laps >= state.totalLaps) {
      state.running = false;
      showPodium();
    }
  }

  function showPodium() {
    const ordered = state.drivers
      .slice()
      .sort((a, b) => (b.laps + b.progress) - (a.laps + a.progress));

    const top3 = ordered.slice(0, 3);

    if (!podiumModal) return;

    podiumModal.innerHTML = `
      <div class="podium-card">
        <h2>🏁 Corrida Encerrada</h2>
        <div class="podium-list">
          ${top3.map((d, i) => `
            <div class="podium-item">
              <div class="podium-pos">${i + 1}º</div>
              <img class="podium-face" src="assets/faces/${d.code}.png" onerror="this.src='assets/faces/default.png'"/>
              <div class="podium-name">${d.name}</div>
              <div class="podium-team">${d.teamName}</div>
            </div>
          `).join("")}
        </div>
        <button class="podium-btn" id="podium-close-btn">Fechar</button>
      </div>
    `;
    podiumModal.classList.remove("hidden");

    const btn = document.getElementById("podium-close-btn");
    if (btn) btn.onclick = () => podiumModal.classList.add("hidden");
  }

  // ------------------------------
  // EXTRAS: botão voltar lobby (já existe no HTML)
  // ------------------------------
  window.goLobby = function() {
    location.href = "index.html";
  };

})();
