// ==========================================================
// F1 MANAGER 2025 – QUALIFYING.JS (Q1 / Q2 / Q3)
// ==========================================================

// ------------------------------
// CONFIG DAS FASES
// ------------------------------
const QUALY_PHASES = [
  { id: "Q1", totalLaps: 6, eliminated: 5 }, // 20 → 15
  { id: "Q2", totalLaps: 5, eliminated: 5 }, // 15 → 10
  { id: "Q3", totalLaps: 4, eliminated: 0 }  // 10 → grid final
];

// ------------------------------
// SEASON STORE (TL/QUALI/RACE LINK)
// ------------------------------
const SEASON_KEY = "f1m2025_season_state";
const ECON_KEY = "f1m2025_economy";

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    const bv = out[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) out[k] = deepMerge(bv || {}, pv);
    else out[k] = pv;
  }
  return out;
}

function loadSeason() {
  try {
    const raw = localStorage.getItem(SEASON_KEY);
    if (!raw) return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
    const obj = JSON.parse(raw);
    return deepMerge({ version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} }, obj);
  } catch (e) {
    return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
  }
}

function saveSeason(patch) {
  try {
    const s = loadSeason();
    const next = deepMerge(s, patch || {});
    localStorage.setItem(SEASON_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
}

function syncStaffFromEconomy() {
  try {
    const raw = localStorage.getItem(ECON_KEY);
    if (!raw) return;
    const econ = JSON.parse(raw);
    if (!econ || !econ.staff) return;
    saveSeason({
      staff: {
        pitCrewLevel: Number(econ.staff.pitCrewLevel ?? 3),
        tyreEngineerLevel: Number(econ.staff.tyreEngineerLevel ?? 3),
        setupEngineerLevel: Number(econ.staff.setupEngineerLevel ?? 3)
      }
    });
  } catch (e) {}
}

// ------------------------------
// TEMPO MÉDIO DE VOLTA POR PISTA (ms)
// valores aproximados baseados em temporadas recentes
// ------------------------------
const TRACK_BASE_LAPTIME = {
  australia: 84000,
  bahrain: 94000,
  saudi: 88000,
  japan: 86000,
  china: 93000,
  miami: 88000,
  imola: 86000,
  monaco: 72000,
  canada: 86000,
  spain: 84000,
  austria: 65000,
  britain: 82000,
  hungary: 74000,
  belgium: 100000,
  netherlands: 70000,
  monza: 78000,
  singapore: 98000,
  austin: 93000,
  mexico: 76000,
  brazil: 71000,
  las_vegas: 88000,
  qatar: 80000,
  abu_dhabi: 84000
};

// ------------------------------
// LISTA DE PILOTOS 2025
// ------------------------------
const DRIVERS_2025 = [
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 92, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

  { id: "norris",  code: "NOR", name: "Lando Norris",  teamKey: "mclaren", teamName: "McLaren", rating: 93, color: "#ff6f00", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 90, color: "#ff6f00", logo: "assets/logos/mclaren.png" },

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "astonmartin", teamName: "Aston Martin", rating: 92, color: "#00c853", logo: "assets/logos/aston_martin.png" },
  { id: "stroll", code: "STR", name: "Lance Stroll",    teamKey: "astonmartin", teamName: "Aston Martin", rating: 86, color: "#00c853", logo: "assets/logos/aston_martin.png" },

  { id: "gasly", code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#2979ff", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 89, color: "#2979ff", logo: "assets/logos/alpine.png" },

  { id: "albon", code: "ALB", name: "Alexander Albon", teamKey: "williams", teamName: "Williams", rating: 88, color: "#64b5f6", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 84, color: "#64b5f6", logo: "assets/logos/williams.png" },

  { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", rating: 88, color: "#90caf9", logo: "assets/logos/rb.png" },
  { id: "ricciardo", code: "RIC", name: "Daniel Ricciardo", teamKey: "rb", teamName: "RB", rating: 87, color: "#90caf9", logo: "assets/logos/rb.png" },

  { id: "bortoleto", code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03", logo: "assets/logos/sauber.png" },
  { id: "zhou",      code: "ZHO", name: "Guanyu Zhou",      teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03", logo: "assets/logos/sauber.png" },

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg", teamKey: "haas", teamName: "Haas", rating: 87, color: "#bdbdbd", logo: "assets/logos/haas.png" },
  { id: "magnussen",  code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 86, color: "#bdbdbd", logo: "assets/logos/haas.png" },
];

// ------------------------------
// ESTADO DA QUALY
// ------------------------------
const qualyState = {
  phaseIndex: 0,
  lap: 0,
  running: false,
  speedMult: 1,

  trackName: "australia",
  gpName: "GP 2025",
  userTeamKey: "ferrari",

  drivers: [],
  finalGrid: null
};

// ------------------------------
// PARAMS URL
// ------------------------------
const params = new URLSearchParams(window.location.search);
qualyState.trackName = (params.get("track") || "australia").toLowerCase();
qualyState.gpName = params.get("gp") || `GP ${qualyState.trackName.toUpperCase()} 2025`;
qualyState.userTeamKey =
  (params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari").toLowerCase();

localStorage.setItem("f1m2025_user_team", qualyState.userTeamKey);

// ------------------------------
// DOM
// ------------------------------
const elTrackName = document.getElementById("trackName");
const elPhaseName = document.getElementById("phaseName");
const elLapCounter = document.getElementById("lapCounter");
const elStatus = document.getElementById("sessionStatus");
const elTower = document.getElementById("drivers-list");

safeText(elTrackName, qualyState.gpName);

// ------------------------------
// HELPERS
// ------------------------------
function safeText(el, txt) {
  if (!el) return;
  el.textContent = String(txt ?? "");
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function formatLap(ms) {
  if (!ms || !isFinite(ms)) return "--:--.---";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  const ss = s.toFixed(3).padStart(6, "0");
  return `${m}:${ss}`;
}

// ------------------------------
// INIT DRIVERS
// ------------------------------
function initDrivers() {
  qualyState.drivers = DRIVERS_2025.map((d) => ({
    ...d,
    face: `assets/faces/${d.code}.png`,
    bestLapTime: 0,
    position: 0,
    eliminated: false
  }));
}
initDrivers();

// ------------------------------
// SIMULA UMA VOLTA (tempo em ms)
// ------------------------------
function simulateLapTime(driver) {
  const base = TRACK_BASE_LAPTIME[qualyState.trackName] || 84000;

  // rating influencia (mais rating, menor tempo)
  const ratingDelta = (driver.rating || 85) - 90;
  let skillFactor = 1 - ratingDelta * 0.006;
  skillFactor = clamp(skillFactor, 0.75, 1.18);

  // variação natural
  const noise = (Math.random() - 0.5) * 1400;

  // usa um leve efeito do setupEng (apenas consistência; sem mudar “feel”)
  const season = loadSeason();
  const setupEng = Number(season?.staff?.setupEngineerLevel ?? 3);
  const consistency = 1 - clamp((setupEng - 3) * 0.01, -0.03, 0.03);
  const noise2 = noise * consistency;

  return Math.max(60000, Math.round(base * skillFactor + noise2));
}

// ------------------------------
// RENDER TOWER
// ------------------------------
function renderTower() {
  if (!elTower) return;

  const list = qualyState.drivers.slice().sort((a, b) => {
    const ta = a.bestLapTime || 9999999;
    const tb = b.bestLapTime || 9999999;
    return ta - tb;
  });

  elTower.innerHTML = "";
  list.forEach((d, idx) => {
    d.position = idx + 1;

    const row = document.createElement("div");
    row.className = "driver-card";

    row.innerHTML = `
      <div class="driver-pos">${d.position}</div>
      <img class="driver-face" src="${d.face}" onerror="this.removeAttribute('src')" />
      <div class="driver-info">
        <div class="driver-name-text">${d.name}</div>
        <div class="driver-team-text">${d.teamName}</div>
      </div>
      <div class="driver-stats">
        <div class="stat-line"><span>${formatLap(d.bestLapTime)}</span></div>
      </div>
    `;

    elTower.appendChild(row);
  });
}

// ------------------------------
// EXECUTA UMA “RODADA” DE VOLTAS
// ------------------------------
function runQualyTick() {
  if (!qualyState.running) return;

  const phase = QUALY_PHASES[qualyState.phaseIndex];
  qualyState.lap += 1;

  qualyState.drivers.forEach((d) => {
    if (d.eliminated) return;
    const t = simulateLapTime(d);
    if (!d.bestLapTime || t < d.bestLapTime) d.bestLapTime = t;
  });

  renderTower();

  safeText(elPhaseName, phase.id);
  safeText(elLapCounter, `${qualyState.lap}/${phase.totalLaps}`);

  if (qualyState.lap >= phase.totalLaps) {
    endPhase();
  }
}

// ------------------------------
// ELIMINA E AVANÇA FASE
// ------------------------------
function endPhase() {
  const phase = QUALY_PHASES[qualyState.phaseIndex];
  qualyState.running = false;

  const ranked = qualyState.drivers
    .filter(d => !d.eliminated)
    .slice()
    .sort((a, b) => (a.bestLapTime || 9999999) - (b.bestLapTime || 9999999));

  if (phase.eliminated > 0) {
    const toEliminate = ranked.slice(-phase.eliminated);
    toEliminate.forEach(d => (d.eliminated = true));
  }

  if (phase.id === "Q3") {
    // grid final = todos ordenados pelo tempo
    qualyState.finalGrid = qualyState.drivers
      .slice()
      .sort((a, b) => (a.bestLapTime || 9999999) - (b.bestLapTime || 9999999))
      .map((d, i) => ({ ...d, position: i + 1 }));

    salvarGridFinalQualy();
    showQualyEndModal();
    return;
  }

  // próxima fase
  qualyState.phaseIndex += 1;
  qualyState.lap = 0;

  showQualyPhaseModal(phase.id);
}

// ------------------------------
// MODAIS (depende do seu HTML/CSS)
// ------------------------------
function showQualyPhaseModal(phaseId) {
  safeText(elStatus, `Fim ${phaseId} — Avançar`);
  // o seu HTML já chama window.onQualyModalAction()
}
function showQualyEndModal() {
  safeText(elStatus, "Qualificação encerrada — Ir para Corrida");
}

// ------------------------------
// SALVAR GRID NO LOCALSTORAGE
// ------------------------------
function salvarGridFinalQualy() {
  if (!qualyState.finalGrid || !Array.isArray(qualyState.finalGrid)) return;

  const payload = {
    track: qualyState.trackName,
    gp: qualyState.gpName,
    userTeamKey: qualyState.userTeamKey,
    timestamp: Date.now(),
    grid: qualyState.finalGrid.map((drv) => ({
      id: drv.id,
      name: drv.name,
      teamKey: drv.teamKey,
      teamName: drv.teamName,
      position: drv.position,
      bestLapTime: drv.bestLapTime
    }))
  };

  try {
    localStorage.setItem("f1m2025_last_qualy", JSON.stringify(payload));
    syncStaffFromEconomy();
    saveSeason({
      current: { track: payload.track, gp: payload.gp, updatedAt: Date.now() },
      qualifying: payload
    });
  } catch (e) {
    console.warn("Não foi possível salvar grid final da qualy:", e);
  }
}

// ------------------------------
// CONTROLE DE VELOCIDADE
// ------------------------------
function setQualySpeed(mult) {
  qualyState.speedMult = mult;
}

// ------------------------------
// AÇÃO DO MODAL (botões do seu HTML)
// ------------------------------
function onQualyModalAction(action) {
  if (action === "start") {
    qualyState.running = true;
    safeText(elStatus, "Qualificação em andamento");
    return;
  }

  if (action === "next") {
    // começa a próxima fase
    qualyState.running = true;
    safeText(elStatus, "Qualificação em andamento");
    return;
  }

  if (action === "goRace") {
    const url = new URL("race.html", window.location.href);
    url.searchParams.set("track", qualyState.trackName);
    url.searchParams.set("gp", qualyState.gpName);
    url.searchParams.set("userTeam", qualyState.userTeamKey);
    window.location.href = url.toString();
  }
}

// ------------------------------
// LOOP
// ------------------------------
setInterval(() => {
  if (!qualyState.running) return;
  runQualyTick();
}, 900 * (1 / (qualyState.speedMult || 1)));

// exporta funções para o HTML
window.setQualySpeed = setQualySpeed;
window.onQualyModalAction = onQualyModalAction;
