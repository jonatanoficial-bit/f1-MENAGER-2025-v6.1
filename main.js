// =======================================================
// F1 MANAGER 2025 – MAIN.JS (Single Page do INDEX)
// =======================================================

// ------------------------
// Estado do jogo na memória
// ------------------------
const DEFAULT_MONEY = 5000000;
const DEFAULT_STAGE = 1;
const SAVE_KEY = "f1m2025_save_v1";
const USER_TEAM_KEY = "f1m2025_user_team";

let currentGame = null; // será um objeto com dados do manager/jogo

// ------------------------
// Dados fixos – managers, equipes, calendário
// ------------------------

// Managers reais (exemplo – você pode ajustar nomes/equipes depois)
const REAL_MANAGERS = [
  {
    id: "wolff",
    name: "Toto Wolff",
    country: "Áustria",
    teamKey: "mercedes",
    teamName: "Mercedes"
  },
  {
    id: "horner",
    name: "Christian Horner",
    country: "Reino Unido",
    teamKey: "redbull",
    teamName: "Red Bull Racing"
  },
  {
    id: "vowles",
    name: "James Vowles",
    country: "Reino Unido",
    teamKey: "williams",
    teamName: "Williams Racing"
  },
  {
    id: "vasseur",
    name: "Frédéric Vasseur",
    country: "França",
    teamKey: "ferrari",
    teamName: "Ferrari"
  },
  {
    id: "brown",
    name: "Zak Brown",
    country: "Estados Unidos",
    teamKey: "mclaren",
    teamName: "McLaren"
  }
];

// Equipes 2025 – teamKey precisa bater com o resto do jogo
const TEAMS_2025 = [
  { key: "redbull",    name: "Red Bull Racing", principal: "Christian Horner" },
  { key: "ferrari",    name: "Ferrari",         principal: "Frédéric Vasseur" },
  { key: "mercedes",   name: "Mercedes",        principal: "Toto Wolff" },
  { key: "mclaren",    name: "McLaren",         principal: "Andrea Stella" },
  { key: "aston",      name: "Aston Martin",    principal: "Mike Krack" },
  { key: "alpine",     name: "Alpine",          principal: "Bruno Famin" },
  { key: "williams",   name: "Williams Racing", principal: "James Vowles" },
  { key: "racingbulls",name: "Racing Bulls",    principal: "Laurent Mekies" },
  { key: "sauber",     name: "Sauber / Audi",   principal: "Andreas Seidl" },
  { key: "haas",       name: "Haas",            principal: "Ayao Komatsu" }
];

// Lista simples de países para o manager criado
const COUNTRIES = [
  "Brasil",
  "Estados Unidos",
  "Reino Unido",
  "Itália",
  "Alemanha",
  "França",
  "Espanha",
  "Portugal",
  "Austrália",
  "Japão"
];

// Opcional: calendário interno (a página calendario.html já é fixa)
const CALENDAR_2025 = [
  { round: 1,  track: "bahrein",        gpName: "GP do Bahrein 2025" },
  { round: 2,  track: "arabia_saudita", gpName: "GP da Arábia Saudita 2025" },
  { round: 3,  track: "australia",      gpName: "GP da Austrália 2025" },
  { round: 4,  track: "japao",          gpName: "GP do Japão 2025" },
  { round: 5,  track: "china",          gpName: "GP da China 2025" },
  { round: 6,  track: "miami",          gpName: "GP de Miami 2025" },
  { round: 7,  track: "imola",          gpName: "GP da Emilia-Romagna 2025" },
  { round: 8,  track: "monaco",         gpName: "GP de Mônaco 2025" },
  { round: 9,  track: "canada",         gpName: "GP do Canadá 2025" },
  { round:10,  track: "espanha",        gpName: "GP da Espanha 2025" },
  { round:11,  track: "austria",        gpName: "GP da Áustria 2025" },
  { round:12,  track: "inglaterra",     gpName: "GP da Inglaterra 2025" },
  { round:13,  track: "hungria",        gpName: "GP da Hungria 2025" },
  { round:14,  track: "belgica",        gpName: "GP da Bélgica 2025" },
  { round:15,  track: "holanda",        gpName: "GP da Holanda 2025" },
  { round:16,  track: "italia_monza",   gpName: "GP da Itália (Monza) 2025" },
  { round:17,  track: "singapura",      gpName: "GP de Singapura 2025" },
  { round:18,  track: "estados_unidos", gpName: "GP dos Estados Unidos 2025" },
  { round:19,  track: "mexico",         gpName: "GP do México 2025" },
  { round:20,  track: "sao_paulo",      gpName: "GP de São Paulo 2025" },
  { round:21,  track: "las_vegas",      gpName: "GP de Las Vegas 2025" },
  { round:22,  track: "catar",          gpName: "GP do Catar 2025" },
  { round:23,  track: "abu_dhabi",      gpName: "GP de Abu Dhabi 2025" }
];

