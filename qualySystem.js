// ===========================
// CONFIGURAÇÕES DA CLASSIFICAÇÃO
// ===========================
const QUALY_LAPS = 6; // nº de voltas simuladas na sessão

// Mesmo grid de 2025 da corrida (reutilizado)
const DRIVERS_2025 = [
  {
    code: "VER",
    name: "Max Verstappen",
    team: "Red Bull Racing",
    teamKey: "redbull",
    color: "#1e88e5",
    baseLapTime: 84,
    tyreWearRate: 10,
    engineWearRate: 2.5
  },
  {
    code: "TSU",
    name: "Yuki Tsunoda",
    team: "Red Bull Racing",
    teamKey: "redbull",
    color: "#42a5f5",
    baseLapTime: 85.5,
    tyreWearRate: 10,
    engineWearRate: 2.5
  },
  {
    code: "HAM",
    name: "Lewis Hamilton",
    team: "Ferrari",
    teamKey: "ferrari",
    color: "#e53935",
    baseLapTime: 85,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "LEC",
    name: "Charles Leclerc",
    team: "Ferrari",
    teamKey: "ferrari",
    color: "#ef5350",
    baseLapTime: 85,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "RUS",
    name: "George Russell",
    team: "Mercedes",
    teamKey: "mercedes",
    color: "#00bcd4",
    baseLapTime: 85.2,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "ANT",
    name: "Kimi Antonelli",
    team: "Mercedes",
    teamKey: "mercedes",
    color: "#26c6da",
    baseLapTime: 85.8,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "NOR",
    name: "Lando Norris",
    team: "McLaren",
    teamKey: "mclaren",
    color: "#ff9800",
    baseLapTime: 85.1,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "PIA",
    name: "Oscar Piastri",
    team: "McLaren",
    teamKey: "mclaren",
    color: "#ffa726",
    baseLapTime: 85.3,
    tyreWearRate: 9.5,
    engineWearRate: 2.5
  },
  {
    code: "ALO",
    name: "Fernando Alonso",
    team: "Aston Martin",
    teamKey: "aston",
    color: "#26a69a",
    baseLapTime: 86,
    tyreWearRate: 10,
    engineWearRate: 2.6
  },
  {
    code: "STR",
    name: "Lance Stroll",
    team: "Aston Martin",
    teamKey: "aston",
    color: "#4db6ac",
    baseLapTime: 86.5,
    tyreWearRate: 10,
    engineWearRate: 2.6
  },
  {
    code: "GAS",
    name: "Pierre Gasly",
    team: "Alpine",
    teamKey: "alpine",
    color: "#ab47bc",
    baseLapTime: 86.3,
    tyreWearRate: 10.5,
    engineWearRate: 2.7
  },
  {
    code: "DOO",
    name: "Jack Doohan",
    team: "Alpine",
    teamKey: "alpine",
    color: "#ba68c8",
    baseLapTime: 86.7,
    tyreWearRate: 10.5,
    engineWearRate: 2.7
  },
  {
    code: "ALB",
    name: "Alex Albon",
    team: "Williams",
    teamKey: "williams",
    color: "#1976d2",
    baseLapTime: 86.4,
    tyreWearRate: 10.5,
    engineWearRate: 2.7
  },
  {
    code: "SAI",
    name: "Carlos Sainz",
    team: "Williams",
    teamKey: "williams",
    color: "#42a5f5",
    baseLapTime: 86.2,
    tyreWearRate: 10.5,
    engineWearRate: 2.7
  },
  {
    code: "LAW",
    name: "Liam Lawson",
    team: "Racing Bulls",
    teamKey: "racingbulls",
    color: "#5c6bc0",
    baseLapTime: 86.8,
    tyreWearRate: 11,
    engineWearRate: 2.8
  },
  {
    code: "HAD",
    name: "Isack Hadjar",
    team: "Racing Bulls",
    teamKey: "racingbulls",
    color: "#7986cb",
    baseLapTime: 87,
    tyreWearRate: 11,
    engineWearRate: 2.8
  },
  {
    code: "HUL",
    name: "Nico Hülkenberg",
    team: "Sauber / Audi",
    teamKey: "sauber",
    color: "#8d6e63",
    baseLapTime: 87,
    tyreWearRate: 11.2,
    engineWearRate: 3
  },
  {
    code: "BOR",
    name: "Gabriel Bortoleto",
    team: "Sauber / Audi",
    teamKey: "sauber",
    color: "#a1887f",
    baseLapTime: 87.4,
    tyreWearRate: 11.2,
    engineWearRate: 3
  },
  {
    code: "BEA",
    name: "Oliver Bearman",
    team: "Haas",
    teamKey: "haas",
    color: "#cfd8dc",
    baseLapTime: 87.2,
    tyreWearRate: 11.4,
    engineWearRate: 3.1
  },
  {
    code: "OCO",
    name: "Esteban Ocon",
    team: "Haas",
    teamKey: "haas",
    color: "#eceff1",
    baseLapTime: 87.3,
    tyreWearRate: 11.4,
    engineWearRate: 3.1
  }
];

