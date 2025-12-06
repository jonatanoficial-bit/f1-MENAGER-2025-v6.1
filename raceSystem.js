/* ============================================================
   raceSystem.js — Corrida 2D usando SVG REAL
   ============================================================ */

/* Velocidade da simulação (1x, 2x, 4x) */
let raceSpeed = 1;

/* Estado interno da corrida */
let raceState = {
  trackPoints: [],
  cars: [],
  lap: 1,
  totalLaps: 10,
  running: false,
  animationFrame: null,
};

/* ============================================================
   CARREGAR SVG E EXTRAIR TRAÇADO
   ============================================================ */

async function loadTrackSVG(trackKey) {
  const url = `assets/tracks/${trackKey}.svg.svg`;

  const svgText = await fetch(url).then(r => r.text());

  const svg = new DOMParser().parseFromString(svgText, "image/svg+xml");

  const path = svg.querySelector("path");
  if (!path) {
    console.error("Nenhum path encontrado no SVG:", trackKey);
    return [];
  }

  const pathData = path.getAttribute("d");

  /* Converte path SVG em coordenadas */
  const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tempPath.setAttribute("d", pathData);

  const length = tempPath.getTotalLength();
  const points = [];

  for (let i = 0; i < length; i += 5) {
    const pt = tempPath.getPointAtLength(i);
    points.push({ x: pt.x, y: pt.y });
  }

  /* Normaliza para caber em 1200x800 viewport */
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));

  const scaleX = 1200 / (maxX - minX);
  const scaleY = 800 / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  const normalized = points.map(p => ({
    x: (p.x - minX) * scale,
    y: (p.y - minY) * scale,
  }));

  return normalized;
}

/* ============================================================
   CRIAR CARROS
   ============================================================ */

function createCars(drivers) {
  const cars = drivers.map((d, idx) => {
    const el = document.createElement("img");
    el.className = "car-icon";
    el.src = `assets/cars/${d.equipe}.png`;

    document.getElementById("cars-layer").appendChild(el);

    return {
      driver: d,
      element: el,
      index: idx * 10,
      speed: 0.5 + Math.random() * 0.3 + d.rating / 200,
      laps: 0,
    };
  });
  return cars;
}

/* ============================================================
   ANIMAÇÃO
   ============================================================ */

function animateRace() {
  if (!raceState.running) return;

  const pts = raceState.trackPoints;
  const total = pts.length - 1;

  let finished = true;

  raceState.cars.forEach(car => {
    car.index += car.speed * raceSpeed;

    if (car.index >= total) {
      car.laps++;
      car.index = car.index % total;
    }

    if (car.laps < raceState.totalLaps) {
      finished = false;
    }

    const i = Math.floor(car.index);
    const p1 = pts[i];
    const p2 = pts[(i + 1) % total];

    // posição
    car.element.style.left = p1.x + "px";
    car.element.style.top = p1.y + "px";

    // rotação
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    car.element.style.transform = `rotate(${angle}deg)`;
  });

  if (finished) {
    console.log("Corrida finalizada!");
    raceState.running = false;
    return;
  }

  raceState.animationFrame = requestAnimationFrame(animateRace);
}

/* ============================================================
   INICIAR CORRIDA
   ============================================================ */

async function startRace2D(trackKey, drivers, totalLaps) {
  console.log("Iniciando corrida com pista:", trackKey);

  raceState.totalLaps = totalLaps || 10;

  const trackPoints = await loadTrackSVG(trackKey);
  raceState.trackPoints = trackPoints;

  const cars = createCars(drivers);
  raceState.cars = cars;

  raceState.running = true;
  animateRace();
}

/* ============================================================
   CONTROLE DE VELOCIDADE
   ============================================================ */

window.setRaceSpeed = function (mult) {
  raceSpeed = mult;
  document.querySelectorAll("#race-speed-controls button")
    .forEach(btn => btn.classList.remove("active"));

  const btn = document.getElementById(`speed-${mult}x`);
  if (btn) btn.classList.add("active");
};

/* ============================================================
   FINISH / EXPOSE
   ============================================================ */

window.startRace2D = startRace2D;
