// ==========================================================
// F1 MANAGER 2025 — RACE.JS (ETAPA 2)
// + Seleção manual de pneus (S/M/H/I/W) nos 2 pilotos do usuário
// + Pit lane visual (linha paralela ao traçado)
// + Pit troca para o pneu selecionado (quando user pedir PIT)
// Mantém tudo da etapa anterior e reforça robustez anti-"sumiu".
// ==========================================================

/* ------------------------------
   CONFIG BÁSICA
--------------------------------*/
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

const RACE_DEFAULT_LAPS = 12;
const PATH_SAMPLES = 520;
const GRID_RENDER_LIMIT = 20;

// Config pit por pista (entrada/saída em progresso 0..1, e offset visual)
const PIT_CFG = {
  australia: { entry: 0.90, exit: 0.06, offset: 18 },
  default:  { entry: 0.90, exit: 0.06, offset: 16 }
};

const TYRE = {
  S: { key: "S", name: "Soft",   wearPerLap: 0.14, paceMul: 0.985, rainBad: 1.25 },
  M: { key: "M", name: "Medium", wearPerLap: 0.10, paceMul: 1.000, rainBad: 1.18 },
  H: { key: "H", name: "Hard",   wearPerLap: 0.07, paceMul: 1.015, rainBad: 1.12 },
  I: { key: "I", name: "Inter",  wearPerLap: 0.09, paceMul: 1.030, rainBad: 0.96 },
  W: { key: "W", name: "Wet",    wearPerLap: 0.08, paceMul: 1.050, rainBad: 0.92 }
};

const MODE = {
  tyre: {
    econ:   { key: "ECON",   label: "Economizar", wearMul: 0.85, paceMul: 1.015 },
    normal: { key: "NORMAL", label: "Normal",     wearMul: 1.00, paceMul: 1.000 },
    atk:    { key: "ATK",    label: "Ataque",     wearMul: 1.22, paceMul: 0.985 }
  },
  engine: {
    low:    { key: "LOW",    label: "Motor -", heat: 0.90, paceMul: 1.012 },
    normal: { key: "NORMAL", label: "Motor",   heat: 1.00, paceMul: 1.000 },
    high:   { key: "HIGH",   label: "Motor +", heat: 1.12, paceMul: 0.990 }
  },
  aggr: {
    low:    { key: "LOW",    label: "Agress -", risk: 0.85, paceMul: 1.008 },
    normal: { key: "NORMAL", label: "Agress",   risk: 1.00, paceMul: 1.000 },
    high:   { key: "HIGH",   label: "Agress +", risk: 1.15, paceMul: 0.993 }
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function formatGap(sec) {
  if (!isFinite(sec)) return "--";
  if (sec < 0.001) return "+0.000";
  return `+${sec.toFixed(3)}`;
}

function safeText(el, txt) { if (el) el.textContent = txt; }

function imgOrHide(imgEl, src) {
  if (!imgEl) return;
  imgEl.onerror = () => { imgEl.style.display = "none"; };
  imgEl.style.display = "";
  imgEl.src = src;
}

/* ------------------------------
   PILOTS / MERCADO
--------------------------------*/
function getRuntimeDrivers() {
  if (!window.PilotMarketSystem) return [];
  try { PilotMarketSystem.init(); } catch (e) { return []; }

  const list = [];
  try {
    PilotMarketSystem.getTeams().forEach(team => {
      PilotMarketSystem.getActiveDriversForTeam(team).forEach(p => {
        list.push({
          id: p.id,
          code: p.code || p.id.toUpperCase(),
          name: p.name,
          teamKey: p.teamKey,
          teamName: p.teamName,
          rating: p.rating || 75,
          form: p.form || 55,
          color: p.color || "#9aa4b2",
          logo: p.logo || ""
        });
      });
    });
  } catch (e) {
    return [];
  }
  return list;
}

function getPerfMultiplier(driverId) {
  if (!window.PilotMarketSystem) return 1;
  const p = PilotMarketSystem.getPilot?.(driverId);
  if (!p) return 1;

  const ratingMul = 1 + (clamp(p.rating ?? 75, 40, 99) - 92) * 0.0025;
  const formMul = 1 + (clamp(p.form ?? 55, 0, 100) - 55) * 0.0012;
  return clamp(ratingMul * formMul, 0.90, 1.08);
}

/* ------------------------------
   SETUP (integração leve)
--------------------------------*/
function readSetupForTrack(track) {
  const keys = [
    `f1m2025_setup_${track}`,
    `f1m2025_${track}_setup`,
    `f1m2025_last_setup`
  ];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try { return JSON.parse(raw); } catch (e) {}
  }
  return null;
}

function setupPerfFactor(setupObj) {
  if (!setupObj || typeof setupObj !== "object") return { pace: 1.0, wear: 1.0 };

  const aero = clamp(Number(setupObj.aeroBalance ?? 50), 0, 100);
  const susp = clamp(Number(setupObj.suspension ?? 50), 0, 100);
  const engine = clamp(Number(setupObj.engine ?? 50), 0, 100);

  const aeroDelta = Math.abs(aero - 50) / 50;
  const suspDelta = Math.abs(susp - 50) / 50;
  const engDelta  = Math.abs(engine - 50) / 50;

  const pace = clamp(1.0 + (aeroDelta + suspDelta + engDelta) * 0.010, 0.995, 1.040);
  const wear = clamp(1.0 + (aeroDelta + suspDelta) * 0.018, 0.98, 1.10);
  return { pace, wear };
}

/* ------------------------------
   QUALY GRID (Q3)
--------------------------------*/
function readQualyGrid(track, gp) {
  const raw = localStorage.getItem("f1m2025_last_qualy");
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.grid)) return null;
    const okTrack = !data.track || data.track === track;
    const okGp = !data.gp || data.gp === gp;
    return { grid: data.grid, ok: okTrack && okGp };
  } catch (e) {
    return null;
  }
}

