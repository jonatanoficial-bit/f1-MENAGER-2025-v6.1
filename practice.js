// =======================================================
// F1 MANAGER 2025 - TREINO LIVRE (PRACTICE.JS)
// - Carros seguem o traçado real do SVG
// - Cores por equipe
// - Desgaste, temperatura e modo (Ataque / Normal / Economizar)
// =======================================================

(function () {
  // -----------------------------
  // PARÂMETROS DA URL
  // -----------------------------
  const params = new URLSearchParams(window.location.search);
  const trackKey    = params.get("track")    || "australia";
  const gpName      = params.get("gp")       || "GP 2025";
  const userTeamKey = params.get("userTeam") || "ferrari";

  localStorage.setItem("f1m2025_user_team", userTeamKey);

  // -----------------------------
  // CORES DAS EQUIPES
  // -----------------------------
  const TEAM_COLORS = {
    ferrari:      { primary: "#ff1c1c", secondary: "#b30000" },
    redbull:      { primary: "#0a1a6d", secondary: "#ffdd00" },
    mercedes:     { primary: "#00e5ff", secondary: "#cccccc" },
    mclaren:      { primary: "#ff8c1a", secondary: "#cc5200" },
    aston:        { primary: "#006644", secondary: "#00aa77" },
    alpine:       { primary: "#0055ff", secondary: "#99bbff" },
    sauber:       { primary: "#ffffff", secondary: "#0066cc" },
    haas:         { primary: "#e60000", secondary: "#333333" },
    williams:     { primary: "#0044cc", secondary: "#66aaff" },
    racingbulls:  { primary: "#003399", secondary: "#ff3300" }
  };
  const colors = TEAM_COLORS[userTeamKey] || TEAM_COLORS.ferrari;

  // -----------------------------
  // ESTADO DA SESSÃO
  // -----------------------------
  const SESSION_TOTAL_SECONDS = 60 * 60; // 60 minutos
  const TOTAL_LAPS = 20;

  let sessionSecondsLeft = SESSION_TOTAL_SECONDS;
  let currentLap = 1;

  // -----------------------------
  // ESTADO DOS CARROS
  // -----------------------------
  const cars = [
    {
      id: 1,
      progress: 0,           // 0–999
      mode: "normal",        // "normal" | "attack" | "save"
      carHealth: 100,        // %
      tireWear: 0,           // % gasto
      temp: 80,              // °C
      inPit: false
    },
    {
      id: 2,
      progress: 500,
      mode: "normal",
      carHealth: 100,
      tireWear: 0,
      temp: 80,
      inPit: false
    }
  ];

  let speedMultiplier = 1;
  let trackPoints = [];
  let lastFrameTime = null;

  // -----------------------------
  // HELPER – FORMATA TEMPO
  // -----------------------------
  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  // -----------------------------
  // CARREGAR PISTA (SVG)
  // -----------------------------
  function loadTrack() {
    const panel = document.getElementById("track-panel");
    if (!panel) return;

    panel.innerHTML = `
      <div class="track-wrapper">
        <svg id="track-svg" viewBox="0 0 1000 1000" style="width:95%;height:95%;overflow:visible;"></svg>
        <div class="car-dot car-1"></div>
        <div class="car-dot car-2"></div>
      </div>
    `;

    const svgEl = document.getElementById("track-svg");

    fetch(`assets/tracks/${trackKey}.svg`)
      .then(r => r.text())
      .then(svgText => {
        svgEl.innerHTML = svgText;

        // Pega todos os paths e escolhe o mais longo (normalmente o traçado principal)
        const paths = Array.from(svgEl.querySelectorAll("path"));
        if (!paths.length) {
          console.error("Nenhum <path> encontrado no SVG da pista.");
          return;
        }

        let mainPath = paths[0];
        let maxLen = mainPath.getTotalLength();
        paths.forEach(p => {
          const len = p.getTotalLength();
          if (len > maxLen) {
            maxLen = len;
            mainPath = p;
          }
        });

        extractPathPoints(mainPath);
      })
      .catch(err => {
        console.error("Erro ao carregar SVG da pista:", err);
      });
  }

  // -----------------------------
  // CONVERTE PATH EM LISTA DE PONTOS
  // -----------------------------
  function extractPathPoints(path) {
    const length = path.getTotalLength();
    const resolution = 1000;
    trackPoints = [];

    for (let i = 0; i < resolution; i++) {
      const p = path.getPointAtLength((i / resolution) * length);
      trackPoints.push({ x: p.x, y: p.y });
    }

    // Inicia o loop de animação
    requestAnimationFrame(tick);
  }

  // -----------------------------
  // ATUALIZA FÍSICA DE DESGASTE/TEMPERATURA
  // -----------------------------
  function updateCarPhysics(car, deltaSeconds) {
    if (car.inPit) {
      // Recupera vida e pneus enquanto está no box
      car.carHealth = Math.min(100, car.carHealth + 20 * deltaSeconds);
      car.tireWear  = Math.max(0, car.tireWear - 40 * deltaSeconds);
      car.temp      = Math.max(70, car.temp - 25 * deltaSeconds);
      if (car.carHealth >= 99 && car.tireWear <= 1 && car.temp <= 80) {
        car.inPit = false;
      }
      return;
    }

    // Fatores por modo
    let wearFactor = 1;        // desgaste de pneus
    let tempTarget = 90;       // temperatura alvo
    let healthWearFactor = 0.2; // desgaste do carro

    switch (car.mode) {
      case "attack":
        wearFactor = 2.0;
        tempTarget = 105;
        healthWearFactor = 0.35;
        break;
      case "save":
        wearFactor = 0.5;
        tempTarget = 80;
        healthWearFactor = 0.1;
        break;
      default:
        wearFactor = 1.0;
        tempTarget = 95;
        healthWearFactor = 0.2;
    }

    // Desgaste de pneus (aprox. 0–60% num treino inteiro, em modo normal)
    const baseTireWearRate = 0.002; // % por segundo
    car.tireWear = Math.min(100, car.tireWear + baseTireWearRate * wearFactor * deltaSeconds * 60);

    // Desgaste de carro (mais leve)
    const baseHealthWearRate = 0.0006;
    car.carHealth = Math.max(0, car.carHealth - baseHealthWearRate * healthWearFactor * deltaSeconds * 60);

    // Temperatura converge para um alvo
    const tempChangeRate = 4; // °C por segundo aproximado
    const tempDiff = tempTarget - car.temp;
    car.temp += tempDiff * (1 - Math.exp(-tempChangeRate * deltaSeconds));

    // Se pneu muito destruído ou temp muito alta, carro perde saúde extra
    if (car.tireWear > 80) {
      car.carHealth = Math.max(0, car.carHealth - 0.0015 * (car.tireWear - 80) * deltaSeconds * 60);
    }
    if (car.temp > 110) {
      car.carHealth = Math.max(0, car.carHealth - 0.002 * (car.temp - 110) * deltaSeconds * 60);
    }
  }

  // -----------------------------
  // CALCULA VELOCIDADE DO CARRO
  // -----------------------------
  function getCarSpeedFactor(car) {
    // Base
    let speed = 0.8;

    // Modo
    if (car.mode === "attack") speed += 0.25;
    if (car.mode === "save")   speed -= 0.25;

    // Pneu: quanto mais desgaste, pior o grip
    const grip = Math.max(0.3, 1 - car.tireWear / 120);
    speed *= grip;

    // Saúde do carro
    const healthFactor = Math.max(0.3, car.carHealth / 100);
    speed *= healthFactor;

    // Temperatura – faixa ideal ~ 90–105
    let tempFactor = 1.0;
    if (car.temp < 85) {
      tempFactor -= (85 - car.temp) * 0.004;
    } else if (car.temp > 105) {
      tempFactor -= (car.temp - 105) * 0.004;
    }
    tempFactor = Math.max(0.6, tempFactor);
    speed *= tempFactor;

    return speed;
  }

  // -----------------------------
  // ATUALIZA HUD (se elementos existirem)
  // -----------------------------
  function updateHUD() {
    const timeEl = document.querySelector("[data-session-time]");
    const lapEl  = document.querySelector("[data-lap-counter]");

    if (timeEl) timeEl.textContent = formatTime(sessionSecondsLeft);
    if (lapEl)  lapEl.textContent  = `Volta ${currentLap} / ${TOTAL_LAPS}`;

    cars.forEach(car => {
      const hEl = document.querySelector(`[data-car-health="${car.id}"]`);
      const tEl = document.querySelector(`[data-car-tires="${car.id}"]`);
      const sEl = document.querySelector(`[data-car-status="${car.id}"]`);

      if (hEl) hEl.textContent = `Carro: ${car.carHealth.toFixed(0)}%`;
      if (tEl) tEl.textContent = `Pneus: ${car.tireWear.toFixed(0)}%`;

      if (sEl) {
        if (car.inPit) {
          sEl.textContent = "Status: Box";
        } else if (car.carHealth <= 0) {
          sEl.textContent = "Status: Quebra";
        } else if (car.tireWear > 85) {
          sEl.textContent = "Status: Pneus no limite";
        } else {
          sEl.textContent = "Status: Rodando";
        }
      }
    });
  }

  // -----------------------------
  // LOOP PRINCIPAL
  // -----------------------------
  function tick(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaMs = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    const deltaSeconds = deltaMs / 1000;

    // Se ainda não temos pontos de pista, volta depois
    if (trackPoints.length < 2) {
      requestAnimationFrame(tick);
      return;
    }

    // Atualiza tempo de sessão (acelera com speedMultiplier)
    sessionSecondsLeft = Math.max(
      0,
      sessionSecondsLeft - deltaSeconds * speedMultiplier
    );

    // Atualiza cada carro
    cars.forEach(car => {
      if (car.carHealth <= 0) return; // carro quebrado

      updateCarPhysics(car, deltaSeconds * speedMultiplier);

      // velocidade relativa
      const speedFactor = getCarSpeedFactor(car);
      const step = 0.8 * speedMultiplier * speedFactor; // ajuste grosso
      car.progress = (car.progress + step) % 1000;
    });

    // Verifica completude de volta (considerando o carro 1 como referência)
    // Se ele passou de 999 para 0, consideramos uma volta completa
    if (cars[0].progress < 50 && cars[0].progress > 0) {
      // simples: usa laps aproximadas pela distância total percorrida/1000
      // aqui poderíamos ser mais sofisticados; mantemos leve
    }

    // Desenha carros
    drawCars();
    // Atualiza HUD
    updateHUD();

    requestAnimationFrame(tick);
  }

  // -----------------------------
  // DESENHA CARROS NA PISTA
  // -----------------------------
  function drawCars() {
    const wrapper = document.querySelector(".track-wrapper");
    const svgEl   = document.getElementById("track-svg");
    if (!wrapper || !svgEl || trackPoints.length < 2) return;

    const boxSvg   = svgEl.getBBox();
    const boxWrp   = wrapper.getBoundingClientRect();
    const scaleX   = boxWrp.width  / (boxSvg.width  || 1);
    const scaleY   = boxWrp.height / (boxSvg.height || 1);

    const car1El = document.querySelector(".car-1");
    const car2El = document.querySelector(".car-2");
    if (!car1El || !car2El) return;

    const p1 = trackPoints[Math.floor(cars[0].progress) % trackPoints.length];
    const p2 = trackPoints[Math.floor(cars[1].progress) % trackPoints.length];

    const offsetX = boxWrp.width  * 0.02;
    const offsetY = boxWrp.height * 0.02;

    car1El.style.left = ( (p1.x - boxSvg.x) * scaleX + offsetX) + "px";
    car1El.style.top  = ( (p1.y - boxSvg.y) * scaleY + offsetY) + "px";

    car2El.style.left = ( (p2.x - boxSvg.x) * scaleX + offsetX) + "px";
    car2El.style.top  = ( (p2.y - boxSvg.y) * scaleY + offsetY) + "px";
  }

  // -----------------------------
  // BOTÕES DE VELOCIDADE
  // -----------------------------
  function setupSpeedButtons() {
    document.querySelectorAll(".btn-speed").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        speedMultiplier = Number(btn.dataset.speed || 1);
      });
    });
  }

  // -----------------------------
  // BOTÕES DE MODO (ATAQUE / ECO / NORMAL)
  // -----------------------------
  function setupModeButtons() {
    document.querySelectorAll("[data-action='mode']").forEach(btn => {
      btn.addEventListener("click", () => {
        const carId = Number(btn.dataset.car || "1");
        const mode  = btn.dataset.mode || "normal";
        const car   = cars.find(c => c.id === carId);
        if (!car) return;
        car.mode = mode;

        // Visual (marcar ativo)
        const groupSelector = `[data-action='mode'][data-car='${carId}']`;
        document.querySelectorAll(groupSelector).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  // -----------------------------
  // BOTÕES PIT STOP
  // -----------------------------
  function setupPitButtons() {
    document.querySelectorAll("[data-action='pit']").forEach(btn => {
      btn.addEventListener("click", () => {
        const carId = Number(btn.dataset.car || "1");
        const car   = cars.find(c => c.id === carId);
        if (!car) return;
        car.inPit = true;
      });
    });
  }

  // -----------------------------
  // CORES DOS CARROS
  // -----------------------------
  function applyTeamColors() {
    const car1El = document.querySelector(".car-1");
    const car2El = document.querySelector(".car-2");
    if (car1El) car1El.style.background = colors.primary;
    if (car2El) car2El.style.background = colors.secondary;
  }

  // -----------------------------
  // INICIALIZAÇÃO
  // -----------------------------
  function init() {
    loadTrack();
    setupSpeedButtons();
    setupModeButtons();
    setupPitButtons();
    applyTeamColors();

    // Título do GP (se existir elemento)
    const gpTitleEl = document.querySelector("[data-gp-name]");
    if (gpTitleEl) gpTitleEl.textContent = gpName;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
