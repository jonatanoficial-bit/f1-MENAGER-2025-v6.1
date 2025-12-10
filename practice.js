// =======================================================
// F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE)
// =======================================================

// -------------------------------------------------------
// CHAVES DE STORAGE (mesmas da oficina)
// -------------------------------------------------------
const STORAGE_SETUP_KEY = "f1m2025_practice_setup";
const STORAGE_TEAM_KEY = "f1m2025_user_team";
const STORAGE_MANAGER_KEY = "f1m2025_user_manager";
const STORAGE_FLAG_KEY = "f1m2025_user_flag";

// -------------------------------------------------------
// LISTA DE PILOTOS 2025 (COM BORTOLETO)
// -------------------------------------------------------
const PRACTICE_DRIVERS_2025 = [
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

// -------------------------------------------------------
// MAPA DE TEMPO BASE POR PISTA (APROXIMADO)
// (Pode ajustar depois pista a pista com dados reais)
// -------------------------------------------------------
const TRACK_BASE_LAP_MS = {
  bahrein:       90000,
  arabia_saudita:89000,
  australia:     88000,
  japao:         91000,
  china:         95000,
  miami:         93000,
  imola:         89000,
  monaco:        73000,
  canada:        82000,
  espanha:       90000,
  austria:       66000,
  inglaterra:    88000,
  hungria:       77000,
  belgica:       112000,
  holanda:       73000,
  italia_monza:  80000,
  singapura:     112000,
  estados_unidos:101000,
  mexico:        80000,
  sao_paulo:     71000,
  las_vegas:     95000,
  catar:         93000,
  abu_dhabi:     99000
};

// -------------------------------------------------------
// ESTADO DA SESSÃO DE TREINO
// -------------------------------------------------------
const practiceState = {
  trackKey: null,
  gpName: null,
  userTeamKey: null,
  pathPoints: [],
  driverVisuals: [],
  drivers: [],
  userDriverIds: [],

  lastTimestamp: null,
  speedMultiplier: 1,

  // 30 minutos de sessão (em ms)
  totalSessionTimeMs: 30 * 60 * 1000,
  remainingSessionTimeMs: 30 * 60 * 1000,

  running: true
};

// Setup lido da oficina
const setupStatePractice = {
  wings: 5,
  suspension: 5,
  engine: 5,
  tyreStrategy: "medio_equilibrado"
};

// -------------------------------------------------------
// FORMATAÇÃO DE TEMPO
// -------------------------------------------------------
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

function formatSessionTime(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// -------------------------------------------------------
// POSIÇÃO NA PISTA
// -------------------------------------------------------
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

// -------------------------------------------------------
// INICIALIZAÇÃO
// -------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initPractice();
});

function initPractice() {
  // Params da URL
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "Treino Livre – GP da Austrália 2025";

  practiceState.trackKey = track;
  practiceState.gpName = gp;

  // Carrega identidade topo
  carregarIdentidadeTopoPractice();

  // Título e labels
  const title = document.getElementById("practice-gp-title");
  if (title) title.textContent = gp;

  const trackLabel = document.getElementById("practice-track-label");
  if (trackLabel) {
    trackLabel.textContent = `Treino na pista: ${nomeTrackPorChave(track)}`;
  }

  // Carrega setup salvo
  carregarSetupSalvoPractice();

  // Inicializa pilotos
  initDriversPractice();

  // Preenche painel de pilotos do usuário
  preencherPilotosDaEquipePractice();

  // Liga botões
  ligarBotoesPractice();

  // Carrega pista e inicia loop
  loadTrackSvgPractice(track).then(() => {
    practiceState.lastTimestamp = performance.now();
    requestAnimationFrame(loopPractice);
  });
}