/* ------------------------------
   ESTADO DA CORRIDA
--------------------------------*/
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  baseLapMs: 90000,
  totalLaps: RACE_DEFAULT_LAPS,

  weather: "Seco",
  trackTempC: 26,
  rainLevel: 0.0,

  running: true,
  speedMultiplier: 1,
  lastFrame: null,

  // pista
  pathPoints: [],
  pitPoints: [],
  visuals: [],

  drivers: [],
  leaderId: null,

  ui: {
    lapLabel: null,
    weatherLabel: null,
    tempLabel: null,
    gpLabel: null,
    trackContainer: null,
    driversList: null
  }
};

function pickWeatherForTrack(track) {
  const rnd = Math.random();
  let rainChance = 0.18;
  if (["spa", "silverstone", "hungary"].includes(track)) rainChance = 0.28;
  if (["bahrain", "jeddah", "qatar", "abu_dhabi"].includes(track)) rainChance = 0.08;

  const raining = rnd < rainChance;
  if (!raining) {
    return { weather: "Seco", trackTempC: 24 + Math.floor(Math.random() * 8), rainLevel: 0.0 };
  }
  return { weather: "Chuva", trackTempC: 18 + Math.floor(Math.random() * 6), rainLevel: 0.55 + Math.random() * 0.35 };
}

/* ------------------------------
   INIT
--------------------------------*/
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || "australia";
  raceState.gp = params.get("gp") || "GP 2025";
  raceState.userTeam = params.get("userTeam") || "ferrari";
  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[raceState.track] || 90000;

  raceState.ui.lapLabel     = document.getElementById("lap-label");
  raceState.ui.weatherLabel = document.getElementById("weather-label");
  raceState.ui.tempLabel    = document.getElementById("tracktemp-label");
  raceState.ui.gpLabel      = document.getElementById("gp-label");
  raceState.ui.trackContainer = document.getElementById("track-container");
  raceState.ui.driversList  = document.getElementById("drivers-list");

  safeText(raceState.ui.gpLabel, raceState.gp);

  const meteo = pickWeatherForTrack(raceState.track);
  raceState.weather = meteo.weather;
  raceState.trackTempC = meteo.trackTempC;
  raceState.rainLevel = meteo.rainLevel;

  updateTopHUD();
  setupSpeedControls();
  setupUserButtons();

  initDriversWithQualyGrid();
  await loadTrackSvgAndBuildVisuals();

  // injeta seletor de pneu nos cards (ETAPA 2)
  ensureTyrePickersInjected();

  raceState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

