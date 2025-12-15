// ==========================================================
// F1 MANAGER 2025 – RACE.JS (Corrida)
// ETAPA 1: Pit Stop + Pneus + Motor + Meteorologia + Grid do Q3
// Robusto contra carregamento parcial (não cai em "Piloto 1/2")
// ==========================================================

(() => {
  "use strict";

  // ------------------------------
  // CONFIG
  // ------------------------------
  const STORAGE_LAST_QUALY = "f1m2025_last_qualy";
  const STORAGE_SETUP = "f1m2025_last_setup"; // opcional (se existir no seu projeto)
  const STORAGE_PRACTICE = "f1m2025_last_practice"; // opcional

  const DEFAULT_VIEWBOX = { w: 1000, h: 600 };
  const PATH_SAMPLES = 520;

  // tempo base por pista (ms) – pode ajustar
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

  // pneus (ETAPA 1)
  const TYRES = {
    S: { name: "SOFT", wearPerLap: 7.5, paceMul: 0.985 },
    M: { name: "MEDIUM", wearPerLap: 5.0, paceMul: 1.000 },
    H: { name: "HARD", wearPerLap: 3.6, paceMul: 1.015 },
    I: { name: "INTER", wearPerLap: 4.8, paceMul: 1.020 }, // para chuva leve
    W: { name: "WET", wearPerLap: 4.2, paceMul: 1.030 }    // chuva forte
  };

  // motor / estilo (ETAPA 1)
  const ENGINE_MODES = {
    ECO: { name: "ECONOMIZAR", paceMul: 1.018, wearMul: 0.85 },
    NORM: { name: "NORMAL", paceMul: 1.000, wearMul: 1.00 },
    ATK: { name: "ATAQUE", paceMul: 0.990, wearMul: 1.18 }
  };

  // pit stop (ETAPA 1)
  const PIT = {
    baseStopMs: 18500,   // tempo parado (aprox)
    laneLossMs: 6000,    // perda "pit lane"
    minLapsBetweenStops: 1
  };

  // meteorologia (ETAPA 1)
  const WEATHER = {
    DRY: { name: "Seco", trackTempMin: 24, trackTempMax: 36, paceMul: 1.0, wet: 0 },
    RAIN: { name: "Chuva", trackTempMin: 18, trackTempMax: 28, paceMul: 1.04, wet: 1 }
  };

  // ------------------------------
  // HELPERS
  // ------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  function safeQS(sel) { return document.querySelector(sel); }
  function safeQSA(sel) { return Array.from(document.querySelectorAll(sel)); }

  function formatGapMs(ms) {
    if (!isFinite(ms)) return "+--.---";
    const s = ms / 1000;
    return (s >= 0 ? "+" : "") + s.toFixed(3);
  }

  function formatLapTime(ms) {
    if (!isFinite(ms) || ms <= 0) return "--:--.---";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msr = Math.floor(ms % 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(msr).padStart(3, "0")}`;
  }

  function nameToCode3(name) {
    if (!name) return "UNK";
    const parts = String(name).trim().split(/\s+/);
    const last = (parts[parts.length - 1] || "").replace(/[^A-Za-zÀ-ÿ]/g, "");
    const base = (last || parts[0] || "UNK").toUpperCase();
    return base.slice(0, 3).padEnd(3, "X");
  }

  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function setTextIf(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // ------------------------------
  // STATE
  // ------------------------------
  const state = {
    track: "australia",
    gp: "GP 2025",
    userTeam: "ferrari",

    baseLapMs: 90000,
    speedMultiplier: 1,

    weather: WEATHER.DRY,
    trackTempC: 28,

    running: true,
    lastFrame: null,

    pathPoints: [],
    visuals: new Map(), // driverId -> { g, dot }

    // drivers full field
    drivers: [],

    // grid from Q3
    grid: [],

    // UI refs (tolerante)
    el: {
      trackContainer: null,
      title: null,
      subtitle: null,
      sessionList: null,
      userCards: [],
      speedBtns: []
    }
  };

  // ------------------------------
  // DOMContentLoaded
  // ------------------------------
  window.addEventListener("DOMContentLoaded", initRace);

  async function initRace() {
    const params = new URLSearchParams(location.search);
    state.track = params.get("track") || "australia";
    state.gp = params.get("gp") || "GP 2025";
    state.userTeam = params.get("userTeam") || "ferrari";
    state.baseLapMs = TRACK_BASE_LAP_TIME_MS[state.track] || 90000;

    bindUIRefs();
    bindSpeedControls();
    bindUserControls();

    // meteorologia (ETAPA 1)
    initWeather();

    // grid (prioridade: Q3 salvo)
    state.grid = buildGridFromQualyOrFallback();

    // drivers (enriquecendo com mercado se existir)
    state.drivers = buildDriversFromGrid(state.grid);

    // renderiza cards de pilotos do usuário
    fillUserCards();

    // carrega pista e cria SVG + carros
    await loadTrackAndBuildVisuals();

    state.lastFrame = performance.now();
    requestAnimationFrame(loop);
  }

  function bindUIRefs() {
    // tolerante com ids/classes diferentes
    state.el.trackContainer =
      document.getElementById("track-container") ||
      safeQS("#track") ||
      safeQS(".track-container") ||
      safeQS("[data-track-container]");

    state.el.title =
      document.getElementById("race-title-gp") ||
      safeQS("#raceTitle") ||
      safeQS(".race-title");

    state.el.subtitle =
      document.getElementById("race-subtitle") ||
      safeQS(".race-subtitle") ||
      safeQS("#raceSubtitle");

    state.el.sessionList =
      document.getElementById("drivers-list") ||
      safeQS("#session-list") ||
      safeQS(".session-list") ||
      safeQS("[data-session-list]");

    // cards dos pilotos do usuário (tolerante)
    state.el.userCards = [
      document.getElementById("user-driver-1"),
      document.getElementById("user-driver-2"),
      safeQS("#user-driver-card-0"),
      safeQS("#user-driver-card-1")
    ].filter(Boolean);

    // atualiza topo se existir
    setTextIf(state.el.title, state.gp);

    // clima/temperatura no topo (se existir texto perto)
    if (state.el.subtitle) {
      state.el.subtitle.textContent = `Volta 1 • Clima: ${state.weather.name} • Pista: ${state.trackTempC}°C`;
    }
  }

  function bindSpeedControls() {
    // botões padrão do seu layout: .speed-btn com data-speed
    const btns = safeQSA(".speed-btn");
    if (btns.length) {
      state.el.speedBtns = btns;
      btns.forEach(btn => {
        btn.addEventListener("click", () => {
          const v = Number(btn.dataset.speed || "1");
          state.speedMultiplier = isFinite(v) && v > 0 ? v : 1;
          btns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      // garante 1x ativo
      const one = btns.find(b => String(b.dataset.speed) === "1");
      if (one) one.classList.add("active");
    } else {
      // fallback: se existir #speed-1 etc
      const b1 = document.getElementById("speed-1");
      const b2 = document.getElementById("speed-2");
      const b4 = document.getElementById("speed-4");
      [b1, b2, b4].forEach((b, i) => {
        if (!b) return;
        const v = [1, 2, 4][i];
        b.addEventListener("click", () => (state.speedMultiplier = v));
      });
    }
  }

  function bindUserControls() {
    // ETAPA 1: botões PIT / ECONOMIZAR / ATAQUE (por piloto)
    // Procuramos por data-action nos botões, ou texto.
    const allButtons = safeQSA("button");

    const normalize = (t) => String(t || "").trim().toUpperCase();

    allButtons.forEach(btn => {
      const t = normalize(btn.textContent);
      const action = (btn.dataset.action || "").toLowerCase();

      // tentativa de identificar o piloto pelo container mais próximo
      // (se não achar, aplica ao piloto 0 por padrão)
      const ownerIdx = resolveOwnerIndex(btn);

      if (action === "pit" || t === "PIT" || t === "PIT STOP") {
        btn.addEventListener("click", () => requestPit(ownerIdx));
      }

      if (action === "eco" || t === "ECONOMIZAR") {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ECO"));
      }

      if (action === "atk" || t === "ATAQUE") {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ATK"));
      }

      // botões extras (se existirem no seu layout)
      if (action === "motor_plus" || t === "MOTOR +" ) {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ATK"));
      }
      if (action === "motor_minus" || t === "MOTOR -" ) {
        btn.addEventListener("click", () => setDriverMode(ownerIdx, "ECO"));
      }

      // seleção de pneu (se você já tiver botões/seletores)
      if (btn.dataset.tyre) {
        btn.addEventListener("click", () => changeTyre(ownerIdx, btn.dataset.tyre));
      }
    });
  }

  function resolveOwnerIndex(btn) {
    // tenta detectar se o botão está dentro do card do piloto 1 ou 2
    // por id/class comuns.
    const p1 = btn.closest("#user-driver-1, #user-driver-card-0, .user-driver-1, [data-user-driver='1']");
    if (p1) return 0;
    const p2 = btn.closest("#user-driver-2, #user-driver-card-1, .user-driver-2, [data-user-driver='2']");
    if (p2) return 1;
    return 0;
  }

  // ------------------------------
  // WEATHER (ETAPA 1)
  // ------------------------------
  function initWeather() {
    // você já tem no topo “Seco/Chuva” em alguns prints
    // aqui definimos de forma estável por corrida:
    // - se URL tiver weather=rain força chuva
    // - senão sorteia 20% chuva
    const params = new URLSearchParams(location.search);
    const forced = (params.get("weather") || "").toLowerCase();

    if (forced === "rain" || forced === "chuva") state.weather = WEATHER.RAIN;
    else if (forced === "dry" || forced === "seco") state.weather = WEATHER.DRY;
    else state.weather = Math.random() < 0.20 ? WEATHER.RAIN : WEATHER.DRY;

    state.trackTempC = Math.round(rnd(state.weather.trackTempMin, state.weather.trackTempMax));

    // ajuste base de volta pela condição
    state.baseLapMs = state.baseLapMs * state.weather.paceMul;

    // se chuva, pneus padrão mudam para INTER
    // (apenas no default inicial; o usuário pode trocar no pit)
  }

  // ------------------------------
  // GRID (Q3)
  // ------------------------------
  function buildGridFromQualyOrFallback() {
    const q = loadJSON(STORAGE_LAST_QUALY);

    // usa o grid do Q3 apenas se for da mesma pista (e se existir)
    if (q && q.grid && Array.isArray(q.grid) && q.grid.length >= 10) {
      const sameTrack = !q.track || q.track === state.track;
      if (sameTrack) {
        // normaliza
        return q.grid
          .slice()
          .sort((a, b) => (a.position || 999) - (b.position || 999))
          .map((x, i) => ({
            id: x.id || `d_${i}`,
            name: x.name || `Piloto ${i + 1}`,
            teamKey: x.teamKey || "unknown",
            position: i + 1,
            bestLap: x.bestLap ?? null
          }));
      }
    }

    // fallback: tenta mercado (se existir)
    if (window.PilotMarketSystem) {
      try {
        window.PilotMarketSystem.init();
        const list = [];
        window.PilotMarketSystem.getTeams().forEach(team => {
          window.PilotMarketSystem.getActiveDriversForTeam(team).forEach(p => {
            list.push({
              id: p.id,
              name: p.name,
              teamKey: p.teamKey,
              position: list.length + 1,
              bestLap: null
            });
          });
        });
        if (list.length >= 10) return list.slice(0, 20);
      } catch {}
    }

    // fallback final: 20 genéricos (mas NUNCA 2)
    return Array.from({ length: 20 }, (_, i) => ({
      id: `gen_${i + 1}`,
      name: `Piloto ${i + 1}`,
      teamKey: i < 2 ? state.userTeam : "unknown",
      position: i + 1,
      bestLap: null
    }));
  }

  // ------------------------------
  // DRIVERS
  // ------------------------------
  function buildDriversFromGrid(grid) {
    const setup = loadJSON(STORAGE_SETUP);
    const practice = loadJSON(STORAGE_PRACTICE);

    // ajustes vindos de setup (se existir)
    const setupMul = computeSetupMultiplier(setup);
    const practiceMul = computePracticeMultiplier(practice);

    const hasMarket = !!window.PilotMarketSystem;
    if (hasMarket) {
      try { window.PilotMarketSystem.init(); } catch {}
    }

    return grid.map((g, idx) => {
      const marketPilot = hasMarket ? safeGetPilot(g.id) : null;

      const name = marketPilot?.name || g.name || `Piloto ${idx + 1}`;
      const teamKey = marketPilot?.teamKey || g.teamKey || "unknown";
      const teamName = marketPilot?.teamName || teamKey;
      const rating = marketPilot?.rating ?? 75;
      const form = marketPilot?.form ?? 55;

      const color = marketPilot?.color || teamColorFromKey(teamKey);
      const logo = marketPilot?.logo || teamLogoFromKey(teamKey);

      const code =
        marketPilot?.code ||
        nameToCode3(name);

      // pneus iniciais
      let tyre = "M";
      if (state.weather.wet) tyre = "I"; // chuva: INTER default

      // “skill” vira tempo
      // rating alto => mais rápido, form alto => mais rápido
      const rMul = 1 + (clamp(rating, 40, 99) - 92) * 0.0025;
      const fMul = 1 + (clamp(form, 0, 100) - 55) * 0.0012;
      const perfMul = clamp(rMul * fMul, 0.90, 1.10);

      // modo motor inicial
      const engineMode = "NORM";

      // lapTime alvo base (ms)
      const base = state.baseLapMs * TYRES[tyre].paceMul * ENGINE_MODES[engineMode].paceMul;
      const targetLapMs = (base / perfMul) * setupMul * practiceMul;

      return {
        id: g.id,
        code,
        name,
        teamKey,
        teamName,
        rating,
        form,
        color,
        logo,

        // corrida
        position: g.position || (idx + 1),
        laps: 0,
        progress: clamp((idx * 0.012) + Math.random() * 0.01, 0, 0.25),
        targetLapMs,
        speed: 1 / targetLapMs, // progresso por ms

        // estado dinâmico
        lastLapMs: null,
        bestLapMs: null,
        totalTimeMs: 0,
        gapToLeaderMs: 0,

        // estratégia
        tyre,
        tyreWear: 100,
        engineMode,
        ers: 50,

        // pit
        pitRequested: false,
        inPit: false,
        pitTimerMs: 0,
        lastPitLap: -999
      };
    });
  }

  function safeGetPilot(id) {
    try { return window.PilotMarketSystem.getPilot(id); }
    catch { return null; }
  }

  function teamColorFromKey(teamKey) {
    const k = String(teamKey || "").toLowerCase();
    if (k.includes("ferrari")) return "#e10600";
    if (k.includes("redbull") || k.includes("bull")) return "#1e41ff";
    if (k.includes("mercedes")) return "#00d2be";
    if (k.includes("mclaren")) return "#ff8700";
    if (k.includes("aston")) return "#006f62";
    if (k.includes("alpine")) return "#2293d1";
    if (k.includes("haas")) return "#b6babd";
    if (k.includes("williams")) return "#00a0de";
    if (k.includes("sauber") || k.includes("kick")) return "#52e252";
    if (k.includes("rb")) return "#2b4562";
    return "#ffffff";
  }

  function teamLogoFromKey(teamKey) {
    // tenta o padrão do seu projeto (ajuste se seu caminho for outro)
    // ex: assets/teams/ferrari.png ou assets/logos/ferrari.png
    const k = String(teamKey || "unknown").toLowerCase();
    // prioridade: teams/
    return `assets/teams/${k}.png`;
  }

  function computeSetupMultiplier(setup) {
    // se não houver setup, neutro
    if (!setup || typeof setup !== "object") return 1.0;
    // tenta achar parâmetros comuns (sem depender do seu formato exato)
    const wing = Number(setup.frontWing ?? setup.asaDianteira ?? setup.wingFront ?? 0);
    const susp = Number(setup.suspension ?? setup.suspensao ?? 0);
    const eng = Number(setup.engine ?? setup.motor ?? 0);
    // normaliza: quanto mais perto de 0, melhor (neutro)
    const penalty = (Math.abs(wing) + Math.abs(susp) + Math.abs(eng)) * 0.0008;
    return clamp(1.0 + penalty, 0.98, 1.06);
  }

  function computePracticeMultiplier(practice) {
    // se treino registrou confiança/telemetria, pode virar leve bônus
    if (!practice || typeof practice !== "object") return 1.0;
    const conf = Number(practice.confidence ?? practice.confianca ?? 0);
    const bonus = (clamp(conf, 0, 100) - 50) * 0.0006;
    return clamp(1.0 - bonus, 0.97, 1.03);
  }

  // ------------------------------
  // TRACK SVG + VISUALS
  // ------------------------------
  async function loadTrackAndBuildVisuals() {
    const container = state.el.trackContainer;
    if (!container) return;

    container.innerHTML = "";

    const svgText = await fetch(`assets/tracks/${state.track}.svg`).then(r => r.text());

    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");

    // tenta achar path; senão polyline
    let geom = doc.querySelector("path");
    let isPath = true;
    if (!geom) {
      geom = doc.querySelector("polyline, polygon");
      isPath = false;
    }

    const pts = [];
    if (geom && isPath && geom.getTotalLength) {
      const len = geom.getTotalLength();
      for (let i = 0; i < PATH_SAMPLES; i++) {
        const p = geom.getPointAtLength((len * i) / PATH_SAMPLES);
        pts.push({ x: p.x, y: p.y });
      }
    } else if (geom && !isPath) {
      const raw = geom.getAttribute("points") || "";
      raw.split(/\s+/).forEach(pair => {
        const [x, y] = pair.split(",").map(Number);
        if (isFinite(x) && isFinite(y)) pts.push({ x, y });
      });
    }

    // fallback extremo: desenha uma elipse para não quebrar
    if (pts.length < 50) {
      for (let i = 0; i < PATH_SAMPLES; i++) {
        const a = (Math.PI * 2 * i) / PATH_SAMPLES;
        pts.push({ x: 500 + Math.cos(a) * 320, y: 300 + Math.sin(a) * 180 });
      }
    }

    state.pathPoints = pts;

    // cria SVG principal
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${DEFAULT_VIEWBOX.w} ${DEFAULT_VIEWBOX.h}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    container.appendChild(svg);

    // pista (polyline)
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    poly.setAttribute("stroke", "#d0d0d0");
    poly.setAttribute("stroke-width", "14");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly);

    // borda interna (efeito)
    const poly2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly2.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    poly2.setAttribute("stroke", "#7a7a7a");
    poly2.setAttribute("stroke-width", "6");
    poly2.setAttribute("fill", "none");
    poly2.setAttribute("stroke-linecap", "round");
    poly2.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly2);

    // cria carros
    state.visuals.clear();
    state.drivers.forEach(d => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", "5.2");
      dot.setAttribute("fill", d.color);
      dot.setAttribute("stroke", "rgba(0,0,0,0.55)");
      dot.setAttribute("stroke-width", "1.2");

      g.appendChild(dot);
      svg.appendChild(g);

      state.visuals.set(d.id, { g, dot });
    });
  }

  // ------------------------------
  // LOOP
  // ------------------------------
  function loop(ts) {
    const dtRaw = ts - (state.lastFrame || ts);
    state.lastFrame = ts;

    const dt = dtRaw * state.speedMultiplier;

    if (state.running) update(dt);
    render();

    requestAnimationFrame(loop);
  }

  // ------------------------------
  // UPDATE (ETAPA 1)
  // ------------------------------
  function update(dt) {
    // atualiza pilotos
    state.drivers.forEach(d => {
      // Pit logic
      if (d.inPit) {
        d.pitTimerMs += dt;
        d.totalTimeMs += dt;

        if (d.pitTimerMs >= (PIT.baseStopMs + PIT.laneLossMs)) {
          d.inPit = false;
          d.pitTimerMs = 0;
          d.pitRequested = false;
          d.lastPitLap = d.laps;

          // após pit, pneus 100% e ERS leve recarga
          d.tyreWear = 100;
          d.ers = clamp(d.ers + 10, 0, 100);
        }

        return;
      }

      // desgaste por modo e clima
      const wearBase = TYRES[d.tyre]?.wearPerLap ?? 5.0;
      const wearMul = ENGINE_MODES[d.engineMode]?.wearMul ?? 1.0;

      // chuva: se pneu errado, degrada e perde tempo
      const wrongTyrePenalty = computeWrongTyrePenalty(d.tyre);
      const weatherMul = state.weather.wet ? 1.15 : 1.0;

      // variação
      const noise = 1 + (Math.random() - 0.5) * 0.035;

      // atualiza progresso: speed * dt
      // recalcula speed de forma dinâmica pelo pneu/motor/wear/clima
      const wearFactor = 1 + (1 - d.tyreWear / 100) * 0.045; // pneu gasto = mais lento
      const tyrePace = TYRES[d.tyre]?.paceMul ?? 1.0;
      const enginePace = ENGINE_MODES[d.engineMode]?.paceMul ?? 1.0;

      const lapMsDynamic = d.targetLapMs * tyrePace * enginePace * wearFactor * state.weather.paceMul * wrongTyrePenalty;
      const spd = (1 / lapMsDynamic);

      d.progress += spd * noise * dt;
      d.totalTimeMs += dt;

      // simula ERS (bem simples)
      if (d.engineMode === "ATK") d.ers = clamp(d.ers - dt * 0.0025, 0, 100);
      else if (d.engineMode === "ECO") d.ers = clamp(d.ers + dt * 0.0018, 0, 100);
      else d.ers = clamp(d.ers + dt * 0.0006, 0, 100);

      // completou volta
      if (d.progress >= 1) {
        d.progress -= 1;
        d.laps += 1;

        // calcula tempo de volta aproximado
        const lapMs = lapMsDynamic + rnd(-220, 220) + (state.weather.wet ? rnd(0, 350) : 0);
        d.lastLapMs = lapMs;
        if (!d.bestLapMs || lapMs < d.bestLapMs) d.bestLapMs = lapMs;

        // desgaste por volta
        const wear = wearBase * wearMul * weatherMul * wrongTyrePenalty;
        d.tyreWear = clamp(d.tyreWear - wear, 0, 100);

        // aciona pit automaticamente se pneu muito gasto (IA)
        if (d.tyreWear < 18 && (d.laps - d.lastPitLap) >= PIT.minLapsBetweenStops) {
          if (Math.random() < 0.65) {
            // IA decide pit
            d.pitRequested = true;
          }
        }

        // executa pit se solicitado
        if (d.pitRequested && (d.laps - d.lastPitLap) >= PIT.minLapsBetweenStops) {
          beginPit(d);
        }
      }
    });

    // ordena por "tempo total" aproximado (leader = menor)
    // Observação: isto é uma aproximação suficiente para Etapa 1 (visual + gaps)
    state.drivers.sort((a, b) => a.totalTimeMs - b.totalTimeMs);

    // aplica posições e gaps
    const leader = state.drivers[0];
    state.drivers.forEach((d, idx) => {
      d.position = idx + 1;
      d.gapToLeaderMs = d.totalTimeMs - leader.totalTimeMs;
    });

    // atualiza topo (volta/clima/temp) se existir
    if (state.el.subtitle) {
      const maxLap = Math.max(...state.drivers.map(x => x.laps));
      state.el.subtitle.textContent = `Volta ${maxLap + 1} • Clima: ${state.weather.name} • Pista: ${state.trackTempC}°C`;
    }
  }

  function computeWrongTyrePenalty(tyreKey) {
    if (!state.weather.wet) return 1.0;
    // chuva: S/M/H perdem muito
    if (tyreKey === "S" || tyreKey === "M" || tyreKey === "H") return 1.10;
    // chuva: inter/wet ok
    if (tyreKey === "I") return 1.03;
    if (tyreKey === "W") return 1.00;
    return 1.08;
  }

  function beginPit(d) {
    d.inPit = true;
    d.pitTimerMs = 0;

    // troca pneu conforme clima
    if (state.weather.wet) {
      d.tyre = (Math.random() < 0.55) ? "I" : "W";
    } else {
      // seco: escolhe M/H, e ocasional soft
      const r = Math.random();
      d.tyre = r < 0.20 ? "S" : (r < 0.70 ? "M" : "H");
    }

    // penaliza tempo imediatamente
    d.totalTimeMs += PIT.laneLossMs;
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  function render() {
    // carros no mapa
    if (state.pathPoints.length && state.visuals.size) {
      state.drivers.forEach(d => {
        const v = state.visuals.get(d.id);
        if (!v) return;

        const idx = Math.floor(d.progress * (state.pathPoints.length - 1));
        const p = state.pathPoints[idx];
        if (!p) return;

        v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      });
    }

    // lista da sessão (HUD direita)
    renderSessionList();
  }

  function renderSessionList() {
    const list = state.el.sessionList;
    if (!list) return;

    // limpa
    list.innerHTML = "";

    // cria linhas (pos, foto, nome, equipe, gap, pneu)
    state.drivers.forEach((d, idx) => {
      const row = document.createElement("div");
      row.className = "driver-row";

      const faceSrc = `assets/faces/${d.code}.png`;
      const tyreTxt = d.tyre || "M";
      const gapTxt = idx === 0 ? "LEADER" : formatGapMs(d.gapToLeaderMs);
      const pitTxt = d.inPit ? "PIT" : "";

      row.innerHTML = `
        <div class="pos">${idx + 1}</div>
        <img class="face" src="${faceSrc}" onerror="this.style.visibility='hidden'" />
        <div class="meta">
          <div class="name">${d.name}</div>
          <div class="team">${d.teamName || d.teamKey || ""}</div>
          <div class="mini">Voltas: ${d.laps} • Pneu: ${tyreTxt} ${pitTxt}</div>
        </div>
        <div class="gap">${gapTxt}</div>
      `;

      // destaque para equipe do usuário
      if (String(d.teamKey).toLowerCase() === String(state.userTeam).toLowerCase()) {
        row.classList.add("user-team-row");
      }

      list.appendChild(row);
    });
  }

  // ------------------------------
  // USER ACTIONS (ETAPA 1)
  // ------------------------------
  function getUserDrivers() {
    const u = state.drivers.filter(d => String(d.teamKey).toLowerCase() === String(state.userTeam).toLowerCase());
    return u.slice(0, 2);
  }

  function fillUserCards() {
    const u = getUserDrivers();

    // se o seu HTML tiver ids user-driver-1 e user-driver-2 com sub-elementos
    const tryFill = (card, d) => {
      if (!card || !d) return;

      const face = card.querySelector("img.user-face, .user-face img, img.face, img");
      const name = card.querySelector(".user-name, .name, .pilot-name");
      const team = card.querySelector(".user-team, .team, .pilot-team");
      const logo = card.querySelector("img.user-logo, .user-logo img");

      if (face) face.src = `assets/faces/${d.code}.png`;
      if (name) name.textContent = d.name;
      if (team) team.textContent = d.teamName || d.teamKey;

      // logo: tenta o do mercado ou fallback
      if (logo) {
        logo.src = d.logo || teamLogoFromKey(d.teamKey);
        logo.onerror = () => { logo.style.visibility = "hidden"; };
      }
    };

    // tenta nos cards detectados
    if (state.el.userCards.length) {
      // se vier 4 refs, usa as duas primeiras “reais”
      tryFill(state.el.userCards[0], u[0]);
      tryFill(state.el.userCards[1], u[1]);
      if (state.el.userCards[2]) tryFill(state.el.userCards[2], u[0]);
      if (state.el.userCards[3]) tryFill(state.el.userCards[3], u[1]);
    }
  }

  function setDriverMode(ownerIdx, modeKey) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d) return;

    if (!ENGINE_MODES[modeKey]) return;
    d.engineMode = modeKey;
  }

  function requestPit(ownerIdx) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d) return;

    // evita pit spam
    if (d.inPit) return;
    if ((d.laps - d.lastPitLap) < PIT.minLapsBetweenStops) return;

    d.pitRequested = true;
  }

  function changeTyre(ownerIdx, tyreKey) {
    const u = getUserDrivers();
    const d = u[ownerIdx];
    if (!d) return;

    if (!TYRES[tyreKey]) return;

    // troca só via pit
    d.pitRequested = true;
    d.__requestedTyre = tyreKey;
  }

  // se o usuário pediu pneu específico, aplica no pit
  function applyRequestedTyreIfAny(d) {
    if (d.__requestedTyre && TYRES[d.__requestedTyre]) {
      d.tyre = d.__requestedTyre;
      d.__requestedTyre = null;
    }
  }

  // integra no beginPit
  const _beginPitOriginal = beginPit;
  beginPit = function (d) {
    d.inPit = true;
    d.pitTimerMs = 0;

    // se usuário escolheu pneu, prioriza
    applyRequestedTyreIfAny(d);

    if (!d.tyre || !TYRES[d.tyre]) {
      // troca pneu conforme clima
      if (state.weather.wet) {
        d.tyre = (Math.random() < 0.55) ? "I" : "W";
      } else {
        const r = Math.random();
        d.tyre = r < 0.20 ? "S" : (r < 0.70 ? "M" : "H");
      }
    }

    d.totalTimeMs += PIT.laneLossMs;
  };

})();
