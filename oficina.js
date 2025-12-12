/* =========================================================
   F1 MANAGER 2025 — OFICINA.JS (Setup do Carro)
   - Salva setup no localStorage por equipe
   - Sem quebrar nada existente
   ========================================================= */

(() => {
  const params = new URLSearchParams(location.search);
  const userTeam = (params.get("userTeam") || localStorage.getItem("F1M_userTeam") || "mclaren").toLowerCase();
  const trackKey = (params.get("track") || localStorage.getItem("F1M_track") || "australia").toLowerCase();

  localStorage.setItem("F1M_userTeam", userTeam);
  localStorage.setItem("F1M_track", trackKey);

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

  function saveSetup(setup) {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  }

  // ======= Modelo de impacto (compatível com race.js integrado) =======
  // Retorna multiplicadores:
  // straightSpeed: afeta reta
  // cornerGrip: afeta curva
  // stability: afeta erro/controle (impacta consistência e pneus)
  // tyreWear: multiplicador de desgaste
  // fuel: consumo/energia
  // risk: risco mecânico (eco/normal/attack + altura muito baixa + dif alto)
  function computeImpact(s) {
    const fw = s.frontWing / 100;   // 0..1
    const rw = s.rearWing / 100;
    const sus = s.suspension / 100;
    const rh = s.rideHeight / 100;
    const dl = s.diffLow / 100;
    const dh = s.diffHigh / 100;

    // Aerodinâmica:
    // Mais asa -> melhor curva, pior reta
    const cornerGrip = clamp(0.92 + (fw * 0.06) + (rw * 0.10), 0.92, 1.10);
    const straightSpeed = clamp(1.07 - (fw * 0.05) - (rw * 0.08), 0.88, 1.07);

    // Estabilidade:
    // altura moderada + suspensão moderada -> melhor
    const stability = clamp(
      0.90
      + (0.10 - Math.abs(rh - 0.55) * 0.18)
      + (0.08 - Math.abs(sus - 0.55) * 0.14)
      + (0.05 - Math.abs(dh - 0.50) * 0.10),
      0.82, 1.12
    );

    // Desgaste:
    // dif muito agressivo + suspensão extrema + altura muito baixa elevam desgaste
    let tyreWear = 1.00
      + Math.abs(dl - 0.55) * 0.28
      + Math.abs(dh - 0.50) * 0.20
      + Math.abs(sus - 0.55) * 0.18
      + (rh < 0.35 ? (0.35 - rh) * 0.60 : 0);

    tyreWear = clamp(tyreWear, 0.88, 1.35);

    // Consumo/energia
    let fuel = 1.00 + (1.0 - straightSpeed) * 0.18;
    fuel = clamp(fuel, 0.92, 1.18);

    // Motor mode
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
      engineStraightBoost = 1.00;
      engineWearBoost = 1.00;
      engineFuelBoost = 1.00;
      risk = "Médio";
    }

    // Risco também sobe com altura muito baixa e dif alto
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

  // ======= DOM =======
  const $ = (id) => document.getElementById(id);

  const ui = {
    frontWing: $("frontWing"),
    rearWing: $("rearWing"),
    suspension: $("suspension"),
    rideHeight: $("rideHeight"),
    diffLow: $("diffLow"),
    diffHigh: $("diffHigh"),

    vFrontWing: $("vFrontWing"),
    vRearWing: $("vRearWing"),
    vSuspension: $("vSuspension"),
    vRideHeight: $("vRideHeight"),
    vDiffLow: $("vDiffLow"),
    vDiffHigh: $("vDiffHigh"),
    vEngineMode: $("vEngineMode"),

    kStraight: $("kStraight"),
    kCorner: $("kCorner"),
    kStability: $("kStability"),
    kTyre: $("kTyre"),
    kFuel: $("kFuel"),
    kRisk: $("kRisk"),

    teamLogo: $("teamLogo"),
    pillTeam: $("pillTeam"),
    pillTrack: $("pillTrack"),

    btnDefault: $("btnDefault"),
    btnSave: $("btnSave"),
    btnBack: $("btnBack"),
    btnSendPractice: $("btnSendPractice"),
    btnSendQuali: $("btnSendQuali"),
    btnSendRace: $("btnSendRace")
  };

  // Logo da equipe (mesmo padrão do jogo)
  ui.teamLogo.src = `assets/teams/${userTeam}.png`;
  ui.teamLogo.onerror = () => { ui.teamLogo.style.display = "none"; };

  ui.pillTeam.textContent = `Equipe: ${userTeam.toUpperCase()}`;
  ui.pillTrack.textContent = `Pista: ${trackKey.toUpperCase()}`;

  let setup = loadSetup();

  function applyToControls() {
    ui.frontWing.value = setup.frontWing;
    ui.rearWing.value = setup.rearWing;
    ui.suspension.value = setup.suspension;
    ui.rideHeight.value = setup.rideHeight;
    ui.diffLow.value = setup.diffLow;
    ui.diffHigh.value = setup.diffHigh;

    ui.vFrontWing.textContent = String(setup.frontWing);
    ui.vRearWing.textContent = String(setup.rearWing);
    ui.vSuspension.textContent = String(setup.suspension);
    ui.vRideHeight.textContent = String(setup.rideHeight);
    ui.vDiffLow.textContent = String(setup.diffLow);
    ui.vDiffHigh.textContent = String(setup.diffHigh);
    ui.vEngineMode.textContent = setup.engineMode === "eco" ? "Eco" : setup.engineMode === "attack" ? "Ataque" : "Normal";

    renderImpact();
  }

  function renderImpact() {
    const imp = computeImpact(setup);
    ui.kStraight.textContent = `x${imp.straightSpeed.toFixed(2)}`;
    ui.kCorner.textContent = `x${imp.cornerGrip.toFixed(2)}`;
    ui.kStability.textContent = `x${imp.stability.toFixed(2)}`;
    ui.kTyre.textContent = `x${imp.tyreWear.toFixed(2)}`;
    ui.kFuel.textContent = `x${imp.fuel.toFixed(2)}`;
    ui.kRisk.textContent = imp.risk;

    // Salva também o impacto em um cache simples para o race.js ler rapidamente (opcional)
    localStorage.setItem(`F1M_SETUP_IMPACT_${userTeam}`, JSON.stringify(imp));
  }

  function bindRange(inputEl, valueEl, key) {
    inputEl.addEventListener("input", () => {
      setup[key] = Number(inputEl.value);
      valueEl.textContent = String(setup[key]);
      renderImpact();
    });
  }

  bindRange(ui.frontWing, ui.vFrontWing, "frontWing");
  bindRange(ui.rearWing, ui.vRearWing, "rearWing");
  bindRange(ui.suspension, ui.vSuspension, "suspension");
  bindRange(ui.rideHeight, ui.vRideHeight, "rideHeight");
  bindRange(ui.diffLow, ui.vDiffLow, "diffLow");
  bindRange(ui.diffHigh, ui.vDiffHigh, "diffHigh");

  document.querySelectorAll("[data-engine]").forEach(btn => {
    btn.addEventListener("click", () => {
      setup.engineMode = btn.dataset.engine;
      ui.vEngineMode.textContent = setup.engineMode === "eco" ? "Eco" : setup.engineMode === "attack" ? "Ataque" : "Normal";
      renderImpact();
    });
  });

  ui.btnDefault.addEventListener("click", () => {
    setup = { ...DEFAULT_SETUP };
    applyToControls();
  });

  ui.btnSave.addEventListener("click", () => {
    saveSetup(setup);
    renderImpact();
  });

  ui.btnBack.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "lobby.html";
  });

  // Links rápidos (sem exigir mudanças em outras telas)
  ui.btnSendPractice.addEventListener("click", () => {
    saveSetup(setup);
    location.href = `practice.html?track=${encodeURIComponent(trackKey)}&userTeam=${encodeURIComponent(userTeam)}`;
  });
  ui.btnSendQuali.addEventListener("click", () => {
    saveSetup(setup);
    location.href = `qualifying.html?track=${encodeURIComponent(trackKey)}&userTeam=${encodeURIComponent(userTeam)}`;
  });
  ui.btnSendRace.addEventListener("click", () => {
    saveSetup(setup);
    location.href = `race.html?track=${encodeURIComponent(trackKey)}&userTeam=${encodeURIComponent(userTeam)}`;
  });

  // Inicializa
  applyToControls();

  // Salva automático (leve)
  let t;
  window.addEventListener("beforeunload", () => saveSetup(setup));
  document.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => saveSetup(setup), 350);
  });

})();
