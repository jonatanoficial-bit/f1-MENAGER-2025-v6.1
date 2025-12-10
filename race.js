// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida completa usando o grid salvo pela qualy
// ==========================================================

// ---------- CONFIG GERAL ----------

// voltas por pista (ajuste se quiser deixar igual à F1 real)
const TRACK_RACE_LAPS = {
  australia: 25,
  bahrain: 25,
  jeddah: 25,
  imola: 22,
  monaco: 22,
  canada: 24,
  spain: 24,
  austria: 28,
  silverstone: 25,
  hungary: 24,
  spa: 20,
  zandvoort: 24,
  monza: 25,
  singapore: 22,
  suzuka: 24,
  qatar: 24,
  austin: 24,
  mexico: 24,
  brazil: 25,
  abu_dhabi: 24
};

// tempo médio de volta (ms) – mesmo espírito da qualy
const TRACK_BASE_LAP_TIME_MS = {
  australia: 82000,
  bahrain: 93000,
  jeddah: 90000,
  imola: 78000,
  monaco: 74000,
  canada: 79000,
  spain: 80000,
  austria: 67000,
  silverstone: 85000,
  hungary: 79000,
  spa: 117000,
  zandvoort: 76000,
  monza: 80000,
  singapore: 102000,
  suzuka: 84000,
  qatar: 89000,
  austin: 91000,
  mexico: 79000,
  brazil: 72000,
  abu_dhabi: 86000
};

// mesmos pilotos / códigos da qualy
const DRIVERS_2025 = [
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

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",      teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto",    teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", logo: "assets/logos/sauber.png" },

  { id: "magnussen", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },
  { id: "bearman",   code: "BEA", name: "Oliver Bearman",  teamKey: "haas", rating: 87, teamName: "Haas", color: "#ffffff", logo: "assets/logos/haas.png" },

  { id: "albon",    code: "ALB", name: "Alex Albon",        teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant",    teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", logo: "assets/logos/williams.png" }
];

// ---------- ESTADO DA CORRIDA ----------

const raceState = {
  trackKey: "australia",
  gpName: "",
  userTeamKey: "ferrari",

  totalLaps: 25,
  currentLap: 1,
  running: true,
  speedMultiplier: 1,
  baseLapMs: 90000,

  pathPoints: [],
  driverVisuals: [],

  drivers: [],  // objetos da corrida
  lastUpdateTime: null
};

// ---------- UTILS ----------

function formatLapTime(ms) {
  if (!isFinite(ms) || ms <= 0) return "--:--.---";
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

function findDriverMeta(id) {
  return DRIVERS_2025.find((d) => d.id === id);
}

// ---------- INIT ----------

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
  raceState.totalLaps = TRACK_RACE_LAPS[track] || 25;
  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[track] || 90000;

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gp;

  updateLapLabel();

  setupSpeedButtons();
  buildDriversFromGrid();
  preencherPainelUsuario();

  loadTrackSvg(track).then(() => {
    raceState.lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoopRace);
  });
}

// ---------- CARREGAR GRID / DRIVERS ----------

