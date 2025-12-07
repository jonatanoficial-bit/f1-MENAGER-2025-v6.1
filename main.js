// ==========================================================
//  F1 MANAGER - MAIN MENU & BASIC STATE
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // ------------- ELEMENTOS DE TELA -------------
  const telas = document.querySelectorAll(".tela");
  const telaInicial = document.getElementById("tela-inicial");
  const telaGerente = document.getElementById("tela-gerente");
  const telaEquipes = document.getElementById("tela-equipes");
  const telaLobby = document.getElementById("tela-lobby");

  const listaEquipesEl = document.getElementById("lista-equipes");
  const lobbyEquipeNomeEl = document.getElementById("lobby-equipe-nome");

  // ------------- BOTÕES PRINCIPAIS -------------
  const btnNovoJogo = document.getElementById("btn-novo-jogo");
  const btnContinuar = document.getElementById("btn-continuar");

  const btnGerenteReal = document.getElementById("btn-gerente-real");
  const btnGerenteNovo = document.getElementById("btn-gerente-novo");

  const btnSalvar = document.getElementById("btn-salvar");
  const btnCorrer = document.getElementById("btn-correr");

  // ------------- ESTADO GLOBAL SIMPLES -------------
  const SAVE_KEY = "f1manager_save_slot_1";

  const gameState = {
    managerType: null,   // "real" | "custom"
    managerName: null,
    teamId: null,
    teamName: null,
    season: 2025,
    raceIndex: 0
    // depois vamos colocar mais (carro, pilotos, dinheiro, etc.)
  };

  // ------------- LISTA BÁSICA DE EQUIPES -------------
  // Você pode trocar nomes e arquivos de logo conforme seus assets
  const TEAMS = [
    {
      id: "mercedes",
      name: "Mercedes",
      logo: "assets/logos/mercedes.png"
    },
    {
      id: "redbull",
      name: "Red Bull Racing",
      logo: "assets/logos/redbull.png"
    },
    {
      id: "ferrari",
      name: "Ferrari",
      logo: "assets/logos/ferrari.png"
    },
    {
      id: "mclaren",
      name: "McLaren",
      logo: "assets/logos/mclaren.png"
    },
    {
      id: "astonmartin",
      name: "Aston Martin",
      logo: "assets/logos/astonmartin.png"
    },
    {
      id: "williams",
      name: "Williams",
      logo: "assets/logos/williams.png"
    }
    // depois podemos expandir para todas as equipes 2025
  ];

  // ==========================================================
  //  FUNÇÕES AUXILIARES
  // ==========================================================

  function mostrarTela(idTela) {
    telas.forEach(t => t.classList.remove("active"));
    const alvo = document.getElementById(idTela);
    if (alvo) {
      alvo.classList.add("active");
    }
  }

  function preencherListaEquipes() {
    listaEquipesEl.innerHTML = "";

    TEAMS.forEach(team => {
      const card = document.createElement("div");
      card.className = "equipe-card";

      const logo = document.createElement("img");
      logo.src = team.logo;
      logo.alt = team.name;

      const nome = document.createElement("div");
      nome.textContent = team.name;

      const btn = document.createElement("button");
      btn.textContent = "Escolher";
      btn.addEventListener("click", () => {
        selecionarEquipe(team);
      });

      card.appendChild(logo);
      card.appendChild(nome);
      card.appendChild(btn);

      listaEquipesEl.appendChild(card);
    });
  }

  function selecionarEquipe(team) {
    gameState.teamId = team.id;
    gameState.teamName = team.name;

    lobbyEquipeNomeEl.textContent = `Equipe: ${team.name}`;
    mostrarTela("tela-lobby");
  }

  // ==========================================================
  //  SISTEMA DE SAVE / LOAD
  // ==========================================================

  function salvarJogo() {
    try {
      const data = JSON.stringify(gameState);
      localStorage.setItem(SAVE_KEY, data);
      alert("Jogo salvo com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Erro ao salvar o jogo.");
    }
  }

  function carregarJogo() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) {
      return null;
    }

    try {
      const obj = JSON.parse(data);
      return obj;
    } catch (e) {
      console.error("Save corrompido:", e);
      return null;
    }
  }

  function aplicarSave(obj) {
    gameState.managerType = obj.managerType || null;
    gameState.managerName = obj.managerName || null;
    gameState.teamId = obj.teamId || null;
    gameState.teamName = obj.teamName || null;
    gameState.season = obj.season || 2025;
    gameState.raceIndex = obj.raceIndex || 0;

    if (gameState.teamName) {
      lobbyEquipeNomeEl.textContent = `Equipe: ${gameState.teamName}`;
    } else {
      lobbyEquipeNomeEl.textContent = "Equipe: (não definido)";
    }
  }

  // ==========================================================
  //  EVENTOS DE BOTÃO
  // ==========================================================

  // --- MENU INICIAL ---

  btnNovoJogo.addEventListener("click", () => {
    // zera estado
    gameState.managerType = null;
    gameState.managerName = null;
    gameState.teamId = null;
    gameState.teamName = null;
    gameState.season = 2025;
    gameState.raceIndex = 0;

    mostrarTela("tela-gerente");
  });

  btnContinuar.addEventListener("click", () => {
    const save = carregarJogo();
    if (!save) {
      alert("Nenhum jogo salvo encontrado.");
      return;
    }

    aplicarSave(save);

    if (gameState.teamName) {
      mostrarTela("tela-lobby");
    } else {
      // se save estiver sem equipe (muito improvável, mas por garantia)
      mostrarTela("tela-equipes");
      preencherListaEquipes();
    }
  });

  // --- MODO DE GERENTE ---

  btnGerenteReal.addEventListener("click", () => {
    gameState.managerType = "real";
    // futuramente podemos abrir uma tela com lista de chefes reais
    // por enquanto, definimos um nome placeholder
    gameState.managerName = "Team Principal Real";
    preencherListaEquipes();
    mostrarTela("tela-equipes");
  });

  btnGerenteNovo.addEventListener("click", () => {
    const nome = prompt("Digite o nome do seu gerente:");
    if (!nome) {
      return;
    }
    gameState.managerType = "custom";
    gameState.managerName = nome.trim();
    preencherListaEquipes();
    mostrarTela("tela-equipes");
  });

  // --- BOTÕES VOLTAR GENÉRICOS ---

  document.querySelectorAll(".btn-voltar").forEach(btn => {
    btn.addEventListener("click", () => {
      const backTo = btn.dataset.back;
      if (backTo) {
        mostrarTela(backTo);
      }
    });
  });

  // --- BOTÕES DO LOBBY ---

  btnSalvar.addEventListener("click", () => {
    salvarJogo();
  });

  btnCorrer.addEventListener("click", () => {
    // Aqui depois vamos chamar a tela de corrida
    // Por enquanto só um aviso para sabermos que está funcionando
    alert("Aqui entraremos na tela de corrida (próxima etapa).");
  });

  // Outros botões do lobby (placeholders por enquanto)
  document.getElementById("btn-oficina").addEventListener("click", () => {
    alert("Tela de Oficina / Setup será adicionada em etapa posterior.");
  });

  document.getElementById("btn-funcionarios").addEventListener("click", () => {
    alert("Tela de Funcionários / Contratações será adicionada em etapa posterior.");
  });

  document.getElementById("btn-classificacao").addEventListener("click", () => {
    alert("Classificação de Pilotos e Equipes será adicionada em etapa posterior.");
  });

  document.getElementById("btn-calendario").addEventListener("click", () => {
    alert("Calendário da Temporada será adicionado em etapa posterior.");
  });

  document.getElementById("btn-patrocinio").addEventListener("click", () => {
    alert("Tela de Patrocínio / Finanças será adicionada em etapa posterior.");
  });

  // ==========================================================
  //  INICIALIZAÇÃO
  // ==========================================================

  // Começa na tela inicial
  mostrarTela("tela-inicial");
});
