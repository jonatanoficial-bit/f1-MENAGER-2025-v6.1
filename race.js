// ===========================
// CONFIGURAÇÃO DA CORRIDA
// ===========================
const TOTAL_LAPS = 10;
const PIT_WEAR_THRESHOLD = 70; // % a partir do qual o piloto decide parar
const PIT_STOP_DURATION = 3.0; // segundos parado no box

// Grid oficial 2025 (20 pilotos, incluindo Bortoleto na Sauber) :contentReference[oaicite:1]{index=1}
const DRIVERS_2025 = [
  {
    code: "VER",
    name: "Max Verstappen",
    team: "Red Bull Racing",
    teamKey: "redbull",
    color: "#1e88e5",
    baseLapTime: 84,
    tyreWearRate: 12,
    engineWearRate: 3
  },
  {
    code: "TSU",
    name: "Yuki Tsunoda",
    team: "Red Bull Racing",
    teamKey: "redbull",
    color: "#42a5f5",
    baseLapTime: 85.5,
    tyreWearRate: 12,
    engineWearRate: 3
  },
  {
    code: "HAM",
    name: "Lewis Hamilton",
    team: "Ferrari",
    teamKey: "ferrari",
    color: "#e53935",
    baseLapTime: 85,
    tyreWearRate: 11.5,
    engineWearRate: 3
  },
  {
    code: "LEC",
    name: "Charles Leclerc",
    team: "Ferrari",
    teamKey: "ferrari",
    color: "#ef5350",
    baseLapTime: 85,
    tyreWearRate: 11.5,
    engineWearRate: 3
  },
  {
    code: "RUS",
    name: "George Russell",
    team: "Mercedes",
    teamKey: "mercedes",
    color: "#00bcd4",
    baseLapTime: 85.2,
    tyreWearRate: 11,
    engineWearRate: 3
  },
  {
    code: "ANT",
    name: "Kimi Antonelli",
    team: "Mercedes",
    teamKey: "mercedes",
    color: "#26c6da",
    baseLapTime: 85.8,
    tyreWearRate: 11,
    engineWearRate: 3
  },
  {
    code: "NOR",
    name: "Lando Norris",
    team: "McLaren",
    teamKey: "mclaren",
    color: "#ff9800",
    baseLapTime: 85.1,
    tyreWearRate: 11.5,
    engineWearRate: 3
  },
  {
    code: "PIA",
    name: "Oscar Piastri",
    team: "McLaren",
    teamKey: "mclaren",
    color: "#ffa726",
    baseLapTime: 85.3,
    tyreWearRate: 11.5,
    engineWearRate: 3
  },
  {
    code: "ALO",
    name: "Fernando Alonso",
    team: "Aston Martin",
    teamKey: "aston",
    color: "#26a69a",
    baseLapTime: 86,
    tyreWearRate: 12,
    engineWearRate: 3
  },
  {
    code: "STR",
    name: "Lance Stroll",
    team: "Aston Martin",
    teamKey: "aston",
    color: "#4db6ac",
    baseLapTime: 86.5,
    tyreWearRate: 12,
    engineWearRate: 3
  },
  {
    code: "GAS",
    name: "Pierre Gasly",
    team: "Alpine",
    teamKey: "alpine",
    color: "#ab47bc",
    baseLapTime: 86.3,
    tyreWearRate: 12.5,
    engineWearRate: 3
  },
  {
    code: "DOO",
    name: "Jack Doohan",
    team: "Alpine",
    teamKey: "alpine",
    color: "#ba68c8",
    baseLapTime: 86.7,
    tyreWearRate: 12.5,
    engineWearRate: 3
  },
  {
    code: "ALB",
    name: "Alex Albon",
    team: "Williams",
    teamKey: "williams",
    color: "#1976d2",
    baseLapTime: 86.4,
    tyreWearRate: 12.5,
    engineWearRate: 3
  },
  {
    code: "SAI",
    name: "Carlos Sainz",
    team: "Williams",
    teamKey: "williams",
    color: "#42a5f5",
    baseLapTime: 86.2,
    tyreWearRate: 12.5,
    engineWearRate: 3
  },
  {
    code: "LAW",
    name: "Liam Lawson",
    team: "Racing Bulls",
    teamKey: "racingbulls",
    color: "#5c6bc0",
    baseLapTime: 86.8,
    tyreWearRate: 12.8,
    engineWearRate: 3.2
  },
  {
    code: "HAD",
    name: "Isack Hadjar",
    team: "Racing Bulls",
    teamKey: "racingbulls",
    color: "#7986cb",
    baseLapTime: 87,
    tyreWearRate: 12.8,
    engineWearRate: 3.2
  },
  {
    code: "HUL",
    name: "Nico Hülkenberg",
    team: "Sauber / Audi",
    teamKey: "sauber",
    color: "#8d6e63",
    baseLapTime: 87,
    tyreWearRate: 13,
    engineWearRate: 3.5
  },
  {
    code: "BOR",
    name: "Gabriel Bortoleto",
    team: "Sauber / Audi",
    teamKey: "sauber",
    color: "#a1887f",
    baseLapTime: 87.4,
    tyreWearRate: 13,
    engineWearRate: 3.5
  },
  {
    code: "BEA",
    name: "Oliver Bearman",
    team: "Haas",
    teamKey: "haas",
    color: "#cfd8dc",
    baseLapTime: 87.2,
    tyreWearRate: 13.2,
    engineWearRate: 3.6
  },
  {
    code: "OCO",
    name: "Esteban Ocon",
    team: "Haas",
    teamKey: "haas",
    color: "#eceff1",
    baseLapTime: 87.3,
    tyreWearRate: 13.2,
    engineWearRate: 3.6
  }
];

