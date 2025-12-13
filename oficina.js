/* =========================================================
   F1 MANAGER 2025 — OFICINA.JS (Setup do Carro)
   - Mantém o sistema atual (F1M_SETUP_${team})
   - Adiciona espelhamento compatível com TL/Quali/Race:
     ✅ f1m2025_user_team
     ✅ f1m2025_season_state.setup (raw + factors/impact)
     ✅ f1m2025_setup (fallback simples)
   - NÃO altera jogabilidade, apenas liga dados
========================================================= */

(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const userTeam = (params.get("userTeam") || localStorage.getItem("F1M_userTeam") || "mclaren").toLowerCase();
  const trackKey = (params.get("track") || localStorage.getItem("F1M_track") || "australia").toLowerCase();

  // Mantém compatibilidade antiga
  localStorage.setItem("F1M_userTeam", userTeam);
  localStorage.setItem("F1M_track", trackKey);

  // Compatibilidade com telas novas
  localStorage.setItem("f1m2025_user_team", userTeam);

  const SETUP_KEY = `F1M_SETUP_${userTeam}`;
  const IMPACT_KEY = `F1M_SETUP_IMPACT_${userTeam}`;

  // Season Store (para TL/Quali/Race)
  const SEASON_KEY = "f1m2025_season_state";
  const SIMPLE_SETUP_KEY = "f1m2025_setup"; // fallback leve (se alguém ler esse legado)

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
    } catch {
      return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
    }
  }

  function saveSeason(patch) {
    try {
      const s = loadSeason();
      const next = deepMerge(s, patch || {});
      localStorage.setItem(SEASON_KEY, JSON.stringify(next));
      return next;
    } catch {
      return null;
    }
  }

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

  function saveSetupCore(setup) {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  }

  // ======= Modelo de impacto (já existia) =======
  // Retorna multiplicadores usados pelo simulador
  function computeImpact(s) {
    const fw = s.frontWing / 100;   // 0..1
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
      engineStraightBoost = 1.00;
      engineWearBoost = 1.00;
      engineFuelBoost = 1.00;
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

  // ======= Normaliza para o formato “novo” (TL/Race) =======
  // O seu practice/race novos usam factors: topSpeedFactor/gripFactor/stabilityFactor/tyreWearFactor/fuelFactor
  function impactToFactors(imp) {
    return {
      topSpeedFactor: Number(imp.straightSpeed ?? 1.0),
      gripFactor: Number(imp.cornerGrip ?? 1.0),
      stabilityFactor: Number(imp.stability ?? 1.0),
      tyreWearFactor: Number(imp.tyreWear ?? 1.0),
      fuelFactor: Number(imp.fuel ?? 1.0),
      risk: String(imp.risk ?? "Médio")
    };
  }

  // ======= ESPÉLHAMENTO (o que liga tudo) =======
  function saveSetupEverywhere(setup) {
    // 1) Mantém o legado original
    saveSetupCore(setup);

    // 2) Calcula impacto e guarda no cache original
    const imp = computeImpact(setup);
    localStorage.setItem(IMPACT_KEY, JSON.stringify(imp));

    // 3) Salva um “setup simples” para leitores legados (se existirem)
    //    (não muda nada do jogo; só facilita compat)
    try {
      localStorage.setItem(SIMPLE_SETUP_KEY, JSON.stringify({
        frontWing: setup.frontWing,
        rearWing: setup.rearWing,
        suspension: setup.suspension,
        rideHeight: setup.rideHeight,
        diffLow: setup.diffLow,
        diffHigh: setup.diffHigh,
        engineMode: setup.engineMode,
        impact: imp,
        team: userTeam,
        track: trackKey,
        updatedAt: Date.now()
      }));
    } catch {}

    // 4) Season Store (TL/Quali/Race)
    const factors = impactToFactors(imp);
    saveSeason({
      current: { track: trackKey, gp: (params.get("gp") || ""), updatedAt: Date.now() },
      setup: {
        track: trackKey,
        gp: (params.get("gp") || ""),
        userTeamKey: userTeam,
        updatedAt: Date.now(),
        raw: { ...setup },
        impact: { ...imp },
        factors
      }
    });
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

  // Logo equipe
  if (ui.teamLogo) {
    ui.teamLogo.src = `assets/teams/${userTeam}.png`;
    ui.teamLogo.onerror = () => { ui.teamLogo.style.display = "none"; };
  }

  if (ui.pillTeam) ui.pillTeam.textContent = `Equipe: ${userTeam.toUpperCase()}`;
  if (ui.pillTrack) ui.pillTrack.textContent = `Pista: ${trackKey.toUpperCase()}`;

  let setup = loadSetup();

  function applyToControls() {
    if (ui.frontWing) ui.frontWing.value = setup.frontWing;
    if (ui.rearWing) ui.rearWing.value = setup.rearWing;
    if (ui.suspension) ui.suspension.value = setup.suspension;
    if (ui.rideHeight) ui.rideHeight.value = setup.rideHeight;
    if (ui.diffLow) ui.diffLow.value = setup.diffLow;
    if (ui.diffHigh) ui.diffHigh.value = setup.diffHigh;

    if (ui.vFrontWing) ui.vFrontWing.textContent = String(setup.frontWing);
    if (ui.vRearWing) ui.vRearWing.textContent = String(setup.rearWing);
    if (ui.vSuspension) ui.vSuspension.textContent = String(setup.suspension);
    if (ui.vRideHeight) ui.vRideHeight.textContent = String(setup.rideHeight);
    if (ui.vDiffLow) ui.vDiffLow.textContent = String(setup.diffLow);
    if (ui.vDiffHigh) ui.vDiffHigh.textContent = String(setup.diffHigh);

    if (ui.vEngineMode) {
      ui.vEngineMode.textContent =
        setup.engineMode === "eco" ? "Eco" :
        setup.engineMode === "attack" ? "Ataque" : "Normal";
    }

    renderImpact();
  }

  function renderImpact() {
    const imp = computeImpact(setup);
    if (ui.kStraight) ui.kStraight.textContent = `x${imp.straightSpeed.toFixed(2)}`;
    if (ui.kCorner) ui.kCorner.textContent = `x${imp.cornerGrip.toFixed(2)}`;
    if (ui.kStability) ui.kStability.textContent = `x${imp.stability.toFixed(2)}`;
    if (ui.kTyre) ui.kTyre.textContent = `x${imp.tyreWear.toFixed(2)}`;
    if (ui.kFuel) ui.kFuel.textContent = `x${imp.fuel.toFixed(2)}`;
    if (ui.kRisk) ui.kRisk.textContent = imp.risk;

    // Mantém cache original
    localStorage.setItem(IMPACT_KEY, JSON.stringify(imp));

    // Atualiza Season Store em tempo real (leve; não quebra nada)
    const factors = impactToFactors(imp);
    saveSeason({
      setup: {
        track: trackKey,
        gp: (params.get("gp") || ""),
        userTeamKey: userTeam,
        updatedAt: Date.now(),
        raw: { ...setup },
        impact: { ...imp },
        factors
      }
    });
  }

  function bindRange(inputEl, valueEl, key) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      setup[key] = Number(inputEl.value);
      if (valueEl) valueEl.textContent = String(setup[key]);
      renderImpact();
    });
  }

  bindRange(ui.frontWing, ui.vFrontWing, "frontWing");
  bindRange(ui.rearWing, ui.vRearWing, "rearWing");
  bindRange(ui.suspension, ui.vSuspension, "suspension");
  bindRange(ui.rideHeight, ui.vRideHeight, "rideHeight");
  bindRange(ui.diffLow, ui.vDiffLow, "diffLow");
  bindRange(ui.diffHigh, ui.vDiffHigh, "diffHigh");

  document.querySelectorAll("[data-engine]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setup.engineMode = btn.dataset.engine;
      if (ui.vEngineMode) {
        ui.vEngineMode.textContent =
          setup.engineMode === "eco" ? "Eco" :
          setup.engineMode === "attack" ? "Ataque" : "Normal";
      }
      renderImpact();
    });
  });

  if (ui.btnDefault) {
    ui.btnDefault.addEventListener("click", () => {
      setup = { ...DEFAULT_SETUP };
      applyToControls();
    });
  }

  if (ui.btnSave) {
    ui.btnSave.addEventListener("click", () => {
      // SALVA EM TODOS OS LUGARES (fix principal)
      saveSetupEverywhere(setup);
      renderImpact();
    });
  }

  if (ui.btnBack) {
    ui.btnBack.addEventListener("click", () => {
      // salva antes de sair (não muda jogabilidade)
      saveSetupEverywhere(setup);
      if (history.length > 1) history.back();
      else location.href = "lobby.html";
    });
  }

  // Links rápidos
  function go(url) {
    saveSetupEverywhere(setup);
    location.href = url;
  }

  if (ui.btnSendPractice) ui.btnSendPractice.addEventListener("click", () => {
    go(`practice.html?track=${encodeURIComponent(trackKey)}&gp=${encodeURIComponent(params.get("gp") || "")}&userTeam=${encodeURIComponent(userTeam)}`);
  });
  if (ui.btnSendQuali) ui.btnSendQuali.addEventListener("click", () => {
    go(`qualifying.html?track=${encodeURIComponent(trackKey)}&gp=${encodeURIComponent(params.get("gp") || "")}&userTeam=${encodeURIComponent(userTeam)}`);
  });
  if (ui.btnSendRace) ui.btnSendRace.addEventListener("click", () => {
    go(`race.html?track=${encodeURIComponent(trackKey)}&gp=${encodeURIComponent(params.get("gp") || "")}&userTeam=${encodeURIComponent(userTeam)}`);
  });

  // Inicializa UI e faz um “sync” inicial (sem forçar salvar)
  applyToControls();

  // Autosave leve (mantém o seu comportamento)
  let t;
  window.addEventListener("beforeunload", () => saveSetupEverywhere(setup));
  document.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => saveSetupEverywhere(setup), 350);
  });

})();
