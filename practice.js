/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE) — FINAL (v6.1)
   Alinhado ao HTML/SVG reais do projeto (practice.html + assets/tracks/*.svg)

   ✔ Carrega SVG dinamicamente em #track-container
   ✔ Gera pathPoints a partir do <path> do SVG (mesma lógica do qualifying.js)
   ✔ Desenha linha da pista (outer + inner) dentro do SVG renderizado
   ✔ Cria 2 carros da equipe do usuário e move sobre pathPoints
   ✔ requestAnimationFrame + deltaTime normalizado (1x/2x/4x correto)
   ✔ Pilotos corretos por equipe (userTeam)
   ✔ Integração de navegação: Oficina e Qualifying preservando querystring
   ✔ APIs globais esperadas pelo HTML: setSpeed(), pitStop(), setMode()

   Observação: este JS é robusto para diferentes variações do seu HTML:
   - Se existir botão via data-speed, ele funciona.
   - Se existir botões com onclick="setSpeed()", também funciona.
   - Se existir ids p1face/p2face e p1info/p2info, ele preenche.
   ========================================================= */

/* ===============================
   PARÂMETROS DE URL
   =============================== */
const QS = new URLSearchParams(window.location.search);
const trackKey = (QS.get("track") || "australia").toLowerCase();
const gpName = QS.get("gp") || "";
const userTeamKey = (QS.get("userTeam") || "ferrari").toLowerCase();

/* ===============================
   DADOS – PILOTOS 2025 (subset)
   (mantenha coerente com seus assets/faces/*.png)
   =============================== */
const DRIVERS_2025 = [
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull", rating: 98, color: "#1e41ff", face: "assets/faces/VER.png", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull", rating: 94, color: "#1e41ff", face: "assets/faces/PER.png", logo: "assets/logos/redbull.png" },

  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#dc0000", face: "assets/faces/LEC.png", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#dc0000", face: "assets/faces/SAI.png", logo: "assets/logos/ferrari.png" },

  { id: "norris", code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8700", face: "assets/faces/NOR.png", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8700", face: "assets/faces/PIA.png", logo: "assets/logos/mclaren.png" },

  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00d2be", face: "assets/faces/HAM.png", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00d2be", face: "assets/faces/RUS.png", logo: "assets/logos/mercedes.png" },

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#006f62", face: "assets/faces/ALO.png", logo: "assets/logos/aston.png" },
  { id: "stroll", code: "STR", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#006f62", face: "assets/faces/STR.png", logo: "assets/logos/aston.png" },

  { id: "gasly", code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/GAS.png", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/OCO.png", logo: "assets/logos/alpine.png" },

  // Sauber 2025 (conforme seu pedido)
  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber", rating: 89, color: "#00ffcc", face: "assets/faces/HUL.png", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 88, color: "#00ffcc", face: "assets/faces/BOR.png", logo: "assets/logos/sauber.png" }
];

/* ===============================
   TELEMETRIA / SETUP (localStorage)
   - Lê várias chaves possíveis sem quebrar nada.
   =============================== */
function safeJsonParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function loadCarSetup() {
  // Tenta chaves comuns; se a sua oficina usar outra, mantemos compatibilidade acrescentando aqui.
  const candidates = [
    "f1m2025_car_setup",
    "f1m2025_setup",
    "f1m2025_oficina_setup",
    "carSetup",
    "setup"
  ];

  for (const k of candidates) {
    const raw = localStorage.getItem(k);
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (parsed && typeof parsed === "object") return parsed;
    }
  }

  // default neutro
  return {
    frontWing: 50,
    rearWing: 50,
    tyrePressure: 22.5,
    rideHeight: 50,
    suspension: 50,
    engineMap: 50
  };
}