// ===========================
// ESTADO GLOBAL
// ===========================
const raceState = {
  speedMultiplier: 1,
  cars: [],
  running: false,
  lastTimestamp: null,
  trackPath: null,
  pitPath: null,
  finished: false
};

document.addEventListener("DOMContentLoaded", () => {
  setupSpeedButtons();

  const params = new URLSearchParams(window.location.search);
  const trackName = params.get("track") || "australia";
  const gpName = params.get("gp") || "GP da Austrália 2025";

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gpName;

  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) lapLabel.textContent = `Volta 1 / ${TOTAL_LAPS}`;

  loadTrack(trackName);
});

// ===========================
// CONTROLES DE VELOCIDADE
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
function loadTrack(trackName) {
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
        console.error("SVG não encontrado dentro do container");
        return;
      }

      const trackPath = svg.querySelector('path[stroke-width="10"]');
      const pitPath = svg.querySelector('path[stroke-width="5.5"]');

      if (!trackPath) {
        console.error(
          'Path principal da pista não encontrado (stroke-width="10")'
        );
        return;
      }

      raceState.trackPath = trackPath;
      raceState.pitPath = pitPath || null;

      initCars(svg, trackPath);
      buildDriverCards();
      startRaceLoop();
    })
    .catch((err) => console.error(err));
}

// ===========================
// INICIALIZAÇÃO DOS CARROS
// ===========================
function initCars(svg, trackPath) {
  raceState.cars = [];
  raceState.lastTimestamp = null;
  raceState.finished = false;

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

    raceState.cars.push({
      driver,
      element: carElement,
      path: trackPath,
      pathLength: trackLength,
      progress: startProgress % 1,
      lap: 0,
      totalTime: 0,
      tyreWear: 0,
      engineWear: 0,
      inPit: false,
      pitTimer: 0,
      finished: false,
      position: index + 1,
      cardElements: null
    });
  });
}

