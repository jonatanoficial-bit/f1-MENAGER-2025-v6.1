// ==========================================================
// F1 MANAGER 2025 — RACE.JS (ETAPA 1)
// Pit Stop + Pneus + Meteo + Modos (pneu/motor/agress/ERS)
// Grid vem do Q3 (localStorage: f1m2025_last_qualy)
// Robusto contra "sumiu grid/hud" (loop protegido + auto-rebuild)
// ==========================================================

/* ------------------------------
   CONFIG BÁSICA
--------------------------------*/
const TRACK_BASE_LAP_TIME_MS = {
  australia: 80000,
  bahrain: 91000,
  jeddah: 88000,
  imola: 76000,
  monaco: 72000,
  canada: 77000,
  spain: 78000,
  austria: 65000,
  silverstone: 83000,
  hungary: 77000,
  spa: 115000,
  zandvoort: 74000,
  monza: 78000,
  singapore: 100000,
  suzuka: 82000,
  qatar: 87000,
  austin: 89000,
  mexico: 77000,
  brazil: 70000,
  abu_dhabi: 84000
};

const RACE_DEFAULT_LAPS = 12; // Ajuste depois (quando quiser)
const PATH_SAMPLES = 520;
const GRID_RENDER_LIMIT = 20;

const TYRE = {
  S: { key: "S", name: "Soft", wearPerLap: 0.14, paceMul: 0.985, rainBad: 1.25 },
  M: { key: "M", name: "Medium", wearPerLap: 0.10, paceMul: 1.000, rainBad: 1.18 },
  H: { key: "H", name: "Hard", wearPerLap: 0.07, paceMul: 1.015, rainBad: 1.12 },
  I: { key: "I", name: "Inter", wearPerLap: 0.09, paceMul: 1.030, rainBad: 0.96 },
  W: { key: "W", name: "Wet", wearPerLap: 0.08, paceMul: 1.050, rainBad: 0.92 }
};

