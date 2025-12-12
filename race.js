/* =========================================================
   F1 MANAGER 2025 – RACE.JS
   - Integra F1MEconomy (custos, patrocínio, staff, demissão)
   - Integra Setup do carro (asa, suspensão, altura, diferencial, motor)
   - Aplica efeito por segmento (reta/curva) via curvatura do pathPoints
   - Mantém visual e jogabilidade existentes
   - PÓDIO ao final
   ========================================================= */

(() => {
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

  // URL params
  const params = new URLSearchParams(location.search);
  const userTeam = (params.get("userTeam") || localStorage.getItem("F1M_userTeam") || economy.state?.userTeam || "mclaren").toLowerCase();
  localStorage.setItem("F1M_userTeam", userTeam);

  const TOTAL_GPS = economy.state.season.rounds || 24;
  const CURRENT_GP = economy.state.season.currentRound || 1;

  // Defaults defensivos para carros
  cars.forEach(c => {
    c.baseSpeed = Number(c.baseSpeed ?? 0.010);       // progress/sec (depende do seu modelo)
    c.tyreWearRate = Number(c.tyreWearRate ?? 0.20);  // %/min “simulado”
    c.pitStopTime = Number(c.pitStopTime ?? 2.8);     // segundos base
    c.tyreWear = Number(c.tyreWear ?? 0);
    c.progress = Number(c.progress ?? 0);
    c.lapsCompleted = Number(c.lapsCompleted ?? 0);
    c.rating = Number(c.rating ?? 80);
  });

  /* ===============================
     SETUP: LOAD + IMPACT
     =============================== */

  const SETUP_KEY = `F1M_SETUP_${userTeam}`;

  const DEFAULT_SETUP = {
    frontWing: 50,
    rearWing: 55,
    suspension: 55,
    rideHeight: 50,
    diffLow: 55,
    diffHigh: 50,
    engineMode: "normal"
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function loadSetup() {
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      if (!raw) return { ...DEFAULT_SETUP };
      const s = JSON.parse(raw);
      return { ...DEFAULT_SETUP, ...s };
    } catch {
      return { ...DEFAULT_SETUP };
    }
  }

  function computeSetupImpact(s) {
    const fw = s.frontWing / 100;
    const rw = s.rearWing / 100;
    const sus = s.suspension / 100;
    const rh = s.rideHeight / 100;
    const dl = s.diffLow / 100;
    const dh = s.diffHigh / 100;

    const cornerGrip = clamp(0.92 + (fw * 0.06) + (rw * 0.10), 0.92, 1.10);
    const straightSpeed = clamp(1.07 - (fw * 0.05) - (rw * 0.08), 0.88, 1.07);

    const stability = clamp(
      0.90
      + (0.10 - Math.abs(rh - 0.55) * 0.18)
      + (0.08 - Math.abs(sus - 0.55) * 0.14)
      + (0.05 - Math.abs(dh - 0.50) * 0.10),
      0.82, 1.12
    );

    let tyreWear = 1.00
      + Math.abs(dl - 0.55) * 0.28
      + Math.abs(dh - 0.50) * 0.20
      + Math.abs(sus - 0.55) * 0.18
      + (rh < 0.35 ? (0.35 - rh) * 0.60 : 0);

    tyreWear = clamp(tyreWear, 0.88, 1.35);

    let fuel = 1.00 + (1.0 - straightSpeed) * 0.18;
    fuel = clamp(fuel, 0.92, 1.18);

    let risk = "Baixo";
    let engineStraightBoost = 1.00;
    let engineWearBoost = 1.00;
    let engineFuelBoost = 1.00;

    if (s.engineMode === "eco") {
      engineStraightBoost = 0.985;
      engineWearBoost = 0.96;
      engineFuelBoost = 0.93;
      risk = "Baixo";
    } else if (s.engineMode === "attack") {
      engineStraightBoost = 1.03;
      engineWearBoost = 1.08;
      engineFuelBoost = 1.07;
      risk = "Alto";
    } else {
      risk = "Médio";
    }

    const riskScore =
      (s.engineMode === "attack" ? 1 : 0) +
      (rh < 0.35 ? 1 : 0) +
      (dh > 0.75 ? 1 : 0);

    if (riskScore >= 2) risk = "Muito alto";
    else if (riskScore === 1 && risk === "Médio") risk = "Alto";

    return {
      straightSpeed: clamp(straightSpeed * engineStraightBoost, 0.85, 1.10),
      cornerGrip,
      stability,
      tyreWear: clamp(tyreWear * engineWearBoost, 0.85, 1.45),
      fuel: clamp(fuel * engineFuelBoost, 0.85, 1.30),
      risk
    };
  }

  const setup = loadSetup();
  const setupImpact = computeSetupImpact(setup);

  /* ===============================
     CURVATURA DO TRAÇADO (reta/curva)
     - gera um fator 0..1 por ponto
     - 0 ~ reta / 1 ~ curva forte
     =============================== */

  function buildCurvature(points) {
    const n = points.length;
    const curv = new Array(n).fill(0);

    const get = (i) => points[(i + n) % n];

    for (let i = 0; i < n; i++) {
      const p0 = get(i - 3), p1 = get(i), p2 = get(i + 3);
      const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let d = Math.abs(a2 - a1);
      if (d > Math.PI) d = (Math.PI * 2) - d;
      // normaliza: 0..~pi -> 0..1
      curv[i] = clamp(d / 1.2, 0, 1);
    }

    // suaviza
    const smooth = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let acc = 0, w = 0;
      for (let k = -6; k <= 6; k++) {
        const weight = 1 - Math.abs(k) / 7;
        acc += curv[(i + k + n) % n] * weight;
        w += weight;
      }
      smooth[i] = acc / w;
    }
    return smooth;
  }

  const curvature = buildCurvature(pathPoints);

  /* ===============================
     STAFF MULTIPLIERS (economia)
     =============================== */

  const staff = economy.staffMultipliers();

  // Aplica impactos globais (sem mudar “feel” do jogo)
  cars.forEach(car => {
    // aero e engenharia (staff) + estabilidade (setup)
    car.baseSpeed *= staff.aero * staff.setup;
    // setup também altera velocidade “macro”
    car.baseSpeed *= (0.985 + (setupImpact.stability - 1) * 0.35);

    // pneus: staff + setup
    car.tyreWearRate *= staff.tyre * setupImpact.tyreWear;

    // pit: staff
    car.pitStopTime *= staff.pit;
  });

  /* ===============================
     SPEED MULTIPLIER (1x/2x/4x)
     - mantém o que já existe: se houver UI, respeita
     =============================== */

  let speedMultiplier = 1;

  // Se seus botões já existem na corrida, preserve:
  // (Não quebra se não existir)
  document.querySelectorAll("[data-speed]").forEach(btn => {
    btn.addEventListener("click", () => {
      speedMultiplier = Number(btn.dataset.speed) || 1;
      document.querySelectorAll("[data-speed]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  /* ===============================
     LOOP PRINCIPAL
     =============================== */

  let lastFrame = performance.now();
  let raceFinished = false;

  const RACE_LAPS = Number(window.RACE_LAPS ?? 10); // fallback defensivo

  function raceLoop(now) {
    if (raceFinished) return;

    const delta = ((now - lastFrame) / 1000) * speedMultiplier;
    lastFrame = now;

    cars.forEach(car => {
      // Segmento atual
      const idx = Math.floor(car.progress * pathPoints.length);
      const p = pathPoints[idx];
      if (!p) return;

      const c = curvature[idx] || 0; // 0..1
      const isCorner = c > 0.22;

      // Velocidade por segmento:
      // - Retas: straightSpeed
      // - Curvas: cornerGrip + stability
      const segFactor = isCorner
        ? (setupImpact.cornerGrip * (0.95 + (setupImpact.stability - 1) * 0.55))
        : setupImpact.straightSpeed;

      // Corrige “super velocidade”: segFactor controlado + clamp
      const seg = clamp(segFactor, 0.85, 1.12);

      // Desgaste cresce em curva e com instabilidade
      const cornerWearBoost = isCorner ? (1.00 + c * 0.35) : 1.00;
      const stabilityPenalty = (setupImpact.stability < 1) ? (1.00 + (1 - setupImpact.stability) * 0.40) : 1.00;

      car.tyreWear += (car.tyreWearRate * delta * cornerWearBoost * stabilityPenalty) / 60; // normaliza por minuto
      if (car.tyreWear > 100) car.tyreWear = 100;

      // pneu gasto reduz performance
      const tyrePerf = clamp(1.00 - (car.tyreWear / 100) * 0.18, 0.78, 1.00);

      // Avanço
      car.progress += (car.baseSpeed * seg * tyrePerf) * delta;

      if (car.progress >= 1) {
        car.progress -= 1;
        car.lapsCompleted++;
      }

      // Render
      car.element.style.left = `${p.x}px`;
      car.element.style.top = `${p.y}px`;
    });

    // Condição de fim
    const leader = cars.reduce((a, b) => (b.lapsCompleted > a.lapsCompleted ? b : a), cars[0]);
    if (leader && leader.lapsCompleted >= RACE_LAPS) {
      finishRace();
      return;
    }

    requestAnimationFrame(raceLoop);
  }

  requestAnimationFrame(raceLoop);

  /* ===============================
     FINALIZAÇÃO + ECONOMIA + PÓDIO
     =============================== */

  function finishRace() {
    raceFinished = true;

    // Resultados (prioriza voltas, depois progress)
    const results = [...cars].sort((a, b) => {
      if (b.lapsCompleted !== a.lapsCompleted) return b.lapsCompleted - a.lapsCompleted;
      return b.progress - a.progress;
    });

    // Patrocínio por GP
    const sponsorIncome = economy.paySponsorsPerGP();

    // Custos semanais
    const weeklyCost = economy.weeklyCost();
    economy.state.finances.cash -= weeklyCost;

    // Demissão com 50% temporada se performance ruim
    const bestPlayerPos = (results.findIndex(r => r.isPlayer) + 1) || 20;
    if (CURRENT_GP >= Math.ceil(TOTAL_GPS / 2) && bestPlayerPos > 12) {
      economy.state.season.fired = true;
    }

    // Próximo GP + checks
    economy.endRoundChecks(bestPlayerPos);

    // Pódio
    showPodium(results.slice(0, 3), sponsorIncome, weeklyCost);

    // Salva estado
    try { economy.save(economy.state); } catch {}
  }

  function showPodium(top3, sponsorIncome, weeklyCost) {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.inset = "0";
    wrap.style.background = "rgba(0,0,0,.86)";
    wrap.style.zIndex = "9999";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";

    wrap.innerHTML = `
      <div style="background:#111;border:1px solid #333;border-radius:20px;padding:22px;max-width:920px;width:92%;color:#fff">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <h2 style="margin:0">Pódio</h2>
          <div style="font-size:12px;color:rgba(255,255,255,.70)">
            Setup: Reta x${setupImpact.straightSpeed.toFixed(2)} | Curva x${setupImpact.cornerGrip.toFixed(2)} | Pneus x${setupImpact.tyreWear.toFixed(2)} | Risco: ${setupImpact.risk}
          </div>
        </div>

        <div style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          ${top3.map((p,i)=>`
            <div style="background:#000;border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;text-align:center">
              <div style="font-weight:900;margin-bottom:8px">${i+1}º</div>
              <img src="${p.face || ""}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;background:#111" onerror="this.style.display='none'">
              <div style="margin-top:10px;font-weight:900">${p.name || "Piloto"}</div>
              <div style="margin-top:8px">
                <img src="${p.teamLogo || ""}" style="width:86px;object-fit:contain" onerror="this.style.display='none'">
              </div>
            </div>
          `).join("")}
        </div>

        <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.76)">
          Patrocínio (GP): € ${Math.round(sponsorIncome).toLocaleString("pt-BR")} — Custos semanais: € ${Math.round(weeklyCost).toLocaleString("pt-BR")}
        </div>

        <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
          <button id="btnNext" style="padding:10px 14px;border-radius:999px;border:0;background:#e10600;color:#fff;font-weight:900;cursor:pointer">Continuar</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    document.getElementById("btnNext").onclick = () => {
      wrap.remove();
      location.href = "calendar.html";
    };
  }

})();
