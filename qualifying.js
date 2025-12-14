// ==========================================================
// F1 MANAGER 2025 – QUALIFYING.JS (Q1 / Q2 / Q3)
// Corrigido: avisos de eliminados por fase + grid final antes da corrida
// ==========================================================

const QUALY_PHASES = [
  { id: "Q1", totalLaps: 6, eliminated: 5 },
  { id: "Q2", totalLaps: 5, eliminated: 5 },
  { id: "Q3", totalLaps: 4, eliminated: 0 }
];

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
  abu_dhabi: 84000,
  las_vegas: 88000
};

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
        teamKey: (p.teamKey || "").toLowerCase(),
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
// ESTADO
// ------------------------------
const qualyState = {
  phaseIndex: 0,
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
  finalGrid: null,

  // UI
  pendingPhaseModal: null
};

window.addEventListener("DOMContentLoaded", initQualifying);

async function initQualifying() {
  const params = new URLSearchParams(location.search);
  qualyState.track = (params.get("track") || "australia").toLowerCase();
  qualyState.gp = params.get("gp") || "GP 2025";
  qualyState.userTeam = (params.get("userTeam") || "ferrari").toLowerCase();
  qualyState.baseLapMs = TRACK_BASE_LAP_TIME_MS[qualyState.track] || 90000;

  const gpEl = document.getElementById("qualy-title-gp");
  if (gpEl) gpEl.textContent = qualyState.gp;

  injectQualyStyles();

  setupSpeedControls();
  initDrivers();
  await loadTrackSvg();

  qualyState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function injectQualyStyles() {
  if (document.getElementById("qualy-extra-styles")) return;
  const s = document.createElement("style");
  s.id = "qualy-extra-styles";
  s.textContent = `
    #qualy-modal{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.65); z-index:999; }
    #qualy-modal.hidden{ display:none; }
    #qualy-modal .qualy-modal-card{ width:min(640px,92vw); max-height:82vh; overflow:auto; border-radius:16px; padding:14px; background:rgba(10,14,28,0.92); border:1px solid rgba(255,255,255,0.12); color:#fff; }
    #qualy-modal .qualy-modal-list{ display:grid; gap:8px; margin-top:10px; }
    #qualy-modal .qualy-modal-row{ display:grid; grid-template-columns:42px 42px 1fr auto; gap:10px; align-items:center; padding:8px; border-radius:14px; background:rgba(255,255,255,0.06); }
    #qualy-modal .qpos{ font-weight:800; text-align:center; }
    #qualy-modal .qface{ width:42px; height:42px; object-fit:cover; border-radius:12px; }
    #qualy-modal .qname{ font-weight:700; }
    #qualy-modal .qlap{ opacity:0.9; font-variant-numeric:tabular-nums; }
    #qualy-modal .qualy-modal-btn{ padding:10px 12px; border-radius:12px; background:#ffffff; border:none; font-weight:800; cursor:pointer; color:#000; }
  `;
  document.head.appendChild(s);
}

// ------------------------------
// DRIVERS
// ------------------------------
function initDrivers() {
  const runtime = getRuntimeDrivers();
  if (!runtime.length) {
    console.warn("PilotMarketSystem não encontrado ou vazio. Qualy precisa do mercado para lista completa.");
  }

  qualyState.drivers = runtime.map((d, idx) => {
    const skill = 1 - (d.rating - 92) * 0.006; // maior rating => menor
    const perf = getPerfMultiplier(d.id);
    const lapTarget = qualyState.baseLapMs * clamp(skill, 0.78, 1.22) / perf;

    return {
      ...d,
      index: idx,
      progress: Math.random(),
      speed: 1 / clamp(lapTarget, 58000, 140000),
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
  if (!container) return;
  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${qualyState.track}.svg`, { cache: "no-store" }).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) return;

  const len = path.getTotalLength();

  const pts = [];
  const samples = 420;
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  // normaliza para viewBox 1000x600
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;
  qualyState.pathPoints = pts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  container.appendChild(svg);

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", qualyState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#555");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  // bolinhas brancas do traçado
  for (let i = 0; i < qualyState.pathPoints.length; i += 10) {
    const p = qualyState.pathPoints[i];
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", "2.5");
    c.setAttribute("fill", "#ffffff");
    c.setAttribute("opacity", "0.35");
    svg.appendChild(c);
  }

  qualyState.visuals = qualyState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 6.5);
    c.setAttribute("fill", d.color || "#fff");
    c.setAttribute("stroke", "#000");
    c.setAttribute("stroke-width", "1.4");
    g.appendChild(c);

    if ((d.teamKey || "").toLowerCase() === qualyState.userTeam) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-11 7,0 -7,0");
      tri.setAttribute("fill", d.color || "#fff");
      g.appendChild(tri);
    }

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

  // evita travar em "volta 1": usa a volta do líder (mais avançado)
  const maxLaps = Math.max(...qualyState.drivers.map(d => d.laps));
  const lapEl = document.getElementById("qualy-lap");
  if (lapEl) lapEl.textContent = `Volta ${Math.max(1, Math.min(phase.totalLaps, maxLaps + 1))} / ${phase.totalLaps}`;

  if (maxLaps >= phase.totalLaps) finalizarFase();
}

// ------------------------------
// RENDER
// ------------------------------
function render() {
  qualyState.visuals.forEach(v => {
    const d = qualyState.drivers.find(x => x.id === v.id);
    if (!d) return;
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
  if (!list) return;
  list.innerHTML = "";

  [...qualyState.drivers]
    .sort((a, b) => (a.bestLap ?? 9999999) - (b.bestLap ?? 9999999))
    .forEach((d, i) => {
      const row = document.createElement("div");
      row.className = "driver-row";
      row.innerHTML = `
        <div>${i + 1}</div>
        <img src="assets/faces/${d.code}.png" onerror="this.src='assets/faces/default.png'" />
        <div>${d.name}</div>
        <div>${formatLapTime(d.bestLap)}</div>
      `;
      if ((d.teamKey || "").toLowerCase() === qualyState.userTeam) row.classList.add("user-team-row");
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

  const eliminated = [];
  if (phase.eliminated > 0) {
    const keep = ordenado.slice(0, ordenado.length - phase.eliminated);
    const drop = ordenado.slice(ordenado.length - phase.eliminated);

    eliminated.push(...drop);
    qualyState.drivers = keep;

    showPhaseModal(phase.id, eliminated, () => {
      // próxima fase
      qualyState.phaseIndex++;
      qualyState.drivers.forEach(d => {
        d.laps = 0;
        d.simLapMs = 0;
        d.bestLap = null;
        d.lastLap = null;
      });
      qualyState.running = true;
    });

    return;
  }

  // Q3 finaliza
  qualyState.finalGrid = ordenado;
  salvarGrid();
  showFinalGridModal(ordenado);
}

// ------------------------------
// MODAIS
// ------------------------------
function ensureModalHost() {
  let host = document.getElementById("qualy-modal");
  if (!host) {
    host = document.createElement("div");
    host.id = "qualy-modal";
    host.className = "hidden";
    document.body.appendChild(host);
  }
  return host;
}

function showPhaseModal(phaseId, eliminated, onContinue) {
  const host = ensureModalHost();
  host.innerHTML = `
    <div class="qualy-modal-card">
      <h2>${phaseId} encerrado</h2>
      <p>Eliminados (${eliminated.length}):</p>
      <div class="qualy-modal-list">
        ${eliminated.map((d, i) => `
          <div class="qualy-modal-row">
            <div class="qpos">${(i + 1)}</div>
            <img class="qface" src="assets/faces/${d.code}.png" onerror="this.src='assets/faces/default.png'"/>
            <div class="qname">${d.name}</div>
            <div class="qlap">${formatLapTime(d.bestLap)}</div>
          </div>
        `).join("")}
      </div>
      <button class="qualy-modal-btn" id="qualy-continue-btn">Continuar</button>
    </div>
  `;
  host.classList.remove("hidden");

  const btn = document.getElementById("qualy-continue-btn");
  if (btn) {
    btn.onclick = () => {
      host.classList.add("hidden");
      host.innerHTML = "";
      onContinue && onContinue();
    };
  }
}

function showFinalGridModal(grid) {
  const host = ensureModalHost();
  host.innerHTML = `
    <div class="qualy-modal-card">
      <h2>Grid final definido</h2>
      <p>Posição final (Q3):</p>
      <div class="qualy-modal-list">
        ${grid.map((d, i) => `
          <div class="qualy-modal-row">
            <div class="qpos">${i + 1}</div>
            <img class="qface" src="assets/faces/${d.code}.png" onerror="this.src='assets/faces/default.png'"/>
            <div class="qname">${d.name}</div>
            <div class="qlap">${formatLapTime(d.bestLap)}</div>
          </div>
        `).join("")}
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
        <button class="qualy-modal-btn" id="qualy-close-btn">Fechar</button>
        <button class="qualy-modal-btn" id="qualy-go-race-btn">Ir para a corrida</button>
      </div>
    </div>
  `;
  host.classList.remove("hidden");

  const close = document.getElementById("qualy-close-btn");
  if (close) close.onclick = () => host.classList.add("hidden");

  const go = document.getElementById("qualy-go-race-btn");
  if (go) {
    go.onclick = () => {
      const url = `race.html?track=${encodeURIComponent(qualyState.track)}&gp=${encodeURIComponent(qualyState.gp)}&userTeam=${encodeURIComponent(qualyState.userTeam)}`;
      location.href = url;
    };
  }
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
      code: d.code,
      name: d.name,
      teamKey: d.teamKey,
      teamName: d.teamName,
      color: d.color,
      rating: d.rating,
      position: i + 1,
      bestLap: d.bestLap
    }))
  }));
}

// ------------------------------
// UI SPEED
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
  const teamDrivers = qualyState.drivers.filter(d => (d.teamKey || "").toLowerCase() === qualyState.userTeam).slice(0, 2);
  teamDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-${i + 1}`);
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
    if (logo) logo.src = d.logo || `assets/teams/${d.teamKey}.png`;
  });
}

// export
window.setQualySpeed = setQualySpeed;