// modos do piloto
const MODE = {
  tyre: {
    econ: { key: "ECON", label: "Economizar", wearMul: 0.85, paceMul: 1.015 },
    normal: { key: "NORMAL", label: "Normal", wearMul: 1.00, paceMul: 1.000 },
    atk: { key: "ATK", label: "Ataque", wearMul: 1.22, paceMul: 0.985 }
  },
  engine: {
    low: { key: "LOW", label: "Motor -", heat: 0.90, paceMul: 1.012 },
    normal: { key: "NORMAL", label: "Motor", heat: 1.00, paceMul: 1.000 },
    high: { key: "HIGH", label: "Motor +", heat: 1.12, paceMul: 0.990 }
  },
  aggr: {
    low: { key: "LOW", label: "Agress -", risk: 0.85, paceMul: 1.008 },
    normal: { key: "NORMAL", label: "Agress", risk: 1.00, paceMul: 1.000 },
    high: { key: "HIGH", label: "Agress +", risk: 1.15, paceMul: 0.993 }
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function formatGap(sec) {
  if (!isFinite(sec)) return "--";
  if (sec < 0.001) return "+0.000";
  return `+${sec.toFixed(3)}`;
}

function safeText(el, txt) {
  if (el) el.textContent = txt;
}

function imgOrHide(imgEl, src) {
  if (!imgEl) return;
  imgEl.onerror = () => {
    imgEl.style.display = "none";
  };
  imgEl.style.display = "";
  imgEl.src = src;
}

/* ------------------------------
   PILOTS / MERCADO
--------------------------------*/
function getRuntimeDrivers() {
  if (!window.PilotMarketSystem) return [];

  try {
    PilotMarketSystem.init();
  } catch (e) {
    return [];
  }

  const list = [];
  try {
    PilotMarketSystem.getTeams().forEach(team => {
      PilotMarketSystem.getActiveDriversForTeam(team).forEach(p => {
        list.push({
          id: p.id,
          code: p.code || p.id.toUpperCase(),
          name: p.name,
          teamKey: p.teamKey,
          teamName: p.teamName,
          rating: p.rating || 75,
          form: p.form || 55,
          color: p.color || "#9aa4b2",
          logo: p.logo || ""
        });
      });
    });
  } catch (e) {
    return [];
  }
  return list;
}

function getPerfMultiplier(driverId) {
  if (!window.PilotMarketSystem) return 1;
  const p = PilotMarketSystem.getPilot?.(driverId);
  if (!p) return 1;

  const ratingMul = 1 + (clamp(p.rating ?? 75, 40, 99) - 92) * 0.0025;
  const formMul = 1 + (clamp(p.form ?? 55, 0, 100) - 55) * 0.0012;
  return clamp(ratingMul * formMul, 0.90, 1.08);
}

/* ------------------------------
   SETUP / INTEGRAÇÃO (Practice/Setup)
   - se existir algo salvo, usamos como leve bônus/penalidade
--------------------------------*/
function readSetupForTrack(track) {
  // você pode padronizar depois; aqui tentamos várias chaves sem quebrar
  const keys = [
    `f1m2025_setup_${track}`,
    `f1m2025_${track}_setup`,
    `f1m2025_last_setup`
  ];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return null;
}

function setupPerfFactor(setupObj) {
  // bem leve (não destrói seu balanceamento)
  // se não tiver setup, neutro.
  if (!setupObj || typeof setupObj !== "object") return { pace: 1.0, wear: 1.0 };

  // se você tiver campos diferentes, não quebra: tudo é opcional
  const aero = clamp(Number(setupObj.aeroBalance ?? 50), 0, 100);
  const susp = clamp(Number(setupObj.suspension ?? 50), 0, 100);
  const engine = clamp(Number(setupObj.engine ?? 50), 0, 100);

  // quanto mais próximo de 50, melhor (exemplo simples)
  const aeroDelta = Math.abs(aero - 50) / 50;
  const suspDelta = Math.abs(susp - 50) / 50;
  const engDelta = Math.abs(engine - 50) / 50;

  const pace = clamp(1.0 + (aeroDelta + suspDelta + engDelta) * 0.010, 0.995, 1.040);
  const wear = clamp(1.0 + (aeroDelta + suspDelta) * 0.018, 0.98, 1.10);

  return { pace, wear };
}

/* ------------------------------
   QUALY GRID (Q3)
--------------------------------*/
function readQualyGrid(track, gp) {
  const raw = localStorage.getItem("f1m2025_last_qualy");
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.grid)) return null;

    // se track/gp bater, ótimo; se não bater, ainda podemos usar como fallback
    const okTrack = !data.track || data.track === track;
    const okGp = !data.gp || data.gp === gp;

    return { grid: data.grid, ok: okTrack && okGp };
  } catch (e) {
    return null;
  }
}

/* ------------------------------
   ESTADO DA CORRIDA
--------------------------------*/
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  baseLapMs: 90000,
  totalLaps: RACE_DEFAULT_LAPS,

  // meteo
  weather: "Seco",      // "Seco" | "Chuva"
  trackTempC: 26,
  rainLevel: 0.0,       // 0..1

  // tempo / sim
  running: true,
  speedMultiplier: 1,
  lastFrame: null,

  // pista
  pathPoints: [],
  visuals: [],

  // drivers
  drivers: [],
  leaderId: null,

  // UI cached
  ui: {
    lapLabel: null,
    weatherLabel: null,
    tempLabel: null,
    gpLabel: null,
    trackContainer: null,
    driversList: null
  },

  // user driver cards
  userCards: []
};

function pickWeatherForTrack(track) {
  // simples, mas coerente. Pode evoluir depois.
  const rnd = Math.random();
  let rainChance = 0.18;

  if (["spa", "silverstone", "hungary"].includes(track)) rainChance = 0.28;
  if (["bahrain", "jeddah", "qatar", "abu_dhabi"].includes(track)) rainChance = 0.08;

  const raining = rnd < rainChance;

  if (!raining) {
    return { weather: "Seco", trackTempC: 24 + Math.floor(Math.random() * 8), rainLevel: 0.0 };
  }
  return { weather: "Chuva", trackTempC: 18 + Math.floor(Math.random() * 6), rainLevel: 0.55 + Math.random() * 0.35 };
}

/* ------------------------------
   INIT
--------------------------------*/
window.addEventListener("DOMContentLoaded", initRace);