// ------------------------
// Utilitários básicos
// ------------------------
function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Troca de telas (sections com class "screen")
function showScreen(screenId) {
  const screens = $all(".screen");
  screens.forEach((s) => s.classList.remove("active"));

  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");
}

// Atualiza HUD superior (caixa / etapa)
function updateHud() {
  const moneySpan = $("#hud-money-value");
  const stageSpan = $("#hud-stage-value");

  if (!currentGame) return;

  if (moneySpan) {
    moneySpan.textContent =
      "R$ " + currentGame.money.toLocaleString("pt-BR");
  }
  if (stageSpan) {
    stageSpan.textContent = String(currentGame.stage);
  }
}

// Atualiza infos do lobby (manager + equipe)
function updateLobby() {
  const nameSpan = $("#lobby-manager-name");
  const teamSpan = $("#lobby-team-name");

  if (!currentGame) {
    if (nameSpan) nameSpan.textContent = "---";
    if (teamSpan) teamSpan.textContent = "Sem equipe";
    return;
  }

  if (nameSpan) nameSpan.textContent = currentGame.managerName || "---";

  const teamName =
    currentGame.teamName ||
    (currentGame.teamKey
      ? (TEAMS_2025.find((t) => t.key === currentGame.teamKey) || {}).name
      : null) ||
    "Sem equipe";

  if (teamSpan) teamSpan.textContent = teamName;

  // Atualiza localStorage com a equipe escolhida
  if (currentGame.teamKey) {
    try {
      localStorage.setItem(USER_TEAM_KEY, currentGame.teamKey);
    } catch (e) {
      console.warn("Não foi possível salvar USER_TEAM_KEY:", e);
    }
  }

  // Se existir a função definida no index.html, chama também
  if (typeof salvarEquipeDoManager === "function") {
    try {
      salvarEquipeDoManager();
    } catch (e) {
      console.warn("Erro ao chamar salvarEquipeDoManager:", e);
    }
  }
}

// Aplica estado do jogo na UI
function applyGameStateToUI() {
  updateHud();
  updateLobby();
}

// ------------------------
// Sistema de SAVE / LOAD
// ------------------------
function saveGame() {
  if (!currentGame) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(currentGame));
    alert("Carreira salva com sucesso!");
  } catch (e) {
    console.error("Erro ao salvar carreira:", e);
    alert("Não foi possível salvar a carreira.");
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj || null;
  } catch (e) {
    console.error("Erro ao carregar save:", e);
    return null;
  }
}

// ------------------------
// Fluxo: Novo jogo
// ------------------------
function startNewGame() {
  currentGame = {
    money: DEFAULT_MONEY,
    stage: DEFAULT_STAGE,
    managerType: null, // "real" ou "custom"
    managerId: null,
    managerName: "",
    managerCountry: "",
    teamKey: null,
    teamName: null
  };
}

