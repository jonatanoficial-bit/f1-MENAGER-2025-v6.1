/* =========================================================
   F1 MANAGER 2025 — SPONSORS UI SYSTEM (v6.1)
   Requer: economySystem.js (window.F1MEconomy)
   ========================================================= */

(function () {
  "use strict";

  function $(sel, root = document) { return root.querySelector(sel); }
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }

  function formatMoneyEUR(n) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `€ ${Math.round(n).toLocaleString("pt-BR")}`;
    }
  }

  function ensureDeps() {
    if (!window.F1MEconomy) {
      console.error("SponsorSystem: economySystem.js não carregado.");
      return false;
    }
    return true;
  }

  function render(container) {
    if (!ensureDeps()) return;

    const state = window.F1MEconomy.getState();
    const offers = window.F1MEconomy.genOffers();
    const mods = window.F1MEconomy.getModifiers();

    container.innerHTML = "";

    const header = el("div", "sponsor-panel__header");
    header.innerHTML = `
      <div class="sponsor-kpis">
        <div class="kpi"><div class="kpi__label">Caixa</div><div class="kpi__value">${formatMoneyEUR(state.economy.cash)}</div></div>
        <div class="kpi"><div class="kpi__label">Reputação</div><div class="kpi__value">${Math.round(state.economy.reputation)} / 100</div></div>
        <div class="kpi"><div class="kpi__label">Exposição</div><div class="kpi__value">${Math.round(state.economy.exposure)} / 100</div></div>
        <div class="kpi"><div class="kpi__label">Marketing</div><div class="kpi__value">${Math.round(state.staff.marketing.level)} / 100</div></div>
        <div class="kpi"><div class="kpi__label">Boost ofertas</div><div class="kpi__value">x${mods.sponsorOfferMul.toFixed(2)}</div></div>
      </div>
      <div class="sponsor-note">
        Contratos pagam por GP, com bônus/penalidade no fim. Metas variam por equipe, reputação e marketing.
      </div>
    `;

    const active = el("div", "sponsor-panel__block");
    active.innerHTML = `<h3 class="sponsor-panel__title">Contratos ativos</h3>`;
    const activeList = el("div", "sponsor-list");

    if (!state.sponsors.active.length) {
      const empty = el("div", "sponsor-empty");
      empty.textContent = "Nenhum contrato ativo. Assine ofertas abaixo para iniciar fluxo de caixa.";
      activeList.appendChild(empty);
    } else {
      state.sponsors.active.forEach(c => {
        activeList.appendChild(contractCard(c, { active: true }));
      });
    }
    active.appendChild(activeList);

    const offersBlock = el("div", "sponsor-panel__block");
    offersBlock.innerHTML = `<h3 class="sponsor-panel__title">Ofertas disponíveis (Rodada ${state.season.round})</h3>`;
    const offerList = el("div", "sponsor-list");

    offers.forEach(o => {
      offerList.appendChild(contractCard(o, { active: false }));
    });

    offersBlock.appendChild(offerList);

    container.appendChild(header);
    container.appendChild(active);
    container.appendChild(offersBlock);

    bindActions(container);
  }

  function contractCard(c, { active }) {
    const card = el("div", `sponsor-card ${active ? "is-active" : ""}`);
    const badge = c.type === "MASTER" ? "Máster" : c.type === "OFFICIAL" ? "Oficial" : "Bônus";

    const objective = c.objective
      ? `${c.objective.label}: <strong>${c.objective.target}</strong>`
      : "Meta: —";

    const racesLeft = active ? `<div class="meta">Restante: <strong>${c.racesLeft}</strong> GPs</div>` : `<div class="meta">Duração: <strong>${c.durationRaces}</strong> GPs</div>`;

    card.innerHTML = `
      <div class="sponsor-card__top">
        <div class="badge">${badge}</div>
        <div class="name">${c.name}</div>
      </div>

      <div class="sponsor-card__mid">
        <div class="meta">Valor anual: <strong>${formatMoneyEUR(c.annualValue)}</strong></div>
        <div class="meta">Pagamento/GP: <strong>${formatMoneyEUR(c.payPerRace)}</strong></div>
        ${racesLeft}
        <div class="meta">${objective}</div>
        <div class="meta">Bônus: <strong>${formatMoneyEUR(c.bonus)}</strong> • Penalidade: <strong>${formatMoneyEUR(c.penalty)}</strong></div>
      </div>

      <div class="sponsor-card__actions">
        ${active
          ? `<button class="btn-mini btn-mini--ghost" type="button" data-action="details" data-id="${c.id}">Detalhes</button>`
          : `<button class="btn-mini" type="button" data-action="sign" data-id="${c.id}">Assinar</button>`
        }
      </div>
    `;
    return card;
  }

  function bindActions(root) {
    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (!window.F1MEconomy) return;

      if (action === "sign") {
        const offers = window.F1MEconomy.genOffers();
        const offer = offers.find(o => o.id === id);
        if (!offer) return alert("Oferta inválida.");

        const res = window.F1MEconomy.signContract(offer);
        if (!res.ok) return alert(res.reason || "Não foi possível assinar.");
        alert("Contrato assinado com sucesso.");
        render(root);
      }

      if (action === "details") {
        alert("Detalhes avançados (histórico, progresso e cláusulas) podem ser exibidos aqui.");
      }
    });
  }

  // CSS mínimo embutido (não quebra seu layout existente)
  function injectMiniCSS() {
    if ($("#sponsor-mini-css")) return;
    const style = el("style");
    style.id = "sponsor-mini-css";
    style.textContent = `
      .sponsor-panel__header{margin-top:18px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(0,0,0,.35);backdrop-filter: blur(8px);}
      .sponsor-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;}
      .kpi{padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);}
      .kpi__label{font-size:12px;opacity:.75}
      .kpi__value{font-size:14px;font-weight:700}
      .sponsor-note{margin-top:10px;opacity:.85;font-size:12px}
      .sponsor-panel__block{margin-top:16px}
      .sponsor-panel__title{margin:0 0 10px 0;font-size:14px;letter-spacing:.04em;text-transform:uppercase;opacity:.9}
      .sponsor-list{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:12px}
      .sponsor-card{padding:12px;border-radius:16px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.10);backdrop-filter: blur(8px)}
      .sponsor-card.is-active{border-color: rgba(0,180,255,.35)}
      .sponsor-card__top{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .badge{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}
      .name{font-weight:800;font-size:13px}
      .sponsor-card__mid{margin-top:10px;display:grid;gap:6px;font-size:12px;opacity:.92}
      .meta strong{font-weight:800}
      .sponsor-card__actions{margin-top:10px;display:flex;justify-content:flex-end}
      .btn-mini{border:0;border-radius:999px;padding:8px 12px;background:rgba(0,180,255,.95);color:#fff;font-weight:800;cursor:pointer}
      .btn-mini--ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}
      .sponsor-empty{opacity:.85;font-size:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
      @media (max-width: 1100px){.sponsor-kpis{grid-template-columns:repeat(2,minmax(140px,1fr));}.sponsor-list{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  const SponsorSystem = {
    renderInto: (selectorOrEl) => {
      injectMiniCSS();
      const container = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!container) return console.error("SponsorSystem: container não encontrado.");
      render(container);
    }
  };

  window.SponsorSystem = SponsorSystem;
})();
