// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida completa usando o grid salvo da qualy
// ==========================================================

// Mesma lista de pilotos da qualy (para achar faces, cores, etc.)
const RACE_DRIVERS_2025 = [
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
  lapsTotal: 25,
  currentLap: 1,
  drivers: [],
  pathPoints: [],
  driverVisuals: [],
  running: true,
  speedMultiplier: 1,
  lastUpdateTime: null,
  userTeamKey: null,
  userDriverIndexes: [],
  trackName: null,
  gpName: null,
  finished: false
};

// ------------------------------
// UTILS
// ------------------------------
function formatRaceTime(ms) {
  if (!isFinite(ms)) return "--:--.---";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds - minutes * 60 - seconds) * 1000);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function getRacePosOnTrack(progress) {
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

  raceState.trackName = track;
  raceState.gpName = gp;
  raceState.userTeamKey = userTeam;

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gp;

  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    lapLabel.textContent = `Volta 1 / ${raceState.lapsTotal}`;
  }

  carregarGridDaQualy();
  preencherPainelUsuario();
  configurarBotoesVelocidade();
  configurarBotoesUsuario();

  carregarTrackSvg(track).then(() => {
    raceState.lastUpdateTime = performance.now();
    requestAnimationFrame(loopRace);
  });
}

// ------------------------------
// GRID A PARTIR DA QUALY
// ------------------------------
function carregarGridDaQualy() {
  let payload = null;
  try {
    const stored = localStorage.getItem("f1m2025_last_qualy");
    if (stored) payload = JSON.parse(stored);
  } catch (e) {
    console.warn("Não foi possível ler grid da qualy:", e);
  }

  let baseGrid;
  if (payload && Array.isArray(payload.grid) && payload.grid.length) {
    baseGrid = payload.grid.slice().sort((a, b) => a.position - b.position);
  } else {
    // fallback: usa top 10 do array padrão
    baseGrid = RACE_DRIVERS_2025.slice(0, 10).map((drv, idx) => ({
      id: drv.id,
      name: drv.name,
      teamKey: drv.teamKey,
      teamName: drv.teamName,
      position: idx + 1
    }));
  }

  raceState.drivers = baseGrid.map((slot, idx) => {
    const base = RACE_DRIVERS_2025.find((d) => d.id === slot.id) || {};
    const rating = base.rating || 85;
    return {
      id: slot.id,
      name: slot.name,
      teamKey: slot.teamKey,
      teamName: slot.teamName,
      gridPos: slot.position,
      color: base.color || "#ffffff",
      face: base.face || "",
      logo: base.logo || "",
      rating,

      progress: 0.02 * idx, // espaçamento na linha
      laps: 0,
      lastLapTime: null,
      bestLapTime: null,
      totalTime: 0,
      lastLapTimestamp: performance.now(),

      tyreWear: 0,       // 0–1
      pitStops: 0,
      mandatoryPitDone: false,
      wantsPit: false,
      mode: "normal",   // "normal" | "push" | "save"
      statusText: "Ritmo normal",
      finished: false
    };
  });

  raceState.userDriverIndexes = [];
  raceState.drivers.forEach((drv, idx) => {
    if (drv.teamKey === raceState.userTeamKey) {
      raceState.userDriverIndexes.push(idx);
    }
  });
}