// Quando escolher um manager REAL
function selectRealManager(manager) {
  if (!currentGame) startNewGame();
  currentGame.managerType = "real";
  currentGame.managerId = manager.id;
  currentGame.managerName = manager.name;
  currentGame.managerCountry = manager.country;
  // equipe ainda pode ser escolhida manualmente na tela de equipes
  showScreen("screen-team-select");
  populateTeams();
}

// Quando criar um manager CUSTOM
function createCustomManager(name, country) {
  if (!currentGame) startNewGame();
  currentGame.managerType = "custom";
  currentGame.managerId = "custom";
  currentGame.managerName = name;
  currentGame.managerCountry = country;
  showScreen("screen-team-select");
  populateTeams();
}

// Quando escolher a equipe
function selectTeam(teamKey) {
  if (!currentGame) startNewGame();

  const team = TEAMS_2025.find((t) => t.key === teamKey);
  currentGame.teamKey = teamKey;
  currentGame.teamName = team ? team.name : "";

  // Atualiza HUD e lobby
  applyGameStateToUI();

  // Também garante que a equipe do usuário esteja no localStorage
  try {
    localStorage.setItem(USER_TEAM_KEY, teamKey);
  } catch (e) {
    console.warn("Não foi possível salvar USER_TEAM_KEY:", e);
  }

  // Vai para o lobby principal
  showScreen("screen-lobby");
}

// ------------------------
// POPULAÇÃO DE LISTAS (HTML)
// ------------------------
function populateRealManagerList() {
  const container = $("#real-manager-list");
  if (!container) return;
  container.innerHTML = "";

  REAL_MANAGERS.forEach((mgr) => {
    const btn = document.createElement("button");
    btn.className = "btn list-item";
    btn.textContent = `${mgr.name} – ${mgr.teamName}`;
    btn.addEventListener("click", () => selectRealManager(mgr));
    container.appendChild(btn);
  });
}

