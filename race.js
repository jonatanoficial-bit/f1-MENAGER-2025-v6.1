// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida completa + Pit stop obrigatório + Pódio em modal
// ==========================================================

// ------------------------------
// CONFIGURAÇÃO GERAL
// ------------------------------
const RACE_TOTAL_LAPS = 25;
const PIT_STOP_BASE_TIME_MS = 7000;      // 7s parado
const NO_PIT_PENALTY_MS    = 20000;      // +20s se não fez pit obrigatório
const TYRE_WEAR_PER_LAP    = 4;          // desgaste médio por volta
const TYRE_WARN_PERCENT    = 80;         // a partir daqui o piloto "pede" box
const TYRE_CRITICAL        = 100;        // passou disso, estoura pneu (abandono)

// ------------------------------
// LISTA DE PILOTOS 2025 (igual da qualy, com Bortoleto)
// ------------------------------
const DRIVERS_2025 = [
  { id: "verstappen", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", face: "assets/faces/verstappen.png", logo: "assets/logos/redbull.png" },
  { id: "perez",      name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", face: "assets/faces/perez.png",      logo: "assets/logos/redbull.png" },

  { id: "leclerc", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", face: "assets/faces/leclerc.png", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", face: "assets/faces/sainz.png",   logo: "assets/logos/ferrari.png" },

  { id: "hamilton", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", face: "assets/faces/hamilton.png", logo: "assets/logos/mercedes.png" },
  { id: "russell",  name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", face: "assets/faces/russell.png",  logo: "assets/logos/mercedes.png" },

  { id: "norris", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", face: "assets/faces/norris.png", logo: "assets/logos/mclaren.png" },
  { id: "piastri", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", face: "assets/faces/piastri.png", logo: "assets/logos/mclaren.png" },

  { id: "alonso", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", face: "assets/faces/alonso.png", logo: "assets/logos/aston.png" },
  { id: "stroll", name: "Lance Stroll",   teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", face: "assets/faces/stroll.png", logo: "assets/logos/aston.png" },

  { id: "ogasly", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/gasly.png",  logo: "assets/logos/alpine.png" },
  { id: "ocon",   name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/ocon.png",   logo: "assets/logos/alpine.png" },

  { id: "tsunoda", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", face: "assets/faces/tsunoda.png", logo: "assets/logos/racingbulls.png" },
  { id: "lawson",  name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", face: "assets/faces/lawson.png",  logo: "assets/logos/racingbulls.png" },

  { id: "hulkenberg", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", face: "assets/faces/hulkenberg.png", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", face: "assets/faces/bortoleto.png",  logo: "assets/logos/sauber.png" },

  { id: "kevin",  name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/magnussen.png", logo: "assets/logos/haas.png" },
  { id: "bearman",name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/bearman.png",   logo: "assets/logos/haas.png" },

  { id: "albon", name: "Alex Albon",  teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", face: "assets/faces/albon.png", logo: "assets/logos/williams.png" },
  { id: "sargeant", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", face: "assets/faces/sargeant.png", logo: "assets/logos/williams.png" }
];

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const raceState = {
  trackName: null,
  gpName: null,
  userTeamKey: null,
  pathPoints: [],
  driverVisuals: [],

  drivers: [],
  running: true,
  speedMultiplier: 1,
  lastUpdateTime: null,
  currentLapLabel: 1,
  finished: false
};

// ------------------------------
// UTILITÁRIOS
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
// INICIALIZAÇÃO
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initRace();
});

function initRace() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "GP 2025";
  let userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  raceState.trackName = track;
  raceState.gpName = gp;
  raceState.userTeamKey = userTeam;

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gp;

  // Monta grid a partir da qualy, se existir
  const savedQualyRaw = localStorage.getItem("f1m2025_last_qualy");
  let gridOrderIds = null;
  if (savedQualyRaw) {
    try {
      const saved = JSON.parse(savedQualyRaw);
      if (saved && saved.track === track && saved.gp === gp) {
        gridOrderIds = saved.grid.map((g) => g.id);
      }
    } catch (e) {
      console.warn("Erro lendo last_qualy:", e);
    }
  }

  let driversBase = [...DRIVERS_2025];
  if (Array.isArray(gridOrderIds) && gridOrderIds.length === DRIVERS_2025.length) {
    driversBase.sort((a, b) => {
      return gridOrderIds.indexOf(a.id) - gridOrderIds.indexOf(b.id);
    });
  } else {
    // fallback: por rating
    driversBase.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  raceState.drivers = driversBase.map((drv, idx) => ({
    ...drv,
    gridPosition: idx + 1,
    laps: 0,
    progress: idx * 0.02, // espaçamento na largada
    bestLapTime: null,
    lastLapTime: null,
    lastLapTimestamp: null,
    totalRaceTime: 0,
    tyreWear: 0,
    carHealth: 100,
    pitStops: 0,
    wantsPit: false,
    scheduledPit: false,
    inPit: false,
    pitTimer: 0,
    retired: false
  }));

  preencherPainelUsuario();
  configurarBotoesUsuario();
  configurarBotoesVelocidade();

  loadTrackSvg(track).then(() => {
    raceState.lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoopRace);
  });
}

// ------------------------------
// CARREGAR PISTA SVG
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
    console.error("Nenhum <path> no SVG da pista.");
    return;
  }

  const pathLen = path.getTotalLength();
  const samples = 400;
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

  // pista cinza
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
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

  // faixa branca
  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerPath.setAttribute(
    "points",
    raceState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#e0e0e0");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  // nodos brancos
  raceState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 3);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  // bandeira
  const flagPoint = raceState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  // carros
  raceState.driverVisuals = raceState.drivers.map((drv) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", 6);
    circle.setAttribute("stroke", "#000");
    circle.setAttribute("stroke-width", "1.5");
    circle.setAttribute("fill", drv.color || "#ffffff");
    g.appendChild(circle);

    if (drv.teamKey === raceState.userTeamKey) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      g.appendChild(tri);
    }

    svg.appendChild(g);
    return { driverId: drv.id, group: g };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function gameLoopRace(timestamp) {
  if (!raceState.running) return;

  const dt =
    raceState.lastUpdateTime != null
      ? (timestamp - raceState.lastUpdateTime) * raceState.speedMultiplier
      : 0;
  raceState.lastUpdateTime = timestamp;

  updateRaceSimulation(dt);
  renderRace();

  if (raceState.running) {
    requestAnimationFrame(gameLoopRace);
  }
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function updateRaceSimulation(dtMs) {
  if (!raceState.pathPoints.length) return;
  const now = performance.now();

  let leaderLaps = 0;

  raceState.drivers.forEach((drv) => {
    if (drv.retired) return;

    // tempo total sempre anda
    drv.totalRaceTime += dtMs;

    if (drv.inPit) {
      drv.pitTimer -= dtMs;
      if (drv.pitTimer <= 0) {
        drv.inPit = false;
        drv.scheduledPit = false;
        drv.wantsPit = false;
        drv.tyreWear = 0;
      }
      return;
    }

    // desgaste começa a travar o carro
    let wearFactor = 1;
    if (drv.tyreWear > TYRE_WARN_PERCENT) {
      wearFactor = 0.97; // perde um pouco de performance
    }
    if (drv.tyreWear >= TYRE_CRITICAL) {
      drv.retired = true;
      drv.carHealth = 0;
      return;
    }

    const baseSpeed = 0.00023 + (drv.rating / 130000);
    const noise = (Math.random() - 0.5) * 0.000015;
    const speed = (baseSpeed + noise) * wearFactor;
    let newProgress = drv.progress + speed * (dtMs || 0);

    if (newProgress >= 1) {
      newProgress -= 1;
      const lapTime = drv.lastLapTimestamp
        ? now - drv.lastLapTimestamp
        : 80000 + Math.random() * 5000;

      drv.laps += 1;
      drv.lastLapTime = lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }
      drv.lastLapTimestamp = now;

      // desgaste de pneus por volta
      drv.tyreWear = Math.min(100, drv.tyreWear + TYRE_WEAR_PER_LAP);

      // piloto começa a pedir box
      if (drv.tyreWear >= TYRE_WARN_PERCENT && !drv.wantsPit) {
        drv.wantsPit = true;
      }

      // IA básica: se não for piloto do usuário, manda pro pit quando passar dos 85%
      if (
        drv.teamKey !== raceState.userTeamKey &&
        drv.tyreWear > 85 &&
        !drv.scheduledPit
      ) {
        marcarPitStop(drv.id);
      }
    }

    drv.progress = newProgress;
    if (!drv.lastLapTimestamp) drv.lastLapTimestamp = now;

    if (drv.laps > leaderLaps) leaderLaps = drv.laps;
  });

  raceState.currentLapLabel = Math.min(leaderLaps + 1, RACE_TOTAL_LAPS);

  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    lapLabel.textContent = `Volta ${raceState.currentLapLabel} / ${RACE_TOTAL_LAPS}`;
  }

  atualizarListaPilotos();
  atualizarPainelUsuario();

  // Verifica fim de corrida (quando o líder completa todas as voltas)
  if (!raceState.finished && leaderLaps >= RACE_TOTAL_LAPS) {
    raceState.finished = true;
    raceState.running = false;
    finalizarCorrida();
  }
}

// ------------------------------
// RENDERIZAÇÃO
// ------------------------------
function renderRace() {
  if (!raceState.pathPoints.length || !raceState.driverVisuals.length) return;

  const driversById = {};
  raceState.drivers.forEach((d) => (driversById[d.id] = d));

  raceState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv || drv.retired) {
      vis.group.setAttribute("display", "none");
      return;
    }
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ------------------------------
// UI – LISTA DE PILOTOS
// ------------------------------
function ordenarPorPosicao() {
  return [...raceState.drivers].sort((a, b) => {
    if (a.retired && !b.retired) return 1;
    if (b.retired && !a.retired) return -1;

    const distA = a.laps + a.progress;
    const distB = b.laps + b.progress;
    if (distB !== distA) return distB - distA;

    const ta = a.totalRaceTime;
    const tb = b.totalRaceTime;
    if (ta !== tb) return ta - tb;

    return (b.rating || 0) - (a.rating || 0);
  });
}

function atualizarListaPilotos() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const ordenados = ordenarPorPosicao();
  list.innerHTML = "";

  ordenados.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    const posDiv = document.createElement("div");
    posDiv.className = "driver-pos";
    posDiv.textContent = `${idx + 1}º`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "driver-info";

    const face = document.createElement("img");
    face.className = "driver-face";
    face.src = drv.face || "";
    face.alt = drv.name;

    const text = document.createElement("div");
    text.className = "driver-text";

    const name = document.createElement("div");
    name.className = "driver-name";
    name.textContent = drv.name;

    const team = document.createElement("div");
    team.className = "driver-team";
    team.textContent = drv.teamName;

    text.appendChild(name);
    text.appendChild(team);
    infoDiv.appendChild(face);
    infoDiv.appendChild(text);

    const stats = document.createElement("div");
    stats.className = "driver-stats";
    stats.innerHTML = `
      <div class="stat-line">Voltas <span>${drv.laps}/${RACE_TOTAL_LAPS}</span></div>
      <div class="stat-line">Melhor <span>${formatLapTime(drv.bestLapTime ?? Infinity)}</span></div>
      <div class="stat-line">Última <span>${formatLapTime(drv.lastLapTime ?? Infinity)}</span></div>
      <div class="stat-line">Pneus <span>${drv.tyreWear}%</span></div>
    `;

    if (drv.teamKey === raceState.userTeamKey) {
      row.classList.add("user-team-row");
    }
    if (drv.retired) {
      row.classList.add("retired-row");
    }

    row.appendChild(posDiv);
    row.appendChild(infoDiv);
    row.appendChild(stats);
    list.appendChild(row);
  });
}

// ------------------------------
// UI – PAINEL DO USUÁRIO
// ------------------------------
function preencherPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.drivers.filter((d) => d.teamKey === team).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const face = document.getElementById(`user-face-${idx}`);
    const name = document.getElementById(`user-name-${idx}`);
    const teamName = document.getElementById(`user-team-${idx}`);
    if (face) face.src = drv.face || "";
    if (name) name.textContent = drv.name;
    if (teamName) teamName.textContent = drv.teamName;
  });
}

function atualizarPainelUsuario() {
  const team = raceState.userTeamKey;
  const driversTeam = raceState.drivers.filter((d) => d.teamKey === team).slice(0, 2);

  driversTeam.forEach((drv, idx) => {
    const carSpan = document.getElementById(`user-car-${idx}`);
    const tyreSpan = document.getElementById(`user-tyre-${idx}`);
    if (carSpan) carSpan.textContent = `${drv.carHealth}%`;
    if (tyreSpan) tyreSpan.textContent = `${drv.tyreWear}%`;

    const card = document.getElementById(`user-driver-card-${idx}`);
    if (card) {
      if (drv.retired) {
        card.classList.add("retired-card");
      } else {
        card.classList.remove("retired-card");
      }
    }
  });
}

function configurarBotoesUsuario() {
  const buttons = document.querySelectorAll(".user-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      const action = btn.getAttribute("data-action");

      const teamDrivers = raceState.drivers.filter(
        (d) => d.teamKey === raceState.userTeamKey
      ).slice(0, 2);
      const drv = teamDrivers[idx];
      if (!drv || drv.retired) return;

      if (action === "pit") {
        marcarPitStop(drv.id);
      } else if (action === "save") {
        drv.rating = Math.max(60, drv.rating - 1);
      } else if (action === "push") {
        drv.rating = Math.min(99, drv.rating + 1);
      }
    });
  });
}

function marcarPitStop(driverId) {
  const drv = raceState.drivers.find((d) => d.id === driverId);
  if (!drv || drv.inPit || drv.retired) return;
  drv.scheduledPit = true;

  // entrada no pit: coloca progress perto da linha de pit, e inicia timer
  drv.inPit = true;
  drv.pitTimer = PIT_STOP_BASE_TIME_MS;
}

// ------------------------------
// CONTROLE DE VELOCIDADE
// ------------------------------
function configurarBotoesVelocidade() {
  const btns = document.querySelectorAll(".speed-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = parseFloat(btn.getAttribute("data-speed")) || 1;
      raceState.speedMultiplier = mult;

      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ------------------------------
// FINALIZAÇÃO DA CORRIDA + PÓDIO
// ------------------------------
function finalizarCorrida() {
  // classificação por distância e tempo
  const resultados = ordenarPorPosicao().map((drv) => {
    let timeMs = drv.totalRaceTime;

    let penaltyText = "";
    if (drv.pitStops === 0) {
      timeMs += NO_PIT_PENALTY_MS;
      penaltyText = ` (+20s sem pit obrigatório)`;
    }

    return {
      ...drv,
      finalTimeMs: timeMs,
      penaltyText
    };
  });

  resultados.sort((a, b) => {
    if (a.retired && !b.retired) return 1;
    if (b.retired && !a.retired) return -1;
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (a.finalTimeMs !== b.finalTimeMs) return a.finalTimeMs - b.finalTimeMs;
    return (b.rating || 0) - (a.rating || 0);
  });

  mostrarPodioModal(resultados);
}

function mostrarPodioModal(resultados) {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const p1 = resultados[0];
  const p2 = resultados[1];
  const p3 = resultados[2];

  const p1Face = document.getElementById("podium1-face");
  const p1Name = document.getElementById("podium1-name");
  const p1Team = document.getElementById("podium1-team");

  const p2Face = document.getElementById("podium2-face");
  const p2Name = document.getElementById("podium2-name");
  const p2Team = document.getElementById("podium2-team");

  const p3Face = document.getElementById("podium3-face");
  const p3Name = document.getElementById("podium3-name");
  const p3Team = document.getElementById("podium3-team");

  if (p1Face) p1Face.src = p1.face || "";
  if (p1Name) p1Name.textContent = p1.name;
  if (p1Team) p1Team.textContent = p1.teamName;

  if (p2Face) p2Face.src = p2.face || "";
  if (p2Name) p2Name.textContent = p2.name;
  if (p2Team) p2Team.textContent = p2.teamName;

  if (p3Face) p3Face.src = p3.face || "";
  if (p3Name) p3Name.textContent = p3.name;
  if (p3Team) p3Team.textContent = p3.teamName;

  // bloco de resultado completo
  let resultsDiv = document.getElementById("podium-results");
  if (!resultsDiv) {
    resultsDiv = document.createElement("div");
    resultsDiv.id = "podium-results";
    resultsDiv.className = "podium-results";
    const content = modal.querySelector(".podium-content");
    const closeBtn = modal.querySelector(".podium-close");
    if (content && closeBtn) {
      content.insertBefore(resultsDiv, closeBtn);
    }
  }

  let html = `<h3>Resultado completo</h3><ol>`;
  resultados.forEach((drv, idx) => {
    html += `<li>
      ${idx + 1}º - ${drv.name} (${drv.teamName}) –
      Tempo: ${formatLapTime(drv.finalTimeMs)} –
      Pit stops: ${drv.pitStops}${drv.penaltyText}
    </li>`;
  });
  html += `</ol><p>Clique em <strong>Fechar</strong> para voltar ao calendário.</p>`;
  resultsDiv.innerHTML = html;

  modal.classList.remove("hidden");
}

// botão "Fechar" do modal
function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (modal) modal.classList.add("hidden");
  // volta ao calendário
  window.location.href = "calendario.html";
}

// deixa as funções globais para o HTML
window.closePodium = closePodium;