async function initRace() {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || "australia";
  raceState.gp = params.get("gp") || "GP 2025";
  raceState.userTeam = params.get("userTeam") || "ferrari";
  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[raceState.track] || 90000;

  // UI refs
  raceState.ui.lapLabel = document.getElementById("lap-label");
  raceState.ui.weatherLabel = document.getElementById("weather-label");
  raceState.ui.tempLabel = document.getElementById("tracktemp-label");
  raceState.ui.gpLabel = document.getElementById("gp-label");
  raceState.ui.trackContainer = document.getElementById("track-container");
  raceState.ui.driversList = document.getElementById("drivers-list");

  safeText(raceState.ui.gpLabel, raceState.gp);

  // meteo inicial
  const meteo = pickWeatherForTrack(raceState.track);
  raceState.weather = meteo.weather;
  raceState.trackTempC = meteo.trackTempC;
  raceState.rainLevel = meteo.rainLevel;

  updateTopHUD();

  setupSpeedControls();
  setupUserButtons();

  initDriversWithQualyGrid();
  await loadTrackSvgAndBuildVisuals();

  raceState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

/* ------------------------------
   DRIVERS + GRID Q3
--------------------------------*/
function initDriversWithQualyGrid() {
  const runtime = getRuntimeDrivers();

  // fallback mínimo se mercado não estiver pronto
  const base = runtime.length
    ? runtime
    : [
        { id: "drv1", code: "DRV1", name: "Piloto 1", teamKey: raceState.userTeam, teamName: "Equipe", rating: 80, form: 55, color: "#d84343", logo: "" },
        { id: "drv2", code: "DRV2", name: "Piloto 2", teamKey: raceState.userTeam, teamName: "Equipe", rating: 78, form: 55, color: "#d84343", logo: "" }
      ];

  // pega grid do Q3
  const qualy = readQualyGrid(raceState.track, raceState.gp);

  let ordered = [...base];

  if (qualy?.grid?.length) {
    // monta por id (preferência), e se não achar, ignora
    const byId = new Map(base.map(d => [d.id, d]));
    const byName = new Map(base.map(d => [d.name, d]));

    const qList = [];
    for (const g of qualy.grid) {
      const found = byId.get(g.id) || byName.get(g.name);
      if (found) qList.push(found);
    }

    // completa com quem sobrou
    const used = new Set(qList.map(d => d.id));
    const rest = base.filter(d => !used.has(d.id));

    // se Q3 tiver muitos pilotos, usamos o Q3 como ordem principal
    if (qList.length >= 8) ordered = [...qList, ...rest];
  }

  // Setup influencia só no userTeam (leve)
  const setupObj = readSetupForTrack(raceState.track);
  const setupFactor = setupPerfFactor(setupObj);

  raceState.drivers = ordered.map((d, idx) => {
    const perf = getPerfMultiplier(d.id);
    const ratingSkill = 1 - (clamp(d.rating ?? 75, 40, 99) - 92) * 0.006;

    // pneus iniciais coerentes com clima
    const tyreKey = raceState.weather === "Chuva" ? "I" : (Math.random() < 0.45 ? "S" : (Math.random() < 0.65 ? "M" : "H"));

    // userTeam recebe setupFactor
    const isUser = d.teamKey === raceState.userTeam;
    const baseLap = raceState.baseLapMs * ratingSkill / clamp(perf, 0.9, 1.08);
    const lapTargetMs = baseLap * (isUser ? setupFactor.pace : 1.0);

    return {
      ...d,
      index: idx,

      // corrida
      distance: 0,     // "distância acumulada" virtual
      lap: 0,
      progress: Math.random(),
      targetLapMs: lapTargetMs,
      lastLapMs: null,
      bestLapMs: null,

      // pneus
      tyre: TYRE[tyreKey],
      tyreWear: 1.0,          // 1 = novo, 0 = morto
      tyreMode: MODE.tyre.normal,

      // motor/agress/ERS
      engineMode: MODE.engine.normal,
      aggrMode: MODE.aggr.normal,
      ers: 0.50,              // 0..1
      ersBoost: false,

      // pit
      pitRequest: false,
      inPit: false,
      pitTimeLeftMs: 0,

      // setup wear
      setupWearMul: isUser ? setupFactor.wear : 1.0
    };
  });

  // define leader inicial
  raceState.leaderId = raceState.drivers[0]?.id || null;

  // preencher cards do usuário (2 pilotos)
  preencherPilotosDaEquipe();
  renderDriversList(true);
}

/* ------------------------------
   SVG TRACK + VISUAIS
--------------------------------*/
async function loadTrackSvgAndBuildVisuals() {
  const container = raceState.ui.trackContainer;
  if (!container) return;

  container.innerHTML = "";

  const svgText = await fetch(`assets/tracks/${raceState.track}.svg`).then(r => r.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) throw new Error(`SVG da pista sem <path> em assets/tracks/${raceState.track}.svg`);

  const len = path.getTotalLength();
  const pts = [];
  for (let i = 0; i < PATH_SAMPLES; i++) {
    const p = path.getPointAtLength((len * i) / (PATH_SAMPLES - 1));
    pts.push({ x: p.x, y: p.y });
  }
  raceState.pathPoints = pts;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.style.width = "100%";
  svg.style.height = "100%";
  container.appendChild(svg);

  // traçado
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("stroke", "#5a5f68");
  poly.setAttribute("stroke-width", "16");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  poly.setAttribute("fill", "none");
  svg.appendChild(poly);

  // linha interna (realce)
  const poly2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly2.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  poly2.setAttribute("stroke", "#cfd6df");
  poly2.setAttribute("stroke-width", "6");
  poly2.setAttribute("stroke-linecap", "round");
  poly2.setAttribute("stroke-linejoin", "round");
  poly2.setAttribute("fill", "none");
  poly2.setAttribute("opacity", "0.35");
  svg.appendChild(poly2);

  // carros (círculos com cor da equipe)
  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glow.setAttribute("r", 7);
    glow.setAttribute("fill", d.color || "#9aa4b2");
    glow.setAttribute("opacity", "0.25");
    g.appendChild(glow);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 4.2);
    c.setAttribute("fill", d.color || "#9aa4b2");
    g.appendChild(c);

    svg.appendChild(g);
    return { id: d.id, g };
  });
}

