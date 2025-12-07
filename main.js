// =======================================
// F1 MANAGER 2025 - MAIN GAME CONTROLLER
// =======================================

console.log("main.js carregado com sucesso");

// ------------------------
// ESTADO GLOBAL DO JOGO
// ------------------------

const SAVE_KEY = "f1manager2025_save";

// tenta usar dados do data.js, caso exista
const DEFAULT_CALENDAR =
  window.F1_CALENDAR_2025 ||
  window.CALENDAR_2025 ||
  window.CALENDARIO_2025 ||
  [];

const DEFAULT_DRIVERS =
  window.F1_DRIVERS_2025 ||
  window.DRIVERS_2025 ||
  window.PILOTOS_2025 ||
  [];

const GAME_STATE = {
  manager: null,
  caixa: 5000000,
  etapaAtual: 0,
  calendario: DEFAULT_CALENDAR,
  pilotos: DEFAULT_DRIVERS,
  historicoResultados: [],
  equipes: window.F1_TEAMS_2025 || window.EQUIPES_2025 || []
};

window.GAME_STATE = GAME_STATE; // expõe para outros arquivos

// ------------------------
// FUNÇÕES DE DINHEIRO
// ------------------------

function formatMoney(value) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2
    }).format(value);
  } catch (e) {
    return "R$ " + value.toFixed(2);
  }
}

function addMoney(amount) {
  GAME_STATE.caixa += amount;
  refreshHUD();
}

function spendMoney(amount) {
  if (GAME_STATE.caixa >= amount) {
    GAME_STATE.caixa -= amount;
    refreshHUD();
    return true;
  }
  return false;
}

window.addMoney = addMoney;
window.spendMoney = spendMoney;

// ------------------------
// HUD (TOPO DA TELA)
// ------------------------

function refreshHUD() {
  const cashEl = document.getElementById("hud-cash");
  const stageEl = document.getElementById("hud-stage");

  if (cashEl) cashEl.textContent = formatMoney(GAME_STATE.caixa);
  if (stageEl) stageEl.textContent = GAME_STATE.etapaAtual + 1;
}

// ------------------------
// NAVEGAÇÃO ENTRE TELAS
// ------------------------

function showScreen(id) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((s) => s.classList.remove("active"));

  const target = document.getElementById(id);
  if (target) target.classList.add("active");
}

// ------------------------
// SAVE / LOAD
// ------------------------

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(GAME_STATE));
    alert("Jogo salvo com sucesso!");
  } catch (e) {
    console.error("Erro ao salvar jogo:", e);
    alert("Erro ao salvar o jogo.");
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    // mescla no GAME_STATE para manter referências
    Object.assign(GAME_STATE, data);

    return true;
  } catch (e) {
    console.error("Erro ao carregar jogo:", e);
    return false;
  }
}

// ------------------------
// FLUXO MENU INICIAL
// ------------------------

function handleNewGame() {
  GAME_STATE.manager = null;
  GAME_STATE.caixa = 5000000;
  GAME_STATE.etapaAtual = 0;
  GAME_STATE.historicoResultados = [];

  refreshHUD();
  showScreen("screen-manager-select");
}

function handleContinueGame() {
  if (loadGame()) {
    updateManagerHeader();
    refreshHUD();
    showScreen("screen-manager-hub");
  } else {
    alert("Nenhum save encontrado. Criando novo jogo.");
    handleNewGame();
  }
}

// ------------------------
// GERÊNCIA DO MANAGER
// ------------------------

function createManager(name, tipo = "Personalizado") {
  GAME_STATE.manager = {
    nome: name || "Manager",
    tipo,
    experiencia: 1,
    reputacao: 50,
    equipeId: null
  };

  updateManagerHeader();
  refreshHUD();
  showScreen("screen-manager-hub");
}

function updateManagerHeader() {
  const nameEl = document.getElementById("manager-name");
  const teamEl = document.getElementById("manager-team");

  if (nameEl) {
    nameEl.textContent =
      GAME_STATE.manager?.nome ? GAME_STATE.manager.nome : "Sem nome";
  }

  let teamText = "Sem equipe";
  if (GAME_STATE.manager && GAME_STATE.manager.equipeId != null) {
    const team = GAME_STATE.equipes.find(
      (t) => t.id === GAME_STATE.manager.equipeId
    );
    if (team) teamText = team.nome;
  }

  if (teamEl) {
    teamEl.textContent = "Equipe: " + teamText;
  }
}