// ------------------------------
// SVG DA PISTA
// ------------------------------
async function carregarTrackSvg(trackKey) {
  const container = document.getElementById("track-container");
  if (!container) return;

  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "race-track-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  let text;
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG da pista (corrida):", e);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("Nenhum <path> no SVG da pista (corrida).");
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
  innerPath.setAttribute("stroke", "#cccccc");
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

// ------------------------------
// LOOP DA CORRIDA
// ------------------------------
function loopRace(timestamp) {
  if (!raceState.running) return;

  const dt =
    raceState.lastUpdateTime != null
      ? (timestamp - raceState.lastUpdateTime) * raceState.speedMultiplier
      : 0;
  raceState.lastUpdateTime = timestamp;

  atualizarSimulacaoCorrida(dt);
  renderRace();

  requestAnimationFrame(loopRace);
}

// ------------------------------
// SIMULAÇÃO DA CORRIDA
// ------------------------------
function atualizarSimulacaoCorrida(dtMs) {
  if (!raceState.pathPoints.length || raceState.finished) return;

  const now = performance.now();

  raceState.drivers.forEach((drv) => {
    if (drv.finished) return;

    // base de velocidade mais baixa (corrida)
    let speedBase = 0.00002 + drv.rating / 800000;

    // modo de pilotagem altera velocidade e desgaste
    let wearRate = 0.0000012; // desgaste por ms (ajustado)
    if (drv.mode === "push") {
      speedBase *= 1.06;
      wearRate *= 1.8;
      drv.statusText = "Ataque";
    } else if (drv.mode === "save") {
      speedBase *= 0.94;
      wearRate *= 0.5;
      drv.statusText = "Economizando";
    } else {
      drv.statusText = "Ritmo normal";
    }

    // aleatório leve
    const noise = (Math.random() - 0.5) * 0.00001;
    const speed = speedBase + noise;

    const deltaProgress = speed * (dtMs || 0);
    let newProgress = drv.progress + deltaProgress;

    // desgaste de pneus
    drv.tyreWear = Math.min(1, drv.tyreWear + wearRate * (dtMs || 0));

    // aviso de pit a partir de ~80%
    if (drv.tyreWear >= 0.8 && !drv.wantsPit) {
      drv.wantsPit = true;
    }

    // cruzou a linha
    if (newProgress >= 1) {
      newProgress -= 1;

      const lapTime = drv.lastLapTimestamp
        ? now - drv.lastLapTimestamp
        : 90000 + Math.random() * 5000;

      drv.laps += 1;
      drv.lastLapTime = lapTime;
      drv.totalTime += lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }
      drv.lastLapTimestamp = now;

      // PIT STOP se estiver marcado ou se passou de 95% de desgaste sem pit obrigatório
      const precisaPitObrigatorio = !drv.mandatoryPitDone && drv.laps > 8;
      const pneusCriticos = drv.tyreWear >= 0.95;

      if (drv.wantsPit || (precisaPitObrigatorio && pneusCriticos)) {
        // penalidade fixa de +20s
        const penalty = 20000;
        drv.totalTime += penalty;
        drv.pitStops += 1;
        drv.mandatoryPitDone = true;
        drv.tyreWear = 0;
        drv.wantsPit = false;
        drv.statusText = "PIT STOP";
      }

      if (drv.laps >= raceState.lapsTotal) {
        drv.finished = true;
        newProgress = 0.999; // fica quase na linha
      }
    }

    drv.progress = newProgress;
  });

  // volta atual = número máximo de voltas do líder (limitada)
  const maxLaps = Math.max(...raceState.drivers.map((d) => d.laps));
  raceState.currentLap = Math.min(maxLaps + 1, raceState.lapsTotal);

  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    lapLabel.textContent = `Volta ${raceState.currentLap} / ${raceState.lapsTotal}`;
  }

  // todos terminaram?
  const allFinished = raceState.drivers.every((d) => d.finished);
  if (allFinished && !raceState.finished) {
    raceState.finished = true;
    raceState.running = false;
    mostrarResultadoFinal();
  }

  atualizarListaPilotosRace();
  atualizarPainelUsuario();
}