/* ------------------------------
   DRIVERS + GRID Q3
--------------------------------*/
function initDriversWithQualyGrid() {
  const runtime = getRuntimeDrivers();

  const base = runtime.length
    ? runtime
    : [
        { id: "drv1", code: "DRV1", name: "Piloto 1", teamKey: raceState.userTeam, teamName: "Equipe", rating: 80, form: 55, color: "#d84343", logo: "" },
        { id: "drv2", code: "DRV2", name: "Piloto 2", teamKey: raceState.userTeam, teamName: "Equipe", rating: 78, form: 55, color: "#d84343", logo: "" }
      ];

  const qualy = readQualyGrid(raceState.track, raceState.gp);
  let ordered = [...base];

  if (qualy?.grid?.length) {
    const byId = new Map(base.map(d => [d.id, d]));
    const byName = new Map(base.map(d => [d.name, d]));
    const qList = [];

    for (const g of qualy.grid) {
      const found = byId.get(g.id) || byName.get(g.name);
      if (found) qList.push(found);
    }

    const used = new Set(qList.map(d => d.id));
    const rest = base.filter(d => !used.has(d.id));
    if (qList.length >= 8) ordered = [...qList, ...rest];
  }

  const setupObj = readSetupForTrack(raceState.track);
  const setupFactor = setupPerfFactor(setupObj);

  raceState.drivers = ordered.map((d, idx) => {
    const perf = getPerfMultiplier(d.id);
    const ratingSkill = 1 - (clamp(d.rating ?? 75, 40, 99) - 92) * 0.006;

    const tyreKey = raceState.weather === "Chuva"
      ? "I"
      : (Math.random() < 0.45 ? "S" : (Math.random() < 0.65 ? "M" : "H"));

    const isUser = d.teamKey === raceState.userTeam;

    const baseLap = raceState.baseLapMs * ratingSkill / clamp(perf, 0.9, 1.08);
    const lapTargetMs = baseLap * (isUser ? setupFactor.pace : 1.0);

    return {
      ...d,
      index: idx,

      lap: 0,
      progress: Math.random(),
      targetLapMs: lapTargetMs,
      lastLapMs: null,
      bestLapMs: null,

      tyre: TYRE[tyreKey],
      tyreWear: 1.0,
      tyreMode: MODE.tyre.normal,

      engineMode: MODE.engine.normal,
      aggrMode: MODE.aggr.normal,
      ers: 0.50,
      ersBoost: false,

      // PIT
      pitRequest: false,
      inPit: false,
      pitTimeLeftMs: 0,

      // seleção manual (ETAPA 2)
      selectedTyreKey: null, // se null, IA escolhe; se setado, pit troca para ele

      setupWearMul: isUser ? setupFactor.wear : 1.0
    };
  });

  raceState.leaderId = raceState.drivers[0]?.id || null;

  renderDriversList(true);
  preencherPilotosDaEquipe();
}

/* ------------------------------
   TRACK SVG + VISUAIS + PIT LANE
--------------------------------*/
async function loadTrackSvgAndBuildVisuals() {
  const container = raceState.ui.trackContainer;
  if (!container) return;

  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${raceState.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) throw new Error(`SVG da pista sem <path> em assets/tracks/${raceState.track}.svg`);

  const len = path.getTotalLength();
  const pts = [];
  for (let i = 0; i < PATH_SAMPLES; i++) {
    const p = path.getPointAtLength((len * i) / (PATH_SAMPLES - 1));
    pts.push({ x: p.x, y: p.y });
  }
  raceState.pathPoints = pts;

  // cria pitPoints como uma linha paralela ao traçado (offset normal)
  const cfg = PIT_CFG[raceState.track] || PIT_CFG.default;
  raceState.pitPoints = buildOffsetPolyline(pts, cfg.offset);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.style.width = "100%";
  svg.style.height = "100%";
  container.appendChild(svg);

  // traçado base (grosso)
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#5a5f68");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  // traçado interno (claro)
  const poly2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly2.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly2.setAttribute("stroke", "#cfd6df");
  poly2.setAttribute("stroke-width", "6");
  poly2.setAttribute("stroke-linecap", "round");
  poly2.setAttribute("stroke-linejoin", "round");
  poly2.setAttribute("fill", "none");
  poly2.setAttribute("opacity", "0.35");
  svg.appendChild(poly2);

  // pit lane (linha paralela, mais fina)
  const pit = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  pit.setAttribute("points", raceState.pitPoints.map(p => `${p.x},${p.y}`).join(" "));
  pit.setAttribute("stroke", "#8fa3b8");
  pit.setAttribute("stroke-width", "4");
  pit.setAttribute("stroke-linecap", "round");
  pit.setAttribute("stroke-linejoin", "round");
  pit.setAttribute("fill", "none");
  pit.setAttribute("opacity", "0.20");
  svg.appendChild(pit);

  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glow.setAttribute("r", 7);
    glow.setAttribute("fill", d.color || "#9aa4b2");
    glow.setAttribute("opacity", "0.25");
    g.appendChild(glow);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 4.2);
    c.setAttribute("fill", d.color || "#9aa4b2");
    g.appendChild(c);

    svg.appendChild(g);
    return { id: d.id, g };
  });
}

