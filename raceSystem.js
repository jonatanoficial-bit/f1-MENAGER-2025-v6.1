/* ===========================
   raceSystem.js (FULL)
   - Resolve SVG de todas as pistas (assets/tracks)
   - Min. 10 voltas
   - Fonte de verdade do estado da corrida
   =========================== */

(function () {
  "use strict";

  const RaceSystem = {
    state: null,
    speed: 1,
    tickMs: 1000 / 60,
    _acc: 0,
    _lastTs: 0,
    _running: false,

    // IMPORTANTÍSSIMO: mapear query track -> nome real do arquivo
    trackFileMap: {
      // já funciona
      australia: "australia.svg",

      // arquivos que você mostrou no repo:
      abu_dhabi: "abu_dhabi.svg",
      arabia_saudita: "arabia_saudita.svg",
      austria: "austria.svg",
      bahrain: "bahrain.svg",
      belgica: "belgica.svg",
      canada: "canada.svg",
      catar: "catar.svg",
      china: "china.svg",
      espanha: "espanha.svg",

      // aliases comuns (caso a URL use outro padrão)
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

        // Estado base
        this.state = {
          trackKey,
          gpName,
          userTeam,
          totalLaps,
          lap: 1,
          weather: "Seco",
          trackTemp: "21°C",
          status: "Correndo",
          // grid/posições
          drivers: [],
          // runtime do mapa
          track: {
            svgText: "",
            file: "",
          },
          // resultados
          finished: false,
          winner: null,
        };

        this._bindSpeedButtons();
        this._bindBackButton();

        // Monta lista de pilotos a partir do data.js (defensivo)
        this._buildDriversFromData(userTeam);

        // Carrega SVG da pista (com fallback)
        this.loadTrackSVG(trackKey)
          .then(({ svgText, file }) => {
            this.state.track.svgText = svgText;
            this.state.track.file = file;

            // Render inicial + UI
            if (window.RaceRenderer) window.RaceRenderer.mount(svgText);
            if (window.RaceUI) window.RaceUI.renderAll(this.state);

            // Start loop
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

      // default
      this.speed = 1;
      applyActive();
    },

    _bindBackButton() {
      const btn = document.getElementById("btn-back-lobby");
      if (!btn) return;
      btn.addEventListener("click", () => {
        // ajuste se seu lobby tiver outro arquivo
        location.href = "lobby.html";
      });
    },

    async loadTrackSVG(trackKey) {
      const clean = String(trackKey || "").trim();
      const file = this.trackFileMap[clean] || `${clean}.svg`;
      const primary = `assets/tracks/${file}`;

      // 1) tenta direto
      let res = await fetch(primary, { cache: "no-store" });
      if (res.ok) {
        return { svgText: await res.text(), file };
      }

      // 2) fallback: tenta normalizar (trocar hífen por underscore etc.)
      const normalized = clean
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "_")
        .replace(/_+/g, "_");

      const file2 = this.trackFileMap[normalized] || `${normalized}.svg`;
      const secondary = `assets/tracks/${file2}`;
      res = await fetch(secondary, { cache: "no-store" });
      if (res.ok) {
        return { svgText: await res.text(), file: file2 };
      }

      // 3) último fallback: australia (para não “morrer” em demo)
      const fallback = `assets/tracks/australia.svg`;
      res = await fetch(fallback, { cache: "no-store" });
      if (res.ok) {
        return { svgText: await res.text(), file: "australia.svg" };
      }

      throw new Error(`404 SVG. Tentativas: ${primary}, ${secondary}, ${fallback}`);
    },

    _buildDriversFromData(userTeam) {
      // Tenta enxergar formatos comuns
      const data = window.DATA || window.data || window.F1DATA || null;

      // fallback mínimo
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

      // formatos possíveis: data.drivers / data.pilots / window.DRIVERS
      if (data?.drivers && Array.isArray(data.drivers)) driversRaw = data.drivers;
      else if (data?.pilots && Array.isArray(data.pilots)) driversRaw = data.pilots;
      else if (window.DRIVERS && Array.isArray(window.DRIVERS)) driversRaw = window.DRIVERS;

      const grid = Array.isArray(driversRaw) && driversRaw.length ? driversRaw : defaultGrid;

      // Normaliza para o engine da corrida
      this.state.drivers = grid.map((d, idx) => ({
        id: d.id ?? idx,
        code: (d.code || d.abbr || d.short || "").toString().toUpperCase().slice(0, 3) || "UNK",
        name: d.name || d.fullName || d.driver || "Piloto",
        team: (d.team || d.teamId || d.constructor || "TEAM").toString().toUpperCase(),
        pos: idx + 1,
        gap: 0,
        lap: 0,

        tyre: "M",
        tyreWear: 100,

        carHealth: 100,
        ers: 100,

        mode: "NORMAL", // ECONOMIZAR / ATAQUE
        motor: 2,
        agress: 2,

        // posição no traçado (0..1)
        t: Math.random() * 0.05,
        speed: 0.0008 + Math.random() * 0.0002,
        finished: false,
      }));

      // Define player drivers a partir do userTeam, se bater
      const teamKey = (userTeam || "").toString().toUpperCase();
      const player = this.state.drivers.filter((d) => d.team === teamKey);

      // Se não bater, fallback: Ferrari
      this.state.playerDrivers = player.length ? player.map((d) => d.code) : ["LEC", "SAI"];
    },

    _loop(ts) {
      if (!this._running) return;

      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;

      // simulação em 60fps com multiplicador
      const simDt = dt * this.speed;

      this._step(simDt);

      if (window.RaceRenderer) window.RaceRenderer.render(this.state);
      if (window.RaceUI) window.RaceUI.renderHUD(this.state);

      requestAnimationFrame(this._loop.bind(this));
    },

    _step(dt) {
      if (this.state.finished) return;

      // move cada piloto no traçado (t 0..1)
      for (const d of this.state.drivers) {
        if (d.finished) continue;

        // desgaste simples (ajuste fino depois)
        d.tyreWear = Math.max(0, d.tyreWear - dt * (0.35 + (d.mode === "ATAQUE" ? 0.25 : 0.05)));
        d.ers = Math.max(0, d.ers - dt * (d.mode === "ATAQUE" ? 0.18 : 0.06));

        // velocidade: base + influência de modo
        const modeBoost = d.mode === "ATAQUE" ? 1.25 : d.mode === "ECONOMIZAR" ? 0.92 : 1.0;
        const wearPenalty = 0.65 + (d.tyreWear / 100) * 0.45;
        const ersBoost = 0.9 + (d.ers / 100) * 0.25;

        const v = d.speed * modeBoost * wearPenalty * ersBoost;
        d.t += v * dt;

        if (d.t >= 1) {
          d.t = d.t - 1;
          d.lap += 1;

          if (d.lap >= this.state.totalLaps) {
            d.finished = true;
          }
        }
      }

      // ordena por (lap desc, t desc)
      this.state.drivers.sort((a, b) => (b.lap - a.lap) || (b.t - a.t));

      // atualiza pos e gaps
      const leader = this.state.drivers[0];
      leader.pos = 1;
      leader.gap = 0;

      for (let i = 0; i < this.state.drivers.length; i++) {
        const d = this.state.drivers[i];
        d.pos = i + 1;

        // gap simples (visual): baseado em diferença de progresso total
        const progLeader = leader.lap + leader.t;
        const prog = d.lap + d.t;
        const diff = progLeader - prog;
        d.gap = diff <= 0 ? 0 : +(diff * 1.8).toFixed(3);
      }

      // volta global (do líder)
      this.state.lap = Math.min(this.state.totalLaps, leader.lap + 1);

      // fim
      const allFinished = this.state.drivers.every((d) => d.finished);
      if (allFinished) {
        this.state.finished = true;
        this.state.winner = leader;
        this.state.status = "Finalizada";

        if (window.ResultsSystem) window.ResultsSystem.show(this.state);
      }
    },

    // API usada pela UI
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
      d.ers = Math.min(100, d.ers + 25);
      d.carHealth = Math.min(100, d.carHealth + 3);

      // penalidade de pit (simples)
      d.t = Math.max(0, d.t - 0.025);
    },
  };

  window.RaceSystem = RaceSystem;
})();
