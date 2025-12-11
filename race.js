// ==========================================================
// F1 MANAGER 2025 – RACE.JS (CORRIDA PRINCIPAL) v6.1
// FIXES/UPGRADES:
// - Compatível com seus sistemas existentes (SVG + pathPoints + speed 1x/2x/4x)
// - PIT (já existia) preservado
// - NOVO: Motor (M1..M3) + Agressividade (A1..A3) + ERS BOOST (curto, recarrega)
// - NOVO: Meteorologia (Seco/Chuva fraca/Chuva) + Temperatura pista
// - NOVO: Fatores realistas: pace / desgaste pneu / influência clima
//
// IMPORTANTE:
// - Este arquivo assume que race.html tem os IDs/classes: track-container, drivers-list,
//   gp-title, race-lap-label, weather-label, tracktemp-label, .speed-btn, .user-driver-card etc.
// ==========================================================

// ------------------------------
// CONFIG (base)
// ------------------------------
const TRACK_BASE_LAP_MS = {
  australia: 92000,
  bahrain: 95000,
  saudi: 89000,
  japan: 91000,
  china: 96000,
  miami: 93000,
  imola: 93000,
  monaco: 74000,
  canada: 90000,
  spain: 94000,
  austria: 82000,
  britain: 88000,
  hungary: 78000,
  belgium: 105000,
  netherlands: 86000,
  monza: 80000,
  azerbaijan: 103000,
  singapore: 104000,
  usa: 98000,
  mexico: 97000,
  brazil: 93000,
  lasvegas: 96000,
  qatar: 90000,
  abudhabi: 94000
};

const TEAM_LOGO = {
  ferrari:  "assets/logos/ferrari.png",
  mercedes: "assets/logos/mercedes.png",
  redbull:  "assets/logos/redbull.png",
  mclaren:  "assets/logos/mclaren.png",
  aston:    "assets/logos/aston.png",
  alpine:   "assets/logos/alpine.png",
  williams: "assets/logos/williams.png",
  haas:     "assets/logos/haas.png",
  rb:       "assets/logos/racingbulls.png",
  sauber:   "assets/logos/sauber.png",
  racingbulls: "assets/logos/racingbulls.png"
};

// ------------------------------
// MODOS DE CORRIDA (existente + coerente)
// ------------------------------
const RACE_MODES = {
  save:   { pace: 0.94, tyreWear: 0.85 },
  normal: { pace: 1.00, tyreWear: 1.00 },
  push:   { pace: 1.05, tyreWear: 1.18 }
};

