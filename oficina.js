// =====================================================
// F1 MANAGER 2025 – OFICINA.JS (v6.1)
// FIXES:
// - Botão VOLTAR agora retorna para practice.html mantendo track/userTeam/gp
// - Logo da equipe aparece no topo esquerdo (auto-detect do <img> existente)
// - Setup salva em localStorage["f1m_setup_v61"] (fonte oficial)
// - Lê sliders existentes (ASA DIANTEIRA / ASA TRASEIRA / PRESSÃO / ALTURA / RIGIDEZ)
//   e converte para o modelo telemétrico usado no practice.js
// =====================================================

(() => {
  "use strict";

  const STORAGE_KEY = "f1m_setup_v61";

  // -----------------------------
  // URL PARAMS
  // -----------------------------
  const params = new URLSearchParams(window.location.search);
  const TRACK_KEY = (params.get("track") || "australia").toLowerCase();
  const TEAM_KEY  = (params.get("userTeam") || "ferrari").toLowerCase();
  const GP_LABEL  = (params.get("gp") || "").trim();

  function buildUrl(page) {
    const p = new URLSearchParams();
    p.set("track", TRACK_KEY);
    p.set("userTeam", TEAM_KEY);
    if (GP_LABEL) p.set("gp", GP_LABEL);
    return `${page}?${p.toString()}`;
  }

  // -----------------------------
  // TEAM LOGOS (robusto)
  // -----------------------------
  const TEAM_LOGO = {
    ferrari:  "assets/logos/ferrari.png",
    mercedes: "assets/logos/mercedes.png",
    redbull:  "assets/logos/redbull.png",
    mclaren:  "assets/logos/mclaren.png",
    aston:    "assets/logos/aston.png",
    alpine:   "assets/logos/alpine.png",
    williams: "assets/logos/williams.png",
    haas:     "assets/logos/haas.png",
    rb:       "assets/logos/rb.png",
    sauber:   "assets/logos/sauber.png"
  };

  function setTeamLogo() {
    // tenta achar um <img> existente no topo esquerdo
    const candidates = [
      document.getElementById("teamLogoTop"),
      document.getElementById("teamLogo"),
      document.getElementById("logo"),
      document.querySelector("img[alt='LOGO']"),
      document.querySelector("img[alt*='Logo']"),
      document.querySelector("header img"),
      document.querySelector("img")
    ].filter(Boolean);

    const img = candidates[0];
    if (!img) return;

    const src = TEAM_LOGO[TEAM_KEY] || TEAM_LOGO.ferrari;
    img.src = src;
    img.alt = TEAM_KEY;
    img.style.width = img.style.width || "40px";
    img.style.height = img.style.height || "40px";
    img.style.objectFit = img.style.objectFit || "contain";
    img.style.filter = img.style.filter || "drop-shadow(0 2px 10px rgba(0,0,0,.5))";
  }

  // -----------------------------
  // SETUP (modelo oficial)
  // -----------------------------
  const DEFAULT_SETUP = {
    engineMap: 5,        // 1..10
    wingFront: 6,        // 1..10
    wingRear:  7,        // 1..10
    aeroBalance: 52,     // 45..60
    suspension: 6,       // 1..10
    diffEntry: 55,       // 40..70
    diffExit:  60,       // 40..75
    brakeBias: 54,       // 50..60
    tyrePressure: 21.5, // 18..26
    fuelMix: 2,          // 1..3
    ersMode: 2           // 1..3
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function loadSetup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETUP };
      const obj = JSON.parse(raw);
      return { ...DEFAULT_SETUP, ...(obj && typeof obj === "object" ? obj : {}) };
    } catch {
      return { ...DEFAULT_SETUP };
    }
  }

  function saveSetup(setup) {
    // normaliza
    const s = { ...DEFAULT_SETUP, ...setup };
    s.engineMap    = clamp(Number(s.engineMap) || DEFAULT_SETUP.engineMap, 1, 10);
    s.wingFront    = clamp(Number(s.wingFront) || DEFAULT_SETUP.wingFront, 1, 10);
    s.wingRear     = clamp(Number(s.wingRear)  || DEFAULT_SETUP.wingRear,  1, 10);
    s.aeroBalance  = clamp(Number(s.aeroBalance) || DEFAULT_SETUP.aeroBalance, 45, 60);
    s.suspension   = clamp(Number(s.suspension) || DEFAULT_SETUP.suspension, 1, 10);
    s.diffEntry    = clamp(Number(s.diffEntry) || DEFAULT_SETUP.diffEntry, 40, 70);
    s.diffExit     = clamp(Number(s.diffExit)  || DEFAULT_SETUP.diffExit,  40, 75);
    s.brakeBias    = clamp(Number(s.brakeBias) || DEFAULT_SETUP.brakeBias, 50, 60);
    s.tyrePressure = clamp(Number(s.tyrePressure) || DEFAULT_SETUP.tyrePressure, 18, 26);
    s.fuelMix      = clamp(Number(s.fuelMix) || DEFAULT_SETUP.fuelMix, 1, 3);
    s.ersMode      = clamp(Number(s.ersMode) || DEFAULT_SETUP.ersMode, 1, 3);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }

  // -----------------------------
  // SLIDERS EXISTENTES (auto-detect pelo título do bloco)
  // -----------------------------
  function getBlockTitleForInput(input) {
    // procura um título próximo (H1/H2/H3/label/div com texto)
    const card = input.closest("section, article, .card, .panel, .box, div") || input.parentElement;
    if (!card) return "";
    const titleEl =
      card.querySelector("h1,h2,h3,h4,.title,.card-title,.panel-title,strong") || card;
    const txt = (titleEl.textContent || "").trim().toUpperCase();
    return txt;
  }

  function getAtualLabelNearInput(input) {
    // no seu layout aparece "Atual:" dentro do mesmo bloco
    const card = input.closest("section, article, .card, .panel, .box, div") || input.parentElement;
    if (!card) return null;

    // pega o primeiro elemento que tenha "Atual" (sem criar novos)
    const nodes = Array.from(card.querySelectorAll("div,span,p,small,label"));
    const found = nodes.find(n => (n.textContent || "").trim().toUpperCase().startsWith("ATUAL"));
    return found || null;
  }

  function parseRange(input) {
    const min = Number(input.min || "0");
    const max = Number(input.max || "100");
    let val = Number(input.value);
    if (!Number.isFinite(val)) val = min;
    return { min, max, val };
  }

  function mapSlidersToSetup(currentSetup) {
    const setup = { ...currentSetup };

    // auto-detect dos inputs range
    const ranges = Array.from(document.querySelectorAll("input[type='range']"));
    for (const r of ranges) {
      const title = getBlockTitleForInput(r);

      const { min, max, val } = parseRange(r);

      // helpers de normalização
      const to1to10 = () => {
        if (max === min) return 5;
        const t = (val - min) / (max - min);
        return clamp(Math.round(1 + t * 9), 1, 10);
      };

      // atualização do "Atual:" no UI
      const atualEl = getAtualLabelNearInput(r);
      if (atualEl) {
        // mantém o texto original e só atualiza o valor se houver
        const base = (atualEl.textContent || "Atual:").split(":")[0];
        atualEl.textContent = `${base}: ${val}`;
      }

      // mapeamento por título
      if (title.includes("ASA DIANTEIRA")) {
        setup.wingFront = to1to10();
      } else if (title.includes("ASA TRASEIRA")) {
        setup.wingRear = to1to10();
      } else if (title.includes("PRESSÃO") || title.includes("PNEU")) {
        // se slider já estiver em PSI, usa direto; senão converte para 18..26
        if (max <= 30 && min >= 10) {
          setup.tyrePressure = clamp(val, 18, 26);
        } else {
          const t = (val - min) / (max - min);
          setup.tyrePressure = clamp(18 + t * 8, 18, 26);
        }
      } else if (title.includes("RIGIDEZ") || title.includes("SUSPENSÃO")) {
        setup.suspension = to1to10();
      } else if (title.includes("ALTURA DO CARRO") || title.includes("ALTURA")) {
        // altura influencia estabilidade/drag; como o modelo base usa "suspension",
        // combinamos com a rigidez (se existir) — aqui armazenamos como ajuste extra
        setup.rideHeight = val; // extra (não quebra o practice.js)
      }
    }

    // se existir rideHeight, usa para ajustar um pouco a suspensão (sem depender de UI)
    if (typeof setup.rideHeight === "number") {
      // quanto mais alto, pior estabilidade; converte para um leve penalty (1..10)
      // normaliza pelo range típico 0..100 se não houver referência
      const t = clamp(setup.rideHeight / 100, 0, 1);
      const heightInfluence = clamp(Math.round(10 - t * 4), 1, 10); // 10..6
      // mistura com suspension atual (se veio do slider)
      setup.suspension = clamp(Math.round((setup.suspension * 0.7) + (heightInfluence * 0.3)), 1, 10);
    }

    return saveSetup(setup);
  }

  // -----------------------------
  // VOLTAR (corrige: volta p/ treino e mantém params)
  // -----------------------------
  function wireBackButton() {
    // tenta achar o botão "VOLTAR" do layout
    const candidates = [
      document.getElementById("btnVoltar"),
      document.getElementById("voltar"),
      document.getElementById("backBtn"),
      document.querySelector("[data-action='voltar']"),
      ...Array.from(document.querySelectorAll("button,a")).filter(el => (el.textContent || "").trim().toUpperCase() === "VOLTAR")
    ].filter(Boolean);

    const btn = candidates[0];
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // antes de sair, salva setup a partir dos sliders atuais
      const setup = mapSlidersToSetup(loadSetup());
      saveSetup(setup);
      window.location.href = buildUrl("practice.html");
    });
  }

  // -----------------------------
  // AUTO-SAVE enquanto mexe nos sliders
  // -----------------------------
  function wireAutosave() {
    const ranges = Array.from(document.querySelectorAll("input[type='range']"));
    for (const r of ranges) {
      r.addEventListener("input", () => {
        mapSlidersToSetup(loadSetup());
      });
      r.addEventListener("change", () => {
        mapSlidersToSetup(loadSetup());
      });
    }
  }

  // -----------------------------
  // INIT
  // -----------------------------
  setTeamLogo();
  wireBackButton();
  wireAutosave();

  // salva uma vez ao abrir (garante que a chave exista)
  mapSlidersToSetup(loadSetup());

})();
