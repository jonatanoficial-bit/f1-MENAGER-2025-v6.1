// ==========================================================
// F1 MANAGER 2025 – RACE.JS (SVG + GRID + HUD)
// Compatível com race.html do Vercel (IDs: track-container, drivers-list, user-driver-card-0/1 etc.)
// ==========================================================

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
// LISTA PADRÃO (fallback) – use a mesma base do qualy
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

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", logo: "assets/logos/aston.png" },
  { id: "stroll", code: "STR", name: "Lance Stroll",   teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", logo: "assets/logos/aston.png" },

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

// ------------------------------
// Utils
// ------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeText(el, txt) { if (el) el.textContent = txt; }

function formatGapMs(ms) {
  if (!isFinite(ms) || ms <= 0) return "+0.000";
  return `+${(ms / 1000).toFixed(3)}`;
}

// ------------------------------
// Mercado (se existir)
// ------------------------------
function getRuntimeDriversList() {
  const fallback = Array.isArray(DRIVERS_2025) ? DRIVERS_2025 : [];
  try {
    if (typeof window.PilotMarketSystem === "undefined") return fallback;
    if (typeof window.PilotMarketSystem.init === "function") window.PilotMarketSystem.init();

    const teams = (typeof window.PilotMarketSystem.getTeams === "function")
      ? window.PilotMarketSystem.getTeams()
      : null;
    if (!teams || !teams.length) return fallback;

    const byCode = {};
    fallback.forEach((d) => { if (d && d.code) byCode[String(d.code).toUpperCase()] = d; });

    const list = [];
    teams.forEach((teamKey) => {
      const active = window.PilotMarketSystem.getActiveDriversForTeam(teamKey) || [];
      active.forEach((p) => {
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

    return list.length ? list : fallback;
  } catch (e) {
    console.warn("PilotMarketSystem indisponível na corrida. Usando fallback.", e);
    return fallback;
  }
}

function getPilotPerfMultiplier(codeOrId) {
  try {
    if (typeof window.PilotMarketSystem === "undefined") return 1;
    const p = window.PilotMarketSystem.getPilot(codeOrId) || window.PilotMarketSystem.getPilot(String(codeOrId).toUpperCase());
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

// ------------------------------
// Estado da Corrida
// ------------------------------
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  totalLaps: 12,

  baseLapMs: 90000,
  speedMultiplier: 1,
  running: true,

  drivers: [],
  pathPoints: [],
  visuals: [],
  lastFrame: null,

  lapLeader: 1
};

// ------------------------------
// Boot
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initRace().catch((e) => console.error("initRace erro:", e));
});

async function initRace() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || localStorage.getItem("f1m2025_last_track") || "australia";
  raceState.gp = params.get("gp") || localStorage.getItem("f1m2025_last_gp") || "GP 2025";
  raceState.userTeam = params.get("userTeam") || localStorage.getItem("f1m2025_user_team") || "ferrari";
  raceState.totalLaps = Number(params.get("laps") || "12") || 12;

  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[raceState.track] || 90000;

  // Header
  safeText(document.getElementById("gp-title"), raceState.gp);
  safeText(document.getElementById("weather-label"), "Clima: Seco");
  safeText(document.getElementById("tracktemp-label"), "Pista: 26°C");

  // Speed
  setupSpeedControls();

  // Drivers (usa grid da qualy se existir)
  initDriversFromQualyGrid();

  // SVG
  await loadTrackSvg(raceState.track);

  // HUD da equipe
  renderUserDriversHUD();

  // Loop
  raceState.lastFrame = performance.now();
  requestAnimationFrame(loopRace);
}

// ------------------------------
// Drivers – grid vindo da Qualy
// ------------------------------
function initDriversFromQualyGrid() {
  const runtime = getRuntimeDriversList();
  const byId = {};
  const byName = {};
  runtime.forEach(d => {
    byId[String(d.id)] = d;
    byName[String(d.name || "").toLowerCase()] = d;
  });

  let gridPayload = null;
  try {
    gridPayload = JSON.parse(localStorage.getItem("f1m2025_last_qualy") || "null");
  } catch {}

  let ordered = [];

  if (gridPayload && Array.isArray(gridPayload.grid) && gridPayload.grid.length) {
    // tenta casar por id / name
    ordered = gridPayload.grid
      .slice()
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .map((g) => {
        const hit =
          byId[String(g.id)] ||
          byName[String(g.name || "").toLowerCase()] ||
          runtime.find(r => r.teamKey === g.teamKey && r.name === g.name) ||
          null;

        if (hit) return hit;

        // fallback mínimo mantendo teamKey/teamName do payload
        return {
          id: String(g.id || g.name || "unknown").toLowerCase(),
          code: String(g.id || "UNK").slice(0, 3).toUpperCase(),
          name: g.name || "Piloto",
          teamKey: g.teamKey || "free",
          teamName: g.teamName || (g.teamKey || "Equipe"),
          rating: 75,
          color: "#ffffff",
          logo: `assets/logos/${String(g.teamKey || "free")}.png`
        };
      });
  } else {
    // sem qualy salva: usa runtime na ordem original
    ordered = runtime.slice();
  }

  // Cria estado de corrida
  raceState.drivers = ordered.map((d, idx) => {
    const ratingCenter = 92;
    const ratingDelta = Number(d.rating || 75) - ratingCenter;

    // base “skill”
    const skillFactor = 1 - (ratingDelta * 0.0045);

    // mercado: rating + form
    const perfMul = getPilotPerfMultiplier(d.code || d.id);

    // alvo de volta
    const targetLap = raceState.baseLapMs * skillFactor / perfMul;

    return {
      ...d,
      index: idx,
      face: `assets/faces/${d.code}.png`,

      // corrida
      progress: Math.random(),
      laps: 0,
      lastLapMs: null,
      bestLapMs: null,
      lapClockMs: 0,
      totalTimeMs: 0,

      // “desgaste” simples (0..1)
      tyreWear: 0,
      carWear: 0,

      // velocidade (voltas por ms)
      speedBase: 1 / clamp(targetLap, raceState.baseLapMs * 0.82, raceState.baseLapMs * 1.25)
    };
  });
}

// ------------------------------
// SVG da pista
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
  container.appendChild(svg);

  let text;
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG da pista:", e);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("Nenhum <path> encontrado no SVG da pista.");
    return;
  }

  const pathLen = path.getTotalLength();
  const samples = 500;
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((pathLen * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  // normaliza pra 1000x600
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;

  raceState.pathPoints = pts.map((p) => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  // desenho pista
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#555");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  inner.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "#aaaaaa");
  inner.setAttribute("stroke-width", "6");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  svg.appendChild(inner);

  // pontinhos brancos
  raceState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 2.6);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  // marcadores dos carros
  raceState.visuals = raceState.drivers.map((drv) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    g.appendChild(body);

    // destaca equipe do usuário
    if (drv.teamKey === raceState.userTeam) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      g.appendChild(tri);
    }

    svg.appendChild(g);
    return { driverId: drv.id, g };
  });
}

function getPositionOnTrack(progress) {
  const pts = raceState.pathPoints;
  if (!pts.length) return { x: 0, y: 0 };
  const total = pts.length;
  const idxFloat = progress * total;
  let i0 = Math.floor(idxFloat);
  let i1 = (i0 + 1) % total;
  const t = idxFloat - i0;
  if (i0 >= total) i0 = total - 1;
  if (i1 >= total) i1 = 0;
  const p0 = pts[i0];
  const p1 = pts[i1];
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

// ------------------------------
// Loop principal
// ------------------------------
function loopRace(ts) {
  if (raceState.lastFrame == null) raceState.lastFrame = ts;

  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  if (raceState.running) {
    updateRace(dt);
  }
  renderRace();

  requestAnimationFrame(loopRace);
}

// ------------------------------
// Simulação
// ------------------------------
function updateRace(dtMs) {
  const dt = Math.max(0, dtMs || 0);

  raceState.drivers.forEach((d) => {
    // desgaste simples
    d.tyreWear = clamp(d.tyreWear + (dt / (raceState.baseLapMs * 30)), 0, 1);
    d.carWear  = clamp(d.carWear  + (dt / (raceState.baseLapMs * 80)), 0, 1);

    // perde um pouco de velocidade com desgaste
    const wearPenalty = 1 - (d.tyreWear * 0.06 + d.carWear * 0.03);

    // ruído de ritmo
    const noise = 1 + (Math.random() - 0.5) * 0.03; // +/- 1.5%

    const speed = d.speedBase * wearPenalty * noise;

    d.progress += speed * dt;
    d.lapClockMs += dt;
    d.totalTimeMs += dt;

    if (d.progress >= 1) {
      d.progress -= 1;
      d.laps += 1;

      d.lastLapMs = d.lapClockMs;
      if (d.bestLapMs == null || d.lastLapMs < d.bestLapMs) d.bestLapMs = d.lastLapMs;
      d.lapClockMs = 0;
    }
  });

  // volta do líder
  const leader = getLeader();
  const leaderLap = (leader?.laps || 0) + 1;
  raceState.lapLeader = clamp(leaderLap, 1, raceState.totalLaps);

  // label no topo
  safeText(document.getElementById("race-lap-label"), `Volta ${raceState.lapLeader}`);

  // fim da corrida (quando o líder completa totalLaps)
  if (leader && leader.laps >= raceState.totalLaps) {
    raceState.running = false;
    // aqui você pode abrir um modal de resultado final se quiser
  }

  // HUD dos seus pilotos (atualiza)
  renderUserDriversHUD();
}

function getLeader() {
  const arr = raceState.drivers.slice();
  arr.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return b.progress - a.progress;
  });
  return arr[0] || null;
}

