// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida completa com 1 pit obrigatório, desgaste de pneus
// e integração com o grid salvo pela classificação.
// Compatível com race.html enviado por você.
// ==========================================================

// ---------------------------
// CONFIGURAÇÕES GERAIS
// ---------------------------
const RACE_TOTAL_LAPS = 25;
const PIT_LOSS_MS = 20000;              // 20s na troca
const BASE_LAP_MS = 76000;             // 1:16.000 base aproximada
const TYRE_WEAR_PER_LAP = 3.3;         // ~80% em 25 voltas
const TYRE_WEAR_PUSH_MULT = 1.5;
const TYRE_WEAR_SAVE_MULT = 0.7;
const SPEED_PUSH_MULT = 1.04;          // ataque = mais rápido
const SPEED_SAVE_MULT = 0.97;          // economizar = mais lento
const NO_PIT_PENALTY_MS = 20000;       // +20s se não parar nenhuma vez

// mesma lista da qualy (pra fallback e pra achar faces/logos)
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

// ---------------------------
// ESTADO DA CORRIDA
// ---------------------------
const raceState = {
  trackKey: "australia",
  gpName: "GP 2025",
  userTeamKey: "ferrari",

  drivers: [],
  pathPoints: [],
  carVisuals: [],
  lastUpdateTime: null,
  running: true,
  speedMultiplier: 1
};

// ---------------------------
// FUNÇÕES AUXILIARES
// ---------------------------
function formatTimeMs(ms) {
  if (!isFinite(ms)) return "--:--.---";
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const millis = Math.floor((total - minutes * 60 - seconds) * 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// posição ao longo da pista (0..1)
function getPositionOnTrack(progress) {
  const pts = raceState.pathPoints;
  if (!pts.length) return { x: 0, y: 0 };
  const total = pts.length;
  let f = progress * total;
  let i0 = Math.floor(f);
  let t = f - i0;
  if (i0 >= total) i0 = total - 1;
  let i1 = (i0 + 1) % total;
  const p0 = pts[i0];
  const p1 = pts[i1];
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t
  };
}

// procura dados extras do piloto (face, logo, cor) pela id ou nome
function enrichDriver(base) {
  let ref = DRIVERS_2025.find(d => d.id === base.id) ||
            DRIVERS_2025.find(d => d.name === base.name);
  if (!ref) return { ...base };
  return {
    ...base,
    face: ref.face,
    logo: ref.logo,
    color: ref.color || "#ffffff",
    teamKey: ref.teamKey || base.teamKey,
    teamName: ref.teamName || base.teamName,
    rating: ref.rating ?? base.rating ?? 90
  };
}

// ---------------------------
// INICIALIZAÇÃO
// ---------------------------
window.addEventListener("DOMContentLoaded", () => {
  initRace();
});

function initRace() {
  const params = new URLSearchParams(window.location.search);
  raceState.trackKey = params.get("track") || "australia";
  raceState.gpName = params.get("gp") || "GP 2025";
  raceState.userTeamKey =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  const gpTitle = document.getElementById("gp-title");
  if (gpTitle) gpTitle.textContent = raceState.gpName;

  buildGridFromQualy();
  preencherPainelUsuario();
  loadTrackSvg(raceState.trackKey).then(() => {
    raceState.lastUpdateTime = performance.now();
    setupControls();
    requestAnimationFrame(gameLoopRace);
  });
}

// monta grid a partir do localStorage da qualy ou, se não existir,
// monta um grid padrão com alguns pilotos
function buildGridFromQualy() {
  let payload = null;
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (raw) payload = JSON.parse(raw);
  } catch (e) {
    console.warn("Erro lendo grid da qualy:", e);
  }

  let ordered;
  if (payload && Array.isArray(payload.grid) && payload.grid.length) {
    // grid salvo: já vem ordenado
    ordered = payload.grid.map((g, idx) =>
      enrichDriver({
        id: g.id,
        name: g.name,
        teamKey: g.teamKey,
        teamName: g.teamName,
        startPosition: idx + 1
      })
    );
  } else {
    // fallback simples (não quebra o jogo)
    ordered = [
      "verstappen", "leclerc", "hamilton",
      "perez", "norris", "alonso",
      "russell", "sainz", "piastri", "gasly"
    ].map((id, idx) => {
      const d = DRIVERS_2025.find(x => x.id === id);
      return enrichDriver({
        id: d?.id || `drv${idx}`,
        name: d?.name || `Piloto ${idx + 1}`,
        teamKey: d?.teamKey || "generic",
        teamName: d?.teamName || "Equipe",
        startPosition: idx + 1
      });
    });
  }

  // monta estado inicial de cada piloto
  raceState.drivers = ordered.map((drv, idx) => {
    const baseLap = BASE_LAP_MS + (20 - (drv.rating ?? 90)) * 20; // piloto melhor = base menor
    return {
      ...drv,
      index: idx,
      progress: Math.random(),     // posição inicial aleatória
      laps: 0,
      bestLap: null,
      lastLap: null,
      lastLapTimestamp: null,
      raceTime: 0,                 // tempo acumulado sem penalidade
      finished: false,
      finishTime: null,
      tyreWear: 0,                 // 0..100
      carWear: 0,
      pitStops: 0,
      mandatoryPitDone: false,
      planPit: false,              // pedido de pit (botão / IA)
      mode: "normal",              // "normal" | "push" | "save"
      baseLapMs: baseLap,
      askPit: false                // se pneus >=80%, piloto pede box
    };
  });

  atualizarListaPilotosUI();
}

