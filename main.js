/* ============================================================
   main.js — Camada de Navegação Inicial / Seleção de Manager
   F1 Manager 2025 — Versão UI Simplificada
   ============================================================ */

/*
  Este arquivo cuida de:
  - Tela de capa (splash) -> menu principal
  - Menu principal -> nova carreira / continuar
  - Escolha de tipo de manager (real x criado)
  - Lista de managers reais (botões)
  - Criação de manager próprio (nome + país)
  - Chamadas de “gancho” para a lógica de jogo (carreira, lobby, etc.)
*/

/* ============================================================
   CONFIGURAÇÕES BÁSICAS
   ============================================================ */

/**
 * IDs das telas (sections) que existem no index.html
 * e são estilizadas pelo ui.css
 */
const SCREENS = {
  SPLASH: "screen-splash",
  MAIN_MENU: "screen-main-menu",
  MANAGER_CHOICE: "screen-manager-choice",
  MANAGER_REAL: "screen-manager-real",
  MANAGER_CREATE: "screen-manager-create",
};

/**
 * Lista básica de managers reais da F1 2025.
 * (Você pode ajustar nomes/equipes depois conforme quiser.)
 */
const REAL_MANAGERS = [
  { id: "horner",   name: "Christian Horner", team: "Red Bull Racing", country: "Reino Unido" },
  { id: "wolff",    name: "Toto Wolff",      team: "Mercedes",        country: "Áustria" },
  { id: "vasseur",  name: "Frédéric Vasseur",team: "Ferrari",         country: "França" },
  { id: "stella",   name: "Andrea Stella",   team: "McLaren",         country: "Itália" },
  { id: "krack",    name: "Mike Krack",      team: "Aston Martin",    country: "Luxemburgo" },
  { id: "alunni",   name: "Bruno Famin",     team: "Alpine",          country: "França" },
  { id: "browning", name: "Peter Bayer",     team: "RB",              country: "Áustria" },
  { id: "ossa",     name: "James Vowles",    team: "Williams",        country: "Reino Unido" },
  { id: "sauber",   name: "Alessandro Alunni Bravi", team: "Sauber / Stake", country: "Itália" },
  { id: "haas",     name: "Ayao Komatsu",    team: "Haas",            country: "Japão" },
];

/**
 * Estado inicial do jogo (camada de navegação).
 * Aqui não entra ainda toda a lógica pesada da carreira,
 * é só o “cartão de visita” antes do lobby real.
 */
const UI_STATE = {
  currentScreen: null,
  selectedManager: null, // { type: 'real'|'custom', data: {...} }
};

/* ============================================================
   FUNÇÕES UTILITÁRIAS DE TELA
   ============================================================ */

/**
 * Mostra apenas a tela com o id informado,
 * escondendo todas as outras sections com a classe .screen.
 */
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
   FLUXO: TELA DE CAPA / SPLASH
   ============================================================ */

/**
 * Quando o usuário tocar/clicar na capa, vamos direto
 * para o menu principal.
 */
function onSplashTouched() {
  showScreen(SCREENS.MAIN_MENU);
}

/* ============================================================
   FLUXO: MENU PRINCIPAL
   ============================================================ */

/**
 * “Nova carreira” no menu principal
 * → leva para a escolha do tipo de manager.
 */
function onNewCareerClicked() {
  showScreen(SCREENS.MANAGER_CHOICE);
}

/**
 * “Continuar carreira” no menu principal.
 * Aqui, por enquanto, só fazemos um gancho.
 * Depois você pode conectar com seu sistema de saves.
 */
function onContinueCareerClicked() {
  // Aqui você pode conectar com seu sistema de save real
  // Exemplo:
  // if (window.Game && Game.loadLastSave) { Game.loadLastSave(); return; }

  alert("Sistema de 'Continuar carreira' ainda será conectado ao sistema de save.");
}

/* ============================================================
   FLUXO: ESCOLHA DO TIPO DE MANAGER
   ============================================================ */

function onUseRealManagerClicked() {
  renderRealManagersList();
  showScreen(SCREENS.MANAGER_REAL);
}

function onCreateManagerClicked() {
  showScreen(SCREENS.MANAGER_CREATE);
}

