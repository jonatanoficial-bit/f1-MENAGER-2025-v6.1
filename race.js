// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Correção total da corrida (SVG + Grid + HUD + Movimento)
// ==========================================================

// ------------------------------
// CONSTANTES
// ------------------------------
const SEASON_KEY = "f1m2025_last_qualy";
const TRACK_SAMPLE_POINTS = 600;
const FPS_BASE = 60;

// ------------------------------
// HELPERS
// ------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function qs(id) {
  return document.getElementById(id);
}

function formatTime(ms) {
  if (!ms || !isFinite(ms)) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
}

// ------------------------------
// ESTADO GLOBAL DA CORRIDA
// ------------------------------
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  running: true,
  speed: 1,
  path: [],
  drivers: [],
  visuals: [],
  lastFrame: null,
  lapDistance: 1,
  totalLaps: 58
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  readParams();
  loadGridFromQualy();
  await loadTrackSVG();
  createDriverVisuals();
  raceState.lastFrame = performance.now();
  setupSpeedButtons();
  requestAnimationFrame(raceLoop);
}

// ------------------------------
// URL PARAMS
// ------------------------------
function readParams() {
  const p = new URLSearchParams(location.search);
  raceState.track = p.get("track") || "australia";
  raceState.gp = p.get("gp") || "GP 2025";
  raceState.userTeam = p.get("userTeam") || "ferrari";

  if (qs("race-title-gp")) {
    qs("race-title-gp").textContent = raceState.gp;
  }
}

// ------------------------------
// GRID DA QUALIFICAÇÃO
// ------------------------------
function loadGridFromQualy() {
  const raw = localStorage.getItem(SEASON_KEY);
  if (!raw) {
    alert("ERRO: Grid da qualificação não encontrado.");
    return;
  }

  const qualy = JSON.parse(raw);

  raceState.drivers = qualy.grid.map((d, i) => ({
    id: d.id,
    name: d.name,
    teamKey: d.teamKey,
    teamName: d.teamName,
    position: d.position,
    face: `assets/faces/${d.id.toUpperCase().slice(0,3)}.png`,
    color: getTeamColor(d.teamKey),
    progress: (qualy.grid.length - i) * 0.002,
    speed: (1 / 90000) * (1 + Math.random() * 0.05),
    lap: 0,
    lastLap: null,
    bestLap: null,
    status: "RACING"
  }));
}

// ------------------------------
// CORES DAS EQUIPES
// ------------------------------
function getTeamColor(team) {
  const map = {
    ferrari: "#ff0000",
    redbull: "#1e1eff",
    mercedes: "#00e5ff",
    mclaren: "#ff8700",
    aston: "#006f62",
    alpine: "#005bff",
    sauber: "#00ff88",
    haas: "#ffffff",
    williams: "#0099ff",
    rb: "#7aa2ff",
    racingbulls: "#7f00ff"
  };
  return map[team] || "#ffffff";
}

// ------------------------------
// SVG DA PISTA
// ------------------------------
async function loadTrackSVG() {
  const container = qs("track-container");
  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${raceState.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");

  const len = path.getTotalLength();
  const pts = [];

  for (let i = 0; i < TRACK_SAMPLE_POINTS; i++) {
    const p = path.getPointAtLength((len * i) / TRACK_SAMPLE_POINTS);
    pts.push({ x: p.x, y: p.y });
  }

  raceState.path = pts;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#555");
  poly.setAttribute("stroke-width", "18");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  raceState.svg = svg;
}

// ------------------------------
// CRIA CARROS (BOLINHAS)
// ------------------------------
function createDriverVisuals() {
  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    c.setAttribute("r", 6);
    c.setAttribute("fill", d.color);
    c.setAttribute("stroke", "#000");
    c.setAttribute("stroke-width", "1");

    g.appendChild(c);
    raceState.svg.appendChild(g);

    return { id: d.id, g };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function raceLoop(ts) {
  if (!raceState.lastFrame) raceState.lastFrame = ts;
  const dt = (ts - raceState.lastFrame) * raceState.speed;
  raceState.lastFrame = ts;

  if (raceState.running) {
    updateRace(dt);
    renderRace();
    renderHUD();
  }

  requestAnimationFrame(raceLoop);
}

// ------------------------------
// UPDATE
// ------------------------------
function updateRace(dt) {
  raceState.drivers.forEach(d => {
    if (d.status !== "RACING") return;

    d.progress += d.speed * dt;
    if (d.progress >= 1) {
      d.progress -= 1;
      d.lap++;
      d.lastLap = dt;
      if (!d.bestLap || dt < d.bestLap) d.bestLap = dt;
    }
  });

  raceState.drivers.sort((a, b) => {
    if (b.lap !== a.lap) return b.lap - a.lap;
    return b.progress - a.progress;
  });
}

// ------------------------------
// RENDER SVG
// ------------------------------
function renderRace() {
  raceState.visuals.forEach(v => {
    const d = raceState.drivers.find(x => x.id === v.id);
    const idx = Math.floor(d.progress * (raceState.path.length - 1));
    const p = raceState.path[idx];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  });
}

// ------------------------------
// HUD / LISTA DE PILOTOS
// ------------------------------
function renderHUD() {
  const list = qs("drivers-list");
  if (!list) return;

  list.innerHTML = "";

  raceState.drivers.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "driver-row";
    if (d.teamKey === raceState.userTeam) row.classList.add("user-team-row");

    row.innerHTML = `
      <div class="pos">${i + 1}</div>
      <img src="${d.face}" onerror="this.src='assets/faces/default.png'">
      <div class="name">${d.name}</div>
      <div class="lap">${d.lap}</div>
      <div class="time">${formatTime(d.bestLap)}</div>
    `;
    list.appendChild(row);
  });
}

// ------------------------------
// VELOCIDADE
// ------------------------------
function setupSpeedButtons() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      raceState.speed = Number(btn.dataset.speed || 1);
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
  }