function populateCountries() {
  const select = $("#select-manager-country");
  if (!select) return;
  select.innerHTML = "";

  COUNTRIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function populateTeams() {
  const container = $("#team-list");
  if (!container) return;
  container.innerHTML = "";

  TEAMS_2025.forEach((team) => {
    const btn = document.createElement("button");
    btn.className = "btn list-item";
    btn.innerHTML = `
      <strong>${team.name}</strong><br/>
      Chefe de equipe: ${team.principal}
    `;
    btn.addEventListener("click", () => selectTeam(team.key));
    container.appendChild(btn);
  });
}

// Calendário interno (se for usar a tela screen-calendar)
function populateCalendar() {
  const container = $("#calendar-list");
  if (!container) return;
  container.innerHTML = "";

  CALENDAR_2025.forEach((gp) => {
    const div = document.createElement("div");
    div.className = "calendar-item";
    div.textContent = `${gp.round}. ${gp.gpName}`;
    container.appendChild(div);
  });
}

// ------------------------
// Navegação / Eventos
// ------------------------
function setupEvents() {
  // Capa: clicar em qualquer lugar → menu principal
  const screenCover = $("#screen-cover");
  if (screenCover) {
    screenCover.addEventListener("click", () => {
      showScreen("screen-main-menu");
    });
  }

  // Botões do menu principal
  const btnNewGame = $("#btn-new-game");
  const btnContinue = $("#btn-continue-game");

  if (btnNewGame) {
    btnNewGame.addEventListener("click", () => {
      startNewGame();
      showScreen("screen-manager-type");
    });
  }

  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      const loaded = loadGame();
      if (!loaded) {
        alert("Nenhuma carreira salva encontrada.");
        return;
      }
      currentGame = loaded;
      applyGameStateToUI();
      showScreen("screen-lobby");
    });
  }

  // Tela: tipo de manager
  const btnUseRealManager = $("#btn-use-real-manager");
  const btnCreateManager = $("#btn-create-manager");
  const btnBackToMenu = $("#btn-back-to-menu");

  if (btnUseRealManager) {
    btnUseRealManager.addEventListener("click", () => {
      populateRealManagerList();
      showScreen("screen-manager-real");
    });
  }

  if (btnCreateManager) {
    btnCreateManager.addEventListener("click", () => {
      populateCountries();
      showScreen("screen-manager-create");
    });
  }

  if (btnBackToMenu) {
    btnBackToMenu.addEventListener("click", () => {
      showScreen("screen-main-menu");
    });
  }

  // Tela: managers reais – voltar
  const btnBackManagerTypeFromReal = $("#btn-back-manager-type-from-real");
  if (btnBackManagerTypeFromReal) {
    btnBackManagerTypeFromReal.addEventListener("click", () => {
      showScreen("screen-manager-type");
    });
  }

  // Tela: criar manager – formulário
  const formCreateManager = $("#create-manager-form");
  const btnBackManagerTypeFromCreate = $(
    "#btn-back-manager-type-from-create"
  );

  if (formCreateManager) {
    formCreateManager.addEventListener("submit", (evt) => {
      evt.preventDefault();
      const nameInput = $("#input-manager-name");
      const countrySelect = $("#select-manager-country");
      const name = nameInput ? nameInput.value.trim() : "";
      const country = countrySelect ? countrySelect.value : "";

      if (!name) {
        alert("Digite o nome do manager.");
        return;
      }
      createCustomManager(name, country);
    });
  }

  if (btnBackManagerTypeFromCreate) {
    btnBackManagerTypeFromCreate.addEventListener("click", () => {
      showScreen("screen-manager-type");
    });
  }

  // Tela: seleção de equipe – voltar
  const btnBackFromTeamSelect = $("#btn-back-from-team-select");
  if (btnBackFromTeamSelect) {
    btnBackFromTeamSelect.addEventListener("click", () => {
      showScreen("screen-manager-type");
    });
  }

  // Lobby – botões principais
  const btnOpenRace = $("#btn-open-race");
  const btnOpenFinance = $("#btn-open-finance");
  const btnOpenStaff = $("#btn-open-staff");
  const btnOpenSponsors = $("#btn-open-sponsors");
  const btnOpenContracts = $("#btn-open-contracts");
  const btnSaveGame = $("#btn-save-game");
  const btnExitToMenu = $("#btn-exit-to-menu");

  if (btnOpenRace) {
    btnOpenRace.addEventListener("click", () => {
      showScreen("screen-race");
    });
  }
  if (btnOpenFinance) {
    btnOpenFinance.addEventListener("click", () => {
      showScreen("screen-finance");
    });
  }
  if (btnOpenStaff) {
    btnOpenStaff.addEventListener("click", () => {
      showScreen("screen-staff");
    });
  }
  if (btnOpenSponsors) {
    btnOpenSponsors.addEventListener("click", () => {
      showScreen("screen-sponsors");
    });
  }
  if (btnOpenContracts) {
    btnOpenContracts.addEventListener("click", () => {
      showScreen("screen-contracts");
    });
  }

  if (btnSaveGame) {
    btnSaveGame.addEventListener("click", () => {
      saveGame();
    });
  }

  if (btnExitToMenu) {
    btnExitToMenu.addEventListener("click", () => {
      showScreen("screen-main-menu");
    });
  }

  // Botões "VOLTA AO LOBBY" genéricos
  const backLobbyButtons = $all(".btn-back-lobby");
  backLobbyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      showScreen("screen-lobby");
    });
  });

  // Botão "INICIAR CORRIDA" (apenas placeholder por enquanto)
  const btnStartRace = $("#btn-start-race");
  if (btnStartRace) {
    btnStartRace.addEventListener("click", () => {
      alert("O sistema de corrida detalhado está em outra página (race.html).");
    });
  }

  // Preenche calendário interno (se precisar usar a tela screen-calendar)
  populateCalendar();
}

// ------------------------
// Inicialização principal
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupEvents();

  // Tenta carregar save automático para habilitar o botão "CONTINUAR"
  const loaded = loadGame();
  if (loaded) {
    currentGame = loaded;
    applyGameStateToUI();
  }

  // Começa na tela de capa
  showScreen("screen-cover");
});
