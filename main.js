// ============================================================
// F1 MANAGER 2025 – LÓGICA PRINCIPAL (main.js)
// Jonatan Vale – Vale Games / Vale Produção
// ============================================================

// ----------------------- DADOS BÁSICOS ----------------------

function createDefaultState() {
  return {
    money: 5000000,
    stage: 1,
    season: 2025,
    currentRaceIndex: 0,
    manager: null, // { type: 'real'|'custom', id, name, country }
    team: null,    // { id, name, country }
  };
}

let gameState = createDefaultState();

// Managers reais da F1 (temporada recente / 2025 aproximado)
const REAL_MANAGERS = [
  { id: 'toto_wolff', name: 'Toto Wolff', teamId: 'mercedes' },
  { id: 'frederic_vasseur', name: 'Frédéric Vasseur', teamId: 'ferrari' },
  { id: 'christian_horner', name: 'Christian Horner', teamId: 'redbull' },
  { id: 'andrea_stella', name: 'Andrea Stella', teamId: 'mclaren' },
  { id: 'mike_krack', name: 'Mike Krack', teamId: 'astonmartin' },
  { id: 'bruno_famin', name: 'Bruno Famin', teamId: 'alpine' },
  { id: 'peter_bayer', name: 'Peter Bayer', teamId: 'rb' },
  { id: 'james_vowles', name: 'James Vowles', teamId: 'williams' },
  { id: 'alessandro_alunni', name: 'Alessandro Alunni Bravi', teamId: 'sauber' },
  { id: 'ayao_komatsu', name: 'Ayao Komatsu', teamId: 'haas' },
];

// Escuderias / equipes (usaremos também para o calendário)
const TEAMS = [
  { id: 'mercedes', name: 'Mercedes-AMG Petronas', country: 'Alemanha' },
  { id: 'ferrari', name: 'Scuderia Ferrari', country: 'Itália' },
  { id: 'redbull', name: 'Oracle Red Bull Racing', country: 'Áustria' },
  { id: 'mclaren', name: 'McLaren', country: 'Reino Unido' },
  { id: 'astonmartin', name: 'Aston Martin', country: 'Reino Unido' },
  { id: 'alpine', name: 'BWT Alpine', country: 'França' },
  { id: 'williams', name: 'Williams Racing', country: 'Reino Unido' },
  { id: 'rb', name: 'Visa Cash App RB', country: 'Itália' },
  { id: 'sauber', name: 'Stake F1 Team Sauber', country: 'Suíça' },
  { id: 'haas', name: 'MoneyGram Haas F1 Team', country: 'Estados Unidos' },
];

// Países principais (para o manager criado)
const COUNTRIES = [
  'Alemanha', 'Argentina', 'Austrália', 'Áustria', 'Brasil', 'Canadá',
  'Chile', 'China', 'Colômbia', 'Coreia do Sul', 'Dinamarca', 'Espanha',
  'Estados Unidos', 'Finlândia', 'França', 'Holanda', 'Hungria', 'Índia',
  'Inglaterra', 'Irlanda', 'Itália', 'Japão', 'México', 'Noruega',
  'Nova Zelândia', 'Portugal', 'Reino Unido', 'Rússia', 'Singapura',
  'Suécia', 'Suíça', 'Tailândia', 'Turquia', 'Uruguai', 'Venezuela',
];

