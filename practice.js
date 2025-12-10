// ==========================================================
// F1 MANAGER 2025 – PRACTICE.JS
// ==========================================================

const PRACTICE_STATE = {
  trackName: null,
  gpName: null,
  userTeamKey: null,
  managerName: null,
  managerCountry: null,

  timeRemainingMs: 60 * 60 * 1000, // 60 minutos
  running: true,
  speedMultiplier: 1,

  pathPoints: [],
  drivers: [],
  visuals: [],

  lastUpdateTime: null,
};

// ==========================================================
// DRIVERS 2025
// (mesmos usados no qualifying/corrida)
// ==========================================================

importDrivers();

function importDrivers() {
  if (window.DRIVERS_2025) return;
  console.error("DRIVERS_2025 não encontrado. Certifique-se de que o arquivo foi incluído antes.");
}

// ==========================================================
// INIT
// ==========================================================

window.addEventListener("DOMContentLoaded", () => {
  initPractice();
});

function initPractice() {
  // ====== Ler parâmetros ======
  const params = new URLSearchParams(window.location.search);
  PRACTICE_STATE.trackName = params.get("track") || "australia";
  PRACTICE_STATE.gpName = params.get("gp") || "GP 2025";
  PRACTICE_STATE.userTeamKey =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  PRACTICE_STATE.managerName =
    localStorage.getItem("f1m2025_manager_name") || "Manager";
  PRACTICE_STATE.managerCountry =
    localStorage.getItem("f1m2025_manager_country") || "brazil";

  // ====== Preencher UI TOP ======
  document.getElementById("practice-manager-name").textContent =
    PRACTICE_STATE.managerName;

  document.getElementById("practice-country-name").textContent =
    PRACTICE_STATE.managerCountry.toUpperCase();

  // TEAM LOGO
  try {
    const logoPath = `assets/logos/${PRACTICE_STATE.userTeamKey}.png`;
    document.getElementById("practice-team-logo").src = logoPath;
  } catch (e) {}

  document.getElementById("practice-team-name").textContent =
    PRACTICE_STATE.userTeamKey.toUpperCase();

  // COUNTRY FLAG
  try {
    const flagPath = `assets/flags/${PRACTICE_STATE.managerCountry}.png`;
    document.getElementById("practice-flag").src = flagPath;
  } catch (e) {}

  document.getElementById("practice-gp-title").textContent = PRACTICE_STATE.gpName;

  // ====== Setup de pilotos ======
  PRACTICE_STATE.drivers = DRIVERS_2025.map((drv, i) => ({
    ...drv,
    index: i,
    progress: Math.random(),
    speedBase: 0.00002 + drv.rating / 700000, // lento
    laps: 0,
    lastLapTime: null,
    bestLapTime: null,
    lastLapTs: null,
    tyreWear: 0, // 0–100%
    carWear: 100 // 100–0%
  }));

  // ====== Preencher pilotos da equipe ======
  fillUserCards();

  // ====== Bind speed buttons ======
  document.querySelectorAll(".practice-speed-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".practice-speed-btn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      PRACTICE_STATE.speedMultiplier = Number(btn.dataset.speed) || 1;
    });
  });

  // ====== Bind Navegação ======
  document.getElementById("practice-back-lobby").onclick = () => {
    window.location.href = "lobby.html";
  };

  document.getElementById("practice-open-garage").onclick = () => {
    // salvar estado rápido
    savePracticeSettings();
    window.location.href = "oficina.html";
  };

  // ====== Track ======
  loadTrack(PRACTICE_STATE.trackName).then(() => {
    PRACTICE_STATE.lastUpdateTime = performance.now();
    requestAnimationFrame(loopPractice);
  });
}

// ==========================================================
// CARREGAR SVG DA PISTA
// ==========================================================

