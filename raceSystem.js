// =======================================================
// RACE SYSTEM — INTEGRADO (TL / QUALI / SETUP / STAFF)
// NÃO altera jogabilidade — apenas liga os dados
// =======================================================

(function () {
  "use strict";

  // =======================================================
  // DEPENDÊNCIAS (já existentes no projeto)
  // =======================================================
  if (typeof F1MEconomy === "undefined") {
    console.error("F1MEconomy não encontrado");
  }

  // =======================================================
  // LEITURA DE CONTEXTO GLOBAL
  // =======================================================
  const seasonState =
    JSON.parse(localStorage.getItem("f1m2025_season_state")) || {};

  const economyState =
    typeof F1MEconomy !== "undefined"
      ? F1MEconomy.load()
      : null;

  const staffMods =
    economyState && typeof F1MEconomy.getModifiers === "function"
      ? F1MEconomy.getModifiers(economyState)
      : {
          pitTimeMul: 1.0,
          tireWearMul: 1.0,
          fuelUseMul: 1.0,
          setupEffectMul: 1.0
        };

  const setupData = seasonState.setup || {};
  const setupFactors = setupData.factors || {
    topSpeedFactor: 1,
    gripFactor: 1,
    stabilityFactor: 1,
    tyreWearFactor: 1,
    fuelFactor: 1
  };

  // =======================================================
  // CONFIGURAÇÕES BASE (mantidas)
  // =======================================================
  const BASE_PIT_LANE_LOSS = 22000; // ms (tempo real de pit lane)
  const BASE_PIT_SERVICE = 2800;   // ms (troca de pneus)

  // =======================================================
  // GRID DE LARGADA (usa Quali se existir)
  // =======================================================
  function getStartingGrid() {
    const quali = seasonState.qualifying;
    if (quali && Array.isArray(quali.grid)) {
      return quali.grid.slice();
    }
    return null;
  }

  // =======================================================
  // INICIALIZA CORRIDA
  // =======================================================
  window.iniciarCorrida = function (trackId) {
    console.log("🏁 Iniciando corrida:", trackId);

    const startingGrid = getStartingGrid();
    const cars = window.cars || [];

    if (startingGrid) {
      cars.sort((a, b) => {
        return (
          startingGrid.indexOf(a.driverId) -
          startingGrid.indexOf(b.driverId)
        );
      });
    }

    // Aplica setup e staff ANTES da largada
    cars.forEach((car) => {
      car.basePace *=
        setupFactors.topSpeedFactor *
        setupFactors.gripFactor *
        staffMods.setupEffectMul;

      car.tyreWearRate *=
        setupFactors.tyreWearFactor *
        staffMods.tireWearMul;

      car.fuelUseRate *=
        setupFactors.fuelFactor *
        staffMods.fuelUseMul;

      car.consistency =
        (car.consistency || 1) *
        setupFactors.stabilityFactor;
    });

    window.raceStarted = true;
    window.raceTime = 0;
    window.raceFinished = false;
  };

  // =======================================================
  // PIT STOP REALISTA (SEM QUEBRAR MECÂNICA)
  // =======================================================
  function startPitStop(car) {
    if (car.inPit) return;

    const pitLaneLoss =
      BASE_PIT_LANE_LOSS * staffMods.pitTimeMul;

    const serviceTime =
      BASE_PIT_SERVICE * staffMods.pitTimeMul;

    const randomError =
      Math.random() < 0.08
        ? 1200 + Math.random() * 2500
        : 0;

    car.inPit = true;
    car.pitTimer =
      pitLaneLoss + serviceTime + randomError;

    // Penalidade estrutural de pista
    car.progress -= 0.035;
    if (car.progress < 0) car.progress = 0;
  }

  // =======================================================
  // LOOP DE SIMULAÇÃO DA CORRIDA
  // =======================================================
  window.updateRace = function (deltaTime) {
    if (!window.raceStarted || window.raceFinished) return;

    const cars = window.cars || [];
    window.raceTime += deltaTime;

    cars.forEach((car) => {
      if (car.finished) return;

      // =========================
      // PIT STOP
      // =========================
      if (car.requestPit && !car.inPit) {
        startPitStop(car);
        car.requestPit = false;
      }

      if (car.inPit) {
        car.pitTimer -= deltaTime;
        if (car.pitTimer <= 0) {
          car.inPit = false;
          car.tyre = 100;
        }
        return;
      }

      // =========================
      // DESGASTE
      // =========================
      car.tyre -= car.tyreWearRate * deltaTime;
      if (car.tyre < 0) car.tyre = 0;

      // =========================
      // VARIAÇÃO NATURAL (consistência)
      // =========================
      const noise =
        (Math.random() - 0.5) *
        0.002 *
        car.consistency;

      // =========================
      // PROGRESSO NA PISTA
      // =========================
      car.progress +=
        (car.basePace + noise) * deltaTime;

      if (car.progress >= 1) {
        car.laps++;
        car.progress = 0;
        car.lastLapTime = window.raceTime;

        if (car.laps >= window.totalLaps) {
          car.finished = true;
          car.finishTime = window.raceTime;
        }
      }
    });

    // =========================
    // FINALIZA CORRIDA
    // =========================
    if (cars.every((c) => c.finished)) {
      window.raceFinished = true;
      finalizarCorrida(cars);
    }
  };

  // =======================================================
  // FINAL DA CORRIDA → ECONOMIA / CARREIRA
  // =======================================================
  function finalizarCorrida(cars) {
    cars.sort((a, b) => a.finishTime - b.finishTime);

    const resultado = cars.map((c, i) => ({
      position: i + 1,
      driver: c.driverName,
      team: c.team,
      time: c.finishTime
    }));

    // Aplica economia UMA VEZ (seguro)
    if (typeof F1MEconomy !== "undefined") {
      F1MEconomy.applyRaceResult(resultado);
    }

    if (typeof finalizarCorridaGP === "function") {
      finalizarCorridaGP(resultado);
    }

    console.log("🏆 Corrida finalizada");
  }
})();
