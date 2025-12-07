// =======================================
// F1 MANAGER 2025 - RACE SYSTEM
// =======================================

console.log("raceSystem.js carregado com sucesso.");

// velocidade da simulação
let RATE = 1;

// ---------------------------------------
// SIMULAR CORRIDA
// ---------------------------------------

function startRace(etapa, onFinish) {

    console.log("Iniciando simulação etapa:", etapa);

    const pista = GAME_STATE.calendario[etapa];
    const voltasTotais = pista.voltas;

    // clonar pilotos
    let grid = GAME_STATE.pilotos.map(p => ({
        ...p,
        voltaAtual: 0,
        pos: 0,
        tempoTotal: 0,
        pneus: "Medium",
        desgaste: 100,
        temperatura: 100,
        paradas: 0
    }));

    // embaralhar grid inicial
    grid.sort(() => Math.random() - 0.5);

    // loop por volta
    let currentLap = 1;

    function simularVolta() {

        grid.forEach(p => {

            // desgaste progressivo
            const desgastePerLap = (Math.random() * 2 + 1); // 1% a 3%
            p.desgaste -= desgastePerLap;
            if (p.desgaste < 10) p.desgaste = 10;

            // temperatura sobe
            p.temperatura += (Math.random() * 3);

            // tempo volta base
            let tempo = 90 + (Math.random() * 8);

            // desgaste e temperatura afetam
            tempo += ((100 - p.desgaste) * 0.25);
            tempo += ((p.temperatura - 100) * 0.4);

            // chance de erro
            if (Math.random() < 0.05) tempo += (Math.random() * 5);

            // chance de pitstop se desgaste < 40
            if (p.desgaste < 40) {
                tempo += 22 + Math.random() * 3;
                p.desgaste = 100;
                p.temperatura = 100;
                p.paradas++;
            }

            p.tempoTotal += tempo;
            p.voltaAtual = currentLap;
        });

        // ordenar
        grid.sort((a, b) => a.tempoTotal - b.tempoTotal);

        // atualizar posição
        grid.forEach((p, i) => p.pos = i + 1);

        // usar callback parcial para UI
        if (window.onRaceUpdate) {
            window.onRaceUpdate({
                volta: currentLap,
                total: voltasTotais,
                grid
            });
        }

        currentLap++;

        // terminou?
        if (currentLap <= voltasTotais) {
            setTimeout(simularVolta, 500 / RATE);
        } else {
            finalizarCorrida();
        }
    }

    simularVolta();

    // ---------------------------------------
    // ENCERRAR
    // ---------------------------------------

    function finalizarCorrida() {

        console.log("Corrida finalizada!");

        // ordenar final
        grid.sort((a, b) => a.tempoTotal - b.tempoTotal);

        const resultado = {
            etapa,
            pista: pista.nome,
            podium: grid.slice(0, 3).map(p => p.nome),
            classificacao: grid
        };

        // callback para o main
        if (onFinish) onFinish(resultado);
    }
}

// ---------------------------------------
// CONTROLE DE VELOCIDADE DO HUD
// ---------------------------------------

function setRaceSpeed(multiplier) {
    RATE = multiplier;
}
window.setRaceSpeed = setRaceSpeed;
window.startRace = startRace;
