/* =========================================================
   F1 MANAGER 2025 – RACE SYSTEM (STABLE CORE)
   Versão segura para restaurar corrida
   ========================================================= */

import { TRACKS_2025 } from "./data.js";

/* =========================
   PARÂMETROS GERAIS
   ========================= */

const params = new URLSearchParams(window.location.search);
const trackId = params.get("track") || "australia";
const gpName = params.get("gp") || "GP";
const userTeam = params.get("userTeam") || "ferrari";

const FPS = 60;
let speedMultiplier = 1;

/* =========================
   ELEMENTOS DOM
   ========================= */

const svgContainer = document.getElementById("trackSvg");
const sessionTitle = document.getElementById("sessionName");
const pilotsPanel = document.getElementById("driversPanel");

/* =========================
   ESTADO DA CORRIDA
   ========================= */

let trackData = null;
let cars = [];
let animationId = null;
let raceFinished = false;

/* =========================
   PILOTOS (BASE)
   ========================= */

const DRIVERS = [
  { id: 1, name: "Leclerc", team: "ferrari" },
  { id: 2, name: "Sainz", team: "ferrari" },
  { id: 3, name: "Verstappen", team: "redbull" },
  { id: 4, name: "Perez", team: "redbull" },
  { id: 5, name: "Hamilton", team: "mercedes" },
  { id: 6, name: "Russell", team: "mercedes" }
];

/* =========================
   INICIALIZAÇÃO
   ========================= */

function initRace() {
  trackData = TRACKS_2025[trackId];

  if (!trackData) {
    alert("Erro: pista não encontrada.");
    return;
  }

  sessionTitle.innerText = gpName + " – Corrida";

  loadTrackSVG();
  createCars();
  renderDriversPanel();

  startRaceLoop();
}

/* =========================
   SVG DA PISTA
   ========================= */

function loadTrackSVG() {
  svgContainer.innerHTML = `
    <svg viewBox="0 0 1000 1000" width="100%" height="100%">
      <path d="${trackData.svgPath}"
            fill="none"
            stroke="#ffffff"
            stroke-width="6" />
    </svg>
  `;
}

/* =========================
   CRIAÇÃO DOS CARROS
   ========================= */

function createCars() {
  cars = DRIVERS.map((driver, index) => ({
    ...driver,
    progress: Math.random(),
    speed: 0.0004 + Math.random() * 0.0002,
    element: createCarElement(driver)
  }));
}

function createCarElement(driver) {
  const el = document.createElement("div");
  el.className = "car";
  el.style.backgroundImage = `url(assets/teams/${driver.team}.png)`;
  svgContainer.appendChild(el);
  return el;
}

/* =========================
   LOOP DE CORRIDA
   ========================= */

function startRaceLoop() {
  function loop() {
    updateCars();
    renderCars();

    if (!raceFinished) {
      animationId = requestAnimationFrame(loop);
    }
  }
  loop();
}

/* =========================
   ATUALIZAÇÃO
   ========================= */

function updateCars() {
  cars.forEach(car => {
    car.progress += car.speed * speedMultiplier;
    if (car.progress >= 1) {
      car.progress = 1;
      raceFinished = true;
      showPodium();
    }
  });
}

/* =========================
   RENDERIZAÇÃO
   ========================= */

function renderCars() {
  cars.forEach(car => {
    const point = trackData.pathPoints[
      Math.floor(car.progress * (trackData.pathPoints.length - 1))
    ];
    if (!point) return;

    car.element.style.transform =
      `translate(${point.x}px, ${point.y}px)`;
  });
}

/* =========================
   PAINEL DE PILOTOS
   ========================= */

function renderDriversPanel() {
  pilotsPanel.innerHTML = "";
  cars.forEach(car => {
    const card = document.createElement("div");
    card.className = "pilot-card";
    card.innerHTML = `
      <strong>${car.name}</strong><br>
      ${car.team.toUpperCase()}
    `;
    pilotsPanel.appendChild(card);
  });
}

/* =========================
   PODIUM
   ========================= */

function showPodium() {
  cancelAnimationFrame(animationId);

  const podium = [...cars].sort((a, b) => b.progress - a.progress);

  alert(
    `🏆 Pódio:\n1º ${podium[0].name}\n2º ${podium[1].name}\n3º ${podium[2].name}`
  );
}

/* =========================
   CONTROLES DE VELOCIDADE
   ========================= */

window.setSpeed = value => {
  speedMultiplier = value;
};

/* =========================
   START
   ========================= */

initRace();