// ------------------------
// TELA DE CORRIDA
// ------------------------

let raceInProgress = false;

function bindRaceUI() {
  const startBtn = document.getElementById("btn-start-race");
  const backBtn = document.getElementById("btn-race-back");
  const speed1 = document.getElementById("btn-race-speed-1");
  const speed2 = document.getElementById("btn-race-speed-2");
  const speed4 = document.getElementById("btn-race-speed-4");

  if (startBtn) {
    startBtn.onclick = () => {
      if (raceInProgress) return;
      if (!GAME_STATE.calendario || GAME_STATE.calendario.length === 0) {
        alert("Calendário vazio. Verifique o data.js.");
        return;
      }

      const etapa = GAME_STATE.etapaAtual;
      if (etapa >= GAME_STATE.calendario.length) {
        alert("Temporada encerrada!");
        return;
      }

      raceInProgress = true;
      clearRaceUI();
      showScreen("screen-race");

      // inicia corrida
      startRace(etapa, handleRaceFinished);
    };
  }

  if (backBtn) {
    backBtn.onclick = () => {
      if (raceInProgress) {
        alert("Aguarde a corrida terminar.");
        return;
      }
      showScreen("screen-manager-hub");
    };
  }

  if (speed1) speed1.onclick = () => setRaceSpeed(1);
  if (speed2) speed2.onclick = () => setRaceSpeed(2);
  if (speed4) speed4.onclick = () => setRaceSpeed(4);

  // callback global chamada pelo raceSystem.js a cada volta
  window.onRaceUpdate = updateRaceUI;
}

function clearRaceUI() {
  const statusEl = document.getElementById("race-status");
  const tbody = document.querySelector("#race-table tbody");
  const resultEl = document.getElementById("race-result");

  if (statusEl) statusEl.textContent = "Corrida iniciando...";
  if (tbody) tbody.innerHTML = "";
  if (resultEl) resultEl.innerHTML = "";
}

function updateRaceUI(data) {
  const { volta, total, grid } = data;

  const statusEl = document.getElementById("race-status");
  const tbody = document.querySelector("#race-table tbody");

  if (statusEl) {
    statusEl.textContent = `Volta ${volta}/${total}`;
  }

  if (tbody) {
    tbody.innerHTML = "";
    grid.forEach((p) => {
      const tr = document.createElement("tr");
      const pos = document.createElement("td");
      const name = document.createElement("td");
      const time = document.createElement("td");
      const tyre = document.createElement("td");
      const wear = document.createElement("td");

      pos.textContent = p.pos;
      name.textContent = p.nome || p.name || "Piloto";
      time.textContent = p.tempoTotal.toFixed(3) + "s";
      tyre.textContent = p.pneus || "-";
      wear.textContent = p.desgaste.toFixed(1) + "%";

      tr.appendChild(pos);
      tr.appendChild(name);
      tr.appendChild(time);
      tr.appendChild(tyre);
      tr.appendChild(wear);

      tbody.appendChild(tr);
    });
  }
}

function handleRaceFinished(resultado) {
  raceInProgress = false;

  // salva no histórico
  GAME_STATE.historicoResultados.push(resultado);

  // premiação simples para o manager se ele tiver equipe
  if (GAME_STATE.manager && GAME_STATE.manager.equipeId != null) {
    const podium = resultado.classificacao;

    // encontra pilotos da equipe do manager e soma bônus
    let bonus = 0;
    podium.forEach((p, index) => {
      if (p.equipeId === GAME_STATE.manager.equipeId) {
        const pos = index + 1;
        switch (pos) {
          case 1:
            bonus += 500000;
            break;
          case 2:
            bonus += 300000;
            break;
          case 3:
            bonus += 200000;
            break;
          default:
            bonus += 50000;
        }
      }
    });

    if (bonus > 0) {
      addMoney(bonus);
    }
  }

  // avança etapa
  GAME_STATE.etapaAtual++;
  refreshHUD();

  // mostra resultado
  const resultEl = document.getElementById("race-result");
  if (resultEl) {
    const pistaNome = resultado.pista || "Pista";
    const p1 = resultado.podium?.[0] || "-";
    const p2 = resultado.podium?.[1] || "-";
    const p3 = resultado.podium?.[2] || "-";

    resultEl.innerHTML = `
      <h3>Resultado - ${pistaNome}</h3>
      <p><strong>Pódio:</strong></p>
      <ol>
        <li>${p1}</li>
        <li>${p2}</li>
        <li>${p3}</li>
      </ol>
    `;
  }
}