// ---------------------------
// DESENHO DA PISTA SVG
// ---------------------------
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

  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  raceState.pathPoints = pts.map(p => ({
    x: ((p.x - minX) / width) * 1000,
    y: ((p.y - minY) / height) * 600
  }));

  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#666");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  inner.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "#dddddd");
  inner.setAttribute("stroke-width", "6");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  svg.appendChild(inner);

  raceState.pathPoints.forEach(p => {
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

  raceState.carVisuals = raceState.drivers.map(drv => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", 6);
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.5");
    body.setAttribute("fill", drv.color || "#ffffff");
    g.appendChild(body);

    if (drv.teamKey === raceState.userTeamKey) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-10 6,0 -6,0");
      tri.setAttribute("fill", drv.color || "#ffffff");
      g.appendChild(tri);
    }

    svg.appendChild(g);
    return { id: drv.id, group: g };
  });
}

// ---------------------------
// LOOP PRINCIPAL
// ---------------------------
function gameLoopRace(timestamp) {
  if (!raceState.running) return;

  const dt = raceState.lastUpdateTime != null
    ? (timestamp - raceState.lastUpdateTime) * raceState.speedMultiplier
    : 0;
  raceState.lastUpdateTime = timestamp;

  updateRaceSimulation(dt);
  renderRace();

  requestAnimationFrame(gameLoopRace);
}