/* ------------------------------
   LOOP (PROTEGIDO)
--------------------------------*/
function loop(ts) {
  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  try {
    if (raceState.running) update(dt);
    render();
  } catch (err) {
    // se der qualquer erro, não mata o jogo (evita “sumiu tudo”)
    console.error("[RACE] erro no loop:", err);
    raceState.running = false;
    showRuntimeError(err);
  }

  requestAnimationFrame(loop);
}

function showRuntimeError(err) {
  let box = document.getElementById("runtime-error");
  if (!box) {
    box = document.createElement("div");
    box.id = "runtime-error";
    box.style.position = "fixed";
    box.style.left = "12px";
    box.style.right = "12px";
    box.style.bottom = "12px";
    box.style.zIndex = "99999";
    box.style.padding = "12px";
    box.style.borderRadius = "10px";
    box.style.background = "rgba(120,0,0,0.75)";
    box.style.color = "#fff";
    box.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
    box.style.fontSize = "12px";
    box.style.lineHeight = "1.3";
    document.body.appendChild(box);
  }
  box.textContent = `Erro no Race Loop: ${String(err?.message || err)}`;
}

/* ------------------------------
   UPDATE
--------------------------------*/
function update(dt) {
  // meteo pode mudar levemente ao longo do tempo
  driftWeather(dt);

  // se visuals sumirem por qualquer motivo, reconstruímos sem quebrar
  if (!raceState.visuals || raceState.visuals.length !== raceState.drivers.length) {
    // tenta rebuild rápido
    rebuildVisualsIfNeeded();
  }

  // atualiza cada piloto
  for (const d of raceState.drivers) {
    // pit stop em andamento
    if (d.inPit) {
      d.pitTimeLeftMs -= dt;
      if (d.pitTimeLeftMs <= 0) {
        d.inPit = false;
        d.pitTimeLeftMs = 0;
        d.pitRequest = false;
      }
      continue;
    }

    // consumo de ERS
    const ersUse = d.ersBoost ? 0.00028 * dt : 0.00010 * dt;
    d.ers = clamp(d.ers - ersUse, 0, 1);
    if (d.ers <= 0.02) d.ersBoost = false;

    // regeneração leve
    d.ers = clamp(d.ers + 0.00006 * dt, 0, 1);

    // desgaste de pneu por volta
    // desgaste proporcional ao tempo, para ser estável em 1x/2x/4x
    const wearRatePerMs = (d.tyre.wearPerLap / (d.targetLapMs || raceState.baseLapMs)) * d.tyreMode.wearMul * d.setupWearMul;
    d.tyreWear = clamp(d.tyreWear - wearRatePerMs * dt, 0, 1);

    // penalidade por pneu gasto
    const wearPenalty = 1 + (1 - d.tyreWear) * (0.10 + (raceState.rainLevel * 0.08));

    // penalidade chuva em slicks
    const rainPenalty = rainEffectMultiplier(d);

    // pace final
    const modeMul =
      d.tyreMode.paceMul *
      d.engineMode.paceMul *
      d.aggrMode.paceMul *
      (d.ersBoost ? 0.992 : 1.0);

    const lapMs = (d.targetLapMs || raceState.baseLapMs)
      * d.tyre.paceMul
      * wearPenalty
      * rainPenalty
      * modeMul;

    // converte em velocidade (voltas por ms)
    const speed = 1 / Math.max(1, lapMs);

    // movimenta na pista
    const noise = 1 + (Math.random() - 0.5) * 0.025;
    d.progress += speed * noise * dt;

    // entrada do pit (janela simples perto de 0.90 de progresso)
    if (d.pitRequest && !d.inPit && d.progress >= 0.90) {
      doPitStop(d);
    }

    // completou volta
    if (d.progress >= 1) {
      d.progress -= 1;
      d.lap += 1;

      // calcula “tempo de volta simulado” (lapMs com uma variação)
      const lapNoise = 1 + (Math.random() - 0.5) * 0.010;
      const lapDone = lapMs * lapNoise;

      d.lastLapMs = lapDone;
      if (!d.bestLapMs || lapDone < d.bestLapMs) d.bestLapMs = lapDone;

      // ao completar volta, se pneu muito gasto, chance de pit automático IA
      aiPitLogic(d);

      // fim da corrida: se líder completou totalLaps
      if (d.id === raceState.leaderId && d.lap >= raceState.totalLaps) {
        finishRace();
        return;
      }
    }
  }

  // atualiza líder (por distância virtual)
  updateLeaderAndOrder();
}

