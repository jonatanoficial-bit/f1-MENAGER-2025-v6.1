/* =========================================================
   PILOT MARKET — UI
   - Não mexe em simulação; apenas tela de gestão.
========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const ui = {
    teamList: $("teamList"),
    rosterTitle: $("rosterTitle"),
    rosterTable: $("rosterTable"),
    freeAgentsTable: $("freeAgentsTable"),
    hireYears: $("hireYears"),
    cashValue: $("cashValue"),
    seasonInfo: $("seasonInfo"),
    btnRefresh: $("btnRefresh"),
    toast: $("toast"),
  };

  function brl(n) {
    const v = Number(n || 0);
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function showToast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => ui.toast.classList.remove("show"), 1700);
  }

  function getCareer() {
    return (typeof F1MEconomy !== "undefined" && F1MEconomy.load) ? F1MEconomy.load() : (PilotMarketSystem.getState() || null);
  }

  function refreshHeader() {
    const st = getCareer();
    const year = Number(st?.season?.year) || 2025;
    const round = Number(st?.season?.round) || Number(localStorage.getItem("F1M_round")) || 1;
    const cash = Number(st?.economy?.cash) || 0;

    if (ui.cashValue) ui.cashValue.textContent = brl(cash);
    if (ui.seasonInfo) ui.seasonInfo.textContent = `Temporada ${year} • Round ${round}`;
  }

  function renderTeams(selected) {
    const teams = PilotMarketSystem.getTeams();
    const userTeam = PilotMarketSystem.getUserTeamKey();

    if (!ui.teamList) return;

    ui.teamList.innerHTML = "";
    const sel = selected || userTeam || teams[0];

    for (const t of teams) {
      const roster = PilotMarketSystem.getRoster(t);
      const btn = document.createElement("button");
      btn.className = "team-item" + (t === sel ? " active" : "");
      btn.innerHTML = `${t.toUpperCase()} <small>${roster.length} pilotos</small>`;
      btn.onclick = () => {
        renderTeams(t);
        renderRoster(t);
      };
      ui.teamList.appendChild(btn);
    }

    renderRoster(sel);
  }

  function rowHeader(cols) {
    return `
      <div class="row header">
        ${cols.map(c => `<div class="cell">${c}</div>`).join("")}
      </div>`;
  }

  function renderRoster(teamKey) {
    if (ui.rosterTitle) ui.rosterTitle.textContent = teamKey.toUpperCase();
    if (!ui.rosterTable) return;

    const roster = PilotMarketSystem.getRoster(teamKey);
    const userTeam = PilotMarketSystem.getUserTeamKey();
    const isUserTeam = teamKey === userTeam;

    let html = rowHeader(["ID", "Piloto", "Contrato", "Salário", "Ações"]);

    for (const p of roster) {
      const c = PilotMarketSystem.getContract(p.id);
      const contractTxt = c && c.status?.active
        ? `${c.startYear}–${c.endYear}`
        : "Sem contrato";

      const salaryTxt = c && c.status?.active ? brl(c.salaryWeekly) + "/sem" : "-";

      let actions = `<span class="pill">Ativo</span>`;
      if (c && c.status?.active) {
        if (isUserTeam) {
          actions = `
            <button class="btn primary" data-act="extend" data-id="${p.id}">Renovar</button>
            <button class="btn danger" data-act="terminate" data-id="${p.id}">Rescindir</button>
          `;
        } else {
          actions = `<span class="pill">Contrato vigente</span>`;
        }
      } else {
        actions = `<span class="pill free">Free Agent</span>`;
      }

      html += `
        <div class="row">
          <div class="cell"><span class="pill">${p.id}</span></div>
          <div class="cell">
            <div><strong>${p.name}</strong></div>
            <small>Rating ${p.rating} • Pot ${p.potential} • ${p.country || "—"}</small>
          </div>
          <div class="cell">${contractTxt}</div>
          <div class="cell">${salaryTxt}</div>
          <div class="cell">${actions}</div>
        </div>
      `;
    }

    ui.rosterTable.innerHTML = html;

    ui.rosterTable.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-act");
        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (act === "terminate") {
          const r = PilotMarketSystem.terminateContract(id, "Rescisão pelo manager");
          if (r.ok) showToast(`Rescisão concluída. Buyout: ${brl(r.buyout)}`);
          else showToast(r.reason || "Falha ao rescindir");
          refreshAll();
        }

        if (act === "extend") {
          const r = PilotMarketSystem.extendContract(id, 1);
          if (r.ok) showToast(`Renovado até ${r.endYear}. Bônus: ${brl(r.bonus)}`);
          else showToast(r.reason || "Falha ao renovar");
          refreshAll();
        }
      });
    });

    renderFreeAgents(teamKey);
    refreshHeader();
  }

  function renderFreeAgents(targetTeamKey) {
    if (!ui.freeAgentsTable) return;

    const free = PilotMarketSystem.getFreeAgents();

    let html = rowHeader(["ID", "Piloto", "Status", "Assinatura", "Ações"]);

    for (const p of free) {
      const fakeSalary = Math.round(500000 + (Math.max(40, Math.min(99, p.rating)) - 50) * 45000);
      const sign = Math.round(fakeSalary * 8);

      html += `
        <div class="row">
          <div class="cell"><span class="pill">${p.id}</span></div>
          <div class="cell">
            <div><strong>${p.name}</strong></div>
            <small>Rating ${p.rating} • Pot ${p.potential} • ${p.country || "—"}</small>
          </div>
          <div class="cell"><span class="pill free">Disponível</span></div>
          <div class="cell">${brl(sign)}</div>
          <div class="cell">
            <button class="btn primary" data-hire="${p.id}">Contratar</button>
          </div>
        </div>
      `;
    }

    ui.freeAgentsTable.innerHTML = html;

    ui.freeAgentsTable.querySelectorAll("button[data-hire]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-hire");
        const yrs = Number(ui.hireYears?.value || 2);
        const r = PilotMarketSystem.hireDriver(id, targetTeamKey, yrs);
        if (r.ok) showToast(`Contratado. Assinatura: ${brl(r.signingBonus)}`);
        else showToast(r.reason || "Falha ao contratar");
        refreshAll();
      });
    });
  }

  function refreshAll() {
    refreshHeader();
    const activeTeam = document.querySelector(".team-item.active");
    const teamKey = activeTeam ? activeTeam.textContent.trim().split(" ")[0].toLowerCase() : PilotMarketSystem.getUserTeamKey();
    renderTeams(teamKey);
  }

  document.addEventListener("DOMContentLoaded", () => {
    PilotMarketSystem.init();
    refreshHeader();
    renderTeams(PilotMarketSystem.getUserTeamKey());

    if (ui.btnRefresh) ui.btnRefresh.onclick = () => refreshAll();
    if (ui.hireYears) ui.hireYears.onchange = () => {
      const activeTeam = document.querySelector(".team-item.active");
      const teamKey = activeTeam ? activeTeam.textContent.trim().split(" ")[0].toLowerCase() : PilotMarketSystem.getUserTeamKey();
      renderFreeAgents(teamKey);
    };
  });

})();
