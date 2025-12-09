// ==========================================================
// F1 MANAGER 2025 – QUALIFYING.JS (Q1 / Q2 / Q3)
// ==========================================================

// ------------------------------
// CONFIG DAS FASES
// ------------------------------
const QUALY_PHASES = [
  { id: "Q1", totalLaps: 6, eliminated: 5 }, // 20 → 15
  { id: "Q2", totalLaps: 5, eliminated: 5 }, // 15 → 10
  { id: "Q3", totalLaps: 4, eliminated: 0 }  // 10 → grid final
];

// ------------------------------
// TEMPO MÉDIO DE VOLTA POR PISTA (ms)
// valores aproximados, baseados em poles 2023/2024
// ------------------------------
const TRACK_BASE_LAP_MS = {
  australia: 82000,
  bahrain: 89000,
  jeddah: 88000,
  china: 92000,
  imola: 84000,
  monaco: 72000,
  canada: 74000,
  spain: 78000,
  austria: 65000,
  silverstone: 87000,
  hungary: 78000,
  spa: 115000,
  zandvoort: 73000,
  monza: 74000,
  singapore: 93000,
  kota: 98000,
  mexico: 78000,
  brazil: 70000,
  lasvegas: 93000,
  qatar: 84000,
  abudhabi: 98000
};

// ------------------------------
// LISTA DE PILOTOS 2025
// (usa códigos de 3 letras em MAIÚSCULO para as faces)
// ------------------------------
const DRIVERS_2025 = [
  // Red Bull
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

  // Ferrari
  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

  // Mercedes
  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

  // McLaren
  { id: "norris",  code: "NOR", name: "Lando Norris",  teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },

  // Aston Martin
  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", logo: "assets/logos/aston.png" },
  { id: "stroll", code: "STR", name: "Lance Stroll",    teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", logo: "assets/logos/aston.png" },

  // Alpine
  { id: "gasly", code: "GAS", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },

  // Racing Bulls
  { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },
  { id: "lawson",  code: "LAW", name: "Liam Lawson",  teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },

  // Sauber / Audi
  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",   teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", logo: "assets/logos/sauber.png" },

  // Haas
  { id: "magnussen", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },
  { id: "bearman",   code: "BEA", name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },

  // Williams
  { id: "albon",    code: "ALB", name: "Alex Albon",      teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant",  teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", logo: "assets/logos/williams.png" }
];

// helper para montar o caminho da face
function facePathFromCode(code) {
  return `assets/faces/${code}.png`;
}

// ------------------------------
// ESTADO DA QUALIFICAÇÃO
// ------------------------------
const qualyState = {
  phaseIndex: 0,
  currentLap: 1,
  currentDrivers: [],
  finalGrid: null,
  nextPhaseDrivers: null,
  userTeamKey: null,
  trackName: null,
  gpName: null,
  modalMode: null,
  pathPoints: [],
  driverVisuals: [],
  lastUpdateTime: null,
  running: true,
  speedMultiplier: 1
};

// ------------------------------
// FUNÇÕES UTILS
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
  const pts = qualyState.pathPoints;
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

function getBaseLapForTrack(trackKey) {
  return TRACK_BASE_LAP_MS[trackKey] ?? 90000; // default 1:30
}

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initQualifying();
});

function initQualifying() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "GP 2025";
  const userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  qualyState.trackName = track;
  qualyState.gpName = gp;
  qualyState.userTeamKey = userTeam;

  const titleEl = document.getElementById("qualy-title-gp");
  if (titleEl) titleEl.textContent = gp;

  // botões de velocidade
  const speedBtns = document.querySelectorAll(".speed-btn");
  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = Number(btn.dataset.speed) || 1;
      setQualySpeed(mult);
      speedBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  atualizarHeaderFaseQualy();

  const trackBase = getBaseLapForTrack(track);
  qualyState.currentDrivers = initDriversForPhase(DRIVERS_2025, trackBase);

  preencherPilotosDaEquipe();

  loadTrackSvg(track).then(() => {
    buildDriverVisuals(); // cria carros da Q1
    qualyState.lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoopQualy);
  });
}