// Calendário base – nomes podem ser ajustados depois
const CALENDAR = [
  { round: 1,  name: 'Bahrein',       country: 'Bahrein' },
  { round: 2,  name: 'Arábia Saudita', country: 'Arábia Saudita' },
  { round: 3,  name: 'Austrália',     country: 'Austrália' },
  { round: 4,  name: 'Japão',         country: 'Japão' },
  { round: 5,  name: 'China',         country: 'China' },
  { round: 6,  name: 'Miami',         country: 'Estados Unidos' },
  { round: 7,  name: 'Imola',         country: 'Itália' },
  { round: 8,  name: 'Mônaco',        country: 'Mônaco' },
  { round: 9,  name: 'Canadá',        country: 'Canadá' },
  { round: 10, name: 'Espanha',       country: 'Espanha' },
  { round: 11, name: 'Áustria',       country: 'Áustria' },
  { round: 12, name: 'Inglaterra',    country: 'Reino Unido' },
  { round: 13, name: 'Hungria',       country: 'Hungria' },
  { round: 14, name: 'Bélgica',       country: 'Bélgica' },
  { round: 15, name: 'Holanda',       country: 'Holanda' },
  { round: 16, name: 'Itália (Monza)',country: 'Itália' },
  { round: 17, name: 'Singapura',     country: 'Singapura' },
  { round: 18, name: 'Estados Unidos',country: 'Estados Unidos' },
  { round: 19, name: 'México',        country: 'México' },
  { round: 20, name: 'São Paulo',     country: 'Brasil' },
  { round: 21, name: 'Las Vegas',     country: 'Estados Unidos' },
  { round: 22, name: 'Catar',         country: 'Catar' },
  { round: 23, name: 'Abu Dhabi',     country: 'Emirados Árabes Unidos' },
];

// ----------------------- UTILIDADES UI ----------------------

function $(id) {
  return document.getElementById(id);
}

function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach((s) => s.classList.remove('active'));

  const target = $(screenId);
  if (target) {
    target.classList.add('active');
  }
}

function updateHUD() {
  const moneyEl = $('hud-money-value');
  const stageEl = $('hud-stage-value');

  if (moneyEl) {
    moneyEl.textContent = formatMoney(gameState.money);
  }
  if (stageEl) {
    stageEl.textContent = String(gameState.stage);
  }
}

function formatMoney(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function updateLobbyFromState() {
  const managerNameEl = $('lobby-manager-name');
  const teamNameEl = $('lobby-team-name');

  if (managerNameEl) {
    managerNameEl.textContent = gameState.manager
      ? gameState.manager.name
      : '---';
  }

  if (teamNameEl) {
    teamNameEl.textContent = gameState.team
      ? gameState.team.name
      : 'Sem equipe';
  }
}

function updateCalendarUI() {
  const container = $('calendar-list');
  if (!container) return;

  container.innerHTML = '';

  CALENDAR.forEach((race, index) => {
    const btn = document.createElement('button');
    btn.className = 'btn list-item';

    let label = `${race.round}. ${race.name}`;
    if (index === gameState.currentRaceIndex) {
      label += ' – PRÓXIMA';
      btn.classList.add('list-item-next');
    }

    btn.textContent = label;

    btn.addEventListener('click', () => {
      gameState.currentRaceIndex = index;
      updateCalendarUI();
    });

    container.appendChild(btn);
  });
}

// ----------------------- SALVAR / CARREGAR ------------------

const STORAGE_KEY = 'f1_manager_2025_save';

function saveGame(showAlert = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    if (showAlert) {
      alert('Carreira salva com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao salvar jogo:', err);
    if (showAlert) {
      alert('Não foi possível salvar o jogo (ver console).');
    }
  }
}

function loadGameFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Mesclar com estado padrão para evitar campos faltando
    gameState = {
      ...createDefaultState(),
      ...parsed,
    };

    updateHUD();
    updateLobbyFromState();
    updateCalendarUI();

    showScreen('screen-lobby');
    return gameState;
  } catch (err) {
    console.error('Erro ao carregar jogo:', err);
    alert('Não foi possível carregar a carreira salva.');
    return null;
  }
}

function resetNewGame() {
  gameState = createDefaultState();
  updateHUD();
  updateLobbyFromState();
  updateCalendarUI();
}

// ----------------------- ORIENTAÇÃO / FULLSCREEN ------------

async function tryEnterFullscreenAndLandscape() {
  // Algumas APIs só funcionam em mobile + ação do usuário. Vamos tentar,
  // mas se não der certo, o jogo continua funcionando normalmente.
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch (e) {
    console.warn('Fullscreen não disponível:', e);
  }

  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) {
    console.warn('Lock de orientação não disponível:', e);
  }
}

// ----------------------- CONSTRUÇÃO DE LISTAS ----------------