function buildOffsetPolyline(points, offset) {
  // offset simples pela normal do segmento (tangente -> normal)
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[Math.min(points.length - 1, i + 1)];
    const tx = p1.x - p0.x;
    const ty = p1.y - p0.y;
    const mag = Math.hypot(tx, ty) || 1;

    // normal (perpendicular)
    const nx = -ty / mag;
    const ny = tx / mag;

    out.push({ x: points[i].x + nx * offset, y: points[i].y + ny * offset });
  }
  return out;
}

/* ------------------------------
   LOOP (PROTEGIDO)
--------------------------------*/
function loop(ts) {
  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  try {
    if (raceState.running) update(dt);
    render();
  } catch (err) {
    console.error("[RACE] erro no loop:", err);
    raceState.running = false;
    showRuntimeError(err);
  }
  requestAnimationFrame(loop);
}

function showRuntimeError(err) {
  let box = document.getElementById("runtime-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "runtime-error";
    box.style.position = "fixed";
    box.style.left = "12px";
    box.style.right = "12px";
    box.style.bottom = "12px";
    box.style.zIndex = "99999";
    box.style.padding = "12px";
    box.style.borderRadius = "10px";
    box.style.background = "rgba(120,0,0,0.75)";
    box.style.color = "#fff";
    box.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
    box.style.fontSize = "12px";
    box.style.lineHeight = "1.3";
    document.body.appendChild(box);
  }
  box.textContent = `Erro no Race Loop: ${String(err?.message || err)}`;
}

/* ------------------------------
   UPDATE
--------------------------------*/
function update(dt) {
  driftWeather(dt);

  if (!raceState.visuals || raceState.visuals.length !== raceState.drivers.length) {
    rebuildVisualsIfNeeded();
  }

  const cfg = PIT_CFG[raceState.track] || PIT_CFG.default;

  for (const d of raceState.drivers) {
    // pit em andamento (parado)
    if (d.inPit) {
      d.pitTimeLeftMs -= dt;
      if (d.pitTimeLeftMs <= 0) {
        d.inPit = false;
        d.pitTimeLeftMs = 0;
        d.pitRequest = false;
      }
      continue;
    }

    // ERS
    const ersUse = d.ersBoost ? 0.00028 * dt : 0.00010 * dt;
    d.ers = clamp(d.ers - ersUse, 0, 1);
    if (d.ers <= 0.02) d.ersBoost = false;
    d.ers = clamp(d.ers + 0.00006 * dt, 0, 1);

    // desgaste
    const wearRatePerMs = (d.tyre.wearPerLap / (d.targetLapMs || raceState.baseLapMs))
      * d.tyreMode.wearMul
      * d.setupWearMul;

    d.tyreWear = clamp(d.tyreWear - wearRatePerMs * dt, 0, 1);

    const wearPenalty = 1 + (1 - d.tyreWear) * (0.10 + (raceState.rainLevel * 0.08));
    const rainPenalty = rainEffectMultiplier(d);

    const modeMul =
      d.tyreMode.paceMul *
      d.engineMode.paceMul *
      d.aggrMode.paceMul *
      (d.ersBoost ? 0.992 : 1.0);

    const lapMs = (d.targetLapMs || raceState.baseLapMs)
      * d.tyre.paceMul
      * wearPenalty
      * rainPenalty
      * modeMul;

    const speed = 1 / Math.max(1, lapMs);
    const noise = 1 + (Math.random() - 0.5) * 0.025;

    d.progress += speed * noise * dt;

    // entrada do pit (agora respeita cfg.entry)
    if (d.pitRequest && d.progress >= cfg.entry) {
      doPitStop(d);
    }

    // volta completa
    if (d.progress >= 1) {
      d.progress -= 1;
      d.lap += 1;

      const lapNoise = 1 + (Math.random() - 0.5) * 0.010;
      const lapDone = lapMs * lapNoise;

      d.lastLapMs = lapDone;
      if (!d.bestLapMs || lapDone < d.bestLapMs) d.bestLapMs = lapDone;

      aiPitLogic(d);

      if (d.id === raceState.leaderId && d.lap >= raceState.totalLaps) {
        finishRace();
        return;
      }
    }
  }

  updateLeaderAndOrder();
}

