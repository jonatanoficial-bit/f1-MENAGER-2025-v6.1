// ===============================================
// F1 MANAGER 2025 – PRACTICE.JS (SVG)
// Treino livre com 2 pilotos da equipe do usuário
// ===============================================

// ---------- CONFIGURAÇÕES BÁSICAS ----------
const TRACK_BASE_LAP_MS = {
  bahrein: 89000,
  arabia_saudita: 88000,
  australia: 86000,
  japao: 91000,
  china: 95000,
  miami: 90000,
  imola: 88000,
  monaco: 72000,
  canada: 82000,
  espanha: 88000,
  austria: 65000,
  inglaterra: 87000,
  hungria: 78000,
  belgica: 105000,
  holanda: 76000,
  italia_monza: 81000,
  singapura: 110000,
  estados_unidos: 93000,
  mexico: 78000,
  sao_paulo: 71000,
  las_vegas: 93000,
  catar: 90000,
  abu_dhabi: 94000
};

const SESSION_TOTAL_MS = 60 * 60 * 1000; // 60 min simulados
const SESSION_TIME_FACTOR = 0.03;        // velocidade do relógio da sessão

const TYRE_WEAR_PER_SEC_BASE = 0.18;     // desgaste por segundo (modo normal)
const CAR_WEAR_PER_SEC_ATTACK = 0.03;    // desgaste extra em modo ataque
const PIT_DURATION_MS = 6000;            // tempo de pit em ms simulados

