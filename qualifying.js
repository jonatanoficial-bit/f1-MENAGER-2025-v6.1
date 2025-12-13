// ==========================================================
// F1 MANAGER 2025 – QUALIFYING.JS (Q1 / Q2 / Q3)
// Versão FINAL corrigida (tempo simulado + mercado + speed real)
// ==========================================================

// ------------------------------
// CONFIG DAS FASES
// ------------------------------
const QUALY_PHASES = [
  { id: "Q1", totalLaps: 6, eliminated: 5 },
  { id: "Q2", totalLaps: 5, eliminated: 5 },
  { id: "Q3", totalLaps: 4, eliminated: 0 }
];

// ------------------------------
// TEMPO BASE POR PISTA (ms)
// ------------------------------
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

// ------------------------------
// HELPERS
// ------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function formatLapTime(ms) {
  if (!isFinite(ms) || ms <= 0) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
}

// ------------------------------
// MERCADO / RUNTIME DRIVERS
// ------------------------------
function getRuntimeDrivers() {
  if (!window.PilotMarketSystem) return [];

  PilotMarketSystem.init();
  const list = [];

  PilotMarketSystem.getTeams().forEach(team => {
    PilotMarketSystem.getActiveDriversForTeam(team).forEach(p => {
      list.push({
        id: p.id,
        code: p.code || p.id.toUpperCase(),
        name: p.name,
        teamKey: p.teamKey,
        teamName: p.teamName,
        rating: p.rating || 75,
        color: p.color || "#fff",
        logo: p.logo || ""
      });
    });
  });

  return list;
}

function getPerfMultiplier(driverId) {
  if (!window.PilotMarketSystem) return 1;
  const p = PilotMarketSystem.getPilot(driverId);
  if (!p) return 1;

  const ratingMul = 1 + (clamp(p.rating, 40, 99) - 92) * 0.0025;
  const formMul = 1 + (clamp(p.form, 0, 100) - 55) * 0.0012;
  return clamp(ratingMul * formMul, 0.9, 1.08);
}

// ------------------------------
// ESTADO DA QUALY
// ------------------------------
const qualyState = {
  phaseIndex: 0,
  currentLap: 1,
  running: true,
  speedMultiplier: 1,
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  baseLapMs: 90000,
  drivers: [],
  visuals: [],
  pathPoints: [],
  lastFrame: null,
  finalGrid: null
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initQualifying);

async function initQualifying() {
  const params = new URLSearchParams(location.search);
  qualyState.track = params.get("track") || "australia";
  qualyState.gp = params.get("gp") || "GP 2025";
  qualyState.userTeam = params.get("userTeam") || "ferrari";
  qualyState.baseLapMs = TRACK_BASE_LAP_TIME_MS[qualyState.track] || 90000;

  document.getElementById("qualy-title-gp").textContent = qualyState.gp;

  setupSpeedControls();
  initDrivers();
  await loadTrackSvg();
  qualyState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

// ------------------------------
// DRIVERS
// ------------------------------
function initDrivers() {
  const runtime = getRuntimeDrivers();

  qualyState.drivers = runtime.map((d, idx) => {
    const skill = 1 - (d.rating - 92) * 0.006;
    const perf = getPerfMultiplier(d.id);
    const lapTarget = qualyState.baseLapMs * skill / perf;

    return {
      ...d,
      index: idx,
      progress: Math.random(),
      speed: 1 / lapTarget,
      laps: 0,
      simLapMs: 0,
      bestLap: null,
      lastLap: null
    };
  });

  preencherPilotosDaEquipe();
}

// ------------------------------
// SVG TRACK
// ------------------------------
async function loadTrackSvg() {
  const container = document.getElementById("track-container");
  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${qualyState.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");
  const len = path.getTotalLength();

  const pts = [];
  for (let i = 0; i < 400; i++) {
    const p = path.getPointAtLength((len * i) / 400);
    pts.push({ x: p.x, y: p.y });
  }

  qualyState.pathPoints = pts;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#555");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  qualyState.visuals = qualyState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 6);
    c.setAttribute("fill", d.color);
    g.appendChild(c);
    svg.appendChild(g);
    return { id: d.id, g };
  });
}

