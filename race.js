/* =========================================================
   F1 MANAGER 2025 – RACE SYSTEM (STABLE CORE + MARKET LINK)
   - Mantém mecânica atual (progress por speed)
   - Liga Mercado de Pilotos (2 pilotos por equipe)
   - Rating + Form influenciam speed (leve)
   - Contratos: salário/bônus/multa aplicados no fim do GP
   ========================================================= */

import { TRACKS_2025 } from "./data.js";

/* =========================
   PARÂMETROS GERAIS
   ========================= */

const params = new URLSearchParams(window.location.search);
const trackId = (params.get("track") || "australia").toLowerCase();
const gpName = params.get("gp") || "GP";
const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();

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
let resultsCommitted = false;

/* =========================
   PILOTOS (FALLBACK)
   ========================= */

const FALLBACK_DRIVERS = [
  { id: "LEC", name: "Leclerc", team: "ferrari" },
  { id: "SAI", name: "Sainz", team: "ferrari" },
  { id: "VER", name: "Verstappen", team: "redbull" },
  { id: "PER", name: "Perez", team: "redbull" },
  { id: "HAM", name: "Hamilton", team: "mercedes" },
  { id: "RUS", name: "Russell", team: "mercedes" },
  { id: "NOR", name: "Norris", team: "mclaren" },
  { id: "PIA", name: "Piastri", team: "mclaren" },
  { id: "ALO", name: "Alonso", team: "aston_martin" },
  { id: "STR", name: "Stroll", team: "aston_martin" },
  { id: "GAS", name: "Gasly", team: "alpine" },
  { id: "OCO", name: "Ocon", team: "alpine" },
  { id: "ALB", name: "Albon", team: "williams" },
  { id: "SAR", name: "Sargeant", team: "williams" },
  { id: "HUL", name: "Hulkenberg", team: "haas" },
  { id: "MAG", name: "Magnussen", team: "haas" },
  // ✅ Sauber com BOR garantido
  { id: "BOR", name: "Bortoleto", team: "sauber" },
  { id: "ZHO", name: "Zhou", team: "sauber" }
];

/* =========================
   HELPERS
   ========================= */

function getRoundContext() {
  try {
    const ss = JSON.parse(localStorage.getItem("f1m2025_season_state")) || {};
    const round = Number(ss?.current?.round) || Number(localStorage.getItem("F1M_round")) || 1;
    const year = Number(ss?.current?.year) || 2025;
    return { year, round };
  } catch {
    return { year: 2025, round: Number(localStorage.getItem("F1M_round")) || 1 };
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function ptsForPos(pos) {
  const table = [25,18,15,12,10,8,6,4,2,1];
  return (pos >= 1 && pos <= 10) ? table[pos - 1] : 0;
}

function tryGetMarketDrivers() {
  // Se PilotMarketSystem estiver disponível (tela/versão com mercado), usa 2 pilotos por equipe
  try {
    if (typeof window.PilotMarketSystem === "undefined") return null;
    if (typeof window.PilotMarketSystem.init === "function") window.PilotMarketSystem.init();

    const teams = (typeof window.PilotMarketSystem.getTeams === "function")
      ? window.PilotMarketSystem.getTeams()
      : null;

    if (!teams || !teams.length) return null;

    const drivers = [];
    for (const t of teams) {
      const active = window.PilotMarketSystem.getActiveDriversForTeam(t) || [];
      for (const p of active) {
        drivers.push({
          id: String(p.id || "").toUpperCase(),
          name: p.name || p.id,
          team: String(p.teamKey || t).toLowerCase(),
          rating: clamp(Number(p.rating || 75), 40, 99),
          form: clamp(Number(p.form || 55), 0, 100)
        });
      }
    }

    return drivers.length ? drivers : null;
  } catch {
    return null;
  }
}

function getDriverMetaFromMarket(driverId) {
  try {
    if (typeof window.PilotMarketSystem === "undefined") return null;
    const p = window.PilotMarketSystem.getPilot(driverId);
    if (!p) return null;
    return {
      rating: clamp(Number(p.rating || 75), 40, 99),
      form: clamp(Number(p.form || 55), 0, 100),
      face: p.face || null,
      name: p.name || driverId
    };
  } catch {
    return null;
  }
}

/* =========================
   INIT
   ========================= */

async function initRace() {
  sessionTitle.textContent = `Corrida — ${gpName}`;

  const track = TRACKS_2025[trackId];
  if (!track) {
    console.error("Track não encontrada:", trackId);
    return;
  }

  // SVG + pontos do traçado
  trackData = await loadTrack(track.svg);
  if (!trackData) return;

  renderTrack(trackData.svgText);

  // Drivers: Mercado (preferência) ou fallback
  const marketDrivers = tryGetMarketDrivers();
  const drivers = marketDrivers || FALLBACK_DRIVERS;

  cars = drivers.map((d, index) => createCar(d, index));

  renderDriversPanel();
  startRaceLoop();
}

/* =========================
   TRACK LOADER
   ========================= */

async function loadTrack(svgPath) {
  try {
    const res = await fetch(svgPath);
    const svgText = await res.text();

    const pathPoints = extractPathPoints(svgText);
    if (!pathPoints || pathPoints.length < 10) {
      console.error("Falha ao extrair pathPoints do SVG:", svgPath);
      return null;
    }

    return { svgText, pathPoints };
  } catch (err) {
    console.error("Erro carregando pista:", err);
    return null;
  }
}

function renderTrack(svgText) {
  svgContainer.innerHTML = svgText;
}

function extractPathPoints(svgText) {
  // Procura a primeira path com d=
  const match = svgText.match(/<path[^>]*d="([^"]+)"/i);
  if (!match) return [];

  const d = match[1];

  // amostragem simples: pontos interpolados a partir de números do path
  // (mantém seu estilo e evita reescrever parse avançado)
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 10) return [];

  const points = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }

  // reduz/normaliza densidade
  const sampled = [];
  const step = Math.max(1, Math.floor(points.length / 800));
  for (let i = 0; i < points.length; i += step) sampled.push(points[i]);

  return sampled.length ? sampled : points;
}

