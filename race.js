// ==========================================================
// F1 MANAGER 2025 – RACE.JS (v6.1) — TRAJETO VISÍVEL (linha)
// - Mantém: SVG real + pathPoints + carros + rAF + controles
// - NOVO: desenha uma polyline ligando os pathPoints
// ==========================================================

(() => {
  "use strict";

  // ------------------------------
  // HELPERS
  // ------------------------------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);

  function safeSetText(id, txt) {
    const el = $(id);
    if (el) el.textContent = txt;
  }

  function fmtLap(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "--:--.---";
    const total = Math.floor(ms);
    const m = Math.floor(total / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const x = total % 1000;
    return `${m}:${String(s).padStart(2, "0")}.${String(x).padStart(3, "0")}`;
  }

  function ensureSvgResponsive(svg) {
    if (!svg) return;
    if (!svg.getAttribute("viewBox")) {
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h) svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function findBestTrackPath(svg) {
    const selectors = [
      "#raceLine",
      "#trackPath",
      "#mainPath",
      "path.racing-line",
      "path.race-line",
      "path.track-path",
      "path.line",
      "path"
    ];
    for (const sel of selectors) {
      const p = svg.querySelector(sel);
      if (p && p.tagName && p.tagName.toLowerCase() === "path") {
        try {
          const len = p.getTotalLength();
          if (Number.isFinite(len) && len > 50) return p;
        } catch {}
      }
    }
    const all = Array.from(svg.querySelectorAll("path"));
    let best = null, bestLen = 0;
    for (const p of all) {
      try {
        const len = p.getTotalLength();
        if (Number.isFinite(len) && len > bestLen) { bestLen = len; best = p; }
      } catch {}
    }
    return best;
  }

  function buildPathPoints(path, samples = 1800) {
    let total = 0;
    try { total = path.getTotalLength(); } catch { return []; }
    if (!Number.isFinite(total) || total <= 0) return [];
    const pts = [];
    const step = total / samples;
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength(i * step);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  function angleBetween(a, b) {
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }

  // ------------------------------
  // PARAMS
  // ------------------------------
  const params = new URLSearchParams(window.location.search);
  const TRACK_KEY = (params.get("track") || "australia").toLowerCase();
  const GP_NAME = (params.get("gp") || "GP da Austrália 2025");
  const USER_TEAM = (params.get("userTeam") || localStorage.getItem("f1m2025_user_team") || "ferrari").toLowerCase();

  // ------------------------------
  // BASE (logos)
  // ------------------------------
  const TEAM_LOGO = {
    ferrari: "assets/logos/ferrari.png",
    mercedes: "assets/logos/mercedes.png",
    redbull: "assets/logos/redbull.png",
    mclaren: "assets/logos/mclaren.png",
    aston: "assets/logos/aston.png",
    alpine: "assets/logos/alpine.png",
    williams: "assets/logos/williams.png",
    haas: "assets/logos/haas.png",
    sauber: "assets/logos/sauber.png",
    racingbulls: "assets/logos/racingbulls.png"
  };

  const TRACK_BASE_LAP_MS = {
    australia: 92000, bahrain: 95000, saudi: 89000, japan: 91000, china: 96000,
    miami: 93000, imola: 93000, monaco: 74000, canada: 90000, spain: 94000,
    austria: 82000, britain: 88000, hungary: 78000, belgium: 105000, netherlands: 86000,
    monza: 80000, azerbaijan: 103000, singapore: 104000, usa: 98000, mexico: 97000,
    brazil: 93000, lasvegas: 96000, qatar: 90000, abudhabi: 94000
  };

  const WEATHER = {
    dry:       { label: "Seco",       grip: 1.00, tyreWear: 1.00 },
    lightrain: { label: "Chuva fraca", grip: 0.93, tyreWear: 1.10 },
    rain:      { label: "Chuva",      grip: 0.88, tyreWear: 1.18 }
  };

  const RACE_MODES = {
    save:   { pace: 0.94, tyreWear: 0.85, ersRegen: 8 },
    normal: { pace: 1.00, tyreWear: 1.00, ersRegen: 6 },
    push:   { pace: 1.05, tyreWear: 1.18, ersRegen: 4 }
  };

  // ------------------------------
  // DRIVERS (mínimo estável)
  // ------------------------------
  const DRIVERS_2025 = [
    { id:"verstappen", name:"Max Verstappen", teamKey:"redbull", teamName:"Red Bull", rating:98, color:"#ffb300", face:"assets/faces/VER.png" },
    { id:"perez",      name:"Sergio Pérez",   teamKey:"redbull", teamName:"Red Bull", rating:94, color:"#ffb300", face:"assets/faces/PER.png" },

    { id:"leclerc",    name:"Charles Leclerc",teamKey:"ferrari", teamName:"Ferrari",  rating:95, color:"#ff2a2a", face:"assets/faces/LEC.png" },
    { id:"sainz",      name:"Carlos Sainz",   teamKey:"ferrari", teamName:"Ferrari",  rating:93, color:"#ff2a2a", face:"assets/faces/SAI.png" },

    { id:"hamilton",   name:"Lewis Hamilton", teamKey:"mercedes",teamName:"Mercedes", rating:95, color:"#00e5ff", face:"assets/faces/HAM.png" },
    { id:"russell",    name:"George Russell", teamKey:"mercedes",teamName:"Mercedes", rating:93, color:"#00e5ff", face:"assets/faces/RUS.png" },

    { id:"norris",     name:"Lando Norris",   teamKey:"mclaren", teamName:"McLaren",  rating:94, color:"#ff8c00", face:"assets/faces/NOR.png" },
    { id:"piastri",    name:"Oscar Piastri",  teamKey:"mclaren", teamName:"McLaren",  rating:92, color:"#ff8c00", face:"assets/faces/PIA.png" },

    { id:"alonso",     name:"Fernando Alonso",teamKey:"aston",   teamName:"Aston",    rating:90, color:"#00b894", face:"assets/faces/ALO.png" },
    { id:"stroll",     name:"Lance Stroll",   teamKey:"aston",   teamName:"Aston",    rating:88, color:"#00b894", face:"assets/faces/STR.png" },

    { id:"gasly",      name:"Pierre Gasly",   teamKey:"alpine",  teamName:"Alpine",   rating:89, color:"#4c6fff", face:"assets/faces/GAS.png" },
    { id:"ocon",       name:"Esteban Ocon",   teamKey:"alpine",  teamName:"Alpine",   rating:90, color:"#4c6fff", face:"assets/faces/OCO.png" },

    { id:"albon",      name:"Alex Albon",     teamKey:"williams",teamName:"Williams", rating:89, color:"#09a4e5", face:"assets/faces/ALB.png" },
    { id:"sargeant",   name:"Logan Sargeant", teamKey:"williams",teamName:"Williams", rating:86, color:"#09a4e5", face:"assets/faces/SAR.png" },

    { id:"bot",        name:"Valtteri Bottas",teamKey:"sauber",  teamName:"Sauber",   rating:88, color:"#d0d0ff", face:"assets/faces/BOT.png" },
    { id:"hul",        name:"Nico Hülkenberg",teamKey:"sauber",  teamName:"Sauber",   rating:89, color:"#d0d0ff", face:"assets/faces/HUL.png" }
  ];

  // ------------------------------
  // STATE
  // ------------------------------
  const state = {
    trackKey: TRACK_KEY,
    gpName: GP_NAME,
    userTeamKey: USER_TEAM,
    baseLapMs: TRACK_BASE_LAP_MS[TRACK_KEY] || 90000,
    totalLaps: 25,
    running: true,
    speedMultiplier: 1,
    lastFrameAt: performance.now(),

    weatherKey: "dry",
    trackTempC: 26,
    nextWeatherChangeAt: performance.now() + rand(45000, 90000),

    svgRoot: null,
    trackPath: null,
    pathPoints: [],
    carNodes: new Map(),

    // NOVO: linha do trajeto
    routeLine: null,

    drivers: []
  };

  // ------------------------------
  // INIT TOP UI
  // ------------------------------
  safeSetText("gp-title", `F1 MANAGER 2025 — ${state.gpName}`);

  const logo = $("teamLogoTop");
  if (logo) {
    logo.src = TEAM_LOGO[state.userTeamKey] || TEAM_LOGO.ferrari;
    logo.onerror = () => { logo.onerror = null; logo.src = TEAM_LOGO.ferrari; };
  }

  // ------------------------------
  // DRIVERS
  // ------------------------------
  function initDrivers() {
    state.totalLaps = Math.max(10, Math.round(2700000 / state.baseLapMs)); // ~45min
    safeSetText("race-lap-label", `Volta 1 / ${state.totalLaps}`);

    state.drivers = DRIVERS_2025.map((d, idx) => {
      const ratingFactor = 1 - ((100 - (d.rating || 85)) * 0.0032);
      const idealLapMs = state.baseLapMs / ratingFactor;

      return {
        ...d,
        progress: (idx / DRIVERS_2025.length) * 0.9,
        laps: 0,
        idealLapMs,
        lastLapAt: performance.now(),
        lastLapMs: null,
        bestLapMs: Infinity,
        totalTimeMs: 0,

        tyreWear: rand(0, 8),
        carWear: rand(0, 5),
        pitStops: 0,

        raceMode: "normal",
        wantsPit: false,
        forcePit: false,

        engineMode: 2,
        aggression: 2,
        ers: 50,
        ersBoostUntil: 0
      };
    });
  }

  function getUserDrivers2() {
    return state.drivers.filter(d => d.teamKey === state.userTeamKey).slice(0, 2);
  }

  // ------------------------------
  // USER CARDS
  // ------------------------------
  function fillUserCards() {
    const two = getUserDrivers2();
    for (let i = 0; i < 2; i++) {
      const card = $(`user-driver-card-${i}`);
      if (!card) continue;
      const drv = two[i];
      card.dataset.driverId = drv ? drv.id : "";

      const face = card.querySelector(".user-face");
      const name = card.querySelector(".user-name");
      const team = card.querySelector(".user-team");

      if (drv) {
        if (face) {
          face.src = drv.face || "";
          face.onerror = () => { face.onerror = null; face.src = "assets/faces/default.png"; };
        }
        if (name) name.textContent = drv.name;
        if (team) team.textContent = drv.teamName;
      }
    }
    updateUserCards();
  }

  function updateUserCards() {
    const two = getUserDrivers2();
    for (let i = 0; i < 2; i++) {
      const card = $(`user-driver-card-${i}`);
      if (!card) continue;
      const drv = two[i];
      if (!drv) continue;

      const status = card.querySelector(".user-status");
      if (status) {
        if (drv.forcePit || drv.wantsPit) status.textContent = "Chamado para o box";
        else if (drv.raceMode === "push") status.textContent = "Ataque";
        else if (drv.raceMode === "save") status.textContent = "Economizar";
        else status.textContent = "Normal";
      }

      const carEl = $(`user-car-${i}`);
      const tyreEl = $(`user-tyre-${i}`);
      const engEl = $(`user-engine-${i}`);
      const agrEl = $(`user-aggr-${i}`);
      const ersEl = $(`user-ers-${i}`);

      if (carEl) carEl.textContent = `${(100 - drv.carWear).toFixed(0)}%`;
      if (tyreEl) tyreEl.textContent = `${drv.tyreWear.toFixed(0)}%`;
      if (engEl) engEl.textContent = `M${drv.engineMode}`;
      if (agrEl) agrEl.textContent = `A${drv.aggression}`;
      if (ersEl) ersEl.textContent = `${drv.ers.toFixed(0)}%`;
    }
  }

  // ------------------------------
  // LIVE LIST
  // ------------------------------
  function renderDriversList() {
    const list = $("drivers-list");
    if (!list) return;

    const ordered = state.drivers
      .slice()
      .sort((a, b) => (b.laps - a.laps) || (b.progress - a.progress));

    list.innerHTML = "";

    for (let i = 0; i < ordered.length; i++) {
      const d = ordered[i];
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "52px 1fr 92px";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "8px 0";
      row.style.borderBottom = "1px solid rgba(255,255,255,.06)";

      const pos = document.createElement("div");
      pos.style.fontWeight = "900";
      pos.textContent = `${i + 1}º`;

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.alignItems = "center";
      info.style.gap = "10px";
      info.style.minWidth = "0";

      const face = document.createElement("img");
      face.src = d.face || "";
      face.style.width = "28px";
      face.style.height = "28px";
      face.style.borderRadius = "50%";
      face.style.objectFit = "cover";
      face.style.border = "1px solid rgba(255,255,255,.15)";
      face.onerror = () => { face.onerror = null; face.src = "assets/faces/default.png"; };

      const txt = document.createElement("div");
      txt.style.minWidth = "0";
      txt.innerHTML = `
        <div style="font-weight:800; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${d.name}
        </div>
        <div style="opacity:.7; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${d.teamName}
        </div>
      `;

      const time = document.createElement("div");
      time.style.textAlign = "right";
      time.style.opacity = ".9";
      time.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
      time.style.fontSize = "12px";
      time.textContent = fmtLap(Math.min(d.bestLapMs, d.lastLapMs || Infinity));

      info.appendChild(face);
      info.appendChild(txt);

      row.appendChild(pos);
      row.appendChild(info);
      row.appendChild(time);

      list.appendChild(row);
    }

    const leader = ordered[0];
    const lapNow = Math.min(state.totalLaps, (leader?.laps || 0) + 1);
    safeSetText("race-lap-label", `Volta ${lapNow} / ${state.totalLaps}`);
  }

  // ------------------------------
  // SVG: CARS + ROUTE LINE
  // ------------------------------
  function createSvgLayer(svg, id) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    svg.appendChild(g);
    return g;
  }

  function createCarNode(parentLayer, driver) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shadow.setAttribute("r", "10");
    shadow.setAttribute("fill", "rgba(0,0,0,0.35)");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "7.5");
    dot.setAttribute("fill", driver.color || "#ff2a2a");

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("r", "9");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "rgba(255,255,255,0.65)");
    ring.setAttribute("stroke-width", "1.25");

    g.appendChild(shadow);
    g.appendChild(dot);
    g.appendChild(ring);

    parentLayer.appendChild(g);
    state.carNodes.set(driver.id, g);
  }

  function setCarTransform(driverId, x, y, angleDeg) {
    const node = state.carNodes.get(driverId);
    if (!node) return;
    node.setAttribute("transform", `translate(${x} ${y}) rotate(${angleDeg})`);
  }

  function buildRoutePolyline(points) {
    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pl.setAttribute("fill", "none");
    pl.setAttribute("stroke", "rgba(255,255,255,0.85)");
    pl.setAttribute("stroke-width", "4.5");
    pl.setAttribute("stroke-linecap", "round");
    pl.setAttribute("stroke-linejoin", "round");
    pl.setAttribute("opacity", "0.85");

    // brilho externo leve (AAA feel)
    pl.style.filter = "drop-shadow(0 0 8px rgba(255,255,255,0.35)) drop-shadow(0 0 18px rgba(255,255,255,0.12))";

    // fecha o loop visualmente
    const pts = points.slice();
    if (pts.length) pts.push(pts[0]);

    pl.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    return pl;
  }

  // ------------------------------
  // WEATHER
  // ------------------------------
  function updateWeatherUI() {
    const w = WEATHER[state.weatherKey] || WEATHER.dry;
    safeSetText("weather-label", `Clima: ${w.label}`);
    safeSetText("tracktemp-label", `Pista: ${Math.round(state.trackTempC)}°C`);
  }

  function maybeChangeWeather(now) {
    if (now < state.nextWeatherChangeAt) return;

    const roll = Math.random();
    if (state.weatherKey === "dry") {
      state.weatherKey = (roll < 0.70) ? "dry" : (roll < 0.90 ? "lightrain" : "rain");
    } else if (state.weatherKey === "lightrain") {
      state.weatherKey = (roll < 0.45) ? "dry" : (roll < 0.85 ? "lightrain" : "rain");
    } else {
      state.weatherKey = (roll < 0.30) ? "lightrain" : (roll < 0.38 ? "dry" : "rain");
    }

    if (state.weatherKey === "dry") state.trackTempC = clamp(state.trackTempC + rand(-0.3, 0.6), 24, 38);
    if (state.weatherKey === "lightrain") state.trackTempC = clamp(state.trackTempC + rand(-0.8, 0.2), 18, 30);
    if (state.weatherKey === "rain") state.trackTempC = clamp(state.trackTempC + rand(-1.2, 0.1), 16, 26);

    state.nextWeatherChangeAt = now + rand(45000, 90000);
    updateWeatherUI();
  }

  // ------------------------------
  // SIM
  // ------------------------------
  function updateSim(dtMs, now) {
    if (!state.pathPoints || state.pathPoints.length < 80) return;

    maybeChangeWeather(now);
    const wCfg = WEATHER[state.weatherKey] || WEATHER.dry;

    for (const d of state.drivers) {
      const modeCfg = RACE_MODES[d.raceMode] || RACE_MODES.normal;

      const enginePace = (d.engineMode === 1) ? 0.97 : (d.engineMode === 3 ? 1.03 : 1.00);
      const aggrPace   = (d.aggression === 1) ? 0.985 : (d.aggression === 3 ? 1.02 : 1.00);
      const ersBoostActive = (d.ersBoostUntil > now) ? 1.035 : 1.0;

      const tyreFactor = 1 + d.tyreWear * 0.005;

      const effectiveLapMs =
        (d.idealLapMs * tyreFactor) /
        (modeCfg.pace * enginePace * aggrPace * ersBoostActive * wCfg.grip);

      const baseSpeed = 1 / effectiveLapMs;
      const noise = (Math.random() - 0.5) * baseSpeed * 0.06;

      let newProg = d.progress + (baseSpeed + noise) * dtMs * state.speedMultiplier;

      if (newProg >= 1) {
        newProg -= 1;

        const lapMs = now - d.lastLapAt;
        d.lastLapAt = now;
        d.laps += 1;
        d.lastLapMs = lapMs;
        d.bestLapMs = Math.min(d.bestLapMs, lapMs);
        d.totalTimeMs += lapMs;

        const wearBase = 3.0;
        const aggrWear = (d.aggression === 1) ? 0.88 : (d.aggression === 3 ? 1.18 : 1.0);
        const engWear  = (d.engineMode === 1) ? 0.92 : (d.engineMode === 3 ? 1.10 : 1.0);
        const ersWear  = (d.ersBoostUntil > now) ? 1.08 : 1.0;

        d.tyreWear = clamp(
          d.tyreWear + wearBase * modeCfg.tyreWear * aggrWear * engWear * ersWear * wCfg.tyreWear,
          0, 100
        );

        d.ers = clamp(d.ers + (modeCfg.ersRegen || 6), 0, 100);

        if (d.teamKey === state.userTeamKey && d.tyreWear >= 80) d.wantsPit = true;
      }

      d.progress = newProg;
    }
  }

  function applyPitIfNeeded() {
    const wCfg = WEATHER[state.weatherKey] || WEATHER.dry;
    for (const d of state.drivers) {
      if (!d.forcePit && !d.wantsPit) continue;

      if (d.progress < 0.015) {
        d.forcePit = false;
        d.wantsPit = false;
        d.pitStops += 1;

        const pitMs = (20000 + Math.random() * 4500) * (wCfg.grip < 1 ? 1.06 : 1.0);
        d.totalTimeMs += pitMs;

        d.tyreWear = 0;
        d.ers = clamp(d.ers + 12, 0, 100);
      }
    }
  }

  function renderCars() {
    const pts = state.pathPoints;
    if (!pts || pts.length < 80) return;

    for (const d of state.drivers) {
      const idx = Math.floor(d.progress * pts.length) % pts.length;
      const next = (idx + 1) % pts.length;
      const p = pts[idx];
      const p2 = pts[next];
      if (!p || !p2) continue;

      const ang = angleBetween(p, p2);
      setCarTransform(d.id, p.x, p.y, ang);
    }
  }

  // ------------------------------
  // LOOP
  // ------------------------------
  function frame(now) {
    const dtMs = Math.min(60, now - state.lastFrameAt);
    state.lastFrameAt = now;

    if (state.running) {
      updateSim(dtMs, now);
      applyPitIfNeeded();
      renderCars();
      renderDriversList();
      updateUserCards();

      if (state.drivers.some(d => d.laps >= state.totalLaps)) state.running = false;
    }

    requestAnimationFrame(frame);
  }

  // ------------------------------
  // CONTROLS
  // ------------------------------
  function setSpeed(mult) {
    state.speedMultiplier = mult;
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
    const active = document.querySelector(`.speed-btn[data-speed="${mult}"]`);
    if (active) active.classList.add("active");
  }

  function bindControls() {
    document.querySelectorAll(".speed-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mult = Number(btn.dataset.speed || "1") || 1;
        setSpeed(mult);
      });
    });

    document.querySelectorAll(".user-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index || "0");
        const action = btn.dataset.action || "";
        const two = getUserDrivers2();
        const drv = two[idx];
        if (!drv) return;

        if (action === "pit") drv.forcePit = true;
        else if (action === "push") drv.raceMode = "push";
        else if (action === "save") drv.raceMode = "save";

        else if (action === "engineUp") drv.engineMode = clamp(drv.engineMode + 1, 1, 3);
        else if (action === "engineDown") drv.engineMode = clamp(drv.engineMode - 1, 1, 3);

        else if (action === "aggrUp") drv.aggression = clamp(drv.aggression + 1, 1, 3);
        else if (action === "aggrDown") drv.aggression = clamp(drv.aggression - 1, 1, 3);

        else if (action === "ers") {
          const now = performance.now();
          if (drv.ers >= 15 && drv.ersBoostUntil < now) {
            drv.ers -= 15;
            drv.ersBoostUntil = now + 6500;
          }
        }

        updateUserCards();
      });
    });

    const back = $("btnBackLobby");
    if (back) {
      back.addEventListener("click", () => {
        window.location.href = `lobby.html?${params.toString()}`;
      });
    }
  }

  // ------------------------------
  // LOAD SVG + DRAW ROUTE LINE
  // ------------------------------
  async function loadTrack() {
    const container = $("track-container");
    if (!container) throw new Error("track-container não existe no race.html");

    const svgUrl = `assets/tracks/${state.trackKey}.svg`;
    const res = await fetch(svgUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar SVG: ${svgUrl} (HTTP ${res.status})`);
    const svgText = await res.text();

    container.innerHTML = svgText;
    state.svgRoot = container.querySelector("svg");
    if (!state.svgRoot) throw new Error("SVG root não encontrado dentro do track-container");

    ensureSvgResponsive(state.svgRoot);

    state.trackPath = findBestTrackPath(state.svgRoot);
    if (!state.trackPath) throw new Error("Nenhum <path> válido encontrado no SVG (race line)");

    state.pathPoints = buildPathPoints(state.trackPath, 1800);
    if (!state.pathPoints || state.pathPoints.length < 80) {
      throw new Error("Falha ao gerar pathPoints (path curto/inválido)");
    }

    // LAYERS: rota (embaixo) e carros (em cima)
    const routeLayer = createSvgLayer(state.svgRoot, "routeLayer");
    const carsLayer = createSvgLayer(state.svgRoot, "carsLayer");

    // desenha a linha ligando os pontos
    state.routeLine = buildRoutePolyline(state.pathPoints);
    routeLayer.appendChild(state.routeLine);

    // cria carros na layer superior
    state.carNodes.clear();
    for (const d of state.drivers) createCarNode(carsLayer, d);

    renderCars();
  }

  // ------------------------------
  // START
  // ------------------------------
  function start() {
    initDrivers();
    updateWeatherUI();
    bindControls();
    fillUserCards();
    renderDriversList();

    loadTrack()
      .then(() => {
        state.running = true;
        state.lastFrameAt = performance.now();
        requestAnimationFrame(frame);
      })
      .catch((err) => {
        console.error("RACE INIT ERROR:", err);
        const container = $("track-container");
        if (container) {
          container.innerHTML = `
            <div style="padding:16px; color:#fff; font-family:system-ui;">
              <div style="font-weight:900; margin-bottom:8px;">Erro ao iniciar corrida</div>
              <div style="opacity:.9; font-size:13px; line-height:1.45;">${String(err.message || err)}</div>
              <div style="opacity:.7; font-size:12px; margin-top:10px;">
                Verifique: <b>assets/tracks/${state.trackKey}.svg</b> e se ele possui um <b>&lt;path&gt;</b> válido.
              </div>
            </div>
          `;
        }
      });
  }

  document.addEventListener("DOMContentLoaded", start);
})();
