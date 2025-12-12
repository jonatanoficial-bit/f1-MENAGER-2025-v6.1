/* =========================================================
   F1 MANAGER 2025 — SPONSOR SYSTEM
   ✔ Contratos realistas com metas
   ✔ Pagamento por corrida
   ✔ Multas e cancelamento
   ✔ Influência direta no desempenho
   ✔ Conectado ao GAME_STATE
   ========================================================= */

if (!window.GAME_STATE) {
  console.error("❌ GAME_STATE não encontrado");
}

/* =========================
   CONFIGURAÇÕES GERAIS
   ========================= */

const SPONSOR_TIERS = {
  local:   { min: 80_000,  max: 250_000, reputation: 0 },
  national:{ min: 250_000, max: 900_000, reputation: 30 },
  global:  { min: 900_000, max: 2_500_000, reputation: 60 }
};

const MAX_ACTIVE_SPONSORS = 5;

/* =========================
   GERAR OFERTAS DE PATROCÍNIO
   ========================= */

window.generateSponsorOffers = function () {
  const offers = [];

  const teamScore =
    GAME_STATE.team.basePerformance * 0.45 +
    GAME_STATE.manager.score * 0.35 +
    GAME_STATE.modifiers.sponsorBoost * 0.20;

  Object.entries(SPONSOR_TIERS).forEach(([tier, cfg]) => {
    if (GAME_STATE.manager.score < cfg.reputation) return;

    const chance =
      0.25 +
      teamScore / 400 +
      GAME_STATE.modifiers.sponsorBoost / 200;

    if (Math.random() < chance) {
      const baseValue = random(cfg.min, cfg.max);
      const value =
        baseValue *
        (0.85 + teamScore / 200) *
        (1 + GAME_STATE.modifiers.sponsorBoost / 100);

      offers.push({
        id: crypto.randomUUID(),
        name: sponsorName(tier),
        tier,
        valuePerRace: Math.round(value),
        duration: randomInt(6, 12),
        objectives: generateObjectives(tier),
        penalty: Math.round(value * 2)
      });
    }
  });

  return offers;
};

/* =========================
   ASSINAR CONTRATO
   ========================= */

window.signSponsor = function (offer) {
  if (GAME_STATE.sponsors.length >= MAX_ACTIVE_SPONSORS) return;

  GAME_STATE.sponsors.push({
    ...offer,
    racesLeft: offer.duration,
    status: "active",
    progress: initObjectiveProgress(offer.objectives)
  });

  console.log("🤝 Patrocínio assinado:", offer.name);
};

/* =========================
   PROCESSAR CORRIDA (CALL NO FIM DA RACE)
   ========================= */

window.processSponsorRaceResult = function (raceResult) {
  GAME_STATE.sponsors.forEach(sponsor => {
    if (sponsor.status !== "active") return;

    sponsor.racesLeft--;

    // Atualiza progresso de metas
    updateObjectives(sponsor, raceResult);

    // Pagamento
    GAME_STATE.team.budget += sponsor.valuePerRace;

    // Verificação de falha
    if (checkFailure(sponsor)) {
      sponsor.status = "failed";
      GAME_STATE.team.budget -= sponsor.penalty;
      GAME_STATE.manager.score -= 20;
      console.warn("❌ Patrocínio cancelado:", sponsor.name);
    }

    if (sponsor.racesLeft <= 0 && sponsor.status === "active") {
      sponsor.status = "completed";
      GAME_STATE.manager.score += 15;
      console.log("✅ Patrocínio concluído:", sponsor.name);
    }
  });

  // Remove expirados/falhos
  GAME_STATE.sponsors = GAME_STATE.sponsors.filter(
    s => s.status === "active"
  );
};

/* =========================
   OBJETIVOS
   ========================= */

function generateObjectives(tier) {
  if (tier === "local") {
    return {
      minFinishAvg: randomInt(12, 15),
      maxDNF: 2
    };
  }
  if (tier === "national") {
    return {
      minFinishAvg: randomInt(8, 11),
      minPoints: randomInt(12, 25)
    };
  }
  return {
    minFinishAvg: randomInt(6, 9),
    minPoints: randomInt(30, 50),
    noDNF: true
  };
}

function initObjectiveProgress(obj) {
  return {
    races: 0,
    totalFinish: 0,
    points: 0,
    dnfs: 0
  };
}

function updateObjectives(sponsor, race) {
  const p = sponsor.progress;
  p.races++;
  p.totalFinish += race.bestFinish;
  p.points += race.points;
  p.dnfs += race.dnfs || 0;
}

function checkFailure(sponsor) {
  const o = sponsor.objectives;
  const p = sponsor.progress;
  const avgFinish = p.totalFinish / p.races;

  if (o.minFinishAvg && avgFinish > o.minFinishAvg) return true;
  if (o.minPoints && p.points < o.minPoints) return true;
  if (o.noDNF && p.dnfs > 0) return true;
  if (o.maxDNF && p.dnfs > o.maxDNF) return true;

  return false;
}

/* =========================
   UTIL
   ========================= */

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sponsorName(tier) {
  const base = {
    local: ["AutoFix", "SpeedOil", "TrackOne"],
    national: ["NeoTech", "ApexFuel", "Velocity"],
    global: ["Hyperion", "Titan", "Quantum"]
  };
  return base[tier][Math.floor(Math.random() * base[tier].length)];
}

console.log("✅ sponsorSystem.js carregado corretamente");