function buildRealManagerList() {
  const container = $('real-manager-list');
  if (!container) return;

  container.innerHTML = '';

  REAL_MANAGERS.forEach((mng) => {
    const btn = document.createElement('button');
    btn.className = 'btn list-item';
    const team = TEAMS.find((t) => t.id === mng.teamId);

    btn.textContent = team
      ? `${mng.name} — ${team.name}`
      : mng.name;

    btn.addEventListener('click', () => {
      gameState.manager = {
        type: 'real',
        id: mng.id,
        name: mng.name,
        country: team ? team.country : 'Desconhecido',
      };

      // Sugestão automática: equipe padrão do manager real
      if (team) {
        gameState.team = team;
      }

      updateLobbyFromState();
      updateHUD();
      updateCalendarUI();

      alert(
        `Manager real selecionado:\n${mng.name}`
        + (team ? ` (${team.name})` : '')
        + '\n\nVocê será levado ao lobby principal.'
      );

      showScreen('screen-lobby');
      saveGame(false);
    });

    container.appendChild(btn);
  });
}

function buildCountrySelect() {
  const select = $('select-manager-country');
  if (!select) return;

  select.innerHTML = '';

  const optDefault = document.createElement('option');
  optDefault.value = '';
  optDefault.textContent = 'Selecione um país';
  select.appendChild(optDefault);

  COUNTRIES.forEach((country) => {
    const opt = document.createElement('option');
    opt.value = country;
    opt.textContent = country;
    select.appendChild(opt);
  });
}

function buildTeamList() {
  const container = $('team-list');
  if (!container) return;

  container.innerHTML = '';

  TEAMS.forEach((team) => {
    const btn = document.createElement('button');
    btn.className = 'btn list-item';
    btn.textContent = team.name;

    btn.addEventListener('click', () => {
      gameState.team = team;
      updateLobbyFromState();
      updateHUD();
      updateCalendarUI();

      alert(
        `Equipe selecionada:\n${team.name}\n\n` +
        'Você será levado ao lobby principal.'
      );

      showScreen('screen-lobby');
      saveGame(false);
    });

    container.appendChild(btn);
  });
}

// ----------------------- EVENTOS PRINCIPAIS ------------------