/* ------------------------------
   METEO
--------------------------------*/
function driftWeather(dt) {
  // muda lentamente (e só um pouco)
  const drift = (Math.random() - 0.5) * 0.0000015 * dt;
  raceState.rainLevel = clamp(raceState.rainLevel + drift, 0, 1);

  if (raceState.rainLevel < 0.08) {
    raceState.weather = "Seco";
  } else if (raceState.rainLevel > 0.12) {
    raceState.weather = "Chuva";
  }

  // temperatura oscila levemente
  const tdrift = (Math.random() - 0.5) * 0.000003 * dt;
  raceState.trackTempC = clamp(raceState.trackTempC + tdrift, 12, 40);

  updateTopHUD();
}

function rainEffectMultiplier(d) {
  // se seco, nada
  if (raceState.rainLevel <= 0.05) return 1.0;

  // slicks sofrem na chuva: usa parâmetro rainBad do pneu
  const isSlick = (d.tyre.key === "S" || d.tyre.key === "M" || d.tyre.key === "H");

  if (!isSlick) {
    // Inter/Wet são melhores
    // quanto mais chuva, mais vantagem
    const bonus = 1 - (raceState.rainLevel * 0.06);
    return clamp(bonus, 0.92, 1.0);
  }

  // slick sofre
  const bad = d.tyre.rainBad || 1.18;
  const mult = 1 + (raceState.rainLevel * (bad - 1));
  return clamp(mult, 1.0, 1.35);
}

