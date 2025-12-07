// =======================================================
// PRACTICE SYSTEM – TREINO LIVRE
// =======================================================
// Objetivo:
// - Simular voltas
// - Gerar feedback do piloto sobre setup
// - Atualizar confiança do setup
// - Avançar para Quali
// =======================================================

// número de voltas simuladas por piloto
const PRACTICE_LAPS = 12;

// =======================================================
// ENTRADA PRINCIPAL
// =======================================================

function iniciarPractice() {
    gameState.phase = "PRACTICE";
    salvarGame();

    simularPracticeSession();
    mostrarTelaPractice();
}

// =======================================================
// SIMULAÇÃO DA SESSÃO DE PRACTICE
// =======================================================

function simularPracticeSession() {

    let pista = GAME_DATA.tracks[gameState.weekendIndex];
    let clima = pista.weather;

    // para cada piloto da equipe do jogador
    PILOTOS.forEach(p => {

        // cada piloto tem um setup atual (altura, asa, etc.)
        if (!p.setup) {
            p.setup = gerarSetupInicial();
        }

        let voltas = [];
        let desgaste = 0;
        let temp = clima === "sun" ? 80 : 60;
        let melhorVolta = Infinity;

        for (let i = 0; i < PRACTICE_LAPS; i++) {

            let volta = simularVoltaPractice(p, pista, p.setup, temp, desgaste);

            voltas.push(volta);

            if (volta < melhorVolta) melhorVolta = volta;

            // aumentar desgaste dos pneus
            desgaste += 4 + Math.random() * 3;

            // aumentar temperatura
            temp += 1.5;

            if (desgaste > 100) desgaste = 100;
            if (temp > 120) temp = 120;
        }

        // ANALISAR FEEDBACK
        let feedback = gerarFeedbackSetup(p.setup, pista);

        // calculo de confiança no setup
        let confAntiga = p.setupConfidence || 0.5;
        let confNova = calcularConfiancaSetup(confAntiga, feedback.quality);

        p.setupConfidence = confNova;
        p.practice = {
            bestLap: melhorVolta,
            avgLap: media(voltas),
            feedback: feedback.text,
            feedbackScore: feedback.quality
        };
    });

    salvarGame();
}

// =======================================================
// SIMULAÇÃO DE VOLTA NO TREINO
// =======================================================

function simularVoltaPractice(piloto, pista, setup, temp, desgaste) {

    // tempo base da pista
    let base = 90 + Math.random() * 5;

    // desempenho do piloto e carro
    let perf = TEAM_RATING[piloto.team] + DRIVER_RATING[piloto.id];

    // impacto do setup
    let setupImpacto = calcularImpactoSetup(setup, pista);

    // desgaste e temperatura prejudicam
    let desgasteImpacto = (desgaste / 100) * 1.8;
    let tempImpacto = (temp - 80) / 100;

    // pequena chance de erro
    let erro = Math.random() < 0.05 ? 1 + Math.random() * 2 : 0;

    let volta = base - (perf * 0.08) + setupImpacto + desgasteImpacto + tempImpacto + erro;

    return volta;
}

// =======================================================
// FEEDBACK DO SETUP
// =======================================================

function gerarFeedbackSetup(setup, pista) {

    // qualidade do acerto comparado com ideal
    let ideal = pista.idealSetup;

    let delta =
        Math.abs(setup.wing - ideal.wing) +
        Math.abs(setup.susp - ideal.susp) +
        Math.abs(setup.height - ideal.height);

    let quality = 1 - (delta / 15);
    if (quality < 0) quality = 0;
    if (quality > 1) quality = 1;

    let text = "";
    if (quality > 0.8) text = "O carro está excelente, muito equilibrado!";
    else if (quality > 0.6) text = "Bom equilíbrio geral, talvez pequenos ajustes.";
    else if (quality > 0.4) text = "Carro razoável, mas perde em curvas ou retas.";
    else text = "Setup ruim, precisamos mexer bastante.";

    return { text, quality };
}

function calcularConfiancaSetup(confAnterior, qualidade) {
    let nova = confAnterior + (qualidade - 0.5) * 0.2;

    if (nova < 0) nova = 0;
    if (nova > 1) nova = 1;

    return nova;
}

// =======================================================
// IMPACTO DO SETUP
// =======================================================

function calcularImpactoSetup(setup, pista) {

    let ideal = pista.idealSetup;

    // diferença absoluta de parâmetros
    let delta =
        Math.abs(setup.wing - ideal.wing) +
        Math.abs(setup.susp - ideal.susp) +
        Math.abs(setup.height - ideal.height);

    return (delta * 0.15);
}

// =======================================================
// SETUP INICIAL
// =======================================================

function gerarSetupInicial() {
    return {
        wing: 6 + Math.floor(Math.random() * 4),   // 6–9
        susp: 5 + Math.floor(Math.random() * 4),   // 5–8
        height: 7 + Math.floor(Math.random() * 3)  // 7–9
    };
}

// =======================================================
// UI TREINO (TELA)
// =======================================================

function mostrarTelaPractice() {

    let div = document.getElementById("practiceInfo");
    div.innerHTML = "";

    PILOTOS.forEach(p => {
        if (!p.practice) return;

        div.innerHTML += `
        <div class="practice-card">
            <h3>${p.nome}</h3>
            <p>Melhor volta: ${formatarTempo(p.practice.bestLap)}</p>
            <p>Volta média: ${formatarTempo(p.practice.avgLap)}</p>
            <p>Confiança: ${(p.setupConfidence * 100).toFixed(0)}%</p>
            <p style="color:#f3f">${p.practice.feedback}</p>
        </div>
        `;
    });

    document.getElementById("btnIrParaQuali").onclick = iniciarQuali;
}

// =======================================================
// UTIL
// =======================================================

function media(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
