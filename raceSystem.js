// ================================
// F1 MANAGER 2025 - RACE SYSTEM
// ================================
// Responsável por:
// - Montar grid da corrida
// - Simular voltas, posições e gaps
// - Desgaste de pneus / combustível (simplificado)
// - Controle de velocidade: 1x / 2x / 4x
// - Atualizar HUD e torre
// - Encerrar corrida e chamar tela de pódio
//
// Depende apenas de window.gameState (se existir).
// Se não existir, cria um estado mínimo para não quebrar nada.

(function () {
  // -------------------------------
  // ESTADO GLOBAL DA CORRIDA
  // -------------------------------
  const raceState = {
    running: false,
    paused: false,
    speedMultiplier: 1, // 1x, 2x, 4x
    totalLaps: 10,
    currentLap: 1,
    trackLengthKm: 5.0, // usado apenas para cálculo de desgaste
    cars: [], // array de objetos {id, driverName, teamName, isPlayer, lap, progress, gapToLeader, tyreWear, fuel, pitStops, inPit, basePace}
    lastFrameTime: 0,
    accumulatedTime: 0,
    leaderRaceTime: 0,
    raceFinished: false
  };

  // Pequeno helper para garantir gameState
  function getGameState() {
    if (!window.gameState) {
      window.gameState = {};
    }
    if (!window.gameState.currentTeam) {
      // fallback simples para não quebrar caso não tenha carreira criada
      window.gameState.currentTeam = {
        name: "Vale GP",
        drivers: [
          { name: "J. Vale", rating: 88 },
          { name: "D. Kamila", rating: 85 }
        ]
      };
    }
    if (!window.gameState.currentGP) {
      window.gameState.currentGP = {
        name: "GP do Brasil",
        country: "Brasil",
        laps: 10,
        trackLengthKm: 4.3
      };
    }
    return window.gameState;
  }

  // -------------------------------
  // INICIALIZAÇÃO DA TELA DE CORRIDA
  // -------------------------------
  function initRaceSystem() {
    // Botões de controle de corrida
    const btnStart = document.getElementById("btnStartRace");
    const btnPause = document.getElementById("btnPauseRace");
    const btnSpeed1 = document.getElementById("btnSpeed1x");
    const btnSpeed2 = document.getElementById("btnSpeed2x");
    const btnSpeed4 = document.getElementById("btnSpeed4x");

    if (btnStart) {
      btnStart.addEventListener("click", () => {
        if (!raceState.running || raceState.raceFinished) {
          startNewRace();
        } else {
          resumeRace();
        }
      });
    }

    if (btnPause) {
      btnPause.addEventListener("click", () => {
        pauseRace();
      });
    }

    if (btnSpeed1) {
      btnSpeed1.addEventListener("click", () => setSpeed(1));
    }
    if (btnSpeed2) {
      btnSpeed2.addEventListener("click", () => setSpeed(2));
    }
    if (btnSpeed4) {
      btnSpeed4.addEventListener("click", () => setSpeed(4));
    }

    // Expor alguns métodos para outros scripts (se precisarem)
    window.raceSystem = {
      startNewRace,
      pauseRace,
      resumeRace,
      setSpeed,
      getRaceState: () => raceState
    };

    // Opcional: se quiser iniciar automaticamente ao entrar na tela,
    // pode descomentar a linha abaixo:
    // startNewRace();
  }

  // -------------------------------
  // CONFIGURAÇÃO DA CORRIDA
  // -------------------------------

  function startNewRace() {
    const gs = getGameState();

    // Configuração básica
    raceState.totalLaps = gs.currentGP?.laps || 10;
    raceState.trackLengthKm = gs.currentGP?.trackLengthKm || 5.0;
    raceState.currentLap = 1;
    raceState.leaderRaceTime = 0;
    raceState.raceFinished = false;

    // Monta grid de carros
    raceState.cars = buildGridFromGameState(gs);

    // Reseta estados
    raceState.running = true;
    raceState.paused = false;
    raceState.speedMultiplier = 1;
    raceState.lastFrameTime = 0;
    raceState.accumulatedTime = 0;

    highlightSpeedButtons();
    updateHUD(true);
    renderTower();

    // Garantir que a tela de corrida esteja visível (se existir lógica de telas)
    const telaCorrida = document.getElementById("tela-corrida");
    if (telaCorrida && !telaCorrida.classList.contains("visible")) {
      // Se você tiver um gerenciador de telas (showScreen), ele deve ser usado aqui.
      // Por segurança, apenas marcamos como visible:
      telaCorrida.classList.add("visible");
    }

    requestAnimationFrame(raceLoop);
  }

  function buildGridFromGameState(gs) {
    const cars = [];
    let idCounter = 1;

    // Carros do jogador
    const playerTeam = gs.currentTeam;
    if (playerTeam && Array.isArray(playerTeam.drivers)) {
      playerTeam.drivers.forEach((driver, index) => {
        cars.push({
          id: idCounter++,
          driverName: driver.name,
          teamName: playerTeam.name || "Equipe Jogador",
          isPlayer: true,
          lap: 1,
          progress: 0, // 0–1 dentro da volta
          gapToLeader: 0,
          tyreWear: 0.0, // 0–1
          fuel: 1.0, // 0–1
          pitStops: 0,
          inPit: false,
          pitTimer: 0,
          basePace: calcBasePace(driver.rating || 85, true),
          gridPosition: index + 1
        });
      });
    }

    // Times IA simples (placeholder) - você pode depois ligar com seu database
    const aiTeams = gs.aiTeams || getDefaultAITeams();

    aiTeams.forEach((team) => {
      team.drivers.forEach((driver) => {
        cars.push({
          id: idCounter++,
          driverName: driver.name,
          teamName: team.name,
          isPlayer: false,
          lap: 1,
          progress: 0,
          gapToLeader: 0,
          tyreWear: 0,
          fuel: 1,
          pitStops: 0,
          inPit: false,
          pitTimer: 0,
          basePace: calcBasePace(driver.rating, false),
          gridPosition: idCounter // apenas para diferenciar
        });
      });
    });

    // Embaralha grid levemente
    cars.sort((a, b) => b.basePace - a.basePace);

    return cars;
  }

  function getDefaultAITeams() {
    // Grid simples de exemplo (pode ser substituído por dados reais do seu database)
    return [
      {
        name: "Mercedes",
        drivers: [
          { name: "G. Russell", rating: 89 },
          { name: "L. Hamilton", rating: 92 }
        ]
      },
      {
        name: "Red Bull",
        drivers: [
          { name: "M. Verstappen", rating: 96 },
          { name: "S. Perez", rating: 88 }
        ]
      },
      {
        name: "Ferrari",
        drivers: [
          { name: "C. Leclerc", rating: 91 },
          { name: "C. Sainz", rating: 90 }
        ]
      },
      {
        name: "McLaren",
        drivers: [
          { name: "L. Norris", rating: 92 },
          { name: "O. Piastri", rating: 88 }
        ]
      }
      // Você pode adicionar todas as equipes reais depois
    ];
  }

  function calcBasePace(rating = 80, isPlayer = false) {
    // Quanto maior o rating, menor o tempo de volta (melhor o pace).
    // Aqui vamos usar um valor "pace" invertido: quanto MAIOR, mais rápido no nosso cálculo interno.
    const base = rating / 100; // 0.8–1.0
    const bonus = isPlayer ? 0.05 : 0;
    return base + bonus;
  }

  // -------------------------------
  // CONTROLE DE VELOCIDADE
  // -------------------------------
  function setSpeed(multiplier) {
    raceState.speedMultiplier = multiplier;
    highlightSpeedButtons();
  }

  function highlightSpeedButtons() {
    const btn1 = document.getElementById("btnSpeed1x");
    const btn2 = document.getElementById("btnSpeed2x");
    const btn4 = document.getElementById("btnSpeed4x");

    [btn1, btn2, btn4].forEach((btn) => {
      if (!btn) return;
      btn.classList.remove("active-speed");
    });

    if (raceState.speedMultiplier === 1 && btn1) btn1.classList.add("active-speed");
    if (raceState.speedMultiplier === 2 && btn2) btn2.classList.add("active-speed");
    if (raceState.speedMultiplier === 4 && btn4) btn4.classList.add("active-speed");
  }

  // -------------------------------
  // LOOP DA CORRIDA
  // -------------------------------
  function raceLoop(timestamp) {
    if (!raceState.running || raceState.paused || raceState.raceFinished) return;

    if (!raceState.lastFrameTime) {
      raceState.lastFrameTime = timestamp;
    }

    const delta = (timestamp - raceState.lastFrameTime) / 1000; // segundos
    raceState.lastFrameTime = timestamp;

    // Em vez de usar delta real, usamos um tempo "virtual" para a simulação ficar mais previsível
    const virtualDelta = delta * raceState.speedMultiplier * 4; // acelera um pouco

    updateCars(virtualDelta);
    updateHUD();
    renderTower();

    if (!raceState.raceFinished) {
      requestAnimationFrame(raceLoop);
    }
  }

  function updateCars(dt) {
    if (raceState.cars.length === 0) return;

    // Atualiza progressos
    raceState.cars.forEach((car) => {
      if (car.inPit) {
        car.pitTimer -= dt;
        if (car.pitTimer <= 0) {
          car.inPit = false;
        }
        return;
      }

      // Desgaste / combustível
      const wearRate = 0.003 * (1 + (car.basePace - 0.8)); // quem é mais rápido desgasta um pouco mais
      const fuelRate = 0.002;
      car.tyreWear = Math.min(1, car.tyreWear + wearRate * dt);
      car.fuel = Math.max(0, car.fuel - fuelRate * dt);

      // Se combustível acabar demais, carro perde ritmo
      let paceFactor = car.basePace * (1 - car.tyreWear * 0.4);
      if (car.fuel < 0.1) {
        paceFactor *= 0.7;
      }

      // progresso dentro da volta (0–1)
      const lapProgressGain = paceFactor * 0.008 * dt;
      car.progress += lapProgressGain;

      // Comportamento de pitstop simples de IA
      if (!car.isPlayer) {
        const shouldPit =
          (car.tyreWear > 0.75 && car.lap > 2) ||
          (car.fuel < 0.25 && car.lap < raceState.totalLaps - 1);
        if (shouldPit) {
          doPitStop(car);
        }
      }

      // Completou volta
      if (car.progress >= 1) {
        car.progress -= 1;
        car.lap += 1;

        // Volta concluída do líder (usaremos o carro mais rápido como referência)
        if (car.lap > raceState.currentLap) {
          raceState.currentLap = car.lap;
        }

        // Reabastecer um pouco a cada volta (simplificado)
        car.fuel = Math.min(1, car.fuel + 0.35);
      }
    });

    // Recalcula ordenação de posições
    raceState.cars.sort((a, b) => {
      // maior volta primeiro
      if (b.lap !== a.lap) return b.lap - a.lap;
      // maior progresso dentro da volta
      if (b.progress !== a.progress) return b.progress - a.progress;
      // se empatar, quem tem melhor basePace fica na frente
      return b.basePace - a.basePace;
    });

    // Atualiza gaps
    const leader = raceState.cars[0];
    raceState.cars.forEach((car, index) => {
      car.position = index + 1;
      if (car === leader) {
        car.gapToLeader = 0;
        return;
      }
      // Gap simples baseado em diferença de volta e progresso
      const lapDiff = leader.lap - car.lap;
      const progDiff = leader.progress - car.progress;
      const baseLapTime = 90; // 1min30s por volta (exemplo)
      const gapSeconds = lapDiff * baseLapTime + progDiff * baseLapTime;
      car.gapToLeader = Math.max(0, gapSeconds);
    });

    // Avança tempo de corrida do líder
    const baseLapTimeSec = 90;
    const leaderSpeedFactor = leader.basePace;
    raceState.leaderRaceTime += (baseLapTimeSec / raceState.totalLaps) * (leaderSpeedFactor * dt);

    // Verifica fim de corrida
    if (leader.lap > raceState.totalLaps) {
      finishRace();
    }
  }

  // -------------------------------
  // PIT STOP
  // -------------------------------
  function doPitStop(car) {
    if (car.inPit) return;
    car.inPit = true;
    car.pitTimer = 5 + Math.random() * 4; // 5–9 segundos de pit (simulado)
    car.pitStops += 1;
    car.tyreWear = 0;
    car.fuel = 1;
  }

  // -------------------------------
  // HUD E TORRE
  // -------------------------------
  function updateHUD(force) {
    const gs = getGameState();

    const lapInfoEl = document.getElementById("raceLapInfo");
    const statusEl = document.getElementById("raceStatusLabel");
    const trackInfoEl = document.getElementById("raceTrackInfo");
    const timerEl = document.getElementById("raceTimer");

    if (trackInfoEl && force) {
      trackInfoEl.textContent = `${gs.currentGP?.name || "GP"} • ${
        gs.currentGP?.country || ""
      } • ${raceState.totalLaps} voltas`;
    }

    if (lapInfoEl) {
      const current = Math.min(raceState.currentLap, raceState.totalLaps);
      lapInfoEl.textContent = `Volta ${current} / ${raceState.totalLaps}`;
    }

    if (statusEl) {
      if (raceState.raceFinished) {
        statusEl.textContent = "Corrida concluída";
      } else if (!raceState.running) {
        statusEl.textContent = "Pronto para iniciar";
      } else if (raceState.paused) {
        statusEl.textContent = "Corrida pausada";
      } else {
        statusEl.textContent = `Corrida em andamento • x${raceState.speedMultiplier}`;
      }
    }

    if (timerEl) {
      timerEl.textContent = formatRaceTime(raceState.leaderRaceTime);
    }
  }

  function renderTower() {
    const towerBody = document.getElementById("raceTowerBody");
    if (!towerBody) return;

    towerBody.innerHTML = "";

    raceState.cars.forEach((car) => {
      const row = document.createElement("div");
      row.className = "race-tower-row";
      if (car.isPlayer) row.classList.add("meus-pilotos");

      const pos = document.createElement("div");
      pos.textContent = car.position || "-";

      const shortTeam = document.createElement("div");
      shortTeam.textContent = getTeamShortName(car.teamName);

      const driver = document.createElement("div");
      driver.textContent = car.driverName;

      const gap = document.createElement("div");
      if (car.position === 1) {
        gap.textContent = "Líder";
      } else if (car.gapToLeader >= 90) {
        const lapsDown = Math.floor(car.gapToLeader / 90);
        gap.textContent = `+${lapsDown}V`;
      } else {
        gap.textContent = `+${car.gapToLeader.toFixed(1)}s`;
      }

      row.appendChild(pos);
      row.appendChild(shortTeam);
      row.appendChild(driver);
      row.appendChild(gap);

      towerBody.appendChild(row);
    });
  }

  function getTeamShortName(name) {
    if (!name) return "";
    const upper = name.toUpperCase();
    if (upper.includes("RED BULL")) return "RBR";
    if (upper.includes("MERCEDES")) return "MER";
    if (upper.includes("FERRARI")) return "FER";
    if (upper.includes("MCLAREN")) return "MCL";
    if (upper.includes("ASTON")) return "AMR";
    if (upper.includes("ALPINE")) return "ALP";
    if (upper.includes("WILLIAMS")) return "WIL";
    if (upper.includes("HAAS")) return "HAA";
    if (upper.includes("SAUBER")) return "SAU";
    if (upper.includes("RB")) return "RB";
    return upper.slice(0, 3);
  }

  function formatRaceTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // -------------------------------
  // CONTROLE DE ESTADO (PAUSE/FIM)
  // -------------------------------
  function pauseRace() {
    if (!raceState.running || raceState.raceFinished) return;
    raceState.paused = true;
    updateHUD();
  }

  function resumeRace() {
    if (!raceState.running || raceState.raceFinished) return;
    raceState.paused = false;
    raceState.lastFrameTime = 0;
    updateHUD();
    requestAnimationFrame(raceLoop);
  }

  function finishRace() {
    raceState.raceFinished = true;
    raceState.running = false;
    raceState.paused = false;
    updateHUD();
    renderTower();

    // Salvar resultado em gameState para usar no pódio, classificação, finanças, etc.
    const gs = getGameState();
    gs.lastRaceResult = {
      gp: gs.currentGP,
      cars: raceState.cars.map((c) => ({
        position: c.position,
        driverName: c.driverName,
        teamName: c.teamName,
        isPlayer: c.isPlayer,
        pitStops: c.pitStops,
        gapToLeader: c.gapToLeader,
        lapsCompleted: c.lap - 1
      }))
    };

    // Se houver função de navegação para pódio, chama aqui
    if (typeof window.showPodiumScreen === "function") {
      window.showPodiumScreen();
    } else {
      // fallback: tenta mostrar tela de pódio via id
      const telaPodio = document.getElementById("tela-podio");
      const telaCorrida = document.getElementById("tela-corrida");
      if (telaCorrida) telaCorrida.classList.remove("visible");
      if (telaPodio) telaPodio.classList.add("visible");
    }
  }

  // -------------------------------
  // INICIALIZAÇÃO NO DOMCONTENTLOADED
  // -------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initRaceSystem();
  });
})();
