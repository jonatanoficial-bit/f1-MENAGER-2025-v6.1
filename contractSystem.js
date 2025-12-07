// =======================================================
// CONTRACT SYSTEM – PILOTOS, TRANSFERÊNCIAS, OFERTAS
// =======================================================
//
// Cada piloto tem:
// id, team, salary, yearsLeft, status, rating, morale
//
// Durante a temporada:
// - renovar contrato
// - rescindir com multa
// - mercado de pilotos (livres e fim de contrato)
// - ofertas para o jogador mudar de equipe
// - demissão se metas falharem
// =======================================================


// Iniciar contratos se ainda não existe
if (!gameState.contracts) {
    gameState.contracts = {
        drivers: {},
        manager: {
            team: gameState.teamSelected,
            salary: 2000000,
            yearsLeft: 2
        }
    };
}


// =======================================================
// TELA CONTRATOS
// =======================================================

function mostrarTelaContratos() {
    mostrarTela("tela-contratos");

    let divAtual = document.getElementById("contratosPilotos");
    divAtual.innerHTML = "";

    // pilotos da equipe atual
    PILOTOS.filter(p => p.team === gameState.teamSelected).forEach(p => {
        divAtual.innerHTML += cardPilotoContrato(p, false);
    });

    // mercado
    let divMercado = document.getElementById("mercadoPilotos");
    divMercado.innerHTML = "";

    let mercado = gerarMercadoPilotos();
    mercado.forEach(p => {
        divMercado.innerHTML += cardPilotoContrato(p, true);
    });

    // ofertas de equipes
    mostrarOfertasManager();
}


// =======================================================
// UI – CARD PILOTO
// =======================================================

function cardPilotoContrato(p, podeContratar) {

    let contrato = gameState.contracts.drivers[p.id] || { salary: p.salary, yearsLeft: 1 };

    let btn = podeContratar
        ? `<button onclick="contratarPiloto('${p.id}')">Contratar</button>`
        : `<button onclick="rescindirPiloto('${p.id}')">Rescindir</button>
           <button onclick="renovarPiloto('${p.id}')">Renovar</button>`;

    return `
    <div class="piloto-card">
        <img src="${p.avatar}" class="pilotoAvatar">
        <h3>${p.nome}</h3>
        <p>Rating: ${DRIVER_RATING[p.id]}</p>
        <p>Salário: $${contrato.salary.toLocaleString()}</p>
        <p>Contrato: ${contrato.yearsLeft} anos</p>
        ${btn}
    </div>
    `;
}


// =======================================================
// MERCADO DE PILOTOS
// =======================================================

function gerarMercadoPilotos() {

    // pilotos sem equipe
    let livres = PILOTOS.filter(p => p.team === null);

    // pilotos em fim de contrato
    let fimContrato = PILOTOS.filter(p => {
        let c = gameState.contracts.drivers[p.id];
        return c && c.yearsLeft <= 0;
    });

    let mercado = [...livres, ...fimContrato];

    // se vazio, pegar alguns aleatórios
    if (mercado.length < 3) {
        mercado.push(
            PILOTOS[Math.floor(Math.random() * PILOTOS.length)]
        );
    }

    return mercado.slice(0, 5);
}


// =======================================================
// CONTRATAR
// =======================================================

function contratarPiloto(id) {

    let piloto = PILOTOS.find(p => p.id === id);
    if (!piloto) return;

    let custo = piloto.salary * 0.5;

    if (gameState.finances.balance < custo) {
        alert("Sem saldo!");
        return;
    }

    gameState.finances.balance -= custo;

    // assinar
    gameState.contracts.drivers[id] = {
        salary: piloto.salary,
        yearsLeft: 2
    };

    piloto.team = gameState.teamSelected;

    salvarGame();
    mostrarTelaContratos();
}


// =======================================================
// RESCINDIR
// =======================================================

function rescindirPiloto(id) {

    let contrato = gameState.contracts.drivers[id];
    if (!contrato) return;

    let multa = contrato.salary * contrato.yearsLeft * 0.7;

    if (gameState.finances.balance < multa) {
        alert("Saldo insuficiente!");
        return;
    }

    gameState.finances.balance -= multa;

    // remover piloto da equipe
    let p = PILOTOS.find(p => p.id === id);
    p.team = null;

    delete gameState.contracts.drivers[id];

    salvarGame();
    mostrarTelaContratos();
}


// =======================================================
// RENOVAR
// =======================================================

function renovarPiloto(id) {

    let contrato = gameState.contracts.drivers[id];
    if (!contrato) return;

    let aumento = contrato.salary * 0.2;

    // custo da renovação
    if (gameState.finances.balance < aumento) {
        alert("Sem saldo!");
        return;
    }

    gameState.finances.balance -= aumento;

    contrato.salary += aumento;
    contrato.yearsLeft += 2;

    salvarGame();
    mostrarTelaContratos();
}


// =======================================================
// EVOLUÇÃO DE CONTRATOS A CADA GP
// =======================================================

function avancarContratosGP() {

    // diminuir tempo restante
    Object.values(gameState.contracts.drivers).forEach(c => {
        c.yearsLeft -= 1 / 22; // temporada com 22 GPs
    });
}


// =======================================================
// OFERTAS PARA O MANAGER MUDAR DE EQUIPE
// =======================================================

function mostrarOfertasManager() {

    let div = document.getElementById("ofertasManager");
    div.innerHTML = "";

    // probabilidade baseada na reputação
    let prob = gameState.reputation;

    // só equipes diferentes oferecem
    GAME_DATA.teams.forEach(t => {
        if (t.id === gameState.teamSelected) return;

        if (Math.random() < prob) {

            div.innerHTML += `
            <div class="oferta-card">
                <img src="${TEAM_LOGO[t.id]}" class="logoMini">
                <h4>${t.name}</h4>
                <p>Oferece: $${(2_000_000 * prob).toLocaleString()}</p>
                <button onclick="aceitarOfertaManager('${t.id}')">Aceitar</button>
            </div>
            `;
        }
    });
}


// =======================================================
// ACEITAR OFERTA
// =======================================================

function aceitarOfertaManager(newTeam) {

    gameState.teamSelected = newTeam;

    // novo salário baseado na equipe
    gameState.contracts.manager.salary = 3000000 * gameState.reputation;
    gameState.contracts.manager.yearsLeft = 2;

    salvarGame();

    alert("Você agora é chefe da equipe " + newTeam);
    mostrarTelaContratos();
}
