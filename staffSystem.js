// =======================================================
// STAFF SYSTEM – CONTRATAÇÃO / DEMISSÃO / IMPACTO NO DESEMPENHO
// =======================================================
//
// Tipos de Funcionário:
// - raceEngineer
// - pitCrewChief
// - aeroChief
// - marketingChief
// - teamPrincipal
//
// Cada um tem:
// id, name, role, skill, salary, contractYears, morale
//
// Impactos:
// - pit stops
// - estratégia
// - feedback de setup
// - marketing / patrocínios
// =======================================================


// =======================================================
// LISTA INICIAL (PODE VIR DO DATA.JS)
// =======================================================

if (!gameState.staff) {
    gameState.staff = [];
}

if (!gameState.staffPool) {
    // funcionários disponíveis no "mercado"
    gameState.staffPool = [
        {
            id: "st001",
            name: "Carlos Silva",
            role: "raceEngineer",
            skill: { strategy: 85, feedback: 92 },
            salary: 1200000,
            contractYears: 2,
            morale: 0.8,
            avatar: "assets/staff/eng1.png"
        },
        {
            id: "st002",
            name: "Ana Torres",
            role: "pitCrewChief",
            skill: { pitStops: 95 },
            salary: 1400000,
            contractYears: 2,
            morale: 0.85,
            avatar: "assets/staff/pit1.png"
        },
        {
            id: "st003",
            name: "Roberto Lima",
            role: "aeroChief",
            skill: { aero: 88 },
            salary: 1100000,
            contractYears: 1,
            morale: 0.75,
            avatar: "assets/staff/aero1.png"
        },
        {
            id: "st004",
            name: "Fernanda Matos",
            role: "marketingChief",
            skill: { marketing: 90 },
            salary: 900000,
            contractYears: 1,
            morale: 0.9,
            avatar: "assets/staff/mkt1.png"
        },
    ];
}


// =======================================================
// TELA PRINCIPAL DE STAFF
// =======================================================

function mostrarTelaStaff() {
    mostrarTela("tela-staff");

    let divAtual = document.getElementById("listaStaffAtual");
    divAtual.innerHTML = "";

    // funcionários da equipe atual
    gameState.staff.forEach(st => {
        divAtual.innerHTML += cardFuncionario(st, false);
    });

    let divMercado = document.getElementById("listaStaffMercado");
    divMercado.innerHTML = "";

    // funcionários livres
    gameState.staffPool.forEach(st => {
        divMercado.innerHTML += cardFuncionario(st, true);
    });
}


// =======================================================
// UI helper: gera HTML de um funcionário
// =======================================================

function cardFuncionario(st, podeContratar) {

    let btn = podeContratar
        ? `<button onclick="contratarStaff('${st.id}')">Contratar</button>`
        : `<button onclick="demitirStaff('${st.id}')">Demitir</button>`;

    return `
    <div class="staff-card">
        <img src="${st.avatar}" class="staffAvatar">
        <h3>${st.name}</h3>
        <p>Cargo: ${st.role}</p>
        <p>Salário: $${st.salary.toLocaleString()}</p>
        <p>Contrato: ${st.contractYears} anos</p>
        <p>Motivação: ${(st.morale * 100).toFixed(0)}%</p>
        ${btn}
    </div>
    `;
}


// =======================================================
// CONTRATAR
// =======================================================

function contratarStaff(id) {

    let st = gameState.staffPool.find(s => s.id === id);
    if (!st) return;

    // custo de assinatura
    let custo = st.salary * 0.5;

    if (gameState.finances.balance < custo) {
        alert("Sem saldo para contratar!");
        return;
    }

    // descontar valor
    gameState.finances.balance -= custo;

    // mover funcionário para equipe
    gameState.staff.push(st);

    // remover do pool
    gameState.staffPool = gameState.staffPool.filter(s => s.id !== id);

    salvarGame();
    mostrarTelaStaff();
}


// =======================================================
// DEMITIR
// =======================================================

function demitirStaff(id) {

    let st = gameState.staff.find(s => s.id === id);
    if (!st) return;

    // multa = salário restante * anos de contrato
    let multa = st.salary * st.contractYears * 0.7;

    if (gameState.finances.balance < multa) {
        alert("Sem saldo para demitir!");
        return;
    }

    gameState.finances.balance -= multa;

    // mandar para o mercado (com contrato zerado)
    st.contractYears = 0;
    gameState.staffPool.push(st);

    // remover da equipe
    gameState.staff = gameState.staff.filter(s => s.id !== id);

    salvarGame();
    mostrarTelaStaff();
}


// =======================================================
// IMPACTO NO JOGO
// =======================================================
//
// Funções de efeito usadas em corrida e career.
// São chamadas pelo raceSystem.js e careerSystem.js.
//
// =======================================================

function getStaffImpact() {

    let impacto = {
        strategy: 0,
        pitStops: 0,
        aero: 0,
        marketing: 0,
        feedback: 0
    };

    gameState.staff.forEach(st => {
        if (st.skill.strategy) impacto.strategy += st.skill.strategy * st.morale;
        if (st.skill.pitStops) impacto.pitStops += st.skill.pitStops * st.morale;
        if (st.skill.aero) impacto.aero += st.skill.aero * st.morale;
        if (st.skill.marketing) impacto.marketing += st.skill.marketing * st.morale;
        if (st.skill.feedback) impacto.feedback += st.skill.feedback * st.morale;
    });

    return impacto;
}
