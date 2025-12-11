// ==========================================================
// F1 MANAGER 2025 – PRACTICE.JS (Treino Livre Oficial)
// Fonte de pilotos: DRIVERS_2025 (mesma da Classificação)
// ==========================================================

// ------------------------------
// LISTA OFICIAL DE PILOTOS (COPIADA DO qualifying.js)
// ------------------------------
const DRIVERS_2025 = [
  { code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", color: "#ffb300", logo: "assets/logos/redbull.png", rating: 98 },
  { code: "PER", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull Racing", color: "#ffb300", logo: "assets/logos/redbull.png", rating: 94 },

  { code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", color: "#ff0000", logo: "assets/logos/ferrari.png", rating: 95 },
  { code: "SAI", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", color: "#ff0000", logo: "assets/logos/ferrari.png", rating: 93 },

  { code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", color: "#00e5ff", logo: "assets/logos/mercedes.png", rating: 95 },
  { code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", color: "#00e5ff", logo: "assets/logos/mercedes.png", rating: 93 },

  { code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", color: "#ff8c1a", logo: "assets/logos/mclaren.png", rating: 94 },
  { code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", color: "#ff8c1a", logo: "assets/logos/mclaren.png", rating: 92 },

  { code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", color: "#00b894", logo: "assets/logos/aston.png", rating: 94 },
  { code: "STR", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", color: "#00b894", logo: "assets/logos/aston.png", rating: 88 }
];

// ------------------------------
// ESTADO DO TREINO LIVRE
// ------------------------------
const practiceState = {
  pathPoints: [],
  cars: [],
  speedMultiplier: 1,
  lastTime: null,
  running: true,
  track: null,
  userTeam: null
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", initPractice);

function initPractice() {
  const params = new URLSearchParams(window.location.search);
  practiceState.track = params.get("track") || "australia";
  practiceState.userTeam = params.get("userTeam") || "ferrari";

  document.getElementById("trackName").textContent =
    practiceState.track.toUpperCase();

  carregarPilotosUsuario();
  carregarSvgPista(practiceState.track).then(() => {
    practiceState.lastTime = performance.now();
    requestAnimationFrame(loopPractice);
  });
}

// ------------------------------
// PILOTOS DA EQUIPE DO USUÁRIO
// ------------------------------
function carregarPilotosUsuario() {
  const pilotos = DRIVERS_2025.filter(
    (d) => d.teamKey === practiceState.userTeam
  ).slice(0, 2);

  pilotos.forEach((drv, idx) => {
    document.getElementById(`p${idx + 1}name`).textContent = drv.name;
    document.getElementById(`p${idx + 1}team`).textContent = drv.teamName;

    const face = document.getElementById(`p${idx + 1}face`);
    face.src = `assets/faces/${drv.code}.png`;
    face.onerror = () => (face.src = "assets/faces/default.png");

    practiceState.cars.push({
      driver: drv,
      progress: Math.random(),
      speed: 0.000012 * (drv.rating / 90),
      laps: 0,
      bestLap: null,
      lastLapStart: performance.now()
    });
  });
}

// ------------------------------
// SVG DA PISTA (MESMA LÓGICA DA QUALY)
// ------------------------------
async function carregarSvgPista(trackKey) {
  const container = document.getElementById("track-container");
  container.innerHTML = "";

  const resp = await fetch(`assets/tracks/${trackKey}.svg`);
  const text = await resp.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");

  const len = path.getTotalLength();
  const samples = 400;

  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    practiceState.pathPoints.push({ x: p.x, y: p.y });
  }

  container.appendChild(doc.documentElement);

  practiceState.cars.forEach((car) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", 6);
    dot.setAttribute("fill", car.driver.color);
    doc.documentElement.appendChild(dot);
    car.svg = dot;
  });
}

// ------------------------------
// LOOP PRINCIPAL
// ------------------------------
function loopPractice(time) {
  const dt = (time - practiceState.lastTime) * practiceState.speedMultiplier;
  practiceState.lastTime = time;

  if (practiceState.running) {
    atualizarCarros(dt);
    renderizar();
  }

  requestAnimationFrame(loopPractice);
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function atualizarCarros(dt) {
  practiceState.cars.forEach((car) => {
    car.progress += car.speed * dt;

    if (car.progress >= 1) {
      car.progress -= 1;
      car.laps++;

      const lapTime = performance.now() - car.lastLapStart;
      car.lastLapStart = performance.now();
      car.bestLap = car.bestLap
        ? Math.min(car.bestLap, lapTime)
        : lapTime;
    }
  });
}

// ------------------------------
// RENDER
// ------------------------------
function renderizar() {
  practiceState.cars.forEach((car) => {
    const idx = Math.floor(car.progress * practiceState.pathPoints.length);
    const p = practiceState.pathPoints[idx];
    if (!p) return;
    car.svg.setAttribute("cx", p.x);
    car.svg.setAttribute("cy", p.y);
  });
}

// ------------------------------
// CONTROLES
// ------------------------------
window.setSpeed = (v) => (practiceState.speedMultiplier = v);

window.goToOficina = () => (window.location.href = "oficina.html");
window.goToQualifying = () => {
  const params = new URLSearchParams(window.location.search);
  window.location.href = "qualifying.html?" + params.toString();
};
