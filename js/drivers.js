/* js/drivers.js — Mercado de Pilotos (funcional simples) */

(function(){
  const GS = window.F1M25 && window.F1M25.GameState;
  if (!GS) { alert("Erro: js/gameState.js não carregou."); return; }

  const teamId = GS.normalizeTeamId(GS.getQueryParam("userTeam") || "redbull");
  let state = GS.loadState(teamId);

  const $ = (id) => document.getElementById(id);

  let selYour = null;
  let selMarket = null;

  function toast(msg){
    const t = $("toast");
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__toastDrivers);
    window.__toastDrivers = setTimeout(() => (t.style.display="none"), 2200);
  }

  function setBack(){
    $("btnBack").onclick = () => {
      window.location.href = `lobby.html?userTeam=${encodeURIComponent(teamId)}`;
    };
  }

  function updateHeader(){
    $("pillTeam").textContent = `EQUIPE: ${teamId.toUpperCase()}`;
    $("pillMoney").textContent = `CAIXA: ${GS.formatMoney(state.career.money)}`;
  }

  function renderLists(){
    const your = state.drivers.yourDrivers || [];
    const market = (state.drivers.market || []).filter(x => x.available);

    const yourList = $("yourList");
    const marketList = $("marketList");

    yourList.innerHTML = "";
    marketList.innerHTML = "";

    if (!your.length){
      const d = document.createElement("div");
      d.className="meta";
      d.textContent="Sem pilotos na equipe.";
      yourList.appendChild(d);
    } else {
      your.forEach(p => {
        const item = document.createElement("div");
        item.className = "item" + (selYour === p.id ? " activeSel" : "");
        item.onclick = () => { selYour = p.id; renderLists(); };
        item.innerHTML = `
          <div class="row">
            <div class="name">${p.name}</div>
            <div class="tag">OVR ${p.overall}</div>
          </div>
          <div class="meta">
            <b>Salário:</b> ${GS.formatMoney(p.salaryWeekly)}/sem •
            <b>Contrato:</b> até ${p.contractEnds}
          </div>
        `;
        yourList.appendChild(item);
      });
      if (!selYour) selYour = your[0].id;
    }

    if (!market.length){
      const d = document.createElement("div");
      d.className="meta";
      d.textContent="Sem pilotos disponíveis.";
      marketList.appendChild(d);
    } else {
      market.forEach(p => {
        const item = document.createElement("div");
        item.className = "item" + (selMarket === p.id ? " activeSel" : "");
        item.onclick = () => { selMarket = p.id; renderLists(); };
        item.innerHTML = `
          <div class="row">
            <div class="name">${p.name}</div>
            <div class="tag">OVR ${p.overall}</div>
          </div>
          <div class="meta">
            <b>Salário:</b> ${GS.formatMoney(p.salaryWeekly)}/sem •
            <b>Buyout:</b> ${GS.formatMoney(p.buyout)}
          </div>
        `;
        marketList.appendChild(item);
      });
      if (!selMarket) selMarket = market[0].id;
    }
  }

  function renewSelected(){
    const your = state.drivers.yourDrivers || [];
    const p = your.find(x => x.id === selYour);
    if (!p){ toast("Selecione um piloto da equipe."); return; }

    // custo simples: 2 semanas de salário
    const cost = Math.floor((p.salaryWeekly || 0) * 2);
    if (state.career.money < cost){ toast("Dinheiro insuficiente para renovar."); return; }

    GS.addMoney(state, -cost);
    p.contractEnds = Math.min(2030, (p.contractEnds || 2025) + 1);
    GS.addReputation(state, 0.2);

    state = GS.saveState(state);
    toast("Contrato renovado (+1 ano).");
    updateHeader();
    renderLists();
  }

  function releaseSelected(){
    const your = state.drivers.yourDrivers || [];
    const idx = your.findIndex(x => x.id === selYour);
    if (idx < 0){ toast("Selecione um piloto da equipe."); return; }

    // penalidade simples: 1 semana de salário
    const p = your[idx];
    const penalty = Math.floor(p.salaryWeekly || 0);
    GS.addMoney(state, -penalty);
    GS.addReputation(state, -0.5);

    your.splice(idx, 1);
    state.drivers.yourDrivers = your;
    selYour = your[0]?.id || null;

    state = GS.saveState(state);
    toast("Piloto liberado (multa aplicada).");
    updateHeader();
    renderLists();
  }

  function hireSelected(){
    const market = state.drivers.market || [];
    const m = market.find(x => x.id === selMarket && x.available);
    if (!m){ toast("Selecione um piloto disponível."); return; }

    const your = state.drivers.yourDrivers || [];
    if (your.length >= 2){
      toast("Sua equipe já tem 2 pilotos. Libere um antes de contratar.");
      return;
    }

    const cost = Math.floor(m.buyout || 0);
    if (state.career.money < cost){ toast("Dinheiro insuficiente para comprar o contrato."); return; }

    GS.addMoney(state, -cost);
    GS.addReputation(state, 0.4);

    your.push({
      id: "y_" + m.id,
      name: m.name,
      overall: m.overall,
      salaryWeekly: m.salaryWeekly,
      contractEnds: 2026
    });
    m.available = false;

    state.drivers.yourDrivers = your;
    state.drivers.market = market;

    state = GS.saveState(state);
    toast("Piloto contratado!");
    updateHeader();
    renderLists();
  }

  function bind(){
    $("btnRenew").onclick = renewSelected;
    $("btnRelease").onclick = releaseSelected;
    $("btnHire").onclick = hireSelected;
  }

  // init
  setBack();
  bind();
  updateHeader();
  renderLists();
})();