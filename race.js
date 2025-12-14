// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida oficial – bolinhas coloridas por equipe
// ==========================================================

// ------------------------------
// CONFIGURAÇÃO BÁSICA
// ------------------------------
const TOTAL_LAPS = 58;
const DEFAULT_LAP_MS = 88000;

// ------------------------------
// CORES DAS EQUIPES
// ------------------------------
const TEAM_COLORS = {
  redbull: "#1e5bc6",
  ferrari: "#dc0000",
  mercedes: "#00d2be",
  mclaren: "#ff8700",
  aston: "#006f62",
  alpine: "#2293d1",
  sauber: "#00e701",
  haas: "#ffffff",
  williams: "#005aff",
  racingbulls: "#2b4562"
};

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const raceState = {
  track: "australia",
  gp: "GP 2025",
  currentLap: 1,
  speed: 1,
  drivers: [],
  visuals: [],
  pathPoints: [],
  lastFrame: null,
  running: true
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || "australia";
  raceState.gp = params.get("gp") || "GP 2025";

  loadGridFromQualy();
  renderGridUI();

  await loadTrackSVG();
  raceState.lastFrame = performance.now();
  requestAnimationFrame(loopRace);
}

// ------------------------------
// GRID DA QUALIFICAÇÃO
// ------------------------------
function loadGridFromQualy() {
  const saved = localStorage.getItem("f1m2025_last_qualy");
  if (!saved) {
    alert("Grid da qualificação não encontrado.");
    return;
  }

  const data = JSON.parse(saved);

  raceState.drivers = data.grid.map((d, idx) => {
    const baseLap = DEFAULT_LAP_MS * (0.97 + Math.random() * 0.06);
    return {
      ...d,
      index: idx,
      progress: idx * 0.015,
      speed: 1 / baseLap,
      laps: 0,
      color: TEAM_COLORS[d.teamKey] || "#ffffff"
    };
  });
}

// ------------------------------
// SVG DA PISTA
// ------------------------------
async function loadTrackSVG() {
  const container = document.getElementById("track-container");
  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${raceState.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");

  const len = path.getTotalLength();
  const pts = [];

  for (let i = 0; i < 600; i++) {
    const p = path.getPointAtLength((len * i) / 600);
    pts.push({ x: p.x, y: p.y });
  }

  raceState.pathPoints = pts;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#666");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 6);
    c.setAttribute("fill", d.color);
    c.setAttribute("stroke", "#000");
    c.setAttribute("stroke-width", "1");

    g.appendChild(c);
    svg.appendChild(g);

    return { id: d.id, g };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function loopRace(ts) {
  const dt = (ts - raceState.lastFrame) * raceState.speed;
  raceState.lastFrame = ts;

  if (raceState.running) updateRace(dt);
  renderRace();

  requestAnimationFrame(loopRace);
}

// ------------------------------
// UPDATE
// ------------------------------
function updateRace(dt) {
  raceState.drivers.forEach(d => {
    const noise = 1 + (Math.random() - 0.5) * 0.03;
    d.progress += d.speed * noise * dt;

    if (d.progress >= 1) {
      d.progress -= 1;
      d.laps++;
    }
  });

  raceState.currentLap = Math.max(...raceState.drivers.map(d => d.laps)) + 1;
  updateRaceList();
}

// ------------------------------
// RENDER
// ------------------------------
function renderRace() {
  raceState.visuals.forEach(v => {
    const d = raceState.drivers.find(x => x.id === v.id);
    const idx = Math.floor(d.progress * (raceState.pathPoints.length - 1));
    const p = raceState.pathPoints[idx];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  });
}

// ------------------------------
// LISTA DE CORRIDA (LADO DIREITO)
// ------------------------------
function updateRaceList() {
  const list = document.getElementById("race-list");
  if (!list) return;

  list.innerHTML = "";

  [...raceState.drivers]
    .sort((a, b) => b.laps - a.laps || b.progress - a.progress)
    .forEach((d, i) => {
      const row = document.createElement("div");
      row.className = "driver-row";
      row.innerHTML = `
        <div class="pos">${i + 1}</div>
        <img src="assets/faces/${d.id.toUpperCase()}.png"
             onerror="this.src='assets/faces/default.png'"/>
        <div class="name">${d.name}</div>
      `;
      list.appendChild(row);
    });
}

// ------------------------------
// GRID DE LARGADA (INICIAL)
// ------------------------------
function renderGridUI() {
  const grid = document.getElementById("grid-list");
  if (!grid) return;

  raceState.drivers.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "grid-row";
    row.innerHTML = `
      <div>${i + 1}</div>
      <img src="assets/faces/${d.id.toUpperCase()}.png"
           onerror="this.src='assets/faces/default.png'"/>
      <div>${d.name}</div>
      <div>${d.teamKey.toUpperCase()}</div>
    `;
    grid.appendChild(row);
  });
}

// ------------------------------
// CONTROLE DE VELOCIDADE
// ------------------------------
window.setRaceSpeed = v => raceState.speed = v;