async function loadTrack(track) {
  const container = document.getElementById("track-container");
  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  let text;
  try {
    const resp = await fetch(`assets/tracks/${track}.svg`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG:", e);
    return;
  }

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) return;

  const pts = [];
  const len = path.getTotalLength();
  for (let i = 0; i < 450; i++) {
    const p = path.getPointAtLength((len * i) / 450);
    pts.push({ x: p.x, y: p.y });
  }

  // normalizar
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  PRACTICE_STATE.pathPoints = pts.map((p) => ({
    x: ((p.x - minX) / (maxX - minX)) * 1000,
    y: ((p.y - minY) / (maxY - minY)) * 600,
  }));

  // pista
  const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  pl.setAttribute(
    "points",
    PRACTICE_STATE.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  pl.setAttribute("fill", "none");
  pl.setAttribute("stroke", "#4d4d4d");
  pl.setAttribute("stroke-width", "22");
  pl.setAttribute("stroke-linecap", "round");
  pl.setAttribute("stroke-linejoin", "round");
  svg.appendChild(pl);

  // linha branca
  const pl2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  pl2.setAttribute(
    "points",
    PRACTICE_STATE.pathPoints.map((p) => `${p.x},${p.y}`).join(" ")
  );
  pl2.setAttribute("fill", "none");
  pl2.setAttribute("stroke", "#ffffff");
  pl2.setAttribute("stroke-width", "6");
  svg.appendChild(pl2);

  // carros
  PRACTICE_STATE.visuals = PRACTICE_STATE.drivers.map((drv) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const car = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    car.setAttribute("r", 6);
    car.setAttribute("fill", drv.color);
    car.setAttribute("stroke", "#000");
    car.setAttribute("stroke-width", "1.5");
    g.appendChild(car);

    svg.appendChild(g);
    return { id: drv.id, group: g };
  });
}

// ==========================================================
// LOOP PRINCIPAL
// ==========================================================

function loopPractice(ts) {
  if (!PRACTICE_STATE.running) return;

  const dt =
    PRACTICE_STATE.lastUpdateTime != null
      ? (ts - PRACTICE_STATE.lastUpdateTime) * PRACTICE_STATE.speedMultiplier
      : 0;
  PRACTICE_STATE.lastUpdateTime = ts;

  updatePractice(dt);
  renderPractice();

  requestAnimationFrame(loopPractice);
}

// ==========================================================
// UPDATE
// ==========================================================

function updatePractice(dtMs) {
  // tempo da sessão
  PRACTICE_STATE.timeRemainingMs -= dtMs;
  if (PRACTICE_STATE.timeRemainingMs <= 0) {
    PRACTICE_STATE.timeRemainingMs = 0;
    PRACTICE_STATE.running = false;
    endPracticeSession();
  }

  updateSessionTimeLabel();

  // simular pilotos
  const now = performance.now();

  PRACTICE_STATE.drivers.forEach((drv) => {
    const delta = drv.speedBase * dtMs;
    let prog = drv.progress + delta;
    if (prog >= 1) {
      prog -= 1;

      const lapTime = drv.lastLapTs
        ? now - drv.lastLapTs
        : 95000 + Math.random() * 5000;

      drv.laps++;
      drv.lastLapTime = lapTime;
      if (drv.bestLapTime == null || lapTime < drv.bestLapTime)
        drv.bestLapTime = lapTime;

      drv.lastLapTs = now;

      // desgaste de pneus e carro
      drv.tyreWear += 1 + Math.random() * 2;
      drv.carWear -= 0.3 + Math.random() * 0.5;
      if (drv.tyreWear > 100) drv.tyreWear = 100;
      if (drv.carWear < 0) drv.carWear = 0;
    }
    drv.progress = prog;
    if (!drv.lastLapTs) drv.lastLapTs = now;
  });

  updateDriversList();
  updateUserPanel();
}

// ==========================================================
// RENDER
// ==========================================================

function renderPractice() {
  if (!PRACTICE_STATE.pathPoints.length) return;
  const map = {};
  PRACTICE_STATE.drivers.forEach((d) => (map[d.id] = d));

  PRACTICE_STATE.visuals.forEach((v) => {
    const d = map[v.id];
    if (!d) return;
    const pos = getPos(d.progress);
    v.group.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });
}

