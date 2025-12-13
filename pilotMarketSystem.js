/* =========================================================
   PILOT MARKET SYSTEM — F1 MANAGER 2025 (v6.1+)
   - Mercado de pilotos com contratos reais (salário, duração,
     bônus, buyout, metas opcionais)
   - Persistência dentro do mesmo save da economia:
       STORAGE_KEY = "f1m2025_career_v61"
   - Integra com dados existentes (PILOTOS / EQUIPES) se houver
   - NÃO altera corrida/HUD/SVG; apenas cria módulo de gestão
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
      // se a economia ainda não criou o save, tenta criar via F1MEconomy
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

  function getUserTeamKey(st) {
    const p = new URLSearchParams(location.search);
    return (p.get("userTeam") || localStorage.getItem("f1m2025_user_team") || localStorage.getItem("F1M_userTeam") || st?.teamKey || "mclaren").toLowerCase();
  }

  function normTeamKey(k) {
    return String(k || "").toLowerCase().replace(/\s+/g, "_");
  }

  function seedFromGlobals() {
    // Preferência: PILOTOS (data.js) com { id, nome, equipe, numero, pais?, sigla? }
    // Fallback: lista mínima com alguns pilotos (inclui BOR)
    const list = [];

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
          face: p.face || p.foto || null, // se você quiser mapear depois
          rating: clamp(Number(p.rating || p.overall || 75), 40, 99),
          potential: clamp(Number(p.potential || 80), 40, 99),
          age: Number(p.idade || p.age || 24) || 24
        });
      }
      return list;
    }

    // fallback mínimo — você vai atualizar depois com elenco 2025 real
    return [
      { id:"VER", name:"Max Verstappen", teamKey:"redbull", rating:95, potential:95, age:27, country:"NED", number:1, face:"VER.png" },
      { id:"PER", name:"Sergio Perez", teamKey:"redbull", rating:86, potential:86, age:34, country:"MEX", number:11, face:"PER.png" },
      { id:"HAM", name:"Lewis Hamilton", teamKey:"mercedes", rating:93, potential:93, age:40, country:"GBR", number:44, face:"HAM.png" },
      { id:"RUS", name:"George Russell", teamKey:"mercedes", rating:90, potential:92, age:26, country:"GBR", number:63, face:"RUS.png" },
      { id:"LEC", name:"Charles Leclerc", teamKey:"ferrari", rating:91, potential:93, age:27, country:"MON", number:16, face:"LEC.png" },
      { id:"SAI", name:"Carlos Sainz", teamKey:"ferrari", rating:89, potential:89, age:30, country:"ESP", number:55, face:"SAI.png" },
      { id:"NOR", name:"Lando Norris", teamKey:"mclaren", rating:90, potential:93, age:25, country:"GBR", number:4, face:"NOR.png" },
      { id:"PIA", name:"Oscar Piastri", teamKey:"mclaren", rating:88, potential:92, age:23, country:"AUS", number:81, face:"PIA.png" },
      { id:"ALO", name:"Fernando Alonso", teamKey:"aston_martin", rating:90, potential:90, age:43, country:"ESP", number:14, face:"ALO.png" },
      { id:"STR", name:"Lance Stroll", teamKey:"aston_martin", rating:82, potential:84, age:26, country:"CAN", number:18, face:"STR.png" },
      { id:"OCO", name:"Esteban Ocon", teamKey:"alpine", rating:84, potential:86, age:28, country:"FRA", number:31, face:"OCO.png" },
      { id:"GAS", name:"Pierre Gasly", teamKey:"alpine", rating:85, potential:86, age:28, country:"FRA", number:10, face:"GAS.png" },
      { id:"ALB", name:"Alex Albon", teamKey:"williams", rating:84, potential:86, age:28, country:"THA", number:23, face:"ALB.png" },
      { id:"SAR", name:"Logan Sargeant", teamKey:"williams", rating:78, potential:82, age:24, country:"USA", number:2, face:"SAR.png" },
      { id:"HUL", name:"Nico Hulkenberg", teamKey:"haas", rating:83, potential:83, age:37, country:"GER", number:27, face:"HUL.png" },
      { id:"MAG", name:"Kevin Magnussen", teamKey:"haas", rating:81, potential:82, age:32, country:"DEN", number:20, face:"MAG.png" },
      { id:"BOT", name:"Valtteri Bottas", teamKey:"sauber", rating:82, potential:82, age:35, country:"FIN", number:77, face:"BOT.png" },
      // ✅ Bortoleto (para casar com o seu asset assets/faces/BOR.png)
      { id:"BOR", name:"Gabriel Bortoleto", teamKey:"sauber", rating:79, potential:90, age:20, country:"BRA", number:98, face:"BOR.png" },
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
      for (const p of seed) st.pilots.db[p.id] = p;

      // cria contratos iniciais (2 anos) para quem tem teamKey != free
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
    return st;
  }

  function makeDriverContract(pilot, startYear, years) {
    const y = Math.max(1, Math.min(4, years || 1));
    const base = 500000; // weekly base
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
        performanceBonus: Math.round(salaryWeekly * 4),
        podiumBonus: Math.round(salaryWeekly * 2.5),
        dnfPenalty: Math.round(salaryWeekly * 1.2),
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
    // garante pelo menos o time do usuário
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
    // ordena por rating desc
    out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return out;
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

    // paga buyout para liberar
    const buyout = Math.round(c.buyout || 0);
    if ((st.economy?.cash || 0) < buyout) return { ok: false, reason: "Caixa insuficiente para buyout." };

    st.economy.cash = Math.max(0, Math.round(st.economy.cash - buyout));

    c.status.active = false;
    c.status.terminated = true;
    c.status.terminatedReason = reason || "Rescisão";

    // vira free agent
    p.teamKey = "free";
    if (!st.pilots.freeAgents.includes(driverId)) st.pilots.freeAgents.push(driverId);

    saveCareer(st);
    return { ok: true, buyout };
  }

  function hireDriver(st, driverId, toTeamKey, years) {
    const p = st.pilots.db[driverId];
    if (!p) return { ok: false, reason: "Piloto não encontrado." };

    const teamKey = normTeamKey(toTeamKey);

    // se piloto tem contrato ativo com outra equipe: precisa buyout
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

    // pagamento de assinatura
    const sign = Math.round(contract.signingBonus || 0);
    if ((st.economy?.cash || 0) < sign) return { ok: false, reason: "Caixa insuficiente para bônus de assinatura." };
    st.economy.cash = Math.max(0, Math.round(st.economy.cash - sign));

    // atualiza dados do piloto e contrato
    p.teamKey = teamKey;
    st.pilots.contracts[driverId] = contract;

    // remove de freeAgents
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

    // custo: novo bônus proporcional
    const bonus = Math.round((c.salaryWeekly || 0) * (2 + add));
    if ((st.economy?.cash || 0) < bonus) return { ok: false, reason: "Caixa insuficiente para renovação." };

    st.economy.cash = Math.max(0, Math.round(st.economy.cash - bonus));
    c.endYear = newEnd;

    saveCareer(st);
    return { ok: true, bonus, endYear: newEnd };
  }

  function rollSeasonYearIfNeeded(st) {
    // acompanha virada de ano caso você implemente isso no calendário
    const y = getYear(st);
    if (st.pilots.meta.lastYearRolled === y) return;

    // expira contratos e vira free agent
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

  // =========================
  // Public API
  // =========================
  const PilotMarketSystem = {
    init: () => {
      let st = loadCareer();
      if (!st && typeof window.F1MEconomy !== "undefined") st = window.F1MEconomy.load();
      st = ensurePilotModule(st);
      if (!st) return null;

      // garante teamKey user
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

    getFreeAgents: () => {
      const st = PilotMarketSystem.init();
      if (!st) return [];
      return getFreeAgents(st);
    },

    getContract: (driverId) => {
      const st = PilotMarketSystem.init();
      if (!st) return null;
      return st.pilots.contracts[driverId] || null;
    },

    terminateContract: (driverId, reason) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return terminateContract(st, driverId, reason);
    },

    hireDriver: (driverId, toTeamKey, years) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return hireDriver(st, driverId, toTeamKey, years);
    },

    extendContract: (driverId, extraYears) => {
      const st = PilotMarketSystem.init();
      if (!st) return { ok: false, reason: "Save não carregado." };
      return extendContract(st, driverId, extraYears);
    }
  };

  window.PilotMarketSystem = PilotMarketSystem;

})();