// Converte setup -> multiplicadores (simples e estáveis; refinamos depois)
function computeSetupMultipliers(setup) {
  // clamp helper
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const fw = clamp(Number(setup.frontWing ?? 50), 0, 100);
  const rw = clamp(Number(setup.rearWing ?? 50), 0, 100);
  const rh = clamp(Number(setup.rideHeight ?? 50), 0, 100);
  const sus = clamp(Number(setup.suspension ?? 50), 0, 100);
  const tp = clamp(Number(setup.tyrePressure ?? 22.5), 18, 28);
  const em = clamp(Number(setup.engineMap ?? 50), 0, 100);

  // Downforce maior (asas altas) = mais grip, menos vMax
  const downforce = (fw + rw) / 200;           // 0..1
  const vMaxMul = 1.06 - downforce * 0.10;     // ~0.96..1.06
  const gripMul = 0.92 + downforce * 0.18;     // ~0.92..1.10

  // Ride height alto = estabilidade em zebras, menos eficiência
  const stabilityMul = 0.92 + (rh / 100) * 0.16; // ~0.92..1.08
  const dragMul = 1.02 - (rh / 100) * 0.06;      // ~0.96..1.02

  // Suspensão mais rígida = resposta rápida, mas menor tração em baixa
  const tractionMul = 1.06 - (sus / 100) * 0.10; // ~0.96..1.06

  // Pressão afeta grip e desgaste (simplificado)
  const pressureCenter = 23.0;
  const pressureDelta = Math.abs(tp - pressureCenter); // 0..~5
  const tyreGripMul = 1.02 - pressureDelta * 0.01;     // ~0.97..1.02
  const tyreWearMul = 1.00 + pressureDelta * 0.03;     // ~1.00..1.15

  // Mapa de motor
  const enginePowerMul = 0.90 + (em / 100) * 0.20;     // ~0.90..1.10
  const fuelUseMul = 0.92 + (em / 100) * 0.25;         // ~0.92..1.17

  return {
    vMaxMul: vMaxMul * dragMul * enginePowerMul,
    gripMul: gripMul * tyreGripMul,
    stabilityMul,
    tractionMul,
    tyreWearMul,
    fuelUseMul
  };
}

/* ===============================
   UTIL – formatação de tempo
   =============================== */
