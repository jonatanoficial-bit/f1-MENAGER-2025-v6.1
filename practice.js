/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE)
   ✔ Pilotos dinâmicos por equipe (userTeam)
   ✔ Velocidade REAL corrigida (1x / 2x / 4x)
   ✔ SVG + pathPoints
   ✔ requestAnimationFrame com deltaTime
   ✔ Telemetria sincronizada
   ========================================================= */

/* ===============================
   DADOS BASE (MESMOS DA CORRIDA)
   =============================== */

const DRIVERS_2025 = [
  { id: "ver", name: "Max Verstappen", teamKey: "redbull", team: "Red Bull", rating: 98, color: "#1e41ff", face: "assets/faces/VER.png" },
  { id: "per", name: "Sergio Pérez", teamKey: "redbull", team: "Red Bull", rating: 94, color: "#1e41ff", face: "assets/faces/PER.png" },

  { id: "lec", name: "Charles Leclerc", teamKey: "ferrari", team: "Ferrari", rating: 95, color: "#dc0000", face: "assets/faces/LEC.png" },
  { id: "sai", name: "Carlos Sainz", teamKey: "ferrari", team: "Ferrari", rating: 93, color: "#dc0000", face: "assets/faces/SAI.png" },

  { id: "nor", name: "Lando Norris", teamKey: "mclaren", team: "McLaren", rating: 94, color: "#ff8700", face: "assets/faces/NOR.png" },
  { id: "pia", name: "Oscar Piastri", teamKey: "mclaren", team: "McLaren", rating: 92, color: "#ff8700", face: "assets/faces/PIA.png" },

  { id: "ham", name: "Lewis Hamilton", teamKey: "mercedes", team: "Mercedes", rating: 95, color: "#00d2be", face: "assets/faces/HAM.png" },
  { id: "rus", name: "George Russell", teamKey: "mercedes", team: "Mercedes", rating: 93, color: "#00d2be", face: "assets/faces/RUS.png" },

  { id: "alo", name: "Fernando Alonso", teamKey: "aston", team: "Aston Martin", rating: 94, color: "#006f62", face: "assets/faces/ALO.png" },
  { id: "str", name: "Lance Stroll", teamKey: "aston", team: "Aston Martin", rating: 88, color: "#006f62", face: "assets/faces/STR.png" },

  { id: "gas", name: "Pierre Gasly", teamKey: "alpine", team: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/GAS.png" },
  { id: "oco", name: "Esteban Ocon", teamKey: "alpine", team: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/OCO.png" },

  { id: "bot", name: "Valtteri Bottas", teamKey: "sauber", team: "Sauber", rating: 89, color: "#00ffcc", face: "assets/faces/BOT.png" },
  { id: "bor", name: "Gabriel Bortoleto", teamKey: "sauber", team: "Sauber", rating: 88, color: "#00ffcc", face: "assets/faces/BOR.png" }
];

/* ===============================
   PARÂMETROS DE URL
   =============================== */

const params = new URLSearchParams(window.location.search);
const trackKey = params.get("track") || "australia";
const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();

/* ===============================
   PILOTOS DO USUÁRIO (CORREÇÃO)
   =============================== */

const userDrivers = DRIVERS_2025.filter(d => d.teamKey === userTeam);

if (userDrivers.length !== 2) {
  console.error("❌ ERRO: equipe inválida ou sem 2 pilotos:", userTeam);
}

/* ===============================
   SVG / PATH POINTS
   =============================== */

const svg = document.querySelector("svg");
const pathPoints = window.pathPoints || [];

if (!pathPoints.length) {
  console.error("❌ pathPoints não encontrados");
}

/* ===============================
   ESTADO DA SESSÃO
   =============================== */

const practiceState = {
  speedMultiplier: 1,        // 1x / 2x / 4x
  sessionSeconds: 60 * 60,   // 60 minutos
  running: true,
  lastFrame: performance.now(),
  cars: []
};

/* ===============================
   CRIAÇÃO DOS CARROS
   =============================== */

userDrivers.forEach((driver, index) => {
  const el = document.createElement("div");
  el.className = "practice-car";
  el.style.background = driver.color;
  document.querySelector(".practice-track-canvas").appendChild(el);

  practiceState.cars.push({
    driver,
    element: el,
    progress: Math.random(), // começa espalhado
    speed: 0.045 + driver.rating * 0.0006, // VELOCIDADE REAL BASE
    lapTime: 0,
    lastLapStart: performance.now()
  });
});

/* ===============================
   BOTÕES DE VELOCIDADE (FIX)
   =============================== */

document.querySelectorAll("[data-speed]").forEach(btn => {
  btn.addEventListener("click", () => {
    practiceState.speedMultiplier = Number(btn.dataset.speed);
    document.querySelectorAll("[data-speed]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

/* ===============================
   LOOP PRINCIPAL (CORRIGIDO)
   =============================== */

function animate(now) {
  const delta = (now - practiceState.lastFrame) / 1000;
  practiceState.lastFrame = now;

  if (!practiceState.running) {
    requestAnimationFrame(animate);
    return;
  }

  const simDelta = delta * practiceState.speedMultiplier;

  practiceState.sessionSeconds -= simDelta;
  if (practiceState.sessionSeconds <= 0) {
    practiceState.running = false;
  }

  practiceState.cars.forEach(car => {
    car.progress += car.speed * simDelta;

    if (car.progress >= 1) {
      car.progress -= 1;
      const lapTime = (now - car.lastLapStart) / 1000;
      car.lastLapStart = now;
      car.lapTime = lapTime;
    }

    const idx = Math.floor(car.progress * pathPoints.length);
    const p = pathPoints[idx];

    if (!p) return;

    car.element.style.left = `${p.x}px`;
    car.element.style.top = `${p.y}px`;
  });

  updateClock();
  requestAnimationFrame(animate);
}

/* ===============================
   CRONÔMETRO
   =============================== */

function updateClock() {
  const min = Math.floor(practiceState.sessionSeconds / 60);
  const sec = Math.floor(practiceState.sessionSeconds % 60);
  const el = document.querySelector(".practice-time");
  if (el) el.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ===============================
   START
   =============================== */

requestAnimationFrame(animate);

console.log("✅ PRACTICE.JS carregado corretamente");
