/* =========================================================
   F1 MANAGER 2025 — RACE (RESTORE + STABLE CORE)
   - Sem imports (compatível com <script src="race.js">)
   - IDs compatíveis com race.html (track-container, drivers-list, etc.)
   - SVG por track via assets/tracks/{track}.svg
   - Carros PNG (assets/teams/{team}.png) como overlay
   - HUD + 1x/2x/4x + PIT + PÓDIO
   - Integração Economy (F1MEconomy) dentro do race.js (safe / não quebra corrida)
   ========================================================= */

(function () {
  "use strict";

  /* =========================
     PARAMS / CONSTANTES
     ========================= */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP 2025";
  const userTeamKey =
    (params.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      "ferrari"
    ).toLowerCase();

  localStorage.setItem("f1m2025_user_team", userTeamKey);

  const VIEW_W = 1000;
  const VIEW_H = 600;

  // Ajuste fino de sensação (mantém “AAA broadcast feel”)
  const TICK_DT_CAP_MS = 60; // evita saltos em abas em background
  const SAMPLES = 700; // pontos no traçado (suave no mobile)
  const DEFAULT_RACE_LAPS = 12;

  let speedMultiplier = 1;

  /* =========================
     DADOS BASE (drivers/teams)
     - Mantido local e estável (não depende de outro arquivo)
     ========================= */
  const DRIVERS_2025 = [
    { code: "VER", name: "Verstappen", team: "redbull", rating: 96 },
    { code: "PER", name: "Perez", team: "redbull", rating: 89 },

    { code: "LEC", name: "Leclerc", team: "ferrari", rating: 94 },
    { code: "SAI", name: "Sainz", team: "ferrari", rating: 91 },

    { code: "HAM", name: "Hamilton", team: "mercedes", rating: 93 },
    { code: "RUS", name: "Russell", team: "mercedes", rating: 90 },

    { code: "NOR", name: "Norris", team: "mclaren", rating: 92 },
    { code: "PIA", name: "Piastri", team: "mclaren", rating: 89 },

    { code: "ALO", name: "Alonso", team: "astonmartin", rating: 90 },
    { code: "STR", name: "Stroll", team: "astonmartin", rating: 84 },

    { code: "OCO", name: "Ocon", team: "alpine", rating: 86 },
    { code: "GAS", name: "Gasly", team: "alpine", rating: 86 },

    { code: "ALB", name: "Albon", team: "williams", rating: 85 },
    { code: "SAR", name: "Sargeant", team: "williams", rating: 80 },

    { code: "TSU", name: "Tsunoda", team: "rb", rating: 84 },
    { code: "RIC", name: "Ricciardo", team: "rb", rating: 85 },

    { code: "BOT", name: "Bottas", team: "sauber", rating: 83 },
    { code: "ZHO", name: "Zhou", team: "sauber", rating: 82 },

    { code: "MAG", name: "Magnussen", team: "haas", rating: 82 },
    { code: "HUL", name: "Hulkenberg", team: "haas", rating: 84 }
  ];

  // Tempo-base por pista (ms por volta em 1x). Se não achar, usa 92s.
  const TRACK_BASE_LAP_TIME_MS = {
    australia: 91500,
    bahrain: 96500,
    saudiarabia: 90000,
    japan: 90500,
    china: 97500,
    miami: 93000,
    imola: 91500,
    monaco: 75500,
    canada: 92000,
    spain: 90500,
    austria: 67500,
    britain: 89500,
    hungary: 78000,
    belgium: 107000,
    netherlands: 73000,
    monza: 80000,
    singapore: 103000,
    austin: 96500,
    mexico: 78500,
    brazil: 74000,
    lasvegas: 93000,
    qatar: 83500,
    abudhabi: 88500
  };

  const TRACK_RACE_LAPS = {
    monaco: 18,
    austria: 16,
    netherlands: 16,
    brazil: 16
  };

  /* =========================
     ECONOMY (safe embed)
     - Projetado para NÃO quebrar a corrida
     - Só aplica no final do GP (payout + custos)
     ========================= */
  const F1MEconomy = (function () {
    const KEY = "f1m2025_economy";

    const defaults = {
      version: 1,
      balance: 2500000,
      week: 1,
      seasonRaceIndex: 1,

      sponsor: {
        name: "Patrocinador Principal",
        payPerGP: 350000,
        bonusPodium: 200000,
        bonusWin: 350000
      },

      staff: {
        pitCrewLevel: 3,      // influencia pit-stop
        tyreEngineerLevel: 3, // influencia desgaste
        setupEngineerLevel: 3 // influencia consistência
      },

      manager: {
        fired: false,
        fireReason: "",
        targetAvgPos: 10,
        evaluatedHalfSeason: false
      }
    };

    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return structuredClone(defaults);
        const parsed = JSON.parse(raw);
        return { ...structuredClone(defaults), ...parsed };
      } catch (e) {
        return structuredClone(defaults);
      }
    }

    function save(state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        /* ignore */
      }
    }

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    function weeklyCosts(state) {
      // Custos semanais reais (simplificado) — depende do nível de staff
      const pit = 35000 + state.staff.pitCrewLevel * 9000;
      const tyre = 28000 + state.staff.tyreEngineerLevel * 7000;
      const setup = 30000 + state.staff.setupEngineerLevel * 8000;
      const facilities = 60000;
      return pit + tyre + setup + facilities;
    }

    function staffModifiers(state) {
      const pitLevel = clamp(state.staff.pitCrewLevel, 1, 5);
      const tyreLevel = clamp(state.staff.tyreEngineerLevel, 1, 5);
      const setupLevel = clamp(state.staff.setupEngineerLevel, 1, 5);

      return {
        // menor é melhor
        pitTimeFactor: 1.12 - pitLevel * 0.045, // lvl5 ~0.895
        // menor desgaste com níveis maiores
        tyreWearFactor: 1.08 - tyreLevel * 0.03, // lvl5 ~0.93
        // mais estável (menos variação)
        consistencyBoost: 0.90 - setupLevel * 0.06 // lvl5 ~0.60
      };
    }

    function applyEndOfGP(state, result) {
      // result: { userPositions: [p1,p2], podiumTeamKeys: [..], winnerTeamKey: .. }
      const sponsorPay = state.sponsor?.payPerGP || 0;

      let bonus = 0;
      const podium = result?.podium || [];
      if (podium.length) {
        const win = podium[0];
        if (win && win.isUserTeam) bonus += state.sponsor?.bonusWin || 0;
        if (podium.some((p) => p && p.isUserTeam)) bonus += state.sponsor?.bonusPodium || 0;
      }

      const costs = weeklyCosts(state);

      state.balance = (state.balance || 0) + sponsorPay + bonus - costs;
      state.week = (state.week || 1) + 1;
      state.seasonRaceIndex = (state.seasonRaceIndex || 1) + 1;

      // Regras de demissão — metade da temporada (simplificado)
      // Se o user estiver “fora da meta” (média de posição muito ruim) após 50%,
      // marca fired para a camada de lobby decidir.
      const HALF_SEASON = 12; // ajuste ao seu calendário real quando integrar
      if (!state.manager.evaluatedHalfSeason && state.seasonRaceIndex >= HALF_SEASON) {
        state.manager.evaluatedHalfSeason = true;
        const avgPos = result?.userAvgPos ?? 99;
        if (avgPos > state.manager.targetAvgPos) {
          state.manager.fired = true;
          state.manager.fireReason =
            "Metas não cumpridas após 50% da temporada (demissão automática).";
        }
      }

      save(state);
    }

    return { load, save, staffModifiers, applyEndOfGP };
  })();

  /* =========================
     DOM REFS (race.html)
     ========================= */
  const elTrackContainer = document.getElementById("track-container");
  const elDriversList = document.getElementById("drivers-list");
  const elGpTitle = document.getElementById("gp-title");
  const elTeamLogoTop = document.getElementById("teamLogoTop");
  const elLapLabel = document.getElementById("race-lap-label");
  const elPodiumHost = document.getElementById("podium-modal");
  const elBackLobby = document.getElementById("btnBackLobby");
  const speedBtns = Array.from(document.querySelectorAll(".speed-btn"));

  const userCard0 = document.getElementById("user-driver-card-0");
  const userCard1 = document.getElementById("user-driver-card-1");

  if (elGpTitle) elGpTitle.textContent = gpName;
  if (elTeamLogoTop) elTeamLogoTop.src = `assets/teams/${userTeamKey}.png`;

  /* =========================
     STATE
     ========================= */
  const economyState = F1MEconomy.load();
  const staffMods = F1MEconomy.staffModifiers(economyState);

  const raceState = {
    trackKey,
    gpName,
    userTeamKey,

    pathPoints: [],
    svg: null,
    overlay: null,

    baseLapMs: TRACK_BASE_LAP_TIME_MS[trackKey] || 92000,
    totalLaps: TRACK_RACE_LAPS[trackKey] || DEFAULT_RACE_LAPS,

    timeMs: 0,
    lastTs: 0,

    cars: [],
    finished: false,
    podiumShown: false
  };

  /* =========================
     HELPERS
     ========================= */
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function formatMs(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const mm = String(m).padStart(1, "0");
    const ss = String(s).padStart(2, "0");
    const t = Math.floor((ms % 1000) / 10);
    const tt = String(t).padStart(2, "0");
    return `${mm}:${ss}.${tt}`;
  }

  function safeText(s) {
    return String(s || "").replace(/[<>]/g, "");
  }

  function markActiveSpeed(btn) {
    speedBtns.forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  function getUserDrivers() {
    const list = raceState.cars.filter((c) => c.team === userTeamKey);
    // garante 2 (se por algum motivo não tiver, pega os dois primeiros)
    return list.length >= 2 ? list.slice(0, 2) : raceState.cars.slice(0, 2);
  }

  /* =========================
     SVG LOAD (igual Qualy, estável)
     ========================= */
  async function loadTrackSvg(track) {
    if (!elTrackContainer) return;

    elTrackContainer.innerHTML = "";
    elTrackContainer.classList.add("track-container"); // mantém compatibilidade

    // Wrapper com position relative (CSS também cobre)
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.overflow = "hidden";
    elTrackContainer.appendChild(wrapper);

    // SVG base
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "track-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    wrapper.appendChild(svg);

    // Overlay para carros (PNG)
    const overlay = document.createElement("div");
    overlay.className = "cars-overlay";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    wrapper.appendChild(overlay);

    raceState.svg = svg;
    raceState.overlay = overlay;

    let text = "";
    try {
      const resp = await fetch(`assets/tracks/${track}.svg`, { cache: "no-store" });
      text = await resp.text();
    } catch (e) {
      console.error("Erro carregando SVG da pista:", e);
      svg.innerHTML = `<text x="20" y="40" fill="#fff">Erro ao carregar assets/tracks/${track}.svg</text>`;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");

    // pega o primeiro path “principal”
    const path = doc.querySelector("path");
    if (!path) {
      console.error("Nenhum <path> encontrado no SVG da pista.");
      svg.innerHTML = `<text x="20" y="40" fill="#fff">SVG inválido: sem &lt;path&gt;</text>`;
      return;
    }

    // amostra pontos do traçado real
    let pts = [];
    try {
      const len = path.getTotalLength();
      for (let i = 0; i < SAMPLES; i++) {
        const p = path.getPointAtLength((len * i) / SAMPLES);
        pts.push({ x: p.x, y: p.y });
      }
    } catch (e) {
      console.error("Falha ao amostrar path (getTotalLength/getPointAtLength):", e);
      svg.innerHTML = `<text x="20" y="40" fill="#fff">Path inválido (sem geometria)</text>`;
      return;
    }

    // normaliza para 1000x600
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;

    // padding leve para “não colar” nas bordas
    const pad = 22;

    const norm = pts.map((p) => ({
      x: pad + ((p.x - minX) / w) * (VIEW_W - pad * 2),
      y: pad + ((p.y - minY) / h) * (VIEW_H - pad * 2)
    }));

    raceState.pathPoints = norm;

    // desenha “pista broadcast” (sem reinventar visual)
    svg.innerHTML = "";

    const polyOuter = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyOuter.setAttribute("points", norm.map((p) => `${p.x},${p.y}`).join(" "));
    polyOuter.setAttribute("fill", "none");
    polyOuter.setAttribute("stroke", "#555");
    polyOuter.setAttribute("stroke-width", "18");
    polyOuter.setAttribute("stroke-linecap", "round");
    polyOuter.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polyOuter);

    const polyInner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyInner.setAttribute("points", norm.map((p) => `${p.x},${p.y}`).join(" "));
    polyInner.setAttribute("fill", "none");
    polyInner.setAttribute("stroke", "#ffffff");
    polyInner.setAttribute("stroke-width", "6");
    polyInner.setAttribute("stroke-linecap", "round");
    polyInner.setAttribute("stroke-linejoin", "round");
    svg.appendChild(polyInner);
  }

  function getPositionOnTrack(progress01) {
    const pts = raceState.pathPoints;
    if (!pts.length) return { x: 0, y: 0, angle: 0 };

    const total = pts.length;
    const idxFloat = progress01 * total;

    let i0 = Math.floor(idxFloat);
    let i1 = (i0 + 1) % total;
    const t = idxFloat - i0;

    if (i0 >= total) i0 = total - 1;
    if (i1 >= total) i1 = 0;

    const p0 = pts[i0];
    const p1 = pts[i1];

    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    return { x, y, angle };
  }

  /* =========================
     CARS / INIT
     ========================= */
  function buildCars() {
    raceState.cars = DRIVERS_2025.map((d, idx) => {
      const ratingCenter = 90;
      const ratingDelta = (d.rating || 85) - ratingCenter;

      // skillFactor menor = mais rápido
      let skillFactor = 1 - ratingDelta * 0.006; // similar ao qualy
      skillFactor = clamp(skillFactor, 0.70, 1.20);

      const targetLapMs = raceState.baseLapMs * skillFactor;

      // base speed: 1 volta em targetLapMs (em 1x), com ruído pequeno
      const speedBase = 1 / targetLapMs;

      const carEl = document.createElement("img");
      carEl.className = "car-sprite";
      carEl.alt = d.team;
      carEl.src = `assets/teams/${d.team}.png`;

      // fallback: se imagem falhar, mantém visível com “dot”
      carEl.onerror = () => {
        carEl.classList.add("car-fallback");
        carEl.removeAttribute("src");
      };

      if (raceState.overlay) raceState.overlay.appendChild(carEl);

      return {
        ...d,
        index: idx,
        face: `assets/faces/${d.code}.png`,
        teamLogo: `assets/teams/${d.team}.png`,

        laps: 0,
        progress: Math.random(), // dispersão inicial
        speedBase,

        // telemetria simplificada
        tyre: 100,
        car: 100,
        engineMode: 2, // 1..4
        aggrMode: 2,   // 1..4
        ers: 50,
        pushing: false,
        saving: false,

        // pit
        pitRequest: false,
        inPit: false,
        pitRemainingMs: 0,

        // timing
        bestLapMs: null,
        lastLapMs: null,
        lapStartMs: 0,

        finished: false,
        finishTimeMs: null,

        el: carEl
      };
    });

    // Ajusta início de volta para todos
    raceState.cars.forEach((c) => (c.lapStartMs = 0));
  }

  function fillUserCards() {
    const userDrivers = getUserDrivers();

    [userCard0, userCard1].forEach((card, i) => {
      const drv = userDrivers[i];
      if (!card || !drv) return;

      const img = card.querySelector(".user-face");
      const nameEl = card.querySelector(".user-name");
      const teamEl = card.querySelector(".user-team");
      const statusEl = card.querySelector(".user-status");

      if (img) {
        img.src = drv.face;
        img.onerror = () => {
          // mantém sem quebrar layout
          img.removeAttribute("src");
        };
      }
      if (nameEl) nameEl.textContent = drv.name;
      if (teamEl) teamEl.textContent = drv.team.toUpperCase();
      if (statusEl) statusEl.textContent = "Normal";
    });
  }

  function setupUIEvents() {
    // Speed
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = Number(btn.getAttribute("data-speed") || "1");
        speedMultiplier = v === 2 ? 2 : v === 4 ? 4 : 1;
        markActiveSpeed(btn);
      });
    });

    // Voltar lobby
    if (elBackLobby) {
      elBackLobby.addEventListener("click", () => {
        // mantém comportamento simples: volta para index (se existir)
        // ajuste aqui se seu lobby tiver URL específica
        window.location.href = "index.html";
      });
    }

    // Botões dos pilotos do usuário
    document.querySelectorAll(".user-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index") || "0");
        const action = btn.getAttribute("data-action") || "";
        const userDrivers = getUserDrivers();
        const drv = userDrivers[idx];
        if (!drv) return;

        if (action === "pit") {
          drv.pitRequest = true;
          setUserStatus(idx, "PIT solicitado");
          return;
        }

        if (action === "push") {
          drv.pushing = true;
          drv.saving = false;
          setUserStatus(idx, "Ataque");
          return;
        }

        if (action === "save") {
          drv.saving = true;
          drv.pushing = false;
          setUserStatus(idx, "Economizar");
          return;
        }

        if (action === "engineUp") {
          drv.engineMode = clamp(drv.engineMode + 1, 1, 4);
          return;
        }
        if (action === "engineDown") {
          drv.engineMode = clamp(drv.engineMode - 1, 1, 4);
          return;
        }

        if (action === "aggrUp") {
          drv.aggrMode = clamp(drv.aggrMode + 1, 1, 4);
          return;
        }
        if (action === "aggrDown") {
          drv.aggrMode = clamp(drv.aggrMode - 1, 1, 4);
          return;
        }

        if (action === "ers") {
          // boost curto
          drv.ers = clamp(drv.ers + 15, 0, 100);
          setUserStatus(idx, "ERS Boost");
          return;
        }
      });
    });
  }

  function setUserStatus(cardIndex, text) {
    const card = cardIndex === 0 ? userCard0 : userCard1;
    if (!card) return;
    const statusEl = card.querySelector(".user-status");
    if (statusEl) statusEl.textContent = text;
  }

  /* =========================
     LOOP / SIM
     ========================= */
  function updateTelemetryAndWear(car, dtMs) {
    // desgaste influenciado por staff (tyreWearFactor), agressividade, push/save
    const tyreWearBase = 0.0021; // por segundo em 1x
    const aggrFactor = 0.85 + car.aggrMode * 0.10; // 1..4
    const pushFactor = car.pushing ? 1.18 : 1.0;
    const saveFactor = car.saving ? 0.88 : 1.0;

    const wear = (dtMs / 1000) * tyreWearBase * aggrFactor * pushFactor * saveFactor * staffMods.tyreWearFactor;
    car.tyre = clamp(car.tyre - wear * 100, 0, 100);

    // desgaste do carro leve
    const carWear = (dtMs / 1000) * 0.00035 * pushFactor;
    car.car = clamp(car.car - carWear * 100, 0, 100);

    // ERS regenera/drena
    const ersDelta =
      (dtMs / 1000) *
      (car.pushing ? -3.2 : car.saving ? +2.4 : +0.8);
    car.ers = clamp(car.ers + ersDelta, 0, 100);
  }

  function computeSpeedFactor(car) {
    // engineMode 1..4
    const engineFactor = 0.88 + car.engineMode * 0.05; // 0.93..1.08
    const tyreFactor = 0.72 + (car.tyre / 100) * 0.35; // 0.72..1.07
    const carFactor = 0.80 + (car.car / 100) * 0.25;   // 0.80..1.05

    // consistência (setup staff) reduz variação
    const noise = (Math.random() - 0.5) * 0.0025 * staffMods.consistencyBoost;

    const push = car.pushing ? 1.02 : 1.0;
    const save = car.saving ? 0.985 : 1.0;

    return engineFactor * tyreFactor * carFactor * push * save + noise;
  }

  function handlePit(car, dtMs) {
    if (car.finished) return;

    if (!car.inPit && car.pitRequest) {
      // entra no pit quando passar por “linha” (simples: ao completar uma volta)
      // para não inventar mecânica, aplicamos ao fim da volta:
      // (pitRequest é consumido no fechamento de volta)
      return;
    }

    if (car.inPit) {
      car.pitRemainingMs = Math.max(0, car.pitRemainingMs - dtMs * speedMultiplier);
      if (car.pitRemainingMs <= 0) {
        car.inPit = false;
        car.pitRequest = false;
        car.tyre = 100;
        // leve recuperação (pit repair básico)
        car.car = clamp(car.car + 6, 0, 100);
      }
    }
  }

  function maybeFinishLap(car, prevProgress, newProgress) {
    if (car.finished) return;

    // Detecta cruzar 1.0 -> nova volta
    if (prevProgress < 1 && newProgress >= 1) {
      const lapEndMs = raceState.timeMs;
      const lapMs = lapEndMs - car.lapStartMs;

      car.lastLapMs = lapMs;
      car.bestLapMs = car.bestLapMs == null ? lapMs : Math.min(car.bestLapMs, lapMs);
      car.lapStartMs = lapEndMs;

      // Se pit foi solicitado, entra agora (fim da volta)
      if (car.pitRequest && !car.inPit) {
        car.inPit = true;

        // pit-stop influenciado por staff
        const basePit = 2600 + Math.random() * 700; // 2.6–3.3s
        const factor = staffMods.pitTimeFactor;
        car.pitRemainingMs = basePit * factor;

        // “penalidade” de tempo por erro (pequena e rara)
        if (Math.random() < 0.06) car.pitRemainingMs += 900 + Math.random() * 600;
      }

      car.laps += 1;

      // final?
      if (car.laps >= raceState.totalLaps) {
        car.finished = true;
        car.finishTimeMs = raceState.timeMs;
      }
    }
  }

  function updateCars(dtMs) {
    raceState.cars.forEach((car) => {
      if (car.finished) return;

      // pit process
      handlePit(car, dtMs);

      // se está no pit, praticamente não anda
      const pitFactor = car.inPit ? 0.001 : 1.0;

      updateTelemetryAndWear(car, dtMs);

      const factor = computeSpeedFactor(car) * pitFactor;

      const prev = car.progress;

      // dtMs * speedBase -> delta de “fração de volta”
      // speedBase foi calibrado para 1 volta em targetLapMs (ms) em 1x
      const delta = dtMs * car.speedBase * speedMultiplier * factor;

      let next = car.progress + delta;

      // fecha voltas (pode passar de 1)
      while (next >= 1) {
        maybeFinishLap(car, car.progress, 1);
        next -= 1;
        car.progress = 0;
      }

      car.progress = next;

      // se finalizou dentro do loop
      if (car.finished) return;

      // atualiza label de volta (leader)
    });
  }

  function computeOrder() {
    // ordena por distância total e, em empate, por tempo de finalização
    const cars = raceState.cars.slice();

    cars.sort((a, b) => {
      const da = (a.laps || 0) + (a.progress || 0);
      const db = (b.laps || 0) + (b.progress || 0);
      if (db !== da) return db - da;

      // se ambos finalizados, menor tempo vence
      if (a.finished && b.finished) return (a.finishTimeMs || 0) - (b.finishTimeMs || 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return 0;
    });

    return cars;
  }

  function renderCars() {
    raceState.cars.forEach((car) => {
      if (!car.el) return;
      const pos = getPositionOnTrack(car.progress);
      // centraliza o sprite (tamanho via CSS)
      car.el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${pos.angle}deg)`;
      car.el.style.opacity = car.inPit ? "0.65" : "1";
    });
  }

  function renderHUD(order) {
    if (!elDriversList) return;

    elDriversList.innerHTML = "";

    const leader = order[0];
    const leaderDist = (leader.laps || 0) + (leader.progress || 0);

    order.forEach((car, idx) => {
      const dist = (car.laps || 0) + (car.progress || 0);
      const gap = (leaderDist - dist) * raceState.baseLapMs; // aproximação em ms

      const card = document.createElement("div");
      card.className = "driver-card" + (idx === 0 ? " leader" : "");

      const posEl = document.createElement("div");
      posEl.className = "driver-pos";
      posEl.textContent = String(idx + 1);

      const teamLogo = document.createElement("img");
      teamLogo.className = "driver-team-logo";
      teamLogo.src = car.teamLogo;
      teamLogo.alt = car.team;
      teamLogo.onerror = () => teamLogo.removeAttribute("src");

      const face = document.createElement("img");
      face.className = "driver-face";
      face.src = car.face;
      face.alt = car.name;
      face.onerror = () => face.removeAttribute("src");

      const info = document.createElement("div");
      info.className = "driver-info";
      info.innerHTML = `
        <div class="driver-name-text">${safeText(car.name)}</div>
        <div class="driver-team-text">${safeText(car.team).toUpperCase()}</div>
      `;

      const stats = document.createElement("div");
      stats.className = "driver-stats";

      const lapStr = car.finished
        ? "Final"
        : `V${Math.min(car.laps + 1, raceState.totalLaps)}/${raceState.totalLaps}`;

      const gapStr = idx === 0 ? "LÍDER" : `+${formatMs(Math.max(0, gap))}`;

      stats.innerHTML = `
        <div class="stat-line"><span>${lapStr}</span><span>${gapStr}</span></div>
        <div class="stat-line"><span>Pneu</span><span>${Math.round(car.tyre)}%</span></div>
      `;

      card.appendChild(posEl);
      card.appendChild(teamLogo);
      card.appendChild(face);
      card.appendChild(info);
      card.appendChild(stats);

      elDriversList.appendChild(card);
    });

    // Atualiza “volta” na topbar baseado no líder
    if (elLapLabel && leader) {
      const lapNow = leader.finished ? raceState.totalLaps : clamp(leader.laps + 1, 1, raceState.totalLaps);
      elLapLabel.textContent = `Volta ${lapNow}/${raceState.totalLaps}`;
    }

    // Atualiza painel do usuário (telemetria)
    updateUserTelemetry();
  }

  function updateUserTelemetry() {
    const userDrivers = getUserDrivers();

    userDrivers.forEach((drv, i) => {
      const tyreEl = document.getElementById(`user-tyre-${i}`);
      const carEl = document.getElementById(`user-car-${i}`);
      const engEl = document.getElementById(`user-engine-${i}`);
      const agEl = document.getElementById(`user-aggr-${i}`);
      const ersEl = document.getElementById(`user-ers-${i}`);

      if (tyreEl) tyreEl.textContent = `${Math.round(drv.tyre)}%`;
      if (carEl) carEl.textContent = `${Math.round(drv.car)}%`;
      if (engEl) engEl.textContent = `M${drv.engineMode}`;
      if (agEl) agEl.textContent = `A${drv.aggrMode}`;
      if (ersEl) ersEl.textContent = `${Math.round(drv.ers)}%`;

      // status
      const status = drv.inPit
        ? "No PIT"
        : drv.pushing
        ? "Ataque"
        : drv.saving
        ? "Economizar"
        : "Normal";
      setUserStatus(i, status);
    });
  }

  /* =========================
     FINISH / PODIUM
     ========================= */
  function allFinished() {
    return raceState.cars.every((c) => c.finished);
  }

  function buildPodiumModal(podium) {
    // race.html tem <div id="podium-modal" style="display:none;"></div>
    // CSS espera .podium-modal e .hidden. :contentReference[oaicite:7]{index=7}
    if (!elPodiumHost) return;

    elPodiumHost.style.display = "block";
    elPodiumHost.className = "podium-modal";

    const podiumCards = podium.slice(0, 3).map((c, idx) => {
      const cls = idx === 0 ? "first" : idx === 1 ? "second" : "third";
      const pos = idx === 0 ? "1º" : idx === 1 ? "2º" : "3º";
      return `
        <div class="podium-card ${cls}">
          <div class="podium-pos">${pos}</div>
          <img class="podium-face" src="${c.face}" onerror="this.removeAttribute('src')" alt="${safeText(c.name)}"/>
          <div class="podium-name">${safeText(c.name)}</div>
          <div class="podium-team">${safeText(c.team).toUpperCase()}</div>
          <div style="margin-top:6px;">
            <img src="${c.teamLogo}" onerror="this.removeAttribute('src')" alt="${safeText(c.team)}" style="height:18px; width:auto; object-fit:contain; opacity:.95;" />
          </div>
        </div>
      `;
    });

    elPodiumHost.innerHTML = `
      <div class="podium-content">
        <h2>🏁 Fim da Corrida — Pódio</h2>
        <div class="podium-cards">
          ${podiumCards.join("")}
        </div>
        <button class="podium-close" id="podiumCloseBtn">FECHAR</button>
      </div>
    `;

    const closeBtn = document.getElementById("podiumCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        elPodiumHost.className = "podium-modal hidden";
        elPodiumHost.style.display = "none";
        elPodiumHost.innerHTML = "";
      });
    }
  }

  function applyEconomyAtEnd(podium, order) {
    // calcula média de posição dos 2 pilotos do usuário
    const userDrivers = getUserDrivers();
    const positions = userDrivers.map((ud) => {
      const idx = order.findIndex((x) => x.code === ud.code);
      return idx >= 0 ? idx + 1 : 20;
    });
    const avgPos = positions.reduce((a, b) => a + b, 0) / positions.length;

    const econ = F1MEconomy.load();
    F1MEconomy.applyEndOfGP(econ, {
      userPositions: positions,
      userAvgPos: avgPos,
      podium: podium.map((p) => ({
        code: p.code,
        team: p.team,
        isUserTeam: p.team === userTeamKey
      }))
    });
  }

  function maybeEndRace() {
    if (raceState.finished) return;

    if (allFinished()) {
      raceState.finished = true;

      const order = computeOrder();
      const podium = order.slice(0, 3);

      if (!raceState.podiumShown) {
        raceState.podiumShown = true;
        buildPodiumModal(podium);
        applyEconomyAtEnd(podium, order);
      }
    }
  }

  /* =========================
     RAF LOOP
     ========================= */
  function gameLoop(ts) {
    if (!raceState.lastTs) raceState.lastTs = ts;
    let dt = ts - raceState.lastTs;
    raceState.lastTs = ts;

    dt = clamp(dt, 0, TICK_DT_CAP_MS);
    raceState.timeMs += dt * speedMultiplier;

    updateCars(dt);
    const order = computeOrder();

    renderCars();
    renderHUD(order);

    maybeEndRace();

    if (!raceState.finished) {
      requestAnimationFrame(gameLoop);
    }
  }

  /* =========================
     INIT (DOMContentLoaded)
     ========================= */
  async function initRace() {
    if (!elTrackContainer) {
      console.error("race.html sem #track-container");
      return;
    }

    await loadTrackSvg(trackKey);

    // Só cria carros depois do SVG/overlay existir
    buildCars();
    fillUserCards();
    setupUIEvents();

    // inicia no 1x
    speedMultiplier = 1;
    if (speedBtns && speedBtns.length) markActiveSpeed(speedBtns[0]);

    requestAnimationFrame(gameLoop);
  }

  window.addEventListener("DOMContentLoaded", initRace);
})();