// ------------------------------
// LOOP
// ------------------------------
function loop(ts) {
  const dt = (ts - qualyState.lastFrame) * qualyState.speedMultiplier;
  qualyState.lastFrame = ts;

  if (qualyState.running) update(dt);
  render();

  requestAnimationFrame(loop);
}

// ------------------------------
// UPDATE
// ------------------------------
function update(dt) {
  const phase = QUALY_PHASES[qualyState.phaseIndex];

  qualyState.drivers.forEach(d => {
    const noise = 1 + (Math.random() - 0.5) * 0.04;
    const delta = d.speed * noise * dt;
    d.progress += delta;
    d.simLapMs += dt;

    if (d.progress >= 1) {
      d.progress -= 1;
      d.laps++;
      d.lastLap = d.simLapMs;
      if (!d.bestLap || d.simLapMs < d.bestLap) d.bestLap = d.simLapMs;
      d.simLapMs = 0;
    }
  });

  const maxLaps = Math.max(...qualyState.drivers.map(d => d.laps));
  if (maxLaps >= phase.totalLaps) finalizarFase();
}

// ------------------------------
// RENDER
// ------------------------------
function render() {
  qualyState.visuals.forEach(v => {
    const d = qualyState.drivers.find(x => x.id === v.id);
    const idx = Math.floor(d.progress * (qualyState.pathPoints.length - 1));
    const p = qualyState.pathPoints[idx];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  });

  atualizarLista();
}

// ------------------------------
// LISTA
// ------------------------------
function atualizarLista() {
  const list = document.getElementById("drivers-list");
  list.innerHTML = "";

  [...qualyState.drivers]
    .sort((a, b) => (a.bestLap ?? 9999999) - (b.bestLap ?? 9999999))
    .forEach((d, i) => {
      const row = document.createElement("div");
      row.className = "driver-row";
      row.innerHTML = `
        <div>${i + 1}</div>
        <img src="assets/faces/${d.code}.png" />
        <div>${d.name}</div>
        <div>${formatLapTime(d.bestLap)}</div>
      `;
      if (d.teamKey === qualyState.userTeam) row.classList.add("user-team-row");
      list.appendChild(row);
    });
}

// ------------------------------
// FINALIZA FASE
// ------------------------------
function finalizarFase() {
  qualyState.running = false;

  const phase = QUALY_PHASES[qualyState.phaseIndex];
  const ordenado = [...qualyState.drivers].sort((a, b) => (a.bestLap ?? 9999999) - (b.bestLap ?? 9999999));

  if (phase.eliminated > 0) {
    qualyState.drivers = ordenado.slice(0, ordenado.length - phase.eliminated);
  } else {
    qualyState.finalGrid = ordenado;
    salvarGrid();
    document.getElementById("qualy-modal").classList.remove("hidden");
    return;
  }

  qualyState.phaseIndex++;
  qualyState.currentLap = 1;
  qualyState.drivers.forEach(d => {
    d.laps = 0;
    d.simLapMs = 0;
    d.bestLap = null;
  });

  qualyState.running = true;
}

// ------------------------------
// SALVAR GRID
// ------------------------------
function salvarGrid() {
  localStorage.setItem("f1m2025_last_qualy", JSON.stringify({
    track: qualyState.track,
    gp: qualyState.gp,
    grid: qualyState.finalGrid.map((d, i) => ({
      id: d.id,
      name: d.name,
      teamKey: d.teamKey,
      position: i + 1,
      bestLap: d.bestLap
    }))
  }));
}

// ------------------------------
// UI
// ------------------------------
function setQualySpeed(v) {
  qualyState.speedMultiplier = v;
}

function setupSpeedControls() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      setQualySpeed(Number(btn.dataset.speed));
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

function preencherPilotosDaEquipe() {
  const teamDrivers = qualyState.drivers.filter(d => d.teamKey === qualyState.userTeam).slice(0, 2);
  teamDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-${i + 1}`);
    if (!card) return;
    card.querySelector(".user-face").src = `assets/faces/${d.code}.png`;
    card.querySelector(".user-name").textContent = d.name;
    card.querySelector(".user-team").textContent = d.teamName;
    card.querySelector(".user-logo").src = d.logo;
  });
}

// export
window.setQualySpeed = setQualySpeed;
