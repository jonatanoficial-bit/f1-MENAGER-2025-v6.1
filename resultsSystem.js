// =======================================================
// RESULTS SYSTEM – FIM DE SEMANA DE GP
// =======================================================
//
// Fluxo:
// - chamada em finalizarCorridaGP(resultado)
// - mostra tabela completa
// - calcula pontos
// - atualiza standings
// - mostra pódio
// =======================================================

// Sistema de pontos FIA 2025
const FIA_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];


// =======================================================
// ENTRADA PRINCIPAL
// =======================================================

function mostrarResultadosCorrida(resultado) {

    gameState.phase = "RESULTS";

    // salvar no histórico
    gameState.results.push(resultado);

    atualizarPontuacoes(resultado);
    atualizarFinancasPosCorrida(resultado);
    atualizarReputacaoPosCorrida(resultado);

    salvarGame();

    mostrarTelaResultados(resultado);
    mostrarPodio(resultado);
}


// =======================================================
// ATUALIZAR PONTOS PILOTOS E EQUIPES
// =======================================================

function atualizarPontuacoes(resultado) {

    // PILOTOS
    resultado.forEach((r, i) => {

        // se posição <= 10 recebe pontos
        if (i < FIA_POINTS.length) {
            let pts = FIA_POINTS[i];

            // piloto
            if (!gameState.standingsDrivers[r.driverId]) {
                gameState.standingsDrivers[r.driverId] = 0;
            }
            gameState.standingsDrivers[r.driverId] += pts;

            // construtor
            if (!gameState.standingsTeams[r.team]) {
                gameState.standingsTeams[r.team] = 0;
            }
            gameState.standingsTeams[r.team] += pts;
        }
    });
}


// =======================================================
// FINANÇAS
// =======================================================

function atualizarFinancasPosCorrida(resultado) {

    // prêmio simples por posição
    resultado.forEach((r, i) => {

        let prize = (FIA_POINTS[i] || 0) * 100000;

        // apenas a equipe do jogador recebe bônus
        if (r.team === gameState.teamSelected) {
            gameState.finances.balance += prize;

            gameState.finances.history.push({
                tipo: "prize",
                valor: prize,
                pista: GAME_DATA.tracks[gameState.weekendIndex].name
            });
        }
    });
}


// =======================================================
// REPUTAÇÃO
// =======================================================

function atualizarReputacaoPosCorrida(resultado) {
    // piloto principal
    let principal = resultado.find(r => r.team === gameState.teamSelected);

    if (!principal) return;

    let expected = GOALS[gameState.teamSelected] || 10; // meta média

    if (principal.pos <= expected) {
        // bom resultado
        gameState.reputation += 0.05;
    } else {
        // ruim
        gameState.reputation -= 0.03;
    }

    if (gameState.reputation < 0) gameState.reputation = 0;
    if (gameState.reputation > 1) gameState.reputation = 1;
}


// =======================================================
// TELA DE RESULTADOS
// =======================================================

function mostrarTelaResultados(resultado) {

    mostrarTela("tela-resultados");

    let tabela = document.getElementById("tableResultados");
    tabela.innerHTML = "";

    resultado.forEach(r => {
        let p = PILOTOS.find(p => p.id === r.driverId);

        tabela.innerHTML += `
        <tr>
            <td>${r.pos}</td>
            <td><img src="${p.avatar}" class="avatar"> ${p.nome}</td>
            <td>${p.team}</td>
            <td>${formatarTempo(r.totalTime)}</td>
            <td>${r.pits}</td>
        </tr>
        `;
    });

    // resumo standings
    atualizarClassificacaoPilotosUI();
    atualizarClassificacaoEquipesUI();

    // botão próximo GP
    document.getElementById("btnProximoGP").onclick = irParaProximoGP;
}


// =======================================================
// ATUALIZAÇÃO UI STANDINGS
// =======================================================

function atualizarClassificacaoPilotosUI() {

    let div = document.getElementById("standingsPilotos");
    div.innerHTML = "";

    let lista = Object.entries(gameState.standingsDrivers)
        .sort((a, b) => b[1] - a[1]);

    lista.forEach(([id, pts], i) => {
        let p = PILOTOS.find(p => p.id === id);
        div.innerHTML += `
        <div class="linha">
            <span>${i + 1}.</span>
            <img src="${p.avatar}" class="avatarMini">
            <span>${p.nome}</span>
            <span>${pts} pts</span>
        </div>`;
    });
}

function atualizarClassificacaoEquipesUI() {

    let div = document.getElementById("standingsEquipes");
    div.innerHTML = "";

    let lista = Object.entries(gameState.standingsTeams)
        .sort((a, b) => b[1] - a[1]);

    lista.forEach(([team, pts], i) => {
        div.innerHTML += `
        <div class="linha">
            <span>${i + 1}.</span>
            <img src="${TEAM_LOGO[team]}" class="logoMini">
            <span>${team}</span>
            <span>${pts} pts</span>
        </div>`;
    });
}


// =======================================================
// PÓDIO
// =======================================================

function mostrarPodio(resultado) {

    let podium = document.getElementById("podioContainer");
    podium.innerHTML = "";

    // top 3
    let top3 = resultado.slice(0, 3);

    top3.forEach((r, i) => {
        let p = PILOTOS.find(p => p.id === r.driverId);

        podium.innerHTML += `
        <div class="pos${i+1}">
            <img src="${p.avatar}" class="podioAvatar">
            <img src="${p.flag}" class="flagIcon">
            <img src="${TEAM_LOGO[p.team]}" class="logoMini">
            <h3>${p.nome}</h3>
            <p>${r.team}</p>
        </div>
        `;
    });
}
