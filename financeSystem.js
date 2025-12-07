// =======================================================
// financeSystem.js
// SISTEMA FINANCEIRO – SALDO, HISTÓRICO, PROJEÇÕES
// =======================================================
//
// Estrutura usada:
//
// gameState.finances = {
//   balance: number,          // saldo atual
//   history: [                // lançamentos
//      { tipo: "receita"|"despesa", valor: number, desc: string, pista?: string, gpIndex?: number }
//   ]
// }
//
// Funções principais:
// - mostrarTelaFinancas()
// - registrarReceita(valor, desc, extra)
// - registrarDespesa(valor, desc, extra)
// =======================================================


// ---------------------------------------------------------------------
// GARANTIR gameState E finances INICIALIZADOS
// ---------------------------------------------------------------------
if (typeof window.gameState === "undefined") {
    window.gameState = {};
}

if (!gameState.finances) {
    gameState.finances = {
        balance: 20_000_000, // valor padrão de início de carreira
        history: []          // lista de lançamentos
    };
}

// Segurança: garantir que history seja sempre array
if (!Array.isArray(gameState.finances.history)) {
    gameState.finances.history = [];
}


// ---------------------------------------------------------------------
// MOSTRAR TELA DE FINANÇAS
// ---------------------------------------------------------------------
function mostrarTelaFinancas() {
    if (typeof mostrarTela === "function") {
        mostrarTela("tela-financas");
    }

    atualizarCabecalhoFinancas();
    renderHistoricoFinanceiro();
    renderResumoFinanceiro();
    renderProjecaoFinanceira();
}


// ---------------------------------------------------------------------
// ATUALIZA CABEÇALHO (SALDO ATUAL)
// ---------------------------------------------------------------------
function atualizarCabecalhoFinancas() {
    const f = gameState.finances;
    const elSaldo = document.getElementById("financeSaldo");

    if (!elSaldo) return;

    elSaldo.innerHTML = `$ ${Number(f.balance).toLocaleString()}`;
}


// ---------------------------------------------------------------------
// HISTÓRICO – ÚLTIMOS LANÇAMENTOS
// ---------------------------------------------------------------------
function renderHistoricoFinanceiro() {
    const tabela = document.getElementById("financeHistorico");
    if (!tabela) return;

    tabela.innerHTML = "";

    // mostra os 30 últimos, mais recente primeiro
    const itens = [...gameState.finances.history].slice(-30).reverse();

    itens.forEach(item => {
        const linha = document.createElement("tr");

        const tdTipo = document.createElement("td");
        const tdDesc = document.createElement("td");
        const tdValor = document.createElement("td");

        tdTipo.textContent = item.tipo || "";
        tdDesc.textContent = item.pista || item.desc || "";

        const valor = Number(item.valor) || 0;
        const prefix = valor >= 0 ? "+" : "-";
        const absVal = Math.abs(valor).toLocaleString();

        tdValor.textContent = `${prefix} $${absVal}`;
        tdValor.style.color = valor >= 0 ? "#3ddc84" : "#ff4b4b";
        tdValor.style.fontWeight = "600";

        linha.appendChild(tdTipo);
        linha.appendChild(tdDesc);
        linha.appendChild(tdValor);

        tabela.appendChild(linha);
    });
}


// ---------------------------------------------------------------------
// RESUMO – RECEITA x DESPESA TOTAL
// ---------------------------------------------------------------------
function renderResumoFinanceiro() {
    const box = document.getElementById("financeResumo");
    if (!box) return;

    let totalReceita = 0;
    let totalDespesa = 0;

    gameState.finances.history.forEach(item => {
        const v = Number(item.valor) || 0;
        if (v >= 0) totalReceita += v;
        else totalDespesa += v;
    });

    const textoReceita = `$ ${totalReceita.toLocaleString()}`;
    const textoDespesa = `$ ${Math.abs(totalDespesa).toLocaleString()}`;

    box.innerHTML = `
        <p><b>Receita acumulada:</b> ${textoReceita}</p>
        <p><b>Despesas acumuladas:</b> ${textoDespesa}</p>
    `;
}


// ---------------------------------------------------------------------
// PROJEÇÃO FINANCEIRA SIMPLES ATÉ O FIM DA TEMPORADA
// ---------------------------------------------------------------------
function renderProjecaoFinanceira() {
    const box = document.getElementById("financeProjecao");
    if (!box) return;

    const f = gameState.finances;

    const totalHistorico = gameState.finances.history.reduce((sum, item) => {
        const v = Number(item.valor) || 0;
        return sum + v;
    }, 0);

    // número de GPs já corridos (se existir gameState.results)
    const raceCount = Array.isArray(gameState.results)
        ? gameState.results.length
        : 0;

    let mediaPorGP = 0;
    if (raceCount > 0) {
        mediaPorGP = totalHistorico / raceCount;
    }

    const totalGPsTemporada = 22; // pode ajustar para 24 se quiser
    const restantes = Math.max(totalGPsTemporada - raceCount, 0);

    const projFinal = f.balance + mediaPorGP * restantes;

    box.innerHTML = `
        <p><b>Projeção de saldo ao fim da temporada:</b></p>
        <p>$ ${projFinal.toLocaleString()}</p>
        <small>Média atual por GP: $ ${Math.round(mediaPorGP).toLocaleString()}</small>
    `;
}


// ---------------------------------------------------------------------
// REGISTRAR RECEITA
// ---------------------------------------------------------------------
/**
 * Registra uma entrada de dinheiro
 * @param {number} valor - valor positivo
 * @param {string} desc - descrição (ex: "Prêmio P2", "Patrocínio X")
 * @param {object} extra - opcional (pista, gpIndex, etc.)
 */
function registrarReceita(valor, desc, extra = {}) {
    if (!gameState.finances) {
        gameState.finances = { balance: 0, history: [] };
    }

    const numVal = Number(valor) || 0;

    gameState.finances.balance += numVal;
    gameState.finances.history.push({
        tipo: "receita",
        valor: numVal,
        desc: desc || "",
        pista: extra.pista || null,
        gpIndex: typeof extra.gpIndex === "number" ? extra.gpIndex : null
    });

    if (typeof salvarGame === "function") {
        salvarGame();
    }

    // se estiver na tela de finanças, atualizar
    atualizarCabecalhoFinancas();
    renderHistoricoFinanceiro();
    renderResumoFinanceiro();
    renderProjecaoFinanceira();
}


// ---------------------------------------------------------------------
// REGISTRAR DESPESA
// ---------------------------------------------------------------------
/**
 * Registra uma saída de dinheiro
 * @param {number} valor - valor positivo (será lançado como negativo)
 * @param {string} desc - descrição (ex: "Salários", "Multa rescisão")
 * @param {object} extra - opcional (pista, gpIndex, etc.)
 */
function registrarDespesa(valor, desc, extra = {}) {
    if (!gameState.finances) {
        gameState.finances = { balance: 0, history: [] };
    }

    const numVal = Number(valor) || 0;

    gameState.finances.balance -= numVal;
    gameState.finances.history.push({
        tipo: "despesa",
        valor: -numVal,
        desc: desc || "",
        pista: extra.pista || null,
        gpIndex: typeof extra.gpIndex === "number" ? extra.gpIndex : null
    });

    if (typeof salvarGame === "function") {
        salvarGame();
    }

    atualizarCabecalhoFinancas();
    renderHistoricoFinanceiro();
    renderResumoFinanceiro();
    renderProjecaoFinanceira();
          }
