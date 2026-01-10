/* js/staff.js - Funcionários (offline) */

(function () {
  const GS = window.F1M25 && window.F1M25.GameState;
  if (!GS) {
    alert("GameState não encontrado. Verifique se js/gameState.js está carregando antes.");
    return;
  }

  const teamId = GS.normalizeTeamId(GS.getQueryParam("userTeam") || GS.getQueryParam("team") || null);
  let state = GS.loadState(teamId);

  const el = (id) => document.getElementById(id);

  function toast(msg) {
    const t = el("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__toastTimer2);
    window.__toastTimer2 = setTimeout(() => (t.style.display = "none"), 2200);
  }

  function calcWeeklyWages() {
    const hired = state.staff.hired || [];
    return hired.reduce((sum, p) => sum + (p.wageWeekly || 0), 0);
  }

  function effectsToText(effects) {
    if (!effects) return "Sem efeitos.";
    const parts = [];
    for (const [k, v] of Object.entries(effects)) {
      const pct = Math.round(v * 100);
      let label = k;
      if (k === "setupGain") label = "Ganho de Setup";
      if (k === "tyreWear") label = "Desgaste de pneus";
      if (k === "reliability") label = "Confiabilidade";
      if (k === "pitDecision") label = "Decisão de Pit";
      if (k === "weatherRead") label = "Leitura de Clima";
      if (k === "aeroEff") label = "Eficiência Aero";
      if (k === "dragEff") label = "Eficiência Drag";
      if (k === "pitTime") label = "Tempo de Pit";
      if (k === "pitError") label = "Erro de Pit";
      const sign = pct > 0 ? "+" : "";
      parts.push(`${label}: ${sign}${pct}%`);
    }
    return parts.join(" • ");
  }

  function renderHeader() {
    el("teamBadge").textContent = `Equipe: ${state.roster.teamId.toUpperCase()}`;
    el("wagePill").textContent = `-${GS.formatMoney(calcWeeklyWages())} / semana`;
    el("offersPill").textContent = `${(state.staff.offers || []).length} ofertas`;
  }

  function staffCard(p, mode) {
    const wrap = document.createElement("div");
    wrap.className = "item";

    const top = document.createElement("div");
    top.className = "row";

    const left = document.createElement("div");
    left.className = "title";
    left.innerHTML = `
      <span>${p.name || "Staff"}</span>
      <span class="role">${p.role || "Função"}</span>
    `;

    const right = document.createElement("div");
    right.className = "pill good";
    right.textContent = `Overall ${Math.round(p.rating || 0)}`;

    top.appendChild(left);
    top.appendChild(right);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div><b>Salário semanal:</b> ${GS.formatMoney(p.wageWeekly || 0)}</div>
      ${mode === "offer" ? `<div><b>Bônus assinatura:</b> ${GS.formatMoney(p.signingBonus || 0)}</div>` : ""}
      <div><b>Efeitos:</b> ${effectsToText(p.effects)}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    if (mode === "hired") {
      const btn = document.createElement("button");
      btn.className = "btn btn-danger";
      btn.textContent = "Demitir";
      btn.onclick = () => fireStaff(p.id);
      actions.appendChild(btn);
    } else {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Contratar";
      btn.onclick = () => hireStaff(p.id);
      actions.appendChild(btn);
    }

    wrap.appendChild(top);
    wrap.appendChild(meta);
    wrap.appendChild(actions);
    return wrap;
  }

  function renderLists() {
    const hiredList = el("hiredList");
    const offersList = el("offersList");
    hiredList.innerHTML = "";
    offersList.innerHTML = "";

    const hired = state.staff.hired || [];
    const offers = state.staff.offers || [];

    if (!hired.length) {
      const empty = document.createElement("div");
      empty.className = "meta";
      empty.textContent = "Sem funcionários contratados.";
      hiredList.appendChild(empty);
    } else {
      hired.forEach((p) => hiredList.appendChild(staffCard(p, "hired")));
    }

    if (!offers.length) {
      const empty = document.createElement("div");
      empty.className = "meta";
      empty.textContent = "Sem ofertas no momento.";
      offersList.appendChild(empty);
    } else {
      offers.forEach((p) => offersList.appendChild(staffCard(p, "offer")));
    }
  }

  function canHireRole(role) {
    // Regra simples: 1 por função principal (você pode alterar depois)
    const hired = state.staff.hired || [];
    return !hired.some((h) => h.role === role);
  }

  function hireStaff(id) {
    const offers = state.staff.offers || [];
    const idx = offers.findIndex((o) => o.id === id);
    if (idx < 0) return;

    const p = offers[idx];

    if (!canHireRole(p.role)) {
      toast(`Você já tem alguém no cargo "${p.role}". Demita antes para substituir.`);
      return;
    }

    const cost = Math.floor(p.signingBonus || 0);
    if (state.career.money < cost) {
      toast("Dinheiro insuficiente para bônus de assinatura.");
      return;
    }

    GS.addMoney(state, -cost);

    const hired = state.staff.hired || [];
    const newHire = Object.assign({}, p, { hiredAt: new Date().toISOString() });
    delete newHire.signingBonus;
    hired.push(newHire);

    offers.splice(idx, 1);

    state.staff.hired = hired;
    state.staff.offers = offers;

    state = GS.saveState(state);
    renderHeader();
    renderLists();
    toast(`Contratado: ${p.name} (${p.role})`);
  }

  function fireStaff(id) {
    const hired = state.staff.hired || [];
    const idx = hired.findIndex((h) => h.id === id);
    if (idx < 0) return;

    const p = hired[idx];

    // multa simples: 1 semana de salário
    const penalty = Math.floor(p.wageWeekly || 0);
    GS.addMoney(state, -penalty);

    // volta pro pool como oferta
    const backOffer = Object.assign({}, p, {
      signingBonus: Math.floor((p.wageWeekly || 0) * 3), // 3 semanas
      rating: Math.max(40, Math.round((p.rating || 60) - 1)),
    });
    delete backOffer.hiredAt;

    hired.splice(idx, 1);
    state.staff.hired = hired;

    state.staff.offers = state.staff.offers || [];
    state.staff.offers.push(backOffer);

    state = GS.saveState(state);
    renderHeader();
    renderLists();
    toast(`Demitido: ${p.name}. Multa aplicada.`);
  }

  renderHeader();
  renderLists();

  // mantém contexto no voltar
  const back = document.getElementById("backBtn");
  if (back) back.href = `lobby.html?userTeam=${encodeURIComponent(state.roster.teamId)}`;
})();