/* ------------------------------
   PIT STOP + PNEUS
--------------------------------*/
function doPitStop(d) {
  d.inPit = true;

  // tempo base do pit
  let pitMs = 24000 + Math.random() * 3500;

  // chuva aumenta variação
  if (raceState.rainLevel > 0.2) pitMs += 800 + Math.random() * 1200;

  // troca de pneus automática (IA) ou manual (usuário via botão)
  // regra:
  // - se chuva, tenta Inter/Wet
  // - se seco, escolhe S/M/H baseado em desgaste e distância restante
  const nextTyre = chooseNextTyre(d);

  d.tyre = nextTyre;
  d.tyreWear = 1.0;

  d.pitTimeLeftMs = pitMs;
}

function chooseNextTyre(d) {
  // Chuva:
  if (raceState.rainLevel >= 0.50) return TYRE.W;
  if (raceState.rainLevel >= 0.15) return TYRE.I;

  // Seco:
  const lapsLeft = Math.max(0, raceState.totalLaps - d.lap);
  if (lapsLeft <= 3) return TYRE.S;
  if (lapsLeft <= 6) return Math.random() < 0.6 ? TYRE.M : TYRE.S;
  return Math.random() < 0.55 ? TYRE.H : TYRE.M;
}

function aiPitLogic(d) {
  // só IA (não user)
  if (d.teamKey === raceState.userTeam) return;

  // se pneu ruim, decide pit
  if (d.tyreWear < 0.28 && Math.random() < 0.55) {
    d.pitRequest = true;
  }

  // se começou a chover e está de slick, pit mais provável
  const slick = (d.tyre.key === "S" || d.tyre.key === "M" || d.tyre.key === "H");
  if (raceState.rainLevel > 0.18 && slick && Math.random() < 0.35) {
    d.pitRequest = true;
  }
}

/* ------------------------------
   ORDER / GAP
--------------------------------*/
function distanceScore(d) {
  // distância total: voltas completas + progresso
  return d.lap + d.progress;
}

function updateLeaderAndOrder() {
  let leader = raceState.drivers[0];
  for (const d of raceState.drivers) {
    if (distanceScore(d) > distanceScore(leader)) leader = d;
  }
  raceState.leaderId = leader?.id || raceState.leaderId;

  // ordenar por distância
  raceState.drivers.sort((a, b) => distanceScore(b) - distanceScore(a));
}

function calcGapSeconds(leader, d) {
  // aproximação: diferença em "voltas" * tempo base
  const deltaLaps = distanceScore(leader) - distanceScore(d);
  const base = (raceState.baseLapMs / 1000);
  // ajusta com chuva
  const rainMul = 1 + raceState.rainLevel * 0.22;
  return Math.max(0, deltaLaps * base * rainMul);
}

/* ------------------------------
   RENDER
--------------------------------*/
function render() {
  // se loop rodou mas a lista sumiu (ex.: innerHTML limpou por outro script), recria
  if (raceState.ui.driversList && raceState.ui.driversList.children.length === 0) {
    renderDriversList(true);
  } else {
    renderDriversList(false);
  }

  renderCars();
  preencherPilotosDaEquipe();
}

function renderCars() {
  if (!raceState.visuals?.length || !raceState.pathPoints?.length) return;

  for (const v of raceState.visuals) {
    const d = raceState.drivers.find(x => x.id === v.id);
    if (!d) continue;

    const idx = Math.floor(d.progress * (raceState.pathPoints.length - 1));
    const p = raceState.pathPoints[idx] || raceState.pathPoints[0];
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  }
}