// ===========================
// CRIAÇÃO DOS CARDS NA HUD
// ===========================
function buildDriverCards() {
  const list = document.getElementById("drivers-list");
  if (!list) return;

  list.innerHTML = "";

  raceState.cars.forEach((car) => {
    const d = car.driver;
    // convenção de imagens: ajuste nomes se quiser
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
          <span data-field="laps">0 / ${TOTAL_LAPS}</span>
        </div>
        <div class="stat-line">
          <span>Gap</span>
          <span data-field="gap">--</span>
        </div>
        <div class="stat-line">
          <span>Pneus</span>
          <span data-field="tyres">0%</span>
        </div>
      </div>
    `;

    list.appendChild(card);

    car.cardElements = {
      card,
      posEl: card.querySelector('[data-field="pos"]'),
      lapsEl: card.querySelector('[data-field="laps"]'),
      gapEl: card.querySelector('[data-field="gap"]'),
      tyresEl: card.querySelector('[data-field="tyres"]')
    };
  });
}

// ===========================
// LOOP DA CORRIDA
// ===========================
function startRaceLoop() {
  if (!raceState.running) {
    raceState.running = true;
    requestAnimationFrame(raceStep);
  }
}

function raceStep(timestamp) {
  if (!raceState.running) return;

  if (raceState.lastTimestamp == null) {
    raceState.lastTimestamp = timestamp;
  }

  const deltaMs = timestamp - raceState.lastTimestamp;
  const dt = deltaMs / 1000;

  raceState.lastTimestamp = timestamp;

  updateCars(dt);
  updateHudDynamic();

  if (!raceState.finished) {
    requestAnimationFrame(raceStep);
  }
}

// ===========================
// ATUALIZAÇÃO DOS CARROS
// ===========================
function updateCars(dt) {
  const multiplier = raceState.speedMultiplier || 1;

  raceState.cars.forEach((car) => {
    if (car.finished) {
      return;
    }

    car.totalTime += dt;

    // Pit stop simples: fica parado alguns segundos
    if (car.inPit) {
      car.pitTimer -= dt;
      if (car.pitTimer <= 0) {
        car.inPit = false;
        car.tyreWear = 10; // pneus “novos”
      }
      // carro parado visualmente, então não move a progressão
      return;
    }

    const effectiveLapTime =
      car.driver.baseLapTime *
      (1 + car.engineWear / 200) /
      multiplier; // desgaste motor deixa mais lento

    const deltaProgress = dt / effectiveLapTime;
    let newProgress = car.progress + deltaProgress;

    // desgaste contínuo
    car.tyreWear += deltaProgress * car.driver.tyreWearRate;
    car.engineWear += deltaProgress * car.driver.engineWearRate;

    if (car.tyreWear > 100) car.tyreWear = 100;
    if (car.engineWear > 100) car.engineWear = 100;

    // completou volta?
    if (newProgress >= 1) {
      car.lap += 1;
      newProgress -= 1;

      if (car.lap >= TOTAL_LAPS) {
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

    // Decide parar no box no fim da volta se desgaste alto
    if (
      car.lap > 0 &&
      !car.finished &&
      car.tyreWear >= PIT_WEAR_THRESHOLD &&
      car.progress > 0.9
    ) {
      car.inPit = true;
      car.pitTimer = PIT_STOP_DURATION;
      return;
    }

    const distance = car.pathLength * car.progress;
    const point = car.path.getPointAtLength(distance);
    car.element.setAttribute("cx", String(point.x));
    car.element.setAttribute("cy", String(point.y));
  });

  // Verifica se acabou a corrida (todos terminaram)
  const allFinished = raceState.cars.every((c) => c.finished);
  if (allFinished && !raceState.finished) {
    raceState.finished = true;
    showPodium();
  }
}

// ===========================
// HUD DINÂMICA
// ===========================
function updateHudDynamic() {
  if (!raceState.cars.length) return;

  // Ordena por volta, depois progressão, depois tempo total
  const ordered = [...raceState.cars].sort((a, b) => {
    if (a.lap !== b.lap) return b.lap - a.lap;
    if (a.progress !== b.progress) return b.progress - a.progress;
    return a.totalTime - b.totalTime;
  });

  const leader = ordered[0];

  ordered.forEach((car, index) => {
    car.position = index + 1;
  });

  // Atualiza label de volta (baseado no líder)
  const lapLabel = document.getElementById("race-lap-label");
  if (lapLabel) {
    const currentLap = Math.min(leader.lap + 1, TOTAL_LAPS);
    lapLabel.textContent = `Volta ${currentLap} / ${TOTAL_LAPS}`;
  }

  // Atualiza cards
  ordered.forEach((car) => {
    const els = car.cardElements;
    if (!els) return;

    els.card.classList.toggle("leader", car.position === 1);

    if (els.posEl) els.posEl.textContent = car.position + "º";

    if (els.lapsEl) {
      if (car.finished) {
        els.lapsEl.textContent = `Final (${car.lap}/${TOTAL_LAPS})`;
      } else {
        els.lapsEl.textContent = `${car.lap}/${TOTAL_LAPS}`;
      }
    }

    if (els.gapEl) {
      if (car === leader) {
        els.gapEl.textContent = "Líder";
      } else {
        const lapDiff = leader.lap - car.lap;
        if (lapDiff >= 1) {
          els.gapEl.textContent = `+${lapDiff} volta(s)`;
        } else {
          const gap = car.totalTime - leader.totalTime;
          els.gapEl.textContent = "+" + gap.toFixed(1) + "s";
        }
      }
    }

    if (els.tyresEl) {
      const wear = Math.round(car.tyreWear);
      const status =
        car.inPit && !car.finished
          ? "No box..."
          : wear < 40
          ? wear + "% (OK)"
          : wear < 75
          ? wear + "% (Alto)"
          : wear + "% (Crítico)";
      els.tyresEl.textContent = status;
    }
  });
}

// ===========================
// PÓDIO
// ===========================
function showPodium() {
  const modal = document.getElementById("podium-modal");
  if (!modal) return;

  // Ordena por tempo total final
  const finalOrder = [...raceState.cars].sort(
    (a, b) => a.totalTime - b.totalTime
  );
  const top3 = finalOrder.slice(0, 3);

  const ids = [1, 2, 3];
  ids.forEach((pos, idx) => {
    const car = top3[idx];
    if (!car) return;
    const d = car.driver;

    const faceSrc = `assets/faces/${d.code}.png`;

    const faceEl = document.getElementById(`podium${pos}-face`);
    const nameEl = document.getElementById(`podium${pos}-name`);
    const teamEl = document.getElementById(`podium${pos}-team`);

    if (faceEl) faceEl.src = faceSrc;
    if (nameEl) nameEl.textContent = d.name;
    if (teamEl) teamEl.textContent = d.team;
  });

  modal.classList.remove("hidden");
}

function closePodium() {
  const modal = document.getElementById("podium-modal");
  if (modal) modal.classList.add("hidden");
}
