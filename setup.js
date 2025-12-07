// =====================================================
// SETUP DO CARRO
// =====================================================

let setupData = {
    asaFrontal: 5,
    asaTraseira: 5,
    suspensao: 5,
    altura: 5,
    diferencial: 5,
    pressao: 5
};

// Carregar se houver save
const savedSetup = localStorage.getItem("setup");
if (savedSetup) setupData = JSON.parse(savedSetup);

// =====================================================
// APLICAR IMPACTOS
// =====================================================

function aplicarSetup(carro) {

    // VELOCIDADE
    carro.velReta =
        1.0 +
        (10 - setupData.asaFrontal) * 0.02 +
        (10 - setupData.asaTraseira) * 0.02 -
        setupData.altura * 0.01;

    carro.velCurva =
        1.0 +
        (setupData.asaFrontal + setupData.asaTraseira) * 0.015 +
        setupData.suspensao * 0.01;

    // DESGASTE
    carro.desgasteRate =
        setupData.suspensao * 0.05 +
        setupData.pressao * 0.06;

    // TEMPERATURA
    carro.tempRate = setupData.pressao * 0.3;
}

// =====================================================
// SALVAR SETUP
// =====================================================

function salvarSetup() {
    localStorage.setItem("setup", JSON.stringify(setupData));
    alert("Setup salvo com sucesso!");
}
