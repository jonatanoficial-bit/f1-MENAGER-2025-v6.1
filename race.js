// ==========================================================
// F1 MANAGER 2025 – RACE.JS (CORRIDA COMPLETA)
// ==========================================================

// ------------------------------
// CONFIG DE PISTAS (tempo base realista em ms)
// ------------------------------
const TRACK_BASE_LAP_MS = {
  australia: 84000,   // 1:24.000
  bahrain:   92000,   // 1:32.000
  jeddah:    87000,
  china:     93000,
  miami:     93000,
  imola:     88000,
  monaco:   105000,
  canada:    83000,
  spain:     87000,
  austria:   65000,
  silverstone: 84000,
  hungary:   78000,
  spa:      105000,
  zandvoort: 77000,
  monza:     76000,
  baku:     100000,
  singapore:110000,
  suzuka:    89000,
  qatar:     89000,
  austin:    90000,
  mexico:    78000,
  brazil:    70000,
  vegas:     92000,
  abu_dhabi: 92000
};

// multiplicador de ritmo global (para ajustar “velocidade visual”)
const GLOBAL_PACE = 1.0;

// ------------------------------
// GRID 2025 (mesmo do qualifying)
// ------------------------------
const RACE_DRIVERS_2025 = [
  { id: "verstappen", code: "VER", name: "Max Verstappen",  teamKey: "redbull",   teamName: "Red Bull Racing", rating: 98, color: "#ffb300" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",    teamKey: "redbull",   teamName: "Red Bull Racing", rating: 94, color: "#ffb300" },

  { id: "leclerc",    code: "LEC", name: "Charles Leclerc", teamKey: "ferrari",   teamName: "Ferrari",         rating: 95, color: "#ff0000" },
  { id: "sainz",      code: "SAI", name: "Carlos Sainz",    teamKey: "ferrari",   teamName: "Ferrari",         rating: 93, color: "#ff0000" },

  { id: "hamilton",   code: "HAM", name: "Lewis Hamilton",  teamKey: "mercedes", teamName: "Mercedes",        rating: 95, color: "#00e5ff" },
  { id: "russell",    code: "RUS", name: "George Russell",  teamKey: "mercedes", teamName: "Mercedes",        rating: 93, color: "#00e5ff" },

  { id: "norris",     code: "NOR", name: "Lando Norris",    teamKey: "mclaren",  teamName: "McLaren",         rating: 94, color: "#ff8c1a" },
  { id: "piastri",    code: "PIA", name: "Oscar Piastri",   teamKey: "mclaren",  teamName: "McLaren",         rating: 92, color: "#ff8c1a" },

  { id: "alonso",     code: "ALO", name: "Fernando Alonso", teamKey: "aston",    teamName: "Aston Martin",    rating: 94, color: "#00b894" },
  { id: "stroll",     code: "STR", name: "Lance Stroll",    teamKey: "aston",    teamName: "Aston Martin",    rating: 88, color: "#00b894" },

  { id: "gasly",      code: "GAS", name: "Pierre Gasly",    teamKey: "alpine",   teamName: "Alpine",          rating: 90, color: "#4c6fff" },
  { id: "ocon",       code: "OCO", name: "Esteban Ocon",    teamKey: "alpine",   teamName: "Alpine",          rating: 90, color: "#4c6fff" },

  { id: "tsunoda",    code: "TSU", name: "Yuki Tsunoda",    teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff" },
  { id: "lawson",     code: "LAW", name: "Liam Lawson",     teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff" },

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg", teamKey: "sauber",   teamName: "Sauber / Audi",   rating: 89, color: "#00cec9" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi",   rating: 88, color: "#00cec9" },

  { id: "kevin",      code: "MAG", name: "Kevin Magnussen", teamKey: "haas",     teamName: "Haas",            rating: 87, color: "#ffffff" },
  { id: "bearman",    code: "BEA", name: "Oliver Bearman",  teamKey: "haas",     teamName: "Haas",            rating: 87, color: "#ffffff" },

  { id: "albon",      code: "ALB", name: "Alex Albon",      teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3" },
  { id: "sargeant",   code: "SAR", name: "Logan Sargeant",  teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3" }
];

// monta caminho da face a partir do “code”
function getFacePath(code) {
  return `assets/faces/${code}.png`;
}

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const raceState = {
  trackKey: "australia",
  gpName: "GP da Austrália 2025",
  userTeamKey: "ferrari",
  totalLaps: 25,
  currentLap: 1,
  pathPoints: [],
  driverObjects: [],
  driverVisuals: [],
  lastUpdateTime: null,
  running: true,
  speedMultiplier: 1,
  podium: null
};

// modos de ritmo
const RACE_MODES = {
  normal: { pace: 1.0, tyreWear: 1.0 },
  push:   { pace: 1.03, tyreWear: 1.6 },
  save:   { pace: 0.97, tyreWear: 0.5 }
};

// ------------------------------
// UTILS
// ------------------------------
function formatLapTime(ms) {
  if (!isFinite(ms)) return "--:--.---";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds - minutes * 60 - seconds) * 1000);
  const mm = String(minutes);
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function lerGridDoLocalStorage() {
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Erro lendo grid da qualy:", e);
    return null;
  }
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
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t
  };
}

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initRace();
});

