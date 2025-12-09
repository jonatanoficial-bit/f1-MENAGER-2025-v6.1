// ==========================================================
// F1 MANAGER 2025 – RACE.JS
// Corrida com 25 voltas, 1 pit obrigatório e desgaste de pneus
// ==========================================================

// ------------------------------
// CONFIGURAÇÃO GERAL DA CORRIDA
// ------------------------------
const RACE_LAPS = 25;          // total de voltas
const PIT_PENALTY_MS = 20000;  // +20s se NÃO fizer pit obrigatório

// ------------------------------
// LISTA BASE DE PILOTOS (MESMO PADRÃO DA QUALY)
// Usada como fallback se não existir grid salvo
// ------------------------------
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

  { id: "gasly", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/gasly.png",  logo: "assets/logos/alpine.png" },
  { id: "ocon",  name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", face: "assets/faces/ocon.png",   logo: "assets/logos/alpine.png" },

  { id: "tsunoda", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", face: "assets/faces/tsunoda.png", logo: "assets/logos/racingbulls.png" },
  { id: "lawson",  name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", face: "assets/faces/lawson.png",  logo: "assets/logos/racingbulls.png" },

  { id: "hulkenberg", name: "Nico Hülkenberg",   teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", face: "assets/faces/hulkenberg.png", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", face: "assets/faces/bortoleto.png",  logo: "assets/logos/sauber.png" },

  { id: "kevin",    name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/magnussen.png", logo: "assets/logos/haas.png" },
  { id: "bearman",  name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", face: "assets/faces/bearman.png",   logo: "assets/logos/haas.png" },

  { id: "albon",    name: "Alex Albon",        teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", face: "assets/faces/albon.png",    logo: "assets/logos/williams.png" },
  { id: "sargeant", name: "Logan Sargeant",    teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", face: "assets/faces/sargeant.png", logo: "assets/logos/williams.png" }
];

// ------------------------------
// ESTADO DA CORRIDA
// ------------------------------
const raceState = {
  drivers: [],          // lista de pilotos na corrida
  trackPoints: [],      // pontos do traçado
  svgCars: [],          // grupos <g> dos carros no SVG
  running: true,
  finished: false,
  lastTime: null,
  speedMultiplier: 1,   // 1x / 2x / 4x
  userTeamKey: null,
  userDrivers: [],      // dois pilotos do usuário
  trackName: null,
  gpName: null,
  safetyCarActive: false,
  totalRaceTime: 0
};

// ------------------------------
// FORMATADOR DE TEMPO
// ------------------------------
function formatTime(ms) {
  if (!isFinite(ms)) return "--:--.---";
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const ms3 = Math.floor((total - m * 60 - s) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms3).padStart(3, "0")}`;
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
  const userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  raceState.trackName = track;
  raceState.gpName = gp;
  raceState.userTeamKey = userTeam;

  const titleEl = document.getElementById("race-gp-title");
  if (titleEl) {
    titleEl.textContent = gp;
  }

  // Liga botões de velocidade (1x / 2x / 4x)
  const speedButtons = document.querySelectorAll(".race-speed-btn");
  speedButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = Number(btn.dataset.speed) || 1;
      raceState.speedMultiplier = mult;
      speedButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  carregarGridInicial();
  popularPainelUserTeam();
  carregarPistaSvg(track).then(() => {
    raceState.lastTime = performance.now();
    requestAnimationFrame(loopCorrida);
  });
}

// ------------------------------
// CARREGAR GRID INICIAL
// ------------------------------
function carregarGridInicial() {
  // tenta pegar grid salvo da qualificação
  let gridSalvo = null;
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.grid)) {
        gridSalvo = data;
      }
    }
  } catch (e) {
    console.warn("Não foi possível ler grid da qualificação:", e);
  }

  let baseGrid = [];

  if (gridSalvo && gridSalvo.grid.length) {
    // ordena por posição salva
    baseGrid = [...gridSalvo.grid].sort((a, b) => (a.position || 0) - (b.position || 0));
  } else {
    // fallback – usa rating para ordenar
    baseGrid = [...RACE_DRIVERS_2025]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .map((drv, idx) => ({
        id: drv.id,
        name: drv.name,
        teamKey: drv.teamKey,
        teamName: drv.teamName,
        position: idx + 1,
        bestLapTime: null
      }));
  }

  // Mapeia com os dados completos (face, logo, rating etc.)
  raceState.drivers = baseGrid.map((g, idx) => {
    const full = RACE_DRIVERS_2025.find((d) => d.id === g.id) || g;
    const rating = full.rating || 90;

    // velocidade base: pilotos melhores mais rápidos
    const baseSpeed = 0.00017 + (rating / 1300000); // ajustado na prática

    return {
      id: full.id,
      name: full.name,
      teamKey: full.teamKey,
      teamName: full.teamName,
      color: full.color || "#ffffff",
      face: full.face || "",
      logo: full.logo || "",
      rating: rating,

      gridPosition: idx + 1,
      racePosition: idx + 1,

      progress: Math.random() * 0.05, // largada com pequena dispersão
      speedBase: baseSpeed,
      speedMode: "normal", // "normal", "attack", "save"
      tyreWear: 0,         // 0 a 100
      tyreTemp: 90,        // ~ 90º ok
      laps: 0,
      pitStops: 0,
      mustPit: true,
      wantsPit: false,
      inPit: false,
      pitTimer: 0,
      crashed: false,
      dnf: false,          // did not finish
      lastLapStart: 0,
      lastLapTime: null,
      bestLapTime: null,
      totalTime: 0,
      finishTime: null,
      pitPenaltyApplied: false,
      statusMessage: ""
    };
  });

  // define pilotos da equipe do usuário
  raceState.userDrivers = raceState.drivers.filter(
    (d) => d.teamKey === raceState.userTeamKey
  ).slice(0, 2);
}

// ------------------------------
// CARREGAR PISTA SVG
// ------------------------------
async function carregarPistaSvg(trackKey) {
  const container = document.getElementById("race-track-container");
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
    console.error("Erro carregando SVG da pista:", e);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("Nenhum <path> encontrado no SVG da pista (race).");
    return;
  }

  const len = path.getTotalLength();
  const samples = 400;
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  raceState.trackPoints = pts.map((p) => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  // pista cinza
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute(
    "points",
    raceState.trackPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#444");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  // linha branca interna
  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerPath.setAttribute(
    "points",
    raceState.trackPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#eeeeee");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  // grid (ponto 0)
  const flagPoint = raceState.trackPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  // cria carros (circulo + setinha se for da equipe do usuário)
  raceState.svgCars = raceState.drivers.map((drv) => {
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
    return { driverId: drv.id, group: g, body };
  });
}

// ------------------------------
// LOOP PRINCIPAL DA CORRIDA
// ------------------------------
function loopCorrida(timestamp) {
  if (!raceState.lastTime) raceState.lastTime = timestamp;

  const dt = (timestamp - raceState.lastTime) * raceState.speedMultiplier;
  raceState.lastTime = timestamp;

  if (raceState.running && !raceState.finished) {
    atualizarFisicaCorrida(dt);
    atualizarHudCorrida();
    renderizarCarros();
  }

  requestAnimationFrame(loopCorrida);
}

// ------------------------------
// FÍSICA / LÓGICA DA CORRIDA
// ------------------------------
function atualizarFisicaCorrida(dtMs) {
  if (!raceState.trackPoints.length) return;
  if (!raceState.drivers.length) return;

  raceState.totalRaceTime += dtMs;

  raceState.drivers.forEach((drv) => {
    if (drv.dnf || drv.finishTime != null) {
      return;
    }

    drv.totalTime += dtMs;

    // Se estiver no box
    if (drv.inPit) {
      drv.pitTimer -= dtMs;
      drv.statusMessage = "Em pit stop";

      if (drv.pitTimer <= 0) {
        drv.inPit = false;
        drv.tyreWear = 0;
        drv.tyreTemp = 85;
        drv.statusMessage = "Saiu do box";
      }
      return;
    }

    // RISCO DE ACIDENTE COM 100% DE DESGASTE
    if (drv.tyreWear >= 100 && !drv.dnf) {
      // 50% de chance de bater
      if (Math.random() < 0.5) {
        drv.dnf = true;
        drv.crashed = true;
        drv.statusMessage = "Acidente! Abandonou.";
        ativarSafetyCar();
        return;
      } else {
        // não bateu mas anda muito lento
        drv.statusMessage = "Pneu destruído! Muito lento.";
      }
    }

    // VELOCIDADE BASE
    let speed = drv.speedBase;

    // Safety Car ativo: reduz velocidade geral
    if (raceState.safetyCarActive) {
      speed *= 0.45;
    }

    // MODO DE CONDUÇÃO (ATACAR / ECONOMIZAR)
    let desgasteLapFactor = 0.00003; // base para desgaste contínuo
    if (drv.speedMode === "attack") {
      speed *= 1.07;
      desgasteLapFactor *= 1.7;
      drv.tyreTemp += 0.006 * dtMs;
      drv.statusMessage = "Atacando";
    } else if (drv.speedMode === "save") {
      speed *= 0.92;
      desgasteLapFactor *= 0.6;
      drv.tyreTemp -= 0.004 * dtMs;
      drv.statusMessage = "Economizando";
    } else {
      drv.statusMessage = "Ritmo normal";
    }

    // efeito do desgaste no ritmo
    if (drv.tyreWear >= 80 && drv.tyreWear < 100) {
      const extra = (drv.tyreWear - 80) / 20; // 0..1
      const slowFactor = 1 - extra * 0.20;   // até -20% de velocidade
      speed *= slowFactor;
    }

    // desgaste contínuo proporcional ao tempo
    drv.tyreWear += desgasteLapFactor * dtMs;
    if (drv.tyreWear > 120) drv.tyreWear = 120;

    if (drv.tyreTemp < 70) drv.tyreTemp = 70;
    if (drv.tyreTemp > 130) drv.tyreTemp = 130;

    // AVISO DE PNEU ACIMA DE 80%
    if (drv.tyreWear >= 80 && !drv.wantsPit && !drv.dnf && !drv.inPit) {
      drv.wantsPit = true;
      // apenas pilotos do usuário "falam" no rádio
      if (drv.teamKey === raceState.userTeamKey) {
        mostrarAvisoRadio(`${drv.name}: "Pneus no limite! Recomendo box!"`);
      }
    }

    // LÓGICA DE PIT AUTOMÁTICO PARA IA
    if (drv.teamKey !== raceState.userTeamKey && drv.wantsPit && !drv.inPit && !drv.dnf) {
      // IA decide parar
      entrarNoPit(drv);
    }

    // MOVIMENTO NA PISTA
    const deltaProgress = (speed * dtMs);
    let novoProg = drv.progress + deltaProgress;

    if (novoProg >= 1) {
      // completou 1 volta
      const excedente = novoProg - 1;
      registrarVolta(drv);
      drv.laps += 1;
      drv.progress = excedente;
    } else {
      drv.progress = novoProg;
    }

    // FINAL DA CORRIDA PARA ESTE PILOTO
    if (drv.laps >= RACE_LAPS && drv.finishTime == null && !drv.dnf) {
      drv.finishTime = drv.totalTime;
      drv.statusMessage = "Corrida concluída";

      // penalidade se não fez pit obrigatório
      if (drv.pitStops === 0 && !drv.pitPenaltyApplied) {
        drv.finishTime += PIT_PENALTY_MS;
        drv.pitPenaltyApplied = true;
        drv.statusMessage += " (+20s penalidade sem pit)";
      }
    }
  });

  // SE TODOS TERMINARAM -> ENCERRA CORRIDA
  const aindaDeCorrida = raceState.drivers.some(
    (d) => !d.dnf && d.finishTime == null
  );

  if (!aindaDeCorrida) {
    raceState.finished = true;
    raceState.running = false;
    mostrarResultadosFinais();
  }

  // ATUALIZA POSIÇÕES (ORDENAR POR VOLTAS E PROGRESSO)
  atualizarPosicoes();
}

// ------------------------------
// REGISTRAR VOLTA
// ------------------------------
function registrarVolta(drv) {
  const agora = drv.totalTime;

  if (drv.lastLapStart == null) {
    drv.lastLapStart = 0;
  }

  const lapTime = agora - drv.lastLapStart;
  drv.lastLapStart = agora;
  drv.lastLapTime = lapTime;

  if (drv.bestLapTime == null || lapTime < drv.bestLapTime) {
    drv.bestLapTime = lapTime;
  }
}

// ------------------------------
// ENTRAR NO PIT
// ------------------------------
function entrarNoPit(drv) {
  if (drv.inPit || drv.dnf || drv.finishTime != null) return;

  drv.inPit = true;
  drv.wantsPit = false;
  drv.pitStops += 1;

  // tempo de box base
  let pitTime = 2400; // 2,4s
  // erro aleatório
  pitTime += (Math.random() - 0.5) * 1200; // +/- 0,6s

  // sob Safety Car, pit é um pouco mais "barato"
  if (raceState.safetyCarActive) {
    pitTime *= 0.8;
  }

  drv.pitTimer = pitTime;
  drv.statusMessage = "Entrando no box";
}

// ------------------------------
// SAFETY CAR
// ------------------------------
function ativarSafetyCar() {
  if (raceState.safetyCarActive) return;
  raceState.safetyCarActive = true;
  mostrarAvisoRadio("Safety Car na pista!");
  // (no futuro podemos desligar depois de X voltas)
}

// ------------------------------
// ATUALIZA POSIÇÕES
// ------------------------------
function atualizarPosicoes() {
  const ativos = [...raceState.drivers];

  ativos.sort((a, b) => {
    // 1) quem tiver mais voltas
    if (a.laps !== b.laps) return b.laps - a.laps;

    // 2) se ambos terminaram, comparar finishTime
    if (a.finishTime != null && b.finishTime != null) {
      return a.finishTime - b.finishTime;
    }

    // 3) se só um terminou, ele fica na frente
    if (a.finishTime != null && b.finishTime == null) return -1;
    if (a.finishTime == null && b.finishTime != null) return 1;

    // 4) se nenhum terminou, maior progress
    return b.progress - a.progress;
  });

  ativos.forEach((drv, idx) => {
    drv.racePosition = idx + 1;
  });
}

// ------------------------------
// RENDERIZAÇÃO DOS CARROS NO SVG
// ------------------------------
function renderizarCarros() {
  if (!raceState.trackPoints.length) return;
  if (!raceState.svgCars.length) return;

  const mapaDrivers = {};
  raceState.drivers.forEach((d) => {
    mapaDrivers[d.id] = d;
  });

  raceState.svgCars.forEach((vis) => {
    const drv = mapaDrivers[vis.driverId];
    if (!drv) return;

    let prog = drv.progress;
    if (prog < 0) prog = 0;
    if (prog > 1) prog = 1;

    const idxFloat = prog * raceState.trackPoints.length;
    let i0 = Math.floor(idxFloat);
    let i1 = (i0 + 1) % raceState.trackPoints.length;
    const t = idxFloat - i0;
    if (i0 >= raceState.trackPoints.length) i0 = raceState.trackPoints.length - 1;
    if (i1 >= raceState.trackPoints.length) i1 = 0;
    const p0 = raceState.trackPoints[i0];
    const p1 = raceState.trackPoints[i1];

    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;

    vis.group.setAttribute("transform", `translate(${x},${y})`);
  });
}

// ------------------------------
// ATUALIZAÇÃO DE HUD / LISTA
// ------------------------------
function atualizarHudCorrida() {
  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    const leaderLaps = Math.max(...raceState.drivers.map((d) => d.laps));
    lapLabel.textContent = `Volta ${Math.min(leaderLaps + 1, RACE_LAPS)} / ${RACE_LAPS}`;
  }

  // painel de lista geral
  const list = document.getElementById("race-drivers-list");
  if (list) {
    const ordenados = [...raceState.drivers].sort(
      (a, b) => a.racePosition - b.racePosition
    );

    const leader = ordenados[0];
    list.innerHTML = "";

    ordenados.forEach((drv) => {
      const row = document.createElement("div");
      row.className = "race-driver-row";

      const pos = document.createElement("div");
      pos.className = "race-pos";
      pos.textContent = `${drv.racePosition}º`;

      const info = document.createElement("div");
      info.className = "race-info";

      const face = document.createElement("img");
      face.className = "race-face";
      face.src = drv.face || "";
      face.alt = drv.name;

      const text = document.createElement("div");
      text.className = "race-text";

      const name = document.createElement("div");
      name.className = "race-name";
      name.textContent = drv.name;

      const team = document.createElement("div");
      team.className = "race-team";
      team.textContent = drv.teamName;

      text.appendChild(name);
      text.appendChild(team);

      info.appendChild(face);
      info.appendChild(text);

      const stats = document.createElement("div");
      stats.className = "race-stats";

      stats.innerHTML = `
        <div><span>Voltas:</span> ${drv.laps}/${RACE_LAPS}</div>
        <div><span>Melhor:</span> ${formatTime(drv.bestLapTime ?? Infinity)}</div>
        <div><span>Última:</span> ${formatTime(drv.lastLapTime ?? Infinity)}</div>
        <div><span>Pneus:</span> ${Math.round(drv.tyreWear)}%</div>
      `;

      row.appendChild(pos);
      row.appendChild(info);
      row.appendChild(stats);

      if (drv.teamKey === raceState.userTeamKey) {
        row.classList.add("race-user-row");
      }

      list.appendChild(row);
    });
  }

  // painel específico dos dois pilotos do usuário
  atualizarPainelUserTeam();
}

// ------------------------------
// AVISOS DE RÁDIO
// ------------------------------
function mostrarAvisoRadio(msg) {
  const el = document.getElementById("race-radio");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");

  setTimeout(() => {
    el.classList.remove("visible");
  }, 3500);
}

// ------------------------------
// PAINEL DOS DOIS PILOTOS DO USUÁRIO
// ------------------------------
function popularPainelUserTeam() {
  atualizarPainelUserTeam();

  // liga botões de ação
  const card1 = document.getElementById("user-race-driver-1");
  const card2 = document.getElementById("user-race-driver-2");

  const cards = [
    { card: card1, idx: 0 },
    { card: card2, idx: 1 }
  ];

  cards.forEach((entry) => {
    const { card, idx } = entry;
    if (!card) return;

    const btnPit = card.querySelector("[data-action='pit']");
    const btnAtk = card.querySelector("[data-action='attack']");
    const btnEco = card.querySelector("[data-action='save']");

    if (btnPit) {
      btnPit.addEventListener("click", () => {
        const drv = raceState.userDrivers[idx];
        if (drv) {
          entrarNoPit(drv);
          mostrarAvisoRadio(`Box, box, box! – ${drv.name}`);
        }
      });
    }

    if (btnAtk) {
      btnAtk.addEventListener("click", () => {
        const drv = raceState.userDrivers[idx];
        if (drv) {
          drv.speedMode = "attack";
          mostrarAvisoRadio(`${drv.name}: "Vou atacar!"`);
        }
      });
    }

    if (btnEco) {
      btnEco.addEventListener("click", () => {
        const drv = raceState.userDrivers[idx];
        if (drv) {
          drv.speedMode = "save";
          mostrarAvisoRadio(`${drv.name}: "Vou economizar pneus."`);
        }
      });
    }
  });
}

function atualizarPainelUserTeam() {
  // atualiza referência (caso tenha mudado algo)
  raceState.userDrivers = raceState.drivers
    .filter((d) => d.teamKey === raceState.userTeamKey)
    .slice(0, 2);

  const card1 = document.getElementById("user-race-driver-1");
  const card2 = document.getElementById("user-race-driver-2");
  const cards = [card1, card2];

  raceState.userDrivers.forEach((drv, idx) => {
    const card = cards[idx];
    if (!card) return;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const team = card.querySelector(".user-team");
    const tyre = card.querySelector(".user-tyre");
    const status = card.querySelector(".user-status");

    if (face) face.src = drv.face || "";
    if (name) name.textContent = drv.name || "---";
    if (team) team.textContent = drv.teamName || "---";
    if (tyre) tyre.textContent = `${Math.round(drv.tyreWear)}%`;
    if (status) status.textContent = drv.statusMessage || "";
  });
}

// ------------------------------
// RESULTADOS FINAIS + PÓDIO
// ------------------------------
function mostrarResultadosFinais() {
  // ordena por posição final
  const final = [...raceState.drivers].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (a.finishTime != null && b.finishTime != null) {
      return a.finishTime - b.finishTime;
    }
    return 0;
  });

  // salva em localStorage
  const payload = {
    track: raceState.trackName,
    gp: raceState.gpName,
    timestamp: Date.now(),
    results: final.map((d, idx) => ({
      pos: idx + 1,
      name: d.name,
      team: d.teamName,
      finishTime: d.finishTime,
      bestLap: d.bestLapTime,
      pitStops: d.pitStops,
      dnf: d.dnf,
      pitPenalty: d.pitPenaltyApplied
    }))
  };

  try {
    localStorage.setItem("f1m2025_last_race", JSON.stringify(payload));
  } catch (e) {
    console.warn("Não foi possível salvar resultado da corrida:", e);
  }

  // monta HTML do resultado com PÓDIO
  const modal = document.getElementById("race-result-modal");
  const body = document.getElementById("race-result-body");
  if (modal && body) {
    const top3 = final.filter((d) => !d.dnf && d.finishTime != null).slice(0, 3);

    let html = `<h3>Pódio – ${raceState.gpName || "GP 2025"}</h3>`;

    if (top3.length > 0) {
      html += `<div class="podium-inline">`;

      top3.forEach((d, idx) => {
        const posLabel = `${idx + 1}º`;
        html += `
          <div class="podium-inline-card podium-pos-${idx + 1}">
            <div class="podium-inline-pos">${posLabel}</div>
            <img class="podium-inline-face" src="${d.face || ""}" alt="${d.name}" />
            <div class="podium-inline-name">${d.name}</div>
            <div class="podium-inline-team">${d.teamName}</div>
            <div class="podium-inline-time">${formatTime(d.finishTime ?? Infinity)}</div>
          </div>
        `;
      });

      html += `</div>`;
    }

    html += `<h4>Resultado completo</h4><ol class="race-result-list">`;

    final.forEach((d, idx) => {
      let obs = "";
      if (d.dnf) {
        obs = " – DNF (acidente)";
      } else if (d.pitPenaltyApplied) {
        obs = " – (+20s sem pit obrigatório)";
      }

      html += `
        <li>
          ${idx + 1}º - ${d.name} (${d.teamName}) –
          Tempo: ${formatTime(d.finishTime ?? Infinity)}
          – Pit stops: ${d.pitStops}${obs}
        </li>
      `;
    });

    html += `</ol><p>Clique em <strong>OK</strong> para voltar ao calendário.</p>`;
    body.innerHTML = html;
    modal.classList.remove("hidden");
  } else {
    // fallback: alerta simples
    alert("Corrida encerrada. Resultados salvos.");
  }
}

// ------------------------------
// EXPOSTO NO WINDOW (para HTML usar)
// ------------------------------
window.entrarNoPit = entrarNoPit;
