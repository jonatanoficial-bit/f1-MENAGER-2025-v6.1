/* ============================================================
   main.js — Navegação inicial / Seleção de Manager
   F1 Manager 2025 — Vale Edition
   ============================================================ */

/* IDs das telas (sections) que existem no index.html */
const SCREENS = {
  SPLASH: "screen-splash",
  MAIN_MENU: "screen-main-menu",
  MANAGER_CHOICE: "screen-manager-choice",
  MANAGER_REAL: "screen-manager-real",
  MANAGER_CREATE: "screen-manager-create",
};

/* Lista de managers reais da F1 2025 (10 equipes) */
const REAL_MANAGERS = [
  { id: "horner", name: "Christian Horner", team: "Red Bull Racing", country: "Reino Unido" },
  { id: "wolff", name: "Toto Wolff", team: "Mercedes", country: "Áustria" },
  { id: "vasseur", name: "Frédéric Vasseur", team: "Ferrari", country: "França" },
  { id: "stella", name: "Andrea Stella", team: "McLaren", country: "Itália" },
  { id: "krack", name: "Mike Krack", team: "Aston Martin", country: "Luxemburgo" },
  { id: "famin", name: "Bruno Famin", team: "Alpine", country: "França" },
  { id: "bayer", name: "Peter Bayer", team: "RB", country: "Áustria" },
  { id: "vowles", name: "James Vowles", team: "Williams", country: "Reino Unido" },
  { id: "bravi", name: "Alessandro Alunni Bravi", team: "Sauber / Stake", country: "Itália" },
  { id: "komatsu", name: "Ayao Komatsu", team: "Haas", country: "Japão" },
];

/* Estado simples da UI */
const UI_STATE = {
  currentScreen: null,
  selectedManager: null, // { type: 'real'|'custom', data: {...} }
};

/* ============================================================
   Utilitário: mostrar uma tela e esconder as outras
   ============================================================ */
function showScreen(screenId) {
  const allScreens = document.querySelectorAll(".screen");
  allScreens.forEach((el) => el.classList.remove("screen-active"));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("screen-active");
    UI_STATE.currentScreen = screenId;
  } else {
    console.warn(`Tela "${screenId}" não encontrada. Verifique o id no HTML.`);
  }
}

/* ============================================================
   Fluxo: Tela de capa (splash)
   ============================================================ */
function onSplashTouched() {
  showScreen(SCREENS.MAIN_MENU);
}

/* ============================================================
   Fluxo: Menu principal
   ============================================================ */
function onNewCareerClicked() {
  showScreen(SCREENS.MANAGER_CHOICE);
}

function onContinueCareerClicked() {
  // Aqui você conecta com seu sistema de save/carreira real.
  // Por enquanto, só um aviso.
  alert("Sistema de 'Continuar carreira' ainda será conectado ao sistema de save.");
}

/* ============================================================
   Fluxo: Escolha do tipo de manager
   ============================================================ */
function onUseRealManagerClicked() {
  renderRealManagersList();
  showScreen(SCREENS.MANAGER_REAL);
}

function onCreateManagerClicked() {
  showScreen(SCREENS.MANAGER_CREATE);
}

function onBackToMainFromChoice() {
  showScreen(SCREENS.MAIN_MENU);
}

/* ============================================================
   Fluxo: Manager real
   ============================================================ */
function renderRealManagersList() {
  const container = document.getElementById("real-manager-list");
  if (!container) {
    console.warn('Elemento "#real-manager-list" não encontrado no HTML.');
    return;
  }

  container.innerHTML = "";

  REAL_MANAGERS.forEach((mgr) => {
    const btn = document.createElement("button");
    btn.className = "main-btn real-manager-btn";
    btn.textContent = `${mgr.name} — ${mgr.team}`;
    btn.addEventListener("click", () => onRealManagerSelected(mgr));
    container.appendChild(btn);
  });
}

function onRealManagerSelected(manager) {
  UI_STATE.selectedManager = {
    type: "real",
    data: manager,
  };

  // Aqui depois vamos ligar com:
  // Game.startCareerWithRealManager(manager) etc.
  alert(
    `Manager real selecionado:\n${manager.name} (${manager.team})\n\n` +
      "Próximo passo: escolha de equipe / escuderia e lobby (será conectado na próxima etapa)."
  );

  showScreen(SCREENS.MAIN_MENU);
}

function onBackToManagerChoiceFromReal() {
  showScreen(SCREENS.MANAGER_CHOICE);
}

/* ============================================================
   Fluxo: Manager personalizado
   ============================================================ */
function onConfirmCustomManagerClicked() {
  const nameInput = document.getElementById("input-manager-name");
  const countryInput = document.getElementById("input-manager-country");

  const name = (nameInput?.value || "").trim();
  const country = (countryInput?.value || "").trim();

  if (!name) {
    alert("Digite um nome para o seu manager.");
    if (nameInput) nameInput.focus();
    return;
  }

  UI_STATE.selectedManager = {
    type: "custom",
    data: {
      name,
      country: country || "País não informado",
    },
  };

  // Depois ligamos aqui com o sistema de carreira real.
  alert(
    `Manager criado:\n${name} (${UI_STATE.selectedManager.data.country})\n\n` +
      "Próximo passo: escolha de equipe / escuderia e lobby (será conectado na próxima etapa)."
  );

  showScreen(SCREENS.MAIN_MENU);
}

function onBackToManagerChoiceFromCreate() {
  showScreen(SCREENS.MANAGER_CHOICE);
}

/* ============================================================
   Inicialização: ligar todos os botões
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Tela inicial = capa
  showScreen(SCREENS.SPLASH);

  // Splash
  const touchCatcher = document.getElementById("touch-catcher");
  if (touchCatcher) {
    touchCatcher.addEventListener("click", onSplashTouched);
    touchCatcher.addEventListener("touchstart", (ev) => {
      ev.preventDefault();
      onSplashTouched();
    });
  } else {
    console.warn(
      'Elemento "#touch-catcher" não encontrado. Verifique se ele existe na tela de capa.'
    );
  }

  // Menu principal
  const btnNew = document.getElementById("btn-new-career");
  const btnContinue = document.getElementById("btn-continue-career");
  if (btnNew) btnNew.addEventListener("click", onNewCareerClicked);
  if (btnContinue) btnContinue.addEventListener("click", onContinueCareerClicked);

  // Tela de tipo de manager
  const btnUseReal = document.getElementById("btn-use-real-manager");
  const btnCreate = document.getElementById("btn-create-manager");
  const btnBackChoiceToMain = document.getElementById("btn-back-main-from-choice");
  if (btnUseReal) btnUseReal.addEventListener("click", onUseRealManagerClicked);
  if (btnCreate) btnCreate.addEventListener("click", onCreateManagerClicked);
  if (btnBackChoiceToMain)
    btnBackChoiceToMain.addEventListener("click", onBackToMainFromChoice);

  // Tela de managers reais
  const btnBackRealToChoice = document.getElementById(
    "btn-back-manager-choice-from-real"
  );
  if (btnBackRealToChoice)
    btnBackRealToChoice.addEventListener("click", onBackToManagerChoiceFromReal);

  // Tela de criação de manager
  const btnConfirmCustom = document.getElementById("btn-confirm-custom-manager");
  const btnBackCreateToChoice = document.getElementById(
    "btn-back-manager-choice-from-create"
  );
  if (btnConfirmCustom)
    btnConfirmCustom.addEventListener("click", onConfirmCustomManagerClicked);
  if (btnBackCreateToChoice)
    btnBackCreateToChoice.addEventListener("click", onBackToManagerChoiceFromCreate);
});