function formatTimeMs(ms) {
  if (!isFinite(ms) || ms <= 0) return "--:--.---";
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const mm = Math.floor((total - m * 60 - s) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(mm).padStart(3, "0")}`;
}

function formatClock(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/* ===============================
   ELEMENTOS DO HTML (tolerante)
   =============================== */
const elTrackContainer = document.getElementById("track-container");
const elDriversOnTrack = document.getElementById("driversOnTrack");
const elP1Face = document.getElementById("p1face");
const elP2Face = document.getElementById("p2face");
const elP1Info = document.getElementById("p1info");
const elP2Info = document.getElementById("p2info");
const elBtnOficina = document.getElementById("btnOficina");
const elBtnVoltar = document.getElementById("btnVoltar");

// Alguns HTMLs seus usam outros ids/classes — cobrimos também:
const elSessionTime =
  document.querySelector("#session-time") ||
  document.querySelector("#sessionTime") ||
  document.querySelector(".practice-time") ||
  document.querySelector("[data-role='sessionTime']") ||
  null;

const elBestLap =
  document.querySelector("#best-lap") ||
  document.querySelector("#bestLap") ||
  document.querySelector("[data-role='bestLap']") ||
  null;

if (!elTrackContainer) {
  console.error("❌ practice.html: #track-container não encontrado. (O SVG não terá onde renderizar)");
}

/* ===============================
   PILOTOS DO USUÁRIO (2)
   =============================== */
const userDrivers = DRIVERS_2025.filter(d => d.teamKey === userTeamKey);
if (userDrivers.length !== 2) {
  console.warn("⚠️ userTeam sem 2 pilotos no DRIVERS_2025:", userTeamKey, "→ usando fallback Ferrari");
}

/* ===============================
   ESTADO DO TREINO LIVRE
   =============================== */
const practice = {
  ready: false,
  speedMultiplier: 1,
  running: true,
  sessionSeconds: 60 * 60,
  lastNow: performance.now(),
  pathPoints: [],
  trackLengthM: 5200,         // fallback
  trackLengthPx: 1,           // calculado
  cars: [],
  bestLapMs: Infinity,
  leaderLap: 0,
  setup: loadCarSetup(),
  setupMul: null
};

practice.setupMul = computeSetupMultipliers(practice.setup);

/* ===============================
   TABELA OPCIONAL DE COMPRIMENTO (m)
   (se não achar a pista, usa fallback)
   =============================== */
const TRACK_LENGTHS_M = {
  australia: 5278,
  bahrain: 5412,
  saudi: 6174,
  japan: 5807,
  china: 5451,
  miami: 5410,
  imola: 4909,
  monaco: 3337,
  canada: 4361,
  spain: 4657,
  austria: 4318,
  britain: 5891,
  hungary: 4381,
  belgium: 7004,
  netherlands: 4259,
  italy: 5793,
  singapore: 4928,
  usa: 5513,
  mexico: 4304,
  brazil: 4309,
  lasvegas: 6201,
  qatar: 5419,
  abudhabi: 5281
};

if (TRACK_LENGTHS_M[trackKey]) practice.trackLengthM = TRACK_LENGTHS_M[trackKey];

/* ===============================
   API GLOBAL (onclick do HTML)
   =============================== */
window.setSpeed = (n) => {
  const v = Number(n);
  practice.speedMultiplier = (v === 1 || v === 2 || v === 4) ? v : 1;
  // Se houver botões data-speed, marca ativo:
  document.querySelectorAll("[data-speed]").forEach(b => {
    b.classList.toggle("active", Number(b.dataset.speed) === practice.speedMultiplier);
  });
};

window.pitStop = (carIndex1based) => {
  const idx = Number(carIndex1based) - 1;
  const car = practice.cars[idx];
  if (!car) return;

  // Simples: "box" por 7s simulados; zera stress e melhora pneus
  car.pit.active = true;
  car.pit.remaining = 7; // segundos (sim)
};

window.setMode = (carIndex1based, mode) => {
  const idx = Number(carIndex1based) - 1;
  const car = practice.cars[idx];
  if (!car) return;

  if (mode === "eco") car.mode = "ECO";
  else if (mode === "attack") car.mode = "ATTACK";
  else car.mode = "NORMAL";
};

/* ===============================
   BIND BOTÕES VIA data-speed (se existir)
   =============================== */
document.querySelectorAll("[data-speed]").forEach(btn => {
  btn.addEventListener("click", () => window.setSpeed(btn.dataset.speed));
});

/* ===============================
   NAVEGAÇÃO – preservar querystring
   =============================== */
function buildUrl(page) {
  const q = new URLSearchParams();
  q.set("track", trackKey);
  if (gpName) q.set("gp", gpName);
  q.set("userTeam", userTeamKey);
  return `${page}?${q.toString()}`;
}

// Botão voltar (se existir) – mantém seu onclick original, mas melhora mantendo parâmetros:
if (elBtnVoltar) {
  elBtnVoltar.addEventListener("click", (e) => {
    // Se o HTML já manda para lobby sem query, mantemos simples:
    // (você pode trocar para buildUrl('lobby.html') se quiser)
    // Aqui: preserva seu fluxo atual.
  });
}

// Botão oficina – garante que leve track/userTeam/gp:
if (elBtnOficina) {
  elBtnOficina.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = buildUrl("oficina.html");
  });
}

/* ===============================
   CARREGAR SVG E GERAR pathPoints (igual qualifying)
   =============================== */
async function loadTrackSvgAndBuildPoints() {
  const url = `assets/tracks/${trackKey}.svg`;

  let text = "";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    console.error("❌ Falha ao carregar SVG:", url, err);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const srcSvg = doc.querySelector("svg");
  const path = doc.querySelector("path");

  if (!srcSvg || !path) {
    console.error("❌ SVG inválido: precisa conter <svg> e pelo menos um <path>:", url);
    return;
  }

  // Render target SVG (1000x600, como qualifying)
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Amostragem do path do SVG original
  const pathLen = path.getTotalLength();
  const samples = 500;
  const pts = [];

  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((pathLen * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  // Normalização para 1000x600
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;

  const norm = pts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  practice.pathPoints = norm;
  window.pathPoints = norm; // compat global (se outros arquivos usam)

  // Calcula comprimento em "px" do traçado normalizado (para telemetria futura)
  let lengthPx = 0;
  for (let i = 1; i < norm.length; i++) {
    const dx = norm[i].x - norm[i - 1].x;
    const dy = norm[i].y - norm[i - 1].y;
    lengthPx += Math.hypot(dx, dy);
  }
  practice.trackLengthPx = Math.max(1, lengthPx);

  // Desenho da pista (outer)
  const outer = document.createElementNS(svgNS, "polyline");
  outer.setAttribute("points", norm.map(p => `${p.x},${p.y}`).join(" "));
  outer.setAttribute("fill", "none");
  outer.setAttribute("stroke", "#111");           // base escura (fica bonito com o fundo)
  outer.setAttribute("stroke-width", "22");
  outer.setAttribute("stroke-linecap", "round");
  outer.setAttribute("stroke-linejoin", "round");
  svg.appendChild(outer);

  // Desenho da pista (inner)
  const inner = document.createElementNS(svgNS, "polyline");
  inner.setAttribute("points", norm.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "#f2f2f2");
  inner.setAttribute("stroke-width", "4");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  inner.setAttribute("opacity", "0.95");
  svg.appendChild(inner);

  // Renderiza no container
  if (elTrackContainer) {
    elTrackContainer.innerHTML = "";
    elTrackContainer.appendChild(svg);
  }

  return true;
}

/* ===============================
   CRIAR CARROS + HUD DO PILOTO
   =============================== */
function setImgSafe(imgEl, src, alt) {
  if (!imgEl) return;
  imgEl.alt = alt || "";
  imgEl.src = src;
  imgEl.onerror = () => {
    // fallback discreto
    imgEl.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="100%" height="100%" fill="#222"/>
        <text x="50%" y="55%" font-size="12" text-anchor="middle" fill="#aaa" font-family="Arial">NO IMG</text>
      </svg>`);
  };
}