// ------------------------------
// Render
// ------------------------------
function renderRace() {
  // carros no mapa
  const byId = {};
  raceState.drivers.forEach(d => { byId[d.id] = d; });

  raceState.visuals.forEach((v) => {
    const d = byId[v.driverId];
    if (!d) return;
    const pos = getPositionOnTrack(d.progress);
    v.g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });

  // grid/lista
  renderTowerList();
}

function renderTowerList() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const ordered = raceState.drivers.slice().sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return b.progress - a.progress;
  });

  const leader = ordered[0];
  const leaderTime = leader?.totalTimeMs ?? 0;
  const leaderLaps = leader?.laps ?? 0;

  list.innerHTML = "";

  ordered.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    if (d.teamKey === raceState.userTeam) row.classList.add("user-team-row");

    const pos = document.createElement("div");
    pos.className = "driver-pos";
    pos.textContent = `${i + 1}`;

    const info = document.createElement("div");
    info.className = "driver-info";

    const img = document.createElement("img");
    img.className = "driver-face";
    img.src = d.face || "";
    img.alt = d.name || "Piloto";
    img.onerror = () => {
      img.onerror = null;
      img.src = "assets/faces/default.png";
    };

    const txt = document.createElement("div");
    txt.className = "driver-text";

    const name = document.createElement("div");
    name.className = "driver-name";
    name.textContent = d.name || "Piloto";

    const team = document.createElement("div");
    team.className = "driver-team";
    team.textContent = d.teamName || d.teamKey || "";

    txt.appendChild(name);
    txt.appendChild(team);

    info.appendChild(img);
    info.appendChild(txt);

    const stats = document.createElement("div");
    stats.className = "driver-stats";

    const lapGap = (leaderLaps - d.laps);
    let gapText = "LEADER";
    if (i !== 0) {
      if (lapGap >= 1) gapText = `+${lapGap} LAP`;
      else gapText = formatGapMs((d.totalTimeMs || 0) - leaderTime);
    }

    stats.innerHTML = `
      <div class="stat-line">Voltas <span>${d.laps}</span></div>
      <div class="stat-line">Gap <span>${gapText}</span></div>
      <div class="stat-line">Últ. <span>${d.lastLapMs ? formatGapMs(d.lastLapMs - raceState.baseLapMs) : "--"}</span></div>
    `;

    row.appendChild(pos);
    row.appendChild(info);
    row.appendChild(stats);

    list.appendChild(row);
  });
}

