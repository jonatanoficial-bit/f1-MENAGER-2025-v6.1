// =====================================================
// RACE SYSTEM - FULL REWRITE
// =====================================================

let corridaAtiva = false;
let voltaAtual = 1;
let totalVoltas = 10;
let velocidadeSim = 1;  // 1, 2 ou 4
let carros = [];
let pistaAtual = null;

const FPS = 60;
let ultimoFrame = 0;

let safetyCar = false;
let tempoSafetyCar = 0;

// =====================================================
// INICIAR CORRIDA
// =====================================================

function iniciarCorrida(trackName) {
    corridaAtiva = true;
    voltaAtual = 1;
    pistaAtual = trackName;

    montarCarros();
    carregarPista(trackName);
    atualizarTabela();

    requestAnimationFrame(loopCorrida);
}

// =====================================================
// CRIAR OBJETOS DOS CARROS
// =====================================================

function montarCarros() {
    carros = PILOTOS.map((piloto, index) => {
        return {
            nome: piloto.nome,
            equipe: piloto.equipe,
            pos: index + 1,
            volta: 0,
            gap: 0,
            pneus: "Medium",
            desgaste: 100,
            temp: 85,
            pit: 0,
            x: 0,
            y: 0,
            sprite: `assets/cars/${piloto.equipe}.png`
        }
    });
}

// =====================================================
// CARREGAR PISTA
// =====================================================

function carregarPista(pista) {
    let svg = `assets/tracks/${pista}.svg`;
    document.getElementById("trackImage").src = svg;
}

// =====================================================
// LOOP PRINCIPAL
// =====================================================

function loopCorrida(timestamp) {

    if (!corridaAtiva) return;

    if (timestamp - ultimoFrame > 1000 / FPS) {
        atualizarPosicoes();
        atualizarTabela();
        ultimoFrame = timestamp;
    }

    requestAnimationFrame(loopCorrida);
}

// =====================================================
// MOVIMENTO E SIMULAÇÃO
// =====================================================

function atualizarPosicoes() {

    carros.forEach(c => {

        // ------------------------------------------------
        // DESGASTE DE PNEU
        // ------------------------------------------------
        c.desgaste -= 0.15 * velocidadeSim;

        if (c.desgaste <= 0) {
            fazerPitStop(c);
        }

        // ------------------------------------------------
        // TEMPERATURA
        // ------------------------------------------------
        c.temp += 0.05 * velocidadeSim;

        // ------------------------------------------------
        // PROGRESSO DE VOLTA
        // ------------------------------------------------
        c.volta = Math.floor(voltaAtual);

        // velocidade depende de desgaste
        let fator = (c.desgaste / 100);
        c.gap += 0.1 * velocidadeSim * (1 - fator);

    });

    // Reordenar por gap
    carros.sort((a, b) => a.gap - b.gap);
    carros.forEach((c, i) => c.pos = i + 1);

    // ------------------------------------------------
    // FIM DE VOLTA
    // ------------------------------------------------
    voltaAtual += 0.02 * velocidadeSim;

    if (voltaAtual >= totalVoltas) {
        finalizarCorrida();
    }
}

// =====================================================
// PIT STOP
// =====================================================

function fazerPitStop(carro) {

    carro.pit++;
    carro.desgaste = 100;
    carro.temp = 85;
    carro.gap += 8 + (Math.random() * 5); // tempo realista
}

// =====================================================
// SAFETY CAR EVENTO
// =====================================================

function verificarSafetyCar() {

    if (safetyCar) {
        tempoSafetyCar--;

        carros.forEach(c => {
            c.temp -= 0.2;
        });

        if (tempoSafetyCar <= 0) {
            safetyCar = false;
        }
        return;
    }

    // chance de SC
    if (Math.random() < 0.002) {
        safetyCar = true;
        tempoSafetyCar = 300;
        carros.forEach(c => c.gap += 5);
    }
}

// =====================================================
// ATUALIZAR PAINEL
// =====================================================

function atualizarTabela() {

    const tabela = document.getElementById("raceTable");
    tabela.innerHTML = "";

    carros.forEach(c => {

        tabela.innerHTML += `
        <tr>
            <td>${c.pos}</td>
            <td>${c.nome}</td>
            <td>${c.volta}</td>
            <td>${c.pos == 1 ? "Líder" : "+" + c.gap.toFixed(1) + "s"}</td>
            <td>${c.pneus}</td>
            <td>${c.desgaste.toFixed(0)}%</td>
            <td>${c.pit}</td>
        </tr>
        `;
    });

    document.getElementById("lapCounter").innerText =
        `Volta ${Math.floor(voltaAtual)} / ${totalVoltas}`;
}

// =====================================================
// FINAL DA CORRIDA
// =====================================================

function finalizarCorrida() {
    corridaAtiva = false;

    // Ordenar final
    carros.sort((a, b) => a.pos - b.pos);

    mostrarPodio();
    salvarResultado();
}

// =====================================================
// PODIO
// =====================================================

function mostrarPodio() {

    const podium = document.getElementById("podium");
    podium.innerHTML = `
        <h2>PÓDIO</h2>
        <div class="podium-places">
            <div class="p1">
                <img src="assets/flags/${carros[0].equipe}.png">
                <p>${carros[0].nome}</p>
            </div>

            <div class="p2">
                <img src="assets/flags/${carros[1].equipe}.png">
                <p>${carros[1].nome}</p>
            </div>

            <div class="p3">
                <img src="assets/flags/${carros[2].equipe}.png">
                <p>${carros[2].nome}</p>
            </div>
        </div>
    `;

    podium.style.display = "block";
}

// =====================================================
// SALVAR RESULTADO
// =====================================================

function salvarResultado() {
    localStorage.setItem("ultimoResultado", JSON.stringify(carros));
}

// =====================================================
// BOTÕES DE VELOCIDADE
// =====================================================

function setSpeed(v) {
    velocidadeSim = v;
}

// =====================================================
// BOTÃO BOX THIS LAP
// =====================================================

function boxThisLap() {
    let meuCarro = carros[0];
    fazerPitStop(meuCarro);
}