function buildDriversFromGrid() {
  let grid = null;
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.grid && Array.isArray(parsed.grid)) {
        grid = parsed.grid;
      }
    }
  } catch (e) {
    console.warn("Erro lendo grid do localStorage:", e);
  }

  let baseList;
  if (grid && grid.length === 20) {
    // usa grid salvo: position 1º -> frente
    baseList = [...grid].sort((a, b) => (a.position || 99) - (b.position || 99));
  } else {
    // fallback: ordem padrão dos pilotos
    baseList = DRIVERS_2025.map((d, idx) => ({
      id: d.id,
      name: d.name,
      teamKey: d.teamKey,
      teamName: d.teamName,
      position: idx + 1
    }));
  }

  raceState.drivers = baseList.map((g, idx) => {
    const meta = findDriverMeta(g.id) || {};
    const rating = meta.rating || 90;
    const ratingCenter = 92;
    const ratingDelta = rating - ratingCenter;
    const skillFactor = 1 - ratingDelta * 0.005; // +/- ~0.3
    const targetLapMs = raceState.baseLapMs * skillFactor;

    return {
      id: g.id,
      code: meta.code || "DRV",
      name: g.name || meta.name || "Piloto",
      teamKey: g.teamKey || meta.teamKey || "unknown",
      teamName: g.teamName || meta.teamName || "Equipe",
      color: meta.color || "#ffffff",
      logo: meta.logo || "",
      gridPosition: g.position || idx + 1,

      // estado dinâmico
      progress: 1 - g.position * 0.01, // espalha no grid
      laps: 0,
      bestLapTime: null,
      lastLapTime: null,
      lastLapTimestamp: null,

      speedBase: 1 / targetLapMs,
      mode: "normal", // normal / push / save
      tyreWear: 5, // 0–100
      wantsPit: false,
      pendingPit: false,
      inPit: false,
      pitTimer: 0,
      status: "Ritmo normal",
      dnf: false
    };
  });
}

// ---------- SVG PISTA ----------

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

  // pista
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

  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
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
    c.setAttribute("r", 3);
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

  // marcadores de carros
  raceState.driverVisuals = raceState.drivers.map((drv) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    group.appendChild(body);

    if (drv.teamKey === raceState.userTeamKey) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      group.appendChild(tri);
    }

    svg.appendChild(group);

    return { driverId: drv.id, group, body };
  });
}

// ---------- LOOP PRINCIPAL ----------

function gameLoopRace(timestamp) {
  if (raceState.lastUpdateTime == null) {
    raceState.lastUpdateTime = timestamp;
  }

  const dt = (timestamp - raceState.lastUpdateTime) * raceState.speedMultiplier;
  raceState.lastUpdateTime = timestamp;

  if (raceState.running) {
    updateRaceSimulation(dt);
    renderRace();
  }

  requestAnimationFrame(gameLoopRace);
}

// ---------- SIMULAÇÃO DA CORRIDA ----------

function updateRaceSimulation(dtMs) {
  if (!raceState.pathPoints.length) return;

  const now = performance.now();

  raceState.drivers.forEach((drv) => {
    if (drv.dnf) return;

    // se está em pit, conta tempo parado
    if (drv.inPit) {
      drv.pitTimer -= dtMs;
      if (drv.pitTimer <= 0) {
        drv.inPit = false;
        drv.pendingPit = false;
        drv.status = "Saiu do pit";
      }
      return;
    }

    // modo influencia desgaste e "velocidade"
    let modeFactor = 1;
    let wearFactor = 1;

    if (drv.mode === "push") {
      modeFactor = 1.04;
      wearFactor = 1.8;
      drv.status = "Ataque";
    } else if (drv.mode === "save") {
      modeFactor = 0.96;
      wearFactor = 0.5;
      drv.status = "Economizando";
    } else {
      drv.status = "Ritmo normal";
    }

    // desgaste de pneus
    const wearPerMsBase = 0.00002; // ajuste fino depois
    drv.tyreWear += wearPerMsBase * wearFactor * dtMs;
    if (drv.tyreWear > 100) drv.tyreWear = 100;

    // aviso de pit a partir de 80%
    if (!drv.wantsPit && drv.tyreWear >= 80 && drv.tyreWear < 100) {
      drv.wantsPit = true;
      // só texto – quem decide é o usuário/IA
      if (drv.teamKey === raceState.userTeamKey) {
        drv.status = "Pediu PIT!";
      }
    }

    // se pneu estourou (100%), acidente / DNF
    if (drv.tyreWear >= 100) {
      drv.dnf = true;
      drv.status = "Abandono (pneu estourou)";
      return;
    }

    // ruído de performance
    const noiseFactor = 1 + (Math.random() - 0.5) * 0.04;
    const speed = drv.speedBase * modeFactor * noiseFactor;

    const deltaProgress = speed * (dtMs || 0);
    let newProgress = drv.progress + deltaProgress;

    if (newProgress >= 1) {
      newProgress -= 1;

      // completou volta
      const lapTime = drv.lastLapTimestamp
        ? now - drv.lastLapTimestamp
        : raceState.baseLapMs * (0.95 + Math.random() * 0.1);

      drv.laps += 1;
      drv.lastLapTime = lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }
      drv.lastLapTimestamp = now;

      // aplica pit se estava pendente
      if (drv.pendingPit || (drv.teamKey !== raceState.userTeamKey && drv.tyreWear >= 85)) {
        // entra no pit
        drv.inPit = true;
        drv.pitTimer = 8000 + Math.random() * 4000; // 8–12s parado
        drv.tyreWear = 5;
        drv.wantsPit = false;
        drv.pendingPit = false;
        drv.status = "No PIT";
      }
    }

    drv.progress = newProgress;
    if (drv.lastLapTimestamp == null) {
      drv.lastLapTimestamp = now;
    }
  });

  // atualiza volta líder
  const maxLaps = Math.max(...raceState.drivers.map((d) => d.laps));
  if (maxLaps + 1 > raceState.currentLap) {
    raceState.currentLap = Math.min(maxLaps + 1, raceState.totalLaps);
    updateLapLabel();
  }

  // terminou corrida?
  if (maxLaps >= raceState.totalLaps) {
    raceState.running = false;
    finalizarCorrida();
  }

  atualizarListaPilotosCorrida();
}

