/* raceSystem.js — CORE da corrida (estado, desgaste, pit, voltas, fim) */

(function () {
  "use strict";

  // ===== Helpers =====
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function now() { return performance.now(); }
  function qs(name, def = "") {
    const url = new URL(location.href);
    const v = url.searchParams.get(name);
    return v == null || v === "" ? def : v;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmtPct(x) { return `${Math.round(x)}%`; }

  // ===== Teams (cores) =====
  const TEAMS = {
    mclaren: { name: "McLaren", color: "#ff7a00" },
    ferrari: { name: "Ferrari", color: "#e10600" },
    mercedes: { name: "Mercedes", color: "#00d2be" },
    redbull: { name: "Red Bull", color: "#2a4cff" },
    aston: { name: "Aston Martin", color: "#006f62" },
    alpine: { name: "Alpine", color: "#ff4db8" },
    williams: { name: "Williams", color: "#00a6ff" },
    haas: { name: "Haas", color: "#c9c9c9" },
    rb: { name: "RB", color: "#4da3ff" },
    sauber: { name: "Sauber / Audi", color: "#00ff5a" }
  };

  // ===== Drivers (grid 20) =====
  // IDs aqui precisam bater com o nome do arquivo em assets/faces/<id>.png
  const GRID_20 = [
    { id: "norris",    name: "Lando Norris",     team: "mclaren", code: "LN" },
    { id: "piastri",   name: "Oscar Piastri",    team: "mclaren", code: "OP" },

    { id: "leclerc",   name: "Charles Leclerc",  team: "ferrari", code: "CL" },
    { id: "sainz",     name: "Carlos Sainz",     team: "ferrari", code: "CS" },

    { id: "hamilton",  name: "Lewis Hamilton",   team: "mercedes", code: "LH" },
    { id: "russell",   name: "George Russell",   team: "mercedes", code: "GR" },

    { id: "verstappen",name: "Max Verstappen",   team: "redbull", code: "MV" },
    { id: "perez",     name: "Sergio Perez",     team: "redbull", code: "SP" },

    { id: "alonso",    name: "Fernando Alonso",  team: "aston", code: "FA" },
    { id: "stroll",    name: "Lance Stroll",     team: "aston", code: "LS" },

    { id: "ocon",      name: "Esteban Ocon",     team: "alpine", code: "EO" },
    { id: "gasly",     name: "Pierre Gasly",     team: "alpine", code: "PG" },

    { id: "albon",     name: "Alex Albon",       team: "williams", code: "AA" },
    { id: "sargeant",  name: "Logan Sargeant",   team: "williams", code: "LO" },

    { id: "hulkenberg",name: "Nico Hülkenberg",  team: "haas", code: "NH" },
    { id: "magnussen", name: "Kevin Magnussen",  team: "haas", code: "KM" },

    { id: "tsunoda",   name: "Yuki Tsunoda",     team: "rb", code: "YT" },
    { id: "lawson",    name: "Liam Lawson",      team: "rb", code: "LL" },

    { id: "zhou",      name: "Guanyu Zhou",      team: "sauber", code: "GZ" },
    { id: "bortoleto", name: "Gabriel Bortoleto",team: "sauber", code: "GB" }
  ];

  // ===== Race Config =====
  const RaceConfig = {
    fps: 60,
    basePace: 0.040,           // avanço base por tick (normal)
    overtakeNoise: 0.0025,     // variação
    degradeBase: 0.010,        // desgaste base por segundo
    engineWearBase: 0.004,     // motor base por segundo
    ersRegen: 2.0,             // % por segundo
    ersUse: 5.5,               // % por segundo quando boost
    pitTimeMs: 6500,           // tempo total do pit
    pitPenaltyProgress: 0.060, // “perda” em progress (simula entrar/saír)
    lapWrapThreshold: 0.92,    // quando considera perto do fim
    lapStartThreshold: 0.08    // quando considera início
  };

  // ===== Public State =====
  const RaceState = {
    gpName: qs("gp", "GP da Austrália 2025"),
    trackKey: qs("track", "australia"),
    userTeam: (qs("userTeam", "ferrari") || "ferrari").toLowerCase(),
    totalLaps: parseInt(qs("laps", "5"), 10) || 5,
    weather: qs("weather", pick(["Seco", "Chuva"])),
    trackTemp: parseInt(qs("temp", String(pick([21,24,26,28,29]))), 10),

    speedMult: 1,
    startedAt: now(),
    finished: false,
    winnerId: null,

    // preenchido depois que track points carregarem (renderer)
    track: {
      points: [],
      startIndex: 0
    },

    drivers: [],
    yourDriverIds: []
  };

  // ===== Driver factory =====
  function makeDriver(base, seedIndex) {
    const team = TEAMS[base.team] || { name: base.team, color: "#888" };

    return {
      id: base.id,
      code: base.code || base.name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase(),
      name: base.name,
      teamKey: base.team,
      teamName: team.name,
      teamColor: team.color,

      // corrida
      lap: 1,
      finished: false,
      delta: 0,
      progress: (seedIndex * 0.012) % 1,   // posição ao longo da pista (0..1)
      prevProgress: 0,
      position: seedIndex + 1,
      lastLapTime: null,

      // desgaste / controles
      tyre: 100,
      engine: 100,
      ers: 60,
      mode: "NORMAL", // ECONOMIZAR, NORMAL, ATAQUE
      motorMap: 2,    // 1..3
      aggress: 2,     // 1..3
      ersBoost: false,

      // pit
      requestPit: false,
      inPit: false,
      pitEndsAt: 0
    };
  }

  // ===== Init grid + pick your drivers =====
  function initDrivers() {
    const drivers = GRID_20.map((d, i) => makeDriver(d, i));

    // Seus pilotos:
    // 1) se userTeam existe no grid, pega os 2 daquela equipe
    const your = drivers.filter(d => d.teamKey === RaceState.userTeam).slice(0, 2);

    // 2) fallback: se não existir (ex: userTeam inválido), pega Ferrari
    if (your.length < 2) {
      const fb = drivers.filter(d => d.teamKey === "ferrari").slice(0, 2);
      RaceState.yourDriverIds = fb.map(x => x.id);
    } else {
      RaceState.yourDriverIds = your.map(x => x.id);
    }

    RaceState.drivers = drivers;
  }

  // ===== Core loop =====
  function computePaceFactor(d) {
    // base por modo
    const modeMul =
      d.mode === "ECONOMIZAR" ? 0.92 :
      d.mode === "ATAQUE" ? 1.06 : 1.0;

    // motorMap (1..3)
    const motorMul = 0.92 + (d.motorMap - 1) * 0.06; // 1:0.92, 2:0.98, 3:1.04

    // agressividade
    const aggressMul = 0.96 + (d.aggress - 1) * 0.05; // 1:0.96, 2:1.01, 3:1.06

    // penaliza desgaste
    const tyrePenalty = 0.80 + (d.tyre / 100) * 0.20;   // 80%..100%
    const engPenalty  = 0.75 + (d.engine / 100) * 0.25; // 75%..100%

    // ERS boost
    const ersMul = (d.ersBoost && d.ers > 2) ? 1.06 : 1.0;

    return modeMul * motorMul * aggressMul * tyrePenalty * engPenalty * ersMul;
  }

  function stepDriver(d, dtSec) {
    if (d.finished) return;

    // pit logic
    if (d.requestPit && !d.inPit) {
      d.inPit = true;
      d.requestPit = false;
      d.pitEndsAt = now() + RaceConfig.pitTimeMs;
      // perda imediata de progress para simular entrada no pit
      d.progress = clamp(d.progress - RaceConfig.pitPenaltyProgress, 0, 1);
    }

    if (d.inPit) {
      // parado no pit: avança muito pouco
      d.prevProgress = d.progress;
      d.progress = clamp(d.progress + 0.002 * dtSec, 0, 1);

      if (now() >= d.pitEndsAt) {
        d.inPit = false;
        d.tyre = 100;
        d.ers = clamp(d.ers + 15, 0, 100);
      }
      return;
    }

    // desgaste
    let degradeMul =
      d.mode === "ECONOMIZAR" ? 0.75 :
      d.mode === "ATAQUE" ? 1.35 : 1.0;

    // agressividade aumenta desgaste
    degradeMul *= (0.90 + (d.aggress - 1) * 0.20);

    d.tyre = clamp(d.tyre - (RaceConfig.degradeBase * degradeMul * dtSec * 100 / 60), 0, 100);

    // motor
    let engineMul = 1.0 + (d.motorMap - 2) * 0.25; // 1:-0.25, 2:0, 3:+0.25
    d.engine = clamp(d.engine - (RaceConfig.engineWearBase * engineMul * dtSec * 100 / 60), 0, 100);

    // ers
    if (d.ersBoost && d.ers > 0.5) {
      d.ers = clamp(d.ers - (RaceConfig.ersUse * dtSec), 0, 100);
    } else {
      d.ers = clamp(d.ers + (RaceConfig.ersRegen * dtSec), 0, 100);
    }

    // avanço
    const factor = computePaceFactor(d);
    const noise = (Math.random() - 0.5) * RaceConfig.overtakeNoise;
    const adv = (RaceConfig.basePace * factor + noise) * dtSec * RaceState.speedMult;

    d.prevProgress = d.progress;
    d.progress += adv;

    // wrap
    if (d.progress >= 1) d.progress -= 1;

    // lap count
    // detecta quando cruza “volta” (de >0.92 pra <0.08)
    const crossed =
      (d.prevProgress > RaceConfig.lapWrapThreshold && d.progress < RaceConfig.lapStartThreshold);

    if (crossed) {
      d.lap += 1;
      if (d.lap > RaceState.totalLaps) {
        d.finished = true;
      }
    }
  }

  function sortPositions() {
    // ordena por lap desc, progress desc
    const sorted = [...RaceState.drivers].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? 1 : -1; // quem terminou “fica” no fim só no tick; depois tratamos
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.progress - a.progress;
    });

    // se terminou, coloca no topo quem terminou primeiro (mantemos ordem estável por lap/progress)
    sorted.forEach((d, idx) => d.position = idx + 1);

    // delta simples (pro líder)
    const leader = sorted[0];
    if (leader) {
      sorted.forEach(d => {
        if (d === leader) d.delta = 0;
        else d.delta = Math.max(0, (leader.lap - d.lap) * 90 + (leader.progress - d.progress) * 90);
      });
    }

    return sorted;
  }

  function checkFinish(sorted) {
    if (RaceState.finished) return;

    const allFinished = RaceState.drivers.every(d => d.finished);
    if (!allFinished) return;

    RaceState.finished = true;
    RaceState.winnerId = sorted[0]?.id || null;

    // evento global para UI / podium
    window.dispatchEvent(new CustomEvent("race:finished", { detail: { sorted } }));
  }

  // ===== Public API =====
  const API = {
    TEAMS,
    RaceState,
    RaceConfig,

    init() {
      initDrivers();
      window.dispatchEvent(new CustomEvent("race:ready", { detail: { state: RaceState } }));
    },

    setSpeed(mult) {
      RaceState.speedMult = mult;
      window.dispatchEvent(new CustomEvent("race:speed", { detail: { speedMult: mult } }));
    },

    getDriver(id) {
      return RaceState.drivers.find(d => d.id === id) || null;
    },

    setMode(id, mode) {
      const d = API.getDriver(id);
      if (!d || d.finished) return;
      d.mode = mode;
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    adjustMotor(id, delta) {
      const d = API.getDriver(id);
      if (!d || d.finished) return;
      d.motorMap = clamp(d.motorMap + delta, 1, 3);
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    adjustAggress(id, delta) {
      const d = API.getDriver(id);
      if (!d || d.finished) return;
      d.aggress = clamp(d.aggress + delta, 1, 3);
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    toggleERS(id) {
      const d = API.getDriver(id);
      if (!d || d.finished) return;
      d.ersBoost = !d.ersBoost;
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    requestPit(id) {
      const d = API.getDriver(id);
      if (!d || d.finished) return;
      d.requestPit = true;
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    setTyre(id, tyreKey) {
      // aqui você pode expandir depois para (S/M/H/W)
      // por enquanto só afeta “modo” de desgaste (wet degrada diferente)
      const d = API.getDriver(id);
      if (!d || d.finished) return;

      // simples: em chuva, W dura mais
      if (tyreKey === "W") {
        // “preserva” um pouco o desgaste
        d.tyre = clamp(d.tyre + 4, 0, 100);
      }
      window.dispatchEvent(new CustomEvent("race:driver", { detail: { id } }));
    },

    tick(dtSec) {
      if (RaceState.finished) return;

      RaceState.drivers.forEach(d => stepDriver(d, dtSec));

      const sorted = sortPositions();
      window.dispatchEvent(new CustomEvent("race:tick", { detail: { sorted } }));

      checkFinish(sorted);
    },

    restart() {
      RaceState.finished = false;
      RaceState.winnerId = null;
      RaceState.startedAt = now();

      // reinicializa drivers mantendo grid
      const base = GRID_20.map((d, i) => makeDriver(d, i));
      RaceState.drivers = base;

      // recalcula seus pilotos
      const your = base.filter(d => d.teamKey === RaceState.userTeam).slice(0, 2);
      RaceState.yourDriverIds = (your.length === 2 ? your : base.filter(d => d.teamKey === "ferrari").slice(0,2)).map(x=>x.id);

      window.dispatchEvent(new CustomEvent("race:restart", { detail: { state: RaceState } }));
    },

    format: { fmtPct }
  };

  window.RaceSystem = API;
})();
