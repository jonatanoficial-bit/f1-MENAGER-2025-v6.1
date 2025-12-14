// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida Oficial – Grid parado na largada (v6.1 estável)
// ==========================================================

// ------------------------------
// CONFIGURAÇÃO
// ------------------------------
const RACE_CONFIG = {
  totalLaps: 58,
  gridSpacing: 0.006, // distância entre carros no grid
  baseLapTimeMs: {
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
  }
};

// ------------------------------
// HELPERS
// ------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function formatLap(ms) {
  if (!ms || !isFinite(ms)) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
}

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",

  baseLapMs: 90000,
  totalLaps: 58,

  drivers: [],
  visuals: [],
  pathPoints: [],

  speedMultiplier: 1,
  running: true,
  lastFrame: null
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || "australia";
  raceState.gp = params.get("gp") || "GP 2025";
  raceState.userTeam = params.get("userTeam") || "ferrari";

  raceState.baseLapMs =
    RACE_CONFIG.baseLapTimeMs[raceState.track] || 90000;

  raceState.totalLaps = RACE_CONFIG.totalLaps;

  initDriversFromQualy();
  await loadTrackSvg();
  setupSpeedControls();

  raceState.lastFrame = performance.now();
  requestAnimationFrame(gameLoop);
}

// ------------------------------
// PILOTOS – GRID DA QUALI
// ------------------------------
function initDriversFromQualy() {
  let grid = [];

  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.grid)) grid = parsed.grid;
    }
  } catch {}

  if (!grid.length) {
    console.warn("Grid da qualificação não encontrado.");
    return;
  }

  raceState.drivers = grid.map((d, idx) => {
    const skill = 1 - ((d.rating || 85) - 92) * 0.006;
    const baseSpeed = 1 / (raceState.baseLapMs * skill);

    return {
      ...d,
      index: idx,
      position: idx + 1,
      // GRID PARADO NA LARGADA
      progress: clamp(1 - idx * RACE_CONFIG.gridSpacing, 0, 1),
      speed: baseSpeed,
      laps: 0,
      simLapMs: 0,
      lastLap: null,
      bestLap: null
    };
  });
}

// ------------------------------
// SVG DA PISTA (NORMALIZADO)
// ------------------------------
async function loadTrackSvg() {
  const container = document.getElementById("track-container");
  if (!container) return;

  container.innerHTML = "";

  const svgText = await fetch(
    `assets/tracks/${raceState.track}.svg`
  ).then(r => r.text());

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");

  const path =
    doc.querySelector("path") ||
    doc.querySelector("polyline") ||
    doc.querySelector("polygon");

  if (!path) {
    console.error("SVG da pista sem path válido.");
    return;
  }

  const len = path.getTotalLength();
  const samples = 500;
  const pts = [];

  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  // NORMALIZA PARA VIEWBOX
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  raceState.pathPoints = pts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  container.appendChild(svg);

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute(
    "points",
    raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" ")
  );
  poly.setAttribute("stroke", "#666");
  poly.setAttribute("stroke-width", "18");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 6);
    c.setAttribute("fill", "#ffffff");
    g.appendChild(c);
    svg.appendChild(g);
    return { id: d.id, g };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function gameLoop(ts) {
  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  if (raceState.running) updateRace(dt);
  renderRace();

  requestAnimationFrame(gameLoop);
}

// ------------------------------
// UPDATE
// ------------------------------
function updateRace(dt) {
  raceState.drivers.forEach(d => {
    const noise = 1 + (Math.random() - 0.5) * 0.03;
    d.progress += d.speed * noise * dt;
    d.simLapMs += dt;

    if (d.progress >= 1) {
      d.progress -= 1;
      d.laps++;
      d.lastLap = d.simLapMs;
      if (!d.bestLap || d.simLapMs < d.bestLap) d.bestLap = d.simLapMs;
      d.simLapMs = 0;
    }
  });
}

// ------------------------------
// RENDER
// ------------------------------
function renderRace() {
  raceState.visuals.forEach(v => {
    const d = raceState.drivers.find(x => x.id === v.id);
    if (!d) return;

    const idx = clamp(
      Math.floor(d.progress * (raceState.pathPoints.length - 1)),
      0,
      raceState.pathPoints.length - 1
    );

    const p = raceState.pathPoints[idx];
    if (!p) return;

    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  });
}

// ------------------------------
// UI – VELOCIDADE
// ------------------------------
function setRaceSpeed(v) {
  raceState.speedMultiplier = v;
}

function setupSpeedControls() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      setRaceSpeed(Number(btn.dataset.speed || 1));
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

window.setRaceSpeed = setRaceSpeed;
