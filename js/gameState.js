/* js/gameState.js
   Save offline (localStorage) — F1 Manager 2025 Vale Edition
   - Não usa API externa
   - Estado único por navegador
*/

(function () {
  const STORAGE_KEY = "F1M25_VALE_SAVE_V2";

  function nowISO() { return new Date().toISOString(); }

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function getQueryParam(name) {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(name);
    } catch {
      return null;
    }
  }

  function normalizeTeamId(teamId) {
    return String(teamId || "redbull").toLowerCase().trim();
  }

  function formatMoney(n) {
    const v = Math.floor(Number(n || 0));
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return "R$ " + v;
    }
  }

  function defaultSponsors() {
    return {
      active: null, // 1 contrato ativo (como na sua tela)
      offers: [
        {
          id: "neo_hyper",
          name: "NEO HYPER",
          tier: "Principal",
          weeklyPay: 850000,
          signingBonus: 2500000,
          objective: "Marcar 12+ pontos na próxima corrida",
          reputationReq: 0,
        },
        {
          id: "aurora_finance",
          name: "AURORA FINANCE",
          tier: "Secundário",
          weeklyPay: 420000,
          signingBonus: 750000,
          objective: "Terminar no TOP 10 na próxima corrida",
          reputationReq: 0,
        },
        {
          id: "vertex_network",
          name: "VERTEX NETWORK",
          tier: "Principal",
          weeklyPay: 1000000,
          signingBonus: 3500000,
          objective: "Conseguir 1 pódio em até 3 corridas",
          reputationReq: 55,
        },
        {
          id: "solace_energy",
          name: "SOLACE ENERGY",
          tier: "Apoio",
          weeklyPay: 220000,
          signingBonus: 250000,
          objective: "Terminar no TOP 15 na próxima corrida",
          reputationReq: 0,
        },
      ],
      lastWeekPaidAt: null,
    };
  }

  function defaultStaff() {
    return {
      hired: {
        pace: 0.00,   // MOD PACE
        tire: 0.00,   // MOD TIRE
        pit: 0.00,    // MOD PIT
        strat: 0.00,  // MOD STRAT
        list: [],     // lista contratada
      },
      offers: [
        {
          id: "chief_eng_renato",
          role: "Engenheiro Chefe",
          name: "Renato Vilar",
          weeklyWage: 95000,
          signingBonus: 250000,
          mods: { pace: 0.06, tire: 0.05, pit: 0.00, strat: 0.02 },
          reputationReq: 0,
        },
        {
          id: "strategist_maya",
          role: "Estrategista",
          name: "Maya Kwon",
          weeklyWage: 72000,
          signingBonus: 180000,
          mods: { pace: 0.02, tire: 0.00, pit: 0.00, strat: 0.08 },
          reputationReq: 0,
        },
        {
          id: "pitboss_davi",
          role: "Chefe de Pit Crew",
          name: "Davi Sato",
          weeklyWage: 68000,
          signingBonus: 150000,
          mods: { pace: 0.00, tire: 0.00, pit: 0.10, strat: 0.02 },
          reputationReq: 10,
        },
        {
          id: "aero_isabella",
          role: "Aero Lead",
          name: "Isabella Romano",
          weeklyWage: 108000,
          signingBonus: 350000,
          mods: { pace: 0.05, tire: 0.03, pit: 0.00, strat: 0.00 },
          reputationReq: 25,
        },
      ],
      lastWeekPaidAt: null,
    };
  }

  function defaultDrivers(teamId) {
    // Base simples para tirar "em breve" do mercado.
    // Você pode substituir depois pelos pilotos reais.
    const t = normalizeTeamId(teamId);
    return {
      teamId: t,
      yourDrivers: [
        { id: "d1", name: "Piloto 1", overall: 88, salaryWeekly: 180000, contractEnds: 2025 },
        { id: "d2", name: "Piloto 2", overall: 84, salaryWeekly: 140000, contractEnds: 2025 },
      ],
      market: [
        { id: "m1", name: "Veterano Rápido", overall: 90, salaryWeekly: 260000, buyout: 1800000, available: true },
        { id: "m2", name: "Talento Jovem", overall: 82, salaryWeekly: 120000, buyout: 650000, available: true },
        { id: "m3", name: "Consistente", overall: 86, salaryWeekly: 170000, buyout: 950000, available: true },
      ],
    };
  }

  function defaultCar() {
    return {
      setup: { aero: 50, suspension: 50, tyres: 50, brakes: 50 },
      stats: { aero: 78, power: 84, chassis: 76, reliability: 74, tyreManagement: 72 }
    };
  }

  function defaultCareer(teamId) {
    return {
      season: 2025,
      round: 1,
      money: 12000000,
      reputation: 40,
      teamId: normalizeTeamId(teamId),
      lastUpdatedAt: nowISO(),
    };
  }

  function createDefaultState(teamId) {
    const tid = normalizeTeamId(teamId);
    return {
      version: 2,
      createdAt: nowISO(),
      career: defaultCareer(tid),
      car: defaultCar(),
      sponsors: defaultSponsors(),
      staff: defaultStaff(),
      drivers: defaultDrivers(tid),
    };
  }

  function loadState(teamIdFromUrl) {
    const tid = normalizeTeamId(teamIdFromUrl || "redbull");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const st = createDefaultState(tid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
      return st;
    }
    try {
      const parsed = JSON.parse(raw);
      const base = createDefaultState(tid);

      // merge raso + campos importantes
      const merged = Object.assign({}, base, parsed);
      merged.career = Object.assign({}, base.career, parsed.career || {});
      merged.car = Object.assign({}, base.car, parsed.car || {});
      merged.sponsors = Object.assign({}, base.sponsors, parsed.sponsors || {});
      merged.staff = Object.assign({}, base.staff, parsed.staff || {});
      merged.drivers = Object.assign({}, base.drivers, parsed.drivers || {});

      merged.career.teamId = tid;
      if (merged.drivers) merged.drivers.teamId = tid;

      return merged;
    } catch {
      const st = createDefaultState(tid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
      return st;
    }
  }

  function saveState(state) {
    const st = deepClone(state);
    st.career.lastUpdatedAt = nowISO();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    return st;
  }

  function addMoney(state, amount) {
    const v = Math.floor(Number(amount || 0));
    state.career.money = Math.max(0, Math.floor(Number(state.career.money || 0) + v));
    return state;
  }

  function addReputation(state, amount) {
    const v = Number(amount || 0);
    state.career.reputation = Math.max(0, Math.min(100, Number(state.career.reputation || 0) + v));
    return state;
  }

  window.F1M25 = window.F1M25 || {};
  window.F1M25.GameState = {
    STORAGE_KEY,
    getQueryParam,
    normalizeTeamId,
    loadState,
    saveState,
    addMoney,
    addReputation,
    formatMoney,
  };
})();