function createCarElement(color) {
  const el = document.createElement("div");
  el.className = "practice-car";
  // caso seu CSS não defina, garantimos visual mínimo:
  el.style.position = "absolute";
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.borderRadius = "50%";
  el.style.boxShadow = "0 0 0 2px rgba(0,0,0,.45)";
  el.style.background = color;
  el.style.transform = "translate(-6px, -6px)";
  el.style.pointerEvents = "none";
  return el;
}

function buildUserCars() {
  const drivers = (userDrivers.length === 2)
    ? userDrivers
    : DRIVERS_2025.filter(d => d.teamKey === "ferrari");

  // Preenche faces e infos se existirem no HTML
  setImgSafe(elP1Face, drivers[0].face, drivers[0].name);
  setImgSafe(elP2Face, drivers[1].face, drivers[1].name);

  if (elP1Info) elP1Info.textContent = `${drivers[0].name} • ${drivers[0].teamName || drivers[0].teamKey}`;
  if (elP2Info) elP2Info.textContent = `${drivers[1].name} • ${drivers[1].teamName || drivers[1].teamKey}`;

  // Cria layer para carros por cima do SVG
  const overlay = document.createElement("div");
  overlay.id = "cars-layer";
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.pointerEvents = "none";

  // #track-container precisa ser position:relative no CSS (se não for, forçamos aqui)
  if (elTrackContainer) {
    const cs = getComputedStyle(elTrackContainer);
    if (cs.position === "static") elTrackContainer.style.position = "relative";
    elTrackContainer.appendChild(overlay);
  }

  practice.cars = drivers.map((drv, i) => {
    const carEl = createCarElement(drv.color);
    overlay.appendChild(carEl);

    // velocidade base (m/s) realista: depende de rating + setup
    // depois refinamos por setores e mapas de motor
    const baseSpeed = 70 + (drv.rating * 0.45); // ~109..114 m/s (alta, mas normalizada pela pista)
    const speedMS = baseSpeed * practice.setupMul.vMaxMul;

    return {
      driver: drv,
      el: carEl,
      mode: "NORMAL",
      progress: i * 0.52, // espalha
      lap: 0,
      lapStartMs: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity,
      tyres: { compound: "SOFT", wear: 0.16, temp: 92, pressure: 23.0 },
      fuel: { pct: 0.75 },
      ers: { pct: 1.0 },
      pit: { active: false, remaining: 0 },
      speedMS
    };
  });

  // Lista "Pilotos na pista" (se existir no HTML)
  if (elDriversOnTrack) {
    elDriversOnTrack.innerHTML = "";
    practice.cars.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "driverRow";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.marginBottom = "6px";

      const dot = document.createElement("span");
      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.borderRadius = "50%";
      dot.style.background = c.driver.color;
      dot.style.display = "inline-block";

      const name = document.createElement("span");
      name.textContent = `${idx + 1}. ${c.driver.name}`;

      row.appendChild(dot);
      row.appendChild(name);
      elDriversOnTrack.appendChild(row);
    });
  }
}