document.addEventListener('DOMContentLoaded', () => {
  // Construir listas fixas
  buildRealManagerList();
  buildCountrySelect();
  buildTeamList();
  updateCalendarUI();
  updateHUD();
  updateLobbyFromState();

  // 1) Tela de capa – clicar em qualquer lugar
  const screenCover = $('screen-cover');
  if (screenCover) {
    screenCover.addEventListener('click', async () => {
      await tryEnterFullscreenAndLandscape();
      showScreen('screen-main-menu');
    });
  }

  // 2) Menu principal
  const btnNewGame = $('btn-new-game');
  const btnContinue = $('btn-continue-game');

  if (btnNewGame) {
    btnNewGame.addEventListener('click', () => {
      resetNewGame();
      showScreen('screen-manager-type');
    });
  }

  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      const loaded = loadGameFromStorage();
      if (!loaded) {
        alert('Nenhuma carreira salva encontrada.');
      }
    });
  }

  // 3) Tipo de manager
  const btnUseRealManager = $('btn-use-real-manager');
  const btnCreateManager = $('btn-create-manager');
  const btnBackToMenu = $('btn-back-to-menu');

  if (btnUseRealManager) {
    btnUseRealManager.addEventListener('click', () => {
      showScreen('screen-manager-real');
    });
  }

  if (btnCreateManager) {
    btnCreateManager.addEventListener('click', () => {
      showScreen('screen-manager-create');
    });
  }

  if (btnBackToMenu) {
    btnBackToMenu.addEventListener('click', () => {
      showScreen('screen-main-menu');
    });
  }

  // 4) Criar manager (formulário)
  const createForm = $('create-manager-form');
  if (createForm) {
    createForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const nameInput = $('input-manager-name');
      const countrySelect = $('select-manager-country');

      const name = nameInput ? nameInput.value.trim() : '';
      const country = countrySelect ? countrySelect.value : '';

      if (!name) {
        alert('Digite o nome do manager.');
        return;
      }

      if (!country) {
        alert('Selecione um país.');
        return;
      }

      gameState.manager = {
        type: 'custom',
        id: `custom_${Date.now()}`,
        name,
        country,
      };

      // Próximo passo: escolher equipe
      alert(
        `Manager criado:\n${name} (${country})\n\n` +
        'Escolha agora a equipe / escuderia.'
      );

      showScreen('screen-team-select');
    });
  }

  // Voltar da tela de criar / real para tipo de manager
  const btnBackManagerTypeFromCreate = $('btn-back-manager-type-from-create');
  const btnBackManagerTypeFromReal = $('btn-back-manager-type-from-real');

  if (btnBackManagerTypeFromCreate) {
    btnBackManagerTypeFromCreate.addEventListener('click', () => {
      showScreen('screen-manager-type');
    });
  }

  if (btnBackManagerTypeFromReal) {
    btnBackManagerTypeFromReal.addEventListener('click', () => {
      showScreen('screen-manager-type');
    });
  }

  // Voltar da escolha de equipe
  const btnBackFromTeamSelect = $('btn-back-from-team-select');
  if (btnBackFromTeamSelect) {
    btnBackFromTeamSelect.addEventListener('click', () => {
      // Se não tiver manager ainda, volta para tipo de manager
      if (!gameState.manager) {
        showScreen('screen-manager-type');
      } else {
        // Se já escolheu manager, volta pra tela adequada
        if (gameState.manager.type === 'real') {
          showScreen('screen-manager-real');
        } else {
          showScreen('screen-manager-create');
        }
      }
    });
  }

  // 5) Lobby – abrir telas
  const btnOpenCalendar = $('btn-open-calendar');
  const btnOpenRace = $('btn-open-race');
  const btnOpenFinance = $('btn-open-finance');
  const btnOpenStaff = $('btn-open-staff');
  const btnOpenSponsors = $('btn-open-sponsors');
  const btnOpenContracts = $('btn-open-contracts');
  const btnSaveGame = $('btn-save-game');
  const btnExitToMenu = $('btn-exit-to-menu');

  if (btnOpenCalendar) {
    btnOpenCalendar.addEventListener('click', () => {
      updateCalendarUI();
      showScreen('screen-calendar');
    });
  }

  if (btnOpenRace) {
    btnOpenRace.addEventListener('click', () => {
      showScreen('screen-race');
    });
  }

  if (btnOpenFinance) {
    btnOpenFinance.addEventListener('click', () => {
      showScreen('screen-finance');
    });
  }

  if (btnOpenStaff) {
    btnOpenStaff.addEventListener('click', () => {
      showScreen('screen-staff');
    });
  }

  if (btnOpenSponsors) {
    btnOpenSponsors.addEventListener('click', () => {
      showScreen('screen-sponsors');
    });
  }

  if (btnOpenContracts) {
    btnOpenContracts.addEventListener('click', () => {
      showScreen('screen-contracts');
    });
  }

  if (btnSaveGame) {
    btnSaveGame.addEventListener('click', () => {
      saveGame(true);
    });
  }

  if (btnExitToMenu) {
    btnExitToMenu.addEventListener('click', () => {
      showScreen('screen-main-menu');
    });
  }

  // 6) Botões VOLTAR das telas internas para o lobby
  document.querySelectorAll('.btn-back-lobby').forEach((btn) => {
    btn.addEventListener('click', () => {
      showScreen('screen-lobby');
    });
  });

  // 7) Controles simples da corrida (placeholder)
  const btnStartRace = $('btn-start-race');
  if (btnStartRace) {
    btnStartRace.addEventListener('click', () => {
      alert(
        'Sistema de corrida detalhado (mapa, carros, pneus, ' +
        'telemetria, etc.) será implementado na próxima etapa.\n\n' +
        'Por enquanto, esta tela é apenas um placeholder.'
      );
    });
  }

  document.querySelectorAll('.race-speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = btn.getAttribute('data-speed');
      alert(`Velocidade de simulação ajustada para ${speed}x (placeholder).`);
    });
  });

  // 8) Começar sempre na capa
  showScreen('screen-cover');
});