/* ------------------------------
   METEO
--------------------------------*/
function driftWeather(dt) {
  const drift = (Math.random() - 0.5) * 0.0000015 * dt;
  raceState.rainLevel = clamp(raceState.rainLevel + drift, 0, 1);

  if (raceState.rainLevel < 0.08) raceState.weather = "Seco";
  else if (raceState.rainLevel > 0.12) raceState.weather = "Chuva";

  const tdrift = (Math.random() - 0.5) * 0.000003 * dt;
  raceState.trackTempC = clamp(raceState.trackTempC + tdrift, 12, 40);

  updateTopHUD();
}

function rainEffectMultiplier(d) {
  if (raceState.rainLevel <= 0.05) return 1.0;

  const slick = (d.tyre.key === "S" || d.tyre.key === "M" || d.tyre.key === "H");
  if (!slick) {
    const bonus = 1 - (raceState.rainLevel * 0.06);
    return clamp(bonus, 0.92, 1.0);
  }

  const bad = d.tyre.rainBad || 1.18;
  const mult = 1 + (raceState.rainLevel * (bad - 1));
  return clamp(mult, 1.0, 1.35);
}

/* ------------------------------
   PIT STOP + SELEÇÃO MANUAL
--------------------------------*/
function doPitStop(d) {
  d.inPit = true;

  let pitMs = 24000 + Math.random() * 3500;
  if (raceState.rainLevel > 0.2) pitMs += 800 + Math.random() * 1200;

  // ETAPA 2: se o usuário selecionou pneu, usa esse
  // Caso contrário, IA escolhe.
  const nextTyre = chooseNextTyre(d);
  d.tyre = nextTyre;
  d.tyreWear = 1.0;

  // após trocar, limpa seleção (você pode manter se quiser depois)
  d.selectedTyreKey = null;

  d.pitTimeLeftMs = pitMs;
}

function chooseNextTyre(d) {
  // seleção manual prevalece
  if (d.teamKey === raceState.userTeam && d.selectedTyreKey && TYRE[d.selectedTyreKey]) {
    return TYRE[d.selectedTyreKey];
  }

  // chuva
  if (raceState.rainLevel >= 0.50) return TYRE.W;
  if (raceState.rainLevel >= 0.15) return TYRE.I;

  // seco
  const lapsLeft = Math.max(0, raceState.totalLaps - d.lap);
  if (lapsLeft <= 3) return TYRE.S;
  if (lapsLeft <= 6) return Math.random() < 0.6 ? TYRE.M : TYRE.S;
  return Math.random() < 0.55 ? TYRE.H : TYRE.M;
}

function aiPitLogic(d) {
  if (d.teamKey === raceState.userTeam) return;

  if (d.tyreWear < 0.28 && Math.random() < 0.55) d.pitRequest = true;

  const slick = (d.tyre.key === "S" || d.tyre.key === "M" || d.tyre.key === "H");
  if (raceState.rainLevel > 0.18 && slick && Math.random() < 0.35) d.pitRequest = true;
}