function renderDriversList(force) {
  const list = raceState.ui.driversList;
  if (!list) return;

  // render leve: se não for force, só atualiza textos existentes quando possível
  // mas como seu layout é simples, vamos re-render do topo com segurança (estável)
  if (!force && list.dataset.rendered === "1") {
    // apenas atualiza gaps/pos sem recriar tudo
    const leader = raceState.drivers[0];
    for (let i = 0; i < Math.min(raceState.drivers.length, GRID_RENDER_LIMIT); i++) {
      const d = raceState.drivers[i];
      const row = list.querySelector(`[data-row="${d.id}"]`);
      if (!row) continue;

      const posEl = row.querySelector(".pos");
      const gapEl = row.querySelector(".gap");
      const lapsEl = row.querySelector(".laps");
      const tyreEl = row.querySelector(".tyre");

      if (posEl) posEl.textContent = String(i + 1);
      if (lapsEl) lapsEl.textContent = `Voltas: ${d.lap}`;
      if (tyreEl) tyreEl.textContent = `Pneu: ${d.tyre.key} ${(d.tyreWear * 100).toFixed(0)}%`;

      if (i === 0) {
        if (gapEl) gapEl.textContent = "LEADER";
      } else {
        const gap = calcGapSeconds(leader, d);
        if (gapEl) gapEl.textContent = formatGap(gap);
      }
    }
    return;
  }

  list.innerHTML = "";
  list.dataset.rendered = "1";

  const leader = raceState.drivers[0];

  for (let i = 0; i < Math.min(raceState.drivers.length, GRID_RENDER_LIMIT); i++) {
    const d = raceState.drivers[i];

    const row = document.createElement("div");
    row.className = "driver-row";
    row.dataset.row = d.id;

    // marca userTeam
    if (d.teamKey === raceState.userTeam) row.classList.add("user-team-row");

    const faceSrc = `assets/faces/${d.code}.png`;

    row.innerHTML = `
      <div class="pos" style="width:26px; opacity:.9;">${i + 1}</div>
      <img class="face" style="width:26px;height:26px;border-radius:999px;object-fit:cover;" src="${faceSrc}" />
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.name}</div>
        <div style="opacity:.75;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.teamName}</div>
        <div class="laps" style="opacity:.65;font-size:11px;">Voltas: ${d.lap}</div>
        <div class="tyre" style="opacity:.65;font-size:11px;">Pneu: ${d.tyre.key} ${(d.tyreWear * 100).toFixed(0)}%</div>
      </div>
      <div style="margin-left:auto;text-align:right;min-width:78px;">
        <div class="gap" style="opacity:.9;font-size:12px;">${i === 0 ? "LEADER" : formatGap(calcGapSeconds(leader, d))}</div>
      </div>
    `;

    // se face quebrar, esconde sem destruir layout
    const img = row.querySelector("img.face");
    if (img) img.onerror = () => (img.style.display = "none");

    list.appendChild(row);
  }
}

/* ------------------------------
   TOP HUD
--------------------------------*/
function updateTopHUD() {
  // volta = volta do líder + 1 (mostra corrida em andamento)
  const leader = raceState.drivers?.[0];
  const lapShown = leader ? Math.min(leader.lap + 1, raceState.totalLaps) : 1;

  safeText(raceState.ui.lapLabel, `Volta ${lapShown}`);
  safeText(raceState.ui.weatherLabel, raceState.weather);
  safeText(raceState.ui.tempLabel, `${raceState.trackTempC.toFixed(0)}°C`);
}

/* ------------------------------
   CONTROLES DE VELOCIDADE
--------------------------------*/
function setupSpeedControls() {
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.onclick = () => {
      const v = Number(btn.dataset.speed || "1");
      raceState.speedMultiplier = v;
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

/* ------------------------------
   BOTÕES DO USUÁRIO (2 pilotos)
   - usa .user-btn com data-index e data-action
--------------------------------*/
function setupUserButtons() {
  document.querySelectorAll(".user-btn").forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.index || "0");
      const action = String(btn.dataset.action || "");
      const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
      const d = userDrivers[idx];
      if (!d) return;

      handleUserAction(d, action);
    };
  });
}

function handleUserAction(d, action) {
  switch (action) {
    case "pit":
      d.pitRequest = !d.pitRequest;
      break;

    case "econ":
      d.tyreMode = MODE.tyre.econ;
      break;

    case "atk":
      d.tyreMode = MODE.tyre.atk;
      break;

    case "engineUp":
      d.engineMode = MODE.engine.high;
      break;

    case "engineDown":
      d.engineMode = MODE.engine.low;
      break;

    case "aggrUp":
      d.aggrMode = MODE.aggr.high;
      break;

    case "aggrDown":
      d.aggrMode = MODE.aggr.low;
      break;

    case "ers":
      d.ersBoost = !d.ersBoost;
      break;

    default:
      // nada
      break;
  }

  // feedback no card
  updateUserCardStatus();
}