/* ===============================
   FÍSICA SIMPLES + TIMING
   =============================== */
function applyModeMultipliers(car) {
  // Modo afeta velocidade / desgaste / combustível
  let speedMul = 1.0;
  let wearMul = 1.0;
  let fuelMul = 1.0;

  if (car.mode === "ECO") {
    speedMul = 0.965;
    wearMul = 0.90;
    fuelMul = 0.85;
  } else if (car.mode === "ATTACK") {
    speedMul = 1.03;
    wearMul = 1.18;
    fuelMul = 1.15;
  }

  return { speedMul, wearMul, fuelMul };
}

function updateUI() {
  if (elSessionTime) elSessionTime.textContent = formatClock(practice.sessionSeconds);

  // Melhor volta geral (se existir)
  if (elBestLap) {
    elBestLap.textContent = isFinite(practice.bestLapMs) ? formatTimeMs(practice.bestLapMs) : "--:--.---";
  }

  // Atualiza infos textuais simples (p1info/p2info)
  const c1 = practice.cars[0];
  const c2 = practice.cars[1];

  if (elP1Info && c1) {
    elP1Info.textContent =
      `${c1.driver.name}\n` +
      `Modo: ${c1.mode}\n` +
      `${c1.tyres.compound} • Desgaste ${(c1.tyres.wear * 100).toFixed(0)}%\n` +
      `Combustível ${(c1.fuel.pct * 100).toFixed(0)}%\n` +
      `Última volta: ${c1.lastLapMs ? formatTimeMs(c1.lastLapMs) : "--:--.---"}\n` +
      `Melhor: ${isFinite(c1.bestLapMs) ? formatTimeMs(c1.bestLapMs) : "--:--.---"}`;
  }

  if (elP2Info && c2) {
    elP2Info.textContent =
      `${c2.driver.name}\n` +
      `Modo: ${c2.mode}\n` +
      `${c2.tyres.compound} • Desgaste ${(c2.tyres.wear * 100).toFixed(0)}%\n` +
      `Combustível ${(c2.fuel.pct * 100).toFixed(0)}%\n` +
      `Última volta: ${c2.lastLapMs ? formatTimeMs(c2.lastLapMs) : "--:--.---"}\n` +
      `Melhor: ${isFinite(c2.bestLapMs) ? formatTimeMs(c2.bestLapMs) : "--:--.---"}`;
  }
}

