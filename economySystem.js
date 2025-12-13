/* =========================================================
   F1 MANAGER 2025 — ECONOMY / CAREER STATE (v6.1+)
   - Estado único de carreira (staff + sponsors + finanças)
   - Modificadores para performance (speed/grip/wear/pit/etc)
   - Payouts por GP, metas, reputação e risco de demissão
   - CONTRATOS REAIS DO MANAGER:
     • duração, metas (meia temporada e final), bônus/multa
     • propostas de outras equipes ao fim da temporada
     • demissão automática (50% da temporada) se falhar
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "f1m2025_career_v61";

  // -----------------------
  // Utils
  // -----------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      teamKey: (p.get("userTeam") || p.get("team") || localStorage.getItem("f1m2025_user_team") || localStorage.getItem("F1M_userTeam") || "mclaren").toLowerCase(),
    };
  }

  // -----------------------
  // Team tiers (simples)
  // 1 = topo, 4 = fundo (ajuste livre)
  // -----------------------
  function getTeamTier(teamKey) {
    const t = (teamKey || "").toLowerCase();
    if (["redbull", "rb", "mercedes", "ferrari", "mclaren"].includes(t)) return 1;
    if (["aston_martin", "astonmartin", "alpine"].includes(t)) return 2;
    if (["williams", "haas"].includes(t)) return 3;
    if (["sauber"].includes(t)) return 4;
    return 3;
  }

  function baseCashForTier(tier) {
    // valores aproximados, você pode calibrar depois
    return [0, 85000000, 55000000, 35000000, 22000000][tier] || 35000000;
  }

  function baseRepForTier(tier) {
    return [0, 65, 55, 45, 35][tier] || 45;
  }

  // -----------------------
  // Manager Contract (REAL)
  // -----------------------
  function makeManagerContract(teamKey, year) {
    const tier = getTeamTier(teamKey);

    // metas coerentes por tier (sem “reinventar” sua economia)
    // Ajuste livre depois, mas isso já funciona:
    const targetEndPos = [0, 2, 5, 8, 10][tier] || 8; // posição final no construtores
    const targetHalfPts = [0, 140, 85, 45, 20][tier] || 45; // mínimo de pts no meio
    const durationYears = tier === 1 ? 2 : 1; // topo tende a contratos mais longos

    // remuneração: semanal (economia trata “rodada” como semana equivalente)
    const weeklySalary = Math.round([0, 1400000, 950000, 650000, 420000][tier] || 650000);

    // bônus e multa
    const seasonBonus = Math.round([0, 18000000, 12000000, 8000000, 5000000][tier] || 8000000);
    const failPenalty = Math.round([0, 9000000, 6500000, 4500000, 2500000][tier] || 4500000);

    return {
      id: `MC_${teamKey}_${year}_${Math.floor(Math.random() * 1e9)}`,
      teamKey,
      startYear: year,
      endYear: year + durationYears - 1,
      signedAt: Date.now(),

      salaryWeekly: weeklySalary,

      objectives: {
        midSeason: { kind: "MIN_CONSTRUCTORS_POINTS", target: targetHalfPts }, // 50% da temporada
        endSeason: { kind: "MAX_CONSTRUCTORS_POSITION", target: targetEndPos }, // fim da temporada
      },

      clauses: {
        autoFireAtHalfSeason: true,
        allowEndSeasonOffers: true,
        allowRenewal: true,
        buyout: Math.round(weeklySalary * 6), // opcional
      },

      rewards: {
        bonusOnSuccess: seasonBonus,
        penaltyOnFail: failPenalty,
      },

      status: {
        active: true,
        terminated: false,
        terminatedReason: "",
      },
    };
  }

  function evaluateContractObjective(kind, target, ctx) {
    // ctx: { round, halfRound, constructorsPoints, constructorsPosition, racesTotal }
    if (kind === "MIN_CONSTRUCTORS_POINTS") return (ctx.constructorsPoints || 0) >= target;
    if (kind === "MAX_CONSTRUCTORS_POSITION") return (ctx.constructorsPosition || 99) <= target;
    return true;
  }

  // -----------------------
  // Default state
  // -----------------------
  function makeDefaultState(teamKey) {
    const tier = getTeamTier(teamKey);
    const baseCash = baseCashForTier(tier);
    const baseRep = baseRepForTier(tier);

    const year = 2025;

    const st = {
      version: "v6.1",
      createdAt: Date.now(),
      teamKey,

      season: {
        year,
        round: 1,
        racesTotal: 24,
        points: 0,
        constructorsPoints: 0,
        constructorsPosition: 10, // será atualizado quando você tiver standings reais
        fired: false,
        firedReason: "",
        endSeasonResolved: false,
      },

      economy: {
        cash: baseCash,
        reputation: baseRep, // 0..100
        exposure: 35,        // 0..100 (impacta patrocínios)
        weeklyCost: 0,       // calculado via staff
        lastPayoutAtRound: 0,
      },

      staff: {
        mechanics: { level: clamp(45 + (5 - tier) * 8, 25, 78), salary: 0 },
        engineering:{ level: clamp(42 + (5 - tier) * 8, 22, 76), salary: 0 },
        aero:       { level: clamp(40 + (5 - tier) * 7, 20, 74), salary: 0 },
        strategy:   { level: clamp(38 + (5 - tier) * 7, 18, 72), salary: 0 },
        marketing:  { level: clamp(35 + (5 - tier) * 6, 15, 70), salary: 0 },
        contracts: [] // contratos individuais (opcional)
      },

      sponsors: {
        active: [],
        offersSeed: Math.floor(Math.random() * 1e9),
      },

      garage: {
        lastSetup: null,
        devPoints: 0,
      },

      // ✅ CONTRATO REAL DO MANAGER + ofertas de equipes
      manager: {
        contract: makeManagerContract(teamKey, year),
        offers: [],
        lastOffersYear: 0,
      },
    };

    calcStaffSalaries(st);
    return st;
  }

  // -----------------------
  // Load / Save + Migration
  // -----------------------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const { teamKey } = getParams();
        const st = makeDefaultState(teamKey);
        save(st);
        return st;
      }

      const st = JSON.parse(raw);

      // migrações leves (não quebra saves antigos)
      if (!st.version) st.version = "v6.1";
      if (!st.season) st.season = { year: 2025, round: 1, racesTotal: 24, points: 0, constructorsPoints: 0, constructorsPosition: 10, fired: false, firedReason: "", endSeasonResolved: false };
      if (!st.economy) st.economy = { cash: 35000000, reputation: 45, exposure: 35, weeklyCost: 0, lastPayoutAtRound: 0 };
      if (!st.staff) st.staff = makeDefaultState(st.teamKey || "mclaren").staff;
      if (!st.sponsors) st.sponsors = { active: [], offersSeed: Math.floor(Math.random() * 1e9) };
      if (!st.garage) st.garage = { lastSetup: null, devPoints: 0 };

      // ✅ manager contract (se save antigo não tiver)
      if (!st.manager) st.manager = { contract: makeManagerContract(st.teamKey || "mclaren", st.season.year || 2025), offers: [], lastOffersYear: 0 };
      if (!st.manager.contract) st.manager.contract = makeManagerContract(st.teamKey || "mclaren", st.season.year || 2025);
      if (!Array.isArray(st.manager.offers)) st.manager.offers = [];
      if (typeof st.manager.lastOffersYear !== "number") st.manager.lastOffersYear = 0;

      calcStaffSalaries(st);
      return st;
    } catch (e) {
      const { teamKey } = getParams();
      const st = makeDefaultState(teamKey);
      save(st);
      return st;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Falha ao salvar economia:", e);
    }
  }

  // -----------------------
  // Staff salaries + weekly cost
  // -----------------------
  function staffSalary(level) {
    // salário escala suave
    return Math.round(80000 + level * 12000);
  }

  function calcStaffSalaries(state) {
    const s = state.staff;

    const areas = ["mechanics","engineering","aero","strategy","marketing"];
    let total = 0;

    for (const a of areas) {
      const lvl = clamp(s[a]?.level ?? 0, 0, 100);
      const sal = staffSalary(lvl);
      s[a].salary = sal;
      total += sal;
    }

    state.economy.weeklyCost = total;
  }

  // -----------------------
  // Modifiers (staff → performance)
  // -----------------------
  function getModifiers(state) {
    const mech = clamp(state.staff.mechanics.level, 0, 100) / 100;
    const eng  = clamp(state.staff.engineering.level, 0, 100) / 100;
    const aero = clamp(state.staff.aero.level, 0, 100) / 100;
    const strat= clamp(state.staff.strategy.level, 0, 100) / 100;

    // pitTimeMul: menor é melhor (mecânicos fortes)
    const pitTimeMul = clamp(1.15 - mech * 0.25, 0.82, 1.15);

    // desgaste: menor é melhor
    const tireWearMul = clamp(1.12 - eng * 0.20 - aero * 0.10, 0.80, 1.12);

    // combustível: menor é melhor
    const fuelUseMul = clamp(1.10 - strat * 0.18, 0.82, 1.10);

    // setup: maior é melhor
    const setupEffectMul = clamp(0.95 + eng * 0.14 + aero * 0.06, 0.95, 1.10);

    return { pitTimeMul, tireWearMul, fuelUseMul, setupEffectMul };
  }

  // -----------------------
  // Sponsors — ofertas e assinatura (já existia)
  // -----------------------
  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateSponsorOffers(state, count = 3) {
    const seed = state.sponsors.offersSeed + state.season.round * 99991;
    const rng = mulberry32(seed);

    const tier = getTeamTier(state.teamKey);
    const rep = state.economy.reputation;
    const exposure = state.economy.exposure;

    const types = [
      { type: "POINTS_PER_RACE", base: 3000000 },
      { type: "PODIUMS",        base: 4500000 },
      { type: "EXPOSURE",       base: 2500000 },
    ];

    const offers = [];
    for (let i = 0; i < count; i++) {
      const t = types[Math.floor(rng() * types.length)];

      const strength = clamp(0.6 + (rep / 120) + (exposure / 200) + (0.10 * (5 - tier)), 0.6, 1.6);
      const ann = Math.round(t.base * strength * (0.85 + rng() * 0.35));

      const objective = (() => {
        if (t.type === "POINTS_PER_RACE") return { kind: "POINTS_PER_RACE", target: Math.round(1 + rng() * (tier === 1 ? 4 : 3)) };
        if (t.type === "PODIUMS") return { kind: "PODIUMS", target: Math.round(rng() * (tier === 1 ? 6 : 3)) };
        if (t.type === "EXPOSURE") return { kind: "EXPOSURE", target: Math.round(40 + rng() * 40) };
        return null;
      })();

      const races = Math.round(6 + rng() * 8);

      const payPerRace = Math.round((ann / state.season.racesTotal) * (0.70 + rng() * 0.35));
      const bonus = Math.round(ann * (0.18 + rng() * 0.22));
      const penalty = Math.round(ann * (0.06 + rng() * 0.08));

      const namePool = ["Apex", "Nova", "Vortex", "Orion", "Pulse", "Titan", "Vertex", "Helios", "Umbra", "Eon"];
      const name = `${pick(namePool)} ${t.type === "PODIUMS" ? "Performance" : "Group"}`;

      offers.push({
        id: `SP_${t.type}_${state.season.round}_${i}_${Math.floor(rng() * 1e6)}`,
        type: t.type,
        name,
        annualValue: ann,
        races,
        payPerRace,
        bonus,
        penalty,
        objective,
      });
    }

    return offers;
  }

  function evaluateSponsorObjective(obj, prog) {
    if (!obj) return true;
    if (obj.kind === "POINTS_PER_RACE") return prog.points >= obj.target * 10; // ~10 GPs
    if (obj.kind === "PODIUMS") return prog.podiums >= obj.target;
    if (obj.kind === "EXPOSURE") return prog.exposure >= obj.target;
    return true;
  }

  function signSponsorContract(state, offer) {
    const contract = {
      id: offer.id,
      name: offer.name,
      type: offer.type,
      racesLeft: offer.races,
      payPerRace: offer.payPerRace,
      bonus: offer.bonus,
      penalty: offer.penalty,
      objective: offer.objective,
      progress: {
        points: 0,
        podiums: 0,
        exposure: state.economy.exposure,
        fulfilled: false,
        failed: false,
      }
    };

    state.sponsors.active.push(contract);

    // sinal (pequeno)
    const signOn = Math.round(offer.annualValue * 0.05);
    state.economy.cash = Math.round(state.economy.cash + signOn);

    save(state);
    return { ok: true, signOn };
  }

  // -----------------------
  // MANAGER — Ofertas de Equipe (fim de temporada)
  // -----------------------
  function generateManagerOffers(state) {
    const year = state.season.year;

    if (state.manager.lastOffersYear === year) return state.manager.offers;

    const rep = clamp(state.economy.reputation, 0, 100);
    const pts = Math.max(0, state.season.constructorsPoints || 0);
    const tierNow = getTeamTier(state.teamKey);

    // score para “atração de mercado”
    const marketScore = clamp((rep * 0.6) + (pts * 0.15), 0, 200);

    const teams = [
      "redbull","mercedes","ferrari","mclaren",
      "aston_martin","alpine",
      "williams","haas",
      "sauber","rb"
    ];

    const offers = [];

    // regra: no mínimo 2 ofertas se não estiver fired, 3 se estiver fired
    const desired = state.season.fired ? 3 : 2;

    const rng = mulberry32((state.sponsors.offersSeed || 123456) + year * 7777 + Math.floor(marketScore * 1000));

    // escolhe times com probabilidade ponderada por tier e score
    const candidates = teams
      .filter(t => t !== state.teamKey) // não oferece o mesmo time (renovação é outro fluxo)
      .map(t => {
        const tier = getTeamTier(t);
        const tierWeight = (tierNow - tier) * 12; // se você está bem, times melhores pesam mais
        const base = 30 + (tier === 1 ? 28 : tier === 2 ? 18 : tier === 3 ? 10 : 6);
        const w = clamp(base + tierWeight + marketScore * 0.25, 5, 140);
        return { teamKey: t, w, tier };
      });

    // sorteio sem repetição
    let guard = 0;
    while (offers.length < desired && guard++ < 200) {
      const sum = candidates.reduce((acc, c) => acc + c.w, 0);
      let r = rng() * sum;
      let chosen = null;
      for (const c of candidates) {
        r -= c.w;
        if (r <= 0) { chosen = c; break; }
      }
      if (!chosen) chosen = candidates[candidates.length - 1];

      if (offers.some(o => o.teamKey === chosen.teamKey)) continue;

      const tier = chosen.tier;

      const durationYears = tier === 1 ? 2 : 1 + (rng() < 0.20 ? 1 : 0);
      const salaryWeekly = Math.round([0, 1550000, 1050000, 720000, 480000][tier] || 720000);
      const signOnBonus = Math.round([0, 22000000, 14000000, 9000000, 5500000][tier] || 9000000);

      const targetEndPos = [0, 2, 5, 8, 10][tier] || 8;
      const targetHalfPts = [0, 140, 85, 45, 20][tier] || 45;

      offers.push({
        id: `TEAM_OFFER_${chosen.teamKey}_${year}_${Math.floor(rng() * 1e9)}`,
        teamKey: chosen.teamKey,
        year,
        durationYears,
        salaryWeekly,
        signOnBonus,
        objectives: {
          midSeason: { kind: "MIN_CONSTRUCTORS_POINTS", target: targetHalfPts },
          endSeason: { kind: "MAX_CONSTRUCTORS_POSITION", target: targetEndPos },
        },
        clauses: {
          autoFireAtHalfSeason: true,
          buyout: Math.round(salaryWeekly * 6),
        }
      });
    }

    state.manager.offers = offers;
    state.manager.lastOffersYear = year;
    save(state);
    return offers;
  }

  function acceptManagerOffer(state, offerId) {
    const offer = (state.manager.offers || []).find(o => o.id === offerId);
    if (!offer) return { ok: false, reason: "Oferta não encontrada." };

    // muda equipe do manager
    state.teamKey = offer.teamKey;

    // aplica bônus de assinatura
    state.economy.cash = Math.round(state.economy.cash + (offer.signOnBonus || 0));

    // cria novo contrato manager
    state.manager.contract = {
      id: `MC_${offer.teamKey}_${state.season.year}_${Math.floor(Math.random() * 1e9)}`,
      teamKey: offer.teamKey,
      startYear: state.season.year,
      endYear: state.season.year + offer.durationYears - 1,
      signedAt: Date.now(),
      salaryWeekly: offer.salaryWeekly,
      objectives: offer.objectives,
      clauses: offer.clauses,
      rewards: {
        bonusOnSuccess: Math.round((offer.signOnBonus || 0) * 0.35),
        penaltyOnFail: Math.round((offer.signOnBonus || 0) * 0.18),
      },
      status: { active: true, terminated: false, terminatedReason: "" }
    };

    // zera estado de “demitido”
    state.season.fired = false;
    state.season.firedReason = "";

    // limpa ofertas
    state.manager.offers = [];

    save(state);
    return { ok: true, teamKey: state.teamKey };
  }

  // -----------------------
  // Corrida → payouts + contrato manager (meia temp / fim)
  // -----------------------
  function settlePayoutsForRound(state, roundResult) {
    // roundResult esperado:
    // { teamPoints, podiums, bestLap, dnfs, avgFinish, finishedTopX, constructorsPoints, constructorsPosition, round, year, racesTotal }

    let deltaCash = 0;

    // Atualiza round/year se vierem do race system (opcional)
    if (typeof roundResult?.round === "number") state.season.round = roundResult.round;
    if (typeof roundResult?.year === "number") state.season.year = roundResult.year;
    if (typeof roundResult?.racesTotal === "number") state.season.racesTotal = roundResult.racesTotal;

    // Atualiza construtores (se vierem)
    if (typeof roundResult?.constructorsPoints === "number") state.season.constructorsPoints = roundResult.constructorsPoints;
    if (typeof roundResult?.constructorsPosition === "number") state.season.constructorsPosition = roundResult.constructorsPosition;

    // --- Sponsors (já existia)
    for (const c of state.sponsors.active) {
      if (c.racesLeft <= 0 || c.progress.failed) continue;

      deltaCash += c.payPerRace;

      if (typeof roundResult?.teamPoints === "number") c.progress.points += roundResult.teamPoints;
      if (typeof roundResult?.podiums === "number") c.progress.podiums += roundResult.podiums;

      // exposure “orgânico”
      if (typeof roundResult?.finishedTopX === "number") {
        state.economy.exposure = clamp(state.economy.exposure + (roundResult.finishedTopX ? 2 : 0), 0, 100);
      }

      c.progress.exposure = state.economy.exposure;

      c.racesLeft -= 1;

      if (c.racesLeft <= 0) {
        const ok = evaluateSponsorObjective(c.objective, c.progress);
        if (ok) {
          deltaCash += c.bonus;
          c.progress.fulfilled = true;
          state.economy.reputation = clamp(state.economy.reputation + 2, 0, 100);
          state.economy.exposure = clamp(state.economy.exposure + 3, 0, 100);
        } else {
          deltaCash -= c.penalty;
          c.progress.failed = true;
          state.economy.reputation = clamp(state.economy.reputation - 4, 0, 100);
          state.economy.exposure = clamp(state.economy.exposure - 2, 0, 100);
        }
      }
    }

    // ✅ Salário do Manager (contrato real) — por rodada como “semana equivalente”
    if (state.manager?.contract?.status?.active && !state.season.fired) {
      deltaCash -= Math.round(state.manager.contract.salaryWeekly || 0);
    }

    // ✅ Custo staff (já existia)
    calcStaffSalaries(state);
    deltaCash -= state.economy.weeklyCost;

    state.economy.cash = Math.max(0, Math.round(state.economy.cash + deltaCash));

    // ✅ Demissão (meia temporada) agora baseada no CONTRATO REAL
    checkFiringRisk(state);

    // ✅ Fim de temporada: gera ofertas e resolve bônus/multa de contrato
    checkEndSeason(state);

    save(state);
    return { deltaCash };
  }

  function checkFiringRisk(state) {
    const round = state.season.round;
    const half = Math.floor(state.season.racesTotal * 0.5);

    if (state.season.fired) return;

    const mc = state.manager?.contract;
    if (!mc || !mc.status?.active) return;

    if (mc.clauses?.autoFireAtHalfSeason && round >= half) {
      const ctx = {
        round,
        halfRound: half,
        constructorsPoints: state.season.constructorsPoints,
        constructorsPosition: state.season.constructorsPosition,
        racesTotal: state.season.racesTotal,
      };

      const ok = evaluateContractObjective(
        mc.objectives?.midSeason?.kind,
        mc.objectives?.midSeason?.target,
        ctx
      );

      if (!ok) {
        state.season.fired = true;
        state.season.firedReason =
          `Demitido por não cumprir meta de meia temporada do contrato (mínimo: ${mc.objectives.midSeason.target} pts no construtores).`;
        mc.status.active = false;
        mc.status.terminated = true;
        mc.status.terminatedReason = state.season.firedReason;

        // penalidade de reputação
        state.economy.reputation = clamp(state.economy.reputation - 10, 0, 100);
      }
    }
  }

  function checkEndSeason(state) {
    if (state.season.endSeasonResolved) return;

    const round = state.season.round;
    const total = state.season.racesTotal;

    // fim de temporada quando round >= total (você pode setar round corretamente no fluxo)
    if (round < total) return;

    const mc = state.manager?.contract;
    if (!mc) { state.season.endSeasonResolved = true; return; }

    const ctx = {
      round,
      halfRound: Math.floor(total * 0.5),
      constructorsPoints: state.season.constructorsPoints,
      constructorsPosition: state.season.constructorsPosition,
      racesTotal: total,
    };

    const okEnd = evaluateContractObjective(
      mc.objectives?.endSeason?.kind,
      mc.objectives?.endSeason?.target,
      ctx
    );

    if (!state.season.fired) {
      if (okEnd) {
        // bônus por sucesso
        const bonus = Math.round(mc.rewards?.bonusOnSuccess || 0);
        state.economy.cash = Math.round(state.economy.cash + bonus);
        state.economy.reputation = clamp(state.economy.reputation + 6, 0, 100);
      } else {
        // multa por falha (se não foi demitido no meio)
        const pen = Math.round(mc.rewards?.penaltyOnFail || 0);
        state.economy.cash = Math.max(0, Math.round(state.economy.cash - pen));
        state.economy.reputation = clamp(state.economy.reputation - 6, 0, 100);
      }
    }

    // gera ofertas ao final da temporada (se habilitado)
    if (mc.clauses?.allowEndSeasonOffers) {
      generateManagerOffers(state);
    }

    state.season.endSeasonResolved = true;
  }

  // -----------------------
  // Staff — contratação/demissão “por nível”
  // -----------------------
  function adjustStaffLevel(state, area, delta) {
    if (!state.staff[area]) return { ok: false, reason: "Área inválida." };

    const old = state.staff[area].level;
    const next = clamp(old + delta, 0, 100);
    state.staff[area].level = next;

    calcStaffSalaries(state);
    save(state);
    return { ok: true, old, next };
  }

  // -----------------------
  // Public API
  // -----------------------
  const F1MEconomy = {
    load,
    save,

    // staff/performance
    getModifiers: (st) => getModifiers(st || load()),
    adjustStaffLevel: (area, delta) => {
      const st = load();
      return adjustStaffLevel(st, area, delta);
    },

    // sponsors
    generateOffers: (count = 3) => {
      const st = load();
      const offers = generateSponsorOffers(st, count);
      return offers;
    },
    signContract: (offer) => {
      const st = load();
      return signSponsorContract(st, offer);
    },

    // ✅ manager contract API
    getManagerContract: () => {
      const st = load();
      return st.manager?.contract || null;
    },
    getManagerOffers: () => {
      const st = load();
      return st.manager?.offers || [];
    },
    generateManagerOffers: () => {
      const st = load();
      const offers = generateManagerOffers(st);
      return offers;
    },
    acceptManagerOffer: (offerId) => {
      const st = load();
      return acceptManagerOffer(st, offerId);
    },

    // GP payouts (chame no fim da corrida)
    settlePayoutsForRound: (roundResult) => {
      const st = load();
      return settlePayoutsForRound(st, roundResult);
    },
  };

  window.F1MEconomy = F1MEconomy;
})();
