/* js/sponsors.js — Patrocínios & Marca (funcional) */

(function () {
  const GS = window.F1M25 && window.F1M25.GameState;
  if (!GS) { alert("Erro: js/gameState.js não carregou."); return; }

  const teamId = GS.normalizeTeamId(GS.getQueryParam("userTeam") || "redbull");
  let state = GS.loadState(teamId);

  const $ = (id) => document.getElementById(id);

  let selectedOfferId = null;

  function toast(msg) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window.__toastSponsors);
    window.__toastSponsors = setTimeout(() => (t.style.display = "none"), 2200);
  }

  function setBackLink() {
    const btn = $("btnBack");
    if (!btn) return;
    btn.onclick = () => {
      window.location.href = `lobby.html?userTeam=${encodeURIComponent(teamId)}`;
    };
  }

  function updateHeader() {
    $("pillTeam").textContent = `EQUIPE: ${teamId.toUpperCase()}`;
    $("pillRep").textContent = `REPUTAÇÃO: ${Math.round(state.career.reputation)}`;
    $("kpiMoney").textContent = GS.formatMoney(state.career.money);
    $("kpiRep").textContent = String(Math.round(state.career.reputation));

    const active = state.sponsors.active;
    if (!active) {
      $("activeName").textContent = "Sem contrato";
      $("activeMeta").textContent = "Assine um patrocinador para começar.";
    } else {
      $("activeName").textContent = `${active.name} (${active.tier})`;
      $("activeMeta").innerHTML =
        `+ ${GS.formatMoney(active.weeklyPay)}/semana • Bônus: ${GS.formatMoney(active.signingBonus)}<br/>` +
        `<b>Objetivo:</b> ${active.objective}`;
    }
  }

  function canSeeOffer(offer) {
    const rep = Number(state.career.reputation || 0);
    const req = Number(offer.reputationReq || 0);
    return rep >= req;
  }

  function renderOffers() {
    const list = $("offersList");
    list.innerHTML = "";

    const offers = (state.sponsors.offers || []).filter(canSeeOffer);

    if (!offers.length) {
      const div = document.createElement("div");
      div.className = "meta";
      div.textContent = "Sem ofertas disponíveis para sua reputação no momento.";
      list.appendChild(div);
      selectedOfferId = null;
      return;
    }

    offers.forEach((o) => {
      const item = document.createElement("div");
      item.className = "offer" + (o.id === selectedOfferId ? " activeSel" : "");
      item.onclick = () => { selectedOfferId = o.id; renderOffers(); };
      item.innerHTML = `
        <div class="row">
          <div class="name">${o.name}</div>
          <div class="tag">${o.tier}</div>
        </div>
        <div class="meta">
          <b>Semanal:</b> ${GS.formatMoney(o.weeklyPay)} •
          <b>Bônus:</b> ${GS.formatMoney(o.signingBonus)}<br/>
          <b>Objetivo:</b> ${o.objective}
        </div>
      `;
      list.appendChild(item);
    });

    if (!selectedOfferId) selectedOfferId = offers[0].id;
  }

  function signSelected() {
    const offers = state.sponsors.offers || [];
    const offer = offers.find((x) => x.id === selectedOfferId);
    if (!offer) { toast("Selecione uma oferta válida."); return; }

    if (state.sponsors.active) {
      toast("Você já tem um contrato ativo. Encerre antes de assinar outro.");
      return;
    }

    // assina: ativa + paga bônus
    state.sponsors.active = deepCopy(offer);
    GS.addMoney(state, offer.signingBonus || 0);

    // remove do pool
    state.sponsors.offers = offers.filter((x) => x.id !== offer.id);

    state = GS.saveState(state);
    toast(`Contrato assinado com ${offer.name}!`);
    updateHeader();
    renderOffers();
  }

  function payWeek() {
    const active = state.sponsors.active;
    if (!active) { toast("Sem contrato ativo."); return; }

    GS.addMoney(state, active.weeklyPay || 0);
    state.sponsors.lastWeekPaidAt = new Date().toISOString();

    // bônus leve de reputação por manter contrato
    GS.addReputation(state, 0.5);

    state = GS.saveState(state);
    toast("Pagamento semanal recebido.");
    updateHeader();
  }

  function cancelContract() {
    const active = state.sponsors.active;
    if (!active) { toast("Sem contrato ativo."); return; }

    // penalidade: perde 1 semana
    GS.addMoney(state, -(active.weeklyPay || 0));
    GS.addReputation(state, -2);

    // volta pro pool como oferta (com bônus reduzido)
    const back = deepCopy(active);
    back.signingBonus = Math.max(0, Math.floor((back.signingBonus || 0) * 0.35));
    state.sponsors.offers = state.sponsors.offers || [];
    state.sponsors.offers.push(back);

    state.sponsors.active = null;

    state = GS.saveState(state);
    toast("Contrato encerrado. Penalidade aplicada.");
    updateHeader();
    renderOffers();
  }

  function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

  function bindButtons() {
    $("btnSign").onclick = signSelected;
    $("btnPayWeek").onclick = payWeek;
    $("btnCancel").onclick = cancelContract;
  }

  // init
  setBackLink();
  bindButtons();
  updateHeader();
  renderOffers();
})();