// ------------------------------
// HUD – Seus Pilotos (cards do HTML)
// Espera: #user-driver-card-0 e #user-driver-card-1
// dentro: .user-face, .user-name, .user-team, .user-logo
// e opcionalmente barras #hud-car-0/#hud-tyre-0 etc (se existirem)
// ------------------------------
function renderUserDriversHUD() {
  const mine = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);

  mine.forEach((d, idx) => {
    const card = document.getElementById(`user-driver-card-${idx}`);
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
    if (name) name.textContent = d.name || "Piloto";
    if (team) team.textContent = d.teamName || "";
    if (logo) logo.src = d.logo || "";

    // barras simples se existirem (não quebra se não existirem)
    const carBar = card.querySelector(".hud-car-bar");
    const tyreBar = card.querySelector(".hud-tyre-bar");
    if (carBar) carBar.style.width = `${Math.round((1 - d.carWear) * 100)}%`;
    if (tyreBar) tyreBar.style.width = `${Math.round((1 - d.tyreWear) * 100)}%`;
  });
}

// ------------------------------
// Speed Controls 1x 2x 4x
// ------------------------------
function setRaceSpeed(mult) {
  raceState.speedMultiplier = Number(mult || 1) || 1;
}

function setupSpeedControls() {
  const buttons = document.querySelectorAll(".speed-btn");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const speed = Number(btn.dataset.speed || "1") || 1;
      setRaceSpeed(speed);

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// export (se o HTML chamar)
window.setRaceSpeed = setRaceSpeed;
