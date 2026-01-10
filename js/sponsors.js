/* js/sponsors.js - Patrocínios (offline) */

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
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => (t.style.display = "none"), 2200);
  }

  function tierClass(tier) {
    const v = String(tier || "").toLowerCase();
    if (v.includes("princ")) return "principal";
    if (v.includes("sec")) return "secundario";
    return "apoio";
  }

  function calcWeeklyIncome() {
    const active = state.sponsors.active || [];
    return active.reduce((sum, s) => sum + (s.weeklyPay || 0), 0);
  }

  function renderHeader() {
    el("teamBadge").textContent = `Equipe: ${state.roster.teamId.toUpperCase()}`;
    el("moneyVal").textContent = GS.formatMoney(state.career.money);
    el("weeklyIncomePill").textContent = `+${GS.formatMoney(calcWeeklyIncome())} / semana`;

    const offersCount = (state.sponsors.offers || []).length;
    el("offersPill").textContent = `${offersCount} ofertas`;
  }

  function sponsorCard(s, mode) {
    const objTxt = GS.objectiveText(s.objective);
    const tier = s.tier || "Apoio";
    const cls = tierClass(tier);

    const wrap = document.createElement("div");
    wrap.className = "item";

    const top = document.createElement("div");
    top.className = "row";

    const left = document.createElement("div");
    left.className = "title";
    left.innerHTML = `
      <span>${s.name || "Patrocinador"}</span>
      <span class="tier ${cls}">${tier}</span>
    `;

    const right = document.createElement("div");
    right.className = "pill good";
    right.textContent = `+${GS.formatMoney(s.weeklyPay || 0)}/sem`;

    top.appendChild(left);
    top.appendChild(right);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div><b>Bônus assinatura:</b> ${GS.formatMoney(s.signingBonus || 0)}</div>
      <div><b>Objetivo:</b> ${objTxt}</div>
      <div><b>Prestígio:</b> ${Math.round(s.prestige || 0)}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    if (mode === "active") {
      const btn = document.createElement("button");
      btn.className = "btn btn-danger";
      btn.textContent = "Encerrar";
      btn.onclick = () => terminateSponsor(s.id);
      actions.appendChild(btn);
    } else {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Assinar";
      btn.onclick = () => acceptOffer(s.id);
      actions.appendChild(btn);
    }

    wrap.appendChild(top);
    wrap.appendChild(meta);
    wrap.appendChild(actions);
    return wrap;
  }

  function renderLists() {
    const activeList = el("activeList");
    const offersList = el("offersList");

    activeList.innerHTML = "";
    offersList.innerHTML = "";

    const active = state.sponsors.active || [];
    const offers = state.sponsors.offers || [];

    if (!active.length) {
      const empty = document.createElement("div");
      empty.className = "meta";
      empty.textContent = "Nenhum patrocinador ativo. Assine uma oferta ao lado.";
      activeList.appendChild(empty);
    } else {
      active.forEach((s) => activeList.appendChild(sponsorCard(s, "active")));
    }

    if (!offers.length) {
      const empty = document.createElement("div");
      empty.className = "meta";
      empty.textContent = "Sem ofertas no momento.";
      offersList.appendChild(empty);
    } else {
      offers.forEach((s) => offersList.appendChild(sponsorCard(s, "offer")));
    }
  }

  function acceptOffer(offerId) {
    const offers = state.sponsors.offers || [];
    const idx = offers.findIndex((o) => o.id === offerId);
    if (idx < 0) return;

    const offer = offers[idx];

    // regra simples: máximo 3 patrocinadores ativos (1 principal + 2 secundários/apoio)
    const active = state.sponsors.active || [];
    if (active.length >= 3) {
      toast("Limite de 3 patrocinadores ativos. Encerre um para assinar outro.");
      return;
    }

    // paga bônus de assinatura
    GS.addMoney(state, offer.signingBonus || 0);

    // move para ativo (com createdAt)
    const signed = Object.assign({}, offer, { createdAt: new Date().toISOString() });
    active.push(signed);

    // remove do pool
    offers.splice(idx, 1);

    state.sponsors.active = active;
    state.sponsors.offers = offers;

    state = GS.saveState(state);
    renderHeader();
    renderLists();
    toast(`Contrato assinado com ${offer.name}!`);
  }

  function terminateSponsor(activeId) {
    const active = state.sponsors.active || [];
    const idx = active.findIndex((a) => a.id === activeId);
    if (idx < 0) return;

    const s = active[idx];

    // penalidade simples por encerrar: -1 semana do pagamento
    const penalty = Math.floor((s.weeklyPay || 0) * 1);
    GS.addMoney(state, -penalty);

    // opcional: volta como oferta piorada
    const backOffer = Object.assign({}, s, {
      prestige: Math.max(10, Math.round((s.prestige || 40) - 8)),
      signingBonus: Math.max(0, Math.round((s.signingBonus || 0) * 0.35)),
    });
    delete backOffer.createdAt;

    active.splice(idx, 1);
    state.sponsors.active = active;

    // coloca de volta no pool
    state.sponsors.offers = state.sponsors.offers || [];
    state.sponsors.offers.push(backOffer);

    state = GS.saveState(state);
    renderHeader();
    renderLists();
    toast(`Contrato encerrado: ${s.name}. Penalidade aplicada.`);
  }

  // Inicial
  renderHeader();
  renderLists();

  // Atualiza o link de voltar com userTeam pra manter contexto
  const back = document.getElementById("backBtn");
  if (back) back.href = `lobby.html?userTeam=${encodeURIComponent(state.roster.teamId)}`;
})();