// -------------------------------------------------------
// IDENTIDADE TOPO (copia da oficina, adaptada)
// -------------------------------------------------------
function carregarIdentidadeTopoPractice() {
  const team = localStorage.getItem(STORAGE_TEAM_KEY) || "ferrari";
  const mgr = localStorage.getItem(STORAGE_MANAGER_KEY) || "Manager Player";
  const flag = localStorage.getItem(STORAGE_FLAG_KEY) || "br";

  practiceState.userTeamKey = team;

  const teamLogo = document.getElementById("header-team-logo");
  const teamName = document.getElementById("header-team-name");
  const mgrName = document.getElementById("header-manager-name");
  const flagImg = document.getElementById("header-manager-flag");
  const flagName = document.getElementById("header-manager-country-name");

  if (teamLogo) {
    teamLogo.src = `assets/teams/${team}.png`;
  }

  if (teamName) {
    teamName.textContent = team.replace(/_/g, " ").toUpperCase();
  }

  if (mgrName) {
    mgrName.textContent = mgr;
  }

  if (flagImg) {
    flagImg.src = `assets/flags/${flag}.png`;
  }

  if (flagName) {
    flagName.textContent = nomePaisPractice(flag);
  }
}

function nomePaisPractice(flagCode) {
  const map = {
    br: "Brasil",
    it: "Itália",
    uk: "Reino Unido",
    us: "Estados Unidos",
    fr: "França",
    de: "Alemanha",
    es: "Espanha"
  };
  return map[flagCode] || "País";
}

function nomeTrackPorChave(trackKey) {
  const map = {
    bahrein: "Bahrein",
    arabia_saudita: "Arábia Saudita",
    australia: "Austrália",
    japao: "Japão",
    china: "China",
    miami: "Miami",
    imola: "Emília-Romanha",
    monaco: "Mônaco",
    canada: "Canadá",
    espanha: "Espanha",
    austria: "Áustria",
    inglaterra: "Inglaterra (Silverstone)",
    hungria: "Hungria",
    belgica: "Bélgica",
    holanda: "Holanda",
    italia_monza: "Itália (Monza)",
    singapura: "Singapura",
    estados_unidos: "Estados Unidos (Austin)",
    mexico: "México",
    sao_paulo: "São Paulo (Interlagos)",
    las_vegas: "Las Vegas",
    catar: "Catar",
    abu_dhabi: "Abu Dhabi"
  };
  return map[trackKey] || "Pista Desconhecida";
}

