// =======================================================
// RACE SYSTEM — v6.1 FINAL
// Integra: TL / Quali / Oficina / Staff / Contrato Manager
// NÃO altera HUD, SVG ou jogabilidade base
// =======================================================

(function () {
  "use strict";

  // -------------------------------------------------------
  // CONTEXTO GLOBAL
  // -------------------------------------------------------
  const seasonState = JSON.parse(localStorage.getItem("f1m2025_season_state")) || {};
  const current = seasonState.current || {};

  const ROUND = Number(current.round) || Number(localStorage.getItem("F1M_round")) || 1;
  const YEAR = Number(current.year) || 2025;
  const TOTAL_RACES = 24;

  // Economia / Contrato
  const economyState =
    typeof F1MEconomy !== "undefined" ? F1MEconomy.load() : null;

  const staffMods =
    economyState && F1MEconomy.getModifiers
      ? F1MEconomy.getModifiers(economyState)
      : {
          pitTimeMul: 1,
          tireWearMul: 1,
          fuelUseMul: 1,
          setupEffectMul: 1
        };

  // -------------------------------------------------------
  // VARIÁVEIS DA CORRIDA (já existiam no projeto)
  // -------------------------------------------------------
  window.cars = window.cars || [];
  window.totalLaps = window.totalLaps || 58;
  window.raceStarted = false;
  window.raceFinished = false;
  window.raceTime = 0;

  // -------------------------------------------------------
  // INÍCIO DA CORRIDA
  // -------------------------------------------------------
  window.iniciarCorrida = function iniciarCorrida() {
    window.raceStarted = true;
    window.raceFinished = false;
    window.raceTime = 0;

    // aplica influência de staff/setup SEM mudar lógica
    window.cars.forEach(car => {
      car.basePace *= staffMods.setupEffectMul;
      car.tyreWearRate *= staffMods.tireWearMul;
      car.fuelUseRate *= staffMods.fuelUseMul;
    });

    console.log("🏁 Corrida iniciada — Round", ROUND);
  };

  // -------------------------------------------------------
  // PIT STOP REALISTA (mantendo sua mecânica)
  // -------------------------------------------------------
  function iniciarPit(car) {
    if (car.inPit) return;

    const PIT_LANE_LOSS = 22000 * staffMods.pitTimeMul;
    const PIT_SERVICE = 2800 * staffMods.pitTimeMul;

    car.inPit = true;
    car.pitTimer = PIT_LANE_LOSS + PIT_SERVICE;

    // perda real de pista (não visual)
    car.progress -= 0.04;
    if (car.progress < 0) car.progress = 0;
  }

  // -------------------------------------------------------
  // LOOP PRINCIPAL
  // -------------------------------------------------------
  window.updateRace = function updateRace(dt) {
    if (!window.raceStarted || window.raceFinished) return;

    window.raceTime += dt;

    window.cars.forEach(car => {
      if (car.finished) return;

      // PIT
      if (car.requestPit && !car.inPit) {
        iniciarPit(car);
        car.requestPit = false;
      }

      if (car.inPit) {
        car.pitTimer -= dt;
        if (car.pitTimer <= 0) {
          car.inPit = false;
          car.tyre = 100;
        }
        return;
      }

      // desgaste
      car.tyre -= car.tyreWearRate * dt;
      if (car.tyre < 0) car.tyre = 0;

      // avanço
      car.progress += car.basePace * dt;

      if (car.progress >= 1) {
        car.laps++;
        car.progress = 0;

        if (car.laps >= window.totalLaps) {
          car.finished = true;
          car.finishTime = window.raceTime;
        }
      }
    });

    // FINAL DA CORRIDA
    if (window.cars.every(c => c.finished)) {
      window.raceFinished = true;
      finalizarCorrida();
    }
  };

  // -------------------------------------------------------
  // FINALIZAÇÃO + CONTRATO REAL
  // -------------------------------------------------------
  function finalizarCorrida() {
    const cars = window.cars.slice().sort((a, b) => a.finishTime - b.finishTime);

    // pontos F1 padrão (top 10)
    const POINTS_TABLE = [25,18,15,12,10,8,6,4,2,1];

    let teamPoints = 0;
    let bestTeamPos = 99;

    cars.forEach((c, i) => {
      if (c.isUserTeam) {
        if (i < POINTS_TABLE.length) teamPoints += POINTS_TABLE[i];
        bestTeamPos = Math.min(bestTeamPos, i + 1);
      }
    });

    // -----------------------------
    // 🔗 LIGAÇÃO COM CONTRATO REAL
    // -----------------------------
    if (typeof F1MEconomy !== "undefined") {
      F1MEconomy.settlePayoutsForRound({
        year: YEAR,
        round: ROUND,
        racesTotal: TOTAL_RACES,
        teamPoints,
        constructorsPoints:
          (economyState?.season?.constructorsPoints || 0) + teamPoints,
        constructorsPosition: economyState?.season?.constructorsPosition || bestTeamPos,
        podiums: bestTeamPos <= 3 ? 1 : 0,
        finishedTopX: bestTeamPos <= 10
      });
    }

    console.log("🏆 Corrida finalizada — Pontos:", teamPoints);
  }

})();