/* ===============================
   LOOP PRINCIPAL (deltaTime correto)
   =============================== */
function tick(now) {
  const dt = Math.max(0, (now - practice.lastNow) / 1000);
  practice.lastNow = now;

  if (!practice.running) {
    requestAnimationFrame(tick);
    return;
  }

  const simDt = dt * practice.speedMultiplier;

  // relógio da sessão
  practice.sessionSeconds -= simDt;
  if (practice.sessionSeconds <= 0) {
    practice.sessionSeconds = 0;
    practice.running = false;
  }

  // move carros
  const pts = practice.pathPoints;
  const n = pts.length;

  for (const car of practice.cars) {
    // pit stop (pausa real)
    if (car.pit.active) {
      car.pit.remaining -= simDt;
      if (car.pit.remaining <= 0) {
        car.pit.active = false;
        car.tyres.wear = Math.max(0.05, car.tyres.wear - 0.18); // troca/refresh parcial
        car.ers.pct = 1.0;
      }
      continue;
    }

    const { speedMul, wearMul, fuelMul } = applyModeMultipliers(car);

    // Velocidade efetiva (m/s)
    const v = car.speedMS * speedMul;

    // converte deslocamento (m) em progresso (0..1) por volta
    const dProg = (v * simDt) / practice.trackLengthM;

    car.progress += dProg;

    // desgaste / combustível (simples, estável)
    car.tyres.wear = Math.min(1.0, car.tyres.wear + (0.00055 * simDt * wearMul * practice.setupMul.tyreWearMul));
    car.fuel.pct = Math.max(0, car.fuel.pct - (0.00035 * simDt * fuelMul * practice.setupMul.fuelUseMul));
    car.ers.pct = Math.max(0, car.ers.pct - (0.00025 * simDt * (car.mode === "ATTACK" ? 1.35 : 1.0)));

    // volta completada
    if (car.progress >= 1) {
      car.progress -= 1;
      car.lap += 1;

      const lapMs = now - car.lapStartMs;
      car.lapStartMs = now;
      car.lastLapMs = lapMs;
      if (lapMs < car.bestLapMs) car.bestLapMs = lapMs;
      if (lapMs < practice.bestLapMs) practice.bestLapMs = lapMs;
    }

    // posicionamento no traçado
    const idx = Math.floor(car.progress * (n - 1));
    const p = pts[idx];
    if (!p) continue;

    // cars-layer cobre o SVG com viewBox 0..1000 x 0..600
    // Para posicionar corretamente, usamos % relativo do viewBox
    // Convertendo (x,y) do viewBox -> %:
    const leftPct = (p.x / 1000) * 100;
    const topPct = (p.y / 600) * 100;

    car.el.style.left = `${leftPct}%`;
    car.el.style.top = `${topPct}%`;
  }

  updateUI();
  requestAnimationFrame(tick);
}

/* ===============================
   BOOTSTRAP
   =============================== */
(async function boot() {
  const ok = await loadTrackSvgAndBuildPoints();
  if (!ok) return;

  // Corrige o problema do seu print: “PISTA — Carregando...” nunca sai
  // (se houver algum elemento específico, você pode alterar aqui; mantemos neutro)

  buildUserCars();

  // Se o HTML tem botões 1x/2x/4x sem data-speed (onclick), já está via window.setSpeed.
  // Se tem data-speed, já bindamos também.
  window.setSpeed(1);

  practice.ready = true;
  practice.lastNow = performance.now();
  requestAnimationFrame(tick);

  console.log("✅ practice.js inicializado (SVG + pathPoints + carros + velocidade OK)");
})();
