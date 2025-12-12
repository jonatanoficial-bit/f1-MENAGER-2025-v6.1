/* =========================================================
   F1 MANAGER 2025 — ECONOMY / CAREER STATE (v6.1)
   - Estado único de carreira (staff + sponsors + finanças)
   - Modificadores para performance (speed/grip/wear/pit/etc)
   - Payouts por GP, metas, reputação e risco de demissão
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
      track: (p.get("track") || "australia").toLowerCase(),
      gp: p.get("gp") || "GP",
      userTeam: (p.get("userTeam") || "ferrari").toLowerCase(),
    };
  }

  // -----------------------
  // Team tiers / baseline
  // -----------------------
  const TEAM_TIERS = {
    // tier: 1 = top, 2 = upper-mid, 3 = mid, 4 = lower
    redbull: 1,
    ferrari: 1,
    mercedes: 1,
    mclaren: 2,
    aston: 2,
    alpine: 3,
    rb: 3,
    williams: 4,
    sauber: 4,
    haas: 4,
  };

  function getTeamTier(teamKey) {
    return TEAM_TIERS[teamKey] || 3;
  }

  function defaultState(teamKey) {
    const tier = getTeamTier(teamKey);
    // dinheiro e reputação base por tier
    const baseCash = [0, 140_000_000, 95_000_000, 55_000_000, 30_000_000][tier];
    const baseRep  = [0, 82, 62, 45, 28][tier];

    return {
      version: "v6.1",
      createdAt: Date.now(),
      teamKey,
      season: {
        year: 2025,
        round: 1,
        racesTotal: 24,
        points: 0,
        constructorsPoints: 0,
        fired: false,
        firedReason: "",
      },
      economy: {
        cash: baseCash,
        reputation: baseRep, // 0..100
        exposure: 35,        // 0..100 (impacta patrocínios)
        weeklyCost: 0,       // calculado via staff
        lastPayoutAtRound: 0,
      },
      staff: {
        // 0..100 cada área
        mechanics: { level: clamp(45 + (5 - tier) * 8, 25, 78), salary: 0 },
        engineering:{ level: clamp(42 + (5 - tier) * 8, 22, 76), salary: 0 },
        aero:       { level: clamp(40 + (5 - tier) * 7, 20, 74), salary: 0 },
        strategy:   { level: clamp(38 + (5 - tier) * 7, 18, 72), salary: 0 },
        marketing:  { level: clamp(35 + (5 - tier) * 6, 15, 70), salary: 0 },
        contracts: [] // contratações individuais (opcional)
      },
      sponsors: {
        active: [],   // contratos assinados
        offersSeed: Math.floor(Math.random() * 1e9),
      },
      garage: {
        // ajustes globais (a sua oficina já salva; aqui só conectamos)
        lastSetup: null,
        devPoints: 0,
      },
    };
  }

  function load() {
    const { userTeam } = getParams();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState(userTeam);

      const parsed = JSON.parse(raw);

      // migração simples (se mudar de equipe, preserva, mas atualiza teamKey se vazio)
      if (!parsed.teamKey) parsed.teamKey = userTeam;

      // se mudou equipe e usuário quer carreira por equipe: descomente a linha abaixo
      // if (parsed.teamKey !== userTeam) return defaultState(userTeam);

      return parsed;
    } catch {
      return defaultState(userTeam);
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function getState() {
    return load();
  }

  // -----------------------
  // Staff — salários e efeitos
  // -----------------------
  function calcStaffSalaries(state) {
    const tier = getTeamTier(state.teamKey);
    // salários anuais base por tier (valores "game-like" em €)
    const base = [0, 12_000_000, 8_500_000, 5_500_000, 3_800_000][tier];

    const areas = ["mechanics", "engineering", "aero", "strategy", "marketing"];
    let total = 0;

    for (const a of areas) {
      const lvl = clamp(state.staff[a].level, 0, 100);
      // curva: nível alto custa bem mais
      const cost = base * (0.55 + (lvl / 100) * 0.95);
      state.staff[a].salary = Math.round(cost);
      total += cost;
    }

    // custo semanal aproximado
    state.economy.weeklyCost = Math.round(total / 52);
  }

  function getModifiers(state) {
    // normaliza 0..1
    const m = clamp(state.staff.mechanics.level / 100, 0, 1);
    const e = clamp(state.staff.engineering.level / 100, 0, 1);
    const a = clamp(state.staff.aero.level / 100, 0, 1);
    const s = clamp(state.staff.strategy.level / 100, 0, 1);
    const k = clamp(state.staff.marketing.level / 100, 0, 1);

    // Modificadores (multiplicadores)
    const pitTimeMul     = 1.00 - (m * 0.18); // até -18%
    const setupEffectMul = 1.00 + (e * 0.14); // até +14% (amplifica efeito da oficina)
    const gripMul        = 1.00 + (a * 0.06); // até +6%
    const stabilityMul   = 1.00 + (a * 0.05); // até +5%
    const tireWearMul    = 1.00 - (s * 0.10); // até -10% desgaste
    const fuelUseMul     = 1.00 - (s * 0.06); // até -6% consumo
    const incidentMul    = 1.00 - (s * 0.05); // até -5% incidentes por decisão
    const sponsorOfferMul= 1.00 + (k * 0.22); // até +22% valor/oferta

    // reputação/exposição entram no funil
    const rep = clamp(state.economy.reputation / 100, 0, 1);
    const exp = clamp(state.economy.exposure / 100, 0, 1);

    return {
      pitTimeMul,
      setupEffectMul,
      gripMul,
      stabilityMul,
      tireWearMul,
      fuelUseMul,
      incidentMul,
      sponsorOfferMul,
      rep,
      exp,
    };
  }

  // -----------------------
  // Sponsors — geração, metas e pagamentos
  // -----------------------
  const SPONSOR_NAMES = [
    "Orion Dynamics", "Vanta Energy", "Helios Finance", "NovaTel", "Kairo Foods",
    "Apex Logistics", "Zenith Wear", "Solstice Bank", "Altair Systems", "PolarTech",
    "Nebula Media", "Vertex Tools", "Aurora Insurance", "Raven Security"
  ];

  const SPONSOR_TYPES = [
    { type: "MASTER", slots: 1, base: 22_000_000, risk: 0.65 },
    { type: "OFFICIAL", slots: 3, base: 7_500_000, risk: 0.40 },
    { type: "BONUS", slots: 2, base: 3_500_000, risk: 0.30 },
  ];

  function getMaxSlots(type) {
    const t = SPONSOR_TYPES.find(x => x.type === type);
    return t ? t.slots : 0;
  }

  function makeObjective(tier, rep, exp) {
    // tier baixo = metas mais fáceis, tier alto = metas mais agressivas
    // rep/exp altos lembram "marca forte": aumenta exigência e paga mais.
    const difficulty = clamp((1.15 - tier * 0.12) + rep * 0.22 + exp * 0.12, 0.55, 1.25);

    const objPool = [
      { kind: "POINTS_PER_RACE", label: "Somar pontos por GP", base: 6 },
      { kind: "FINISH_TOP", label: "Chegar no Top X", base: 10 },
      { kind: "PODIUMS", label: "Conquistar pódios", base: 1 },
      { kind: "BEST_LAP", label: "Melhor volta (1x por contrato)", base: 1 },
      { kind: "NO_DNF", label: "Evitar abandonos", base: 0 },
    ];

    const chosen = pick(objPool);

    if (chosen.kind === "POINTS_PER_RACE") {
      const target = Math.round(chosen.base * difficulty);
      return { kind: chosen.kind, label: chosen.label, target: clamp(target, 3, 18) };
    }
    if (chosen.kind === "FINISH_TOP") {
      const t = Math.round(chosen.base / difficulty);
      return { kind: chosen.kind, label: chosen.label, target: clamp(t, 4, 14) };
    }
    if (chosen.kind === "PODIUMS") {
      const t = Math.round(chosen.base * difficulty);
      return { kind: chosen.kind, label: chosen.label, target: clamp(t, 1, 4) };
    }
    if (chosen.kind === "BEST_LAP") {
      return { kind: chosen.kind, label: chosen.label, target: 1 };
    }
    if (chosen.kind === "NO_DNF") {
      return { kind: chosen.kind, label: chosen.label, target: 0 };
    }
    return { kind: "POINTS_PER_RACE", label: "Somar pontos por GP", target: 6 };
  }

  function genOffers(state) {
    // determinístico por seed e round para não "pular" ofertas
    const seed = state.sponsors.offersSeed + state.season.round * 99991;
    const rng = mulberry32(seed);

    const tier = getTeamTier(state.teamKey);
    const mod = getModifiers(state);

    const offers = [];

    for (const t of SPONSOR_TYPES) {
      for (let i = 0; i < t.slots; i++) {
        const name = SPONSOR_NAMES[Math.floor(rng() * SPONSOR_NAMES.length)];
        const repBoost = (0.75 + mod.rep * 0.85);
        const expBoost = (0.80 + mod.exp * 0.65);
        const staffBoost = mod.sponsorOfferMul;

        // base anual ajustado
        const annual = Math.round(
          t.base *
          repBoost *
          expBoost *
          staffBoost *
          (0.95 + rng() * 0.15) *
          (tier <= 2 ? 1.12 : tier === 3 ? 1.0 : 0.88)
        );

        const obj = makeObjective(tier, mod.rep, mod.exp);
        const bonus = Math.round(annual * (0.06 + rng() * 0.10));
        const penalty = Math.round(annual * (0.04 + rng() * 0.08));

        offers.push({
          id: `SP_${t.type}_${state.season.round}_${i}_${Math.floor(rng() * 1e6)}`,
          type: t.type,
          name,
          annualValue: annual,
          payPerRace: Math.round(annual / state.season.racesTotal),
          objective: obj,
          bonus,
          penalty,
          risk: clamp(t.risk + (rng() * 0.12 - 0.06), 0.15, 0.90),
          durationRaces: clamp(Math.round(10 + rng() * 12), 8, state.season.racesTotal),
        });
      }
    }

    return offers;
  }

  function signContract(state, offer) {
    const activeSameType = state.sponsors.active.filter(c => c.type === offer.type);
    const max = getMaxSlots(offer.type);
    if (activeSameType.length >= max) {
      return { ok: false, reason: `Sem slots disponíveis para ${offer.type}.` };
    }

    state.sponsors.active.push({
      ...offer,
      signedAtRound: state.season.round,
      racesLeft: offer.durationRaces,
      progress: {
        points: 0,
        podiums: 0,
        bestLap: 0,
        dnfs: 0,
        fulfilled: false,
        failed: false,
      }
    });

    // reputação sobe ao fechar (leve)
    state.economy.reputation = clamp(state.economy.reputation + 1, 0, 100);
    save(state);
    return { ok: true };
  }

  function settlePayoutsForRound(state, roundResult) {
    // roundResult esperado:
    // { teamPoints, podiums, bestLap, dnfs, avgFinish, finishedTopX }
    // Você pode chamar isso ao final da corrida.

    let deltaCash = 0;

    for (const c of state.sponsors.active) {
      if (c.racesLeft <= 0 || c.progress.failed) continue;

      // pagamento por GP
      deltaCash += c.payPerRace;

      // progresso de metas
      if (typeof roundResult?.teamPoints === "number") c.progress.points += roundResult.teamPoints;
      if (typeof roundResult?.podiums === "number") c.progress.podiums += roundResult.podiums;
      if (typeof roundResult?.bestLap === "number") c.progress.bestLap += roundResult.bestLap;
      if (typeof roundResult?.dnfs === "number") c.progress.dnfs += roundResult.dnfs;

      c.racesLeft -= 1;

      // checagem de meta ao acabar contrato
      if (c.racesLeft <= 0) {
        const ok = evaluateObjective(c.objective, c.progress);
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

    // custo semanal/GP (staff) — simplificado: 1 “semana equivalente” por rodada
    calcStaffSalaries(state);
    deltaCash -= state.economy.weeklyCost;

    state.economy.cash = Math.max(0, Math.round(state.economy.cash + deltaCash));

    // risco de demissão (meia temporada)
    checkFiringRisk(state);

    save(state);
    return { deltaCash };
  }

  function evaluateObjective(obj, prog) {
    if (!obj) return true;
    if (obj.kind === "POINTS_PER_RACE") return prog.points >= obj.target * 10; // contrato ~10 GPs médio
    if (obj.kind === "FINISH_TOP") return true; // avalie via dados reais, aqui fica “OK” (placeholder)
    if (obj.kind === "PODIUMS") return prog.podiums >= obj.target;
    if (obj.kind === "BEST_LAP") return prog.bestLap >= 1;
    if (obj.kind === "NO_DNF") return prog.dnfs === 0;
    return true;
  }

  function checkFiringRisk(state) {
    const round = state.season.round;
    const half = Math.floor(state.season.racesTotal * 0.5);

    if (state.season.fired) return;

    if (round >= half) {
      // meta mínima por tier (pontos de equipe)
      const tier = getTeamTier(state.teamKey);
      const minPts = [0, 140, 85, 45, 20][tier];

      if (state.season.constructorsPoints < minPts) {
        state.season.fired = true;
        state.season.firedReason = `Demitido por performance abaixo da meta mínima no meio da temporada (meta: ${minPts} pts).`;
      }
    }
  }

  // -----------------------
  // Staff — contratação/demissão “por nível”
  // -----------------------
  function adjustStaffLevel(state, area, delta) {
    if (!state.staff[area]) return { ok: false, reason: "Área inválida." };

    const old = state.staff[area].level;
    const next = clamp(old + delta, 0, 100);

    // custo para aumentar (assinatura/bonificação) — sobe com nível
    const tier = getTeamTier(state.teamKey);
    const signBase = [0, 8_000_000, 5_000_000, 2_800_000, 1_600_000][tier];
    const upgradeCost = delta > 0 ? Math.round(signBase * (0.35 + next / 120)) : 0;

    // demitir reduz custo (mas penaliza reputação)
    const firePenaltyRep = delta < 0 ? 1 : 0;

    if (upgradeCost > 0 && state.economy.cash < upgradeCost) {
      return { ok: false, reason: "Caixa insuficiente para melhoria do quadro." };
    }

    state.staff[area].level = next;

    if (upgradeCost > 0) state.economy.cash -= upgradeCost;
    if (firePenaltyRep > 0) state.economy.reputation = clamp(state.economy.reputation - firePenaltyRep, 0, 100);

    calcStaffSalaries(state);
    save(state);
    return { ok: true, upgradeCost };
  }

  // -----------------------
  // Deterministic RNG (mulberry32)
  // -----------------------
  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // -----------------------
  // Public API
  // -----------------------
  const F1MEconomy = {
    STORAGE_KEY,
    getParams,
    getState,
    save,
    getModifiers: () => getModifiers(load()),
    genOffers: () => genOffers(load()),
    signContract: (offer) => {
      const st = load();
      return signContract(st, offer);
    },
    settlePayoutsForRound: (roundResult) => {
      const st = load();
      return settlePayoutsForRound(st, roundResult);
    },
    adjustStaffLevel: (area, delta) => {
      const st = load();
      return adjustStaffLevel(st, area, delta);
    },
  };

  window.F1MEconomy = F1MEconomy;
})();