// -------------------------------------------------------
// CARREGAR SETUP SALVO
// -------------------------------------------------------
function carregarSetupSalvoPractice() {
  try {
    const raw = localStorage.getItem(STORAGE_SETUP_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (typeof saved === "object") {
      setupStatePractice.wings = saved.wings ?? setupStatePractice.wings;
      setupStatePractice.suspension = saved.suspension ?? setupStatePractice.suspension;
      setupStatePractice.engine = saved.engine ?? setupStatePractice.engine;
      setupStatePractice.tyreStrategy = saved.tyreStrategy ?? setupStatePractice.tyreStrategy;
    }
  } catch (e) {
    console.warn("Falha ao carregar setup de prática:", e);
  }
}

// -------------------------------------------------------
// INICIALIZAR PILOTOS
// -------------------------------------------------------
function initDriversPractice() {
  const baseLap = TRACK_BASE_LAP_MS[practiceState.trackKey] || 90000;

  practiceState.drivers = PRACTICE_DRIVERS_2025.map((drv) => {
    // velocidade base em função do rating e setup (bem aproximado)
    // ideia: quanto menor o baseLap, maior speedBase
    const ratingFactor = drv.rating / 100; // ~0.86 a 0.98
    const engineFactor = 0.9 + setupStatePractice.engine / 50; // entre ~0.9 e 1.1
    const wingsFactor = 0.9 + setupStatePractice.wings / 60; // influencia curva
    const suspFactor = 0.95 + setupStatePractice.suspension / 80;

    const combined = ratingFactor * engineFactor * wingsFactor * suspFactor;
    const speedBase = (1 / baseLap) * combined * 12; // fator empírico

    return {
      ...drv,
      progress: Math.random(),
      speedBase,
      speedVar: 0,
      laps: 0,
      lastLapTime: null,
      bestLapTime: null,
      lastLapTimestamp: null,
      tyreWear: 0, // 0..100
      carHealth: 100, // 0..100
      mode: "normal", // "normal" | "save" | "push" (usado só nos pilotos do usuário)
      pendingPit: false
    };
  });

  // registra ids dos pilotos da equipe do usuário
  const userDrivers = practiceState.drivers.filter(
    (d) => d.teamKey === practiceState.userTeamKey
  );
  practiceState.userDriverIds = userDrivers.slice(0, 2).map((d) => d.id);
}

// -------------------------------------------------------
// PREENCHER PAINEL DE PILOTOS DO USUÁRIO
// -------------------------------------------------------
function preencherPilotosDaEquipePractice() {
  const teamKey = practiceState.userTeamKey;
  const driversTeam = practiceState.drivers.filter(
    (d) => d.teamKey === teamKey
  ).slice(0, 2);

  const cards = [
    document.getElementById("practice-user-card-0"),
    document.getElementById("practice-user-card-1")
  ];

  driversTeam.forEach((drv, idx) => {
    const card = cards[idx];
    if (!card) return;

    const face = card.querySelector(".practice-user-face");
    const name = card.querySelector(".practice-user-name");
    const team = card.querySelector(".practice-user-team");
    const car = card.querySelector(`#practice-user-car-${idx}`);
    const tyre = card.querySelector(`#practice-user-tyre-${idx}`);

    if (face) face.src = drv.face || "";
    if (name) name.textContent = drv.name;
    if (team) team.textContent = drv.teamName;
    if (car) car.textContent = "100%";
    if (tyre) tyre.textContent = "0%";
  });
}

// -------------------------------------------------------
// CARREGAR PISTA SVG
// -------------------------------------------------------
async function loadTrackSvgPractice(trackKey) {
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
  const samples = 400;
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((pathLen * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  // normaliza para viewBox 1000x600
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  practiceState.pathPoints = pts.map((p) => ({
    x: ((p.x - minX) / width) * 1000,
    y: ((p.y - minY) / height) * 600
  }));

  // pista cinza
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute(
    "points",
    practiceState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#555");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  // linha branca
  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerPath.setAttribute(
    "points",
    practiceState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#eeeeee");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  // nodes
  practiceState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 3);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  // bandeira de chegada
  const flagPoint = practiceState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  // cria visuais dos carros
  practiceState.driverVisuals = practiceState.drivers.map((drv) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    group.appendChild(body);

    // destaque para pilotos da equipe do usuário
    if (drv.teamKey === practiceState.userTeamKey) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      group.appendChild(tri);
    }

    svg.appendChild(group);

    return { driverId: drv.id, group, body };
  });
}

// -------------------------------------------------------
// LOOP PRINCIPAL
// -------------------------------------------------------
function loopPractice(timestamp) {
  if (!practiceState.running) return;

  const dt = practiceState.lastTimestamp
    ? (timestamp - practiceState.lastTimestamp) * practiceState.speedMultiplier
    : 0;

  practiceState.lastTimestamp = timestamp;

  // Atualiza tempo de sessão
  practiceState.remainingSessionTimeMs -= dt;
  if (practiceState.remainingSessionTimeMs <= 0) {
    practiceState.remainingSessionTimeMs = 0;
    practiceState.running = false;
  }

  updatePracticeSimulation(dt);
  renderPractice();
  atualizarHUDPractice();

  if (practiceState.running) {
    requestAnimationFrame(loopPractice);
  } else {
    // sessão acabou
    encerrarSessaoPractice();
  }
}

// -------------------------------------------------------
// SIMULAÇÃO DO TREINO
// -------------------------------------------------------
function updatePracticeSimulation(dtMs) {
  if (!practiceState.pathPoints.length) return;
  if (!practiceState.drivers.length) return;

  const now = performance.now();

  practiceState.drivers.forEach((drv) => {
    // variação aleatória pequena
    const noise = (Math.random() - 0.5) * 0.00001;
    drv.speedVar = noise;

    // fator de modo (apenas pilotos da equipe do usuário usam)
    let modeFactor = 1;
    if (practiceState.userDriverIds.includes(drv.id)) {
      if (drv.mode === "save") modeFactor = 0.93;
      if (drv.mode === "push") modeFactor = 1.07;
    }

    // efeito de desgaste nos tempos
    const tyreFactor = 1 - Math.min(drv.tyreWear, 80) / 600; // até ~-0.13
    const healthFactor = 1 - (100 - drv.carHealth) / 500; // se carro danificado, fica mais lento

    const speed = drv.speedBase * modeFactor * tyreFactor * healthFactor + drv.speedVar;

    const deltaProgress = speed * (dtMs || 0);
    let newProgress = drv.progress + deltaProgress;

    let completouVolta = false;

    if (newProgress >= 1) {
      newProgress -= 1;
      completouVolta = true;
      const lapTime = drv.lastLapTimestamp
        ? now - drv.lastLapTimestamp
        : (TRACK_BASE_LAP_MS[practiceState.trackKey] || 90000);

      drv.laps += 1;
      drv.lastLapTime = lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }
      drv.lastLapTimestamp = now;
    }

    drv.progress = newProgress;
    if (drv.lastLapTimestamp == null) {
      drv.lastLapTimestamp = now;
    }

    // desgaste de pneus
    const baseWearRate = 0.00006; // taxa base
    let modeWear = 1;
    if (practiceState.userDriverIds.includes(drv.id)) {
      if (drv.mode === "save") modeWear = 0.6;
      if (drv.mode === "push") modeWear = 1.4;
    }

    const wearInc = dtMs * baseWearRate * modeWear * 0.01;
    drv.tyreWear = Math.min(100, drv.tyreWear + wearInc);

    // condição do carro cai devagar ao longo do treino
    const healthDrop = dtMs * 0.000002;
    drv.carHealth = Math.max(0, drv.carHealth - healthDrop);

    // PIT STOP simples: se pendingPit, quando completar volta reseta pneus e recupera carro
    if (practiceState.userDriverIds.includes(drv.id) && drv.pendingPit && completouVolta) {
      drv.tyreWear = 0;
      drv.carHealth = Math.min(100, drv.carHealth + 20);
      drv.pendingPit = false;
      // pequeno "tempo perdido" fictício (não mexemos no tempo, só é visual mesmo)
    }
  });
}

// -------------------------------------------------------
// RENDERIZAÇÃO
// -------------------------------------------------------
function renderPractice() {
  if (!practiceState.pathPoints.length) return;
  if (!practiceState.driverVisuals.length) return;

  const driversById = {};
  practiceState.drivers.forEach((d) => {
    driversById[d.id] = d;
  });

  practiceState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });

  // Atualiza lista de pilotos e painel do usuário
  atualizarListaPilotosPractice();
  atualizarPainelUsuarioPractice();
}

