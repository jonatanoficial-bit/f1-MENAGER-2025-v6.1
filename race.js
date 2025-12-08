// ===========================
// CONFIGURAÇÕES DA CORRIDA
// ===========================

// Nº de voltas padrão da corrida (ajuste depois se quiser)
const RACE_LAPS = 10;

// Dados 2025 (mesmos da qualificação, com Bortoleto na Sauber/Audi)
const DRIVERS_2025 = [
  { code: "VER", name: "Max Verstappen", team: "Red Bull Racing",   teamKey: "redbull",  color: "#1e88e5", baseLapTime: 84,   tyreWearRate: 10,   engineWearRate: 2.5 },
  { code: "TSU", name: "Yuki Tsunoda",   team: "Red Bull Racing",   teamKey: "redbull",  color: "#42a5f5", baseLapTime: 85.5, tyreWearRate: 10,   engineWearRate: 2.5 },
  { code: "HAM", name: "Lewis Hamilton", team: "Ferrari",           teamKey: "ferrari",  color: "#e53935", baseLapTime: 85,   tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "LEC", name: "Charles Leclerc",team: "Ferrari",           teamKey: "ferrari",  color: "#ef5350", baseLapTime: 85,   tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "RUS", name: "George Russell", team: "Mercedes",          teamKey: "mercedes", color: "#00bcd4", baseLapTime: 85.2, tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "ANT", name: "Kimi Antonelli", team: "Mercedes",          teamKey: "mercedes", color: "#26c6da", baseLapTime: 85.8, tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "NOR", name: "Lando Norris",   team: "McLaren",           teamKey: "mclaren",  color: "#ff9800", baseLapTime: 85.1, tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "PIA", name: "Oscar Piastri",  team: "McLaren",           teamKey: "mclaren",  color: "#ffa726", baseLapTime: 85.3, tyreWearRate: 9.5, engineWearRate: 2.5 },
  { code: "ALO", name: "Fernando Alonso",team: "Aston Martin",      teamKey: "aston",    color: "#26a69a", baseLapTime: 86,   tyreWearRate: 10,  engineWearRate: 2.6 },
  { code: "STR", name: "Lance Stroll",   team: "Aston Martin",      teamKey: "aston",    color: "#4db6ac", baseLapTime: 86.5, tyreWearRate: 10,  engineWearRate: 2.6 },
  { code: "GAS", name: "Pierre Gasly",   team: "Alpine",            teamKey: "alpine",   color: "#ab47bc", baseLapTime: 86.3, tyreWearRate: 10.5,engineWearRate: 2.7 },
  { code: "DOO", name: "Jack Doohan",    team: "Alpine",            teamKey: "alpine",   color: "#ba68c8", baseLapTime: 86.7, tyreWearRate: 10.5,engineWearRate: 2.7 },
  { code: "ALB", name: "Alex Albon",     team: "Williams",          teamKey: "williams", color: "#1976d2", baseLapTime: 86.4, tyreWearRate: 10.5,engineWearRate: 2.7 },
  { code: "SAI", name: "Carlos Sainz",   team: "Williams",          teamKey: "williams", color: "#42a5f5", baseLapTime: 86.2, tyreWearRate: 10.5,engineWearRate: 2.7 },
  { code: "LAW", name: "Liam Lawson",    team: "Racing Bulls",      teamKey: "racingbulls",color:"#5c6bc0", baseLapTime: 86.8, tyreWearRate: 11,  engineWearRate: 2.8 },
  { code: "HAD", name: "Isack Hadjar",   team: "Racing Bulls",      teamKey: "racingbulls",color:"#7986cb", baseLapTime: 87,   tyreWearRate: 11,  engineWearRate: 2.8 },
  { code: "HUL", name: "Nico Hülkenberg",team: "Sauber / Audi",     teamKey: "sauber",   color: "#8d6e63", baseLapTime: 87,   tyreWearRate: 11.2,engineWearRate: 3 },
  { code: "BOR", name: "Gabriel Bortoleto",team:"Sauber / Audi",    teamKey: "sauber",   color: "#a1887f", baseLapTime: 87.4, tyreWearRate: 11.2,engineWearRate: 3 },
  { code: "BEA", name: "Oliver Bearman", team: "Haas",              teamKey: "haas",     color: "#cfd8dc", baseLapTime: 87.2, tyreWearRate: 11.4,engineWearRate: 3.1 },
  { code: "OCO", name: "Esteban Ocon",   team: "Haas",              teamKey: "haas",     color: "#eceff1", baseLapTime: 87.3, tyreWearRate: 11.4,engineWearRate: 3.1 }
];

