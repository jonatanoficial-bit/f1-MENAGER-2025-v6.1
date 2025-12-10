// ============================================================
// F1 MANAGER 2025 – PRACTICE.JS  (TREINO LIVRE)
// ============================================================

// ------------------------
// 1. Leitura dos parâmetros
// ------------------------
const urlParams = new URLSearchParams(window.location.search);
const trackKey  = urlParams.get("track")    || "australia";
const gpName    = urlParams.get("gp")       || "GP 2025";
const userTeam  = (urlParams.get("userTeam") || "ferrari").toLowerCase();

// Mapeia o arquivo SVG da pista
const TRACK_SVG_PATH = `assets/tracks/${trackKey}.svg`;

// ------------------------
// 2. Dados básicos de times e pilotos
//    (apenas o necessário para o treino)
// ------------------------

// Cor de cada equipe (para os carrinhos)
const TEAM_COLORS = {
  redbull:  "#0600ef",
  ferrari:  "#ff0000",
  mercedes:"#00d2be",
  mclaren: "#ff8700",
  aston:   "#006f62",
  alpine:  "#0090ff",
  williams:"#00a0de",
  rb:      "#469bff",
  haas:    "#ffffff",
  sauber:  "#52e252",
  "sauber/audi": "#52e252"
};

// Array simples só para vincular drivers à equipe e foto
const DRIVERS_2025 = [
  { code: "VER", name: "Max Verstappen",   teamKey: "redbull"  },
  { code: "PER", name: "Sergio Pérez",     teamKey: "redbull"  },
  { code: "LEC", name: "Charles Leclerc",  teamKey: "ferrari"  },
  { code: "SAI", name: "Carlos Sainz",     teamKey: "ferrari"  },
  { code: "HAM", name: "Lewis Hamilton",   teamKey: "mercedes" },
  { code: "RUS", name: "George Russell",   teamKey: "mercedes" },
  { code: "NOR", name: "Lando Norris",     teamKey: "mclaren"  },
  { code: "PIA", name: "Oscar Piastri",    teamKey: "mclaren"  },
  { code: "ALO", name: "Fernando Alonso",  teamKey: "aston"    },
  { code: "STR", name: "Lance Stroll",     teamKey: "aston"    },
  { code: "GAS", name: "Pierre Gasly",     teamKey: "alpine"   },
  { code: "OCO", name: "Esteban Ocon",     teamKey: "alpine"   },
  { code: "ALB", name: "Alex Albon",       teamKey: "williams" },
  { code: "SAR", name: "Logan Sargeant",   teamKey: "williams" },
  { code: "TSU", name: "Yuki Tsunoda",     teamKey: "rb"       },
  { code: "RIC", name: "Daniel Ricciardo", teamKey: "rb"       },
  { code: "HUL", name: "Nico Hülkenberg",  teamKey: "haas"     },
  { code: "MAG", name: "Kevin Magnussen",  teamKey: "haas"     },
  { code: "BOT", name: "Valtteri Bottas",  teamKey: "sauber"   },
  { code: "ZHO", name: "Guanyu Zhou",      teamKey: "sauber"   }
];

// Pega os dois pilotos da equipe do usuário
function getUserDrivers(teamKey) {
  const tk = teamKey.toLowerCase();
  const list = DRIVERS_2025.filter(d => d.teamKey.toLowerCase() === tk);
  if (list.length >= 2) return list.slice(0, 2);

  // fallback: se não encontrar, devolve dois genéricos
  return [
    { code: "GEN", name: "Piloto 1", teamKey: tk },
    { code: "GEN", name: "Piloto 2", teamKey: tk }
  ];
}

const userDrivers = getUserDrivers(userTeam);
const teamColor   = TEAM_COLORS[userTeam] || "#ff4444";

// ------------------------
// 3. Estado da sessão de treino
// ------------------------
let trackPoints = [];    // pontos amostrados no traçado
let animationId = null;
let lastFrameTs = null;
let speedFactor = 1;     // 1x, 2x, 4x

