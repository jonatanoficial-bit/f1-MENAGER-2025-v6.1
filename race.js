// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Correção definitiva do GRID + HUD + SVG
// ==========================================================

// ------------------------------
// CONSTANTES
// ------------------------------
const QUALY_KEY = "f1m2025_last_qualy";
const TRACK_POINTS = 600;

// ------------------------------
// HELPERS
// ------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const qs = (id) => document.getElementById(id);

function formatTime(ms) {
  if (!ms || !isFinite(ms)) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
}

// ------------------------------
// LISTA OFICIAL (FALLBACK)
// ------------------------------
const OFFICIAL_DRIVERS = [
  { id: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", color: "#1e1eff" },
  { id: "PER", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull Racing", color: "#1e1eff" },

  { id: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", color: "#ff0000" },
  { id: "SAI", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", color: "#ff0000" },

  { id: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", color: "#00e5ff" },
  { id: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", color: "#00e5ff" },

  { id: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", color: "#ff8700" },
  { id: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", color: "#ff8700" },

  { id: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", color: "#006f62" },
  { id: "STR", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", color: "#006f62" },

  { id: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", color: "#005bff" },
  { id: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", color: "#005bff" },

  { id: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", color: "#7aa2ff" },
  { id: "RIC", name: "Daniel Ricciardo", teamKey: "rb", teamName: "RB", color: "#7aa2ff" },

  { id: "ALB", name: "Alexander Albon", teamKey: "williams", teamName: "Williams", color: "#0099ff" },
  { id: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", color: "#0099ff" },

  { id: "HUL", name: "Nico Hulkenberg", teamKey: "haas", teamName: "Haas", color: "#ffffff" },
  { id: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", color: "#ffffff" },

  { id: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", color: "#00ff88" },
  { id: "ZHO", name: "Guanyu Zhou", teamKey: "sauber", teamName: "Sauber", color: "#00ff88" }
];

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const race = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  drivers: [],
  visuals: [],
  path: [],
  speed: 1,
  running: true,
  lastFrame: null
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  readParams();
  buildGrid();
  await loadTrack();
  createCars();
  setupSpeedButtons();
  race.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

// ------------------------------
// PARAMS
// ------------------------------
function readParams() {
  const p = new URLSearchParams(location.search);
  race.track = p.get("track") || "australia";
  race.gp = p.get("gp") || "GP 2025";
  race.userTeam = p.get("userTeam") || "ferrari";
}

// ------------------------------
// GRID (QUALY + FALLBACK)
// ------------------------------
function buildGrid() {
  let qualyGrid = [];

  try {
    const raw = localStorage.getItem(QUALY_KEY);
    if (raw) {
      const q = JSON.parse(raw);
      if (Array.isArray(q.grid)) qualyGrid = q.grid;
    }
  } catch {}

  const byId = {};
  qualyGrid.forEach(d => byId[d.id.toUpperCase()] = d);

  const fullGrid = [];
  OFFICIAL_DRIVERS.forEach(d => {
    const q = byId[d.id];
    fullGrid.push({
      id: d.id,
      name: q?.name || d.name,
      teamKey: q?.teamKey || d.teamKey,
      teamName: q?.teamName || d.teamName,
      color: d.color,
      position: q?.position || 99,
      face: `assets/faces/${d.id}.png`,
      progress: 0,
      lap: 0,
      bestLap: null,
      speed: (1 / 90000) * (1 + Math.random() * 0.03)
    });
  });

  fullGrid.sort((a, b) => a.position - b.position);

  // grid spacing real
  fullGrid.forEach((d, i) => {
    d.progress = 1 - i * 0.012;
  });

  race.drivers = fullGrid;
}

// ------------------------------
// TRACK SVG
// ------------------------------
async function loadTrack() {
  const container = qs("track-container");
  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${race.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");

  const len = path.getTotalLength();
  const pts = [];

  for (let i = 0; i < TRACK_POINTS; i++) {
    const p = path.getPointAtLength((len * i) / TRACK_POINTS);
    pts.push({ x: p.x, y: p.y });
  }