// -------------------------------------------------------
// HUD (tempo restante, volta "média")
// -------------------------------------------------------
function atualizarHUDPractice() {
  const lblTime = document.getElementById("practice-time-remaining");
  if (lblTime) {
    lblTime.textContent = formatSessionTime(practiceState.remainingSessionTimeMs);
  }

  // volta aproximada = maior número de voltas entre os pilotos
  const maxLaps = Math.max(...practiceState.drivers.map((d) => d.laps));
  const lblLap = document.getElementById("practice-lap-label");
  if (lblLap) {
    lblLap.textContent = maxLaps.toString();
  }

  if (!practiceState.running) {
    const sessionLabel = document.getElementById("practice-session-label");
    if (sessionLabel) {
      sessionLabel.textContent = "Sessão encerrada";
    }
  }
}

// -------------------------------------------------------
// LISTA DE PILOTOS (LADO DIREITO)
// -------------------------------------------------------
function atualizarListaPilotosPractice() {
  const list = document.getElementById("practice-drivers-list");
  if (!list) return;

  // ordena por melhor tempo (quem não tem tempo vai pro fim)
  const ordenados = [...practiceState.drivers].sort((a, b) => {
    const ta = a.bestLapTime ?? Infinity;
    const tb = b.bestLapTime ?? Infinity;
    if (ta !== tb) return ta - tb;
    // se ninguém tem tempo, usa rating
    return (b.rating || 0) - (a.rating || 0);
  });

  list.innerHTML = "";

  ordenados.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "practice-driver-row";

    const pos = document.createElement("div");
    pos.className = "practice-driver-pos";
    pos.textContent = `${idx + 1}º`;

    const info = document.createElement("div");
    info.className = "practice-driver-info";

    const face = document.createElement("img");
    face.className = "practice-driver-face";
    face.src = drv.face || "";
    face.alt = drv.name;

    const textDiv = document.createElement("div");
    textDiv.className = "practice-driver-text";

    const nameSpan = document.createElement("div");
    nameSpan.className = "practice-driver-name";
    nameSpan.textContent = drv.name;

    const teamSpan = document.createElement("div");
    teamSpan.className = "practice-driver-team";
    teamSpan.textContent = drv.teamName;

    textDiv.appendChild(nameSpan);
    textDiv.appendChild(teamSpan);

    info.appendChild(face);
    info.appendChild(textDiv);

    const stats = document.createElement("div");
    stats.className = "practice-driver-stats";
    stats.innerHTML = `
      <div class="practice-stat-line">
        Voltas: <span>${drv.laps}</span>
      </div>
      <div class="practice-stat-line">
        Melhor: <span>${formatLapTime(drv.bestLapTime ?? Infinity)}</span>
      </div>
      <div class="practice-stat-line">
        Pneus: <span>${Math.round(drv.tyreWear)}%</span>
      </div>
    `;

    if (drv.teamKey === practiceState.userTeamKey) {
      row.classList.add("practice-user-team-row");
    }

    row.appendChild(pos);
    row.appendChild(info);
    row.appendChild(stats);

    list.appendChild(row);
  });
}

