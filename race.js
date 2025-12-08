// ===========================
// ESTADO GLOBAL DA CORRIDA
// ===========================
const raceState = {
  speedMultiplier: 1,
  cars: [],
  running: false,
  lastTimestamp: null,
  trackPath: null,
  pitPath: null // já deixamos preparado para usar BOX depois
};

// Início
document.addEventListener("DOMContentLoaded", () => {
  setupSpeedButtons();

  // Primeira pista: Austrália (usando australia.svg)
  loadTrack("australia");
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
// CARREGAR PISTA (SVG EXTERNO)
// ===========================
function loadTrack(trackName) {
  const container = document.getElementById("track-container");
  if (!container) {
    console.error("track-container não encontrado");
    return;
  }

  // Ex: assets/tracks/australia.svg
  fetch(`assets/tracks/${trackName}.svg`)
    .then((response) => {
      if (!response.ok) throw new Error("Erro ao carregar SVG da pista");
      return response.text();
    })
    .then((svgText) => {
      // Injetar o SVG direto no DOM (inline) para poder acessar os <path>
      container.innerHTML = svgText;

      const svg = container.querySelector("svg");
      if (!svg) {
        console.error("SVG não encontrado dentro do container");
        return;
      }

      svg.classList.add("track-svg");

      // Aqui usamos a sua estrutura original:
      // path com stroke-width="10" = traçado principal
      // path com stroke-width="5.5" = pit lane (BOX)
      const trackPath = svg.querySelector('path[stroke-width="10"]');
      const pitPath = svg.querySelector('path[stroke-width="5.5"]');

      if (!trackPath) {
        console.error(
          "Path principal da pista não encontrado (stroke-width=\"10\")."
        );
        return;
      }

      raceState.trackPath = trackPath;
      raceState.pitPath = pitPath || null;

      initCars(svg, trackPath);
      startRaceLoop();
    })
    .catch((err) => {
      console.error(err);
    });
}

// ===========================
// INICIALIZAÇÃO DOS CARROS
// ===========================
function initCars(svg, trackPath) {
  raceState.cars = [];
  raceState.lastTimestamp = null;

  const trackLength = trackPath.getTotalLength();

  // Carro 1
  const car1 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  car1.setAttribute("r", "6");
  car1.setAttribute("class", "car car-1");
  svg.appendChild(car1);

  // Carro 2
  const car2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  car2.setAttribute("r", "6");
  car2.setAttribute("class", "car car-2");
  svg.appendChild(car2);

  // Definimos dois "pilotos" com tempos de volta ligeiramente diferentes
  raceState.cars.push({
    id: 1,
    element: car1,
    path: trackPath,
    pathLength: trackLength,
    progress: 0,
    baseLapTime: 85, // segundos para 1 volta em 1x
    speedKmh: 260
  });

  raceState.cars.push({
    id: 2,
    element: car2,
    path: trackPath,
    pathLength: trackLength,
    progress: 0.48, // larga em posição diferente
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
  const deltaSeconds = deltaMs / 1000;

  raceState.lastTimestamp = timestamp;

  updateCars(deltaSeconds);
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

    // 0–1 (cada ciclo é uma volta completa)
    car.progress = (car.progress + deltaProgress) % 1;

    const distance = car.pathLength * car.progress;
    const point = car.path.getPointAtLength(distance);

    // Move o círculo exatamente em cima do traçado
    car.element.setAttribute("cx", String(point.x));
    car.element.setAttribute("cy", String(point.y));
  });
}

// ===========================
// HUD – PARTE ESTÁTICA
// ===========================
function updateHudStatic() {
  const driver1NameEl = document.querySelector("#driver1-name");
  const driver2NameEl = document.querySelector("#driver2-name");

  // Aqui depois podemos puxar o nome real do piloto da equipe escolhida
  if (driver1NameEl) driver1NameEl.textContent = "Piloto 1";
  if (driver2NameEl) driver2NameEl.textContent = "Piloto 2";
}

// ===========================
// HUD – PARTE DINÂMICA
// ===========================
function updateHudDynamic(timestamp) {
  const car1 = raceState.cars[0];
  const car2 = raceState.cars[1];
  if (!car1 || !car2) return;

  const pos1El = document.querySelector("#driver1-pos");
  const pos2El = document.querySelector("#driver2-pos");
  const speed1El = document.querySelector("#driver1-speed");
  const speed2El = document.querySelector("#driver2-speed");

  const multiplier = raceState.speedMultiplier || 1;

  // Só para dar uma "respirada" na velocidade (jitter leve)
  const jitter1 = 8 * Math.sin(timestamp / 400 + 0.5);
  const jitter2 = 8 * Math.sin(timestamp / 450 + 1.2);

  const speed1 = Math.max(80, car1.speedKmh * multiplier + jitter1);
  const speed2 = Math.max(80, car2.speedKmh * multiplier + jitter2);

  if (speed1El) speed1El.textContent = speed1.toFixed(0) + " km/h";
  if (speed2El) speed2El.textContent = speed2.toFixed(0) + " km/h";

  // Define posições pela porcentagem de volta (maior progresso = melhor posição)
  let pos1 = 1;
  let pos2 = 2;
  if (car2.progress > car1.progress) {
    pos1 = 2;
    pos2 = 1;
  }

  if (pos1El) pos1El.textContent = pos1 + "º";
  if (pos2El) pos2El.textContent = pos2 + "º";
}
