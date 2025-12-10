// =======================================================
// F1 MANAGER 2025 – OFICINA & SETUP
// =======================================================

// -------------------------------------------------------
// CHAVES DE STORAGE
// -------------------------------------------------------
const STORAGE_SETUP_KEY = "f1m2025_practice_setup";
const STORAGE_TEAM_KEY = "f1m2025_user_team";
const STORAGE_MANAGER_KEY = "f1m2025_user_manager";
const STORAGE_FLAG_KEY = "f1m2025_user_flag";

// -------------------------------------------------------
// ESTADO LOCAL
// -------------------------------------------------------
const setupState = {
  wings: 5,
  suspension: 5,
  engine: 5,
  tyreStrategy: "medio_equilibrado"
};

// -------------------------------------------------------
// LOAD INICIAL
// -------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  carregarIdentidadeTopo();
  carregarSetupSalvo();
  aplicarValoresNosControles();
  atualizarResumoVisual();

  ligarBotoes();
});

// -------------------------------------------------------
// IDENTIDADE (equipes, manager, flag)
// -------------------------------------------------------
function carregarIdentidadeTopo() {
  const team = localStorage.getItem(STORAGE_TEAM_KEY) || "ferrari";
  const mgr = localStorage.getItem(STORAGE_MANAGER_KEY) || "Manager Player";
  const flag = localStorage.getItem(STORAGE_FLAG_KEY) || "br";

  const teamLogo = document.getElementById("header-team-logo");
  const teamName = document.getElementById("header-team-name");
  const mgrName = document.getElementById("header-manager-name");
  const flagImg = document.getElementById("header-manager-flag");
  const flagName = document.getElementById("header-manager-country-name");

  if (teamLogo) {
    teamLogo.src = `assets/teams/${team}.png`;
  }

  if (teamName) {
    const name = team.replace(/_/g, " ").toUpperCase();
    teamName.textContent = name;
  }

  if (mgrName) {
    mgrName.textContent = mgr;
  }

  if (flagImg) {
    flagImg.src = `assets/flags/${flag}.png`;
  }

  if (flagName) {
    flagName.textContent = nomePais(flag);
  }
}

// mapa simples de país
function nomePais(flagCode) {
  const map = {
    br: "Brasil",
    it: "Itália",
    uk: "Reino Unido",
    us: "Estados Unidos",
    fr: "França",
    de: "Alemanha",
    es: "Espanha"
  };
  return map[flagCode] || "País";
}