function updateRaceSimulation(dtMs) {
  if (!raceState.pathPoints.length) return;

  const now = performance.now();
  let raceFinished = false;

  raceState.drivers.forEach(drv => {
    if (drv.finished) return;

    const rating = drv.rating ?? 90;
    let paceMult = 1 + (rating - 90) * 0.002; // +2% a cada 10pts

    if (drv.mode === "push") paceMult *= SPEED_PUSH_MULT;
    else if (drv.mode === "save") paceMult *= SPEED_SAVE_MULT;

    // desgaste influencia (pneu muito gasto = mais lento)
    const tyreFactor = 1 - drv.tyreWear * 0.0025; // 100% = -25%
    const effectivePace = paceMult * clamp(tyreFactor, 0.7, 1.05);

    const baseSpeed = 1 / drv.baseLapMs; // progresso por ms
    const speed = baseSpeed * effectivePace;

    const deltaProg = speed * (dtMs || 0);
    let oldProg = drv.progress;
    let newProg = oldProg + deltaProg;

    if (drv.lastLapTimestamp == null) drv.lastLapTimestamp = now;

    if (newProg >= 1) {
      newProg -= 1;

      let lapTime = now - drv.lastLapTimestamp;
      if (!isFinite(lapTime) || lapTime <= 0) {
        lapTime = drv.baseLapMs + (Math.random() - 0.5) * 2000;
      }

      drv.laps += 1;
      drv.lastLap = lapTime;
      if (drv.bestLap == null || lapTime < drv.bestLap) drv.bestLap = lapTime;

      // desgaste de pneus na volta
      let wearMult = 1;
      if (drv.mode === "push") wearMult = TYRE_WEAR_PUSH_MULT;
      else if (drv.mode === "save") wearMult = TYRE_WEAR_SAVE_MULT;

      drv.tyreWear += TYRE_WEAR_PER_LAP * wearMult + Math.random() * 0.7;
      drv.tyreWear = clamp(drv.tyreWear, 0, 120);

      // piloto pede box se pneus >=80%
      drv.askPit = drv.tyreWear >= 80 && !drv.mandatoryPitDone;

      // decide se entra no pit nessa volta
      let pitThisLap = false;
      if (drv.planPit) {
        pitThisLap = true;
      } else if (!drv.mandatoryPitDone) {
        if (!isUserDriver(drv)) {
          // IA: escolhe automaticamente a partir de 70% de desgaste
          if (drv.tyreWear >= 70 && drv.laps > 4) {
            pitThisLap = Math.random() < 0.4;
          }
        } else {
          // piloto do usuário: se pneus muito ruins, forçamos pit de segurança
          if (drv.tyreWear >= 98) pitThisLap = true;
        }
      }

      let extraMs = 0;
      if (pitThisLap) {
        extraMs += PIT_LOSS_MS + (Math.random() - 0.5) * 2000;
        drv.tyreWear = 0;
        drv.pitStops += 1;
        drv.mandatoryPitDone = true;
        drv.planPit = false;
        drv.askPit = false;
      }

      // se chegou ao absurdo (100+ sem pit), perde tempo
      if (!drv.mandatoryPitDone && drv.tyreWear >= 100) {
        extraMs += 5000 + Math.random() * 5000;
      }

      drv.raceTime += lapTime + extraMs;
      drv.lastLapTimestamp = now;

      if (drv.laps >= RACE_TOTAL_LAPS) {
        drv.finished = true;
        drv.finishTime = drv.raceTime;
      }
    }

    drv.progress = newProg;
  });

  // verifica se todos terminaram (ou pelo menos o líder)
  const leader = getLeader();
  if (leader && leader.finished) {
    raceFinished = true;
  }

  atualizarHeaderVoltas();
  atualizarListaPilotosUI();

  if (raceFinished) {
    finalizarCorrida();
  }
}

function renderRace() {
  if (!raceState.pathPoints.length) return;
  const map = {};
  raceState.drivers.forEach(d => { map[d.id] = d; });

  raceState.carVisuals.forEach(vis => {
    const drv = map[vis.id];
    if (!drv) return;
    const pos = getPositionOnTrack(drv.progress);
    vis.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

// ---------------------------
// UI – LISTA E HUD
// ---------------------------
function atualizarHeaderVoltas() {
  const lapLabel = document.getElementById("race-lap-label");
  if (!lapLabel) return;

  const leader = getLeader();
  const currentLap = leader ? clamp(leader.laps + 1, 1, RACE_TOTAL_LAPS) : 1;
  lapLabel.textContent = `Volta ${currentLap} / ${RACE_TOTAL_LAPS}`;
}

function getLeader() {
  if (!raceState.drivers.length) return null;
  const sorted = [...raceState.drivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return (a.raceTime ?? Infinity) - (b.raceTime ?? Infinity);
  });
  return sorted[0];
}

function atualizarListaPilotosUI() {
  const list = document.getElementById("drivers-list");
  if (!list) return;
  list.innerHTML = "";

  const sorted = [...raceState.drivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return (a.raceTime ?? Infinity) - (b.raceTime ?? Infinity);
  });

  sorted.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "driver-row";

    const pos = document.createElement("div");
    pos.className = "driver-pos";
    pos.textContent = `${idx + 1}º`;

    const info = document.createElement("div");
    info.className = "driver-info";

    const imgFace = document.createElement("img");
    imgFace.className = "driver-face";
    if (drv.face) imgFace.src = drv.face;
    imgFace.alt = drv.name;

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

    info.appendChild(imgFace);
    info.appendChild(text);

    const stats = document.createElement("div");
    stats.className = "driver-stats";

    const tyre = clamp(Math.round(drv.tyreWear), 0, 120);
    const pits = drv.pitStops;

    stats.innerHTML = `
      <div class="stat-line">Voltas <span>${drv.laps}/${RACE_TOTAL_LAPS}</span></div>
      <div class="stat-line">Melhor <span>${formatTimeMs(drv.bestLap ?? Infinity)}</span></div>
      <div class="stat-line">Última <span>${formatTimeMs(drv.lastLap ?? Infinity)}</span></div>
      <div class="stat-line">Pneus <span>${tyre}%</span></div>
      <div class="stat-line">Pit stops <span>${pits}</span></div>
    `;

    if (drv.teamKey === raceState.userTeamKey) {
      row.classList.add("user-team-row");
    }

    list.appendChild(row);
    row.appendChild(pos);
    row.appendChild(info);
    row.appendChild(stats);
  });
}

