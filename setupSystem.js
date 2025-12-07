// =======================================================
// SETUP SYSTEM – EDITOR DE ACERTO DO CARRO
// =======================================================

/*
Parâmetros:
- Asa (wing) 0–10
- Suspensão (susp) 0–10
- Altura do carro (height) 0–10

Impactos:
- Mais asa = melhor curva, menos reta
- Mais suspensão = mais estabilidade, menos velocidade
- Menos altura = melhor desempenho, risco maior de desgaste

Setup salvo por piloto
*/

const SETUP_MIN = 0;
const SETUP_MAX = 10;

// =======================================================
// MOSTRAR TELA DE SETUP
// =======================================================

function mostrarTelaSetup(pilotoId) {

    let piloto = PILOTOS.find(p => p.id === pilotoId);

    if (!piloto.setup) {
        piloto.setup = gerarSetupInicial();
    }

    gameState.phase = "SETUP";

    // render UI
    let c = document.getElementById("setupInfo");
    c.innerHTML = `
    <h2>Setup - ${piloto.nome}</h2>

    <div class="setup-row">
       <label>Asa Traseira (Wing)</label>
       <input type="range" min="${SETUP_MIN}" max="${SETUP_MAX}" value="${piloto.setup.wing}" id="sliderWing">
       <span id="labelWing">${piloto.setup.wing}</span>
    </div>

    <div class="setup-row">
       <label>Suspensão</label>
       <input type="range" min="${SETUP_MIN}" max="${SETUP_MAX}" value="${piloto.setup.susp}" id="sliderSusp">
       <span id="labelSusp">${piloto.setup.susp}</span>
    </div>

    <div class="setup-row">
       <label>Altura do Carro</label>
       <input type="range" min="${SETUP_MIN}" max="${SETUP_MAX}" value="${piloto.setup.height}" id="sliderHeight">
       <span id="labelHeight">${piloto.setup.height}</span>
    </div>

    <button id="btnSalvarSetup">Salvar Setup</button>
    <button id="btnVoltarSetup">Voltar</button>
    `;

    // listeners
    document.getElementById("sliderWing").oninput = e => {
        piloto.setup.wing = Number(e.target.value);
        document.getElementById("labelWing").innerText = piloto.setup.wing;
        atualizarPreviewSetup(piloto);
    };

    document.getElementById("sliderSusp").oninput = e => {
        piloto.setup.susp = Number(e.target.value);
        document.getElementById("labelSusp").innerText = piloto.setup.susp;
        atualizarPreviewSetup(piloto);
    };

    document.getElementById("sliderHeight").oninput = e => {
        piloto.setup.height = Number(e.target.value);
        document.getElementById("labelHeight").innerText = piloto.setup.height;
        atualizarPreviewSetup(piloto);
    };

    document.getElementById("btnSalvarSetup").onclick = () => salvarSetupPiloto(piloto);
    document.getElementById("btnVoltarSetup").onclick = voltarDepoisSetup;
}

// =======================================================
// SALVAR SETUP
// =======================================================

function salvarSetupPiloto(piloto) {
    // salvos diretamente no objeto
    console.log("SETUP SALVO:", piloto.setup);
    salvarGame();
    voltarDepoisSetup();
}

function voltarDepoisSetup() {

    // decidir para onde voltar
    if (gameState.phaseAntesSetup === "PRACTICE") {
        mostrarTelaPractice();
    } else {
        mostrarTela("tela-practice"); // fallback seguro
    }
}

// =======================================================
// PRÉVIEW DE IMPACTO
// =======================================================

function atualizarPreviewSetup(piloto) {

    // usar fórmula simples
    let curvas = piloto.setup.wing * 2;
    let reta = 20 - piloto.setup.wing * 1.5;

    let estabilidade = piloto.setup.susp * 2;
    let aerodinamica = 20 - piloto.setup.height * 1.2;

    // UI sugestiva (pode ser trocado por gráfico futuramente)

    let preview = document.getElementById("setupPreview");
    if (!preview) {
        let c = document.getElementById("setupInfo");
        c.innerHTML += `<div id="setupPreview"></div>`;
        preview = document.getElementById("setupPreview");
    }

    preview.innerHTML = `
        <h3>Impacto Estimado</h3>
        <p>Curvas: ${curvas.toFixed(0)}</p>
        <p>Retas: ${reta.toFixed(0)}</p>
        <p>Estabilidade: ${estabilidade.toFixed(0)}</p>
        <p>Aerodinâmica: ${aerodinamica.toFixed(0)}</p>
    `;
}