/* ------------------------------
   ORDER / GAP
--------------------------------*/
function distanceScore(d) { return d.lap + d.progress; }

function updateLeaderAndOrder() {
  let leader = raceState.drivers[0];
  for (const d of raceState.drivers) {
    if (distanceScore(d) > distanceScore(leader)) leader = d;
  }
  raceState.leaderId = leader?.id || raceState.leaderId;
  raceState.drivers.sort((a, b) => distanceScore(b) - distanceScore(a));
}

function calcGapSeconds(leader, d) {
  const deltaLaps = distanceScore(leader) - distanceScore(d);
  const base = (raceState.baseLapMs / 1000);
  const rainMul = 1 + raceState.rainLevel * 0.22;
  return Math.max(0, deltaLaps * base * rainMul);
}

/* ------------------------------
   RENDER
--------------------------------*/
function render() {
  // auto-recupera lista se sumir
  if (raceState.ui.driversList && raceState.ui.driversList.children.length === 0) {
    renderDriversList(true);
  } else {
    renderDriversList(false);
  }

  renderCars();
  preencherPilotosDaEquipe();
  updateUserCardStatus();
}

function renderCars() {
  if (!raceState.visuals?.length || !raceState.pathPoints?.length) return;

  const cfg = PIT_CFG[raceState.track] || PIT_CFG.default;
  const entry = cfg.entry;
  const exit = cfg.exit;

  for (const v of raceState.visuals) {
    const d = raceState.drivers.find(x => x.id === v.id);
    if (!d) continue;

    const usePitLane = (d.pitRequest && d.progress >= entry) || d.inPit;

    const pts = usePitLane ? raceState.pitPoints : raceState.pathPoints;
    const idx = Math.floor(d.progress * (pts.length - 1));
    const p = pts[idx] || pts[0];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  }
}

function renderDriversList(force) {
  const list = raceState.ui.driversList;
  if (!list) return;

  if (!force && list.dataset.rendered === "1") {
    const leader = raceState.drivers[0];
    for (let i = 0; i < Math.min(raceState.drivers.length, GRID_RENDER_LIMIT); i++) {
      const d = raceState.drivers[i];
      const row = list.querySelector(`[data-row="${d.id}"]`);
      if (!row) continue;

      const posEl = row.querySelector(".pos");
      const gapEl = row.querySelector(".gap");
      const lapsEl = row.querySelector(".laps");
      const tyreEl = row.querySelector(".tyre");

      if (posEl) posEl.textContent = String(i + 1);
      if (lapsEl) lapsEl.textContent = `Voltas: ${d.lap}`;
      if (tyreEl) tyreEl.textContent = `Pneu: ${d.tyre.key} ${(d.tyreWear * 100).toFixed(0)}%`;

      if (i === 0) {
        if (gapEl) gapEl.textContent = "LEADER";
      } else {
        const gap = calcGapSeconds(leader, d);
        if (gapEl) gapEl.textContent = formatGap(gap);
      }
    }
    return;
  }

  list.innerHTML = "";
  list.dataset.rendered = "1";

  const leader = raceState.drivers[0];

  for (let i = 0; i < Math.min(raceState.drivers.length, GRID_RENDER_LIMIT); i++) {
    const d = raceState.drivers[i];
    const row = document.createElement("div");
    row.className = "driver-row";
    row.dataset.row = d.id;
    if (d.teamKey === raceState.userTeam) row.classList.add("user-team-row");

    const faceSrc = `assets/faces/${d.code}.png`;

    row.innerHTML = `
      <div class="pos" style="width:26px; opacity:.9;">${i + 1}</div>
      <img class="face" style="width:26px;height:26px;border-radius:999px;object-fit:cover;" src="${faceSrc}" />
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.name}</div>
        <div style="opacity:.75;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.teamName}</div>
        <div class="laps" style="opacity:.65;font-size:11px;">Voltas: ${d.lap}</div>
        <div class="tyre" style="opacity:.65;font-size:11px;">Pneu: ${d.tyre.key} ${(d.tyreWear * 100).toFixed(0)}%</div>
      </div>
      <div style="margin-left:auto;text-align:right;min-width:78px;">
        <div class="gap" style="opacity:.9;font-size:12px;">${i === 0 ? "LEADER" : formatGap(calcGapSeconds(leader, d))}</div>
      </div>
    `;

    const img = row.querySelector("img.face");
    if (img) img.onerror = () => (img.style.display = "none");

    list.appendChild(row);
  }
}

