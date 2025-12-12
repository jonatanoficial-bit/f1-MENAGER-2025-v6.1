/* =========================================================
   F1 MANAGER 2025 — STAFF UI SYSTEM (v6.1)
   Requer: economySystem.js (window.F1MEconomy)
   ========================================================= */

(function () {
  "use strict";

  function $(sel, root = document) { return root.querySelector(sel); }
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }

  function ensureDeps() {
    if (!window.F1MEconomy) {
      console.error("StaffSystem: economySystem.js não carregado.");
      return false;
    }
    return true;
  }

  function pctBar(value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return `
      <div class="bar">
        <div class="bar__fill" style="width:${v}%"></div>
      </div>
      <div class="bar__meta">${v} / 100</div>
    `;
  }

  function render(container) {
    if (!ensureDeps()) return;

    const st = window.F1MEconomy.getState();
    const mods = window.F1MEconomy.getModifiers();

    container.innerHTML = "";

    const header = el("div", "staff-panel__header");
    header.innerHTML = `
      <div class="staff-kpis">
        <div class="kpi"><div class="kpi__label">Caixa</div><div class="kpi__value">€ ${Math.round(st.economy.cash).toLocaleString("pt-BR")}</div></div>
        <div class="kpi"><div class="kpi__label">Custo semanal</div><div class="kpi__value">€ ${Math.round(st.economy.weeklyCost).toLocaleString("pt-BR")}</div></div>
        <div class="kpi"><div class="kpi__label">Pit-stop</div><div class="kpi__value">x${mods.pitTimeMul.toFixed(2)}</div></div>
        <div class="kpi"><div class="kpi__label">Efeito da Oficina</div><div class="kpi__value">x${mods.setupEffectMul.toFixed(2)}</div></div>
        <div class="kpi"><div class="kpi__label">Desgaste pneus</div><div class="kpi__value">x${mods.tireWearMul.toFixed(2)}</div></div>
      </div>
      <div class="staff-note">
        Contratar melhora desempenho e desenvolvimento, mas aumenta custo. Demitir reduz nível e pode afetar reputação.
      </div>
    `;

    const grid = el("div", "staff-grid");
    const areas = [
      { key: "mechanics",  title: "Mecânicos",   impact: "Pit-stop e confiabilidade" },
      { key: "engineering",title: "Engenharia",  impact: "Efeito/precisão da Oficina" },
      { key: "aero",       title: "Aerodinâmica",impact: "Grip e estabilidade" },
      { key: "strategy",   title: "Estratégia",  impact: "Pneus/combustível/decisão" },
      { key: "marketing",  title: "Marketing",   impact: "Patrocínios e valor das ofertas" },
    ];

    areas.forEach(a => {
      const lvl = st.staff[a.key].level;
      const card = el("div", "staff-card");
      card.innerHTML = `
        <div class="staff-card__top">
          <div class="staff-card__title">${a.title}</div>
          <div class="staff-card__sub">${a.impact}</div>
        </div>

        <div class="staff-card__bar">${pctBar(lvl)}</div>

        <div class="staff-card__actions">
          <button class="btn-mini btn-mini--ghost" data-action="down" data-area="${a.key}">Demitir / Reduzir</button>
          <button class="btn-mini" data-action="up" data-area="${a.key}">Contratar / Melhorar</button>
        </div>
      `;
      grid.appendChild(card);
    });

    container.appendChild(header);
    container.appendChild(grid);

    bind(container);
  }

  function bind(root) {
    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const area = btn.dataset.area;

      if (!window.F1MEconomy) return;

      if (action === "up") {
        const res = window.F1MEconomy.adjustStaffLevel(area, +5);
        if (!res.ok) return alert(res.reason || "Não foi possível contratar.");
        alert(`Quadro melhorado. Custo de contratação: € ${Math.round(res.upgradeCost || 0).toLocaleString("pt-BR")}`);
        render(root);
      }

      if (action === "down") {
        const res = window.F1MEconomy.adjustStaffLevel(area, -5);
        if (!res.ok) return alert(res.reason || "Não foi possível demitir.");
        alert("Quadro reduzido.");
        render(root);
      }
    });
  }

  function injectMiniCSS() {
    if ($("#staff-mini-css")) return;
    const style = el("style");
    style.id = "staff-mini-css";
    style.textContent = `
      .staff-panel__header{margin-top:18px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(0,0,0,.35);backdrop-filter: blur(8px);}
      .staff-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;}
      .kpi{padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);}
      .kpi__label{font-size:12px;opacity:.75}
      .kpi__value{font-size:14px;font-weight:800}
      .staff-note{margin-top:10px;opacity:.85;font-size:12px}
      .staff-grid{margin-top:16px;display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:14px}
      .staff-card{padding:14px;border-radius:16px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.10);backdrop-filter: blur(8px)}
      .staff-card__title{font-weight:900;font-size:14px}
      .staff-card__sub{opacity:.8;font-size:12px;margin-top:4px}
      .bar{height:10px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-top:10px}
      .bar__fill{height:100%;background:rgba(0,180,255,.95)}
      .bar__meta{margin-top:6px;font-size:12px;opacity:.8}
      .staff-card__actions{margin-top:12px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
      .btn-mini{border:0;border-radius:999px;padding:9px 12px;background:rgba(0,180,255,.95);color:#fff;font-weight:900;cursor:pointer}
      .btn-mini--ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}
      @media (max-width: 1100px){.staff-kpis{grid-template-columns:repeat(2,minmax(140px,1fr));}.staff-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  const StaffSystem = {
    renderInto: (selectorOrEl) => {
      injectMiniCSS();
      const container = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!container) return console.error("StaffSystem: container não encontrado.");
      render(container);
    }
  };

  window.StaffSystem = StaffSystem;
})();
