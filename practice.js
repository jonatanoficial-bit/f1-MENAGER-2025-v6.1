/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE)
   VERSÃO ALINHADA AO HTML E SVG REAIS DO PROJETO
   ---------------------------------------------------------
   ✔ Pilotos dinâmicos por equipe (userTeam via URL)
   ✔ Aguarda SVG + pathPoints reais (igual qualifying/race)
   ✔ Velocidade REAL corrigida (1x / 2x / 4x)
   ✔ requestAnimationFrame com deltaTime normalizado
   ✔ Telemetria básica funcional (base para upgrade avançado)
   ✔ Sem fallback silencioso para Ferrari
   ========================================================= */

/* ===============================
   DADOS DE PILOTOS (2025)
   =============================== */

const DRIVERS_2025 = [
  { id: "ver", name: "Max Verstappen", teamKey: "redbull", rating: 98, color: "#1e41ff", face: "assets/faces/VER.png" },
  { id: "per", name: "Sergio Pérez", teamKey: "redbull", rating: 94, color: "#1e41ff", face: "assets/faces/PER.png" },

  { id: "lec", name: "Charles Leclerc", teamKey: "ferrari", rating: 95, color: "#dc0000", face: "assets/faces/LEC.png" },
  { id: "sai", name: "Carlos Sainz", teamKey: "ferrari", rating: 93, color: "#dc0000", face: "assets/faces/SAI.png" },

  { id: "nor", name: "Lando Norris", teamKey: "mclaren", rating: 94, color: "#ff8700", face: "assets/faces/NOR.png" },
  { id: "pia", name: "Oscar Piastri", teamKey: "mclaren", rating: 92, color: "#ff8700", face: "assets/faces/PIA.png" },

  { id: "ham", name: "Lewis Hamilton", teamKey: "mercedes", rating: 95, color: "#00d2be", face: "assets/faces/HAM.png" },
  { id: "rus", name: "George Russell", teamKey: "mercedes", rating: 93, color: "#00d2be", face: "assets/faces/RUS.png" },

  { id: "alo", name: "Fernando Alonso", teamKey: "aston", rating: 94, color: "#006f62", face: "assets/faces/ALO.png" },
  { id: "str", name: "Lance Stroll", teamKey: "aston", rating: 88, color: "#006f62", face: "assets/faces/STR.png" },

  { id: "gas", name: "Pierre Gasly", teamKey: "alpine", rating: 90, color: "#0090ff", face: "assets/faces/GAS.png" },
  { id: "oco", name: "Esteban Ocon", teamKey: "alpine", rating: 90, color: "#0090ff", face: "assets/faces/OCO.png" },

  { id: "bor", name: "Gabriel Bortoleto", teamKey: "sauber", rating: 88, color: "#00ffcc", face: "assets/faces/BOR.png" },
  { id: "hul", name: "Nico Hülkenberg", teamKey: "sauber", rating: 89, color: "#00ffcc", face: "assets/faces/HUL.png" }
];

/* ===============================
   PARÂMETROS DE URL
   =============================== */

const params = new URLSearchParams(window.location.search);
const trackKey = params.get("track") || "australia";
const userTeam = (params.get("userTeam") || "").toLowerCase();

/* ===============================
   PILOTOS DO USUÁRIO
   =============================== */

const userDrivers = DRIVERS_2025.filter(d => d.teamKey === userTeam);

if (userDrivers.length !== 2) {
  console.error("❌ ERRO: equipe inválida ou sem dois pilotos:", userTeam);
}

/* ===============================
   ESTADO GLOBAL DO TREINO
   =============================== */

const practiceState = {
  ready: false,
  speedMultiplier: 1,
  sessionSeconds: 60 * 60,
  lastFrame: 0,
  cars: []
};

/* ===============================
   ESPERAR SVG + pathPoints
   (mesma lógica do qualifying)
   =============================== */

function waitForTrackReady() {
  if (window.pathPoints && Array.isArray(window.pathPoints) && window.pathPoints.length > 0) {
    initPractice();
  } else {
    requestAnimationFrame(waitForTrackReady);
  }
}

waitForTrackReady();

/* ===============================
   INICIALIZAÇÃO PRINCIPAL
   =============================== */

function initPractice() {
  const trackContainer = document.getElementById("track-container");
  if (!trackContainer) {
    console.error("❌ track-container não encontrado");
    return;
  }

  userDrivers.forEach((driver, i) => {
    const carEl = document.createElement("div");
    carEl.className = "practice-car";
    carEl.style.backgroundColor = driver.color;
    trackContainer.appendChild(carEl);

    practiceState.cars.push({
      driver,
      el: carEl,
      progress: i * 0.5,
      speedMS: 75 + driver.rating * 0.4,
      lapStart: performance.now(),
      lastLap: null
    });
  });

  bindSpeedButtons();
  practiceState.lastFrame = performance.now();
  practiceState.ready = true;
  requestAnimationFrame(loop);
}

/* ===============================
   BOTÕES DE VELOCIDADE
   =============================== */

function bindSpeedButtons() {
  document.querySelectorAll("[data-speed]").forEach(btn => {
    btn.addEventListener("click", () => {
      practiceState.speedMultiplier = Number(btn.dataset.speed);
      document.querySelectorAll("[data-speed]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/* ===============================
   LOOP PRINCIPAL
   =============================== */

function loop(now) {
  if (!practiceState.ready) return;

  const delta = (now - practiceState.lastFrame) / 1000;
  practiceState.lastFrame = now;

  const simDelta = delta * practiceState.speedMultiplier;
  practiceState.sessionSeconds -= simDelta;

  practiceState.cars.forEach(car => {
    const metersPerLap = 5200;
    const deltaProgress = (car.speedMS * simDelta) / metersPerLap;
    car.progress += deltaProgress;

    if (car.progress >= 1) {
      car.progress -= 1;
      car.lastLap = (now - car.lapStart) / 1000;
      car.lapStart = now;
    }

    const idx = Math.floor(car.progress * window.pathPoints.length);
    const p = window.pathPoints[idx];
    if (!p) return;

    car.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  });

  updateClock();
  requestAnimationFrame(loop);
}

/* ===============================
   CRONÔMETRO
   =============================== */

function updateClock() {
  const min = Math.floor(practiceState.sessionSeconds / 60);
  const sec = Math.floor(practiceState.sessionSeconds % 60);
  const el = document.getElementById("session-time");
  if (el) el.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

console.log("✅ practice.js carregado e alinhado ao HTML/SVG");