/**
 * Voltar do menu de tipo de manager para o menu principal.
 */
function onBackToMainFromChoice() {
  showScreen(SCREENS.MAIN_MENU);
}

/* ============================================================
   FLUXO: MANAGER REAL
   ============================================================ */

/**
 * Renderiza a lista de managers reais como botões
 * dentro do elemento #real-manager-list (que está no index.html).
 */
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

/**
 * Quando o usuário escolhe um manager real.
 */
function onRealManagerSelected(manager) {
  UI_STATE.selectedManager = {
    type: "real",
    data: manager,
  };

  // Aqui você pode integrar com a lógica da carreira:
  // Exemplo de gancho:
  // if (window.Game && Game.startCareerWithRealManager) {
  //   Game.startCareerWithRealManager(manager);
  //   return;
  // }

  alert(
    `Manager real selecionado:\n${manager.name} (${manager.team})\n\n` +
    "Próximo passo: escolha de equipe / escuderia e lobby (será conectado na próxima etapa)."
  );

  // Por enquanto, voltamos para o menu principal:
  showScreen(SCREENS.MAIN_MENU);
}

function onBackToManagerChoiceFromReal() {
  showScreen(SCREENS.MANAGER_CHOICE);
}

/* ============================================================
   FLUXO: MANAGER PERSONALIZADO
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

  // Gancho para iniciar carreira com manager personalizado:
  // if (window.Game && Game.startCareerWithCustomManager) {
  //   Game.startCareerWithCustomManager(UI_STATE.selectedManager.data);
  //   return;
  // }

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
   INICIALIZAÇÃO — EVENTOS / LISTENERS
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // 1) Tela inicial ativa é a capa / splash
  showScreen(SCREENS.SPLASH);

  // 2) Toque/click em qualquer lugar da capa
  const touchCatcher = document.getElementById("touch-catcher");
  if (touchCatcher) {
    touchCatcher.addEventListener("click", onSplashTouched);
    touchCatcher.addEventListener("touchstart", (ev) => {
      ev.preventDefault();
      onSplashTouched();
    });
  } else {
    console.warn(
      'Elemento "#touch-catcher" não encontrado. ' +
      "Verifique se ele existe na section da tela de capa."
    );
  }

  // 3) Botões do menu principal
  const btnNew = document.getElementById("btn-new-career");
  const btnContinue = document.getElementById("btn-continue-career");

  if (btnNew) btnNew.addEventListener("click", onNewCareerClicked);
  if (btnContinue) btnContinue.addEventListener("click", onContinueCareerClicked);

  // 4) Botões da tela de escolha de tipo de manager
  const btnUseReal = document.getElementById("btn-use-real-manager");
  const btnCreate = document.getElementById("btn-create-manager");
  const btnBackChoiceToMain = document.getElementById("btn-back-main-from-choice");

  if (btnUseReal) btnUseReal.addEventListener("click", onUseRealManagerClicked);
  if (btnCreate) btnCreate.addEventListener("click", onCreateManagerClicked);
  if (btnBackChoiceToMain) btnBackChoiceToMain.addEventListener("click", onBackToMainFromChoice);

  // 5) Botões da tela de managers reais
  const btnBackRealToChoice = document.getElementById("btn-back-manager-choice-from-real");
  if (btnBackRealToChoice) {
    btnBackRealToChoice.addEventListener("click", onBackToManagerChoiceFromReal);
  }

  // 6) Botões da tela de criação de manager
  const btnConfirmCustom = document.getElementById("btn-confirm-custom-manager");
  const btnBackCreateToChoice = document.getElementById("btn-back-manager-choice-from-create");

  if (btnConfirmCustom) {
    btnConfirmCustom.addEventListener("click", onConfirmCustomManagerClicked);
  }
  if (btnBackCreateToChoice) {
    btnBackCreateToChoice.addEventListener("click", onBackToManagerChoiceFromCreate);
  }

  // 7) (Opcional) Carregar automaticamente a lista de managers reais
  //    quando a tela for aberta pela primeira vez.
  //    Aqui ainda não chamamos renderRealManagersList() para evitar
  //    mexer no DOM desnecessariamente antes da hora.
});
