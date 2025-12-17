/* ===========================
   raceSystem.js (FULL) - FIX
   - Corrige velocidade (não fica preso na volta 1)
   - Min. 10 voltas
   - Mantém API para UI (pit, modo, motor/agress)
   =========================== */

(function () {
  "use strict";

  const RaceSystem = {
    state: null,
    speed: 1,
    _lastTs: 0,
    _running: false,

    trackFileMap: {
      australia: "australia.svg",
      abu_dhabi: "abu_dhabi.svg",
      arabia_saudita: "arabia_saudita.svg",
      austria: "austria.svg",
      bahrain: "bahrain.svg",
      belgica: "belgica.svg",
      canada: "canada.svg",
      catar: "catar.svg",
      china: "china.svg",
      espanha: "espanha.svg",

      // aliases comuns
      saudi: "arabia_saudita.svg",
      saudia: "arabia_saudita.svg",
      saudi_arabia: "arabia_saudita.svg",
      qatar: "catar.svg",
      spain: "espanha.svg",
      belgium: "belgica.svg",
      abuDhabi: "abu_dhabi.svg",
    },

    init() {
      try {
        const params = new URLSearchParams(location.search);
        const trackKey = (params.get("track") || "australia").trim();
        const gpName = params.get("gp") || "GP";
        const userTeam = (params.get("userTeam") || "").trim();

        const lapsParam = parseInt(params.get("laps") || "10", 10);
        const totalLaps = Number.isFinite(lapsParam) ? Math.max(10, lapsParam) : 10;

        this.state = {
          trackKey,
          gpName,
          userTeam,
          totalLaps,

          lap: 1,
          weather: "Seco",
          trackTemp: "21°C",
          status: "Correndo",

          drivers: [],
          playerDrivers: [],

          track: { svgText: "", file: "" },

          finished: false,
          winner: null,
        };

        this._bindSpeedButtons();
        this._bindBackButton();

        this._buildDriversFromData(userTeam);

        this.loadTrackSVG(trackKey)
          .then(({ svgText, file }) => {
            this.state.track.svgText = svgText;
            this.state.track.file = file;

            if (window.RaceRenderer) window.RaceRenderer.mount(svgText);
            if (window.RaceUI) window.RaceUI.renderAll(this.state);

            this._running = true;
            this._lastTs = performance.now();
            requestAnimationFrame(this._loop.bind(this));
          })
          .catch((err) => {
            alert("Erro na corrida: Falha ao carregar SVG da pista. " + (err?.message || err));
            console.error(err);
          });
      } catch (e) {
        alert("Erro na corrida: " + (e?.message || e));
        console.error(e);
      }
    },

    _bindSpeedButtons() {
      const wrap = document.querySelector(".speed-controls");
      if (!wrap) return;

      const buttons = Array.from(wrap.querySelectorAll("button[data-speed]"));

      const applyActive = () => {
        buttons.forEach((b) => b.classList.toggle("active", parseInt(b.dataset.speed, 10) === this.speed));
      };

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const s = parseInt(btn.dataset.speed, 10);
          if ([1, 2, 4].includes(s)) {
            this.speed = s;
            applyActive();
          }
        });
      });

      this.speed = 1;
      applyActive();
    },

    _bindBackButton() {
      const btn = document.getElementById("btn-back-lobby");
      if (!btn) return;
      btn.addEventListener("click", () => {
        location.href = "lobby.html";
      });
    },

    async loadTrackSVG(trackKey) {
      const clean = String(trackKey || "").trim();

      const file = this.trackFileMap[clean] || `${clean}.svg`;
      const primary = `assets/tracks/${file}`;

      let res = await fetch(primary, { cache: "no-store" });
      if (res.ok) return { svgText: await res.text(), file };

      const normalized = clean
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "_")
        .replace(/_+/g, "_");

      const file2 = this.trackFileMap[normalized] || `${normalized}.svg`;
      const secondary = `assets/tracks/${file2}`;

      res = await fetch(secondary, { cache: "no-store" });
      if (res.ok) return { svgText: await res.text(), file: file2 };

      const fallback = `assets/tracks/australia.svg`;
      res = await fetch(fallback, { cache: "no-store" });
      if (res.ok) return { svgText: await res.text(), file: "australia.svg" };

      throw new Error(`404 SVG. Tentativas: ${primary}, ${secondary}, ${fallback}`);
    },

    _buildDriversFromData(userTeam) {
      const data = window.DATA || window.data || window.F1DATA || null;

      const defaultGrid = [
        { code: "LEC", name: "Charles Leclerc", team: "FERRARI" },
        { code: "SAI", name: "Carlos Sainz", team: "FERRARI" },
        { code: "NOR", name: "Lando Norris", team: "MCLAREN" },
        { code: "PIA", name: "Oscar Piastri", team: "MCLAREN" },
        { code: "HAM", name: "Lewis Hamilton", team: "MERCEDES" },
        { code: "RUS", name: "George Russell", team: "MERCEDES" },
        { code: "VER", name: "Max Verstappen", team: "REDBULL" },
        { code: "PER", name: "Sergio Perez", team: "REDBULL" },
        { code: "ALO", name: "Fernando Alonso", team: "ASTONMARTIN" },
        { code: "STR", name: "Lance Stroll", team: "ASTONMARTIN" },
        { code: "GAS", name: "Pierre Gasly", team: "ALPINE" },
        { code: "OCO", name: "Esteban Ocon", team: "ALPINE" },
        { code: "HUL", name: "Nico Hulkenberg", team: "HAAS" },
        { code: "MAG", name: "Kevin Magnussen", team: "HAAS" },
        { code: "TSU", name: "Yuki Tsunoda", team: "RB" },
        { code: "LAW", name: "Liam Lawson", team: "RB" },
        { code: "ZHO", name: "Guanyu Zhou", team: "SAUBER" },
        { code: "BOR", name: "Gabriel Bortoleto", team: "SAUBER" },
        { code: "ALB", name: "Alex Albon", team: "WILLIAMS" },
        { code: "SAR", name: "Logan Sargeant", team: "WILLIAMS" },
      ];

      let driversRaw = null;
      if (data?.drivers && Array.isArray(data.drivers)) driversRaw = data.drivers;
      else if (data?.pilots && Array.isArray(data.pilots)) driversRaw = data.pilots;
      else if (window.DRIVERS && Array.isArray(window.DRIVERS)) driversRaw = window.DRIVERS;

      const grid = Array.isArray(driversRaw) && driversRaw.length ? driversRaw : defaultGrid;

      // >>> VELOCIDADE CORRIGIDA AQUI <<<
      // t vai de 0 a 1 por volta.
      // Queremos ~25s por volta em 1x (para demo), então v ~ 1/25 = 0.04 por segundo.
      // Com variação por piloto.
      const baseV = 0.040;

      this.state.drivers = grid.map((d, idx) => {
        const code = (d.code || d.abbr || d.short || "").toString().toUpperCase().slice(0, 3) || "UNK";
        return {
          id: d.id ?? idx,
          code,
          name: d.name || d.fullName || d.driver || "Piloto",
          team: (d.team || d.teamId || d.constructor || "TEAM").toString().toUpperCase(),

          pos: idx + 1,
          gap: 0,
          lap: 0,

          tyre: "M",
          tyreWear: 100,

          carHealth: 100,
          ers: 100,

          mode: "NORMAL", // ECONOMIZAR / ATAQUE / NORMAL
          motor: 2,
          agress: 2,

          t: Math.random() * 0.02,
          vBase: baseV * (0.92 + Math.random() * 0.16), // 0.0368..0.0464
          finished: false,
        };
      });

      const teamKey = (userTeam || "").toString().toUpperCase();
      const player = this.state.drivers.filter((d) => d.team === teamKey);
      this.state.playerDrivers = player.length ? player.map((d) => d.code) : ["LEC", "SAI"];
    },

    _loop(ts) {
      if (!this._running) return;

      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;

      const simDt = dt * this.speed;

      this._step(simDt);

      if (window.RaceRenderer) window.RaceRenderer.render(this.state);
      if (window.RaceUI) window.RaceUI.renderHUD(this.state);

      requestAnimationFrame(this._loop.bind(this));
    },

    _step(dt) {
      if (this.state.finished) return;

      for (const d of this.state.drivers) {
        if (d.finished) continue;

        const modeBoost =
          d.mode === "ATAQUE" ? 1.10 :
          d.mode === "ECONOMIZAR" ? 0.93 :
          1.00;

        const tyrePenalty = 0.70 + (d.tyreWear / 100) * 0.40; // 0.70..1.10
        const ersBoost = 0.88 + (d.ers / 100) * 0.20;         // 0.88..1.08

        // desgaste coerente para “demo”
        const tyreDrain =
          d.mode === "ATAQUE" ? 1.10 :
          d.mode === "ECONOMIZAR" ? 0.55 :
          0.80;

        const ersDrain =
          d.mode === "ATAQUE" ? 1.05 :
          d.mode === "ECONOMIZAR" ? 0.45 :
          0.70;

        d.tyreWear = Math.max(0, d.tyreWear - dt * tyreDrain * 2.2); // ajustado
        d.ers = Math.max(0, d.ers - dt * ersDrain * 2.0);

        // motor/agress influenciam leve
        const motorBoost = 0.96 + (d.motor * 0.02);   // M1=0.98, M5=1.06
        const agressBoost = 0.96 + (d.agress * 0.02); // A1=0.98, A5=1.06

        const v = d.vBase * modeBoost * tyrePenalty * ersBoost * motorBoost * agressBoost;
        d.t += v * dt;

        if (d.t >= 1) {
          d.t -= 1;
          d.lap += 1;

          if (d.lap >= this.state.totalLaps) {
            d.finished = true;
          }
        }
      }

      // ordena por progresso total
      this.state.drivers.sort((a, b) => (b.lap - a.lap) || (b.t - a.t));

      const leader = this.state.drivers[0];
      for (let i = 0; i < this.state.drivers.length; i++) {
        const d = this.state.drivers[i];
        d.pos = i + 1;

        const progLeader = leader.lap + leader.t;
        const prog = d.lap + d.t;
        const diff = progLeader - prog;
        d.gap = diff <= 0 ? 0 : +(diff * 1.35).toFixed(3);
      }

      this.state.lap = Math.min(this.state.totalLaps, leader.lap + 1);

      const allFinished = this.state.drivers.every((d) => d.finished);
      if (allFinished) {
        this.state.finished = true;
        this.state.winner = leader;
        this.state.status = "Finalizada";
        if (window.ResultsSystem) window.ResultsSystem.show(this.state);
      }
    },

    setDriverMode(code, mode) {
      const d = this.state.drivers.find((x) => x.code === code);
      if (!d) return;
      d.mode = mode;
    },

    adjustDriver(code, key, delta) {
      const d = this.state.drivers.find((x) => x.code === code);
      if (!d) return;
      if (key === "motor") d.motor = Math.max(1, Math.min(5, d.motor + delta));
      if (key === "agress") d.agress = Math.max(1, Math.min(5, d.agress + delta));
    },

    pit(code, tyre) {
      const d = this.state.drivers.find((x) => x.code === code);
      if (!d) return;

      d.tyre = tyre || d.tyre;
      d.tyreWear = 100;
      d.ers = Math.min(100, d.ers + 28);
      d.carHealth = Math.min(100, d.carHealth + 2.5);

      // penalidade perceptível
      d.t = Math.max(0, d.t - 0.055);
    },
  };

  window.RaceSystem = RaceSystem;
})();