// -------------------------------------------------------
// CARREGAR SETUP SALVO
// -------------------------------------------------------
function carregarSetupSalvo() {
  try {
    const raw = localStorage.getItem(STORAGE_SETUP_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (typeof saved === "object") {
      setupState.wings = saved.wings ?? setupState.wings;
      setupState.suspension = saved.suspension ?? setupState.suspension;
      setupState.engine = saved.engine ?? setupState.engine;
      setupState.tyreStrategy = saved.tyreStrategy ?? setupState.tyreStrategy;
    }
  } catch (e) {
    console.warn("Falha ao carregar setup salvo:", e);
  }
}

// -------------------------------------------------------
// APLICAR VALORES AOS SLIDERS E SELECTS
// -------------------------------------------------------
function aplicarValoresNosControles() {
  const wings = document.getElementById("input-wings");
  const susp = document.getElementById("input-suspension");
  const eng = document.getElementById("input-engine");
  const tyre = document.getElementById("select-tyre-strategy");

  if (wings) wings.value = setupState.wings;
  if (susp) susp.value = setupState.suspension;
  if (eng) eng.value = setupState.engine;
  if (tyre) tyre.value = setupState.tyreStrategy;

  atualizarLabels();
}

// -------------------------------------------------------
// LABELS
// -------------------------------------------------------
function atualizarLabels() {
  const wingsLabel = document.getElementById("label-wings-value");
  const suspLabel = document.getElementById("label-suspension-value");
  const engLabel = document.getElementById("label-engine-value");

  if (wingsLabel)
    wingsLabel.textContent = textoAsa(setupState.wings) + ` (${setupState.wings}/10)`;

  if (suspLabel)
    suspLabel.textContent =
      textoSuspensao(setupState.suspension) + ` (${setupState.suspension}/10)`;

  if (engLabel)
    engLabel.textContent =
      textoMotor(setupState.engine) + ` (${setupState.engine}/10)`;
}

// helpers
function textoAsa(v) {
  if (v <= 3) return "Baixa Downforce";
  if (v <= 7) return "Equilibrado";
  return "Alta Downforce";
}

function textoSuspensao(v) {
  if (v <= 3) return "Macia";
  if (v <= 7) return "Média";
  return "Dura";
}

function textoMotor(v) {
  if (v <= 3) return "Econômico";
  if (v <= 7) return "Balanceado";
  return "Potência Máxima";
}

// -------------------------------------------------------
// RESUMO VISUAL (BARRAS)
// -------------------------------------------------------
function atualizarResumoVisual() {
  const overall = document.getElementById("summary-overall-value");
  const corner = document.getElementById("summary-cornering-value");
  const straight = document.getElementById("summary-straight-value");

  const barOverall = document.getElementById("summary-overall-bar");
  const barCorner = document.getElementById("summary-cornering-bar");
  const barStraight = document.getElementById("summary-straight-bar");

  // cálculos simples por enquanto (isso vai influenciar prática, qualy e corrida)
  const valOverall =
    (setupState.wings + setupState.suspension + setupState.engine) * 3;

  const valCorner =
    (setupState.wings * 8 + setupState.suspension * 6) * 0.6;

  const valStraight =
    (setupState.engine * 8 + setupState.wings * 2) * 0.6;

  if (overall) overall.textContent = `${Math.round(valOverall)} / 100`;
  if (corner) corner.textContent = `${Math.round(valCorner)} / 100`;
  if (straight) straight.textContent = `${Math.round(valStraight)} / 100`;

  if (barOverall) barOverall.style.width = `${Math.min(100, valOverall)}%`;
  if (barCorner) barCorner.style.width = `${Math.min(100, valCorner)}%`;
  if (barStraight) barStraight.style.width = `${Math.min(100, valStraight)}%`;
}

// -------------------------------------------------------
// LISTENERS DOS CONTROLES
// -------------------------------------------------------
function ligarControlesSetup() {
  const wings = document.getElementById("input-wings");
  const susp = document.getElementById("input-suspension");
  const eng = document.getElementById("input-engine");
  const tyre = document.getElementById("select-tyre-strategy");

  if (wings) {
    wings.addEventListener("input", (e) => {
      setupState.wings = parseInt(e.target.value);
      atualizarLabels();
      atualizarResumoVisual();
    });
  }

  if (susp) {
    susp.addEventListener("input", (e) => {
      setupState.suspension = parseInt(e.target.value);
      atualizarLabels();
      atualizarResumoVisual();
    });
  }

  if (eng) {
    eng.addEventListener("input", (e) => {
      setupState.engine = parseInt(e.target.value);
      atualizarLabels();
      atualizarResumoVisual();
    });
  }

  if (tyre) {
    tyre.addEventListener("change", (e) => {
      setupState.tyreStrategy = e.target.value;
    });
  }
}

// -------------------------------------------------------
// BOTÕES
// -------------------------------------------------------
function ligarBotoes() {
  ligarControlesSetup();

  // SALVAR SETUP
  const btnSave = document.getElementById("btn-save-setup");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      try {
        localStorage.setItem(STORAGE_SETUP_KEY, JSON.stringify(setupState));
        alert("Setup salvo com sucesso!");
      } catch (e) {
        alert("Erro ao salvar setup!");
        console.error(e);
      }
    });
  }

  // RESET
  const btnReset = document.getElementById("btn-reset-setup");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      setupState.wings = 5;
      setupState.suspension = 5;
      setupState.engine = 5;
      setupState.tyreStrategy = "medio_equilibrado";
      aplicarValoresNosControles();
      atualizarResumoVisual();
      alert("Setup redefinido!");
    });
  }

  // VOLTAR LOBBY
  const btnBack = document.getElementById("btn-back-lobby");
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "lobby.html";
    });
  }

  // PRÁTICA
  const btnPractice = document.getElementById("btn-go-practice");
  if (btnPractice) {
    btnPractice.addEventListener("click", () => {
      window.location.href = "practice.html";
    });
  }

  // QUALIFYING
  const btnQualy = document.getElementById("btn-go-qualy");
  if (btnQualy) {
    btnQualy.addEventListener("click", () => {
      window.location.href = "qualifying.html";
    });
  }

  // CORRIDA
  const btnRace = document.getElementById("btn-go-race");
  if (btnRace) {
    btnRace.addEventListener("click", () => {
      window.location.href = "race.html";
    });
  }
}
