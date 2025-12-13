// ==========================================================
// F1 MANAGER 2025 – QUALIFYING.JS (Q1 / Q2 / Q3)
// FIX: contador de volta (UI) + labels de fase sempre atualizados
// NÃO muda mecânica: apenas sincroniza UI com simulação real.
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
// PILOTOS BASE (fallback)
// ------------------------------
const DRIVERS_2025 = [
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

  { id: "norris",  code: "NOR", name: "Lando Norris",  teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston_martin", teamName: "Aston Martin", rating: 94, color: "#00b894", logo: "assets/logos/aston_martin.png" },
  { id: "stroll", code: "STR", name: "Lance Stroll",   teamKey: "aston_martin", teamName: "Aston Martin", rating: 88, color: "#00b894", logo: "assets/logos/aston_martin.png" },

  { id: "gasly", code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },

  { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", rating: 89, color: "#7f00ff", logo: "assets/logos/rb.png" },
  { id: "lawson",  code: "LAW", name: "Liam Lawson",  teamKey: "rb", teamName: "RB", rating: 88, color: "#7f00ff", logo: "assets/logos/rb.png" },

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",   teamKey: "sauber", teamName: "Sauber", rating: 89, color: "#00cec9", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 88, color: "#00cec9", logo: "assets/logos/sauber.png" },

  { id: "magnussen", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },
  { id: "bearman",   code: "BEA", name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },

  { id: "albon",    code: "ALB", name: "Alex Albon",     teamKey: "williams", teamName: "Williams", rating: 89, color: "#0984e3", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 86, color: "#0984e3", logo: "assets/logos/williams.png" }
];

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
  try {
    if (!window.PilotMarketSystem) return DRIVERS_2025.slice();

    PilotMarketSystem.init();
    const list = [];

    PilotMarketSystem.getTeams().forEach(team => {
      PilotMarketSystem.getActiveDriversForTeam(team).forEach(p => {
        const code = (p.code || p.id || "").toString().toUpperCase();
        const preset = DRIVERS_2025.find(x => x.code === code) || null;

        list.push({
          id: p.id,
          code: code || (preset?.code || String(p.id).toUpperCase()),
          name: p.name || preset?.name || p.id,
          teamKey: (p.teamKey || preset?.teamKey || team),
          teamName: (p.teamName || preset?.teamName || String(team).toUpperCase()),
          rating: Number(p.rating ?? preset?.rating ?? 75),
          color: p.color || preset?.color || "#ffffff",
          logo: p.logo || preset?.logo || `assets/logos/${String(p.teamKey || team)}.png`
        });
      });
    });

    return list.length ? list : DRIVERS_2025.slice();
  } catch (e) {
    console.warn("PilotMarketSystem falhou. Usando DRIVERS_2025.", e);
    return DRIVERS_2025.slice();
  }
}

function getPerfMultiplier(driverId) {
  try {
    if (!window.PilotMarketSystem) return 1;
    const p = PilotMarketSystem.getPilot(driverId);
    if (!p) return 1;

    const ratingMul = 1 + (clamp(p.rating || 75, 40, 99) - 92) * 0.0025;
    const formMul = 1 + (clamp(p.form || 55, 0, 100) - 55) * 0.0012;
    return clamp(ratingMul * formMul, 0.9, 1.08);
  } catch {
    return 1;
  }
}

// ------------------------------
// ESTADO DA QUALY
// ------------------------------
const qualyState = {
  phaseIndex: 0,
  running: true,
  speedMultiplier: 1,

  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  baseLapMs: 90000,

  currentLapUI: 1, // <-- UI sincronizado com maxLaps
  drivers: [],
  visuals: [],
  pathPoints: [],

  lastFrame: null,
  finalGrid: null,

  _svgEl: null,
  _polyEl: null
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initQualifying);

async function initQualifying() {
  const params = new URLSearchParams(location.search);
  qualyState.track = (params.get("track") || "australia").toLowerCase();
  qualyState.gp = params.get("gp") || "GP 2025";
  qualyState.userTeam = (params.get("userTeam") || "ferrari").toLowerCase();
  qualyState.baseLapMs = TRACK_BASE_LAP_TIME_MS[qualyState.track] || 90000;

  const title = document.getElementById("qualy-title-gp");
  if (title) title.textContent = qualyState.gp;

  setupSpeedControls();
  initDrivers();
  await loadTrackSvg();

  qualyState.currentLapUI = 1;
  updateHeaderUI();

  qualyState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

// ------------------------------
// DRIVERS
// ------------------------------
function initDrivers() {
  const runtime = getRuntimeDrivers();

  qualyState.drivers = runtime.map((d, idx) => {
    const skill = 1 - (Number(d.rating || 75) - 92) * 0.006;
    const perf = getPerfMultiplier(d.id);
    const lapTarget = (qualyState.baseLapMs * skill) / (perf || 1);

    return {
      ...d,
      index: idx,
      progress: Math.random(),
      speed: 1 / Math.max(60000, lapTarget), // 1 volta em ~lapTarget ms
      laps: 0,
      simLapMs: 0,
      bestLap: null,
      lastLap: null
    };
  });

  preencherPilotosDaEquipe();
}

// ------------------------------
// SVG TRACK (normalizado p/ 1000x600)
// ------------------------------
async function loadTrackSvg() {
  const container = document.getElementById("track-container");
  if (!container) {
    console.error("Qualy: #track-container não encontrado no HTML.");
    return;
  }
  container.innerHTML = "";

  let svgText = "";
  try {
    const res = await fetch(`assets/tracks/${qualyState.track}.svg`, { cache: "no-store" });
    svgText = await res.text();
  } catch (e) {
    console.error("Erro ao carregar SVG:", e);
    return;
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");

  const paths = Array.from(doc.querySelectorAll("path"));
  let bestPath = null;
  let bestLen = 0;

  for (const p of paths) {
    try {
      const len = p.getTotalLength();
      if (len > bestLen) {
        bestLen = len;
        bestPath = p;
      }
    } catch {}
  }

  if (!bestPath) {
    console.error("Qualy: SVG sem <path> utilizável.");
    return;
  }

  const len = bestPath.getTotalLength();
  const raw = [];
  const samples = 420;

  for (let i = 0; i < samples; i++) {
    const pt = bestPath.getPointAtLength((len * i) / samples);
    raw.push({ x: pt.x, y: pt.y });
  }

  const xs = raw.map(p => p.x);
  const ys = raw.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  qualyState.pathPoints = raw.map(p => ({
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
  poly.setAttribute("stroke", "#777");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  svg.appendChild(poly);

  qualyState._svgEl = svg;
  qualyState._polyEl = poly;

  rebuildVisuals();
}

function rebuildVisuals() {
  if (!qualyState._svgEl) return;

  qualyState.visuals.forEach(v => { try { v.g.remove(); } catch {} });
  qualyState.visuals = [];

  qualyState.visuals = qualyState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 6);
    c.setAttribute("fill", d.color || "#fff");
    c.setAttribute("stroke", "#000");
    c.setAttribute("stroke-width", "1.5");
    g.appendChild(c);

    if ((d.teamKey || "").toLowerCase() === qualyState.userTeam) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-11 7,0 -7,0");
      tri.setAttribute("fill", d.color || "#fff");
      g.appendChild(tri);
    }

    qualyState._svgEl.appendChild(g);
    return { id: d.id, g };
  });
}

// ------------------------------
// LOOP
// ------------------------------
function loop(ts) {
  if (qualyState.lastFrame == null) qualyState.lastFrame = ts;

  const dt = (ts - qualyState.lastFrame) * (qualyState.speedMultiplier || 1);
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
  if (!phase) return;

  for (const d of qualyState.drivers) {
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
  }

  // ---- FIX: atualiza UI da volta com base na corrida real (maxLaps)
  const maxLaps = Math.max(...qualyState.drivers.map(d => d.laps));
  const lapUI = clamp(maxLaps + 1, 1, phase.totalLaps); // exibe "volta atual"
  if (lapUI !== qualyState.currentLapUI) {
    qualyState.currentLapUI = lapUI;
    updateHeaderUI();
  }

  // finaliza fase quando alguém completa totalLaps
  if (maxLaps >= phase.totalLaps) finalizarFase();
}

// ------------------------------
// RENDER
// ------------------------------
function render() {
  const pts = qualyState.pathPoints;
  if (!pts.length) return;

  for (const v of qualyState.visuals) {
    const d = qualyState.drivers.find(x => x.id === v.id);
    if (!d) continue;

    const idx = Math.floor(d.progress * (pts.length - 1));
    const p = pts[idx] || pts[0];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  }

  atualizarLista();
}

// ------------------------------
// HEADER UI (compatível com ids diferentes)
// ------------------------------
function updateHeaderUI() {
  const phase = QUALY_PHASES[qualyState.phaseIndex] || QUALY_PHASES[0];

  // possíveis ids usados no seu HTML (várias versões)
  const elPhaseA = document.getElementById("qualy-phase-label");
  const elLapA   = document.getElementById("qualy-lap-label");

  const elPhaseB = document.getElementById("phaseName");
  const elLapB   = document.getElementById("lapCounter");

  const phaseText = `${phase.id} · ELIMINADOS AO FINAL: ${phase.eliminated} PILOTOS`;
  const lapText   = `Volta ${qualyState.currentLapUI} / ${phase.totalLaps}`;

  if (elPhaseA) elPhaseA.textContent = phaseText;
  if (elLapA) elLapA.textContent = lapText;

  if (elPhaseB) elPhaseB.textContent = phase.id;
  if (elLapB) elLapB.textContent = `${qualyState.currentLapUI}/${phase.totalLaps}`;
}

// ------------------------------
// LISTA (UI estável no mobile)
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

      const faceSrc = `assets/faces/${d.code}.png`;

      row.innerHTML = `
        <div class="driver-pos">${i + 1}</div>

        <img
          class="driver-face"
          src="${faceSrc}"
          alt="${d.name}"
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
          onerror="this.onerror=null;this.src='assets/faces/default.png';"
          style="width:44px;height:44px;object-fit:cover;border-radius:8px;"
        />

        <div class="driver-name">${d.name}</div>

        <div class="driver-time">${formatLapTime(d.bestLap)}</div>
      `;

      if ((d.teamKey || "").toLowerCase() === qualyState.userTeam) {
        row.classList.add("user-team-row");
      }

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

    qualyState.phaseIndex++;
    qualyState.currentLapUI = 1;

    qualyState.drivers.forEach(d => {
      d.laps = 0;
      d.simLapMs = 0;
      d.bestLap = null;
      d.lastLap = null;
      d.progress = Math.random();
    });

    rebuildVisuals();
    preencherPilotosDaEquipe();
    updateHeaderUI();

    qualyState.running = true;
    return;
  }

  qualyState.finalGrid = ordenado;
  salvarGrid();

  const modal = document.getElementById("qualy-modal");
  if (modal) modal.classList.remove("hidden");
}