// ===========================
// ESTADO DA SESSÃO DE QUALY
// ===========================
const qualyState = {
  speedMultiplier: 1,
  cars: [],
  running: false,
  lastTimestamp: null,
  trackPath: null,
  pitPath: null,
  finished: false,
  userTeamKey: "ferrari",
  userCars: [],
  trackName: "australia"
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

// ===========================
// INICIALIZAÇÃO
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  setupSpeedButtons();

  const params = new URLSearchParams(window.location.search);
  const trackName = params.get("track") || "australia";
  const gpName = params.get("gp") || "GP da Austrália 2025";
  qualyState.userTeamKey = params.get("userTeam") || "ferrari";
  qualyState.trackName = trackName;

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = `Classificação – ${gpName}`;

  const lapLabel = document.getElementById("qualy-lap-label");
  if (lapLabel) lapLabel.textContent = `Volta 1 / ${QUALY_LAPS}`;

  loadTrackQualy(trackName);
});

// ===========================
// CONTROLES DE VELOCIDADE
// ===========================
function setupSpeedButtons() {
  const buttons = document.querySelectorAll("[data-speed]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = Number(btn.getAttribute("data-speed"));
      qualyState.speedMultiplier = value || 1;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ===========================
// CARREGAR PISTA SVG (igual corrida, com linha branca)
// ===========================
function loadTrackQualy(trackName) {
  const container = document.getElementById("track-container");
  if (!container) return;

  fetch(`assets/tracks/${trackName}.svg`)
    .then((resp) => {
      if (!resp.ok) throw new Error("Erro ao carregar pista SVG");
      return resp.text();
    })
    .then((svgText) => {
      container.innerHTML = svgText;

      const svg = container.querySelector("svg");
      if (!svg) {
        console.error("SVG não encontrado no container");
        return;
      }

      const trackPath = svg.querySelector('path[stroke-width="10"]');
      const pitPath = svg.querySelector('path[stroke-width="5.5"]');

      if (!trackPath) {
        console.error('Path da pista não encontrado (stroke-width="10")');
        return;
      }

      // linha branca contínua
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

      qualyState.trackPath = trackPath;
      qualyState.pitPath = pitPath || null;

      initCarsQualy(svg, trackPath);
      buildDriverCardsQualy();
      initUserPanelQualy();
      startQualyLoop();
    })
    .catch((err) => console.error(err));
}

// ===========================
// INICIALIZA CARROS
// ===========================
function initCarsQualy(svg, trackPath) {
  qualyState.cars = [];
  qualyState.lastTimestamp = null;
  qualyState.finished = false;
  qualyState.userCars = [];

  const trackLength = trackPath.getTotalLength();

  DRIVERS_2025.forEach((driver, index) => {
    const carElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    carElement.setAttribute("r", "4.5");
    carElement.setAttribute("class", "car");
    carElement.setAttribute("fill", driver.color || "#ffffff");
    svg.appendChild(carElement);

    const startProgress =
      (index / DRIVERS_2025.length) * 0.9 + Math.random() * 0.02;

    const carObj = {
      driver,
      element: carElement,
      path: trackPath,
      pathLength: trackLength,
      progress: startProgress % 1,
      lap: 0,
      totalTime: 0,
      currentLapTime: 0,
      bestLapTime: Infinity,
      lastLapTime: null,
      tyreWear: 0,
      engineWear: 0,
      finished: false,
      position: index + 1,
      engineMode: "normal",
      cardElements: null,
      userPanelElements: null
    };

    qualyState.cars.push(carObj);
  });

  const teamCars = qualyState.cars.filter(
    (c) => c.driver.teamKey === qualyState.userTeamKey
  );
  if (teamCars.length >= 2) {
    qualyState.userCars = [teamCars[0], teamCars[1]];
  } else {
    qualyState.userCars = [qualyState.cars[0], qualyState.cars[1]];
  }
}

// ===========================
// HUD – LISTA DE PILOTOS
// ===========================
function buildDriverCardsQualy() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  list.innerHTML = "";

  qualyState.cars.forEach((car) => {
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
          <span data-field="laps">0 / ${QUALY_LAPS}</span>
        </div>
        <div class="stat-line">
          <span>Melhor</span>
          <span data-field="best">--:--</span>
        </div>
        <div class="stat-line">
          <span>Última</span>
          <span data-field="last">--:--</span>
        </div>
      </div>
    `;

    list.appendChild(card);

    car.cardElements = {
      card,
      posEl: card.querySelector('[data-field="pos"]'),
      lapsEl: card.querySelector('[data-field="laps"]'),
      bestEl: card.querySelector('[data-field="best"]'),
      lastEl: card.querySelector('[data-field="last"]')
    };
  });
}

// ===========================
// PAINEL DO USUÁRIO
// ===========================
function initUserPanelQualy() {
  qualyState.userCars.forEach((car, index) => {
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
        handleUserModeQualy(index, action, btn, card);
      });
    });

    car.userPanelElements = {
      card,
      lapsEl,
      bestEl,
      buttons
    };
  });
}

function handleUserModeQualy(userIndex, action, btn, card) {
  const car = qualyState.userCars[userIndex];
  if (!car || car.finished) return;

  if (action === "push") {
    car.engineMode = "push";
  } else if (action === "save") {
    car.engineMode = "save";
  }

  const buttons = card.querySelectorAll(".user-btn.mode");
  buttons.forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// ===========================
// LOOP DA QUALIFICAÇÃO
// ===========================
function startQualyLoop() {
  if (!qualyState.running) {
    qualyState.running = true;
    requestAnimationFrame(qualyStep);
  }
}

function qualyStep(timestamp) {
  if (!qualyState.running) return;

  if (qualyState.lastTimestamp == null) {
    qualyState.lastTimestamp = timestamp;
  }

  const deltaMs = timestamp - qualyState.lastTimestamp;
  const dt = deltaMs / 1000;

  qualyState.lastTimestamp = timestamp;

  updateCarsQualy(dt);
  updateHudQualy();

  if (!qualyState.finished) {
    requestAnimationFrame(qualyStep);
  }
}

// ===========================
// ATUALIZAÇÃO DOS CARROS
// ===========================
function updateCarsQualy(dt) {
  const multiplier = qualyState.speedMultiplier || 1;

  qualyState.cars.forEach((car) => {
    if (car.finished) return;

    car.totalTime += dt;
    car.currentLapTime += dt;

    // motor modos
    let paceFactor = 1;
    let tyreFactor = 1;
    let engineFactor = 1;

    if (car.engineMode === "push") {
      paceFactor = 0.96;
      tyreFactor = 1.3;
      engineFactor = 1.3;
    } else if (car.engineMode === "save") {
      paceFactor = 1.06;
      tyreFactor = 0.7;
      engineFactor = 0.8;
    }

    const effectiveLapTime =
      (car.driver.baseLapTime *
        (1 + car.engineWear / 200) *
        paceFactor) /
      multiplier;

    const deltaProgress = dt / effectiveLapTime;
    let newProgress = car.progress + deltaProgress;

    // desgaste leve (apenas para futuro)
    car.tyreWear += deltaProgress * car.driver.tyreWearRate * tyreFactor;
    car.engineWear += deltaProgress * car.driver.engineWearRate * engineFactor;

    if (car.tyreWear > 100) car.tyreWear = 100;
    if (car.engineWear > 100) car.engineWear = 100;

    // completou volta
    if (newProgress >= 1) {
      car.lap += 1;
      newProgress -= 1;

      // registra volta
      car.lastLapTime = car.currentLapTime;
      if (car.currentLapTime < car.bestLapTime) {
        car.bestLapTime = car.currentLapTime;
      }
      car.currentLapTime = 0;

      if (car.lap >= QUALY_LAPS) {
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

  const allFinished = qualyState.cars.every((c) => c.finished);
  if (allFinished && !qualyState.finished) {
    qualyState.finished = true;
    saveGridAndShowResults();
  }
}

// ===========================
// HUD DINÂMICA
// ===========================
function updateHudQualy() {
  if (!qualyState.cars.length) return;

  const list = document.getElementById("drivers-list");
  if (!list) return;

  // ordena por melhor volta (menor primeiro)
  const ordered = [...qualyState.cars].sort((a, b) => {
    const aBest = isFinite(a.bestLapTime) ? a.bestLapTime : 999999;
    const bBest = isFinite(b.bestLapTime) ? b.bestLapTime : 999999;
    if (aBest !== bBest) return aBest - bBest;

    // se ninguém tem volta, ordena por tempo total (só pra não ficar bagunça)
    return a.totalTime - b.totalTime;
  });

  ordered.forEach((car, index) => {
    car.position = index + 1;
  });

  // volta atual (pela maior volta de alguém)
  const maxLap = ordered.reduce((max, car) => Math.max(max, car.lap), 0);
  const lapLabel = document.getElementById("qualy-lap-label");
  if (lapLabel) {
    const currentLap = Math.min(Math.max(1, maxLap + 1), QUALY_LAPS);
    lapLabel.textContent = `Volta ${currentLap} / ${QUALY_LAPS}`;
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
      els.lapsEl.textContent = `${car.lap}/${QUALY_LAPS}`;
    if (els.bestEl)
      els.bestEl.textContent = formatLapTime(car.bestLapTime);
    if (els.lastEl)
      els.lastEl.textContent = formatLapTime(car.lastLapTime);
  });

  // painel do usuário
  updateUserPanelQualy();
}

function updateUserPanelQualy() {
  qualyState.userCars.forEach((car, index) => {
    const els = car.userPanelElements;
    if (!els) return;

    if (els.lapsEl) els.lapsEl.textContent = String(car.lap);
    if (els.bestEl) els.bestEl.textContent = formatLapTime(car.bestLapTime);

    if (els.buttons) {
      els.buttons.forEach((b) => {
        const action = b.getAttribute("data-action");
        const isPush = action === "push" && car.engineMode === "push";
        const isSave = action === "save" && car.engineMode === "save";
        if (isPush || isSave) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
    }
  });
}

// ===========================
// SALVAR GRID E MOSTRAR RESULTADO
// ===========================
function saveGridAndShowResults() {
  const ordered = [...qualyState.cars].sort((a, b) => {
    const aBest = isFinite(a.bestLapTime) ? a.bestLapTime : 999999;
    const bBest = isFinite(b.bestLapTime) ? b.bestLapTime : 999999;
    if (aBest !== bBest) return aBest - bBest;
    return a.totalTime - b.totalTime;
  });

  // monta grid simples: P1..P20
  const grid = ordered.map((car, index) => ({
    position: index + 1,
    code: car.driver.code,
    name: car.driver.name,
    teamKey: car.driver.teamKey,
    team: car.driver.team,
    bestLapTime: car.bestLapTime
  }));

  try {
    const key = `f1m2025_grid_${qualyState.trackName}`;
    localStorage.setItem(key, JSON.stringify(grid));
    console.log("Grid salvo em localStorage:", key, grid);
  } catch (e) {
    console.warn("Não foi possível salvar grid no localStorage:", e);
  }

  showQualyModal(grid);
}

function showQualyModal(grid) {
  const modal = document.getElementById("qualy-modal");
  const container = document.getElementById("qualy-results");
  if (!modal || !container) return;

  container.innerHTML = "";

  grid.forEach((row) => {
    const line = document.createElement("div");
    line.className = "driver-card";
    line.style.fontSize = "11px";

    const faceSrc = `assets/faces/${row.code}.png`;
    const teamLogoSrc = `assets/teams/${row.teamKey}.png`;

    line.innerHTML = `
      <div class="driver-pos">${row.position}º</div>
      <img class="driver-team-logo" src="${teamLogoSrc}" alt="${row.team}" />
      <img class="driver-face" src="${faceSrc}" alt="${row.name}" />
      <div class="driver-info">
        <div class="driver-name-text">${row.name}</div>
        <div class="driver-team-text">${row.team}</div>
      </div>
      <div class="driver-stats">
        <div class="stat-line">
          <span>Melhor volta</span>
          <span>${formatLapTime(row.bestLapTime)}</span>
        </div>
      </div>
    `;

    container.appendChild(line);
  });

  modal.classList.remove("hidden");
}

function closeQualyModal() {
  const modal = document.getElementById("qualy-modal");
  if (modal) modal.classList.add("hidden");
}
