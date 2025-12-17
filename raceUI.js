/* ===========================
   raceUI.js (FULL) - FIX
   - Corrige botões MOTOR/AGRESS (- e +)
   - Mantém faces e cards
   =========================== */

(function () {
  "use strict";

  const RaceUI = {
    renderAll(state) {
      this._renderHeader(state);
      this._renderSession(state);
      this._renderPlayerDrivers(state);
      this.renderHUD(state);
    },

    renderHUD(state) {
      const lap = document.getElementById("lap-info");
      const st = document.getElementById("race-state");
      const w = document.getElementById("weather-info");
      const tt = document.getElementById("track-temp");

      if (lap) lap.textContent = `${state.lap}/${state.totalLaps}`;
      if (st) st.textContent = state.status || "Correndo";
      if (w) w.textContent = state.weather || "Seco";
      if (tt) tt.textContent = state.trackTemp || "21°C";

      this._renderSession(state);
      this._updatePlayerCardsLight(state);
    },

    _renderHeader(state) {
      const gpName = document.getElementById("gp-name");
      const meta = document.getElementById("gp-meta");
      const flag = document.getElementById("gp-flag");

      if (gpName) gpName.textContent = state.gpName || "GP";
      if (meta) meta.textContent = `Volta ${state.lap} · Clima: ${state.weather} · Pista: ${state.trackTemp}`;

      if (flag) {
        flag.src = "";
        flag.style.display = "none";
      }

      const wrap = document.querySelector(".speed-controls");
      if (wrap) {
        const btns = Array.from(wrap.querySelectorAll("button[data-speed]"));
        btns.forEach((b) => b.classList.toggle("active", parseInt(b.dataset.speed, 10) === (window.RaceSystem?.speed || 1)));
      }
    },

    _renderSession(state) {
      const root = document.getElementById("session-list");
      if (!root) return;

      root.innerHTML = "";

      const top = state.drivers.slice(0, 20);
      for (const d of top) {
        const row = document.createElement("div");
        row.className = "session-row";

        const left = document.createElement("div");
        left.className = "session-left";

        const pos = document.createElement("div");
        pos.className = "pos-badge";
        pos.textContent = d.pos;

        const name = document.createElement("div");
        name.className = "session-name";

        const n = document.createElement("div");
        n.className = "n";
        n.textContent = d.name;

        const m = document.createElement("div");
        m.className = "m";
        m.textContent = `${d.team} · Voltas: ${d.lap} · Pneu: ${d.tyre}`;

        name.appendChild(n);
        name.appendChild(m);

        left.appendChild(pos);
        left.appendChild(name);

        const gap = document.createElement("div");
        gap.className = "session-gap";
        gap.textContent = d.pos === 1 ? "LEADER" : `+${(d.gap || 0).toFixed(3)}`;

        row.appendChild(left);
        row.appendChild(gap);
        root.appendChild(row);
      }
    },

    _renderPlayerDrivers(state) {
      const root = document.getElementById("player-drivers");
      if (!root) return;

      root.innerHTML = "";

      const playerCodes = state.playerDrivers || [];
      const list = state.drivers.filter((d) => playerCodes.includes(d.code));

      for (const d of list) {
        const card = document.createElement("div");
        card.className = "driver-card";
        card.dataset.code = d.code;

        const head = document.createElement("div");
        head.className = "driver-head";

        const img = document.createElement("img");
        img.className = "driver-avatar";
        img.alt = d.code;
        img.src = `assets/faces/${d.code}.png`;
        img.onerror = () => {
          img.onerror = null;
          img.style.display = "none";

          const fallback = document.createElement("div");
          fallback.className = "pos-badge";
          fallback.style.width = "44px";
          fallback.style.height = "44px";
          fallback.style.borderRadius = "14px";
          fallback.textContent = d.code;
          head.insertBefore(fallback, title);
        };

        const title = document.createElement("div");
        title.className = "driver-title";

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = d.name;

        const tm = document.createElement("div");
        tm.className = "team";
        tm.textContent = `${d.team} · ${d.mode}`;

        title.appendChild(nm);
        title.appendChild(tm);

        head.appendChild(img);
        head.appendChild(title);

        const stats = document.createElement("div");
        stats.className = "driver-stats";

        stats.appendChild(this._pill("Carro", `${Math.round(d.carHealth)}%`));
        stats.appendChild(this._pill("Pneu", `${Math.round(d.tyreWear)}%`));
        stats.appendChild(this._pill("ERS", `${Math.round(d.ers)}%`));
        stats.appendChild(this._pill("Motor", `M${d.motor}`));

        const actions = document.createElement("div");
        actions.className = "driver-actions";

        // PIT
        const pitBtn = this._btn("PIT", "danger", () => {
          const sel = card.querySelector("select[data-tyre='1']");
          const tyre = sel ? sel.value : d.tyre;
          window.RaceSystem?.pit(d.code, tyre);
        });

        // seletor de pneu
        const tyreSel = document.createElement("select");
        tyreSel.className = "select";
        tyreSel.dataset.tyre = "1";
        ["M", "H", "S", "W"].forEach((t) => {
          const o = document.createElement("option");
          o.value = t;
          o.textContent = t === "W" ? "W (Wet)" : t === "H" ? "H (Hard)" : t === "S" ? "S (Soft)" : "M (Medium)";
          if (t === d.tyre) o.selected = true;
          tyreSel.appendChild(o);
        });

        // modo
        const econBtn = this._btn("ECONOMIZAR", "", () => window.RaceSystem?.setDriverMode(d.code, "ECONOMIZAR"));
        const atkBtn = this._btn("ATAQUE", "primary", () => window.RaceSystem?.setDriverMode(d.code, "ATAQUE"));

        // MOTOR (- / +)
        const motM = this._btn("MOTOR -", "", () => window.RaceSystem?.adjustDriver(d.code, "motor", -1));
        const motP = this._btn("MOTOR +", "", () => window.RaceSystem?.adjustDriver(d.code, "motor", +1));

        // AGRESS (- / +)
        const agrM = this._btn("AGRESS -", "", () => window.RaceSystem?.adjustDriver(d.code, "agress", -1));
        const agrP = this._btn("AGRESS +", "", () => window.RaceSystem?.adjustDriver(d.code, "agress", +1));

        // Ordem fixa: nunca duplica
        actions.appendChild(pitBtn);
        actions.appendChild(tyreSel);

        actions.appendChild(econBtn);
        actions.appendChild(atkBtn);

        actions.appendChild(motM);
        actions.appendChild(motP);

        actions.appendChild(agrM);
        actions.appendChild(agrP);

        card.appendChild(head);
        card.appendChild(stats);
        card.appendChild(actions);

        root.appendChild(card);
      }
    },

    // Atualiza só textos (sem recriar tudo) – leve
    _updatePlayerCardsLight(state) {
      const root = document.getElementById("player-drivers");
      if (!root) return;

      const cards = Array.from(root.querySelectorAll(".driver-card"));
      if (!cards.length) return;

      for (const card of cards) {
        const code = card.dataset.code;
        const d = state.drivers.find((x) => x.code === code);
        if (!d) continue;

        const pills = card.querySelectorAll(".pill b");
        // ordem: Carro, Pneu, ERS, Motor
        if (pills[0]) pills[0].textContent = `${Math.round(d.carHealth)}%`;
        if (pills[1]) pills[1].textContent = `${Math.round(d.tyreWear)}%`;
        if (pills[2]) pills[2].textContent = `${Math.round(d.ers)}%`;
        if (pills[3]) pills[3].textContent = `M${d.motor}`;

        const teamLine = card.querySelector(".driver-title .team");
        if (teamLine) teamLine.textContent = `${d.team} · ${d.mode}`;
      }
    },

    _pill(k, v) {
      const el = document.createElement("div");
      el.className = "pill";
      el.innerHTML = `<span>${k}</span><b>${v}</b>`;
      return el;
    },

    _btn(text, cls, onClick) {
      const b = document.createElement("button");
      b.className = "btn" + (cls ? " " + cls : "");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", onClick);
      return b;
    },
  };

  window.RaceUI = RaceUI;
})();
