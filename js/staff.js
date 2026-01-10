/* js/staff.js — Funcionários & Staff (funcional) */

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
    clearTimeout(window.__toastStaff);
    window.__toastStaff = setTimeout(() => (t.style.display = "none"), 2200);
  }

  function pct(v) {
    const n = Number(v || 0);
    const sign = n >= 0 ? "+" : "";
    return `${sign}${Math.round(n * 100)}%`;
  }

  function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

  function setBackLink() {
    const btn = $("btnBack");
    if (!btn) return;
    btn.onclick = () => {
      window.location.href = `lobby.html?userTeam=${encodeURIComponent(teamId)}`;
    };
  }

  function updateHeader() {
    $("pillTeam").textContent = `EQUIPE: ${teamId.toUpperCase()}`;
    $("kpiMoney").textContent = GS.formatMoney(state.career.money);
    $("kpiRep").textContent = String(Math.round(state.career.reputation));

    const hired = state.staff.hired;
    $("modPace").textContent = pct(hired.pace);
    $("modTire").textContent = pct(hired.tire);
    $("modPit").textContent = pct(hired.pit);
    $("modStrat").textContent = pct(hired.strat);

    $("pillSalary").textContent = `SALÁRIO / SEMANA: ${GS.formatMoney(calcWeeklyWage())}`;
  }

  function calcWeeklyWage() {
    const list = (state.staff.hired.list || []);
    return list.reduce((sum, p) => sum + (p.weeklyWage || 0), 0);
  }

  function canSeeOffer(offer) {
    const rep = Number(state.career.reputation || 0);
    const req = Number(offer.reputationReq || 0);
    return rep >= req;
  }

  function recomputeModsFromHired() {
    const list = state.staff.hired.list || [];
    let pace = 0, tire = 0, pit = 0, strat = 0;
    list.forEach((p) => {
      const m = p.mods || {};
      pace += Number(m.pace || 0);
      tire += Number(m.tire || 0);
      pit += Number(m.pit || 0);
      strat += Number(m.strat || 0);
    });

    // limita para evitar quebrar simulação futura
    state.staff.hired.pace = clamp(pace, -0.10, 0.25);
    state.staff.hired.tire = clamp(tire, -0.10, 0.25);
    state.staff.hired.pit = clamp(pit, -0.10, 0.25);
    state.staff.hired.strat = clamp(strat, -0.10, 0.25);
  }

  function clamp(v, a, b) {
    const n = Number(v || 0);
    return Math.max(a, Math.min(b, n));
  }

  function renderHiredList() {
    const listEl = $("hiredList");
    listEl.innerHTML = "";

    const list = state.staff.hired.list || [];
    if (!list.length) {
      const div = document.createElement("div");
      div.className = "meta";
      div.textContent = "Nenhum staff contratado ainda.";
      listEl.appendChild(div);
      return;
    }

    list.forEach((p) => {
      const item = document.createElement("div");
      item.className = "offer";
      item.style.cursor = "default";
      item.innerHTML = `
        <div class="row">
          <div class="name">${p.name}</div>
          <div class="tag">${p.role}</div>
        </div>
        <div class="meta">
          <b>Salário:</b> ${GS.formatMoney(p.weeklyWage)} / semana<br/>
          <b>Mods:</b> Pace ${pct(p.mods?.pace)} • Tire ${pct(p.mods?.tire)} • Pit ${pct(p.mods?.pit)} • Strat ${pct(p.mods?.strat)}
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  function renderOffers() {
    const listEl = $("offersList");
    listEl.innerHTML = "";

    const offers = (state.staff.offers || []).filter(canSeeOffer);
    if (!offers.length) {
      const div = document.createElement("div");
      div.className = "meta";
      div.textContent = "Sem ofertas disponíveis para sua reputação.";
      listEl.appendChild(div);
      selectedOfferId = null;
      return;
    }

    offers.forEach((p) => {
      const item = document.createElement("div");
      item.className = "offer" + (p.id === selectedOfferId ? " activeSel" : "");
      item.onclick = () => { selectedOfferId = p.id; renderOffers(); };
      item.innerHTML = `
        <div class="row">
          <div class="name">${p.name}</div>
          <div class="tag">${p.role}</div>
        </div>
        <div class="meta">
          <b>Salário:</b> ${GS.formatMoney(p.weeklyWage)} / semana • <b>Bônus:</b> ${GS.formatMoney(p.signingBonus)}<br/>
          <b>Mods:</b> Pace ${pct(p.mods?.pace)} • Tire ${pct(p.mods?.tire)} • Pit ${pct(p.mods?.pit)} • Strat ${pct(p.mods?.strat)}
        </div>
      `;
      listEl.appendChild(item);
    });

    if (!selectedOfferId) selectedOfferId = offers[0].id;
  }

  function hireSelected() {
    const offers = state.staff.offers || [];
    const offer = offers.find((x) => x.id === selectedOfferId);
    if (!offer) { toast("Selecione um staff válido."); return; }

    // paga bônus de assinatura
    if (Number(state.career.money || 0) < Number(offer.signingBonus || 0)) {
      toast("Dinheiro insuficiente para contratar.");
      return;
    }
    GS.addMoney(state, -(offer.signingBonus || 0));

    // contrata (permite vários)
    state.staff.hired.list = state.staff.hired.list || [];
    state.staff.hired.list.push(deepCopy(offer));

    // remove do mercado
    state.staff.offers = offers.filter((x) => x.id !== offer.id);

    recomputeModsFromHired();
    GS.addReputation(state, 0.5);

    state = GS.saveState(state);
    toast(`Contratado: ${offer.name}`);
    updateHeader();
    renderHiredList();
    renderOffers();
  }

  function payWeek() {
    const wage = calcWeeklyWage();
    if (wage <= 0) { toast("Sem salários para pagar."); return; }

    GS.addMoney(state, -wage);
    state.staff.lastWeekPaidAt = new Date().toISOString();

    // reputação cai um pouco se ficar sem dinheiro (simples)
    if (Number(state.career.money || 0) <= 0) GS.addReputation(state, -1);

    state = GS.saveState(state);
    toast("Salários semanais pagos.");
    updateHeader();
  }

  function fireAll() {
    const list = state.staff.hired.list || [];
    if (!list.length) { toast("Não há staff para dispensar."); return; }

    // penalidade simples: 1 semana de salário
    const penalty = calcWeeklyWage();
    GS.addMoney(state, -penalty);
    GS.addReputation(state, -1.5);

    // devolve para o mercado com bônus reduzido
    state.staff.offers = state.staff.offers || [];
    list.forEach((p) => {
      const back = deepCopy(p);
      back.signingBonus = Math.max(0, Math.floor((back.signingBonus || 0) * 0.4));
      state.staff.offers.push(back);
    });

    state.staff.hired.list = [];
    recomputeModsFromHired();

    state = GS.saveState(state);
    toast("Todos dispensados. Penalidade aplicada.");
    updateHeader();
    renderHiredList();
    renderOffers();
  }

  function bindButtons() {
    $("btnHire").onclick = hireSelected;
    $("btnPayWeek").onclick = payWeek;
    $("btnFireAll").onclick = fireAll;
  }

  // init
  setBackLink();
  bindButtons();
  recomputeModsFromHired();
  updateHeader();
  renderHiredList();
  renderOffers();
})();