function updateUserCardStatus() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);
  userDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) return;
    const statusEl = card.querySelector(".user-status");
    if (!statusEl) return;

    const pit = d.pitRequest ? "PIT" : "—";
    const tyre = d.tyreMode.key;
    const eng = d.engineMode.key;
    const ag = d.aggrMode.key;
    const ers = d.ersBoost ? "ERS BOOST" : "ERS";

    statusEl.textContent = `${tyre} | ${eng} | ${ag} | ${ers} | ${pit}`;
  });
}

/* ------------------------------
   PREENCHER CARDS DO USUÁRIO
--------------------------------*/
function preencherPilotosDaEquipe() {
  const userDrivers = raceState.drivers.filter(d => d.teamKey === raceState.userTeam).slice(0, 2);

  userDrivers.forEach((d, i) => {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) return;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const team = card.querySelector(".user-team");
    const logo = card.querySelector(".user-logo");
    const car = card.querySelector(".user-car");
    const tyre = card.querySelector(".user-tyre");
    const engine = card.querySelector(".user-engine");
    const ers = card.querySelector(".user-ers");
    const status = card.querySelector(".user-status");

    if (name) name.textContent = d.name || "—";
    if (team) team.textContent = d.teamName || "—";

    // face
    if (face) imgOrHide(face, `assets/faces/${d.code}.png`);

    // logo: tenta o do mercado; se vazio, tenta um padrão
    if (logo) {
      const marketLogo = d.logo && String(d.logo).trim().length ? d.logo : `assets/logos/${d.teamKey}.png`;
      imgOrHide(logo, marketLogo);
    }

    // telemetria básica (Etapa 1)
    if (car) car.textContent = `${Math.round((1 - d.tyreWear) * 100)}%`;
    if (tyre) tyre.textContent = `${Math.round(d.tyreWear * 100)}%`;
    if (engine) engine.textContent = d.engineMode.key === "HIGH" ? "M2" : (d.engineMode.key === "LOW" ? "M0" : "M1");
    if (ers) ers.textContent = `${Math.round(d.ers * 100)}%`;

    if (status) {
      const pit = d.pitRequest ? "PIT" : "—";
      status.textContent = `${d.tyreMode.key} | ${d.engineMode.key} | ${d.aggrMode.key} | ${d.ersBoost ? "ERS BOOST" : "ERS"} | ${pit}`;
    }
  });

  updateUserCardStatus();
}

/* ------------------------------
   AUTO-REBUILD VISUAIS
--------------------------------*/
function rebuildVisualsIfNeeded() {
  const container = raceState.ui.trackContainer;
  if (!container) return;

  // se o svg existe mas as bolinhas não, reconstruímos
  const svg = container.querySelector("svg");
  if (!svg) return;

  // remove visuals atuais
  raceState.visuals = [];

  // cria de novo
  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glow.setAttribute("r", 7);
    glow.setAttribute("fill", d.color || "#9aa4b2");
    glow.setAttribute("opacity", "0.25");
    g.appendChild(glow);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", 4.2);
    c.setAttribute("fill", d.color || "#9aa4b2");
    g.appendChild(c);

    svg.appendChild(g);
    return { id: d.id, g };
  });
}

/* ------------------------------
   FIM DE CORRIDA
--------------------------------*/
function finishRace() {
  raceState.running = false;

  // salva resultado básico para próximos passos (podio/tabela)
  const results = raceState.drivers.map((d, i) => ({
    position: i + 1,
    id: d.id,
    name: d.name,
    teamKey: d.teamKey,
    teamName: d.teamName,
    tyre: d.tyre.key,
    bestLapMs: d.bestLapMs
  }));

  localStorage.setItem("f1m2025_last_race", JSON.stringify({
    track: raceState.track,
    gp: raceState.gp,
    weather: raceState.weather,
    trackTempC: raceState.trackTempC,
    results
  }));

  alert("Corrida finalizada! (Etapa 1) Resultado salvo em f1m2025_last_race.");
}