/* ------------------------------
   TOP HUD
--------------------------------*/
function updateTopHUD() {
  const leader = raceState.drivers?.[0];
  const lapShown = leader ? Math.min(leader.lap + 1, raceState.totalLaps) : 1;

  safeText(raceState.ui.lapLabel, `Volta ${lapShown}`);
  safeText(raceState.ui.weatherLabel, raceState.weather);
  safeText(raceState.ui.tempLabel, `${raceState.trackTempC.toFixed(0)}°C`);
}

/* ------------------------------
   CONTROLES
--------------------------------*/
function setupSpeedControls() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      const v = Number(btn.dataset.speed || "1");
      raceState.speedMultiplier = v;
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

function setupUserButtons() {
  document.querySelectorAll(".user-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.index || "0");
      const action = String(btn.dataset.action || "");
      const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
      const d = userDrivers[idx];
      if (!d) return;
      handleUserAction(d, action);
    };
  });
}

function handleUserAction(d, action) {
  switch (action) {
    case "pit":
      d.pitRequest = !d.pitRequest;
      break;

    case "econ":
      d.tyreMode = MODE.tyre.econ;
      break;

    case "atk":
      d.tyreMode = MODE.tyre.atk;
      break;

    case "engineUp":
      d.engineMode = MODE.engine.high;
      break;

    case "engineDown":
      d.engineMode = MODE.engine.low;
      break;

    case "aggrUp":
      d.aggrMode = MODE.aggr.high;
      break;

    case "aggrDown":
      d.aggrMode = MODE.aggr.low;
      break;

    case "ers":
      d.ersBoost = !d.ersBoost;
      break;

    default:
      break;
  }

  updateUserCardStatus();
}

/* ------------------------------
   ETAPA 2 — INJETAR SELETOR DE PNEU
--------------------------------*/
function ensureTyrePickersInjected() {
  // cria mini CSS inline (não depende de arquivo)
  if (!document.getElementById("tyre-picker-style")) {
    const st = document.createElement("style");
    st.id = "tyre-picker-style";
    st.textContent = `
      .tyre-picker{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
      .tyre-chip{padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);font-weight:700;font-size:12px;cursor:pointer;user-select:none}
      .tyre-chip.active{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.28)}
      .tyre-chip small{font-weight:600;opacity:.75;margin-left:6px}
    `;
    document.head.appendChild(st);
  }

  // injeta para os 2 cards esperados: user-driver-card-0 e 1
  for (let i = 0; i < 2; i++) {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) continue;

    // evita duplicar
    if (card.querySelector(".tyre-picker")) continue;

    const host =
      card.querySelector(".user-controls") ||
      card.querySelector(".controls") ||
      card; // fallback: injeta no final do card

    const picker = document.createElement("div");
    picker.className = "tyre-picker";
    picker.innerHTML = `
      <div class="tyre-chip" data-idx="${i}" data-tyre="S">S <small>Soft</small></div>
      <div class="tyre-chip" data-idx="${i}" data-tyre="M">M <small>Med</small></div>
      <div class="tyre-chip" data-idx="${i}" data-tyre="H">H <small>Hard</small></div>
      <div class="tyre-chip" data-idx="${i}" data-tyre="I">I <small>Inter</small></div>
      <div class="tyre-chip" data-idx="${i}" data-tyre="W">W <small>Wet</small></div>
    `;

    host.appendChild(picker);
  }

  // listener global (delegação)
  if (!document.body.dataset.tyrePickerBound) {
    document.body.dataset.tyrePickerBound = "1";
    document.body.addEventListener("click", (e) => {
      const chip = e.target.closest?.(".tyre-chip");
      if (!chip) return;

      const idx = Number(chip.dataset.idx || "0");
      const tyreKey = String(chip.dataset.tyre || "");
      if (!TYRE[tyreKey]) return;

      const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
      const d = userDrivers[idx];
      if (!d) return;

      // toggle: se clicar no mesmo, desmarca
      d.selectedTyreKey = (d.selectedTyreKey === tyreKey) ? null : tyreKey;

      // atualiza UI chips
      refreshTyreChipUI();
      updateUserCardStatus();
    });
  }

  refreshTyreChipUI();
}

