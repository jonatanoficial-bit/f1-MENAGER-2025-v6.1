/* =========================================================
   F1 MANAGER 2025 – RACE.JS
   Integração econômica + pódio + staff + patrocínio
   NÃO altera visual nem SVG existente
   ========================================================= */

(() => {
  /* ===============================
     DEPENDÊNCIAS OBRIGATÓRIAS
     =============================== */

  if (!window.pathPoints || !window.raceCars) {
    console.error("❌ race.js: pathPoints ou raceCars não encontrados");
    return;
  }

  if (!window.F1MEconomy) {
    console.error("❌ race.js: F1MEconomy não carregado");
    return;
  }

  const economy = window.F1MEconomy;
  const cars = window.raceCars;
  const pathPoints = window.pathPoints;

  /* ===============================
     PARÂMETROS DA TEMPORADA
     =============================== */

  const TOTAL_GPS = economy.state.season.rounds || 24;
  const CURRENT_GP = economy.state.season.currentRound || 1;

  /* ===============================
     APLICAÇÃO DE STAFF NO CARRO
     =============================== */

  const staff = economy.staffMultipliers();

  cars.forEach(car => {
    // Velocidade base influenciada por aero + engenharia
    car.baseSpeed *= staff.aero * staff.setup;

    // Desgaste de pneus
    car.tyreWearRate *= staff.tyre;

    // Tempo de pit stop
    car.pitStopTime *= staff.pit;
  });

  /* ===============================
     LOOP PRINCIPAL DA CORRIDA
     =============================== */

  let lastFrame = performance.now();
  let raceFinished = false;

  function raceLoop(now) {
    if (raceFinished) return;

    const delta = (now - lastFrame) / 1000;
    lastFrame = now;

    cars.forEach(car => {
      // desgaste de pneus
      car.tyreWear += car.tyreWearRate * delta;
      if (car.tyreWear > 100) car.tyreWear = 100;

      // avanço no traçado
      car.progress += car.baseSpeed * delta;

      if (car.progress >= 1) {
        car.progress -= 1;
        car.lapsCompleted++;
      }

      const idx = Math.floor(car.progress * pathPoints.length);
      const p = pathPoints[idx];
      if (!p) return;

      car.element.style.left = `${p.x}px`;
      car.element.style.top = `${p.y}px`;
    });

    // condição de fim (voltas)
    if (cars[0].lapsCompleted >= window.RACE_LAPS) {
      finishRace();
      return;
    }

    requestAnimationFrame(raceLoop);
  }

  requestAnimationFrame(raceLoop);

  /* ===============================
     FINALIZAÇÃO DA CORRIDA
     =============================== */

  function finishRace() {
    raceFinished = true;

    // Classificação final
    const results = [...cars].sort((a, b) => {
      if (b.lapsCompleted !== a.lapsCompleted) {
        return b.lapsCompleted - a.lapsCompleted;
      }
      return a.progress - b.progress;
    });

    /* ===============================
       ECONOMIA – PAGAMENTOS
       =============================== */

    // Patrocínio paga por GP
    const sponsorIncome = economy.paySponsorsPerGP();

    // Custo semanal
    const weeklyCost = economy.weeklyCost();
    economy.state.finances.cash -= weeklyCost;

    /* ===============================
       DEMISSÃO COM 50% DA TEMPORADA
       =============================== */

    const bestPlayerPos =
      results.findIndex(r => r.isPlayer) + 1 || 20;

    if (
      CURRENT_GP >= Math.ceil(TOTAL_GPS / 2) &&
      bestPlayerPos > 12
    ) {
      economy.state.season.fired = true;
    }

    /* ===============================
       FIM DE TEMPORADA – PROPOSTAS
       =============================== */

    if (CURRENT_GP === TOTAL_GPS) {
      evaluateSeasonEnd(bestPlayerPos);
    }

    economy.endRoundChecks(bestPlayerPos);

    /* ===============================
       EXIBIR PÓDIO
       =============================== */

    showPodium(results.slice(0, 3), sponsorIncome, weeklyCost);
  }

  /* ===============================
     PÓDIO VISUAL (NÃO EXISTIA)
     =============================== */

  function showPodium(top3, sponsorIncome, weeklyCost) {
    const podium = document.createElement("div");
    podium.style.position = "fixed";
    podium.style.inset = "0";
    podium.style.background = "rgba(0,0,0,0.85)";
    podium.style.zIndex = "9999";
    podium.style.display = "flex";
    podium.style.alignItems = "center";
    podium.style.justifyContent = "center";

    podium.innerHTML = `
      <div style="
        background:#111;
        border-radius:20px;
        padding:24px;
        width:90%;
        max-width:900px;
        color:#fff;
        text-align:center;
      ">
        <h2>🏁 Pódio</h2>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          ${top3
            .map(
              (d, i) => `
            <div>
              <img src="${d.face}" style="width:90px;height:90px;border-radius:50%">
              <h3>${i + 1}º ${d.name}</h3>
              <img src="${d.teamLogo}" style="width:80px">
            </div>
          `
            )
            .join("")}
        </div>

        <p style="margin-top:16px">
          💰 Patrocínio recebido: € ${sponsorIncome.toLocaleString(
            "pt-BR"
          )}<br>
          📉 Custo semanal: € ${weeklyCost.toLocaleString("pt-BR")}
        </p>

        <button id="closePodium" style="
          margin-top:14px;
          padding:10px 18px;
          border-radius:999px;
          border:none;
          background:#e10600;
          color:#fff;
          font-weight:bold;
          cursor:pointer;
        ">Continuar</button>
      </div>
    `;

    document.body.appendChild(podium);

    document.getElementById("closePodium").onclick = () => {
      podium.remove();
      window.location.href = "calendar.html";
    };
  }

  /* ===============================
     FIM DE TEMPORADA
     =============================== */

  function evaluateSeasonEnd(bestPos) {
    const rating = economy.state.manager.rating;

    if (bestPos <= 6) rating += 6;
    else if (bestPos <= 10) rating += 3;
    else rating -= 4;

    economy.state.manager.rating = Math.max(40, rating);
    economy.save(economy.state);
  }

})();
