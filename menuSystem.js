/* ============================================================
   MENU SYSTEM — TELA INICIAL, LOBBY, NAVEGAÇÃO
   ============================================================ */

const MenuSystem = (() => {

  // ================================
  // MOSTRAR TELA ESPECÍFICA
  // ================================
  function mostrarTela(id) {
    // esconde todas
    document.querySelectorAll(".tela").forEach(t => {
      t.style.display = "none";
    });

    const tela = document.getElementById(id);
    if (!tela) {
      console.warn("Tela não encontrada:", id);
      return;
    }

    tela.style.display = "block";
  }

  // ================================
  // TELA INICIAL
  // ================================
  function mostrarMenuInicial() {
    mostrarTela("telaMenuInicial");

    // mostrar botão continuar se existir save
    const dados = localStorage.getItem("F1_MANAGER_2025_SAVE");
    document.getElementById("btnContinuar").style.display =
      dados ? "inline-block" : "none";
  }

  // ================================
  // NOVO JOGO
  // ================================
  function iniciarNovoJogo() {
    // redefinir objeto global
    window.JOGO = {
      etapaAtual: 1,
      dinheiro: 5_000_000,
      reputacao: 0.1,
      equipeSelecionada: null,
      managerNome: null,
      resultados: [],
      pilotosEquipe: [],
      funcionarios: [],
      upgrades: [],
      patrocinador: null
    };

    mostrarTela("telaEscolhaManager");
  }

  // ================================
  // CONTINUAR JOGO
  // ================================
  function continuarJogo() {
    const ok = SaveSystem.carregarJogo();
    if (!ok) return;
    mostrarLobby();
  }

  // ================================
  // ESCOLHA DE MANAGER
  // ================================
  function escolherManagerReal(managerId) {
    JOGO.managerNome = MANAGERS[managerId].nome;
    JOGO.equipeSelecionada = MANAGERS[managerId].equipe;
    mostrarLobby();
  }

  function criarManagerCustom() {
    const nome = prompt("Digite seu nome como Manager:");
    if (!nome) return;
    JOGO.managerNome = nome;
    mostrarTelaEscolherEquipe();
  }

  // ================================
  // LOBBY
  // ================================
  function mostrarLobby() {
    mostrarTela("telaLobby");

    document.getElementById("lobbyNomeManager").innerHTML =
      JOGO.managerNome || "Manager";

    document.getElementById("lobbyEquipe").innerHTML =
      JOGO.equipeSelecionada || "Sem equipe";

    // atualizar saldo
    if (typeof FinanceSystem !== "undefined") {
      FinanceSystem.atualizarHUD();
    }
  }

  // ================================
  // ESCOLHA DE EQUIPE
  // ================================
  function mostrarTelaEscolherEquipe() {
    mostrarTela("telaEscolherEquipe");

    let container = document.getElementById("listaEquipes");
    container.innerHTML = "";

    TEAMS.forEach(t => {
      container.innerHTML += `
        <div class="card" onclick="MenuSystem.selecionarEquipe('${t.id}')">
          <img src="${t.logo}" class="logoMini">
          <h3>${t.nome}</h3>
        </div>
      `;
    });
  }

  function selecionarEquipe(teamId) {
    const equipe = TEAMS.find(t => t.id === teamId);
    if (!equipe) return;

    JOGO.equipeSelecionada = equipe.nome;
    mostrarLobby();
  }

  // ================================
  // SAÍDA
  // ================================
  function sairParaMenu() {
    mostrarMenuInicial();
  }

  // ================================
  // API EXPORT
  // ================================
  return {
    mostrarTela,
    mostrarMenuInicial,
    iniciarNovoJogo,
    continuarJogo,
    escolherManagerReal,
    criarManagerCustom,
    mostrarLobby,
    mostrarTelaEscolherEquipe,
    selecionarEquipe,
    sairParaMenu
  };

})();

// ================================
// AUTO ON LOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
  MenuSystem.mostrarMenuInicial();
});