// ------------------------------
// CLIMA
// ------------------------------
const WEATHER = {
  dry:       { label: "Seco",      grip: 1.00, tyreWear: 1.00 },
  lightrain: { label: "Chuva fraca",grip: 0.93, tyreWear: 1.10 },
  rain:      { label: "Chuva",     grip: 0.88, tyreWear: 1.18 }
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function rand(a, b) { return a + Math.random() * (b - a); }

// ------------------------------
// ESTADO
// ------------------------------
const raceState = {
  trackKey: "australia",
  gpName: "GP da Austrália 2025",
  userTeamKey: "ferrari",
  pathPoints: [],
  trackSvgDoc: null,
  totalLaps: 25,
  currentLap: 1,
  driverObjects: [],
  lastUpdateTime: null,
  speedMultiplier: 1,

  // clima/telemetria
  weatherKey: "dry",
  trackTempC: 26,
  nextWeatherChangeAt: 0
};

// ------------------------------
// DRIVERS (seu projeto já tem sua lista; aqui mantemos uma base mínima)
// Obs.: Se você já possui uma lista completa em outro arquivo, substitua aqui sem mudar os campos.
// ------------------------------
const DRIVERS_2025 = [
  { id: "verstappen", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", face: "assets/faces/VER.png" },
  { id: "perez", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", face: "assets/faces/PER.png" },

  { id: "leclerc", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff2a2a", face: "assets/faces/LEC.png" },
  { id: "sainz", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff2a2a", face: "assets/faces/SAI.png" },

  { id: "hamilton", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", face: "assets/faces/HAM.png" },
  { id: "russell", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", face: "assets/faces/RUS.png" },

  { id: "norris", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c00", face: "assets/faces/NOR.png" },
  { id: "piastri", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c00", face: "assets/faces/PIA.png" },

  { id: "alonso", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 90, color: "#00b894", face: "assets/faces/ALO.png" },
  { id: "stroll", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", face: "assets/faces/STR.png" },

  { id: "ocon", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/OCO.png" },
  { id: "gasly", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 89, color: "#4c6fff", face: "assets/faces/GAS.png" },

  { id: "tsunoda", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", face: "assets/faces/TSU.png" },
  { id: "lawson", name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", face: "assets/faces/LAW.png" },

  { id: "hul", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber", rating: 89, color: "#d0d0ff", face: "assets/faces/HUL.png" },
  { id: "bot", name: "Valtteri Bottas", teamKey: "sauber", teamName: "Sauber", rating: 88, color: "#d0d0ff", face: "assets/faces/BOT.png" }
];

// ------------------------------
// UI helpers
// ------------------------------
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function setTeamLogoTop(teamKey) {
  const img = document.getElementById("teamLogoTop");
  if (!img) return;
  const src = TEAM_LOGO[teamKey] || TEAM_LOGO.ferrari;
  img.src = src;
  img.onerror = () => { img.onerror = null; img.src = TEAM_LOGO.ferrari; };
}

function formatLapTime(ms) {
  if (!isFinite(ms) || ms <= 0) return "--:--.---";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((ms % 1000));
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

// ------------------------------
// TRACK PATH / POS
// ------------------------------
function getPositionOnTrack(progress) {
  const pts = raceState.pathPoints;
  if (!pts || pts.length < 2) return { x: 0, y: 0 };
  const total = pts.length;
  let idxFloat = progress * total;
  let i0 = Math.floor(idxFloat);
  let i1 = (i0 + 1) % total;
  let t = idxFloat - i0;
  if (i0 >= total) i0 = total - 1;
  if (i1 >= total) i1 = 0;
  const p0 = pts[i0];
  const p1 = pts[i1];
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

// ------------------------------
// LOAD TRACK SVG (preserva sistema atual)
// ------------------------------
async function loadTrackSvg(trackKey) {
  const container = document.getElementById("track-container");
  if (!container) return;

  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "track-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  container.appendChild(svg);

  let text;
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG:", e);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path") || doc.querySelector("#trackPath") || doc.querySelector("#raceLine");
  if (!path) {
    console.error("Nenhum <path> encontrado no SVG");
    return;
  }

  // pathPoints por getPointAtLength (igual sua arquitetura)
  const totalLen = path.getTotalLength();
  const samples = 1600;
  raceState.pathPoints = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAtLength((i / samples) * totalLen);
    raceState.pathPoints.push({ x: p.x, y: p.y });
  }

  // Desenho “bonito” estilo practice (mais espesso/escuro)
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "#0a0a0a");
  poly.setAttribute("stroke-width", "18");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  svg.appendChild(poly);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  inner.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "rgba(255,255,255,.10)");
  inner.setAttribute("stroke-width", "8");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  svg.appendChild(inner);

  // linha de chegada
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", raceState.pathPoints[0].x);
  flag.setAttribute("y", raceState.pathPoints[0].y);
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.setAttribute("dominant-baseline", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  // car nodes
  raceState.driverObjects.forEach((drv) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "car-node");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shadow.setAttribute("r", "10");
    shadow.setAttribute("fill", "rgba(0,0,0,0.35)");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "7.5");
    dot.setAttribute("fill", drv.color || "#ff2a2a");

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("r", "9");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "rgba(255,255,255,0.65)");
    ring.setAttribute("stroke-width", "1.25");

    g.appendChild(shadow);
    g.appendChild(dot);
    g.appendChild(ring);
    svg.appendChild(g);

    drv.svgNode = g;
  });
}

// ------------------------------
// DRIVER UI: cards do usuário
// ------------------------------
function preencherPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.driverObjects.filter(d => d.teamKey === team).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const card = document.getElementById(`user-driver-card-${idx}`);
    if (!card) return;
    card.dataset.driverId = drv.id;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const teamName = card.querySelector(".user-team");

    const carSpan = card.querySelector(`#user-car-${idx}`);
    const tyreSpan = card.querySelector(`#user-tyre-${idx}`);
    const engSpan = card.querySelector(`#user-engine-${idx}`);
    const agrSpan = card.querySelector(`#user-aggr-${idx}`);
    const ersSpan = card.querySelector(`#user-ers-${idx}`);

    if (face) {
      face.src = drv.face || "";
      face.onerror = () => { face.onerror = null; face.src = "assets/faces/default.png"; };
    }
    if (name) name.textContent = drv.name;
    if (teamName) teamName.textContent = drv.teamName;

    if (carSpan) carSpan.textContent = `${(100 - drv.carWear).toFixed(0)}%`;
    if (tyreSpan) tyreSpan.textContent = `${drv.tyreWear.toFixed(0)}%`;
    if (engSpan) engSpan.textContent = `M${drv.engineMode}`;
    if (agrSpan) agrSpan.textContent = `A${drv.aggression}`;
    if (ersSpan) ersSpan.textContent = `${drv.ers.toFixed(0)}%`;
  });

  atualizarPainelUsuario();
}

function atualizarPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.driverObjects.filter(d => d.teamKey === team).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const card = document.getElementById(`user-driver-card-${idx}`);
    if (!card) return;

    const statusEl = card.querySelector(".user-status");
    const engSpan = card.querySelector(`#user-engine-${idx}`);
    const agrSpan = card.querySelector(`#user-aggr-${idx}`);
    const ersSpan = card.querySelector(`#user-ers-${idx}`);
    const tyreSpan = card.querySelector(`#user-tyre-${idx}`);

    if (statusEl) {
      if (drv.forcePit || drv.wantsPit) statusEl.textContent = "Chamado para o box";
      else if (drv.raceMode === "push") statusEl.textContent = "Ataque";
      else if (drv.raceMode === "save") statusEl.textContent = "Economizar";
      else statusEl.textContent = "Normal";
    }
    if (engSpan) engSpan.textContent = `M${drv.engineMode}`;
    if (agrSpan) agrSpan.textContent = `A${drv.aggression}`;
    if (ersSpan) ersSpan.textContent = `${drv.ers.toFixed(0)}%`;
    if (tyreSpan) tyreSpan.textContent = `${drv.tyreWear.toFixed(0)}%`;
  });
}

// ------------------------------
// AÇÕES DO USUÁRIO
// ------------------------------
function handleUserAction(cardIndex, action) {
  const card = document.getElementById(`user-driver-card-${cardIndex}`);
  if (!card) return;
  const driverId = card.dataset.driverId;
  const drv = raceState.driverObjects.find((d) => d.id === driverId);
  if (!drv) return;

  if (action === "pit") {
    drv.forcePit = true;
    return;
  }

  if (action === "push") drv.raceMode = "push";
  else if (action === "save") drv.raceMode = "save";

  // NOVO: motor
  else if (action === "engineUp") drv.engineMode = clamp(drv.engineMode + 1, 1, 3);
  else if (action === "engineDown") drv.engineMode = clamp(drv.engineMode - 1, 1, 3);

  // NOVO: agressividade
  else if (action === "aggrUp") drv.aggression = clamp(drv.aggression + 1, 1, 3);
  else if (action === "aggrDown") drv.aggression = clamp(drv.aggression - 1, 1, 3);

  // NOVO: ERS boost
  else if (action === "ers") {
    if (drv.ers >= 15 && drv.ersBoostUntil < performance.now()) {
      drv.ers -= 15;
      drv.ersBoostUntil = performance.now() + 6500; // ~6.5s boost
    }
  }

  atualizarPainelUsuario();
}

// ------------------------------
// SPEED
// ------------------------------
function setRaceSpeed(mult) {
  raceState.speedMultiplier = mult;
}

// ------------------------------
// WEATHER DYNAMICS
// ------------------------------
function initWeather() {
  raceState.weatherKey = "dry";
  raceState.trackTempC = 26;
  raceState.nextWeatherChangeAt = performance.now() + rand(40000, 80000); // 40–80s
  updateWeatherUI();
}

function maybeChangeWeather(now) {
  if (now < raceState.nextWeatherChangeAt) return;

  // transições simples e coerentes
  const roll = Math.random();
  if (raceState.weatherKey === "dry") {
    raceState.weatherKey = (roll < 0.65) ? "dry" : (roll < 0.88 ? "lightrain" : "rain");
  } else if (raceState.weatherKey === "lightrain") {
    raceState.weatherKey = (roll < 0.45) ? "dry" : (roll < 0.80 ? "lightrain" : "rain");
  } else {
    raceState.weatherKey = (roll < 0.25) ? "lightrain" : (roll < 0.35 ? "dry" : "rain");
  }

  // temperatura varia com clima
  if (raceState.weatherKey === "dry") raceState.trackTempC = clamp(raceState.trackTempC + rand(-0.3, 0.6), 24, 38);
  if (raceState.weatherKey === "lightrain") raceState.trackTempC = clamp(raceState.trackTempC + rand(-0.8, 0.2), 18, 30);
  if (raceState.weatherKey === "rain") raceState.trackTempC = clamp(raceState.trackTempC + rand(-1.2, 0.1), 16, 26);

  raceState.nextWeatherChangeAt = now + rand(45000, 90000);
  updateWeatherUI();
}

function updateWeatherUI() {
  const w = WEATHER[raceState.weatherKey] || WEATHER.dry;
  setText("weather-label", `Clima: ${w.label}`);
  setText("tracktemp-label", `Pista: ${Math.round(raceState.trackTempC)}°C`);
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function updateRaceSimulation(dtMs) {
  if (!raceState.pathPoints.length) return;

  const now = performance.now();
  maybeChangeWeather(now);

  const totalLaps = raceState.totalLaps;
  const wCfg = WEATHER[raceState.weatherKey] || WEATHER.dry;

  raceState.driverObjects.forEach((drv) => {
    const modeCfg = RACE_MODES[drv.raceMode] || RACE_MODES.normal;

    // Motor/Agressividade/ERS influenciam pace e pneus
    const enginePace = (drv.engineMode === 1) ? 0.97 : (drv.engineMode === 3 ? 1.03 : 1.00);
    const aggrPace = (drv.aggression === 1) ? 0.985 : (drv.aggression === 3 ? 1.02 : 1.00);

    const ersBoostActive = (drv.ersBoostUntil > now) ? 1.035 : 1.0;

    // Clima impacta grip (reduz pace efetivo) e aumenta desgaste
    const weatherPace = wCfg.grip; // < 1 => mais lento
    const weatherWear = wCfg.tyreWear;

    // desgaste pneu: quanto mais gasto, mais lento
    const tyreFactor = 1 + drv.tyreWear * 0.005; // 100% => +50% de tempo
    const effectiveLapMs =
      (drv.idealLapMs * tyreFactor) /
      (modeCfg.pace * enginePace * aggrPace * ersBoostActive * weatherPace);

    const baseSpeed = 1 / effectiveLapMs; // progress por ms
    const noise = (Math.random() - 0.5) * baseSpeed * 0.07;

    let newProgress = drv.progress + (baseSpeed + noise) * dtMs * raceState.speedMultiplier;

    // completou volta
    if (newProgress >= 1) {
      newProgress -= 1;

      const lapTime = now - drv.lastLapTimestamp;
      drv.lastLapTimestamp = now;
      drv.laps += 1;
      drv.lastLapTime = lapTime;
      drv.totalTime += lapTime;

      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) drv.bestLapTime = lapTime;

      // desgaste de pneu por volta (agressividade + motor + clima)
      const wearBase = 3; // %
      const aggrWear = (drv.aggression === 1) ? 0.88 : (drv.aggression === 3 ? 1.18 : 1.0);
      const engWear = (drv.engineMode === 1) ? 0.92 : (drv.engineMode === 3 ? 1.10 : 1.0);
      const ersWear = (drv.ersBoostUntil > now) ? 1.08 : 1.0;

      drv.tyreWear += wearBase * modeCfg.tyreWear * aggrWear * engWear * ersWear * weatherWear;
      drv.tyreWear = clamp(drv.tyreWear, 0, 100);

      // ERS regenera por volta (mais em modo save, menos em push)
      const ersRegen = (drv.raceMode === "save") ? 8 : (drv.raceMode === "push" ? 4 : 6);
      drv.ers = clamp(drv.ers + ersRegen, 0, 100);

      // piloto pedindo box quando pneu > 80% (para o time do jogador)
      if (drv.tyreWear >= 80 && drv.teamKey === raceState.userTeamKey) drv.wantsPit = true;
    }

    drv.progress = newProgress;
  });

  // terminou corrida?
  const finished = raceState.driverObjects.some((d) => d.laps >= totalLaps);
  if (finished) {
    finalizarCorrida();
  }
}

// ------------------------------
// RENDER
// ------------------------------
function renderRace() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  // ordena por voltas e progresso (simples e estável)
  const ordenados = raceState.driverObjects
    .slice()
    .sort((a, b) => (b.laps - a.laps) || (b.progress - a.progress));

  // lap UI (pega melhor estimativa do líder)
  const leader = ordenados[0];
  raceState.currentLap = Math.min(raceState.totalLaps, (leader?.laps || 0) + 1);
  setText("race-lap-label", `Volta ${raceState.currentLap} / ${raceState.totalLaps}`);

  list.innerHTML = "";

  ordenados.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    row.style.display = "grid";
    row.style.gridTemplateColumns = "54px 1fr 90px";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.padding = "8px 0";
    row.style.borderBottom = "1px solid rgba(255,255,255,.06)";

    const pos = document.createElement("div");
    pos.style.fontWeight = "900";
    pos.style.opacity = ".95";
    pos.textContent = `${idx + 1}º`;

    const info = document.createElement("div");
    info.style.display = "flex";
    info.style.alignItems = "center";
    info.style.gap = "10px";
    info.style.minWidth = "0";

    const face = document.createElement("img");
    face.src = drv.face || "";
    face.className = "driver-face";
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
        ${drv.name}
      </div>
      <div style="opacity:.7; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        ${drv.teamName}
      </div>
    `;

    const time = document.createElement("div");
    time.style.textAlign = "right";
    time.style.opacity = ".9";
    time.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    time.style.fontSize = "12px";
    time.textContent = formatLapTime(drv.bestLapTime || drv.lastLapTime || 0);

    info.appendChild(face);
    info.appendChild(txt);

    row.appendChild(pos);
    row.appendChild(info);
    row.appendChild(time);

    list.appendChild(row);
  });

  // posiciona carros no SVG
  raceState.driverObjects.forEach((drv) => {
    if (!drv.svgNode) return;
    const p = getPositionOnTrack(drv.progress);
    drv.svgNode.setAttribute("transform", `translate(${p.x} ${p.y})`);
  });

  atualizarPainelUsuario();
}

// ------------------------------
// PIT STOP (preservado)
// ------------------------------
function aplicarPitStopsSeNecessario(now) {
  raceState.driverObjects.forEach((drv) => {
    if (!drv.forcePit && !drv.wantsPit) return;

    // pit só entra ao cruzar linha (progress ~0)
    if (drv.progress < 0.01) {
      drv.forcePit = false;
      drv.wantsPit = false;
      drv.pitStops += 1;

      // pit time varia com clima e desgaste
      const wCfg = WEATHER[raceState.weatherKey] || WEATHER.dry;
      const pitMs = (20000 + Math.random() * 5000) * (wCfg.grip < 1 ? 1.06 : 1.0);
      drv.totalTime += pitMs;

      // pneu novo
      drv.tyreWear = 0;

      // ERS recupera um pouco
      drv.ers = clamp(drv.ers + 12, 0, 100);
    }
  });
}

// ------------------------------
// LOOP
// ------------------------------
function raceLoop(now) {
  if (raceState.lastUpdateTime == null) {
    raceState.lastUpdateTime = now;
    requestAnimationFrame(raceLoop);
    return;
  }

  const dt = Math.min(60, now - raceState.lastUpdateTime);
  raceState.lastUpdateTime = now;

  updateRaceSimulation(dt);
  aplicarPitStopsSeNecessario(now);
  renderRace();

  requestAnimationFrame(raceLoop);
}

// ------------------------------
// CONTROLES
// ------------------------------
function attachControlEvents() {
  // velocidade
  document.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = Number(btn.dataset.speed || "1") || 1;
      setRaceSpeed(mult);
      document.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // botões de ação dos 2 pilotos do usuário
  document
    .querySelectorAll(".user-driver-card .user-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index || "0");
        const action = btn.dataset.action;
        handleUserAction(idx, action);
      });
    });

  // voltar ao lobby
  const back = document.getElementById("btnBackLobby");
  if (back) {
    back.addEventListener("click", () => {
      const qp = new URLSearchParams(window.location.search);
      window.location.href = `lobby.html?${qp.toString()}`;
    });
  }
}

// ------------------------------
// FINALIZAÇÃO / PÓDIO (mantém IDs do modal)
// ------------------------------
function finalizarCorrida() {
  // trava para não duplicar
  if (raceState._finished) return;
  raceState._finished = true;

  const ordered = raceState.driverObjects
    .slice()
    .sort((a, b) => a.totalTime - b.totalTime);

  raceState.podium = ordered.slice(0, 3);
  mostrarModalResultado(ordered);
}

function mostrarModalResultado() {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const [p1, p2, p3] = raceState.podium || [];

  const face1 = document.getElementById("podium1-face");
  const face2 = document.getElementById("podium2-face");
  const face3 = document.getElementById("podium3-face");
  const name1 = document.getElementById("podium1-name");
  const name2 = document.getElementById("podium2-name");
  const name3 = document.getElementById("podium3-name");
  const team1 = document.getElementById("podium1-team");
  const team2 = document.getElementById("podium2-team");
  const team3 = document.getElementById("podium3-team");

  if (p1 && face1) face1.src = p1.face || "";
  if (p2 && face2) face2.src = p2.face || "";
  if (p3 && face3) face3.src = p3.face || "";

  if (p1 && name1) name1.textContent = p1.name;
  if (p2 && name2) name2.textContent = p2.name;
  if (p3 && name3) name3.textContent = p3.name;

  if (p1 && team1) team1.textContent = p1.teamName;
  if (p2 && team2) team2.textContent = p2.teamName;
  if (p3 && team3) team3.textContent = p3.teamName;

  modal.style.display = "flex";
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;
  modal.style.display = "none";
}
window.closePodium = closePodium;

// ------------------------------
// INIT
// ------------------------------
function initRace() {
  const params = new URLSearchParams(window.location.search);
  const track = (params.get("track") || "australia").toLowerCase();
  const gp = params.get("gp") || "GP da Austrália 2025";
  const userTeam =
    (params.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      "ferrari").toLowerCase();

  raceState.trackKey = track;
  raceState.gpName = gp;
  raceState.userTeamKey = userTeam;

  setText("gp-title", `F1 MANAGER 2025 — ${gp}`);
  setTeamLogoTop(userTeam);

  const baseLap = TRACK_BASE_LAP_MS[track] || 90000;
  raceState.totalLaps = Math.round(2700000 / baseLap); // ~45min
  raceState.currentLap = 1;

  initWeather();

  // monta drivers
  raceState.driverObjects = DRIVERS_2025.map((d, index) => {
    // base pace por rating
    const ratingFactor = 1 - ((100 - (d.rating || 85)) * 0.0032); // rating alto = melhor
    const idealLapMs = baseLap / ratingFactor;

    return {
      id: d.id,
      code: d.id,
      name: d.name,
      teamKey: d.teamKey,
      teamName: d.teamName,
      rating: d.rating,
      color: d.color,
      face: d.face,

      progress: (index / DRIVERS_2025.length) * 0.85,
      laps: 0,
      idealLapMs,
      lastLapTimestamp: performance.now(),
      lastLapTime: null,
      bestLapTime: null,
      totalTime: 0,

      tyreWear: rand(0, 8),
      carWear: rand(0, 5),
      pitStops: 0,

      raceMode: "normal",
      wantsPit: false,
      forcePit: false,

      // NOVO: motor/agress/ERS
      engineMode: 2,
      aggression: 2,
      ers: 50,
      ersBoostUntil: 0,

      svgNode: null
    };
  });

  // UI do jogador
  preencherPainelUsuario();

  // pista + loop
  loadTrackSvg(track).then(() => {
    attachControlEvents();
    raceState.lastUpdateTime = performance.now();
    requestAnimationFrame(raceLoop);
  });
}

document.addEventListener("DOMContentLoaded", initRace);
