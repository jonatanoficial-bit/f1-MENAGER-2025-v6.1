// =======================================
// F1 MANAGER 2025 - SISTEMA DE CORRIDA
// =======================================

console.log("raceSystem.js carregado");

// Referência ao estado global
const GS = window.GAME_STATE || {
  calendario: [],
  pilotos: [],
  equipes: []
};

// ------------------------
// CONFIGURAÇÃO DA SIMULAÇÃO
// ------------------------

// duração virtual de UMA volta em ms (em 1x)
const BASE_LAP_INTERVAL_MS = 1000;

// multiplicador de velocidade (1x, 2x, 4x...)
let raceSpeedMultiplier = 1;

// controle interno da corrida
let raceAnimationId = null;
let currentRace = null;
let lastFrameTime = null;

// ------------------------
// FUNÇÕES PÚBLICAS
// ------------------------

function setRaceSpeed(mult) {
  raceSpeedMultiplier = mult || 1;
  console.log("Velocidade da corrida:", raceSpeedMultiplier, "x");
}

function startRace(etapaIndex, onFinishCallback) {
  cancelRaceLoop();

  const pista =
    GS.calendario && GS.calendario[etapaIndex]
      ? GS.calendario[etapaIndex]
      : { nome: "Pista Genérica", voltas: 20 };

  const totalLaps = pista.voltas || 20;

  // monta grid inicial
  const grid = buildInitialGrid();

  currentRace = {
    etapaIndex,
    pista,
    totalLaps,
    currentLap: 1,
    grid,
    finished: false,
    onFinish: onFinishCallback
  };

  lastFrameTime = null;

  console.log(
    `Corrida iniciada: ${pista.nome} (${totalLaps} voltas) com ${grid.length} pilotos`
  );

  // chama primeira atualização para preencher UI
  if (typeof window.onRaceUpdate === "function") {
    window.onRaceUpdate({
      volta: currentRace.currentLap,
      total: currentRace.totalLaps,
      grid: cloneGrid(currentRace.grid)
    });
  }

  raceAnimationId = requestAnimationFrame(raceLoop);
}

// expõe globalmente para o main.js
window.setRaceSpeed = setRaceSpeed;
window.startRace = startRace;

// ------------------------
// CONSTRUÇÃO DO GRID
// ------------------------

function buildInitialGrid() {
  let pilotosFonte = [];

  if (Array.isArray(GS.pilotos) && GS.pilotos.length > 0) {
    pilotosFonte = GS.pilotos;
  } else {
    // fallback se não tiver pilotos no data.js
    for (let i = 1; i <= 20; i++) {
      pilotosFonte.push({
        id: i,
        nome: "Piloto " + i,
        equipeId: null,
        ritmo: 80 + Math.random() * 20 // 80–100
      });
    }
  }

  // cria objetos internos da corrida
  const grid = pilotosFonte.map((p, index) => ({
    id: p.id || index + 1,
    nome: p.nome || p.name || `Piloto ${index + 1}`,
    equipeId: p.equipeId || p.teamId || null,
    ritmoBase: p.ritmo || p.rating || 80 + Math.random() * 20,
    pos: index + 1,
    tempoTotal: 0,
    pneus: "M",
    desgaste: 0,
    fezPit: false
  }));

  return grid;
}

// ------------------------
// LOOP DA CORRIDA
// ------------------------

function raceLoop(timestamp) {
  if (!currentRace || currentRace.finished) return;

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
    raceAnimationId = requestAnimationFrame(raceLoop);
    return;
  }

  const delta = (timestamp - lastFrameTime) * raceSpeedMultiplier;

  if (delta >= BASE_LAP_INTERVAL_MS) {
    // processa uma volta
    processLap();
    lastFrameTime = timestamp;
  }

  if (!currentRace.finished) {
    raceAnimationId = requestAnimationFrame(raceLoop);
  }
}

function cancelRaceLoop() {
  if (raceAnimationId) {
    cancelAnimationFrame(raceAnimationId);
    raceAnimationId = null;
  }
}

// ------------------------
// LÓGICA DE CADA VOLTA
// ------------------------

function processLap() {
  const race = currentRace;
  if (!race) return;

  const lap = race.currentLap;
  const total = race.totalLaps;

  // simula tempo de volta para cada piloto
  race.grid.forEach((p) => {
    // ritmo base mais/menos aleatório
    const base = 80; // tempo base em segundos imaginários
    const ritmoFactor = (100 - p.ritmoBase) * 0.03; // quanto pior o ritmo, maior tempo
    const randomVar = (Math.random() - 0.5) * 0.8; // variação +/- 0.4s

    let lapTime = base + ritmoFactor + randomVar;

    // impacto do desgaste
    lapTime += p.desgaste * 0.01;

    // pit-stop ainda simples: chance pequena
    let fezPitAgora = false;
    if (!p.fezPit && lap > 5 && Math.random() < 0.05) {
      fezPitAgora = true;
      lapTime += 20 + Math.random() * 5; // tempo extra de pit
      p.fezPit = true;
      p.desgaste = Math.max(0, p.desgaste - 30); // pneus trocados
    }

    // aumenta desgaste geral
    const desgasteExtra = 2 + Math.random() * 3;
    p.desgaste = Math.min(100, p.desgaste + desgasteExtra);

    p.tempoTotal += lapTime;

    // só para debug
    if (fezPitAgora) {
      console.log(`${p.nome} realizou pit-stop na volta ${lap}`);
    }
  });

  // ordena por tempo total
  race.grid.sort((a, b) => a.tempoTotal - b.tempoTotal);

  // atualiza posições
  race.grid.forEach((p, index) => {
    p.pos = index + 1;
  });

  // envia atualização para UI
  if (typeof window.onRaceUpdate === "function") {
    window.onRaceUpdate({
      volta: lap,
      total,
      grid: cloneGrid(race.grid)
    });
  }

  // verifica fim
  race.currentLap++;

  if (race.currentLap > total) {
    finishRace();
  }
}

// ------------------------
// FINALIZA CORRIDA
// ------------------------

function finishRace() {
  if (!currentRace) return;

  currentRace.finished = true;
  cancelRaceLoop();

  const pista = currentRace.pista;
  const gridFinal = currentRace.grid.slice().sort((a, b) => a.pos - b.pos);

  const podiumNames = gridFinal.slice(0, 3).map((p) => p.nome);

  const resultado = {
    etapaIndex: currentRace.etapaIndex,
    pista: pista.nome || "Pista",
    pais: pista.pais || "",
    classificacao: gridFinal.map((p) => ({
      nome: p.nome,
      equipeId: p.equipeId,
      pos: p.pos
    })),
    podium: podiumNames
  };

  console.log("Corrida finalizada:", resultado);

  if (typeof currentRace.onFinish === "function") {
    currentRace.onFinish(resultado);
  }

  currentRace = null;
}

// ------------------------
// HELPERS
// ------------------------

function cloneGrid(grid) {
  return grid.map((p) => ({ ...p }));
}