function initRace() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "GP da Austrália 2025";
  const userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  raceState.trackKey = track;
  raceState.gpName = gp;
  raceState.userTeamKey = userTeam;

  const baseLap = TRACK_BASE_LAP_MS[track] || 90000;
  // define número de voltas a partir do tempo base (para ficar ~35–45 min de simulação real)
  raceState.totalLaps = Math.round(2700000 / baseLap); // ~45 minutos em ms
  if (raceState.totalLaps < 20) raceState.totalLaps = 20;
  if (raceState.totalLaps > 25) raceState.totalLaps = 25;

  const titleEl = document.getElementById("gp-title");
  const lapLabel = document.getElementById("race-lap-label");
  if (titleEl) titleEl.textContent = gp;
  if (lapLabel)
    lapLabel.textContent = `Volta ${raceState.currentLap} / ${raceState.totalLaps}`;

  // monta grid
  const qualy = lerGridDoLocalStorage();
  let gridDrivers;

  if (qualy && Array.isArray(qualy.grid)) {
    gridDrivers = qualy.grid
      .sort((a, b) => a.position - b.position)
      .map((g) => {
        const base = RACE_DRIVERS_2025.find((d) => d.id === g.id) ||
          RACE_DRIVERS_2025.find((d) => d.name === g.name);
        if (!base) return null;
        return { ...base };
      })
      .filter(Boolean);
  } else {
    // fallback: usa ordem padrão
    gridDrivers = RACE_DRIVERS_2025.map((d) => ({ ...d }));
  }

  // cria objetos da corrida
  const baseLapMs = TRACK_BASE_LAP_MS[track] || 90000;
  raceState.driverObjects = gridDrivers.map((drv, idx) => {
    const ratingFactor = 1 + (drv.rating - 90) * 0.01; // 90 = neutro
    const idealLapMs = baseLapMs / ratingFactor / GLOBAL_PACE;

    return {
      ...drv,
      face: getFacePath(drv.code),
      index: idx,
      gridPos: idx + 1,
      progress: (idx / gridDrivers.length) * 0.02, // largando compactados
      laps: 0,
      bestLapTime: null,
      lastLapTime: null,
      lastLapTimestamp: null,
      totalTime: 0,
      tyreWear: 0, // 0 a 100
      carWear: 0,  // futuro: falhas
      idealLapMs,
      raceMode: "normal",
      pitStops: 0
    };
  });

  // UI da equipe do jogador
  preencherPainelUsuario();

  // monta pista
  loadTrackSvg(track).then(() => {
    attachControlEvents();
    raceState.lastUpdateTime = performance.now();
    requestAnimationFrame(raceLoop);
  });
}

