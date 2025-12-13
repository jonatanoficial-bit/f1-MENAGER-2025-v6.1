/* ============================================================
   CALENDAR SYSTEM — F1 SEASON 2025 (v6.1+)
   - Mantém seu comportamento atual:
     • renderCalendario()
     • selecionarGP(etapa) -> atualiza HUD e troca tela
   - ADICIONA somente a ligação:
     • Etapa (JOGO.etapaAtual) => round da economia/contrato
     • Espelha também em f1m2025_season_state (para páginas separadas)
   ============================================================ */

const CalendarSystem = (() => {

  // Lista oficial dos 24 GP (mantida)
  const GPs = [
    "Bahrain", "Saudi Arabia", "Australia", "Japan", "China",
    "Miami", "Emilia-Romagna", "Monaco", "Canada", "Spain",
    "Austria", "United Kingdom", "Hungary", "Belgium", "Netherlands",
    "Italy", "Azerbaijan", "Singapore", "USA", "Mexico",
    "Brazil", "Las Vegas", "Qatar", "Abu Dhabi"
  ];

  // opcional: trackKey (se você quiser usar depois para navegação por páginas)
  // Não quebra nada se não usar.
  const TRACK_KEYS = [
    "bahrain", "saudiarabia", "australia", "japan", "china",
    "miami", "imola", "monaco", "canada", "spain",
    "austria", "unitedkingdom", "hungary", "belgium", "netherlands",
    "italy", "azerbaijan", "singapore", "usa", "mexico",
    "brazil", "lasvegas", "qatar", "abudhabi"
  ];

  function safeGet(id) {
    try { return document.getElementById(id); } catch { return null; }
  }

  function loadSeasonState() {
    try {
      const raw = localStorage.getItem("f1m2025_season_state");
      if (!raw) return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
      const obj = JSON.parse(raw);
      return Object.assign({ version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} }, obj);
    } catch {
      return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
    }
  }

  function saveSeasonState(patch) {
    try {
      const base = loadSeasonState();
      const next = Object.assign({}, base, patch || {});
      // merge leve para current
      if (patch && patch.current) next.current = Object.assign({}, base.current || {}, patch.current || {});
      localStorage.setItem("f1m2025_season_state", JSON.stringify(next));
      return next;
    } catch {
      return null;
    }
  }

  // ✅ LIGAÇÃO: Etapa do calendário => round da economia/contrato
  function syncRoundToEconomy(etapa) {
    // 1) Atualiza economia/contrato (se existir)
    if (typeof window.F1MEconomy !== "undefined" && typeof window.F1MEconomy.load === "function") {
      const st = window.F1MEconomy.load();
      if (st && st.season) {
        st.season.round = etapa;
        // mantém 2025 por padrão (ajuste quando você implementar troca de ano)
        if (!st.season.year) st.season.year = 2025;
        if (!st.season.racesTotal) st.season.racesTotal = 24;

        window.F1MEconomy.save(st);
      }
    }

    // 2) Espelha também no season_state usado por páginas separadas (practice/qualifying/race)
    const gpName = GPs[etapa - 1] || "";
    const trackKey = TRACK_KEYS[etapa - 1] || "";

    saveSeasonState({
      current: {
        year: 2025,
        round: etapa,
        gp: gpName,
        track: trackKey,
        updatedAt: Date.now()
      }
    });

    // 3) Mantém compatibilidade antiga (se você ainda usar)
    try { localStorage.setItem("F1M_round", String(etapa)); } catch {}
    try { localStorage.setItem("f1m2025_round", String(etapa)); } catch {}
  }

  // Renderiza a lista (mantida, só adiciona guardas)
  function renderCalendario() {
    const box = safeGet("calendarioLista");
    if (!box) return;

    box.innerHTML = "";

    // garante JOGO e etapaAtual
    if (typeof window.JOGO === "undefined") window.JOGO = {};
    if (!window.JOGO.etapaAtual) window.JOGO.etapaAtual = 1;

    GPs.forEach((gp, index) => {
      const etapa = index + 1;
      let classe = "gp-futuro";

      if (window.JOGO.etapaAtual > etapa) classe = "gp-concluido";
      if (window.JOGO.etapaAtual === etapa) classe = "gp-proximo";

      box.innerHTML += `
        <div class="gp-card ${classe}" onclick="CalendarSystem.selecionarGP(${etapa})">
          <h3>${etapa}. ${gp}</h3>
        </div>
      `;
    });
  }

  // Quando o jogador clica num GP (mantida, com ligação adicionada)
  function selecionarGP(etapa) {
    if (typeof window.JOGO === "undefined") window.JOGO = {};
    window.JOGO.etapaAtual = etapa;

    const hudEtapa = safeGet("hud-etapa");
    if (hudEtapa) hudEtapa.textContent = etapa;

    // ✅ NOVO: sincroniza round para contrato/economia e season_state
    syncRoundToEconomy(etapa);

    // mantém seu fluxo atual
    if (typeof window.MenuSystem !== "undefined" && typeof window.MenuSystem.mostrarTela === "function") {
      window.MenuSystem.mostrarTela("telaCorrida");
    }
  }

  return {
    renderCalendario,
    selecionarGP
  };

})();

/* Auto-render ao abrir o calendário (mantido) */
document.addEventListener("DOMContentLoaded", () => {
  if (typeof CalendarSystem !== "undefined") {
    CalendarSystem.renderCalendario();

    // sync inicial (útil se o jogador abrir o calendário no meio)
    try {
      if (typeof window.JOGO !== "undefined" && window.JOGO.etapaAtual) {
        // não força tela; só garante round consistente
        // (não altera jogabilidade)
        const etapa = Number(window.JOGO.etapaAtual) || 1;
        // chama internamente via seleção “silenciosa”
        // reaproveita a função privada chamando selecionarGP só se você quiser mudar tela
        // aqui: apenas espelha sem navegar
        const gpName = CalendarSystem && CalendarSystem.renderCalendario ? null : null;
        // espelha round para economia
        // (sem tocar UI)
        if (typeof window.F1MEconomy !== "undefined") {
          const st = window.F1MEconomy.load();
          if (st && st.season) { st.season.round = etapa; window.F1MEconomy.save(st); }
        }
      }
    } catch {}
  }
});
