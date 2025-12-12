// =======================================================
// SPONSOR SYSTEM – PATROCÍNIOS E METAS
// =======================================================
//
// Cada patrocínio tem:
// id, name, logo, upfront, perRace, bonusType, target, bonusValue, contractRaces
//
// Tipos de bônus:
// - position: terminar no top X
// - points: marcar pontos
// - podium: top 3
// - win: vencer
// =======================================================


// Inicializa pool se vazio
if (!gameState.sponsorPool) {
    gameState.sponsorPool = [
        {
            id: "sp01",
            name: "TechOil",
            logo: "assets/sponsors/oil.png",
            upfront: 2000000,
            perRace: 180000,
            bonusType: "position",
            target: 10,
            bonusValue: 350000,
            contractRaces: 6,
            difficulty: 0.6
        },
        {
            id: "sp02",
            name: "SuperBank",
            logo: "assets/sponsors/bank.png",
            upfront: 3500000,
            perRace: 220000,
            bonusType: "podium",
            target: 3,
            bonusValue: 600000,
            contractRaces: 4,
            difficulty: 0.75
        },
        {
            id: "sp03",
            name: "Red Cola",
            logo: "assets/sponsors/cola.png",
            upfront: 1500000,
            perRace: 120000,
            bonusType: "points",
            target: 1,
            bonusValue: 200000,
            contractRaces: 8,
            difficulty: 0.4
        }
    ];
}

if (!gameState.activeSponsors) {
    gameState.activeSponsors = [];
}


// =======================================================
// MOSTRAR TELA DE PATROCÍNIOS
// =======================================================

function mostrarTelaSponsors() {
    mostrarTela("tela-sponsors");

    let divAtivos = document.getElementById("listaSponsorsAtivos");
    divAtivos.innerHTML = "";

    gameState.activeSponsors.forEach(sp => {
        divAtivos.innerHTML += cardSponsor(sp, false);
    });

    let divPropostas = document.getElementById("listaSponsorsPropostas");
    divPropostas.innerHTML = "";

    // oferta de propostas antes de cada GP
    let propostas = gerarPropostasSponsors();

    propostas.forEach(sp => {
        divPropostas.innerHTML += cardSponsor(sp, true);
    });
}


// =======================================================
// UI helper: cartão de patrocinador
// =======================================================

function cardSponsor(sp, podeAssinar) {

    let btn = podeAssinar
        ? `<button onclick="assinarSponsor('${sp.id}')">Assinar</button>`
        : `<button onclick="cancelarSponsor('${sp.id}')">Cancelar</button>`;

    return `
    <div class="sponsor-card">
        <img src="${sp.logo}" class="sponsorLogo">
        <h3>${sp.name}</h3>
        <p>Pagamento inicial: $${sp.upfront.toLocaleString()}</p>
        <p>Por corrida: $${sp.perRace.toLocaleString()}</p>
        <p>Meta: ${metaSponsorTexto(sp)}</p>
        <p>Restam: ${sp.contractRaces} corridas</p>
        ${btn}
    </div>
    `;
}

function metaSponsorTexto(sp) {
    switch (sp.bonusType) {
        case "position": return `Terminar top ${sp.target}`;
        case "points": return `Marcar pontos`;
        case "podium": return `Subir ao pódio`;
        case "win": return `Vencer`;
        default: return "";
    }
}


// =======================================================
// GERAR PROPOSTAS DE PATROCÍNIO
// =======================================================

function gerarPropostasSponsors() {

    // até 3 propostas por GP
    let lista = [];

    let marketingImpact = getStaffImpact().marketing || 0;
    let probBonus = marketingImpact / 200; // influencia chance de propostas melhores

    gameState.sponsorPool.forEach(sp => {
        // sorteio de ofertas
        if (Math.random() < (0.3 + probBonus)) {
            lista.push(sp);
        }
    });

    // se nenhuma, dar ao menos 1
    if (lista.length === 0) {
        lista.push(gameState.sponsorPool[0]);
    }

    return lista.slice(0, 3);
}


// =======================================================
// ASSINAR
// =======================================================

function assinarSponsor(id) {

    let sp = gameState.sponsorPool.find(s => s.id === id);
    if (!sp) return;

    // pagar upfront
    gameState.finances.balance += sp.upfront;

    // mover para ativos
    gameState.activeSponsors.push(sp);

    // remover da pool
    gameState.sponsorPool = gameState.sponsorPool.filter(s => s.id !== id);

    salvarGame();
    mostrarTelaSponsors();
}


// =======================================================
// PAGAMENTOS POR CORRIDA
// =======================================================

function pagarSponsorsPorCorrida(resultado) {

    gameState.activeSponsors.forEach(sp => {

        // pagamento fixo
        gameState.finances.balance += sp.perRace;

        gameState.finances.history.push({
            tipo: "sponsor",
            valor: sp.perRace,
            pista: GAME_DATA.tracks[gameState.weekendIndex].name
        });

        // bônus se meta cumprida
        if (cumpriuMetaSponsor(sp, resultado)) {

            gameState.finances.balance += sp.bonusValue;

            gameState.finances.history.push({
                tipo: "bonus",
                valor: sp.bonusValue,
                meta: sp.bonusType
            });
        }

        // reduzir duração
        sp.contractRaces--;

    });

    // remover contratos vencidos
    gameState.activeSponsors = gameState.activeSponsors.filter(sp => sp.contractRaces > 0);

    salvarGame();
}


// =======================================================
// VERIFICAR META
// =======================================================

function cumpriuMetaSponsor(sp, resultado) {

    let firstOfTeam = resultado.find(r => r.team === gameState.teamSelected);
    if (!firstOfTeam) return false;

    switch (sp.bonusType) {
        case "position": return firstOfTeam.pos <= sp.target;
        case "points": return firstOfTeam.pos <= 10;
        case "podium": return firstOfTeam.pos <= 3;
        case "win": return firstOfTeam.pos === 1;
        default: return false;
    }
}


// =======================================================
// CANCELAR PATROCÍNIO
// =======================================================

function cancelarSponsor(id) {

    let sp = gameState.activeSponsors.find(s => s.id === id);
    if (!sp) return;

    // penalidade simples: perder upfront proporcional
    let multa = sp.upfront * 0.3;

    if (gameState.finances.balance < multa) {
        alert("Saldo insuficiente para rescindir!");
        return;
    }

    gameState.finances.balance -= multa;

    // voltar para pool com tempo zerado
    sp.contractRaces = 0;
    gameState.sponsorPool.push(sp);

    gameState.activeSponsors = gameState.activeSponsors.filter(s => s.id !== id);

    salvarGame();
    mostrarTelaSponsors();
}