// ---------- PILOTOS 2025 ----------
const DRIVERS_2025 = [
  { id: "verstappen", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", face: "assets/faces/verstappen.png" },
  { id: "perez",      name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", face: "assets/faces/perez.png" },

  { id: "leclerc", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", face: "assets/faces/leclerc.png" },
  { id: "sainz",   name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", face: "assets/faces/sainz.png" },

  { id: "hamilton", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", face: "assets/faces/hamilton.png" },
  { id: "russell",  name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", face: "assets/faces/russell.png" },

  { id: "norris", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", face: "assets/faces/norris.png" },
  { id: "piastri", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", face: "assets/faces/piastri.png" },

  { id: "alonso", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", face: "assets/faces/alonso.png" },
  { id: "stroll", name: "Lance Stroll",   teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", face: "assets/faces/stroll.png" },

  { id: "ogasly", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/gasly.png" },
  { id: "ocon",   name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/ocon.png" },

  { id: "tsunoda", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", face: "assets/faces/tsunoda.png" },
  { id: "lawson",  name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", face: "assets/faces/lawson.png" },

  { id: "hulkenberg", name: "Nico Hülkenberg",   teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", face: "assets/faces/hulkenberg.png" },
  { id: "bortoleto",  name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", face: "assets/faces/bortoleto.png" },

  { id: "kevin",   name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/magnussen.png" },
  { id: "bearman", name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/bearman.png" },

  { id: "albon",    name: "Alex Albon",       teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", face: "assets/faces/albon.png" },
  { id: "sargeant", name: "Logan Sargeant",   teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", face: "assets/faces/sargeant.png" }
];

// ---------- ESTADO DO TREINO ----------
const practiceState = {
  trackKey: "australia",
  gpName: "Treino Livre 2025",
  userTeamKey: "ferrari",
  managerName: "Manager",
  pathPoints: [],
  drivers: [],
  driverVisuals: [],
  lastTimestamp: null,
  running: true,
  speedMultiplier: 1,
  sessionRemainingMs: SESSION_TOTAL_MS,
  currentLapMax: 1
};

// ---------- FUNÇÕES UTIL ----------
function formatTimeMMSS(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function getPositionOnTrack(progress) {
  const pts = practiceState.pathPoints;
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

// ---------- INICIALIZAÇÃO ----------
window.addEventListener("DOMContentLoaded", () => {
  initPractice();
});

function initPractice() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "Treino Livre – GP 2025";

  const userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  const managerName =
    localStorage.getItem("f1m2025_manager_name") || "Novo gerente";

  practiceState.trackKey = track;
  practiceState.gpName = gp;
  practiceState.userTeamKey = userTeam;
  practiceState.managerName = managerName;

  // UI inicial
  const gpTitleEl = document.getElementById("gpTitle");
  const sessionTimeEl = document.getElementById("sessionTime");
  const trackLabelEl = document.getElementById("trackLabel");
  const teamNameEl = document.getElementById("teamName");
  const managerNameEl = document.getElementById("managerName");

  if (gpTitleEl) gpTitleEl.textContent = gp;
  if (sessionTimeEl) sessionTimeEl.textContent = formatTimeMMSS(practiceState.sessionRemainingMs);
  if (trackLabelEl) trackLabelEl.textContent = `Circuito: ${track.toUpperCase()}`;
  if (managerNameEl) managerNameEl.textContent = managerName;

  const teamDrivers = DRIVERS_2025.filter(d => d.teamKey === userTeam);
  const teamName = teamDrivers[0]?.teamName || "Equipe";
  if (teamNameEl) teamNameEl.textContent = teamName;

  // Preenche cards dos dois pilotos da equipe
  setupUserDrivers(teamDrivers);

  // Botões de velocidade
  setupSpeedButtons();

  // Botões de ações piloto / navegação
  setupActionButtons();

  // Carregar SVG da pista
  loadTrackSvg(track).then(() => {
    practiceState.lastTimestamp = performance.now();
    requestAnimationFrame(mainLoopPractice);
  });
}

// ---------- CONFIGURAR PILOTOS DO USUÁRIO ----------
function setupUserDrivers(teamDrivers) {
  // Pega dois primeiros da equipe
  const d1 = teamDrivers[0] || DRIVERS_2025[0];
  const d2 = teamDrivers[1] || DRIVERS_2025[1];

  practiceState.drivers = [
    createDriverState(d1),
    createDriverState(d2)
  ];

  // UI piloto 1
  const face1 = document.getElementById("driverFace1");
  const name1 = document.getElementById("driverName1");
  const team1 = document.getElementById("driverTeam1");
  if (face1) face1.src = d1.face || "";
  if (name1) name1.textContent = d1.name;
  if (team1) team1.textContent = d1.teamName;

  // UI piloto 2
  const face2 = document.getElementById("driverFace2");
  const name2 = document.getElementById("driverName2");
  const team2 = document.getElementById("driverTeam2");
  if (face2) face2.src = d2.face || "";
  if (name2) name2.textContent = d2.name;
  if (team2) team2.textContent = d2.teamName;

  // Status iniciais
  updateDriverStatusUI(0);
  updateDriverStatusUI(1);
}

function createDriverState(base) {
  const trackKey = practiceState.trackKey;
  const baseLapMs =
    TRACK_BASE_LAP_MS[trackKey] || 85000; // fallback
  const ratingFactor = (base.rating - 80) / 1000; // pequeno ajuste
  const targetLapMs = baseLapMs * (1 - ratingFactor);

  return {
    id: base.id,
    name: base.name,
    teamKey: base.teamKey,
    teamName: base.teamName,
    color: base.color || "#ffffff",
    face: base.face || "",
    lapTargetMs: targetLapMs,
    progress: Math.random(),
    laps: 0,
    mode: "normal", // "normal" | "save" | "attack"
    tyreWear: 0,    // 0–100
    carHealth: 100, // 0–100
    inPit: false,
    pitTimerMs: 0,
    lastLapTimestamp: performance.now()
  };
}

// ---------- SVG DA PISTA ----------
async function loadTrackSvg(trackKey) {
  const svgEl = document.getElementById("trackSvg");
  if (!svgEl) return;

  // Limpa
  while (svgEl.firstChild) {
    svgEl.removeChild(svgEl.firstChild);
  }

  let text;
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro ao carregar SVG da pista:", e);
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
  const samples = 400;
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((pathLen * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  practiceState.pathPoints = pts.map(p => ({
    x: ((p.x - minX) / width) * 1000,
    y: ((p.y - minY) / height) * 600
  }));

  // Desenha traçado principal
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute(
    "points",
    practiceState.pathPoints.map(p => `${p.x},${p.y}`).join(" ")
  );
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#1f2933");
  trackPath.setAttribute("stroke-width", "20");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svgEl.appendChild(trackPath);

  // Linha branca interna
  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerPath.setAttribute(
    "points",
    practiceState.pathPoints.map(p => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#f9fafb");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svgEl.appendChild(innerPath);

  // Carros dos dois pilotos
  practiceState.driverVisuals = practiceState.drivers.map(drv => {
    const car = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    car.setAttribute("r", "7");
    car.setAttribute("fill", drv.color || "#ffffff");
    car.setAttribute("stroke", "#000");
    car.setAttribute("stroke-width", "1.5");
    svgEl.appendChild(car);
    return { id: drv.id, el: car };
  });

  // Bandeira de chegada (ponto 0)
  const flagPoint = practiceState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#fbbf24");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svgEl.appendChild(flag);
}

// ---------- LOOP PRINCIPAL ----------
function mainLoopPractice(timestamp) {
  if (!practiceState.running) return;

  const dt =
    practiceState.lastTimestamp != null
      ? (timestamp - practiceState.lastTimestamp) * practiceState.speedMultiplier
      : 0;

  practiceState.lastTimestamp = timestamp;

  updateSession(dt);
  updateDrivers(dt);
  renderDrivers();

  requestAnimationFrame(mainLoopPractice);
}

// ---------- ATUALIZAÇÃO DA SESSÃO ----------
function updateSession(dtMs) {
  const sessionDelta = dtMs * SESSION_TIME_FACTOR;
  practiceState.sessionRemainingMs -= sessionDelta;

  if (practiceState.sessionRemainingMs <= 0) {
    practiceState.sessionRemainingMs = 0;
    practiceState.running = false;
  }

  const timeEl = document.getElementById("sessionTime");
  if (timeEl) {
    timeEl.textContent = formatTimeMMSS(practiceState.sessionRemainingMs);
  }

  const lapEl = document.getElementById("sessionLap");
  if (lapEl) {
    lapEl.textContent = String(practiceState.currentLapMax);
  }
}

// ---------- ATUALIZAÇÃO DOS PILOTOS ----------
function updateDrivers(dtMs) {
  if (!practiceState.pathPoints.length) return;

  const now = performance.now();

  practiceState.drivers.forEach((drv, idx) => {
    if (drv.inPit) {
      drv.pitTimerMs -= dtMs;
      if (drv.pitTimerMs <= 0) {
        drv.inPit = false;
      }
      updateDriverStatusUI(idx);
      return;
    }

    // Ajuste de velocidade baseado no alvo de volta
    let baseSpeed = 1 / drv.lapTargetMs; // progresso por ms

    // Ajuste por modo
    if (drv.mode === "save") {
      baseSpeed *= 0.96;
    } else if (drv.mode === "attack") {
      baseSpeed *= 1.06;
    }

    // Desgaste influencia desempenho
    let tyreFactor = 1;
    if (drv.tyreWear >= 80 && drv.tyreWear < 100) {
      tyreFactor = 0.9; // perde tempo
    } else if (drv.tyreWear >= 100) {
      tyreFactor = 0.7;
    }
    baseSpeed *= tyreFactor;

    // Avança na pista
    const deltaProgress = baseSpeed * dtMs;
    let newProgress = drv.progress + deltaProgress;

    if (newProgress >= 1) {
      newProgress -= 1;
      drv.laps += 1;
      drv.lastLapTimestamp = now;
      if (drv.laps + 1 > practiceState.currentLapMax) {
        practiceState.currentLapMax = drv.laps + 1;
      }
    }

    drv.progress = newProgress;

    // Desgaste de pneus
    const wearPerMsBase = TYRE_WEAR_PER_SEC_BASE / 1000;
    let wearFactor = 1;
    if (drv.mode === "save") wearFactor = 0.65;
    if (drv.mode === "attack") wearFactor = 1.4;

    drv.tyreWear += wearPerMsBase * wearFactor * dtMs;
    if (drv.tyreWear > 100) drv.tyreWear = 100;

    // Desgaste de carro em modo ataque
    if (drv.mode === "attack") {
      const carWearPerMs = CAR_WEAR_PER_SEC_ATTACK / 1000;
      drv.carHealth -= carWearPerMs * dtMs;
      if (drv.carHealth < 0) drv.carHealth = 0;
    }

    // Se pneu chegou em 80%, piloto "pede" box (apenas UI)
    if (
      drv.tyreWear >= 80 &&
      !drv._warnedPit
    ) {
      drv._warnedPit = true;
      console.log(`${drv.name} pede PIT (pneu 80%)`);
    }

    updateDriverStatusUI(idx);
  });
}

// ---------- RENDER DOS CARROS NO SVG ----------
function renderDrivers() {
  if (!practiceState.pathPoints.length) return;

  const byId = {};
  practiceState.drivers.forEach(d => { byId[d.id] = d; });

  practiceState.driverVisuals.forEach(vis => {
    const drv = byId[vis.id];
    if (!drv) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.el.setAttribute("cx", pos.x);
    vis.el.setAttribute("cy", pos.y);
  });
}

// ---------- UI STATUS DOS PILOTOS ----------
function updateDriverStatusUI(index) {
  const drv = practiceState.drivers[index];
  if (!drv) return;

  const carSpan = document.getElementById(index === 0 ? "carStatus1" : "carStatus2");
  const tyreSpan = document.getElementById(index === 0 ? "tyreStatus1" : "tyreStatus2");

  if (carSpan) {
    carSpan.textContent = `${Math.round(drv.carHealth)}%`;
  }
  if (tyreSpan) {
    tyreSpan.textContent = `${Math.round(drv.tyreWear)}%`;
  }
}

// ---------- BOTÕES DE VELOCIDADE ----------
function setupSpeedButtons() {
  const b1 = document.getElementById("speed1x");
  const b2 = document.getElementById("speed2x");
  const b4 = document.getElementById("speed4x");

  function setSpeed(mult, btn) {
    practiceState.speedMultiplier = mult;
    [b1, b2, b4].forEach(b => {
      if (!b) return;
      b.classList.toggle("active", b === btn);
    });
  }

  if (b1) b1.addEventListener("click", () => setSpeed(1, b1));
  if (b2) b2.addEventListener("click", () => setSpeed(2, b2));
  if (b4) b4.addEventListener("click", () => setSpeed(4, b4));
}

// ---------- BOTÕES DE AÇÕES E NAVEGAÇÃO ----------
function setupActionButtons() {
  // Navegação
  const btnGoGarage = document.getElementById("btnGoGarage");
  const btnBackLobby = document.getElementById("btnBackLobby");

  if (btnGoGarage) {
    btnGoGarage.addEventListener("click", () => {
      window.location.href = "oficina.html";
    });
  }
  if (btnBackLobby) {
    btnBackLobby.addEventListener("click", () => {
      window.location.href = "lobby.html";
    });
  }

  // Piloto 1
  const pit1 = document.getElementById("btnPit1");
  const save1 = document.getElementById("btnSave1");
  const attack1 = document.getElementById("btnAttack1");
  if (pit1) pit1.addEventListener("click", () => commandPit(0));
  if (save1) save1.addEventListener("click", () => setMode(0, "save"));
  if (attack1) attack1.addEventListener("click", () => setMode(0, "attack"));

  // Piloto 2
  const pit2 = document.getElementById("btnPit2");
  const save2 = document.getElementById("btnSave2");
  const attack2 = document.getElementById("btnAttack2");
  if (pit2) pit2.addEventListener("click", () => commandPit(1));
  if (save2) save2.addEventListener("click", () => setMode(1, "save"));
  if (attack2) attack2.addEventListener("click", () => setMode(1, "attack"));
}

// ---------- LÓGICA DE PIT E MODO ----------
function commandPit(index) {
  const drv = practiceState.drivers[index];
  if (!drv || drv.inPit) return;

  drv.inPit = true;
  drv.pitTimerMs = PIT_DURATION_MS;
  drv.tyreWear = 0;
  drv._warnedPit = false;
  // após o pit, volta para modo normal
  drv.mode = "normal";
  updateDriverStatusUI(index);
}

function setMode(index, mode) {
  const drv = practiceState.drivers[index];
  if (!drv || drv.inPit) return;
  drv.mode = mode;
}
```0
