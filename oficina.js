// =====================================================
// F1 MANAGER 2025 – OFICINA.JS (Setup Oficial v6.1)
// Fonte ÚNICA de setup do carro
// Salva em: localStorage["f1m_setup_v61"]
// =====================================================

(() => {
  "use strict";

  const STORAGE_KEY = "f1m_setup_v61";

  // -----------------------------
  // SETUP PADRÃO (BASE REALISTA)
  // -----------------------------
  const DEFAULT_SETUP = {
    engineMap: 5,
    wingFront: 6,
    wingRear: 7,
    aeroBalance: 52,
    suspension: 6,
    diffEntry: 55,
    diffExit: 60,
    brakeBias: 54,
    tyrePressure: 21.5
  };

  // -----------------------------
  // HELPERS
  // -----------------------------
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function loadSetup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETUP };
      return { ...DEFAULT_SETUP, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETUP };
    }
  }

  function saveSetup(setup) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  }

  // -----------------------------
  // DOM
  // -----------------------------
  const setup = loadSetup();

  const fields = {
    engineMap: document.getElementById("engineMap"),
    wingFront: document.getElementById("wingFront"),
    wingRear: document.getElementById("wingRear"),
    aeroBalance: document.getElementById("aeroBalance"),
    suspension: document.getElementById("suspension"),
    diffEntry: document.getElementById("diffEntry"),
    diffExit: document.getElementById("diffExit"),
    brakeBias: document.getElementById("brakeBias"),
    tyrePressure: document.getElementById("tyrePressure")
  };

  // -----------------------------
  // INICIALIZA CAMPOS
  // -----------------------------
  Object.keys(fields).forEach(key => {
    if (!fields[key]) return;
    fields[key].value = setup[key];
  });

  // -----------------------------
  // ATUALIZA SETUP AO MUDAR
  // -----------------------------
  Object.keys(fields).forEach(key => {
    const el = fields[key];
    if (!el) return;

    el.addEventListener("input", () => {
      setup[key] = parseFloat(el.value);

      // clamps reais
      setup.engineMap    = clamp(setup.engineMap, 1, 10);
      setup.wingFront    = clamp(setup.wingFront, 1, 10);
      setup.wingRear     = clamp(setup.wingRear, 1, 10);
      setup.aeroBalance  = clamp(setup.aeroBalance, 45, 60);
      setup.suspension   = clamp(setup.suspension, 1, 10);
      setup.diffEntry    = clamp(setup.diffEntry, 40, 70);
      setup.diffExit     = clamp(setup.diffExit, 40, 75);
      setup.brakeBias    = clamp(setup.brakeBias, 50, 60);
      setup.tyrePressure = clamp(setup.tyrePressure, 18, 26);

      saveSetup(setup);
      updateTelemetryPreview();
    });
  });

  // -----------------------------
  // TELEMETRIA (VISUAL)
  // -----------------------------
  function updateTelemetryPreview() {
    const power =
      (setup.engineMap / 10) *
      (1 - (setup.wingFront + setup.wingRear) / 25);

    const grip =
      ((setup.wingFront + setup.wingRear) / 20) *
      (1 - Math.abs(setup.aeroBalance - 52) / 15);

    const stability =
      (setup.suspension / 10) *
      (1 - Math.abs(setup.brakeBias - 54) / 12);

    setBar("telemetry-power", power);
    setBar("telemetry-grip", grip);
    setBar("telemetry-stability", stability);
  }

  function setBar(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${clamp(value * 100, 5, 100)}%`;
  }

  updateTelemetryPreview();

  // -----------------------------
  // NAVEGAÇÃO
  // -----------------------------
  window.voltarTreino = () => {
    saveSetup(setup);
    history.back();
  };

})();
