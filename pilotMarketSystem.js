/* =========================================================
   PILOT MARKET SYSTEM — F1 MANAGER 2025 (v6.1+)
   - Mercado de pilotos + contratos reais
   - Persistência dentro do mesmo save da economia:
       STORAGE_KEY = "f1m2025_career_v61"
   - Liga elenco à corrida: 2 pilotos ativos por equipe
   - Aplica cláusulas por GP (salário, bônus, multas) no fim da corrida
   - Adiciona "form" do piloto (0..100) que influencia performance
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "f1m2025_career_v61";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Date.now();

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function loadCareer() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window.F1MEconomy !== "undefined" && typeof window.F1MEconomy.load === "function") {
        return window.F1MEconomy.load();
      }
      return null;
    }
    return safeParse(raw, null);
  }

  function saveCareer(st) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {
      console.warn("Falha ao salvar Career:", e);
    }
  }

  function getYear(st) {
    return Number(st?.season?.year) || 2025;
  }

  function getRoundFromSeasonState() {
    try {
      const ss = JSON.parse(localStorage.getItem("f1m2025_season_state")) || {};
      const r = Number(ss?.current?.round);
      return r || Number(localStorage.getItem("F1M_round")) || 1;
    } catch {
      return Number(localStorage.getItem("F1M_round")) || 1;
    }
  }

  function getUserTeamKey(st) {
    const p = new URLSearchParams(location.search);
    return (p.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      localStorage.getItem("F1M_userTeam") ||
      st?.teamKey ||
      "mclaren").toLowerCase();
  }

  function normTeamKey(k) {
    return String(k || "").toLowerCase().replace(/\s+/g, "_");
  }

  function seedFromGlobals() {
    const list = [];

    // Preferência: window.PILOTOS (data.js) — se existir
    if (Array.isArray(window.PILOTOS) && window.PILOTOS.length) {
      for (const p of window.PILOTOS) {
        const id = (p.id || p.sigla || p.abrev || p.nome || "").toString().trim();
        if (!id) continue;

        list.push({
          id: id.toUpperCase(),
          name: p.nome || p.name || id,
          teamKey: normTeamKey(p.equipe || p.team || "free"),
          number: p.numero || p.number || null,
          country: p.pais || p.country || "",
          face: p.face || p.foto || null,
          rating: clamp(Number(p.rating || p.overall || 75), 40, 99),
          potential: clamp(Number(p.potential || 80), 40, 99),
          age: Number(p.idade || p.age || 24) || 24,
          form: clamp(Number(p.form || 55), 0, 100)
        });
      }
      return list;
    }

    // Fallback mínimo (inclui BOR)
    return [
      { id:"LEC", name:"Charles Leclerc", teamKey:"ferrari", rating:91, potential:93, age:27, country:"MON", number:16, face:"LEC.png", form:55 },
      { id:"SAI", name:"Carlos Sainz", teamKey:"ferrari", rating:89, potential:89, age:30, country:"ESP", number:55, face:"SAI.png", form:54 },
      { id:"VER", name:"Max Verstappen", teamKey:"redbull", rating:95, potential:95, age:27, country:"NED", number:1, face:"VER.png", form:60 },
      { id:"PER", name:"Sergio Perez", teamKey:"redbull", rating:86, potential:86, age:34, country:"MEX", number:11, face:"PER.png", form:52 },
      { id:"HAM", name:"Lewis Hamilton", teamKey:"mercedes", rating:93, potential:93, age:40, country:"GBR", number:44, face:"HAM.png", form:58 },
      { id:"RUS", name:"George Russell", teamKey:"mercedes", rating:90, potential:92, age:26, country:"GBR", number:63, face:"RUS.png", form:56 },
      { id:"NOR", name:"Lando Norris", teamKey:"mclaren", rating:90, potential:93, age:25, country:"GBR", number:4, face:"NOR.png", form:57 },
      { id:"PIA", name:"Oscar Piastri", teamKey:"mclaren", rating:88, potential:92, age:23, country:"AUS", number:81, face:"PIA.png", form:55 },
      { id:"ALO", name:"Fernando Alonso", teamKey:"aston_martin", rating:90, potential:90, age:43, country:"ESP", number:14, face:"ALO.png", form:56 },
      { id:"STR", name:"Lance Stroll", teamKey:"aston_martin", rating:82, potential:84, age:26, country:"CAN", number:18, face:"STR.png", form:50 },
      { id:"OCO", name:"Esteban Ocon", teamKey:"alpine", rating:84, potential:86, age:28, country:"FRA", number:31, face:"OCO.png", form:52 },
      { id:"GAS", name:"Pierre Gasly", teamKey:"alpine", rating:85, potential:86, age:28, country:"FRA", number:10, face:"GAS.png", form:52 },
      { id:"ALB", name:"Alex Albon", teamKey:"williams", rating:84, potential:86, age:28, country:"THA", number:23, face:"ALB.png", form:52 },
      { id:"SAR", name:"Logan Sargeant", teamKey:"williams", rating:78, potential:82, age:24, country:"USA", number:2, face:"SAR.png", form:49 },
      { id:"HUL", name:"Nico Hulkenberg", teamKey:"haas", rating:83, potential:83, age:37, country:"GER", number:27, face:"HUL.png", form:51 },
      { id:"MAG", name:"Kevin Magnussen", teamKey:"haas", rating:81, potential:82, age:32, country:"DEN", number:20, face:"MAG.png", form:50 },
      // Sauber (inclui BOR para bater com assets/faces/BOR.png)
      { id:"BOR", name:"Gabriel Bortoleto", teamKey:"sauber", rating:79, potential:90, age:20, country:"BRA", number:98, face:"BOR.png", form:55 },
      { id:"ZHO", name:"Zhou Guanyu", teamKey:"sauber", rating:80, potential:84, age:25, country:"CHN", number:24, face:"ZHO.png", form:50 }
    ];
  }

  function ensurePilotModule(st) {
    if (!st) return null;

    if (!st.pilots) st.pilots = {};
    if (!st.pilots.db) st.pilots.db = {};
    if (!st.pilots.contracts) st.pilots.contracts = {};
    if (!Array.isArray(st.pilots.freeAgents)) st.pilots.freeAgents = [];
    if (!st.pilots.meta) st.pilots.meta = { seededAt: 0, lastYearRolled: 0 };

    // seed once
    if (!st.pilots.meta.seededAt) {
      const seed = seedFromGlobals();
      for (const p of seed) {
        // garante form
        if (typeof p.form !== "number") p.form = 55;
        st.pilots.db[p.id] = p;
      }

      // cria contratos iniciais para quem tem teamKey != free
      const year = getYear(st);
      const ids = Object.keys(st.pilots.db);
      for (const id of ids) {
        const p = st.pilots.db[id];
        if (!p.teamKey || p.teamKey === "free") {
          st.pilots.freeAgents.push(id);
          continue;
        }
        if (!st.pilots.contracts[id]) {
          st.pilots.contracts[id] = makeDriverContract(p, year, 2);
        }
      }

      st.pilots.meta.seededAt = now();
    }

    // garante economia
    if (!st.economy) st.economy = { cash: 0, reputation: 40, exposure: 35, weeklyCost: 0, lastPayoutAtRound: 0 };

    return st;
  }

  function makeDriverContract(pilot, startYear, years) {
    const y = Math.max(1, Math.min(4, years || 1));
    const base = 500000;
    const rating = clamp(Number(pilot.rating || 75), 40, 99);
    const salaryWeekly = Math.round(base + (rating - 50) * 45000);

    const signingBonus = Math.round(salaryWeekly * 8);
    const buyout = Math.round(salaryWeekly * 12);

    return {
      id: `DC_${pilot.id}_${startYear}_${Math.floor(Math.random() * 1e9)}`,
      driverId: pilot.id,
      teamKey: normTeamKey(pilot.teamKey),
      startYear,
      endYear: startYear + y - 1,
      salaryWeekly,
      signingBonus,
      buyout,
      clauses: {
        // ✅ Cláusulas por GP
        performanceBonus: Math.round(salaryWeekly * 2.2), // pontuar no top10
        podiumBonus: Math.round(salaryWeekly * 1.6),      // pódio
        dnfPenalty: Math.round(salaryWeekly * 1.0)        // DNF
      },
      status: {
        active: true,
        terminated: false,
        terminatedReason: "",
        signedAt: now()
      }
    };
  }

  function getTeamsFromDB(st) {
    const set = new Set();
    for (const id of Object.keys(st.pilots.db)) {
      const t = normTeamKey(st.pilots.db[id].teamKey);
      if (t && t !== "free") set.add(t);
    }
    set.add(normTeamKey(st.teamKey || "mclaren"));
    return Array.from(set);
  }

  function getRoster(st, teamKey) {
    const t = normTeamKey(teamKey);
    const out = [];
    for (const id of Object.keys(st.pilots.db)) {
      const p = st.pilots.db[id];
      if (normTeamKey(p.teamKey) !== t) continue;
      out.push(p);
    }
    out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return out;
  }

  function getActiveDriversForTeam(st, teamKey) {
    // Regra AAA simples: 2 melhores ratings do roster
    const roster = getRoster(st, teamKey);
    return roster.slice(0, 2);
  }

  function getFreeAgents(st) {
    const out = [];
    for (const id of st.pilots.freeAgents) {
      const p = st.pilots.db[id];
      if (p) out.push(p);
    }
    out.sort((a, b) => (b.potential || 0) - (a.potential || 0));
    return out;
  }

  function terminateContract(st, driverId, reason) {
    const c = st.pilots.contracts[driverId];
    const p = st.pilots.db[driverId];
    if (!c || !p) return { ok: false, reason: "Contrato/piloto não encontrado." };
    if (!c.status.active) return { ok: false, reason: "Contrato já não está ativo." };

    const buyout = Math.round(c.buyout || 0);
    if ((st.economy?.cash || 0) < buyout) return { ok: false, reason: "Caixa insuficiente para buyout." };

    st.economy.cash = Math.max(0, Math.round(st.economy.cash - buyout));

    c.status.active = false;
    c.status.terminated = true;
    c.status.terminatedReason = reason || "Rescisão";

    p.teamKey = "free";
    if (!st.pilots.freeAgents.includes(driverId)) st.pilots.freeAgents.push(driverId);

    saveCareer(st);
    return { ok: true, buyout };
  }

  function hireDriver(st, driverId, toTeamKey, years) {
    const p = st.pilots.db[driverId];
    if (!p) return { ok: false, reason: "Piloto não encontrado." };

    const teamKey = normTeamKey(toTeamKey);

    const c0 = st.pilots.contracts[driverId];
    if (c0 && c0.status.active && normTeamKey(c0.teamKey) !== teamKey) {
      const buyout = Math.round(c0.buyout || 0);
      if ((st.economy?.cash || 0) < buyout) return { ok: false, reason: "Caixa insuficiente para buyout do contrato atual." };
      st.economy.cash = Math.max(0, Math.round(st.economy.cash - buyout));
      c0.status.active = false;
      c0.status.terminated = true;
      c0.status.terminatedReason = "Transferência (buyout)";
    }

    const year = getYear(st);
    const contract = makeDriverContract({ ...p, teamKey }, year, years || 1);

    const sign = Math.round(contract.signingBonus || 0);
    if ((st.economy?.cash || 0) < sign) return { ok: false, reason: "Caixa insuficiente para bônus de assinatura." };
    st.economy.cash = Math.max(0, Math.round(st.economy.cash - sign));

    p.teamKey = teamKey;
    st.pilots.contracts[driverId] = contract;

    st.pilots.freeAgents = st.pilots.freeAgents.filter(x => x !== driverId);

    saveCareer(st);
    return { ok: true, signingBonus: sign, contract };
  }

  function extendContract(st, driverId, extraYears) {
    const c = st.pilots.contracts[driverId];
    const p = st.pilots.db[driverId];
    if (!c || !p || !c.status.active) return { ok: false, reason: "Contrato ativo não encontrado." };

    const add = Math.max(1, Math.min(3, Number(extraYears) || 1));
    const newEnd = c.endYear + add;

    const bonus = Math.round((c.salaryWeekly || 0) * (1.8 + add));
    if ((st.economy?.cash || 0) < bonus) return { ok: false, reason: "Caixa insuficiente para renovação." };

    st.economy.cash = Math.max(0, Math.round(st.economy.cash - bonus));
    c.endYear = newEnd;

    saveCareer(st);
    return { ok: true, bonus, endYear: newEnd };
  }

  function rollSeasonYearIfNeeded(st) {
    const y = getYear(st);
    if (st.pilots.meta.lastYearRolled === y) return;

    for (const id of Object.keys(st.pilots.contracts)) {
      const c = st.pilots.contracts[id];
      if (!c || !c.status.active) continue;
      if (c.endYear < y) {
        c.status.active = false;
        c.status.terminated = true;
        c.status.terminatedReason = "Contrato expirou";

        const p = st.pilots.db[id];
        if (p) {
          p.teamKey = "free";
          if (!st.pilots.freeAgents.includes(id)) st.pilots.freeAgents.push(id);
        }
      }
    }

    st.pilots.meta.lastYearRolled = y;
    saveCareer(st);
  }

  // =========================================================
  // ✅ APLICA CLÁUSULAS POR GP (contrato -> bônus/multas)
  // results[] esperado:
  //   { driverId, teamKey, position, points, dnf }
  // =========================================================
  function applyRaceResults(st, payload) {
    if (!st || !payload || !Array.isArray(payload.results)) return { ok: false, reason: "Payload inválido." };

    const year = Number(payload.year) || getYear(st);
    const round = Number(payload.round) || getRoundFromSeasonState();
    const userTeamKey = normTeamKey(payload.userTeamKey || getUserTeamKey(st));

    let deltaCash = 0;

    // cobra salário por GP (apenas para pilotos do time do usuário que estão ativos)
    const userDrivers = getActiveDriversForTeam(st, userTeamKey);
    for (const d of userDrivers) {
      const c = st.pilots.contracts[d.id];
      if (c && c.status?.active && normTeamKey(c.teamKey) === userTeamKey) {
        deltaCash -= Math.round(c.salaryWeekly || 0);
      }
    }

    // aplica bônus/multa por resultado individual
    for (const r of payload.results) {
      const driverId = String(r.driverId || "").toUpperCase();
      const p = st.pilots.db[driverId];
      if (!p) continue;

      const teamKey = normTeamKey(r.teamKey || p.teamKey);
      const c = st.pilots.contracts[driverId];

      const isUserTeam = teamKey === userTeamKey;

      // evolução de form (afeta performance)
      // - pontuou: +2
      // - pódio: +3 extra
      // - DNF: -6
      let formDelta = 0;
      if (r.dnf) formDelta -= 6;
      else if ((r.points || 0) > 0) formDelta += 2;
      if (!r.dnf && Number(r.position) <= 3) formDelta += 3;

      p.form = clamp(Number(p.form || 55) + formDelta, 0, 100);

      // cláusulas só mexem no caixa do usuário (não simulamos finanças de IA)
      if (!isUserTeam) continue;

      if (c && c.status?.active && normTeamKey(c.teamKey) === userTeamKey) {
        if (r.dnf) {
          deltaCash -= Math.round(c.clauses?.dnfPenalty || 0);
        } else {
          if ((r.points || 0) > 0) deltaCash += Math.round(c.clauses?.performanceBonus || 0);
          if (Number(r.position) <= 3) deltaCash += Math.round(c.clauses?.podiumBonus || 0);
        }
      }
    }

    // aplica no caixa global da economia
    st.season = st.season || {};
    st.season.year = year;
    st.season.round = round;

    st.economy = st.economy || { cash: 0, reputation: 40, exposure: 35 };
    st.economy.cash = Math.max(0, Math.round((st.economy.cash || 0) + deltaCash));

    saveCareer(st);
    return { ok: true, year, round, deltaCash, cash: st.economy.cash };
  }

  // =========================
  // Public API
  // =========================
  const PilotMarketSystem = {
    init: () => {
      let st = loadCareer();
      if (!st && typeof window.F1MEconomy !== "undefined") st = window.F1MEconomy.load();
      st = ensurePilotModule(st);
      if (!st) return null;

      st.teamKey = getUserTeamKey(st);
      rollSeasonYearIfNeeded(st);
      saveCareer(st);
      return st;
    },

    getState: () => ensurePilotModule(loadCareer()),
    saveState: (st) => saveCareer(st),

    getUserTeamKey: () => {
      const st = loadCareer();
      return getUserTeamKey(st || {});
    },

    getTeams: () => {
      const st = PilotMarketSystem.init();
      if (!st) return [];
      return getTeamsFromDB(st);
    },

    getRoster: (teamKey) => {
      const st = PilotMarketSystem.init();
      if (!st) return [];
      return getRoster(st, teamKey);
    },

    getActiveDriversForTeam: (teamKey) => {
      const st = PilotMarketSystem.init();
      if (!st) return [];
      return getActiveDriversForTeam(st, teamKey);
    },

    getFreeAgents: () => {
      const st = PilotMarketSystem.init();
      if (!st) return [];
      return getFreeAgents(st);
    },

    getPilot: (driverId) => {
      const st = PilotMarketSystem.init();
      if (!st) return null;
      return st.pilots.db[String(driverId || "").toUpperCase()] || null;
    },

    getContract: (driverId) => {
      const st = PilotMarketSystem.init();
      if (!st) return null;
      return st.pilots.contracts[String(driverId || "").toUpperCase()] || null;
    },

    terminateContract: (driverId, reason) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return terminateContract(st, String(driverId || "").toUpperCase(), reason);
    },

    hireDriver: (driverId, toTeamKey, years) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return hireDriver(st, String(driverId || "").toUpperCase(), toTeamKey, years);
    },

    extendContract: (driverId, extraYears) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return extendContract(st, String(driverId || "").toUpperCase(), extraYears);
    },

    // ✅ novo: aplica cláusulas/forma por GP
    applyRaceResults: (payload) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return applyRaceResults(st, payload);
    }
  };

  window.PilotMarketSystem = PilotMarketSystem;

})();
