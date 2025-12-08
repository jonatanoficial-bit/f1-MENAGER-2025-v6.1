// ===========================
// ESTADO GLOBAL DA CORRIDA
// ===========================
const raceState = {
  speedMultiplier: 1,
  cars: [],
  running: false,
  lastTimestamp: null,
  trackPath: null,
  pitPath: null
};

document.addEventListener("DOMContentLoaded", () => {
  setupSpeedButtons();

  // Lê parâmetros da URL: ?track=australia&gp=GP+da+Austrália
  const params = new URLSearchParams(window.location.search);
  const trackName = params.get("track") || "australia";
  const gpName = params.get("gp") || "GP da Austrália 2025";

  const titleEl = document.getElementById("gp-title");
  if (titleEl) titleEl.textContent = gpName;

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

      svg.classList.add("track-svg");

      // path principal (traçado) e pit lane (BOX)
      const trackPath = svg.querySelector('path[stroke-width="10"]');
      const pitPath = svg.querySelector('path[stroke-width="5.5"]');

      if (!trackPath) {
        console.error(
          'Path principal da pista não encontrado (stroke-width="10")'
        );
        return;
      }

      raceState.trackPath = trackPath;
      raceState.pitPath = pitPath || null; // guardado para próxima etapa (pit stop)

      initCars(svg, trackPath);
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

  const trackLength = trackPath.getTotalLength();

  const car1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  car1.setAttribute("r", "6");
  car1.setAttribute("class", "car car-1");
  svg.appendChild(car1);

  const car2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  car2.setAttribute("r", "6");
  car2.setAttribute("class", "car car-2");
  svg.appendChild(car2);

  raceState.cars.push({
    id: 1,
    element: car1,
    path: trackPath,
    pathLength: trackLength,
    progress: 0,
    baseLapTime: 85,
    speedKmh: 260
  });

  raceState.cars.push({
    id: 2,
    element: car2,
    path: trackPath,
    pathLength: trackLength,
    progress: 0.48,
    baseLapTime: 87,
    speedKmh: 255
  });

  updateHudStatic();
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
  updateHudDynamic(timestamp);

  requestAnimationFrame(raceStep);
}

// ===========================
// ATUALIZAÇÃO DOS CARROS
// ===========================
function updateCars(dt) {
  const multiplier = raceState.speedMultiplier || 1;

  raceState.cars.forEach((car) => {
    const effectiveLapTime = car.baseLapTime / multiplier;
    const deltaProgress = dt / effectiveLapTime;

    car.progress = (car.progress + deltaProgress) % 1;

    const distance = car.pathLength * car.progress;
    const point = car.path.getPointAtLength(distance);

    car.element.setAttribute("cx", String(point.x));
    car.element.setAttribute("cy", String(point.y));
  });
}

// ===========================
// HUD
// ===========================
function updateHudStatic() {
  const d1 = document.getElementById("driver1-name");
  const d2 = document.getElementById("driver2-name");

  if (d1) d1.textContent = "Piloto 1";
  if (d2) d2.textContent = "Piloto 2";
}

function updateHudDynamic(timestamp) {
  const car1 = raceState.cars[0];
  const car2 = raceState.cars[1];
  if (!car1 || !car2) return;

  const pos1El = document.getElementById("driver1-pos");
  const pos2El = document.getElementById("driver2-pos");
  const speed1El = document.getElementById("driver1-speed");
  const speed2El = document.getElementById("driver2-speed");

  const mult = raceState.speedMultiplier || 1;

  const jitter1 = 8 * Math.sin(timestamp / 400 + 0.5);
  const jitter2 = 8 * Math.sin(timestamp / 450 + 1.2);

  const speed1 = Math.max(80, car1.speedKmh * mult + jitter1);
  const speed2 = Math.max(80, car2.speedKmh * mult + jitter2);

  if (speed1El) speed1El.textContent = speed1.toFixed(0) + " km/h";
  if (speed2El) speed2El.textContent = speed2.toFixed(0) + " km/h";

  let pos1 = 1;
  let pos2 = 2;
  if (car2.progress > car1.progress) {
    pos1 = 2;
    pos2 = 1;
  }

  if (pos1El) pos1El.textContent = pos1 + "º";
  if (pos2El) pos2El.textContent = pos2 + "º";
}