// ------------------------------
// RENDER DA CORRIDA
// ------------------------------
function renderRace() {
  if (!raceState.pathPoints.length || !raceState.driverVisuals.length) return;

  const driversById = {};
  raceState.drivers.forEach((d) => {
    driversById[d.id] = d;
  });

  raceState.driverVisuals.forEach((vis) => {
    const drv = driversById[vis.driverId];
    if (!drv) return;
    const pos = getRacePosOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ------------------------------
// LISTA DA DIREITA
// ------------------------------
function atualizarListaPilotosRace() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  const ordenados = [...raceState.drivers].sort((a, b) => {
    // quem terminou antes: tempo total menor
    if (a.finished && b.finished) {
      return a.totalTime - b.totalTime;
    }
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;

    // em corrida: mais voltas primeiro, depois progress
    if (b.laps !== a.laps) return b.laps - a.laps;
    return b.progress - a.progress;
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
    const tyrePct = Math.round(drv.tyreWear * 100);

    statsDiv.innerHTML = `
      <div class="stat-line">Voltas <span>${drv.laps}/${raceState.lapsTotal}</span></div>
      <div class="stat-line">Tempo <span>${formatRaceTime(drv.totalTime)}</span></div>
      <div class="stat-line">Melhor <span>${formatRaceTime(drv.bestLapTime ?? Infinity)}</span></div>
      <div class="stat-line">Pneus <span>${tyrePct}%</span></div>
      <div class="stat-line">Pits <span>${drv.pitStops}</span></div>
    `;

    row.appendChild(posSpan);
    row.appendChild(infoDiv);
    row.appendChild(statsDiv);

    if (drv.teamKey === raceState.userTeamKey) {
      row.classList.add("user-team-row");
    }

    list.appendChild(row);
  });
}

// ------------------------------
// PAINEL DO USUÁRIO (2 pilotos)
// ------------------------------
function preencherPainelUsuario() {
  const idxs = raceState.userDriverIndexes;
  const cardIds = [0, 1];

  cardIds.forEach((cardIndex, pos) => {
    const card = document.getElementById(`user-driver-card-${cardIndex}`);
    if (!card) return;
    const faceEl = document.getElementById(`user-face-${cardIndex}`);
    const nameEl = document.getElementById(`user-name-${cardIndex}`);
    const teamEl = document.getElementById(`user-team-${cardIndex}`);
    const carEl = document.getElementById(`user-car-${cardIndex}`);
    const tyreEl = document.getElementById(`user-tyre-${cardIndex}`);

    const drvIndex = idxs[pos];
    if (drvIndex == null) {
      if (faceEl) faceEl.src = "";
      if (nameEl) nameEl.textContent = "---";
      if (teamEl) teamEl.textContent = "---";
      if (carEl) carEl.textContent = "100%";
      if (tyreEl) tyreEl.textContent = "0%";
      return;
    }

    const drv = raceState.drivers[drvIndex];
    if (faceEl) faceEl.src = drv.face || "";
    if (nameEl) nameEl.textContent = drv.name;
    if (teamEl) teamEl.textContent = drv.teamName;
    if (carEl) carEl.textContent = "100%";
    if (tyreEl) tyreEl.textContent = `${Math.round(drv.tyreWear * 100)}%`;
  });
}

function atualizarPainelUsuario() {
  const idxs = raceState.userDriverIndexes;
  [0, 1].forEach((cardIndex, pos) => {
    const tyreEl = document.getElementById(`user-tyre-${cardIndex}`);
    const drvIndex = idxs[pos];
    if (tyreEl && drvIndex != null) {
      const drv = raceState.drivers[drvIndex];
      tyreEl.textContent = `${Math.round(drv.tyreWear * 100)}%`;
    }
  });
}

// ------------------------------
// BOTOES DO USUARIO
// ------------------------------
function configurarBotoesUsuario() {
  const buttons = document.querySelectorAll(".user-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      const action = btn.dataset.action;
      const driverIdx = raceState.userDriverIndexes[index];
      if (driverIdx == null) return;

      const drv = raceState.drivers[driverIdx];

      if (action === "pit") {
        drv.wantsPit = true;
      } else if (action === "push") {
        drv.mode = "push";
      } else if (action === "save") {
        drv.mode = "save";
      }
    });
  });
}

// ------------------------------
// VELOCIDADE 1x / 2x / 4x
// ------------------------------
function configurarBotoesVelocidade() {
  const speedButtons = document.querySelectorAll(".speed-btn");
  speedButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      speedButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mult = Number(btn.dataset.speed) || 1;
      raceState.speedMultiplier = mult;
    });
  });
}

// ------------------------------
// RESULTADO FINAL / PÓDIO
// ------------------------------
function mostrarResultadoFinal() {
  const ordenados = [...raceState.drivers].sort((a, b) => a.totalTime - b.totalTime);

  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const first = ordenados[0];
  const second = ordenados[1];
  const third = ordenados[2];

  const setPodium = (pos, drv) => {
    if (!drv) return;
    const face = document.getElementById(`podium${pos}-face`);
    const name = document.getElementById(`podium${pos}-name`);
    const team = document.getElementById(`podium${pos}-team`);
    if (face) face.src = drv.face || "";
    if (name) name.textContent = drv.name;
    if (team) team.textContent = drv.teamName;
  };

  setPodium(1, first);
  setPodium(2, second);
  setPodium(3, third);

  modal.classList.remove("hidden");

  // também escreve texto abaixo (resultado completo)
  const body = document.createElement("div");
  body.className = "race-result-text";

  let html = `<p><strong>Resultado completo – ${raceState.gpName}</strong></p><ol>`;
  ordenados.forEach((drv, idx) => {
    const pitInfo = drv.mandatoryPitDone ? "" : " (+20s sem pit obrigatório)";
    html += `<li>${idx + 1}º – ${drv.name} (${drv.teamName}) – Tempo: ${formatRaceTime(drv.totalTime)} – Pit stops: ${drv.pitStops}${pitInfo}</li>`;
  });
  html += "</ol>";

  body.innerHTML = html;

  const content = modal.querySelector(".podium-content");
  if (content) {
    const oldText = content.querySelector(".race-result-text");
    if (oldText) oldText.remove();
    content.appendChild(body);
  }
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (modal) modal.classList.add("hidden");
}
window.closePodium = closePodium;