// painel dos 2 pilotos da equipe do usuário
function preencherPainelUsuario() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeamKey).slice(0, 2);

  userDrivers.forEach((drv, idx) => {
    const face = document.getElementById(`user-face-${idx}`);
    const name = document.getElementById(`user-name-${idx}`);
    const team = document.getElementById(`user-team-${idx}`);
    const carSt = document.getElementById(`user-car-${idx}`);
    const tyreSt = document.getElementById(`user-tyre-${idx}`);

    if (face && drv.face) face.src = drv.face;
    if (name) name.textContent = drv.name;
    if (team) team.textContent = drv.teamName;
    if (carSt) carSt.textContent = "100%";
    if (tyreSt) tyreSt.textContent = "0%";
  });
}

// helper
function isUserDriver(drv) {
  return drv.teamKey === raceState.userTeamKey;
}

// ---------------------------
// CONTROLES (VEL / PIT / MODO)
// ---------------------------
function setupControls() {
  const speedButtons = document.querySelectorAll(".speed-btn");
  speedButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const val = Number(btn.getAttribute("data-speed")) || 1;
      raceState.speedMultiplier = val;
      speedButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const userButtons = document.querySelectorAll(".user-btn");
  userButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index")) || 0;
      const action = btn.getAttribute("data-action");
      const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeamKey).slice(0, 2);
      const drv = userDrivers[index];
      if (!drv) return;

      if (action === "pit") {
        drv.planPit = true;
      } else if (action === "save") {
        drv.mode = "save";
      } else if (action === "push") {
        drv.mode = "push";
      }
    });
  });
}

// ---------------------------
// FINALIZAÇÃO DA CORRIDA
// ---------------------------
function finalizarCorrida() {
  // trava loop
  raceState.running = false;

  // aplica penalidade de quem não fez pit obrigatório
  raceState.drivers.forEach(drv => {
    if (!drv.mandatoryPitDone) {
      drv.raceTime += NO_PIT_PENALTY_MS;
    }
    if (!drv.finishTime) drv.finishTime = drv.raceTime;
  });

  const finalOrder = [...raceState.drivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return (a.raceTime ?? Infinity) - (b.raceTime ?? Infinity);
  });

  mostrarPodio(finalOrder);
}

// mostra modal do pódio usando elementos do race.html
function mostrarPodio(order) {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  const first = order[0];
  const second = order[1];
  const third = order[2];

  const face1 = document.getElementById("podium1-face");
  const name1 = document.getElementById("podium1-name");
  const team1 = document.getElementById("podium1-team");

  const face2 = document.getElementById("podium2-face");
  const name2 = document.getElementById("podium2-name");
  const team2 = document.getElementById("podium2-team");

  const face3 = document.getElementById("podium3-face");
  const name3 = document.getElementById("podium3-name");
  const team3 = document.getElementById("podium3-team");

  if (first) {
    if (face1 && first.face) face1.src = first.face;
    if (name1) name1.textContent = first.name;
    if (team1) team1.textContent = first.teamName;
  }
  if (second) {
    if (face2 && second.face) face2.src = second.face;
    if (name2) name2.textContent = second.name;
    if (team2) team2.textContent = second.teamName;
  }
  if (third) {
    if (face3 && third.face) face3.src = third.face;
    if (name3) name3.textContent = third.name;
    if (team3) team3.textContent = third.teamName;
  }

  modal.classList.remove("hidden");
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (modal) modal.classList.add("hidden");
  // depois podemos redirecionar de volta pro calendário, se quiser.
}

// expõe funções globais usadas no HTML
window.closePodium = closePodium;
