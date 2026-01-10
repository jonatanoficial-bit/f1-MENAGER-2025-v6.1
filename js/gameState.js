/* js/gameState.js
   GameState offline (localStorage) - Fórmula 1 Manager 2025 Vale Edition
   - Não usa API externa
   - Estrutura estável pra patrocínios, funcionários, carro, calendário, etc.
*/

(function () {
  const STORAGE_KEY = "F1M25_VALE_SAVE_V1";

  function nowISO() {
    return new Date().toISOString();
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function normalizeTeamId(teamId) {
    if (!teamId) return "redbull";
    return String(teamId).toLowerCase().trim();
  }

  function defaultSponsors() {
    // Pools de patrocinadores (fictícios/genéricos para evitar licenças)
    return {
      active: [
        {
          id: "neo_hyper",
          name: "NEO HYPER",
          tier: "Principal",
          weeklyPay: 850000,
          signingBonus: 2500000,
          objective: { type: "points_in_next_race", value: 12 },
          prestige: 78,
          createdAt: nowISO(),
        },
        {
          id: "aurora_finance",
          name: "AURORA FINANCE",
          tier: "Secundário",
          weeklyPay: 420000,
          signingBonus: 750000,
          objective: { type: "finish_top10_next_race", value: 1 },
          prestige: 62,
          createdAt: nowISO(),
        },
      ],
      offers: [
        {
          id: "vertex_network",
          name: "VERTEX NETWORK",
          tier: "Principal",
          weeklyPay: 1000000,
          signingBonus: 3500000,
          objective: { type: "podium_in_3_races", value: 1 },
          prestige: 86,
        },
        {
          id: "solace_energy",
          name: "SOLACE ENERGY",
          tier: "Secundário",
          weeklyPay: 520000,
          signingBonus: 1200000,
          objective: { type: "points_in_next_race", value: 8 },
          prestige: 66,
        },
        {
          id: "kairo_wear",
          name: "KAIRO WEAR",
          tier: "Apoio",
          weeklyPay: 220000,
          signingBonus: 250000,
          objective: { type: "finish_top15_next_race", value: 1 },
          prestige: 48,
        },
      ],
      lastPayoutAt: null,
    };
  }

  function defaultStaff() {
    // Staff impacta corrida/treino via multiplicadores (padrão simples e estável)
    return {
      hired: [
        {
          id: "chief_engineer_01",
          role: "Engenheiro Chefe",
          name: "Renato Vilar",
          rating: 78,
          wageWeekly: 95000,
          effects: {
            setupGain: 0.08,
            tyreWear: -0.03,
            reliability: 0.04,
          },
          hiredAt: nowISO(),
        },
        {
          id: "strategist_01",
          role: "Estrategista",
          name: "Maya Kwon",
          rating: 74,
          wageWeekly: 72000,
          effects: {
            pitDecision: 0.07,
            weatherRead: 0.08,
          },
          hiredAt: nowISO(),
        },
      ],
      offers: [
        {
          id: "chief_engineer_02",
          role: "Engenheiro Chefe",
          name: "Gustavo Ibarra",
          rating: 83,
          wageWeekly: 125000,
          signingBonus: 450000,
          effects: {
            setupGain: 0.10,
            tyreWear: -0.04,
            reliability: 0.06,
          },
        },
        {
          id: "aero_lead_01",
          role: "Líder de Aero",
          name: "Isabella Romano",
          rating: 80,
          wageWeekly: 108000,
          signingBonus: 350000,
          effects: {
            aeroEff: 0.08,
            dragEff: 0.03,
          },
        },
        {
          id: "pitcrew_01",
          role: "Chefe de Pit Crew",
          name: "Davi Sato",
          rating: 76,
          wageWeekly: 68000,
          signingBonus: 250000,
          effects: {
            pitTime: -0.12, // -12% tempo
            pitError: -0.05,
          },
        },
      ],
    };
  }

  function defaultCar() {
    return {
      setup: {
        aero: 50, // 0-100
        suspension: 50,
        tyres: 50,
        brakes: 50,
      },
      stats: {
        aero: 78,
        power: 84,
        chassis: 76,
        reliability: 74,
        tyreManagement: 72,
      },
      partsWear: {
        ice: 0.12,
        ers: 0.10,
        gearbox: 0.08,
      },
    };
  }

  function defaultCareer() {
    return {
      season: 2025,
      currentRound: 1,
      points: 0,
      money: 12000000,
      costCapRemaining: 135000000,
      reputation: 55,
      manager: {
        name: "Manager",
        nationality: "BR",
        contract: {
          teamId: "redbull",
          expiresSeason: 2026,
          salaryWeekly: 65000,
        },
        jobOffers: [],
      },
      lastUpdatedAt: nowISO(),
    };
  }

  function defaultSession() {
    // dados de sessão (treino/qualy/corrida) podem ser preenchidos pelos seus scripts existentes
    return {
      selectedTrackKey: "australia",
      selectedMode: "career",
      lastSession: null,
    };
  }

  function defaultRoster() {
    // mínimo necessário pro lobby; seus scripts podem ter base real completa em outros arquivos
    return {
      teamId: "redbull",
      drivers: [
        { id: "p1", name: "Piloto 1", rating: 88, tyreSkill: 80, wetSkill: 76 },
        { id: "p2", name: "Piloto 2", rating: 84, tyreSkill: 78, wetSkill: 74 },
      ],
    };
  }

  function createDefaultState(teamId) {
    const t = normalizeTeamId(teamId);
    const state = {
      version: 1,
      createdAt: nowISO(),
      career: defaultCareer(),
      roster: defaultRoster(),
      car: defaultCar(),
      sponsors: defaultSponsors(),
      staff: defaultStaff(),
      session: defaultSession(),
      flags: {
        tutorialDone: false,
      },
    };
    state.career.manager.contract.teamId = t;
    state.roster.teamId = t;
    state.session.selectedTrackKey = "australia";
    return state;
  }

  function loadState(teamIdFromUrl) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const st = createDefaultState(teamIdFromUrl);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
      return st;
    }
    try {
      const parsed = JSON.parse(raw);
      // fallback/merge simples caso falte algo
      const base = createDefaultState(teamIdFromUrl);
      const merged = Object.assign({}, base, parsed);

      // merge profundidade mínima
      merged.career = Object.assign({}, base.career, parsed.career || {});
      merged.roster = Object.assign({}, base.roster, parsed.roster || {});
      merged.car = Object.assign({}, base.car, parsed.car || {});
      merged.sponsors = Object.assign({}, base.sponsors, parsed.sponsors || {});
      merged.staff = Object.assign({}, base.staff, parsed.staff || {});
      merged.session = Object.assign({}, base.session, parsed.session || {});
      merged.flags = Object.assign({}, base.flags, parsed.flags || {});

      // garante teamId coerente
      const tid = normalizeTeamId(teamIdFromUrl || merged.roster.teamId);
      merged.roster.teamId = tid;
      merged.career.manager.contract.teamId = tid;

      return merged;
    } catch (e) {
      const st = createDefaultState(teamIdFromUrl);
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
    state.career.money = Math.max(0, Math.floor(state.career.money + amount));
    return state;
  }

  function formatMoney(n) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return "R$ " + String(n);
    }
  }

  function objectiveText(obj) {
    if (!obj || !obj.type) return "Sem objetivo";
    const v = obj.value;
    switch (obj.type) {
      case "points_in_next_race":
        return `Marcar ${v}+ pontos na próxima corrida`;
      case "finish_top10_next_race":
        return `Terminar no TOP 10 na próxima corrida`;
      case "finish_top15_next_race":
        return `Terminar no TOP 15 na próxima corrida`;
      case "podium_in_3_races":
        return `Conseguir 1 pódio em até 3 corridas`;
      default:
        return "Objetivo especial";
    }
  }

  // Export global
  window.F1M25 = window.F1M25 || {};
  window.F1M25.GameState = {
    STORAGE_KEY,
    getQueryParam,
    normalizeTeamId,
    loadState,
    saveState,
    addMoney,
    formatMoney,
    objectiveText,
  };
})();