// ===========================
// ESTADO DA CORRIDA
// ===========================
const raceState = {
  speedMultiplier: 1,
  cars: [],
  running: false,
  lastTimestamp: null,
  trackPath: null,
  pathLength: 0,
  svg: null,
  finished: false,
  userTeamKey: "ferrari",
  userCars: [],
  trackName: "australia",
  gpName: "",
  totalLaps: RACE_LAPS,
  podium: null
};

// ===========================
// HELPERS
// ===========================
function formatLapTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "--:--";
  const totalMs = Math.round(seconds * 1000);
  const mins = Math.floor(totalMs / 60000);
  const msRest = totalMs % 60000;
  const secs = Math.floor(msRest / 1000);
  const ms = msRest % 1000;
  const mm = String(mins).padStart(1, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function loadUserTeamKeyFromContext() {
  const params = new URLSearchParams(window.location.search);
  let userTeam = params.get("userTeam");

  if (!userTeam) {
    try {
      const stored = localStorage.getItem("f1m2025_user_team");
      if (stored) userTeam = stored;
    } catch (e) {
      // ignora
    }
  }

  if (!userTeam) userTeam = "ferrari";
  return userTeam;
}

function loadStartingGrid(trackName) {
  try {
    const key = `f1m2025_grid_${trackName}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const grid = JSON.parse(raw);
    if (!Array.isArray(grid) || !grid.length) return null;
    return grid;
  } catch (e) {
    console.warn("Erro lendo grid do localStorage:", e);
    return null;
  }
}

// distância “virtual” da corrida: lap + progress, pra ordenar
function getRaceDistance(car) {
  return car.completedLaps + car.progress;
}

// ===========================
// INICIALIZAÇÃO
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  setupSpeedButtons();

  const params = new URLSearchParams(window.location.search);
  const trackName = params.get("track") || "australia";
  const gpName = params.get("gp") || "GP da Austrália 2025";

  raceState.trackName = trackName;
  raceState.gpName = gpName;
  raceState.userTeamKey = loadUserTeamKeyFromContext();

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gpName;

  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) lapLabel.textContent = `Volta 1 / ${raceState.totalLaps}`;

  loadTrackRace(trackName);
});

// ===========================
// CONTROLE DE VELOCIDADE
// ===========================
function setupSpeedButtons() {
  const buttons = document.querySelectorAll("[data-speed]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = Number(btn.getAttribute("data-speed"));
      raceState.speedMultiplier = value || 1;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ===========================
// CARREGAR PISTA SVG
// ===========================
function loadTrackRace(trackName) {
  const container = document.getElementById("track-container");
  if (!container) return;

  fetch(`assets/tracks/${trackName}.svg`)
    .then((resp) => {
      if (!resp.ok) throw new Error("Erro ao carregar pista SVG da corrida");
      return resp.text();
    })
    .then((svgText) => {
      container.innerHTML = svgText;

      const svg = container.querySelector("svg");
      if (!svg) {
        console.error("SVG não encontrado no container (corrida)");
        return;
      }

      let trackPath =
        svg.querySelector('path[stroke-width="10"]') ||
        svg.querySelector('path[data-role="track"]');

      if (!trackPath) {
        const allPaths = svg.querySelectorAll("path");
        if (allPaths.length > 0) {
          trackPath = allPaths[0];
          console.warn(
            "Usando primeiro <path> como pista (fallback em race.js)"
          );
        }
      }

      const pitPath =
        svg.querySelector('path[stroke-width="5.5"]') ||
        svg.querySelector('path[data-role="pitlane"]') ||
        null;

      if (!trackPath) {
        console.error("Nenhum path da pista encontrado no SVG (corrida).");
        return;
      }

      // linha branca contínua do traçado
      trackPath.setAttribute("fill", "none");
      trackPath.setAttribute("stroke", "#ffffff");
      trackPath.setAttribute("stroke-opacity", "0.35");
      trackPath.setAttribute("stroke-linecap", "round");
      trackPath.setAttribute("stroke-linejoin", "round");

      if (pitPath) {
        pitPath.setAttribute("fill", "none");
        pitPath.setAttribute("stroke", "#cccccc");
        pitPath.setAttribute("stroke-opacity", "0.5");
        pitPath.setAttribute("stroke-linecap", "round");
        pitPath.setAttribute("stroke-linejoin", "round");
      }

      raceState.trackPath = trackPath;
      raceState.pathLength = trackPath.getTotalLength();
      raceState.svg = svg;

      initCarsRace();
      buildDriverCardsRace();
      initUserPanelRace();

      raceState.running = true;
      raceState.finished = false;
      raceState.lastTimestamp = null;
      requestAnimationFrame(raceStep);
    })
    .catch((err) => console.error(err));
}

// ===========================
// INICIALIZA CARROS COM GRID DA QUALY
// ===========================
function initCarsRace() {
  const svg = raceState.svg;
  const trackPath = raceState.trackPath;
  if (!svg || !trackPath) return;

  // remove carros antigos se houver
  const oldCars = svg.querySelectorAll(".car");
  oldCars.forEach((c) => c.remove());

  raceState.cars = [];
  raceState.userCars = [];

  const grid = loadStartingGrid(raceState.trackName);

  let driversOrder;
  if (grid) {
    // monta drivers na ordem do grid
    const byCode = {};
    DRIVERS_2025.forEach((d) => (byCode[d.code] = d));

    driversOrder = [];
    grid.forEach((row) => {
      const d = byCode[row.code];
      if (d) driversOrder.push(d);
    });

    // se faltar alguém no grid (segurança), adiciona no final
    DRIVERS_2025.forEach((d) => {
      if (!driversOrder.includes(d)) driversOrder.push(d);
    });
  } else {
    // se não tiver grid, usa ordem padrão da tabela
    driversOrder = [...DRIVERS_2025];
  }

  const pathLength = raceState.pathLength;

  // posiciona no grid: P1 mais à frente, P20 mais atrás
  const baseProgress = 0.0; // 0 = ponto inicial do path
  const spacing = 0.004; // distância entre carros no grid

  driversOrder.forEach((driver, index) => {
    const carElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    carElement.setAttribute("r", "4.5");
    carElement.setAttribute("class", "car");
    carElement.setAttribute("fill", driver.color || "#ffffff");
    svg.appendChild(carElement);

    const gridPosition = index + 1;
    const startProgress = baseProgress - spacing * index; // cada carro um pouco mais atrás

    const normalizedProgress =
      ((startProgress % 1) + 1) % 1; // mantém entre 0 e 1

    const carObj = {
      driver,
      element: carElement,
      path: trackPath,
      pathLength,
      progress: normalizedProgress,
      completedLaps: 0,
      currentLapTime: 0,
      bestLapTime: Infinity,
      lastLapTime: null,
      totalTime: 0,
      tyreWear: 0,
      carCondition: 100,
      engineWear: 0,
      finished: false,
      gridPosition,
      position: gridPosition,
      engineMode: "normal",
      cardElements: null,
      userPanelElements: null
    };

    // posiciona visualmente
    const distance = carObj.pathLength * carObj.progress;
    const point = carObj.path.getPointAtLength(distance);
    carObj.element.setAttribute("cx", String(point.x));
    carObj.element.setAttribute("cy", String(point.y));

    raceState.cars.push(carObj);
  });

  // define pilotos do usuário a partir da equipe escolhida
  const teamCars = raceState.cars.filter(
    (c) => c.driver.teamKey === raceState.userTeamKey
  );
  if (teamCars.length >= 2) {
    raceState.userCars = [teamCars[0], teamCars[1]];
  } else if (teamCars.length === 1) {
    raceState.userCars = [teamCars[0], raceState.cars[0]];
  } else {
    raceState.userCars = [raceState.cars[0], raceState.cars[1]];
  }
}

// ===========================
// HUD – LISTA DE PILOTOS
// ===========================
function buildDriverCardsRace() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  list.innerHTML = "";

  raceState.cars.forEach((car) => {
    const d = car.driver;
    const faceSrc = `assets/faces/${d.code}.png`;
    const teamLogoSrc = `assets/teams/${d.teamKey}.png`;

    const card = document.createElement("div");
    card.className = "driver-card";

    card.innerHTML = `
      <div class="driver-pos" data-field="pos">--</div>
      <img class="driver-team-logo" src="${teamLogoSrc}" alt="${d.team}" />
      <img class="driver-face" src="${faceSrc}" alt="${d.name}" />
      <div class="driver-info">
        <div class="driver-name-text">${d.name}</div>
        <div class="driver-team-text">${d.team}</div>
      </div>
      <div class="driver-stats">
        <div class="stat-line">
          <span>Voltas</span>
          <span data-field="laps">0 / ${raceState.totalLaps}</span>
        </div>
        <div class="stat-line">
          <span>Gap</span>
          <span data-field="gap">Líder</span>
        </div>
        <div class="stat-line">
          <span>Pneus</span>
          <span data-field="tyre">100%</span>
        </div>
        <div class="stat-line">
          <span>Carro</span>
          <span data-field="car">100%</span>
        </div>
      </div>
    `;

    list.appendChild(card);

    car.cardElements = {
      card,
      posEl: card.querySelector('[data-field="pos"]'),
      lapsEl: card.querySelector('[data-field="laps"]'),
      gapEl: card.querySelector('[data-field="gap"]'),
      tyreEl: card.querySelector('[data-field="tyre"]'),
      carEl: card.querySelector('[data-field="car"]')
    };
  });
}

// ===========================
// PAINEL DO USUÁRIO
// ===========================
function initUserPanelRace() {
  raceState.userCars.forEach((car, index) => {
    const d = car.driver;

    const faceEl = document.getElementById(`user-face-${index}`);
    const nameEl = document.getElementById(`user-name-${index}`);
    const teamEl = document.getElementById(`user-team-${index}`);
    const lapsEl = document.getElementById(`user-laps-${index}`);
    const bestEl = document.getElementById(`user-best-${index}`);
    const card = document.getElementById(`user-driver-card-${index}`);

    if (!card) return;

    const faceSrc = `assets/faces/${d.code}.png`;

    if (faceEl) faceEl.src = faceSrc;
    if (nameEl) nameEl.textContent = d.name;
    if (teamEl) teamEl.textContent = d.team;
    if (lapsEl) lapsEl.textContent = "0";
    if (bestEl) bestEl.textContent = "--:--";

    const buttons = card.querySelectorAll(".user-btn.mode");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        handleUserModeRace(index, action, btn, card);
      });
    });

    const pitBtn = card.querySelector(".user-btn-pit");
    if (pitBtn) {
      pitBtn.addEventListener("click", () => handlePitStopRequest(index));
    }

    car.userPanelElements = {
      card,
      lapsEl,
      bestEl,
      buttons,
      pitBtn
    };
  });
}

// OBS: o HTML dos botões de PIT precisa ter a classe .user-btn-pit
// (se ainda não tiver, depois ajustamos esse detalhe visual).

function handleUserModeRace(userIndex, action, btn, card) {
  const car = raceState.userCars[userIndex];
  if (!car || car.finished) return;

  if (action === "push") {
    car.engineMode = "push";
  } else if (action === "save") {
    car.engineMode = "save";
  } else if (action === "normal") {
    car.engineMode = "normal";
  }

  const buttons = card.querySelectorAll(".user-btn.mode");
  buttons.forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

function handlePitStopRequest(userIndex) {
  // Por enquanto, só regista que ele vai fazer pit na próxima volta.
  const car = raceState.userCars[userIndex];
  if (!car || car.finished) return;
  car.requestPitStop = true;
}

// ===========================
// LOOP DA CORRIDA
// ===========================
function raceStep(timestamp) {
  if (!raceState.running) return;

  if (raceState.lastTimestamp == null) {
    raceState.lastTimestamp = timestamp;
  }

  const deltaMs = timestamp - raceState.lastTimestamp;
  const dt = deltaMs / 1000;

  raceState.lastTimestamp = timestamp;

  updateCarsRace(dt);
  updateHudRace();

  if (!raceState.finished) {
    requestAnimationFrame(raceStep);
  }
}

// ===========================
// ATUALIZAÇÃO DOS CARROS
// ===========================
function updateCarsRace(dt) {
  const multiplier = raceState.speedMultiplier || 1;

  raceState.cars.forEach((car) => {
    if (car.finished) return;

    car.totalTime += dt;
    car.currentLapTime += dt;

    // modos de motor
    let paceFactor = 1;
    let tyreFactor = 1;
    let carDamageFactor = 1;

    if (car.engineMode === "push") {
      paceFactor = 0.96;
      tyreFactor = 1.3;
      carDamageFactor = 1.2;
    } else if (car.engineMode === "save") {
      paceFactor = 1.06;
      tyreFactor = 0.7;
      carDamageFactor = 0.8;
    }

    // desgaste afeta tempo básico
    const tyrePenalty = 1 + car.tyreWear / 300;      // quanto mais gasto, mais lento
    const damagePenalty = 1 + (100 - car.carCondition) / 400;

    const effectiveLapTime =
      (car.driver.baseLapTime *
        tyrePenalty *
        damagePenalty *
        paceFactor) /
      multiplier;

    const deltaProgress = dt / effectiveLapTime;
    let newProgress = car.progress + deltaProgress;

    // desgaste
    car.tyreWear += deltaProgress * car.driver.tyreWearRate * tyreFactor;
    if (car.tyreWear > 100) car.tyreWear = 100;

    car.carCondition -= deltaProgress * carDamageFactor * 0.8;
    if (car.carCondition < 0) car.carCondition = 0;

    // completou volta
    if (newProgress >= 1) {
      car.completedLaps += 1;
      newProgress -= 1;

      car.lastLapTime = car.currentLapTime;
      if (car.currentLapTime < car.bestLapTime) {
        car.bestLapTime = car.currentLapTime;
      }
      car.currentLapTime = 0;

      // pit stop simples: se pediu, reseta pneus e um pouco de carro
      if (car.requestPitStop) {
        car.tyreWear = 0;
        car.carCondition = Math.min(100, car.carCondition + 20);
        car.requestPitStop = false;
      }

      if (car.completedLaps >= raceState.totalLaps) {
        car.finished = true;
        car.progress = 1;
        const distanceEnd = car.pathLength * 0.999;
        const pointEnd = car.path.getPointAtLength(distanceEnd);
        car.element.setAttribute("cx", String(pointEnd.x));
        car.element.setAttribute("cy", String(pointEnd.y));
        return;
      }
    }

    car.progress = newProgress;

    const distance = car.pathLength * car.progress;
    const point = car.path.getPointAtLength(distance);
    car.element.setAttribute("cx", String(point.x));
    car.element.setAttribute("cy", String(point.y));
  });

  const allFinished = raceState.cars.every((c) => c.finished);
  if (allFinished && !raceState.finished) {
    raceState.finished = true;
    raceState.running = false;
    handleRaceEnd();
  }
}

// ===========================
// HUD DA CORRIDA
// ===========================
function updateHudRace() {
  if (!raceState.cars.length) return;

  const list = document.getElementById("drivers-list");
  if (!list) return;

  // ordena por distância de corrida
  const ordered = [...raceState.cars].sort((a, b) => {
    const da = getRaceDistance(b);
    const db = getRaceDistance(a);
    return da - db;
  });

  ordered.forEach((car, index) => {
    car.position = index + 1;
  });

  const leader = ordered[0];

  const maxLap = ordered.reduce(
    (max, car) => Math.max(max, car.completedLaps),
    0
  );
  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    const currentLap = Math.min(
      Math.max(1, maxLap + 1),
      raceState.totalLaps
    );
    lapLabel.textContent = `Volta ${currentLap} / ${raceState.totalLaps}`;
  }

  // reordena DOM
  ordered.forEach((car) => {
    const els = car.cardElements;
    if (!els) return;
    list.appendChild(els.card);
  });

  // atualiza cards
  ordered.forEach((car) => {
    const els = car.cardElements;
    if (!els) return;

    els.card.classList.toggle("leader", car.position === 1);

    if (els.posEl) els.posEl.textContent = car.position + "º";
    if (els.lapsEl)
      els.lapsEl.textContent = `${car.completedLaps}/${raceState.totalLaps}`;

    // gap aproximado em segundos
    if (els.gapEl) {
      if (car === leader) {
        els.gapEl.textContent = "Líder";
      } else {
        const distLeader = getRaceDistance(leader);
        const distCar = getRaceDistance(car);
        const gapLaps = distLeader - distCar; // >0
        const avgLap = leader.bestLapTime && isFinite(leader.bestLapTime)
          ? leader.bestLapTime
          : leader.driver.baseLapTime;
        const gapSec = gapLaps * avgLap;
        els.gapEl.textContent = `+${gapSec.toFixed(1)}s`;
      }
    }

    if (els.tyreEl)
      els.tyreEl.textContent = `${Math.round(100 - car.tyreWear)}%`;
    if (els.carEl)
      els.carEl.textContent = `${Math.round(car.carCondition)}%`;
  });

  updateUserPanelRaceHUD();
}

function updateUserPanelRaceHUD() {
  raceState.userCars.forEach((car, index) => {
    const els = car.userPanelElements;
    if (!els) return;

    if (els.lapsEl)
      els.lapsEl.textContent = String(car.completedLaps);
    if (els.bestEl)
      els.bestEl.textContent = formatLapTime(car.bestLapTime);
  });
}

// ===========================
// FIM DA CORRIDA / PÓDIO
// ===========================
function handleRaceEnd() {
  const ordered = [...raceState.cars].sort((a, b) => {
    const da = getRaceDistance(b);
    const db = getRaceDistance(a);
    return da - db;
  });

  raceState.podium = ordered.slice(0, 3).map((car, index) => ({
    pos: index + 1,
    code: car.driver.code,
    name: car.driver.name,
    team: car.driver.team,
    teamKey: car.driver.teamKey
  }));

  showPodiumModal();
}

function showPodiumModal() {
  const modal = document.getElementById("race-podium-modal");
  const container = document.getElementById("race-podium-results");
  if (!modal || !container || !raceState.podium) return;

  container.innerHTML = "";

  raceState.podium.forEach((row) => {
    const item = document.createElement("div");
    item.className = "driver-card";
    const faceSrc = `assets/faces/${row.code}.png`;
    const teamLogoSrc = `assets/teams/${row.teamKey}.png`;

    item.innerHTML = `
      <div class="driver-pos">${row.pos}º</div>
      <img class="driver-team-logo" src="${teamLogoSrc}" alt="${row.team}" />
      <img class="driver-face" src="${faceSrc}" alt="${row.name}" />
      <div class="driver-info">
        <div class="driver-name-text">${row.name}</div>
        <div class="driver-team-text">${row.team}</div>
      </div>
    `;

    container.appendChild(item);
  });

  modal.classList.remove("hidden");
}

function closeRacePodiumModal() {
  const modal = document.getElementById("race-podium-modal");
  if (modal) modal.classList.add("hidden");
}