// reinicia os dados de pilotos para uma fase (Q1, Q2, Q3)
function initDriversForPhase(sourceDrivers, trackBaseLapMs) {
  const now = performance.now();
  return sourceDrivers.map((drv, idx) => {
    const skillFactor = 1 - (drv.rating - 90) * 0.004; // rating alto = volta mais rápida
    const baseLapMs = (drv.baseLapMs ?? trackBaseLapMs) * skillFactor;
    const firstLapTarget =
      baseLapMs * (1 + (Math.random() - 0.5) * 0.02); // ±1%

    return {
      ...drv,
      baseLapMs,
      face: facePathFromCode(drv.code),
      index: idx,
      progress: Math.random(),
      laps: 0,
      bestLapTime: null,
      lastLapTime: null,
      lastLapTimestamp: now,
      currentLapTargetMs: firstLapTarget
    };
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

  qualyState.pathPoints = pts.map((p) => ({
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
    qualyState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
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
    qualyState.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#aaaaaa");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  // pontinhos brancos
  qualyState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 3);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  // bandeira de chegada
  const flagPoint = qualyState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);
}

// cria / recria os "carros" no SVG com base em currentDrivers
function buildDriverVisuals() {
  const svg = document.getElementById("track-svg");
  if (!svg || !qualyState.pathPoints.length) return;

  // remove grupos antigos
  if (Array.isArray(qualyState.driverVisuals)) {
    qualyState.driverVisuals.forEach((vis) => {
      if (vis.group && vis.group.parentNode) {
        vis.group.parentNode.removeChild(vis.group);
      }
    });
  }
  qualyState.driverVisuals = [];

  // cria novos grupos
  qualyState.driverVisuals = qualyState.currentDrivers.map((drv) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    group.appendChild(body);

    // triângulo para destacar equipe do usuário
    if (drv.teamKey === qualyState.userTeamKey) {
      const tri = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
      );
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      group.appendChild(tri);
    }

    svg.appendChild(group);

    return { driverId: drv.id, group, body };
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function gameLoopQualy(timestamp) {
  if (!qualyState.running) return;

  const dt =
    qualyState.lastUpdateTime != null
      ? timestamp - qualyState.lastUpdateTime
      : 0;
  qualyState.lastUpdateTime = timestamp;

  updateQualySimulation(dt);
  renderQualy();

  requestAnimationFrame(gameLoopQualy);
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function updateQualySimulation(dtMs) {
  if (!qualyState.pathPoints.length) return;

  const fase = QUALY_PHASES[qualyState.phaseIndex];
  if (!fase) return;

  const dtSim = (dtMs || 0) * qualyState.speedMultiplier;
  const now = performance.now();

  qualyState.currentDrivers.forEach((drv) => {
    if (!drv.currentLapTargetMs || drv.currentLapTargetMs <= 0) {
      drv.currentLapTargetMs = drv.baseLapMs;
    }

    const deltaProgress = dtSim / drv.currentLapTargetMs;
    let progress = drv.progress + deltaProgress;

    if (progress >= 1) {
      progress -= 1;
      const lapTime = now - drv.lastLapTimestamp;

      drv.laps += 1;
      drv.lastLapTime = lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }
      drv.lastLapTimestamp = now;

      // novo alvo de volta com pequena variação
      drv.currentLapTargetMs =
        drv.baseLapMs * (1 + (Math.random() - 0.5) * 0.02);
    }

    drv.progress = progress;
  });

  // líder define a volta atual
  const maxLaps = Math.max(...qualyState.currentDrivers.map((d) => d.laps));
  const faseAtual = QUALY_PHASES[qualyState.phaseIndex];

  if (maxLaps + 1 > qualyState.currentLap) {
    qualyState.currentLap = Math.min(maxLaps + 1, faseAtual.totalLaps);
    atualizarHeaderFaseQualy();
  }

  // fim da fase
  if (maxLaps >= faseAtual.totalLaps) {
    qualyState.running = false;
    finalizarFaseQualy();
  }

  atualizarListaPilotosQualy();
}

// ------------------------------
// RENDER
// ------------------------------
function renderQualy() {
  if (!qualyState.pathPoints.length) return;
  if (!qualyState.driverVisuals.length) return;

  const driversById = {};
  qualyState.currentDrivers.forEach((d) => {
    driversById[d.id] = d;
  });

  qualyState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ------------------------------
// UI LISTA / CARDS
// ------------------------------
function atualizarHeaderFaseQualy() {
  const fase = QUALY_PHASES[qualyState.phaseIndex];
  const faseLabel = document.getElementById("qualy-phase-label");
  const lapLabel = document.getElementById("qualy-lap-label");
  if (faseLabel) {
    faseLabel.textContent = `${fase.id} · ELIMINADOS AO FINAL: ${fase.eliminated} PILOTOS`;
  }
  if (lapLabel) {
    lapLabel.textContent = `Volta ${qualyState.currentLap} / ${fase.totalLaps}`;
  }
}

function atualizarListaPilotosQualy() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const ordenados = [...qualyState.currentDrivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    const ta = a.bestLapTime ?? Infinity;
    const tb = b.bestLapTime ?? Infinity;
    if (ta !== tb) return ta - tb;
    return (b.rating || 0) - (a.rating || 0);
  });

  list.innerHTML = "";

  ordenados.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    const posSpan = document.createElement("div");
    posSpan.className = "driver-pos";
    posSpan.textContent = `${idx + 1}º`;

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
      <div class="stat-line">Melhor <span>${formatLapTime(
        drv.bestLapTime ?? Infinity
      )}</span></div>
      <div class="stat-line">Última <span>${formatLapTime(
        drv.lastLapTime ?? Infinity
      )}</span></div>
    `;

    row.appendChild(posSpan);
    row.appendChild(infoDiv);
    row.appendChild(statsDiv);

    if (drv.teamKey === qualyState.userTeamKey) {
      row.classList.add("user-team-row");
    }

    list.appendChild(row);
  });
}

function preencherPilotosDaEquipe() {
  const team = qualyState.userTeamKey;
  const driversTeam = DRIVERS_2025.filter((d) => d.teamKey === team).slice(0, 2);

  const cards = [
    document.getElementById("user-driver-1"),
    document.getElementById("user-driver-2")
  ];

  driversTeam.forEach((drv, idx) => {
    const card = cards[idx];
    if (!card) return;
    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const teamName = card.querySelector(".user-team");
    const logo = card.querySelector(".user-logo");

    if (face) face.src = facePathFromCode(drv.code);
    if (name) name.textContent = drv.name;
    if (teamName) teamName.textContent = drv.teamName;
    if (logo) logo.src = drv.logo || "";
  });
}

// ------------------------------
// FINAL DAS FASES
// ------------------------------
function finalizarFaseQualy() {
  const fase = QUALY_PHASES[qualyState.phaseIndex];
  if (!fase) return;

  const gridOrdenado = [...qualyState.currentDrivers].sort((a, b) => {
    const ta = a.bestLapTime ?? Infinity;
    const tb = b.bestLapTime ?? Infinity;
    return ta - tb;
  });

  gridOrdenado.forEach((drv, idx) => {
    drv.position = idx + 1;
  });

  const ehUltimaFase = qualyState.phaseIndex === QUALY_PHASES.length - 1;

  if (!ehUltimaFase) {
    const qtdEliminados = fase.eliminated || 0;
    const classificados = gridOrdenado.slice(
      0,
      gridOrdenado.length - qtdEliminados
    );
    const eliminados = gridOrdenado.slice(
      gridOrdenado.length - qtdEliminados
    );

    qualyState.nextPhaseDrivers = classificados;
    qualyState.modalMode = "phase";

    mostrarModalQualyFase(fase.id, classificados, eliminados);
  } else {
    qualyState.finalGrid = gridOrdenado;
    salvarGridFinalQualy();
    qualyState.modalMode = "final";
    mostrarModalQualyFinal(gridOrdenado);
  }
}

function mostrarModalQualyFase(idFase, classificados, eliminados) {
  const modal = document.getElementById("qualy-modal");
  const title = document.getElementById("qualy-modal-title");
  const body = document.getElementById("qualy-modal-body");
  if (!modal || !title || !body) return;

  title.textContent = `${idFase} encerrada`;
  let html = `<p><strong>Classificados para a próxima fase:</strong></p><ol>`;
  classificados.forEach((drv) => {
    html += `<li>${drv.position}º - ${drv.name} (${drv.teamName}) — ${formatLapTime(
      drv.bestLapTime ?? Infinity
    )}</li>`;
  });
  html += `</ol><p><strong>Eliminados:</strong></p><ol>`;
  eliminados.forEach((drv) => {
    html += `<li>${drv.position}º - ${drv.name} (${drv.teamName}) — ${formatLapTime(
      drv.bestLapTime ?? Infinity
    )}</li>`;
  });
  html += `</ol>`;

  body.innerHTML = html;
  modal.classList.remove("hidden");
}

function mostrarModalQualyFinal(grid) {
  const modal = document.getElementById("qualy-modal");
  const title = document.getElementById("qualy-modal-title");
  const body = document.getElementById("qualy-modal-body");
  if (!modal || !title || !body) return;

  title.textContent = `Classificação final – Grid de largada`;
  let html = `<p>Este será o grid de largada para a corrida:</p><ol>`;
  grid.forEach((drv) => {
    html += `<li>${drv.position}º - ${drv.name} (${drv.teamName}) — Melhor volta: ${formatLapTime(
      drv.bestLapTime ?? Infinity
    )}</li>`;
  });
  html += `</ol><p>Clique em <strong>OK</strong> para avançar para a corrida.</p>`;

  body.innerHTML = html;
  modal.classList.remove("hidden");
}

// ------------------------------
// BOTÃO OK DO MODAL
// ------------------------------
function onQualyModalAction() {
  const modal = document.getElementById("qualy-modal");
  if (!modal) return;

  if (qualyState.modalMode === "phase") {
    modal.classList.add("hidden");
    qualyState.phaseIndex++;
    qualyState.currentLap = 1;

    if (Array.isArray(qualyState.nextPhaseDrivers)) {
      const trackBase = getBaseLapForTrack(qualyState.trackName);
      qualyState.currentDrivers = initDriversForPhase(
        qualyState.nextPhaseDrivers,
        trackBase
      );
    }

    qualyState.nextPhaseDrivers = null;
    qualyState.running = true;
    qualyState.lastUpdateTime = performance.now();
    atualizarHeaderFaseQualy();
    buildDriverVisuals(); // recria somente os carros dos classificados
  } else if (qualyState.modalMode === "final") {
    modal.classList.add("hidden");

    const params = new URLSearchParams(window.location.search);
    const track = params.get("track") || qualyState.trackName || "australia";
    const gp = params.get("gp") || qualyState.gpName || "GP 2025";
    const userTeam =
      qualyState.userTeamKey ||
      params.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      "ferrari";

    const nextParams = new URLSearchParams();
    nextParams.set("track", track);
    nextParams.set("gp", gp);
    nextParams.set("userTeam", userTeam);

    window.location.href = "race.html?" + nextParams.toString();
  }
}

// ------------------------------
// SALVAR GRID NO LOCALSTORAGE
// ------------------------------
function salvarGridFinalQualy() {
  if (!qualyState.finalGrid || !Array.isArray(qualyState.finalGrid)) return;

  const payload = {
    track: qualyState.trackName,
    gp: qualyState.gpName,
    userTeamKey: qualyState.userTeamKey,
    timestamp: Date.now(),
    grid: qualyState.finalGrid.map((drv) => ({
      id: drv.id,
      name: drv.name,
      teamKey: drv.teamKey,
      teamName: drv.teamName,
      position: drv.position,
      bestLapTime: drv.bestLapTime
    }))
  };

  try {
    localStorage.setItem("f1m2025_last_qualy", JSON.stringify(payload));
  } catch (e) {
    console.warn("Não foi possível salvar grid final da qualy:", e);
  }
}

// ------------------------------
// CONTROLE DE VELOCIDADE
// ------------------------------
function setQualySpeed(mult) {
  qualyState.speedMultiplier = mult;
}

// expõe funções globais
window.setQualySpeed = setQualySpeed;
window.onQualyModalAction = onQualyModalAction;
