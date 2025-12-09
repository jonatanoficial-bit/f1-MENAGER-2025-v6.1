// ==========================================================
// QUALIFYING.JS – COMPLETO E CORRIGIDO
// ==========================================================

// ------------------------------
// CONFIG DAS FASES
// ------------------------------
const QUALY_PHASES = [
  { id: "Q1", totalLaps: 6, eliminated: 5 },
  { id: "Q2", totalLaps: 5, eliminated: 5 },
  { id: "Q3", totalLaps: 4, eliminated: 0 }
];

// ------------------------------
// VELOCIDADE REAL POR PISTA
// ------------------------------
const TRACK_SPEED = {
  australia: 1.00,
  bahrein: 0.95,
  jedda: 0.98,
  suzuka: 1.05,
  interlagos: 1.15,
  qatar: 1.03,
  monaco: 0.80,
  spa: 1.20,
  monza: 1.25,
  default: 1.00
};

// ------------------------------
// DRIVERS 2025
// ------------------------------
const DRIVERS_2025 = [ ... (MESMO BLOCO ORIGINAL QUE VOCÊ POSTOU) ... ];

// ------------------------------
// ESTADO GLOBAL
// ------------------------------
const qualyState = {
  phaseIndex: 0,
  currentLap: 1,
  currentDrivers: [],
  finalGrid: null,
  nextPhaseDrivers: null,
  userTeamKey: null,
  trackName: null,
  gpName: null,
  modalMode: null,
  pathPoints: [],
  driverVisuals: [],
  lastUpdateTime: null,
  running: true,
  speedMultiplier: 1,
  trackFactor: 1
};

// ------------------------------
// INIT
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  initQualifying();
});

function initQualifying() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get("track") || "australia";
  const gp = params.get("gp") || "GP 2025";
  const userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  qualyState.trackName = track;
  qualyState.gpName = gp;
  qualyState.userTeamKey = userTeam;

  // velocidade real
  qualyState.trackFactor = TRACK_SPEED[track] || TRACK_SPEED.default;

  document.getElementById("qualy-title-gp").textContent = gp;

  atualizarHeaderFaseQualy();

  // cria pilotos
  qualyState.currentDrivers = DRIVERS_2025.map((drv, idx) => ({
    ...drv,
    index: idx,
    progress: Math.random(),
    speedBase: (0.000018 + drv.rating / 800000) * qualyState.trackFactor,
    speedVar: 0,
    laps: 0,
    bestLapTime: null,
    lastLapTime: null,
    lastLapTimestamp: null
  }));

  preencherPilotosDaEquipe();

  loadTrackSvg(track)
    .then(() => {
      qualyState.lastUpdateTime = performance.now();
      requestAnimationFrame(gameLoopQualy);
    });
}

// ------------------------------
// LOOP
// ------------------------------
function gameLoopQualy(timestamp) {
  if (!qualyState.running) return;

  const dt = qualyState.lastUpdateTime
    ? (timestamp - qualyState.lastUpdateTime) * qualyState.speedMultiplier
    : 0;

  qualyState.lastUpdateTime = timestamp;

  updateQualySimulation(dt);
  renderQualy();
  requestAnimationFrame(gameLoopQualy);
}

// ------------------------------
// SIMULAÇÃO
// ------------------------------
function updateQualySimulation(dtMs) {
  if (!qualyState.pathPoints.length) return;
  const fase = QUALY_PHASES[qualyState.phaseIndex];
  const now = performance.now();

  qualyState.currentDrivers.forEach((drv) => {
    const noise = (Math.random() - 0.5) * 0.000008;
    drv.speedVar = noise;
    const speed = drv.speedBase + drv.speedVar;

    let newProgress = drv.progress + speed * (dtMs || 0);

    if (newProgress >= 1) {
      newProgress -= 1;
      const lapTime = drv.lastLapTimestamp
        ? now - drv.lastLapTimestamp
        : 90000 + Math.random() * 3000;

      drv.laps += 1;
      drv.lastLapTime = lapTime;

      if (!drv.bestLapTime || lapTime < drv.bestLapTime) {
        drv.bestLapTime = lapTime;
      }

      drv.lastLapTimestamp = now;
    }

    drv.progress = newProgress;
    if (!drv.lastLapTimestamp) drv.lastLapTimestamp = now;
  });

  const maxLaps = Math.max(...qualyState.currentDrivers.map((d) => d.laps));

  if (maxLaps + 1 > qualyState.currentLap) {
    qualyState.currentLap = Math.min(maxLaps + 1, fase.totalLaps);
    atualizarHeaderFaseQualy();
  }

  if (maxLaps >= fase.totalLaps) {
    qualyState.running = false;
    finalizarFaseQualy();
  }

  atualizarListaPilotosQualy();
}

// ------------------------------
// AVANÇO DAS FASES
// ------------------------------
function finalizarFaseQualy() {
  const fase = QUALY_PHASES[qualyState.phaseIndex];

  const grid = [...qualyState.currentDrivers].sort(
    (a, b) => (a.bestLapTime ?? Infinity) - (b.bestLapTime ?? Infinity)
  );

  grid.forEach((drv, idx) => (drv.position = idx + 1));

  const ultima = qualyState.phaseIndex === QUALY_PHASES.length - 1;

  if (!ultima) {
    const classificados = grid.slice(0, grid.length - fase.eliminated);
    const eliminados = grid.slice(grid.length - fase.eliminated);

    qualyState.nextPhaseDrivers = classificados;
    qualyState.modalMode = "phase";
    mostrarModalQualyFase(fase.id, classificados, eliminados);
  } else {
    qualyState.finalGrid = grid;
    salvarGridFinalQualy();
    qualyState.modalMode = "final";
    mostrarModalQualyFinal(grid);
  }
}

// ------------------------------
// MUDAR VELOCIDADE
// ------------------------------
function setQualySpeed(mult) {
  qualyState.speedMultiplier = mult;
}
window.setQualySpeed = setQualySpeed;
window.onQualyModalAction = onQualyModalAction;