function getPos(progress) {
  const pts = PRACTICE_STATE.pathPoints;
  const total = pts.length;
  let i0 = Math.floor(progress * total);
  let i1 = (i0 + 1) % total;
  const t = progress * total - i0;
  const p0 = pts[i0];
  const p1 = pts[i1];
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
}

// ==========================================================
// UI
// ==========================================================

function updateSessionTimeLabel() {
  const lbl = document.getElementById("practice-time-remaining");
  if (!lbl) return;

  let t = PRACTICE_STATE.timeRemainingMs;
  const mins = Math.floor(t / 60000);
  t -= mins * 60000;
  const secs = Math.floor(t / 1000);
  lbl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function updateDriversList() {
  const list = document.getElementById("practice-drivers-list");
  if (!list) return;

  const sorted = [...PRACTICE_STATE.drivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    const ta = a.bestLapTime ?? Infinity;
    const tb = b.bestLapTime ?? Infinity;
    return ta - tb;
  });

  list.innerHTML = "";

  sorted.forEach((drv, idx) => {
    const row = document.createElement("div");
    row.className = "practice-driver-row";

    if (drv.teamKey === PRACTICE_STATE.userTeamKey) {
      row.classList.add("practice-user-team-row");
    }

    row.innerHTML = `
      <div class="practice-driver-pos">${idx + 1}º</div>
      <div class="practice-driver-info">
        <img class="practice-driver-face" src="${drv.face}" />
        <div class="practice-driver-text">
          <div class="practice-driver-name">${drv.name}</div>
          <div class="practice-driver-team">${drv.teamName}</div>
        </div>
      </div>
      <div class="practice-driver-stats">
        <div class="practice-stat-line">Voltas <span>${drv.laps}</span></div>
        <div class="practice-stat-line">Melhor <span>${fmt(drv.bestLapTime)}</span></div>
        <div class="practice-stat-line">Última <span>${fmt(drv.lastLapTime)}</span></div>
      </div>
    `;

    list.appendChild(row);
  });
}

function updateUserPanel() {
  const team = PRACTICE_STATE.userTeamKey;
  const drivers = PRACTICE_STATE.drivers.filter((d) => d.teamKey === team).slice(0, 2);

  drivers.forEach((drv, i) => {
    document.getElementById(`practice-user-name-${i}`).textContent = drv.name;
    document.getElementById(`practice-user-team-${i}`).textContent = drv.teamName;
    document.getElementById(`practice-user-car-${i}`).textContent =
      Math.floor(drv.carWear) + "%";
    document.getElementById(`practice-user-tyre-${i}`).textContent =
      Math.floor(drv.tyreWear) + "%";
    document.getElementById(`practice-user-face-${i}`).src = drv.face;
  });
}

function fillUserCards() {}

// ==========================================================
// HELPER FORMAT
// ==========================================================

function fmt(ms) {
  if (!isFinite(ms)) return "--:--.---";
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const mil = Math.floor((s - m * 60 - sec) * 1000);
  return `${m}:${String(sec).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

// ==========================================================
// SALVAR ESTADO PARA OFICINA
// ==========================================================

function savePracticeSettings() {
  const payload = {
    team: PRACTICE_STATE.userTeamKey,
    drivers: PRACTICE_STATE.drivers
      .filter((d) => d.teamKey === PRACTICE_STATE.userTeamKey)
      .slice(0, 2)
      .map((d) => ({
        id: d.id,
        carWear: d.carWear,
        tyreWear: d.tyreWear,
      })),
  };

  try {
    localStorage.setItem("f1m2025_practice_status", JSON.stringify(payload));
  } catch (e) {
    console.warn("Não salvou practice:", e);
  }
}

// ==========================================================
// FINALIZAÇÃO DA SESSÃO
// ==========================================================

function endPracticeSession() {
  savePracticeSettings();
  alert("Treino finalizado! Ajustes salvos. Vá para Oficina ou Qualificação.");
}
