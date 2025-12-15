// ==========================================================
// F1 MANAGER 2025 – RACE.JS (Corrida)
// FIX: equipe errada no grid (ex: Max como ferrari) + "Seus pilotos" errando
// Mantém: mapa + lista sessão + controles + pit + pneus + clima
// ==========================================================

(() => {
  "use strict";

  const STORAGE_LAST_QUALY = "f1m2025_last_qualy";
  const STORAGE_SETUP = "f1m2025_last_setup";
  const STORAGE_PRACTICE = "f1m2025_last_practice";

  const DEFAULT_VIEWBOX = { w: 1000, h: 600 };
  const PATH_SAMPLES = 520;

  const TRACK_BASE_LAP_TIME_MS = {
    australia: 80000, bahrain: 91000, jeddah: 88000, imola: 76000, monaco: 72000,
    canada: 77000, spain: 78000, austria: 65000, silverstone: 83000, hungary: 77000,
    spa: 115000, zandvoort: 74000, monza: 78000, singapore: 100000, suzuka: 82000,
    qatar: 87000, austin: 89000, mexico: 77000, brazil: 70000, abu_dhabi: 84000
  };

  // ====== OVERRIDES IMPORTANTES (corrige grid salvo com teamKey errado) ======
  // Se no seu save você usa outras equipes/nomes, me diga e eu adiciono.
  const DRIVER_TEAM_OVERRIDES = {
    "Max Verstappen": "redbull",
    "Sergio Pérez": "redbull",
    "Lewis Hamilton": "mercedes",
    "George Russell": "mercedes",
    "Charles Leclerc": "ferrari",
    "Carlos Sainz": "ferrari",
    "Lando Norris": "mclaren",
    "Oscar Piastri": "mclaren",
    "Fernando Alonso": "astonmartin",
    "Lance Stroll": "astonmartin",
    "Pierre Gasly": "alpine",
    "Esteban Ocon": "alpine",
    "Kevin Magnussen": "haas",
    "Oliver Bearman": "haas",
    "Alex Albon": "williams",
    "Logan Sargeant": "williams",
    "Yuki Tsunoda": "rb",
    "Liam Lawson": "rb",
    "Daniel Ricciardo": "rb",
    "Nico Hülkenberg": "haas"
  };

  // Preferência para escolher “SEUS PILOTOS” por time (evita pegar piloto errado)
  const TEAM_DRIVER_PREFS = {
    ferrari: ["Charles Leclerc", "Carlos Sainz", "Lewis Hamilton"],
    mercedes: ["Lewis Hamilton", "George Russell"],
    redbull: ["Max Verstappen", "Sergio Pérez"],
    mclaren: ["Lando Norris", "Oscar Piastri"],
    astonmartin: ["Fernando Alonso", "Lance Stroll"],
    alpine: ["Pierre Gasly", "Esteban Ocon"],
    haas: ["Nico Hülkenberg", "Kevin Magnussen", "Oliver Bearman"],
    williams: ["Alex Albon", "Logan Sargeant"],
    rb: ["Yuki Tsunoda", "Liam Lawson", "Daniel Ricciardo"],
    sauber: ["Valtteri Bottas", "Zhou Guanyu"]
  };

  const TYRES = {
    S: { name: "SOFT", wearPerLap: 7.5, paceMul: 0.985 },
    M: { name: "MEDIUM", wearPerLap: 5.0, paceMul: 1.000 },
    H: { name: "HARD", wearPerLap: 3.6, paceMul: 1.015 },
    I: { name: "INTER", wearPerLap: 4.8, paceMul: 1.020 },
    W: { name: "WET", wearPerLap: 4.2, paceMul: 1.030 }
  };

  const ENGINE_MODES = {
    ECO: { name: "ECONOMIZAR", paceMul: 1.018, wearMul: 0.85 },
    NORM: { name: "NORMAL", paceMul: 1.000, wearMul: 1.00 },
    ATK: { name: "ATAQUE", paceMul: 0.990, wearMul: 1.18 }
  };

  const PIT = { baseStopMs: 18500, laneLossMs: 6000, minLapsBetweenStops: 1 };

  const WEATHER = {
    DRY:  { name: "Seco",  trackTempMin: 24, trackTempMax: 36, paceMul: 1.0,  wet: 0 },
    RAIN: { name: "Chuva", trackTempMin: 18, trackTempMax: 28, paceMul: 1.04, wet: 1 }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  function safeQS(sel) { return document.querySelector(sel); }
  function safeQSA(sel) { return Array.from(document.querySelectorAll(sel)); }

  function formatGapMs(ms) {
    if (!isFinite(ms)) return "+--.---";
    const s = ms / 1000;
    return (s >= 0 ? "+" : "") + s.toFixed(3);
  }

  function nameToCode3(name) {
    if (!name) return "UNK";
    const parts = String(name).trim().split(/\s+/);
    const last = (parts[parts.length - 1] || "").replace(/[^A-Za-zÀ-ÿ]/g, "");
    const base = (last || parts[0] || "UNK").toUpperCase();
    return base.slice(0, 3).padEnd(3, "X");
  }

  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function setTextIf(el, text) { if (el) el.textContent = text; }

  const state = {
    track: "australia",
    gp: "GP 2025",
    userTeam: "ferrari",
    baseLapMs: 90000,
    speedMultiplier: 1,

    weather: WEATHER.DRY,
    trackTempC: 28,

    running: true,
    lastFrame: null,

    pathPoints: [],
    visuals: new Map(),

    drivers: [],
    grid: [],

    el: {
      trackContainer: null,
      title: null,
      subtitle: null,
      sessionList: null,
      userCards: [],
      speedBtns: []
    }
  };

  window.addEventListener("DOMContentLoaded", initRace);

  async function initRace() {
    injectRaceStyles();

    const params = new URLSearchParams(location.search);
    state.track = params.get("track") || "australia";
    state.gp = params.get("gp") || "GP 2025";
    state.userTeam = (params.get("userTeam") || "ferrari").toLowerCase();
    state.baseLapMs = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;

    bindUIRefs();
    bindSpeedControls();
    bindUserControls();

    initWeather();

    state.grid = buildGridFromQualyOrFallback();
    state.drivers = buildDriversFromGrid(state.grid);

    fillUserCards();

    await loadTrackAndBuildVisuals();

    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  function injectRaceStyles() {
    if (document.getElementById("race-js-injected-styles")) return;
    const st = document.createElement("style");
    st.id = "race-js-injected-styles";
    st.textContent = `
      .driver-row{
        display:flex; align-items:center; gap:10px;
        padding:10px 10px; margin:8px 0;
        border-radius:14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .driver-row .pos{ width:28px; text-align:center; font-weight:700; opacity:0.9; }
      .driver-row img.face{
        width:44px !important; height:44px !important;
        max-width:44px !important; max-height:44px !important;
        border-radius:999px; object-fit:cover; flex:0 0 auto;
        background: rgba(0,0,0,0.25);
      }
      .driver-row .meta{ flex:1; min-width:0; }
      .driver-row .meta .name{ font-weight:700; font-size:14px; line-height:1.1; }
      .driver-row .meta .team{ font-size:12px; opacity:0.85; margin-top:2px; }
      .driver-row .meta .mini{ font-size:11px; opacity:0.75; margin-top:2px; }
      .driver-row .gap{
        width:78px; text-align:right; font-variant-numeric: tabular-nums;
        font-size:12px; opacity:0.9;
      }
      .user-team-row{
        border-color: rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.10);
      }
      #drivers-list, #session-list, .session-list, [data-session-list]{
        overflow-y:auto;
        max-height: calc(100vh - 190px);
        padding-right:6px;
      }
    `;
    document.head.appendChild(st);
  }

  function bindUIRefs() {
    state.el.trackContainer =
      document.getElementById("track-container") ||
      safeQS("#track") ||
      safeQS(".track-container") ||
      safeQS("[data-track-container]");

    state.el.title =
      document.getElementById("race-title-gp") ||
      safeQS("#raceTitle") ||
      safeQS(".race-title");

    state.el.subtitle =
      document.getElementById("race-subtitle") ||
      safeQS(".race-subtitle") ||
      safeQS("#raceSubtitle");

    state.el.sessionList =
      document.getElementById("drivers-list") ||
      safeQS("#session-list") ||
      safeQS(".session-list") ||
      safeQS("[data-session-list]");

    state.el.userCards = [
      document.getElementById("user-driver-1"),
      document.getElementById("user-driver-2"),
      safeQS("#user-driver-card-0"),
      safeQS("#user-driver-card-1")
    ].filter(Boolean);

    setTextIf(state.el.title, state.gp);
    if (state.el.subtitle) {
      state.el.subtitle.textContent = `Volta 1 • Clima: ${state.weather.name} • Pista: ${state.trackTempC}°C`;
    }
  }

  function bindSpeedControls() {
    const btns = safeQSA(".speed-btn");
    if (btns.length) {
      state.el.speedBtns = btns;
      btns.forEach(btn => {
        btn.addEventListener("click", () => {
          const v = Number(btn.dataset.speed || "1");
          state.speedMultiplier = isFinite(v) && v > 0 ? v : 1;
          btns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      const one = btns.find(b => String(b.dataset.speed) === "1");
      if (one) one.classList.add("active");
    }
  }

  function bindUserControls() {
    const allButtons = safeQSA("button");
    const normalize = (t) => String(t || "").trim().toUpperCase();

    allButtons.forEach(btn => {
      const t = normalize(btn.textContent);
      const action = (btn.dataset.action || "").toLowerCase();
      const ownerIdx = resolveOwnerIndex(btn);

      if (action === "pit" || t === "PIT" || t === "PIT STOP") {
        btn.addEventListener("click", () => requestPit(ownerIdx));
      }
      if (action === "eco" || t === "ECONOMIZAR") {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ECO"));
      }
      if (action === "atk" || t === "ATAQUE") {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ATK"));
      }
      if (btn.dataset.tyre) {
        btn.addEventListener("click", () => changeTyre(ownerIdx, btn.dataset.tyre));
      }
    });
  }

  function resolveOwnerIndex(btn) {
    const p1 = btn.closest("#user-driver-1, #user-driver-card-0, .user-driver-1, [data-user-driver='1']");
    if (p1) return 0;
    const p2 = btn.closest("#user-driver-2, #user-driver-card-1, .user-driver-2, [data-user-driver='2']");
    if (p2) return 1;
    return 0;
  }

  function initWeather() {
    const params = new URLSearchParams(location.search);
    const forced = (params.get("weather") || "").toLowerCase();

    if (forced === "rain" || forced === "chuva") state.weather = WEATHER.RAIN;
    else if (forced === "dry" || forced === "seco") state.weather = WEATHER.DRY;
    else state.weather = Math.random() < 0.20 ? WEATHER.RAIN : WEATHER.DRY;

    state.trackTempC = Math.round(rnd(state.weather.trackTempMin, state.weather.trackTempMax));
    state.baseLapMs = state.baseLapMs * state.weather.paceMul;
  }

  function buildGridFromQualyOrFallback() {
    const q = loadJSON(STORAGE_LAST_QUALY);

    if (q && Array.isArray(q.grid) && q.grid.length >= 10) {
      const sameTrack = !q.track || q.track === state.track;
      if (sameTrack) {
        return q.grid
          .slice()
          .sort((a, b) => (a.position || 999) - (b.position || 999))
          .map((x, i) => ({
            id: x.id || `d_${i}`,
            name: x.name || `Piloto ${i + 1}`,
            teamKey: (x.teamKey || x.team || x.teamName || "unknown"),
            position: i + 1,
            bestLap: x.bestLap ?? null
          }));
      }
    }

    return Array.from({ length: 20 }, (_, i) => ({
      id: `gen_${i + 1}`,
      name: `Piloto ${i + 1}`,
      teamKey: "unknown",
      position: i + 1,
      bestLap: null
    }));
  }

  function normalizeTeamKey(teamKey) {
    const k = String(teamKey || "unknown").toLowerCase();
    if (k.includes("red bull") || k.includes("redbull")) return "redbull";
    if (k.includes("aston")) return "astonmartin";
    if (k.includes("kick") || k.includes("sauber") || k.includes("audi")) return "sauber";
    if (k === "rb" || k.includes("visa") || k.includes("racing bulls")) return "rb";
    if (k.includes("mercedes")) return "mercedes";
    if (k.includes("ferrari")) return "ferrari";
    if (k.includes("mclaren")) return "mclaren";
    if (k.includes("alpine")) return "alpine";
    if (k.includes("haas")) return "haas";
    if (k.includes("williams")) return "williams";
    return k || "unknown";
  }

  function buildDriversFromGrid(grid) {
    const setup = loadJSON(STORAGE_SETUP);
    const practice = loadJSON(STORAGE_PRACTICE);

    const setupMul = computeSetupMultiplier(setup);
    const practiceMul = computePracticeMultiplier(practice);

    return grid.map((g, idx) => {
      const name = g.name || `Piloto ${idx + 1}`;

      // ===== FIX PRINCIPAL: override por nome (corrige Max = ferrari, etc) =====
      const override = DRIVER_TEAM_OVERRIDES[name];
      let teamKey = normalizeTeamKey(override || g.teamKey || "unknown");

      const teamName = teamKey;
      const color = teamColorFromKey(teamKey);
      const logo = teamLogoFromKey(teamKey);
      const code = nameToCode3(name);

      let tyre = state.weather.wet ? "I" : "M";

      const rating = 75;
      const form = 55;

      const rMul = 1 + (clamp(rating, 40, 99) - 92) * 0.0025;
      const fMul = 1 + (clamp(form, 0, 100) - 55) * 0.0012;
      const perfMul = clamp(rMul * fMul, 0.90, 1.10);

      const engineMode = "NORM";

      const base = state.baseLapMs * TYRES[tyre].paceMul * ENGINE_MODES[engineMode].paceMul;
      const targetLapMs = (base / perfMul) * setupMul * practiceMul;

      return {
        id: g.id,
        code,
        name,
        teamKey,
        teamName,
        rating,
        form,
        color,
        logo,

        position: g.position || (idx + 1),
        laps: 0,
        progress: clamp((idx * 0.012) + Math.random() * 0.01, 0, 0.25),
        targetLapMs,

        totalTimeMs: 0,
        gapToLeaderMs: 0,

        tyre,
        tyreWear: 100,
        engineMode,
        ers: 50,

        pitRequested: false,
        inPit: false,
        pitTimerMs: 0,
        lastPitLap: -999,
        __requestedTyre: null
      };
    });
  }

  function teamColorFromKey(teamKey) {
    const k = String(teamKey || "").toLowerCase();
    if (k === "ferrari") return "#e10600";
    if (k === "redbull") return "#1e41ff";
    if (k === "mercedes") return "#00d2be";
    if (k === "mclaren") return "#ff8700";
    if (k === "astonmartin") return "#006f62";
    if (k === "alpine") return "#2293d1";
    if (k === "haas") return "#b6babd";
    if (k === "williams") return "#00a0de";
    if (k === "sauber") return "#52e252";
    if (k === "rb") return "#2b4562";
    return "#ffffff";
  }

  function teamLogoFromKey(teamKey) {
    const k = String(teamKey || "unknown").toLowerCase();
    return `assets/teams/${k}.png`;
  }

  function computeSetupMultiplier(setup) {
    if (!setup || typeof setup !== "object") return 1.0;
    const wing = Number(setup.frontWing ?? setup.asaDianteira ?? setup.wingFront ?? 0);
    const susp = Number(setup.suspension ?? setup.suspensao ?? 0);
    const eng = Number(setup.engine ?? setup.motor ?? 0);
    const penalty = (Math.abs(wing) + Math.abs(susp) + Math.abs(eng)) * 0.0008;
    return clamp(1.0 + penalty, 0.98, 1.06);
  }

  function computePracticeMultiplier(practice) {
    if (!practice || typeof practice !== "object") return 1.0;
    const conf = Number(practice.confidence ?? practice.confianca ?? 0);
    const bonus = (clamp(conf, 0, 100) - 50) * 0.0006;
    return clamp(1.0 - bonus, 0.97, 1.03);
  }

  async function loadTrackAndBuildVisuals() {
    const container = state.el.trackContainer;
    if (!container) return;

    container.innerHTML = "";

    const svgText = await fetch(`assets/tracks/${state.track}.svg`).then(r => r.text());
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");

    let geom = doc.querySelector("path");
    let isPath = true;
    if (!geom) { geom = doc.querySelector("polyline, polygon"); isPath = false; }

    const pts = [];
    if (geom && isPath && geom.getTotalLength) {
      const len = geom.getTotalLength();
      for (let i = 0; i < PATH_SAMPLES; i++) {
        const p = geom.getPointAtLength((len * i) / PATH_SAMPLES);
        pts.push({ x: p.x, y: p.y });
      }
    } else if (geom && !isPath) {
      const raw = geom.getAttribute("points") || "";
      raw.split(/\s+/).forEach(pair => {
        const [x, y] = pair.split(",").map(Number);
        if (isFinite(x) && isFinite(y)) pts.push({ x, y });
      });
    }

    if (pts.length < 50) {
      for (let i = 0; i < PATH_SAMPLES; i++) {
        const a = (Math.PI * 2 * i) / PATH_SAMPLES;
        pts.push({ x: 500 + Math.cos(a) * 320, y: 300 + Math.sin(a) * 180 });
      }
    }

    state.pathPoints = pts;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${DEFAULT_VIEWBOX.w} ${DEFAULT_VIEWBOX.h}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    container.appendChild(svg);

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    poly.setAttribute("stroke", "#d0d0d0");
    poly.setAttribute("stroke-width", "14");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly);

    const poly2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly2.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    poly2.setAttribute("stroke", "#7a7a7a");
    poly2.setAttribute("stroke-width", "6");
    poly2.setAttribute("fill", "none");
    poly2.setAttribute("stroke-linecap", "round");
    poly2.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly2);

    state.visuals.clear();
    state.drivers.forEach(d => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "5.2");
      dot.setAttribute("fill", d.color);
      dot.setAttribute("stroke", "rgba(0,0,0,0.55)");
      dot.setAttribute("stroke-width", "1.2");
      g.appendChild(dot);
      svg.appendChild(g);
      state.visuals.set(d.id, { g, dot });
    });
  }

  function loop(ts) {
    const dtRaw = ts - (state.lastFrame || ts);
    state.lastFrame = ts;
    const dt = dtRaw * state.speedMultiplier;
    if (state.running) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    state.drivers.forEach(d => {
      if (d.inPit) {
        d.pitTimerMs += dt;
        d.totalTimeMs += dt;

        if (d.pitTimerMs >= (PIT.baseStopMs + PIT.laneLossMs)) {
          d.inPit = false;
          d.pitTimerMs = 0;
          d.pitRequested = false;
          d.lastPitLap = d.laps;
          d.tyreWear = 100;
          d.ers = clamp(d.ers + 10, 0, 100);
        }
        return;
      }

      const wearBase = TYRES[d.tyre]?.wearPerLap ?? 5.0;
      const wearMul = ENGINE_MODES[d.engineMode]?.wearMul ?? 1.0;

      const wrongTyrePenalty = computeWrongTyrePenalty(d.tyre);
      const weatherMul = state.weather.wet ? 1.15 : 1.0;
      const noise = 1 + (Math.random() - 0.5) * 0.035;

      const wearFactor = 1 + (1 - d.tyreWear / 100) * 0.045;
      const tyrePace = TYRES[d.tyre]?.paceMul ?? 1.0;
      const enginePace = ENGINE_MODES[d.engineMode]?.paceMul ?? 1.0;

      const lapMsDynamic = d.targetLapMs * tyrePace * enginePace * wearFactor * state.weather.paceMul * wrongTyrePenalty;
      const spd = (1 / lapMsDynamic);

      d.progress += spd * noise * dt;
      d.totalTimeMs += dt;

      if (d.engineMode === "ATK") d.ers = clamp(d.ers - dt * 0.0025, 0, 100);
      else if (d.engineMode === "ECO") d.ers = clamp(d.ers + dt * 0.0018, 0, 100);
      else d.ers = clamp(d.ers + dt * 0.0006, 0, 100);

      if (d.progress >= 1) {
        d.progress -= 1;
        d.laps += 1;

        const wear = wearBase * wearMul * weatherMul * wrongTyrePenalty;
        d.tyreWear = clamp(d.tyreWear - wear, 0, 100);

        if (d.tyreWear < 18 && (d.laps - d.lastPitLap) >= PIT.minLapsBetweenStops) {
          if (Math.random() < 0.65) d.pitRequested = true;
        }

        if (d.pitRequested && (d.laps - d.lastPitLap) >= PIT.minLapsBetweenStops) beginPit(d);
      }
    });

    state.drivers.sort((a, b) => a.totalTimeMs - b.totalTimeMs);

    const leader = state.drivers[0];
    state.drivers.forEach((d, idx) => {
      d.position = idx + 1;
      d.gapToLeaderMs = d.totalTimeMs - leader.totalTimeMs;
    });

    if (state.el.subtitle) {
      const maxLap = Math.max(...state.drivers.map(x => x.laps));
      state.el.subtitle.textContent = `Volta ${maxLap + 1} • Clima: ${state.weather.name} • Pista: ${state.trackTempC}°C`;
    }
  }

  function computeWrongTyrePenalty(tyreKey) {
    if (!state.weather.wet) return 1.0;
    if (tyreKey === "S" || tyreKey === "M" || tyreKey === "H") return 1.10;
    if (tyreKey === "I") return 1.03;
    if (tyreKey === "W") return 1.00;
    return 1.08;
  }

  function beginPit(d) {
    d.inPit = true;
    d.pitTimerMs = 0;

    if (d.__requestedTyre && TYRES[d.__requestedTyre]) {
      d.tyre = d.__requestedTyre;
      d.__requestedTyre = null;
    } else {
      if (state.weather.wet) d.tyre = (Math.random() < 0.55) ? "I" : "W";
      else {
        const r = Math.random();
        d.tyre = r < 0.20 ? "S" : (r < 0.70 ? "M" : "H");
      }
    }

    d.totalTimeMs += PIT.laneLossMs;
  }

  function render() {
    if (state.pathPoints.length && state.visuals.size) {
      state.drivers.forEach(d => {
        const v = state.visuals.get(d.id);
        if (!v) return;
        const idx = Math.floor(d.progress * (state.pathPoints.length - 1));
        const p = state.pathPoints[idx];
        if (!p) return;
        v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      });
    }
    renderSessionList();
  }

  function renderSessionList() {
    const list = state.el.sessionList;
    if (!list) return;

    list.innerHTML = "";

    state.drivers.forEach((d, idx) => {
      const row = document.createElement("div");
      row.className = "driver-row";

      const faceSrc = `assets/faces/${d.code}.png`;
      const tyreTxt = d.tyre || "M";
      const gapTxt = idx === 0 ? "LEADER" : formatGapMs(d.gapToLeaderMs);
      const pitTxt = d.inPit ? " • PIT" : "";

      row.innerHTML = `
        <div class="pos">${idx + 1}</div>
        <img class="face" src="${faceSrc}" alt="${d.name}" onerror="this.style.display='none'">
        <div class="meta">
          <div class="name">${d.name}</div>
          <div class="team">${d.teamName || d.teamKey || ""}</div>
          <div class="mini">Voltas: ${d.laps} • Pneu: ${tyreTxt}${pitTxt}</div>
        </div>
        <div class="gap">${gapTxt}</div>
      `;

      if (d.teamKey === state.userTeam) row.classList.add("user-team-row");
      list.appendChild(row);
    });
  }

  function getUserDrivers() {
    const prefs = TEAM_DRIVER_PREFS[state.userTeam] || [];
    const byName = [];

    prefs.forEach(n => {
      const found = state.drivers.find(d => d.name === n);
      if (found) byName.push(found);
    });

    if (byName.length >= 2) return byName.slice(0, 2);

    const ours = state.drivers.filter(d => d.teamKey === state.userTeam);
    const merged = [...byName, ...ours.filter(d => !byName.includes(d))];

    if (merged.length >= 2) return merged.slice(0, 2);

    // fallback extremo
    return [state.drivers[0], state.drivers[1] || state.drivers[0]];
  }

  function fillUserCards() {
    const u = getUserDrivers();

    const tryFill = (card, d) => {
      if (!card || !d) return;

      const face = card.querySelector("img.user-face, .user-face img, img.face, img");
      const name = card.querySelector(".user-name, .name, .pilot-name");
      const team = card.querySelector(".user-team, .team, .pilot-team");
      const logo = card.querySelector("img.user-logo, .user-logo img");

      if (face) face.src = `assets/faces/${d.code}.png`;
      if (name) name.textContent = d.name;
      if (team) team.textContent = d.teamName || d.teamKey;

      if (logo) {
        logo.src = d.logo || teamLogoFromKey(d.teamKey);
        logo.onerror = () => { logo.style.display = "none"; };
      }
    };

    if (state.el.userCards.length) {
      tryFill(state.el.userCards[0], u[0]);
      tryFill(state.el.userCards[1], u[1]);
      if (state.el.userCards[2]) tryFill(state.el.userCards[2], u[0]);
      if (state.el.userCards[3]) tryFill(state.el.userCards[3], u[1]);
    }
  }

  function setDriverMode(ownerIdx, modeKey) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d || !ENGINE_MODES[modeKey]) return;
    d.engineMode = modeKey;
  }

  function requestPit(ownerIdx) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d) return;
    if (d.inPit) return;
    if ((d.laps - d.lastPitLap) < PIT.minLapsBetweenStops) return;
    d.pitRequested = true;
  }

  function changeTyre(ownerIdx, tyreKey) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d || !TYRES[tyreKey]) return;
    d.__requestedTyre = tyreKey;
    d.pitRequested = true;
  }

})();