/* =========================
   CAR FACTORY
   ========================= */

function createCar(driver, idx) {
  const id = String(driver.id || "").toUpperCase();
  const team = String(driver.team || "").toLowerCase();

  // base speed (mantida)
  const baseSpeed = 0.00075 + (Math.random() * 0.0002);

  // rating + form (leve, sem quebrar mecânica)
  const meta = getDriverMetaFromMarket(id);
  const rating = meta ? meta.rating : clamp(Number(driver.rating || 75), 40, 99);
  const form = meta ? meta.form : clamp(Number(driver.form || 55), 0, 100);

  // ajuste suave:
  // rating: até ±1.2%
  // form: até ±0.8%
  const ratingMul = 1 + ((rating - 75) * 0.0004);  // ~ (99-75)*0.0004 ≈ +0.96%
  const formMul = 1 + ((form - 55) * 0.00025);     // ~ (100-55)*0.00025 ≈ +1.125% (clamp abaixo)

  const perfMul = clamp(ratingMul * formMul, 0.985, 1.02);

  const car = {
    driverId: id,
    name: meta?.name || driver.name || id,
    team,
    progress: 0,
    speed: baseSpeed * perfMul,
    isUserTeam: team === userTeam
  };

  // Elemento “bolinha” (igual treino/quali: simples e estável)
  car.el = document.createElement("div");
  car.el.className = "car-dot";
  car.el.style.width = "10px";
  car.el.style.height = "10px";
  car.el.style.borderRadius = "50%";
  car.el.style.position = "absolute";
  car.el.style.transform = "translate(-50%, -50%)";
  car.el.style.background = getTeamColor(team);
  car.el.style.boxShadow = "0 0 10px rgba(0,0,0,0.55)";
  svgContainer.appendChild(car.el);

  return car;
}

function getTeamColor(team) {
  // cores rápidas; você pode casar com o seu theme depois
  const map = {
    ferrari: "#ff1e1e",
    redbull: "#1a2cff",
    mercedes: "#00ffe1",
    mclaren: "#ff8a00",
    aston_martin: "#00a86b",
    alpine: "#1ec8ff",
    williams: "#2b6bff",
    haas: "#d9d9d9",
    sauber: "#00ff5a",
    rb: "#4b6cff"
  };
  return map[team] || "#ffffff";
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

function updateCars() {
  cars.forEach(car => {
    car.progress += car.speed * speedMultiplier;

    if (car.progress >= 1 && !raceFinished) {
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

    car.el.style.left = point.x + "px";
    car.el.style.top = point.y + "px";
  });
}

/* =========================
   PAINEL DE PILOTOS
   ========================= */

function renderDriversPanel() {
  if (!pilotsPanel) return;

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
   PÓDIO + APLICA CONTRATOS
   ========================= */

function showPodium() {
  cancelAnimationFrame(animationId);

  const podium = [...cars].sort((a, b) => b.progress - a.progress);

  // ✅ resultados do GP (ordem final)
  const results = podium.map((c, i) => ({
    driverId: c.driverId,
    teamKey: c.team,
    position: i + 1,
    points: ptsForPos(i + 1),
    dnf: false
  }));

  // ✅ aplica contratos UMA VEZ
  if (!resultsCommitted && typeof window.PilotMarketSystem !== "undefined" && typeof window.PilotMarketSystem.applyRaceResults === "function") {
    resultsCommitted = true;
    const ctx = getRoundContext();
    window.PilotMarketSystem.applyRaceResults({
      year: ctx.year,
      round: ctx.round,
      userTeamKey: userTeam,
      results
    });
  }

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