// ---------- RENDER ----------

function renderRace() {
  if (!raceState.pathPoints.length) return;
  if (!raceState.driverVisuals.length) return;

  const driversById = {};
  raceState.drivers.forEach((d) => {
    driversById[d.id] = d;
  });

  raceState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv || drv.dnf) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ---------- UI LADO DIREITO ----------

function updateLapLabel() {
  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    lapLabel.textContent = `Volta ${raceState.currentLap} / ${raceState.totalLaps}`;
  }
}

function atualizarListaPilotosCorrida() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const vivos = [...raceState.drivers];

  // ordena por voltas, depois progresso (quem está mais à frente)
  vivos.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return (b.gridPosition || 0) - (a.gridPosition || 0);
  });

  list.innerHTML = "";

  vivos.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    const posSpan = document.createElement("div");
    posSpan.className = "driver-pos";
    posSpan.textContent = drv.dnf ? "DNF" : `${idx + 1}º`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "driver-info";

    const imgFace = document.createElement("img");
    imgFace.className = "driver-face";
    imgFace.src = `assets/faces/${drv.code || "DRV"}.png`;
    imgFace.alt = drv.name;
    imgFace.onerror = () => {
      imgFace.onerror = null;
      imgFace.src = "assets/faces/default.png";
    };

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
      <div class="stat-line">Melhor <span>${formatLapTime(drv.bestLapTime || 0)}</span></div>
      <div class="stat-line">Última <span>${formatLapTime(drv.lastLapTime || 0)}</span></div>
      <div class="stat-line">Pneus <span>${drv.tyreWear.toFixed(0)}%</span></div>
      <div class="stat-line">Status <span>${drv.status}</span></div>
    `;

    row.appendChild(posSpan);
    row.appendChild(infoDiv);
    row.appendChild(statsDiv);

    if (drv.teamKey === raceState.userTeamKey) {
      row.classList.add("user-team-row");
    }

    list.appendChild(row);
  });

  // atualiza também os cards dos 2 pilotos da equipe
  atualizarPainelUsuarioComEstado();
}

// ---------- PAINEL DA SUA EQUIPE ----------

function preencherPainelUsuario() {
  const teamKey = raceState.userTeamKey;
  const driversTeam = raceState.drivers.filter((d) => d.teamKey === teamKey).slice(0, 2);

  const cards = [
    { el: document.getElementById("user-driver-card-0"), drv: driversTeam[0] },
    { el: document.getElementById("user-driver-card-1"), drv: driversTeam[1] }
  ];

  cards.forEach((item, idx) => {
    const card = item.el;
    const drv = item.drv;
    if (!card || !drv) return;

    card.dataset.driverId = drv.id;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const teamName = card.querySelector(".user-team");

    if (face) {
      face.src = `assets/faces/${drv.code}.png`;
      face.onerror = () => {
        face.onerror = null;
        face.src = "assets/faces/default.png";
      };
    }
    if (name) name.textContent = drv.name;
    if (teamName) teamName.textContent = drv.teamName;
  });

  // listeners dos botões
  document.querySelectorAll(".user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const index = Number(btn.dataset.index || "0");
      onUserAction(index, action);
    });
  });
}

function atualizarPainelUsuarioComEstado() {
  const cards = [
    document.getElementById("user-driver-card-0"),
    document.getElementById("user-driver-card-1")
  ];

  cards.forEach((card) => {
    if (!card) return;
    const driverId = card.dataset.driverId;
    const drv = raceState.drivers.find((d) => d.id === driverId);
    if (!drv) return;

    const carSpan = card.querySelector("#user-car-0, #user-car-1");
    const tyreSpan = card.querySelector("#user-tyre-0, #user-tyre-1");

    // como temos dois ids distintos, pegamos pelo atributo correto
    // (o card 0 contém spans 0, o card 1 contém spans 1)
    const carSpanReal = card.querySelector(".user-status-line span[id^='user-car']");
    const tyreSpanReal = card.querySelector(".user-status-line span[id^='user-tyre']");

    if (carSpanReal) carSpanReal.textContent = "100%"; // por enquanto carro 100%
    if (tyreSpanReal) tyreSpanReal.textContent = `${drv.tyreWear.toFixed(0)}%`;
  });
}

function onUserAction(index, action) {
  const cards = [
    document.getElementById("user-driver-card-0"),
    document.getElementById("user-driver-card-1")
  ];
  const card = cards[index];
  if (!card) return;

  const driverId = card.dataset.driverId;
  const drv = raceState.drivers.find((d) => d.id === driverId);
  if (!drv || drv.dnf) return;

  if (action === "pit") {
    drv.pendingPit = true;
    drv.wantsPit = false;
    drv.status = "PIT na próxima volta";
  } else if (action === "push") {
    drv.mode = "push";
  } else if (action === "save") {
    drv.mode = "save";
  }
}

// ---------- CONTROLE DE VELOCIDADE ----------

function setupSpeedButtons() {
  const buttons = document.querySelectorAll(".speed-btn");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const speed = Number(btn.dataset.speed || "1") || 1;
      raceState.speedMultiplier = speed;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ---------- FINAL DA CORRIDA / PÓDIO ----------

function finalizarCorrida() {
  const ordem = [...raceState.drivers].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (b.laps !== a.laps) return b.laps - a.laps;
    return (b.progress || 0) - (a.progress || 0);
  });

  const podium = ordem.slice(0, 3);
  mostrarPodio(podium, ordem);
}

function mostrarPodio(podium, fullResult) {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const slots = [
    { pos: 1, faceId: "podium1-face", nameId: "podium1-name", teamId: "podium1-team" },
    { pos: 2, faceId: "podium2-face", nameId: "podium2-name", teamId: "podium2-team" },
    { pos: 3, faceId: "podium3-face", nameId: "podium3-name", teamId: "podium3-team" }
  ];

  slots.forEach((slot, idx) => {
    const drv = podium[idx];
    const faceEl = document.getElementById(slot.faceId);
    const nameEl = document.getElementById(slot.nameId);
    const teamEl = document.getElementById(slot.teamId);

    if (drv && faceEl && nameEl && teamEl) {
      faceEl.src = `assets/faces/${drv.code}.png`;
      faceEl.onerror = () => {
        faceEl.onerror = null;
        faceEl.src = "assets/faces/default.png";
      };
      nameEl.textContent = drv.name;
      teamEl.textContent = drv.teamName;
    }
  });

  // se quiser, pode preencher um resumo completo aqui dentro
  modal.classList.remove("hidden");
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (modal) modal.classList.add("hidden");
  // volta para o calendário
  window.history.back();
}

window.closePodium = closePodium;
