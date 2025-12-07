/* ============================================================
   FINANCE SYSTEM — F1 MANAGER 2025
   Gerencia dinheiro, patrocínios, salários e histórico.
   ============================================================ */

const FinanceSystem = (() => {
  // ==========================
  //   CONFIGURAÇÕES GERAIS
  // ==========================
  const MOEDA = "R$";

  // Custos fixos por fim de semana (ex.: logística, fábrica, etc.)
  const CUSTO_FIXO_FIM_DE_SEMANA = 250_000;

  // Multiplicador de salário mensal para calcular custo por corrida
  // (aprox. 12 corridas/ano -> /12; se quiser mudar depois é fácil)
  const DIVISOR_SALARIO_POR_CORRIDA = 12;

  // Limite máximo de registros no histórico (para não crescer infinito)
  const LIMITE_HISTORICO = 200;

  // ==========================
  //   ESTADO INTERNO
  // ==========================
  let inicializado = false;

  // ==========================
  //   FUNÇÕES AUXILIARES
  // ==========================

  function existeJogo() {
    if (typeof JOGO === "undefined") {
      console.warn("[FinanceSystem] Objeto global JOGO não encontrado.");
      return false;
    }
    return true;
  }

  function garantirEstruturaFinanceira() {
    if (!existeJogo()) return;

    if (!JOGO.financas) {
      JOGO.financas = {
        receitaTotal: 0,
        despesaTotal: 0,
        historico: [],
        ultimaEtapaProcessada: 0
      };
    }

    // Se vier de saves antigos, garante campos
    JOGO.financas.receitaTotal ??= 0;
    JOGO.financas.despesaTotal ??= 0;
    JOGO.financas.historico ??= [];
    JOGO.financas.ultimaEtapaProcessada ??= 0;

    // Dinheiro base se não definido
    if (typeof JOGO.dinheiro !== "number") {
      JOGO.dinheiro = 5_000_000;
    }
  }

  function formatarMoeda(valor) {
    if (isNaN(valor)) valor = 0;
    return `${MOEDA} ${valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function adicionarAoHistorico(registro) {
    if (!existeJogo()) return;

    garantirEstruturaFinanceira();

    const agora = new Date();
    const etapa = JOGO.etapaAtual ?? 0;

    const entrada = {
      id: `${agora.getTime()}-${Math.random().toString(16).slice(2)}`,
      dataReal: agora.toISOString(),
      etapa,
      tipo: registro.tipo,            // "receita" | "despesa"
      categoria: registro.categoria,  // "Salários", "Patrocínio", etc.
      descricao: registro.descricao ?? "",
      valor: Number(registro.valor) || 0,
      saldoApos: JOGO.dinheiro
    };

    JOGO.financas.historico.unshift(entrada);

    if (JOGO.financas.historico.length > LIMITE_HISTORICO) {
      JOGO.financas.historico.length = LIMITE_HISTORICO;
    }

    // Atualiza totais simples
    if (entrada.tipo === "receita") {
      JOGO.financas.receitaTotal += entrada.valor;
    } else if (entrada.tipo === "despesa") {
      JOGO.financas.despesaTotal += entrada.valor;
    }

    atualizarTabelaHistorico();
  }

  // ==========================
  //   API PÚBLICA PRINCIPAL
  // ==========================

  function init() {
    if (!existeJogo()) return;
    garantirEstruturaFinanceira();
    inicializado = true;

    atualizarHUD();
    atualizarTabelaHistorico();

    console.info("[FinanceSystem] Inicializado.");
  }

  /** Retorna o saldo atual de caixa da equipe do jogador */
  function getSaldo() {
    if (!existeJogo()) return 0;
    return JOGO.dinheiro ?? 0;
  }

  /** Registra receita no caixa (patrocínio, prêmio, bônus etc.) */
  function registrarReceita(categoria, descricao, valor) {
    if (!existeJogo()) return;

    valor = Number(valor) || 0;
    if (valor <= 0) return;

    garantirEstruturaFinanceira();

    JOGO.dinheiro += valor;

    adicionarAoHistorico({
      tipo: "receita",
      categoria,
      descricao,
      valor
    });

    atualizarHUD();
  }

  /** Registra despesa no caixa (salário, custos de GP, upgrades…) */
  function registrarDespesa(categoria, descricao, valor) {
    if (!existeJogo()) return;

    valor = Number(valor) || 0;
    if (valor <= 0) return;

    garantirEstruturaFinanceira();

    JOGO.dinheiro -= valor;

    adicionarAoHistorico({
      tipo: "despesa",
      categoria,
      descricao,
      valor
    });

    atualizarHUD();
  }

  // ==========================
  //   CÁLCULOS DE CUSTOS
  // ==========================

  /** Calcula custo de salários (pilotos + funcionários) para UMA corrida */
  function calcularCustoSalariosPorCorrida() {
    if (!existeJogo()) return 0;
    garantirEstruturaFinanceira();

    const pilotos = JOGO.pilotosEquipe || [];
    const funcionarios = JOGO.funcionarios || [];

    const somaSalariosPilotos = pilotos.reduce((acc, p) => {
      const s = Number(p.salarioAnual ?? p.salario ?? 0);
      return acc + s;
    }, 0);

    const somaSalariosFuncionarios = funcionarios.reduce((acc, f) => {
      const s = Number(f.salarioAnual ?? f.salario ?? 0);
      return acc + s;
    }, 0);

    const totalAnual = somaSalariosPilotos + somaSalariosFuncionarios;

    if (totalAnual <= 0) return 0;

    return totalAnual / DIVISOR_SALARIO_POR_CORRIDA;
  }

  /** Custos fixos de um fim de semana (logística, operação, etc.) */
  function custoFixoDeFimDeSemana() {
    return CUSTO_FIXO_FIM_DE_SEMANA;
  }

  /**
   * Receitas de patrocínio para a corrida atual:
   * - fixa por GP
   * - bônus por pontos / pódio / vitória, se existir
   *
   * `resultadoGP` deve conter:
   * {
   *   pontosPiloto1: number,
   *   pontosPiloto2: number,
   *   posicaoMelhorCarro: number
   * }
   */
  function calcularReceitaPatrocinio(resultadoGP = {}) {
    if (!existeJogo()) return 0;

    const patrocinador = JOGO.patrocinador;
    if (!patrocinador) return 0;

    const {
      pagamentoPorCorrida = patrocinador.fixoPorCorrida ?? 0,
      bonusPorPonto = 0,
      bonusPorPodio = 0,
      bonusPorVitoria = 0
    } = patrocinador;

    let receita = 0;

    // Receita fixa por GP
    receita += Number(pagamentoPorCorrida) || 0;

    const p1 = Number(resultadoGP.pontosPiloto1 ?? 0);
    const p2 = Number(resultadoGP.pontosPiloto2 ?? 0);
    const totalPontos = p1 + p2;

    // Bônus por pontos marcados
    receita += totalPontos * (Number(bonusPorPonto) || 0);

    const melhorPos = Number(resultadoGP.posicaoMelhorCarro ?? 0);
    if (melhorPos > 0 && melhorPos <= 3) {
      // pódio
      receita += Number(bonusPorPodio) || 0;
    }
    if (melhorPos === 1) {
      // vitória
      receita += Number(bonusPorVitoria) || 0;
    }

    return receita;
  }

  /**
   * Prêmio da Fórmula 1 pela posição final – valor base simples,
   * você pode ajustar depois ou puxar de uma tabela real.
   */
  function calcularPremioResultadoGP(resultadoGP = {}) {
    const pos = Number(resultadoGP.posicaoMelhorCarro ?? 0);
    if (!pos || pos > 20) return 0;

    // Tabela base (você pode trocar por dados oficiais se quiser)
    const tabelaPremios = {
      1: 500_000,
      2: 350_000,
      3: 250_000,
      4: 180_000,
      5: 150_000,
      6: 120_000,
      7: 100_000,
      8: 80_000,
      9: 70_000,
      10: 60_000
      // 11+ nada
    };

    return tabelaPremios[pos] ?? 0;
  }

  // ==========================
  //   PROCESSO POR FIM DE SEMANA
  // ==========================

  /**
   * Chamar no INÍCIO do fim de semana de GP para debitar custos fixos.
   */
  function processarCustosInicioFimDeSemana() {
    if (!existeJogo()) return;
    garantirEstruturaFinanceira();

    const etapa = JOGO.etapaAtual ?? 0;
    if (JOGO.financas.ultimaEtapaProcessada >= etapa) {
      // evita aplicar 2x no mesmo GP, caso a função seja chamada novamente
      return;
    }

    const custoSalarios = calcularCustoSalariosPorCorrida();
    const custoFixo = custoFixoDeFimDeSemana();

    if (custoSalarios > 0) {
      registrarDespesa(
        "Salários",
        `Salários de pilotos e staff - GP ${etapa}`,
        custoSalarios
      );
    }

    registrarDespesa(
      "Custos Operacionais",
      `Custos fixos de operação - GP ${etapa}`,
      custoFixo
    );

    JOGO.financas.ultimaEtapaProcessada = etapa;
  }

  /**
   * Chamar ao FINAL da corrida para aplicar patrocínios e prêmios.
   *
   * `resultadoGP` = {
   *   pontosPiloto1,
   *   pontosPiloto2,
   *   posicaoMelhorCarro
   * }
   */
  function processarReceitasPosCorrida(resultadoGP = {}) {
    if (!existeJogo()) return;
    garantirEstruturaFinanceira();

    const etapa = JOGO.etapaAtual ?? 0;

    const receitaPatroc = calcularReceitaPatrocinio(resultadoGP);
    if (receitaPatroc > 0) {
      registrarReceita(
        "Patrocínio",
        `Patrocínio recebido - GP ${etapa}`,
        receitaPatroc
      );
    }

    const premioGP = calcularPremioResultadoGP(resultadoGP);
    if (premioGP > 0) {
      registrarReceita(
        "Prêmios",
        `Prêmio por resultado - GP ${etapa}`,
        premioGP
      );
    }
  }

  /**
   * Atalho: processa tudo de um GP de uma vez.
   * Pode ser chamado no fim do GP se você não quiser separar.
   */
  function processarFimDeSemanaCompleto(resultadoGP = {}) {
    processarCustosInicioFimDeSemana();
    processarReceitasPosCorrida(resultadoGP);
  }

  // ==========================
  //   ATUALIZAÇÃO DE HUD
  // ==========================

  function atualizarHUD() {
    if (!existeJogo()) return;

    const saldo = getSaldo();

    // HUD principal no topo (ex.: <span id="hud-saldo"></span>)
    const elSaldo = document.getElementById("hud-saldo");
    if (elSaldo) {
      elSaldo.textContent = formatarMoeda(saldo);
    }

    // Painel de finanças em alguma tela (ex.: <span id="painel-saldo-atual"></span>)
    const elPainel = document.getElementById("painel-saldo-atual");
    if (elPainel) {
      elPainel.textContent = formatarMoeda(saldo);
    }

    // Receita/Despesas acumuladas (se existirem)
    const elReceita = document.getElementById("painel-receita-total");
    if (elReceita && JOGO.financas) {
      elReceita.textContent = formatarMoeda(JOGO.financas.receitaTotal);
    }

    const elDespesa = document.getElementById("painel-despesa-total");
    if (elDespesa && JOGO.financas) {
      elDespesa.textContent = formatarMoeda(JOGO.financas.despesaTotal);
    }
  }

  function atualizarTabelaHistorico() {
    if (!existeJogo()) return;
    if (!JOGO.financas || !Array.isArray(JOGO.financas.historico)) return;

    const corpo = document.getElementById("tabela-financas-corpo");
    if (!corpo) return;

    corpo.innerHTML = "";

    JOGO.financas.historico.forEach(item => {
      const tr = document.createElement("tr");

      const dataEtapa = item.etapa
        ? `GP ${item.etapa}`
        : new Date(item.dataReal).toLocaleDateString("pt-BR");

      const tdData = document.createElement("td");
      tdData.textContent = dataEtapa;

      const tdTipo = document.createElement("td");
      tdTipo.textContent = item.tipo === "receita" ? "Receita" : "Despesa";
      tdTipo.classList.add(item.tipo === "receita" ? "fin-receita" : "fin-despesa");

      const tdCat = document.createElement("td");
      tdCat.textContent = item.categoria ?? "-";

      const tdDesc = document.createElement("td");
      tdDesc.textContent = item.descricao ?? "-";

      const tdValor = document.createElement("td");
      tdValor.textContent = formatarMoeda(item.valor);

      const tdSaldo = document.createElement("td");
      tdSaldo.textContent = formatarMoeda(item.saldoApos);

      tr.appendChild(tdData);
      tr.appendChild(tdTipo);
      tr.appendChild(tdCat);
      tr.appendChild(tdDesc);
      tr.appendChild(tdValor);
      tr.appendChild(tdSaldo);

      corpo.appendChild(tr);
    });
  }

  // ==========================
  //   RESUMO PARA OUTROS SISTEMAS
  // ==========================

  /**
   * Retorna um resumo simples para ser usado em relatórios, saves, etc.
   */
  function getResumoFinanceiro() {
    if (!existeJogo()) {
      return {
        saldo: 0,
        receitaTotal: 0,
        despesaTotal: 0
      };
    }

    garantirEstruturaFinanceira();

    return {
      saldo: JOGO.dinheiro,
      receitaTotal: JOGO.financas.receitaTotal,
      despesaTotal: JOGO.financas.despesaTotal
    };
  }

  // ==========================
  //   API EXPOSTA
  // ==========================

  return {
    init,
    getSaldo,
    registrarReceita,
    registrarDespesa,
    calcularCustoSalariosPorCorrida,
    custoFixoDeFimDeSemana,
    calcularReceitaPatrocinio,
    calcularPremioResultadoGP,
    processarCustosInicioFimDeSemana,
    processarReceitasPosCorrida,
    processarFimDeSemanaCompleto,
    atualizarHUD,
    atualizarTabelaHistorico,
    getResumoFinanceiro
  };
})();

/* Inicialização automática quando o DOM estiver pronto */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof FinanceSystem !== "undefined") {
    FinanceSystem.init();
  }
});