// ------------------------
// TELA DE CALENDÁRIO
// ------------------------

function renderCalendar() {
  const listEl = document.getElementById("calendar-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!GAME_STATE.calendario || GAME_STATE.calendario.length === 0) {
    listEl.innerHTML = "<p>Calendário não configurado.</p>";
    return;
  }

  GAME_STATE.calendario.forEach((pista, index) => {
    const item = document.createElement("div");
    item.className = "calendar-item";

    const status =
      index < GAME_STATE.etapaAtual
        ? "Concluída"
        : index === GAME_STATE.etapaAtual
        ? "Próxima"
        : "Futura";

    item.innerHTML = `
      <span>${index + 1}. ${pista.nome || "Pista"}</span>
      <span>${pista.pais || ""}</span>
      <span class="calendar-status">${status}</span>
    `;

    listEl.appendChild(item);
  });
}

// ------------------------
// INICIALIZAÇÃO BÁSICA
// ------------------------

function initEvents() {
  // menu
  const btnNew = document.getElementById("btn-new-game");
  const btnCont = document.getElementById("btn-continue");

  if (btnNew) btnNew.onclick = handleNewGame;
  if (btnCont) btnCont.onclick = handleContinueGame;

  // seleção de manager
  const btnCreateManager = document.getElementById("btn-manager-create");
  if (btnCreateManager) {
    btnCreateManager.onclick = () => {
      const name = prompt("Nome do novo manager:", "Manager");
      createManager(name, "Custom");
    };
  }

  const presetButtons = document.querySelectorAll(".btn-manager-preset");
  presetButtons.forEach((btn) => {
    btn.onclick = () => {
      const name = btn.dataset.name || btn.textContent.trim();
      createManager(name, "Real");
    };
  });

  // hub manager
  const btnCalendar = document.getElementById("btn-open-calendar");
  const btnRace = document.getElementById("btn-open-race");
  const btnFinance = document.getElementById("btn-open-finance");
  const btnStaff = document.getElementById("btn-open-staff");
  const btnSponsors = document.getElementById("btn-open-sponsors");
  const btnContracts = document.getElementById("btn-open-contracts");
  const btnSave = document.getElementById("btn-save-game");
  const btnBackMenu = document.getElementById("btn-back-menu");

  if (btnCalendar) {
    btnCalendar.onclick = () => {
      renderCalendar();
      showScreen("screen-calendar");
    };
  }

  if (btnRace) {
    btnRace.onclick = () => {
      showScreen("screen-race");
    };
  }

  if (btnFinance) {
    btnFinance.onclick = () => {
      showScreen("screen-finance");
      if (window.renderFinanceScreen) {
        window.renderFinanceScreen();
      }
    };
  }

  if (btnStaff) {
    btnStaff.onclick = () => {
      showScreen("screen-staff");
      if (window.renderStaffScreen) {
        window.renderStaffScreen();
      }
    };
  }

  if (btnSponsors) {
    btnSponsors.onclick = () => {
      showScreen("screen-sponsors");
      if (window.renderSponsorsScreen) {
        window.renderSponsorsScreen();
      }
    };
  }

  if (btnContracts) {
    btnContracts.onclick = () => {
      showScreen("screen-contracts");
      if (window.renderContractsScreen) {
        window.renderContractsScreen();
      }
    };
  }

  if (btnSave) btnSave.onclick = saveGame;
  if (btnBackMenu) {
    btnBackMenu.onclick = () => {
      showScreen("screen-menu");
    };
  }

  // tela calendário botão voltar
  const btnCalendarBack = document.getElementById("btn-calendar-back");
  if (btnCalendarBack) {
    btnCalendarBack.onclick = () => {
      showScreen("screen-manager-hub");
    };
  }
}

function initGame() {
  refreshHUD();
  initEvents();
  bindRaceUI();

  // ao abrir, sempre começa no menu
  showScreen("screen-menu");
}

document.addEventListener("DOMContentLoaded", initGame);