// ------------------------------
// SVG DA PISTA
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

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  raceState.pathPoints = pts.map((p) => ({
    x: ((p.x - minX) / width) * 1000,
    y: ((p.y - minY) / height) * 600
  }));

  // pista
  const trackPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  trackPath.setAttribute(
    "points",
    raceState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#555");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  const innerPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  innerPath.setAttribute(
    "points",
    raceState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#aaaaaa");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  raceState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 2);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  const flagPoint = raceState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  // bolinhas dos carros
  raceState.driverVisuals = raceState.driverObjects.map((drv) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 5);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    group.appendChild(body);

    if (drv.teamKey === raceState.userTeamKey) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-9 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      group.appendChild(tri);
    }

    svg.appendChild(group);
    return { driverId: drv.id, group };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function raceLoop(timestamp) {
  if (!raceState.running) return;

  const dt =
    raceState.lastUpdateTime != null
      ? (timestamp - raceState.lastUpdateTime) * raceState.speedMultiplier
      : 0;
  raceState.lastUpdateTime = timestamp;

  updateRaceSimulation(dt);
  renderRace();

  requestAnimationFrame(raceLoop);
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function updateRaceSimulation(dtMs) {
  if (!raceState.pathPoints.length) return;

  const now = performance.now();
  const totalLaps = raceState.totalLaps;

  raceState.driverObjects.forEach((drv) => {
    // escolha de ritmo
    const modeCfg = RACE_MODES[drv.raceMode] || RACE_MODES.normal;

    // efeito de desgaste de pneu: quanto mais gasto, mais lento
    const tyreFactor = 1 + drv.tyreWear * 0.005; // 100% => +50% de tempo
    const effectiveLapMs = drv.idealLapMs * tyreFactor / modeCfg.pace;
    const baseSpeed = 1 / effectiveLapMs; // progress por ms

    const noise = (Math.random() - 0.5) * baseSpeed * 0.07;
    const speed = (baseSpeed + noise) * GLOBAL_PACE;

    const deltaProgress = speed * dtMs;
    let newProgress = drv.progress + deltaProgress;

    if (drv.lastLapTimestamp == null) {
      drv.lastLapTimestamp = now;
    }

    // cruzou linha de chegada
    if (newProgress >= 1) {
      newProgress -= 1;

      const lapTime = now - drv.lastLapTimestamp;
      drv.lastLapTimestamp = now;
      drv.laps += 1;
      drv.lastLapTime = lapTime;
      drv.totalTime += lapTime;

      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }

      // desgaste de pneu por volta
      const wearBase = 3; // %
      drv.tyreWear += wearBase * modeCfg.tyreWear;
      if (drv.tyreWear > 100) drv.tyreWear = 100;

      // piloto pedindo box quando pneu > 80%
      if (drv.tyreWear >= 80 && drv.teamKey === raceState.userTeamKey) {
        // se jogador não parar, a IA aumenta tempo
        // (aqui só marca um flagzinho interno)
        drv.wantsPit = true;
      }
    }

    drv.progress = newProgress;
  });

  // ordena por totalTime / progress
  const finished = raceState.driverObjects.some((d) => d.laps >= totalLaps);
  if (finished) {
    raceState.running = false;
    finalizarCorrida();
    return;
  }

  const leaderLaps = Math.max(...raceState.driverObjects.map((d) => d.laps));
  raceState.currentLap = Math.min(leaderLaps + 1, totalLaps);
  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel)
    lapLabel.textContent = `Volta ${raceState.currentLap} / ${raceState.totalLaps}`;

  atualizarTabelaTempoReal();
}

// ------------------------------
// RENDER POSIÇÃO NA PISTA
// ------------------------------
function renderRace() {
  if (!raceState.pathPoints.length) return;
  if (!raceState.driverVisuals.length) return;

  const driversById = {};
  raceState.driverObjects.forEach((d) => {
    driversById[d.id] = d;
  });

  raceState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ------------------------------
// TABELA EM TEMPO REAL
// ------------------------------
function atualizarTabelaTempoReal() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const ordenados = [...raceState.driverObjects].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return (b.rating || 0) - (a.rating || 0);
  });

  list.innerHTML = "";

  ordenados.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    const posDiv = document.createElement("div");
    posDiv.className = "driver-pos";
    posDiv.textContent = `${idx + 1}º`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "driver-info";

    const imgFace = document.createElement("img");
    imgFace.className = "driver-face";
    imgFace.src = drv.face || "";
    imgFace.alt = drv.name;

    const textDiv = document.createElement("div");
    textDiv.className = "driver-text";
    const nameSpan = document.createElement("div");
    nameSpan.className = "driver-name";
    nameSpan.textContent = drv.name;
    const teamSpan = document.createElement("div");
    teamSpan.className = "driver-team";
    teamSpan.textContent = drv.teamName;

    textDiv.appendChild(nameSpan);
    textDiv.appendChild(teamSpan);

    infoDiv.appendChild(imgFace);
    infoDiv.appendChild(textDiv);

    const statsDiv = document.createElement("div");
    statsDiv.className = "driver-stats";
    statsDiv.innerHTML = `
      <div class="stat-line">Voltas <span>${drv.laps}</span></div>
      <div class="stat-line">Melhor <span>${formatLapTime(drv.bestLapTime ?? Infinity)}</span></div>
      <div class="stat-line">Última <span>${formatLapTime(drv.lastLapTime ?? Infinity)}</span></div>
      <div class="stat-line">Pneus <span>${drv.tyreWear.toFixed(0)}%</span></div>
    `;

    row.appendChild(posDiv);
    row.appendChild(infoDiv);
    row.appendChild(statsDiv);

    if (drv.teamKey === raceState.userTeamKey) {
      row.classList.add("user-team-row");
    }

    list.appendChild(row);
  });

  raceState.driverObjectsSorted = ordenados;
}

// ------------------------------
// PAINEL DO USUÁRIO
// ------------------------------
function preencherPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.driverObjects.filter(
    (d) => d.teamKey === team
  ).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const card = document.getElementById(`user-driver-card-${idx}`);
    if (!card) return;
    card.dataset.driverId = drv.id;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const teamName = card.querySelector(".user-team");
    const carSpan = card.querySelector(`#user-car-${idx}`);
    const tyreSpan = card.querySelector(`#user-tyre-${idx}`);

    if (face) face.src = drv.face || "";
    if (name) name.textContent = drv.name;
    if (teamName) teamName.textContent = drv.teamName;
    if (carSpan) carSpan.textContent = `${(100 - drv.carWear).toFixed(0)}%`;
    if (tyreSpan) tyreSpan.textContent = `${drv.tyreWear.toFixed(0)}%`;
  });

  atualizarPainelUsuario();
}

function atualizarPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.driverObjects.filter(
    (d) => d.teamKey === team
  ).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const carSpan = document.getElementById(`user-car-${idx}`);
    const tyreSpan = document.getElementById(`user-tyre-${idx}`);
    if (carSpan) carSpan.textContent = `${(100 - drv.carWear).toFixed(0)}%`;
    if (tyreSpan) tyreSpan.textContent = `${drv.tyreWear.toFixed(0)}%`;
  });
}

// ------------------------------
// CONTROLES (BOTÕES)
// ------------------------------
function attachControlEvents() {
  // velocidade
  document.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = Number(btn.dataset.speed || "1") || 1;
      setRaceSpeed(mult);

      document.querySelectorAll(".speed-btn").forEach((b) =>
        b.classList.remove("active")
      );
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
}

function handleUserAction(cardIndex, action) {
  const card = document.getElementById(`user-driver-card-${cardIndex}`);
  if (!card) return;
  const driverId = card.dataset.driverId;
  const drv = raceState.driverObjects.find((d) => d.id === driverId);
  if (!drv) return;

  if (action === "pit") {
    // “marca” que ele vai parar na próxima passagem pela linha
    drv.forcePit = true;
  } else if (action === "push") {
    drv.raceMode = "push";
  } else if (action === "save") {
    drv.raceMode = "save";
  }

  // feedback visual simples nas tags de status
  const statusEl = card.querySelector(".user-status-mode");
  if (statusEl) {
    if (action === "push") statusEl.textContent = "Ataque";
    else if (action === "save") statusEl.textContent = "Economizar";
    else if (action === "pit") statusEl.textContent = "Chamado para o box";
  }
}

// chamada no loop para aplicar PIT STOP quando cruzar a linha
function aplicarPitStopsSeNecessario(now) {
  raceState.driverObjects.forEach((drv) => {
    if (!drv.forcePit && !drv.wantsPit) return;
    if (drv.progress < 0.01) {
      // está passando na linha de chegada
      drv.forcePit = false;
      drv.wantsPit = false;
      drv.pitStops += 1;

      // pit dura alguns “frames” – aqui simplificamos somando tempo extra
      const pitMs = 20000 + Math.random() * 5000;
      drv.totalTime += pitMs;

      // pneu novo
      drv.tyreWear = 0;
    }
  });
}

// sobrepõe updateRaceSimulation com pit
const _oldUpdateRaceSimulation = updateRaceSimulation;
updateRaceSimulation = function (dtMs) {
  _oldUpdateRaceSimulation(dtMs);
  aplicarPitStopsSeNecessario(performance.now());
  atualizarPainelUsuario();
};

// ------------------------------
// FIM DE CORRIDA
// ------------------------------
function finalizarCorrida() {
  const ordenados = [...raceState.driverObjects].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return (b.rating || 0) - (a.rating || 0);
  });

  raceState.podium = ordenados.slice(0, 3);

  mostrarModalResultado(ordenados);
}

// modal simples de resultado
function mostrarModalResultado(ordered) {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const [p1, p2, p3] = raceState.podium;

  const face1 = document.getElementById("podium1-face");
  const face2 = document.getElementById("podium2-face");
  const face3 = document.getElementById("podium3-face");
  const name1 = document.getElementById("podium1-name");
  const name2 = document.getElementById("podium2-name");
  const name3 = document.getElementById("podium3-name");
  const team1 = document.getElementById("podium1-team");
  const team2 = document.getElementById("podium2-team");
  const team3 = document.getElementById("podium3-team");

  if (p1 && face1 && name1 && team1) {
    face1.src = p1.face || "";
    name1.textContent = p1.name;
    team1.textContent = p1.teamName;
  }
  if (p2 && face2 && name2 && team2) {
    face2.src = p2.face || "";
    name2.textContent = p2.name;
    team2.textContent = p2.teamName;
  }
  if (p3 && face3 && name3 && team3) {
    face3.src = p3.face || "";
    name3.textContent = p3.name;
    team3.textContent = p3.teamName;
  }

  modal.classList.remove("hidden");
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  window.location.href = "calendar.html";
}

// ------------------------------
// CONTROLE DE VELOCIDADE (1x / 2x / 4x)
// ------------------------------
function setRaceSpeed(mult) {
  raceState.speedMultiplier = mult;
}
window.setRaceSpeed = setRaceSpeed;
window.closePodium = closePodium;
