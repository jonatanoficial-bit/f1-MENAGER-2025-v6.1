// =======================================================
// CAREER SYSTEM
// =======================================================

let gameState = JSON.parse(localStorage.getItem("f1manager_save")) || {
    season: 2025,
    weekendIndex: 0,
    phase: "IDLE",
    teamSelected: null,
    finances: {
        balance: 20000000,
        income: 0,
        expense: 0,
        history: []
    },
    reputation: 0.5,
    results: [],
    standingsDrivers: {},
    standingsTeams: {}
};

// =======================================================
// SAVE & LOAD
// =======================================================

function salvarGame() {
    localStorage.setItem("f1manager_save", JSON.stringify(gameState));
}

function resetarGame() {
    localStorage.removeItem("f1manager_save");
    location.reload();
}

// =======================================================
// PRÓXIMO GP
// =======================================================

function irParaProximoGP() {
    gameState.weekendIndex++;

    if (gameState.weekendIndex >= GAME_DATA.tracks.length) {
        mostrarFinalTemporada();
    } else {
        gameState.phase = "PRACTICE";
        salvarGame();
        mostrarTela("tela-practice");
    }
}

// =======================================================
// FLUXO DO FIM DE SEMANA
// =======================================================

function iniciarFimDeSemana() {
    gameState.phase = "PRACTICE";
    salvarGame();
    mostrarTela("tela-practice");
}

// PRACTICE
function iniciarPractice() {
    gameState.phase = "PRACTICE";
    salvarGame();
    simularPractice();
    mostrarTela("tela-practice");
}

// QUALI
function iniciarQuali() {
    gameState.phase = "QUALI";
    simularQuali();
    salvarGame();
    mostrarTela("tela-quali");
}

// RACE
function iniciarCorridaGP() {
    gameState.phase = "RACE";
    salvarGame();

    let pista = GAME_DATA.tracks[gameState.weekendIndex].id;
    iniciarCorrida(pista);

    mostrarTela("tela-corrida");
}

// RESULTS
function finalizarCorridaGP(resultado) {
    gameState.phase = "RESULTS";

    registrarResultado(resultado);
    atualizarStandings();
    atualizarFinancas();
    atualizarReputacao();

    salvarGame();
    mostrarTela("tela-resultados");
}

// =======================================================
// SIMULAÇÕES SIMPLES (placeholder)
// =======================================================

function simularPractice() {
    // feedback de setup, confiança, tempos, etc.
}

function simularQuali() {
    // grid de largada gerado aqui
}

// =======================================================
// REGISTROS
// =======================================================

function registrarResultado(resultado) {
    gameState.results.push(resultado);
}

function atualizarStandings() {
    // pontos pilotos e construtores
}

function atualizarFinancas() {
    // bônus, prêmios, salários, custo staff, upgrades
}

function atualizarReputacao() {
    // metas, performance comparada ao esperado
}

// =======================================================
// TELAS DA CARREIRA
// =======================================================

function mostrarTela(nomeTela) {
    document.querySelectorAll(".tela").forEach(t => t.style.display = "none");
    document.getElementById(nomeTela).style.display = "block";
}

function mostrarFinalTemporada() {
    mostrarTela("tela-final");
}