// Carros apenas da equipe do usuário
const cars = [
  {
    driver: userDrivers[0],
    progress: 0,
    baseSpeed: 40,      // “velocidade virtual” em pontos/segundo
    lap: 1
  },
  {
    driver: userDrivers[1],
    progress: 0,
    baseSpeed: 38,
    lap: 1
  }
];

// Duração da sessão (segundos) – apenas visual
let sessionTime = 60 * 60; // 60 min
const sessionInterval = setInterval(() => {
  sessionTime = Math.max(0, sessionTime - 1);
  updateSessionClock();
}, 1000);

// ------------------------
// 4. Utilitários de UI
// ------------------------
function updateSessionClock() {
  const el = document.querySelector("[data-session-clock]");
  if (!el) return;
  const min = String(Math.floor(sessionTime / 60)).padStart(2, "0");
  const sec = String(sessionTime % 60).padStart(2, "0");
  el.textContent = `${min}:${sec}`;
}

function setSpeed(newSpeed) {
  speedFactor = newSpeed;
  document.querySelectorAll("[data-speed-btn]").forEach(btn => {
    const v = Number(btn.dataset.speedBtn);
    if (v === newSpeed) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// Preenche nome do GP
function fillHeaderInfo() {
  const gpEl = document.querySelector("[data-gp-name]");
  if (gpEl) gpEl.textContent = gpName;

  const trackLabelEl = document.querySelector("[data-track-label]");
  if (trackLabelEl) {
    trackLabelEl.textContent = "Albert Park – Melbourne • Austrália"; // texto fixo por enquanto
  }
}

// Preenche info dos pilotos (nome + foto)
function fillDriverCards() {
  const d1 = userDrivers[0];
  const d2 = userDrivers[1];

  const d1Name = document.querySelector("[data-driver1-name]");
  const d2Name = document.querySelector("[data-driver2-name]");
  const d1Img  = document.querySelector("[data-driver1-face]");
  const d2Img  = document.querySelector("[data-driver2-face]");

  if (d1Name) d1Name.textContent = d1.name;
  if (d2Name) d2Name.textContent = d2.name;

  // Foto do piloto: assets/faces/COD.png  (ex: VER.png, LEC.png)
  if (d1Img) d1Img.src = `assets/faces/${d1.code}.png`;
  if (d2Img) d2Img.src = `assets/faces/${d2.code}.png`;

  // Deixa o logo da equipe só no topo (não mexemos no chip já existente)
}

// ------------------------
// 5. Carregamento da pista SVG
//    e criação dos carros dentro do próprio SVG
// ------------------------
const SVG_NS = "http://www.w3.org/2000/svg";

async function loadTrackSvg() {
  const wrapper = document.querySelector(".track-wrapper");
  const svgRoot = document.getElementById("track-svg");

  if (!wrapper || !svgRoot) return;

  try {
    const resp = await fetch(TRACK_SVG_PATH);
    if (!resp.ok) throw new Error("Falha ao carregar SVG da pista");

    const svgText = await resp.text();
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(svgText, "image/svg+xml");
    const importedSvg = doc.querySelector("svg");

    if (!importedSvg) throw new Error("SVG inválido");

    // Copia viewBox e conteúdo do SVG original
    const vb = importedSvg.getAttribute("viewBox") || "0 0 1000 1000";
    svgRoot.setAttribute("viewBox", vb);
    svgRoot.innerHTML = ""; // limpa

    // move todos os filhos
    while (importedSvg.firstChild) {
      svgRoot.appendChild(importedSvg.firstChild);
    }

    // Encontra o path principal (se houver mais de um, pega o primeiro)
    const mainPath = svgRoot.querySelector("path");
    if (!mainPath) {
      console.error("Nenhum <path> encontrado na pista");
      return;
    }

    // Amostra pontos ao longo do path
    const totalLen = mainPath.getTotalLength();
    const steps    = 800; // quanto maior, mais suave o movimento
    trackPoints = [];
    for (let i = 0; i < steps; i++) {
      const p = mainPath.getPointAtLength((i / steps) * totalLen);
      trackPoints.push({ x: p.x, y: p.y });
    }

    // Cria os carrinhos dentro do próprio SVG
    createSvgCars(svgRoot);

    // Inicia animação
    startAnimation();
  } catch (err) {
    console.error(err);
  }
}

function createSvgCars(svgRoot) {
  // remove carros antigos, se houver
  const oldCars = svgRoot.querySelectorAll(".car-dot");
  oldCars.forEach(el => el.remove());

  const c1 = document.createElementNS(SVG_NS, "circle");
  c1.setAttribute("r", "6");
  c1.setAttribute("class", "car-dot car-dot-1");
  c1.setAttribute("fill", teamColor);

  const c2 = document.createElementNS(SVG_NS, "circle");
  c2.setAttribute("r", "6");
  c2.setAttribute("class", "car-dot car-dot-2");
  c2.setAttribute("fill", teamColor);

  svgRoot.appendChild(c1);
  svgRoot.appendChild(c2);
}

// ------------------------
// 6. Animação dos carros
// ------------------------
function startAnimation() {
  if (!trackPoints.length) return;
  lastFrameTs = null;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(frame);
}

function frame(ts) {
  if (!lastFrameTs) lastFrameTs = ts;
  const dt = (ts - lastFrameTs) / 1000; // segundos
  lastFrameTs = ts;

  updateCars(dt);
  animationId = requestAnimationFrame(frame);
}

function updateCars(dt) {
  if (!trackPoints.length) return;

  const svgRoot = document.getElementById("track-svg");
  const c1 = svgRoot.querySelector(".car-dot-1");
  const c2 = svgRoot.querySelector(".car-dot-2");
  if (!c1 || !c2) return;

  cars.forEach((car, idx) => {
    // avança progress com baseSpeed * velocidade geral
    car.progress += car.baseSpeed * speedFactor * dt;

    const maxIndex = trackPoints.length;
    if (car.progress >= maxIndex) {
      car.progress -= maxIndex;
      car.lap += 1;
    }

    const point = trackPoints[Math.floor(car.progress) % maxIndex];

    if (idx === 0) {
      c1.setAttribute("cx", point.x);
      c1.setAttribute("cy", point.y);
    } else {
      c2.setAttribute("cx", point.x);
      c2.setAttribute("cy", point.y);
    }
  });
}

// ------------------------
// 7. Ligações de botões (velocidade, voltar, oficina)
// ------------------------
function bindButtons() {
  // Velocidade
  document.querySelectorAll("[data-speed-btn]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = Number(btn.dataset.speedBtn);
      setSpeed(v);
    });
  });

  // Voltar ao lobby
  const backLobby = document.querySelector("[data-back-lobby]");
  if (backLobby) {
    backLobby.addEventListener("click", () => {
      // Mantém os mesmos parâmetros básicos
      window.location.href = `lobby.html?userTeam=${encodeURIComponent(
        userTeam
      )}`;
    });
  }

  // Ir para oficina
  const toGarage = document.querySelector("[data-go-garage]");
  if (toGarage) {
    toGarage.addEventListener("click", () => {
      const url = `oficina.html?track=${encodeURIComponent(
        trackKey
      )}&gp=${encodeURIComponent(gpName)}&userTeam=${encodeURIComponent(
        userTeam
      )}`;
      window.location.href = url;
    });
  }

  // Botões de “ataque / economizar / pit stop” podem ser ligados depois
  // Aqui só evitamos erros se não existirem.
}

// ------------------------
// 8. Inicialização
// ------------------------
function initPractice() {
  fillHeaderInfo();
  fillDriverCards();
  bindButtons();
  setSpeed(1);         // começa em 1x
  updateSessionClock();
  loadTrackSvg();      // carrega pista, cria carros e inicia animação
}

document.addEventListener("DOMContentLoaded", initPractice);