// ------------------------------
// SALVAR GRID
// ------------------------------
function salvarGrid() {
  try {
    localStorage.setItem("f1m2025_last_qualy", JSON.stringify({
      track: qualyState.track,
      gp: qualyState.gp,
      grid: (qualyState.finalGrid || []).map((d, i) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        teamKey: d.teamKey,
        teamName: d.teamName,
        position: i + 1,
        bestLap: d.bestLap
      }))
    }));
  } catch (e) {
    console.warn("Falha ao salvar grid da qualy:", e);
  }
}

// ------------------------------
// UI
// ------------------------------
function setQualySpeed(v) {
  qualyState.speedMultiplier = Number(v) || 1;
}

function setupSpeedControls() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      setQualySpeed(Number(btn.dataset.speed || "1"));
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

function preencherPilotosDaEquipe() {
  const teamDrivers = qualyState.drivers
    .filter(d => (d.teamKey || "").toLowerCase() === qualyState.userTeam)
    .slice(0, 2);

  teamDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-${i + 1}`);
    if (!card) return;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const team = card.querySelector(".user-team");
    const logo = card.querySelector(".user-logo");

    if (face) {
      face.src = `assets/faces/${d.code}.png`;
      face.onerror = () => {
        face.onerror = null;
        face.src = "assets/faces/default.png";
      };
    }
    if (name) name.textContent = d.name || "";
    if (team) team.textContent = d.teamName || "";
    if (logo) logo.src = d.logo || "";
  });
}

// modal OK (se seu HTML usa)
function onQualyModalAction() {
  const modal = document.getElementById("qualy-modal");
  if (modal) modal.classList.add("hidden");

  const next = new URL("race.html", location.href);
  next.searchParams.set("track", qualyState.track);
  next.searchParams.set("gp", qualyState.gp);
  next.searchParams.set("userTeam", qualyState.userTeam);
  location.href = next.toString();
}

window.setQualySpeed = setQualySpeed;
window.onQualyModalAction = onQualyModalAction;
