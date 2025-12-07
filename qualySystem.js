// =====================================================
// SISTEMA DE CLASSIFICAÇÃO (Q1 / Q2 / Q3)
// =====================================================

/*
Fluxo:
1) iniciarQuali() chamado pelo careerSystem
2) Roda Q1 → elimina últimos 5
3) Roda Q2 → elimina últimos 5
4) Roda Q3 → define TOP 10
5) Salva grid final em gameState.grid
6) Avança para corrida
*/

let gridQuali = [];

// =====================================================
// ENTRY POINT
// =====================================================

function iniciarQuali() {

    // Q1
    let q1 = simularSessaoQuali(PILOTOS, 1);
    let q1Eliminados = q1.slice(-5);
    let q2Pilotos = q1.slice(0, 15);

    // Q2
    let q2 = simularSessaoQuali(q2Pilotos, 2);
    let q2Eliminados = q2.slice(-5);
    let q3Pilotos = q2.slice(0, 10);

    // Q3
    let q3 = simularSessaoQuali(q3Pilotos, 3);

    // Montar grid final
    gridQuali = [
        ...q3,           // P1 → P10
        ...q2Eliminados, // P11 → P15
        ...q1Eliminados  // P16 → P20
    ];

    // salvar no gameState
    gameState.grid = gridQuali.map((p, i) => {
        return {
            pos: i + 1,
            driverId: p.id,
            team: p.team,
            bestTime: p.bestTime
        }
    });

    salvarGame();

    // mostrar na tela
    mostrarTelaQuali();
}

// =====================================================
// SIMULAÇÃO DE UMA SESSÃO
// =====================================================

function simularSessaoQuali(listaPilotos, fase) {

    // Cada piloto faz 2 "tentativas" de volta rápida
    let resultados = listaPilotos.map(p => {

        // velocidade base da equipe + piloto
        let base = TEAM_RATING[p.team] + DRIVER_RATING[p.id];

        // confiança no setup influencia
        let conf = (p.setupConfidence || 0.5);

        // fase Q2 e Q3 aumentam pressão : pequenas variações
        let nervosismo = fase === 3 ? Math.random() * 0.3 : Math.random() * 0.15;

        // tempo = volta base + random
        let best = simularVoltaQuali(base, conf, nervosismo);

        return {
            ...p,
            bestTime: best
        };
    });

    // Ordenar por tempo (crescente)
    resultados.sort((a, b) => a.bestTime - b.bestTime);

    return resultados;
}

// =====================================================
// CÁLCULO DE VOLTA
// =====================================================

function simularVoltaQuali(base, conf, nervosismo) {

    // tempo base da pista (em segundos)
    let baseTrack = 80 + Math.random() * 5; // entre 1:20 e 1:25

    // performance melhora com rating e confiança
    let performance = 1 - ((base / 200) * 0.15) - (conf * 0.05);

    // fator aleatório da sessão
    let variacao = Math.random() * 0.6;

    // erro
    let erro = Math.random() < 0.02 ? 2 + Math.random() * 3 : 0;

    return baseTrack + performance + variacao + nervosismo + erro;
}

// =====================================================
// MOSTRAR NA TELA (UI SIMPLES)
// =====================================================

function mostrarTelaQuali() {
    let tbl = document.getElementById("tabelaQuali");
    tbl.innerHTML = "";

    gameState.grid.forEach(g => {
        let piloto = PILOTOS.find(p => p.id === g.driverId);
        tbl.innerHTML += `
        <tr>
            <td>${g.pos}</td>
            <td>${piloto.nome}</td>
            <td>${piloto.team}</td>
            <td>${formatarTempo(g.bestTime)}</td>
        </tr>`;
    });

    // botão para corrida
    document.getElementById("btnIrParaCorrida").onclick = iniciarCorridaGP;
}

// =====================================================
// FORMATAÇÃO DE TEMPO
// =====================================================

function formatarTempo(t) {
    let min = Math.floor(t / 60);
    let sec = (t % 60).toFixed(3);
    if (sec < 10) sec = "0" + sec;
    return `${min}:${sec}`;
}
