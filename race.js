// ==========================================================
// F1 MANAGER 2025 – RACE.JS (SVG + GRID + TOWER + STRATEGY)
// Compatível com race (2).html
// ==========================================================

/* ------------------------------
   CONFIG
------------------------------ */
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

// fallback se PilotMarketSystem estiver ausente
const DRIVERS_FALLBACK = [
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

  { id: "norris", code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", logo: "assets/logos/aston.png" },
  { id: "stroll",  code: "STR", name: "Lance Stroll",   teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", logo: "assets/logos/aston.png" },

  { id: "gasly", code: "GAS", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },

  { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },
  { id: "lawson",  code: "LAW", name: "Liam Lawson",  teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",   teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", logo: "assets/logos/sauber.png" },

  { id: "magnussen", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },
  { id: "bearman",   code: "BEA", name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },

  { id: "albon",    code: "ALB", name: "Alex Albon",     teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", logo: "assets/logos/williams.png" }
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function formatMs(ms) {
  if (!isFinite(ms) || ms <= 0) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

function safeText(el, value) {
  if (!el) return;
  el.textContent = value;
}

/* ------------------------------
   STATE
------------------------------ */
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",

  baseLapMs: 90000,
  totalLaps: 10,            // ajuste se quiser (pode ler de outra config depois)
  currentLap: 1,

  running: true,
  speedMultiplier: 1,

  pathPoints: [],
  visuals: [],

  drivers: [],              // runtime list com sim
  lastFrame: null,

  // UI cache
  elLap: null,
  elWeather: null,
  elTrackTemp: null,
  elTower: null
};

/* ------------------------------
   RUNTIME DRIVERS + GRID FROM QUALY
------------------------------ */
function getRuntimeDriversList() {
  try {
    if (typeof window.PilotMarketSystem === "undefined") return DRIVERS_FALLBACK.slice();

    if (typeof window.PilotMarketSystem.init === "function") window.PilotMarketSystem.init();
    const teams = (typeof window.PilotMarketSystem.getTeams === "function")
      ? window.PilotMarketSystem.getTeams()
      : null;

    if (!teams || !teams.length) return DRIVERS_FALLBACK.slice();

    // base por code para herdar cor/logo/nome bonitos
    const byCode = {};
    DRIVERS_FALLBACK.forEach(d => (byCode[String(d.code).toUpperCase()] = d));

    const list = [];
    teams.forEach(teamKey => {
      const active = window.PilotMarketSystem.getActiveDriversForTeam(teamKey) || [];
      active.forEach(p => {
        const code = String(p.id || p.code || "").toUpperCase();
        if (!code) return;
        const preset = byCode[code];

        list.push({
          id: (preset?.id || code.toLowerCase()),
          code,
          name: (preset?.name || p.name || code),
          teamKey: String(p.teamKey || preset?.teamKey || teamKey || "free"),
          teamName: (preset?.teamName || String(p.teamKey || teamKey || "").toUpperCase()),
          rating: Number(p.rating || preset?.rating || 75),
          color: (preset?.color || "#ffffff"),
          logo: (preset?.logo || `assets/logos/${String(p.teamKey || teamKey)}.png`)
        });
      });
    });

    return list.length ? list : DRIVERS_FALLBACK.slice();
  } catch (e) {
    console.warn("PilotMarketSystem indisponível na corrida. Usando fallback.", e);
    return DRIVERS_FALLBACK.slice();
  }
}

function getPerfMultiplier(codeOrId) {
  try {
    if (typeof window.PilotMarketSystem === "undefined") return 1;
    const p = window.PilotMarketSystem.getPilot(codeOrId);
    if (!p) return 1;
    const rating = clamp(Number(p.rating || 75), 40, 99);
    const form = clamp(Number(p.form || 55), 0, 100);
    const ratingMul = 1 + ((rating - 92) * 0.0025);
    const formMul = 1 + ((form - 55) * 0.0012);
    return clamp(ratingMul * formMul, 0.90, 1.08);
  } catch {
    return 1;
  }
}

function loadQualyGridOrNull() {
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.grid) || !obj.grid.length) return null;
    return obj;
  } catch {
    return null;
  }
}

function orderDriversByQualyGrid(runtimeDrivers) {
  const qualy = loadQualyGridOrNull();
  if (!qualy) return runtimeDrivers.slice();

  // mapa (id/name/team) -> runtime driver
  const byNameTeam = new Map();
  runtimeDrivers.forEach(d => {
    const key = `${String(d.name).toLowerCase()}|${String(d.teamKey).toLowerCase()}`;
    byNameTeam.set(key, d);
  });

  const ordered = [];
  qualy.grid
    .slice()
    .sort((a, b) => (a.position || 999) - (b.position || 999))
    .forEach(g => {
      const key = `${String(g.name).toLowerCase()}|${String(g.teamKey).toLowerCase()}`;
      const hit = byNameTeam.get(key);
      if (hit) ordered.push(hit);
    });

  // completa com os que faltaram (se houver divergência)
  runtimeDrivers.forEach(d => {
    if (!ordered.includes(d)) ordered.push(d);
  });

  return ordered;
}

/* ------------------------------
   TRACK SVG -> pathPoints (1000x600)
------------------------------ */
async function loadTrackSvg(trackKey) {
  const container = document.getElementById("track-container");
  if (!container) return;

  container.innerHTML = "";

  // cria SVG host
  const svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgHost.setAttribute("id", "race-svg");
  svgHost.setAttribute("width", "100%");
  svgHost.setAttribute("height", "100%");
  svgHost.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svgHost);

  let svgText = "";
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`, { cache: "no-store" });
    svgText = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG:", e);
    container.innerHTML = `<div style="padding:16px;color:#fff;">Erro ao carregar pista: assets/tracks/${trackKey}.svg</div>`;
    return;
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("SVG sem <path>.");
    container.innerHTML = `<div style="padding:16px;color:#fff;">SVG da pista sem &lt;path&gt;.</div>`;
    return;
  }

  const len = path.getTotalLength();
  const samples = 520;
  const rawPts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    rawPts.push({ x: p.x, y: p.y });
  }

  // normaliza para 1000x600
  const xs = rawPts.map(p => p.x);
  const ys = rawPts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;

  raceState.pathPoints = rawPts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  // desenha pista
  const polyOuter = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyOuter.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  polyOuter.setAttribute("fill", "none");
  polyOuter.setAttribute("stroke", "#555");
  polyOuter.setAttribute("stroke-width", "18");
  polyOuter.setAttribute("stroke-linecap", "round");
  polyOuter.setAttribute("stroke-linejoin", "round");
  svgHost.appendChild(polyOuter);

  const polyInner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyInner.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  polyInner.setAttribute("fill", "none");
  polyInner.setAttribute("stroke", "#aaaaaa");
  polyInner.setAttribute("stroke-width", "6");
  polyInner.setAttribute("stroke-linecap", "round");
  polyInner.setAttribute("stroke-linejoin", "round");
  svgHost.appendChild(polyInner);

  // bolinhas brancas
  for (const p of raceState.pathPoints) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 2.6);
    c.setAttribute("fill", "#ffffff");
    svgHost.appendChild(c);
  }

  // bandeira
  const flagPoint = raceState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svgHost.appendChild(flag);

  // cria visuals
  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", d.color || "#fff");
    g.appendChild(body);

    // marcador para equipe do user
    if (d.teamKey === raceState.userTeam) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", d.color || "#fff");
      g.appendChild(tri);
    }

    svgHost.appendChild(g);
    return { id: d.id, g };
  });
}

/* ------------------------------
   UI: Drivers Cards / Buttons
------------------------------ */
function fillUserCards() {
  const teamDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);

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
    if (name) name.textContent = d.name;
    if (team) team.textContent = d.teamName;
    if (logo) logo.src = d.logo || "";
  });
}

function setupSpeedButtons() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const spd = Number(btn.dataset.speed || "1") || 1;
      raceState.speedMultiplier = spd;

      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setupUserActionButtons() {
  document.querySelectorAll(".user-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index || "0");
      const action = String(btn.dataset.action || "").toLowerCase();

      const teamDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
      const drv = teamDrivers[idx];
      if (!drv) return;

      // aplica estratégia simples
      if (action === "attack") drv.strategy = "attack";
      else if (action === "eco") drv.strategy = "eco";
      else if (action === "pit") {
        // pit stop simples: reseta pneu/comb, penaliza tempo
        drv.pitting = true;
        drv.pitRemainingMs = 8500 + Math.random() * 2500; // 8.5s a 11s
      }

      // UI feedback: marca ativo por card
      const card = document.getElementById(`user-driver-${idx + 1}`);
      if (!card) return;
      card.querySelectorAll(".user-action-btn").forEach(b => b.classList.remove("active"));
      if (action !== "pit") btn.classList.add("active");
    });
  });
}

/* ------------------------------
   SIM INIT DRIVERS
------------------------------ */
function initDrivers() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || localStorage.getItem("F1M_track") || "australia";
  raceState.gp = params.get("gp") || "GP 2025";
  raceState.userTeam = params.get("userTeam") || localStorage.getItem("F1M_userTeam") || "ferrari";
  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[raceState.track] || 90000;

  // lista runtime + ordenação pelo grid da qualy
  const runtime = getRuntimeDriversList();
  const ordered = orderDriversByQualyGrid(runtime);

  // setup (oficina) influencia levemente (se existir)
  let setupMul = 1;
  try {
    const setupRaw = localStorage.getItem(`F1M_SETUP_${raceState.userTeam}`);
    if (setupRaw) {
      const s = JSON.parse(setupRaw);
      // ajuste leve: setup bom => ligeiramente mais rápido
      const score = Number(s?.score || 50); // se você tiver score no setup
      setupMul = clamp(1 + ((score - 50) * 0.0015), 0.96, 1.04);
    }
  } catch {}

  // cria sim drivers
  raceState.drivers = ordered.map((d, gridIdx) => {
    const ratingCenter = 92;
    const ratingDelta = (Number(d.rating || 75) - ratingCenter);
    const skillFactor = 1 - ratingDelta * 0.006;      // maior rating => menor tempo
    const perfMul = getPerfMultiplier(d.code) || 1;

    const baseTarget = raceState.baseLapMs * skillFactor / perfMul;

    return {
      ...d,
      gridPos: gridIdx + 1,

      // progress e voltas
      progress: clamp(0.02 * gridIdx, 0, 0.35) + Math.random() * 0.01,
      laps: 0,

      // tempo de volta simulado
      lapMsAccum: 0,
      bestLapMs: null,
      lastLapMs: null,
      totalTimeMs: 0,

      // ritmo base (inverso do tempo alvo)
      baseLapTargetMs: baseTarget * (d.teamKey === raceState.userTeam ? setupMul : 1),
      speedBase: 1 / (baseTarget * (d.teamKey === raceState.userTeam ? setupMul : 1)),

      // estado simples
      strategy: "normal",     // normal | attack | eco
      tire: 100,
      fuel: 100,
      pitting: false,
      pitRemainingMs: 0
    };
  });
}

/* ------------------------------
   UPDATE + RENDER
------------------------------ */
function getPointAtProgress(progress) {
  const pts = raceState.pathPoints;
  if (!pts.length) return { x: 0, y: 0 };

  const total = pts.length;
  const idxF = progress * total;
  let i0 = Math.floor(idxF);
  let i1 = (i0 + 1) % total;
  const t = idxF - i0;
  if (i0 >= total) i0 = total - 1;
  if (i1 >= total) i1 = 0;

  const p0 = pts[i0];
  const p1 = pts[i1];
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

function strategyPaceMultiplier(d) {
  // ataque: mais rápido mas gasta pneu/comb
  // eco: mais lento mas economiza
  if (d.strategy === "attack") return 1.035;
  if (d.strategy === "eco") return 0.965;
  return 1.0;
}

function updateRace(dt) {
  if (!raceState.running) return;
  if (!raceState.pathPoints.length) return;

  const phaseLap = raceState.currentLap;

  for (const d of raceState.drivers) {
    // pit stop: pausa avanço, aplica penalidade de tempo
    if (d.pitting) {
      d.pitRemainingMs -= dt;
      d.totalTimeMs += dt;

      if (d.pitRemainingMs <= 0) {
        d.pitting = false;
        d.pitRemainingMs = 0;
        d.tire = 100;
        d.fuel = clamp(d.fuel + 25, 0, 100);
      }
      continue;
    }

    // degradações simples
    const paceMul = strategyPaceMultiplier(d);
    const tireMul = clamp(0.98 + (d.tire / 100) * 0.04, 0.95, 1.02);
    const fuelMul = clamp(0.98 + (d.fuel / 100) * 0.03, 0.94, 1.02);

    // ruído
    const noise = 1 + (Math.random() - 0.5) * 0.035;

    // velocidade = speedBase ajustada
    const speed = d.speedBase * paceMul * tireMul * fuelMul * noise;

    // avança progress
    const dp = speed * dt;
    d.progress += dp;

    // acumula tempo de volta e total
    d.lapMsAccum += dt;
    d.totalTimeMs += dt;

    // consumo
    if (d.strategy === "attack") {
      d.tire = clamp(d.tire - dt * 0.00085, 0, 100);
      d.fuel = clamp(d.fuel - dt * 0.00070, 0, 100);
    } else if (d.strategy === "eco") {
      d.tire = clamp(d.tire - dt * 0.00045, 0, 100);
      d.fuel = clamp(d.fuel - dt * 0.00035, 0, 100);
    } else {
      d.tire = clamp(d.tire - dt * 0.00060, 0, 100);
      d.fuel = clamp(d.fuel - dt * 0.00050, 0, 100);
    }

    // completou volta
    while (d.progress >= 1) {
      d.progress -= 1;
      d.laps += 1;

      d.lastLapMs = d.lapMsAccum;
      if (d.bestLapMs == null || d.lapMsAccum < d.bestLapMs) d.bestLapMs = d.lapMsAccum;
      d.lapMsAccum = 0;
    }
  }

  // atualiza volta global pelo líder (mais voltas)
  const leaderLaps = Math.max(...raceState.drivers.map(x => x.laps));
  raceState.currentLap = clamp(leaderLaps + 1, 1, raceState.totalLaps);

  // fim de corrida
  if (leaderLaps >= raceState.totalLaps) {
    raceState.running = false;
    // opcional: modal de fim de corrida aqui (se você quiser)
  }

  // atualiza header
  safeText(raceState.elLap, `${raceState.currentLap} / ${raceState.totalLaps}`);
}

function renderRace() {
  // desenha carros
  for (const v of raceState.visuals) {
    const d = raceState.drivers.find(x => x.id === v.id);
    if (!d) continue;
    const p = getPointAtProgress(d.progress);
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  }

  // atualiza torre (ordenação por voltas e progress e tempo)
  updateTower();
}

function updateTower() {
  const tower = raceState.elTower;
  if (!tower) return;

  // ranking: mais voltas > progress > menor tempo total (desempate)
  const ordered = raceState.drivers.slice().sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.totalTimeMs - b.totalTimeMs;
  });

  const leader = ordered[0];
  tower.innerHTML = "";

  ordered.forEach((d, idx) => {
    const row = document.createElement("div");
    row.className = "tower-row";
    if (d.teamKey === raceState.userTeam) row.classList.add("user-team-row");

    const pos = idx + 1;

    // gap simples: diferença de totalTime
    let gapText = "";
    if (idx === 0) gapText = "LÍDER";
    else {
      const gap = Math.max(0, d.totalTimeMs - leader.totalTimeMs);
      gapText = `+${(gap / 1000).toFixed(3)}`;
    }

    row.innerHTML = `
      <div class="tower-left">
        <div class="tower-pos">${pos}</div>
        <img class="tower-face" src="assets/faces/${d.code}.png" alt="${d.name}" />
        <div class="tower-meta">
          <div class="tower-name">${d.name}</div>
          <div class="tower-team">${d.teamName}</div>
        </div>
      </div>
      <div class="tower-right">
        <div class="tower-gap">${gapText}</div>
      </div>
    `;

    // fallback face
    const img = row.querySelector(".tower-face");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = "assets/faces/default.png";
      };
    }

    tower.appendChild(row);
  });
}

/* ------------------------------
   MAIN LOOP
------------------------------ */
function loop(ts) {
  if (raceState.lastFrame == null) raceState.lastFrame = ts;
  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  if (raceState.running) updateRace(dt);
  renderRace();

  requestAnimationFrame(loop);
}

/* ------------------------------
   INIT
------------------------------ */
window.addEventListener("DOMContentLoaded", async () => {
  // cache UI
  raceState.elLap = document.getElementById("lapLabel");
  raceState.elWeather = document.getElementById("weatherLabel");
  raceState.elTrackTemp = document.getElementById("trackTempLabel");
  raceState.elTower = document.getElementById("raceTower");

  // labels fixos (você pode ligar em clima real depois)
  safeText(raceState.elWeather, "Seco");
  safeText(raceState.elTrackTemp, "26°C");

  // init
  initDrivers();
  setupSpeedButtons();
  setupUserActionButtons();
  fillUserCards();

  await loadTrackSvg(raceState.track);

  raceState.lastFrame = performance.now();
  requestAnimationFrame(loop);
});

/* ------------------------------
   EXPORTS (se precisar no HTML)
------------------------------ */
window.setRaceSpeed = function (mult) {
  raceState.speedMultiplier = Number(mult || 1) || 1;
};