function refreshTyreChipUI() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);

  document.querySelectorAll(".tyre-chip").forEach(chip => {
    const idx = Number(chip.dataset.idx || "0");
    const tyreKey = String(chip.dataset.tyre || "");
    const d = userDrivers[idx];
    chip.classList.toggle("active", !!d && d.selectedTyreKey === tyreKey);
  });
}

/* ------------------------------
   CARDS DO USUÁRIO
--------------------------------*/
function preencherPilotosDaEquipe() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);

  userDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) return;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const team = card.querySelector(".user-team");
    const logo = card.querySelector(".user-logo");
    const car = card.querySelector(".user-car");
    const tyre = card.querySelector(".user-tyre");
    const engine = card.querySelector(".user-engine");
    const ers = card.querySelector(".user-ers");
    const status = card.querySelector(".user-status");

    if (name) name.textContent = d.name || "—";
    if (team) team.textContent = d.teamName || "—";

    if (face) imgOrHide(face, `assets/faces/${d.code}.png`);

    if (logo) {
      const marketLogo = d.logo && String(d.logo).trim().length ? d.logo : `assets/logos/${d.teamKey}.png`;
      imgOrHide(logo, marketLogo);
    }

    if (car) car.textContent = `${Math.round((1 - d.tyreWear) * 100)}%`;
    if (tyre) tyre.textContent = `${Math.round(d.tyreWear * 100)}%`;
    if (engine) engine.textContent = d.engineMode.key === "HIGH" ? "M2" : (d.engineMode.key === "LOW" ? "M0" : "M1");
    if (ers) ers.textContent = `${Math.round(d.ers * 100)}%`;

    if (status) {
      const pit = d.pitRequest ? "PIT" : "—";
      const sel = d.selectedTyreKey ? `PneuSel:${d.selectedTyreKey}` : "PneuSel:Auto";
      status.textContent = `${d.tyreMode.key} | ${d.engineMode.key} | ${d.aggrMode.key} | ${d.ersBoost ? "ERS BOOST" : "ERS"} | ${sel} | ${pit}`;
    }
  });

  refreshTyreChipUI();
}

function updateUserCardStatus() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
  userDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) return;
    const statusEl = card.querySelector(".user-status");
    if (!statusEl) return;

    const pit = d.pitRequest ? "PIT" : "—";
    const sel = d.selectedTyreKey ? `PneuSel:${d.selectedTyreKey}` : "PneuSel:Auto";
    statusEl.textContent = `${d.tyreMode.key} | ${d.engineMode.key} | ${d.aggrMode.key} | ${d.ersBoost ? "ERS BOOST" : "ERS"} | ${sel} | ${pit}`;
  });
}

/* ------------------------------
   AUTO-REBUILD VISUAIS
--------------------------------*/
function rebuildVisualsIfNeeded() {
  const container = raceState.ui.trackContainer;
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  raceState.visuals = [];
  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glow.setAttribute("r", 7);
    glow.setAttribute("fill", d.color || "#9aa4b2");
    glow.setAttribute("opacity", "0.25");
    g.appendChild(glow);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 4.2);
    c.setAttribute("fill", d.color || "#9aa4b2");
    g.appendChild(c);

    svg.appendChild(g);
    return { id: d.id, g };
  });
}

/* ------------------------------
   FIM DE CORRIDA
--------------------------------*/
function finishRace() {
  raceState.running = false;

  const results = raceState.drivers.map((d, i) => ({
    position: i + 1,
    id: d.id,
    name: d.name,
    teamKey: d.teamKey,
    teamName: d.teamName,
    tyre: d.tyre.key,
    bestLapMs: d.bestLapMs
  }));

  localStorage.setItem("f1m2025_last_race", JSON.stringify({
    track: raceState.track,
    gp: raceState.gp,
    weather: raceState.weather,
    trackTempC: raceState.trackTempC,
    results
  }));

  alert("Corrida finalizada! (Etapa 2) Resultado salvo em f1m2025_last_race.");
     }
