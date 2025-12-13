/* =========================================================
   F1 MANAGER 2025 — PRACTICE SYSTEM (TREINO LIVRE)
   - Mantém SVG + bolinhas
   - Mantém loop contínuo
   - Integra Mercado de Pilotos (rating + form)
   - Salva resultado para Qualifying
   ========================================================= */

import { TRACKS_2025 } from "./data.js";

/* =========================
   URL / CONTEXTO
   ========================= */

const params = new URLSearchParams(window.location.search);
const trackId = (params.get("track") || "australia").toLowerCase();
const gpName = params.get("gp") || "GP";
const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();

/* =========================
   DOM
   ========================= */

const svgContainer = document.getElementById("trackSvg");
const sessionTitle = document.getElementById("sessionName");
const driversPanel = document.getElementById("driversPanel");

/* =========================
   CONFIG
   ========================= */

const FPS = 60;
let speedMultiplier = 1;

/* =========================
   STATE
   ========================= */

let trackData = null;
let cars = [];
let animationId = null;
let sessionFinished = false;

/* =========================
   HELPERS
   ========================= */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function getCareerState() {
  try {
    return JSON.parse(localStorage.getItem("f1m2025_career_v61"));
  } catch {
    return null;
  }
}

function saveCareerState(st) {
  localStorage.setItem("f1m2025_career_v61", JSON.stringify(st));
}

function getPerfMultiplier(driverId) {
  try {
    if (!window.PilotMarketSystem) return 1;
    const p = PilotMarketSystem.getPilot(driverId);
    if (!p) return 1;

    const rating = clamp(p.rating || 75, 40, 99);
    const form = clamp(p.form || 55, 0, 100);

    const ratingMul = 1 + (rating - 75) * 0.0015;
    const formMul = 1 + (form - 55) * 0.0008;

    return clamp(ratingMul * formMul, 0.96, 1.03);
  } catch {
    return 1;
  }
}

function getDriversFromMarket() {
  try {
    if (!window.PilotMarketSystem) return null;

    PilotMarketSystem.init();
    const teams = PilotMarketSystem.getTeams();
    if (!teams || !teams.length) return null;

    const list = [];
    teams.forEach(team => {
      const drivers = PilotMarketSystem.getActiveDriversForTeam(team);
      drivers.forEach(p => {
        list.push({
          id: p.id,
          name: p.name,
          team: p.teamKey
        });
      });
    });

    return list.length ? list : null;
  } catch {
    return null;
  }
}

/* =========================
   TRACK
   ========================= */

async function loadTrack(svgPath) {
  try {
    const res = await fetch(svgPath);
    const svgText = await res.text();

    const match = svgText.match(/<path[^>]*d="([^"]+)"/i);
    if (!match) return null;

    const nums = match[1].match(/-?\d+(\.\d+)?/g);
    if (!nums) return null;

    const points = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      points.push({ x: +nums[i], y: +nums[i + 1] });
    }

    const sampled = [];
    const step = Math.max(1, Math.floor(points.length / 900));
    for (let i = 0; i < points.length; i += step) sampled.push(points[i]);

    return { svgText, pathPoints: sampled };
  } catch {
    return null;
  }
}

function renderTrack(svgText) {
  svgContainer.innerHTML = svgText;
}

/* =========================
   CAR FACTORY
   ========================= */

function createCar(driver) {
  const perfMul = getPerfMultiplier(driver.id);
  const baseSpeed = 0.00065 + Math.random() * 0.00015;

  const car = {
    driverId: driver.id,
    name: driver.name,
    team: driver.team,
    progress: Math.random() * 0.02,
    speed: baseSpeed * perfMul
  };

  const el = document.createElement("div");
  el.className = "car-dot";
  el.style.position = "absolute";
  el.style.width = "9px";
  el.style.height = "9px";
  el.style.borderRadius = "50%";
  el.style.transform = "translate(-50%, -50%)";
  el.style.background = getTeamColor(driver.team);
  el.style.boxShadow = "0 0 8px rgba(0,0,0,0.6)";
  svgContainer.appendChild(el);

  car.el = el;
  return car;
}

function getTeamColor(team) {
  const map = {
    ferrari: "#ff1e1e",
    redbull: "#1a2cff",
    mercedes: "#00ffe1",
    mclaren: "#ff8a00",
    aston_martin: "#00a86b",
    alpine: "#1ec8ff",
    williams: "#2b6bff",
    haas: "#cccccc",
    sauber: "#00ff5a",
    rb: "#4b6cff"
  };
  return map[team] || "#ffffff";
}

/* =========================
   LOOP
   ========================= */

function startLoop() {
  function loop() {
    updateCars();
    renderCars();

    if (!sessionFinished) {
      animationId = requestAnimationFrame(loop);
    }
  }
  loop();
}

function updateCars() {
  cars.forEach(car => {
    car.progress += car.speed * speedMultiplier;

    if (car.progress >= 1) {
      car.progress = 1;
      sessionFinished = true;
      finishPractice();
    }
  });
}

function renderCars() {
  cars.forEach(car => {
    const idx = Math.floor(car.progress * (trackData.pathPoints.length - 1));
    const pt = trackData.pathPoints[idx];
    if (!pt) return;

    car.el.style.left = pt.x + "px";
    car.el.style.top = pt.y + "px";
  });
}

/* =========================
   FINALIZAÇÃO TL
   ========================= */

function finishPractice() {
  cancelAnimationFrame(animationId);

  const ordered = [...cars].sort((a, b) => b.progress - a.progress);

  const results = ordered.map((c, i) => ({
    driverId: c.driverId,
    teamKey: c.team,
    position: i + 1
  }));

  const st = getCareerState();
  if (st) {
    st.season = st.season || {};
    st.season.session = st.season.session || {};
    st.season.session.practiceResults = results;
    saveCareerState(st);
  }

  alert("Treino Livre finalizado");
}

/* =========================
   CONTROLES
   ========================= */

window.setSpeed = v => {
  speedMultiplier = v;
};

/* =========================
   INIT
   ========================= */

async function init() {
  sessionTitle.textContent = `Treino Livre — ${gpName}`;

  const track = TRACKS_2025[trackId];
  if (!track) return;

  trackData = await loadTrack(track.svg);
  if (!trackData) return;

  renderTrack(trackData.svgText);

  const drivers =
    getDriversFromMarket() ||
    [];

  cars = drivers.map(d => createCar(d));

  startLoop();
}

init();