// -------------------------------------------------------
// ATUALIZAR PAINEL DO USUÁRIO (2 CARROS)
// -------------------------------------------------------
function atualizarPainelUsuarioPractice() {
  practiceState.userDriverIds.forEach((id, idx) => {
    const drv = practiceState.drivers.find((d) => d.id === id);
    if (!drv) return;

    const carSpan = document.getElementById(`practice-user-car-${idx}`);
    const tyreSpan = document.getElementById(`practice-user-tyre-${idx}`);

    if (carSpan) carSpan.textContent = `${Math.round(drv.carHealth)}%`;
    if (tyreSpan) tyreSpan.textContent = `${Math.round(drv.tyreWear)}%`;
  });
}

// -------------------------------------------------------
// ENCERRAR SESSÃO
// -------------------------------------------------------
function encerrarSessaoPractice() {
  // aqui no futuro podemos salvar dados da prática para influenciar qualy/corrida
  console.log("Treino encerrado");
}

// -------------------------------------------------------
// BOTÕES / CONTROLES
// -------------------------------------------------------
function ligarBotoesPractice() {
  // Botão Lobby
  const btnBackLobby = document.getElementById("btn-back-lobby");
  if (btnBackLobby) {
    btnBackLobby.addEventListener("click", () => {
      window.location.href = "lobby.html";
    });
  }

  // Ir para Oficina
  const btnOficina = document.getElementById("btn-open-oficina");
  if (btnOficina) {
    btnOficina.addEventListener("click", () => {
      window.location.href = "oficina.html";
    });
  }

  // Velocidade 1x / 2x / 4x
  const speedBtns = document.querySelectorAll(".practice-speed-btn");
  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = parseFloat(btn.getAttribute("data-speed") || "1");
      practiceState.speedMultiplier = val;

      speedBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Ações dos dois pilotos (PIT, ECONOMIZAR, ATAQUE)
  const actionBtns = document.querySelectorAll(".practice-btn");
  actionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const idxStr = btn.getAttribute("data-index");
      const idx = parseInt(idxStr, 10) || 0;

      const drvId = practiceState.userDriverIds[idx];
      if (!drvId) return;

      const drv = practiceState.drivers.find((d) => d.id === drvId);
      if (!drv) return;

      if (action === "pit") {
        drv.pendingPit = true;
      } else if (action === "save") {
        drv.mode = "save";
      } else if (action === "push") {
        drv.mode = "push";
      }
    });
  });
}
