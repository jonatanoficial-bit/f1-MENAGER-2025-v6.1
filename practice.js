/* =========================================================
   F1 MANAGER 2025 — PRACTICE.JS (TREINO LIVRE)
   Alinhado ao practice.html (layout novo) E compatível com layout antigo
   ✔ Carrega SVG da pista em #track-container
   ✔ Gera pathPoints a partir do PATH do SVG (ou circles.track-point)
   ✔ Carros (2 pilotos do userTeam) em overlay (#cars-layer) com 60fps
   ✔ Velocidade realista (1x / 2x / 4x) via deltaTime (sem “ultra speed”)
   ✔ Lista “Pilotos na pista” + Melhor volta
   ✔ Telemetria ao vivo preenchendo os IDs do HTML novo
   ✔ API global: setSpeed, setMode, pitStop (onclick do HTML)
   ========================================================= */

(() => {
  "use strict";

  /* ===============================
     URL PARAMS
     =============================== */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "";
  const userTeamKey = (params.get("userTeam") || "ferrari").toLowerCase();

  /* ===============================
     TABELA PISTAS (m) — para velocidade real
     =============================== */
  const TRACK_LENGTHS_M = {
    australia: 5278,
    bahrain: 5412,
    saudi: 6174,
    japan: 5807,
    china: 5451,
    miami: 5410,
    imola: 4909,
    monaco: 3337,
    canada: 4361,
    spain: 4657,
    austria: 4318,
    britain: 5891,
    hungary: 4381,
    belgium: 7004,
    netherlands: 4259,
    italy: 5793,
    singapore: 4928,
    usa: 5513,
    mexico: 4304,
    brazil: 4309,
    lasvegas: 6201,
    qatar: 5419,
    abudhabi: 5281,
  };

  /* ===============================
     TEAMS (logo + nome)
     =============================== */
  const TEAMS = {
    redbull: { name: "Red Bull", logo: "assets/teams/redbull.png", color: "#1e41ff" },
    ferrari: { name: "Ferrari", logo: "assets/teams/ferrari.png", color: "#dc0000" },
    mclaren: { name: "McLaren", logo: "assets/teams/mclaren.png", color: "#ff8700" },
    mercedes: { name: "Mercedes", logo: "assets/teams/mercedes.png", color: "#00d2be" },
    aston: { name: "Aston Martin", logo: "assets/teams/aston.png", color: "#006f62" },
    alpine: { name: "Alpine", logo: "assets/teams/alpine.png", color: "#0090ff" },
    racingbulls: { name: "Racing Bulls", logo: "assets/teams/racingbulls.png", color: "#2b4562" },
    williams: { name: "Williams", logo: "assets/teams/williams.png", color: "#00a0de" },
    haas: { name: "Haas", logo: "assets/teams/haas.png", color: "#b6babd" },
    sauber: { name: "Sauber", logo: "assets/teams/sauber.png", color: "#00ffcc" },
  };

  /* ===============================
     DRIVERS 2025 (alinha com seus assets existentes)
     Observação: manter IDs/paths iguais aos seus arquivos em assets/faces/
     =============================== */
  const DRIVERS_2025 = [
    { id: "ver", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull", rating: 98, color: TEAMS.redbull.color, face: "assets/faces/VER.png" },
    { id: "per", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull", rating: 94, color: TEAMS.redbull.color, face: "assets/faces/PER.png" },

    { id: "lec", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: TEAMS.ferrari.color, face: "assets/faces/LEC.png" },
    { id: "sai", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: TEAMS.ferrari.color, face: "assets/faces/SAI.png" },

    { id: "nor", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: TEAMS.mclaren.color, face: "assets/faces/NOR.png" },
    { id: "pia", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: TEAMS.mclaren.color, face: "assets/faces/PIA.png" },

    { id: "ham", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: TEAMS.mercedes.color, face: "assets/faces/HAM.png" },
    { id: "rus", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: TEAMS.mercedes.color, face: "assets/faces/RUS.png" },

    { id: "alo", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: TEAMS.aston.color, face: "assets/faces/ALO.png" },
    { id: "str", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", rating: 88, color: TEAMS.aston.color, face: "assets/faces/STR.png" },

    { id: "gas", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: TEAMS.alpine.color, face: "assets/faces/GAS.png" },
    { id: "oco", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: TEAMS.alpine.color, face: "assets/faces/OCO.png" },

    { id: "tsu", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: TEAMS.racingbulls.color, face: "assets/faces/TSU.png" },
    { id: "law", name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: TEAMS.racingbulls.color, face: "assets/faces/LAW.png" },

    { id: "alb", name: "Alex Albon", teamKey: "williams", teamName: "Williams", rating: 89, color: TEAMS.williams.color, face: "assets/faces/ALB.png" },
    { id: "sar", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 86, color: TEAMS.williams.color, face: "assets/faces/SAR.png" },

    { id: "hul", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber", rating: 89, color: TEAMS.sauber.color, face: "assets/faces/HUL.png" },
    { id: "bor", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 88, color: TEAMS.sauber.color, face: "assets/faces/BOR.png" },

    { id: "mag", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: TEAMS.haas.color, face: "assets/faces/MAG.png" },
    { id: "bea", name: "Oliver Bearman", teamKey: "haas", teamName: "Haas", rating: 87, color: TEAMS.haas.color, face: "assets/faces/BEA.png" },
  ];

  /* ===============================
     ELEMENTOS (layout novo + fallback antigo)
     =============================== */
  const elTrackContainer = document.getElementById("track-container");

  const elTeamLogoTop = document.getElementById("teamLogoTop");
  const elTrackName = document.getElementById("trackName");

  const elTimeRemaining = document.getElementById("timeRemaining") || document.getElementById("hudClock");
  const elHudClock = document.getElementById("hudClock");
  const elBestLapValue = document.getElementById("bestLapValue");
  const elBestLapValue2 = document.getElementById("bestLapValue2");
  const elDriversOnTrack = document.getElementById("driversOnTrack");

  const elP1Face = document.getElementById("p1face");
  const elP2Face = document.getElementById("p2face");
  const elP1Name = document.getElementById("p1name");
  const elP2Name = document.getElementById("p2name");
  const elP1Team = document.getElementById("p1team");
  const elP2Team = document.getElementById("p2team");
  const elP1Info = document.getElementById("p1info");
  const elP2Info = document.getElementById("p2info");

  const elBtnBackLobby = document.getElementById("btnBackLobby") || document.getElementById("btnVoltar");
  const elBtnGoOficina = document.getElementById("btnGoOficina") || document.getElementById("btnOficina");
  const elBtnGoQualy = document.getElementById("btnGoQualy");

  // Telemetria (layout novo)
  const tel = {
    source: document.getElementById("telemetrySource"),
    mode: document.getElementById("telemetryMode"),
    ers: document.getElementById("telemetryERS"),
    speed: document.getElementById("telSpeed"),
    gear: document.getElementById("telGear"),
    rpm: document.getElementById("telRPM"),
    throttle: document.getElementById("telThrottle"),
    traction: document.getElementById("telTraction"),
    grip: document.getElementById("telGrip"),
    brake: document.getElementById("telBrake"),
    stability: document.getElementById("telStability"),
    delta: document.getElementById("telDelta"),
    tyres: document.getElementById("telTyres"),
    tyreTemp: document.getElementById("telTyreTemp"),
    tyrePress: document.getElementById("telTyrePress"),
    fuel: document.getElementById("telFuel"),
    fuelMix: document.getElementById("telFuelMix"),
    fuelUse: document.getElementById("telFuelUse"),
    engine: document.getElementById("telEngine"),
    engineStress: document.getElementById("telStress"),
    s1: document.getElementById("telS1"),
    s2: document.getElementById("telS2"),
    s3: document.getElementById("telS3"),
    lap: document.getElementById("telLap"),
    barSpeed: document.getElementById("barSpeed"),
    barThrottle: document.getElementById("barThrottle"),
    barBrake: document.getElementById("barBrake"),
    barTyres: document.getElementById("barTyres"),
    barFuel: document.getElementById("barFuel"),
    barEngine: document.getElementById("barEngine"),
    spark: document.getElementById("telemetrySpark"),
  };

  if (!elTrackContainer) {
    console.error("❌ practice.html: #track-container não encontrado.");
    return;
  }

  /* ===============================
     HELPERS
     =============================== */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function formatClock(seconds) {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function formatTimeMs(ms) {
    if (!isFinite(ms) || ms <= 0) return "--:--.---";
    const total = ms / 1000;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const mm = Math.floor((total - m * 60 - s) * 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(mm).padStart(3, "0")}`;
  }

  function buildUrl(page) {
    const q = new URLSearchParams();
    q.set("track", trackKey);
    if (gpName) q.set("gp", gpName);
    q.set("userTeam", userTeamKey);
    return `${page}?${q.toString()}`;
  }

  /* ===============================
     SETUP (vindo da OFICINA) — tolerante
     =============================== */
  function loadCarSetup() {
    const keys = [
      `f1m2025_setup_${userTeamKey}`,
      "f1m2025_setup",
      "carSetup",
      "setupData",
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") return obj;
      } catch {}
    }
    return {
      aero: 50,         // 0..100
      suspension: 50,   // 0..100
      tyrePressure: 23, // psi
      engineMap: 50,    // 0..100
    };
  }

  function computeSetupMultipliers(setup) {
    const a = clamp(Number(setup?.aero ?? 50), 0, 100);
    const s = clamp(Number(setup?.suspension ?? 50), 0, 100);
    const tp = clamp(Number(setup?.tyrePressure ?? 23), 18, 28);
    const em = clamp(Number(setup?.engineMap ?? 50), 0, 100);

    // Aero: mais asa => +grip / -vMax
    const vMaxMul = 1.06 - (a / 100) * 0.12;    // ~0.94..1.06
    const gripMul = 0.96 + (a / 100) * 0.10;    // ~0.96..1.06

    // Suspensão: estabilidade/tração
    const stabilityMul = 0.92 + (s / 100) * 0.18; // ~0.92..1.10
    const tractionMul = 0.94 + (s / 100) * 0.14;  // ~0.94..1.08

    // Pressão: grip e desgaste (simplificado)
    const pressureCenter = 23.0;
    const pressureDelta = Math.abs(tp - pressureCenter);
    const tyreGripMul = 1.02 - pressureDelta * 0.01; // ~0.97..1.02
    const tyreWearMul = 1.00 + pressureDelta * 0.03; // ~1.00..1.15

    // Mapa motor
    const enginePowerMul = 0.90 + (em / 100) * 0.20; // ~0.90..1.10
    const fuelUseMul = 0.92 + (em / 100) * 0.25;     // ~0.92..1.17

    return {
      vMaxMul: vMaxMul * enginePowerMul,
      gripMul: gripMul * tyreGripMul,
      stabilityMul,
      tractionMul,
      tyreWearMul,
      fuelUseMul,
    };
  }

  /* ===============================
     ESTADO DO TREINO LIVRE
     =============================== */
  const practice = {
    ready: false,
    speedMultiplier: 1,
    running: true,
    sessionSeconds: 60 * 60,
    lastNow: performance.now(),

    trackLengthM: TRACK_LENGTHS_M[trackKey] || 5200,
    pathPoints: [],              // em coords do SVG (viewBox)
    svg: null,
    overlay: null,
    containerRect: null,

    setup: loadCarSetup(),
    setupMul: null,

    cars: [],
    bestLapMs: Infinity,
    telemetryFocus: 0,           // 0 ou 1
  };
  practice.setupMul = computeSetupMultipliers(practice.setup);

  /* ===============================
     API GLOBAL (onclick do HTML)
     =============================== */
  window.setSpeed = (n) => {
    const v = Number(n);
    practice.speedMultiplier = (v === 1 || v === 2 || v === 4) ? v : 1;
    document.querySelectorAll("[data-speed]").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.speed) === practice.speedMultiplier);
    });
  };

  window.setMode = (carIndex1based, mode) => {
    const idx = Number(carIndex1based) - 1;
    const car = practice.cars[idx];
    if (!car) return;
    if (mode === "eco") car.mode = "ECO";
    else if (mode === "attack") car.mode = "ATTACK";
    else car.mode = "NORMAL";
  };

  window.pitStop = (carIndex1based) => {
    const idx = Number(carIndex1based) - 1;
    const car = practice.cars[idx];
    if (!car) return;
    car.pit.active = true;
    car.pit.remaining = 7; // segundos simulados
  };

  // Bind extra (se existir)
  document.querySelectorAll("[data-speed]").forEach((btn) => {
    btn.addEventListener("click", () => window.setSpeed(btn.dataset.speed));
  });

  /* ===============================
     PILOTOS DO USUÁRIO (2) — CORRETO POR EQUIPE
     =============================== */
  function getUserDrivers() {
    const list = DRIVERS_2025.filter((d) => d.teamKey === userTeamKey);
    if (list.length === 2) return list;
    console.warn("⚠️ userTeam sem 2 pilotos:", userTeamKey, "→ fallback Ferrari");
    return DRIVERS_2025.filter((d) => d.teamKey === "ferrari").slice(0, 2);
  }
  const userDrivers = getUserDrivers();

  /* ===============================
     UI HEADER / BOTOES
     =============================== */
  if (elTrackName) {
    elTrackName.textContent = gpName ? `${gpName}` : trackKey.toUpperCase();
  }

  if (elTeamLogoTop) {
    const t = TEAMS[userTeamKey];
    elTeamLogoTop.src = (t && t.logo) ? t.logo : "";
  }

  if (elBtnBackLobby) elBtnBackLobby.addEventListener("click", () => (window.location.href = buildUrl("lobby.html")));
  if (elBtnGoOficina) elBtnGoOficina.addEventListener("click", () => (window.location.href = buildUrl("oficina.html")));
  if (elBtnGoQualy) elBtnGoQualy.addEventListener("click", () => (window.location.href = buildUrl("qualy.html")));

  /* ===============================
     TRACK SVG LOAD + PATHPOINTS
     =============================== */
  async function loadTrackSVG() {
    // tenta caminhos comuns
    const candidates = [
      `assets/tracks/${trackKey}.svg`,
      `assets/pistas/${trackKey}.svg`,
      `${trackKey}.svg`,
    ];

    let svgText = null;
    let used = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const txt = await res.text();
        if (txt && txt.includes("<svg")) {
          svgText = txt;
          used = url;
          break;
        }
      } catch {}
    }

    if (!svgText) {
      console.error("❌ Não consegui carregar o SVG da pista. Verifique assets/tracks ou assets/pistas:", trackKey);
      elTrackContainer.innerHTML = `<div style="padding:14px;color:#fff;">Erro carregando SVG da pista: ${trackKey}</div>`;
      return null;
    }

    elTrackContainer.innerHTML = svgText;

    // garantir id no svg para o CSS novo
    const svg = elTrackContainer.querySelector("svg");
    if (!svg) {
      console.error("❌ SVG inválido (sem <svg>) em:", used);
      return null;
    }
    svg.id = svg.id || "track-svg";
    svg.setAttribute("preserveAspectRatio", svg.getAttribute("preserveAspectRatio") || "xMidYMid meet");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";

    // overlay carros
    let overlay = elTrackContainer.querySelector("#cars-layer");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "cars-layer";
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      elTrackContainer.style.position = "relative";
      elTrackContainer.appendChild(overlay);
    }

    practice.svg = svg;
    practice.overlay = overlay;

    // pathPoints:
    // 1) se o SVG tiver circles.track-point, usa eles (seus SVGs antigos)
    // 2) senão, usa um PATH principal e amostra pontos
    const circlePts = Array.from(svg.querySelectorAll("circle.track-point"));
    if (circlePts.length >= 20) {
      practice.pathPoints = circlePts.map((c) => ({
        x: Number(c.getAttribute("cx") || 0),
        y: Number(c.getAttribute("cy") || 0),
      }));
    } else {
      // tenta achar um path “linha branca”
      const path =
        svg.querySelector("#racingLine") ||
        svg.querySelector("path.racing-line") ||
        svg.querySelector("path.track-line") ||
        svg.querySelector("path") ||
        null;

      if (!path || typeof path.getTotalLength !== "function") {
        console.error("❌ SVG sem path utilizável para pathPoints.");
        return null;
      }

      const len = path.getTotalLength();
      const samples = 1200; // suave
      const pts = [];
      for (let i = 0; i < samples; i++) {
        const p = path.getPointAtLength((i / samples) * len);
        pts.push({ x: p.x, y: p.y });
      }
      practice.pathPoints = pts;
    }

    // cache rect
    practice.containerRect = elTrackContainer.getBoundingClientRect();

    window.addEventListener("resize", () => {
      practice.containerRect = elTrackContainer.getBoundingClientRect();
    });

    console.log("✅ SVG carregado:", used, "points:", practice.pathPoints.length);
    return svg;
  }

  /* ===============================
     CARS CREATE (2) — overlay DIVs
     =============================== */
  function createCars() {
    practice.cars = [];

    const makeCarEl = (color) => {
      const el = document.createElement("div");
      el.className = "practice-car";
      el.style.position = "absolute";
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.transform = "translate(-6px,-6px)";
      el.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.45)";
      el.style.background = color;
      return el;
    };

    userDrivers.forEach((driver, idx) => {
      const el = makeCarEl(driver.color || "#fff");
      practice.overlay.appendChild(el);

      // física base (m/s) realista: ~70..92 m/s (252..331 km/h)
      const baseVms = 70 + (driver.rating - 85) * 1.2; // rating impact
      const vMax = clamp(baseVms, 66, 92) * practice.setupMul.vMaxMul;

      practice.cars.push({
        driver,
        element: el,

        // estado de volta
        distM: Math.random() * practice.trackLengthM, // espalha no traçado
        lapStartNow: performance.now(),
        lastLapMs: Infinity,
        bestLapMs: Infinity,
        lapCount: 0,

        // carro/estratégia
        mode: "NORMAL",
        ers: 100,
        fuel: 100,
        tyres: 100,
        engineTemp: 92,
        engineStress: 0,

        // pit
        pit: { active: false, remaining: 0 },

        // base
        vMaxMs: vMax,
        deltaMs: 0,

        // setores
        s1: 0,
        s2: 0,
        s3: 0,
        _s1Done: false,
        _s2Done: false,
      });

      // UI cards
      if (idx === 0) {
        if (elP1Face) elP1Face.src = driver.face;
        if (elP1Name) elP1Name.textContent = driver.name;
        if (elP1Team) elP1Team.textContent = driver.teamName || TEAMS[driver.teamKey]?.name || driver.teamKey;
      } else {
        if (elP2Face) elP2Face.src = driver.face;
        if (elP2Name) elP2Name.textContent = driver.name;
        if (elP2Team) elP2Team.textContent = driver.teamName || TEAMS[driver.teamKey]?.name || driver.teamKey;
      }
    });

    // clique no card para trocar fonte da telemetria (se existir painel novo)
    document.querySelectorAll("[data-user-card]").forEach((card) => {
      card.addEventListener("click", () => {
        const n = Number(card.getAttribute("data-user-card")) || 1;
        practice.telemetryFocus = clamp(n - 1, 0, 1);
      });
    });
  }

  /* ===============================
     MAP: SVG coords -> container px
     (usando CTM real do SVG)
     =============================== */
  function svgToContainerPx(x, y) {
    const svg = practice.svg;
    if (!svg) return { x: 0, y: 0 };

    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const sp = pt.matrixTransform(ctm);
    const rect = practice.containerRect || elTrackContainer.getBoundingClientRect();
    return { x: sp.x - rect.left, y: sp.y - rect.top };
  }

  /* ===============================
     TELEMETRIA (simulação coerente com velocidade)
     =============================== */
  function updateTelemetry(now) {
    const car = practice.cars[practice.telemetryFocus];
    if (!car) return;

    const modeMul = car.mode === "ATTACK" ? 1.06 : car.mode === "ECO" ? 0.94 : 1.0;
    const tyreGrip = clamp((car.tyres / 100) * practice.setupMul.gripMul, 0.65, 1.05);

    // velocidade aproximada (km/h)
    const vMs = car._lastVms || 70;
    const vKmh = Math.round(vMs * 3.6);

    // pedais coerentes
    const throttle = clamp(55 + (modeMul - 1) * 120 + (Math.random() * 20 - 10), 5, 100);
    const brake = clamp(10 + (Math.random() * 12 - 6), 0, 40);

    // rpm/gear
    const gear = clamp(Math.floor(1 + (vKmh / 45)), 1, 8);
    const rpm = Math.round(clamp(5200 + vKmh * 20, 6000, 12500));

    // grip/traction/stability
    const traction = Math.round(clamp(70 + tyreGrip * 30 + (Math.random() * 8 - 4), 60, 100));
    const grip = Math.round(clamp(68 + tyreGrip * 32 + (Math.random() * 8 - 4), 55, 100));
    const stability = Math.round(clamp(70 + practice.setupMul.stabilityMul * 25 + (Math.random() * 8 - 4), 55, 100));

    // delta: apenas referência visual
    const delta = (Math.random() * 1.6 - 0.8).toFixed(1);

    // fuel mix e consumo
    const mix = car.mode === "ECO" ? "ECO" : car.mode === "ATTACK" ? "RICH" : "STD";
    const use = car.mode === "ECO" ? "BAIXO" : car.mode === "ATTACK" ? "ALTO" : "MÉDIO";

    // setores/lap
    const s1 = car._s1Done ? car.s1.toFixed(2) : "--.--";
    const s2 = car._s2Done ? car.s2.toFixed(2) : "--.--";
    const s3 = (car._s1Done && car._s2Done) ? car.s3.toFixed(2) : "--.--";

    // preencher DOM (se existir)
    if (tel.source) tel.source.textContent = practice.telemetryFocus === 0 ? "Piloto 1" : "Piloto 2";
    if (tel.mode) tel.mode.textContent = car.mode === "ATTACK" ? "ATAQUE" : car.mode === "ECO" ? "ECO" : "NORMAL";
    if (tel.ers) tel.ers.textContent = `${Math.round(car.ers)}%`;

    if (tel.speed) tel.speed.textContent = String(vKmh);
    if (tel.gear) tel.gear.textContent = String(gear);
    if (tel.rpm) tel.rpm.textContent = String(rpm);

    if (tel.throttle) tel.throttle.textContent = String(Math.round(throttle));
    if (tel.traction) tel.traction.textContent = String(traction);
    if (tel.grip) tel.grip.textContent = String(grip);

    if (tel.brake) tel.brake.textContent = String(Math.round(brake));
    if (tel.stability) tel.stability.textContent = String(stability);
    if (tel.delta) tel.delta.textContent = delta;

    if (tel.tyres) tel.tyres.textContent = `${Math.round(car.tyres)}%`;
    if (tel.tyreTemp) tel.tyreTemp.textContent = `${Math.round(88 + (100 - car.tyres) * 0.05)}°C`;
    if (tel.tyrePress) tel.tyrePress.textContent = `${(practice.setup.tyrePressure ?? 23).toFixed(1)}`;

    if (tel.fuel) tel.fuel.textContent = `${Math.round(car.fuel)}%`;
    if (tel.fuelMix) tel.fuelMix.textContent = mix;
    if (tel.fuelUse) tel.fuelUse.textContent = use;

    if (tel.engine) tel.engine.textContent = `${Math.round(car.engineTemp)}°C`;
    if (tel.engineStress) tel.engineStress.textContent = `${Math.round(car.engineStress)}`;

    if (tel.s1) tel.s1.textContent = s1;
    if (tel.s2) tel.s2.textContent = s2;
    if (tel.s3) tel.s3.textContent = s3;
    if (tel.lap) tel.lap.textContent = formatTimeMs(car.lastLapMs);

    // barras
    if (tel.barSpeed) tel.barSpeed.style.width = `${clamp((vKmh / 350) * 100, 0, 100)}%`;
    if (tel.barThrottle) tel.barThrottle.style.width = `${throttle}%`;
    if (tel.barBrake) tel.barBrake.style.width = `${clamp(brake, 0, 100)}%`;
    if (tel.barTyres) tel.barTyres.style.width = `${clamp(car.tyres, 0, 100)}%`;
    if (tel.barFuel) tel.barFuel.style.width = `${clamp(car.fuel, 0, 100)}%`;
    if (tel.barEngine) tel.barEngine.style.width = `${clamp((car.engineTemp / 120) * 100, 0, 100)}%`;

    // sparkline (opcional)
    if (tel.spark && tel.spark.getContext) {
      const ctx = tel.spark.getContext("2d");
      if (ctx) {
        // buffer simples no próprio objeto
        if (!practice._spark) practice._spark = [];
        practice._spark.push(vKmh);
        if (practice._spark.length > 140) practice._spark.shift();

        ctx.clearRect(0, 0, tel.spark.width, tel.spark.height);

        // fundo sutil
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#0a0a12";
        ctx.fillRect(0, 0, tel.spark.width, tel.spark.height);
        ctx.globalAlpha = 1;

        // linha (sem setar “estilo global do site”, apenas traço local)
        ctx.strokeStyle = "#8be9ff";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const maxV = 350;
        for (let i = 0; i < practice._spark.length; i++) {
          const x = (i / (practice._spark.length - 1)) * tel.spark.width;
          const y = tel.spark.height - (practice._spark[i] / maxV) * tel.spark.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  /* ===============================
     LISTA “PILOTOS NA PISTA” (2)
     =============================== */
  function renderDriversList() {
    if (!elDriversOnTrack) return;

    // ordena por “distância” (quem está mais à frente)
    const arr = practice.cars
      .map((c, idx) => ({ idx, name: c.driver.name, team: c.driver.teamName, dist: c.distM, lap: c.lapCount, lastLapMs: c.lastLapMs }))
      .sort((a, b) => (b.lap - a.lap) || (b.dist - a.dist));

    elDriversOnTrack.innerHTML = "";
    arr.forEach((d, pos) => {
      const row = document.createElement("div");
      row.className = "practice-driver-row";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 10px";
      row.style.borderRadius = "12px";
      row.style.background = "rgba(255,255,255,0.03)";
      row.style.border = "1px solid rgba(255,255,255,0.06)";
      row.style.marginBottom = "6px";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.gap = "10px";
      left.style.alignItems = "center";

      const dot = document.createElement("span");
      dot.style.width = "10px";
      dot.style.height = "10px";
      dot.style.borderRadius = "999px";
      dot.style.background = practice.cars[d.idx]?.driver?.color || "#fff";

      const name = document.createElement("div");
      name.style.fontWeight = "700";
      name.textContent = `${pos + 1}. ${d.name}`;

      const team = document.createElement("div");
      team.style.opacity = "0.75";
      team.style.fontSize = "12px";
      team.textContent = d.team || "";

      const block = document.createElement("div");
      block.style.display = "flex";
      block.style.flexDirection = "column";
      block.appendChild(name);
      block.appendChild(team);

      left.appendChild(dot);
      left.appendChild(block);

      const right = document.createElement("div");
      right.style.textAlign = "right";
      right.style.fontVariantNumeric = "tabular-nums";
      right.style.opacity = "0.9";
      right.textContent = formatTimeMs(d.lastLapMs);

      row.appendChild(left);
      row.appendChild(right);

      // clicar muda a telemetria
      row.addEventListener("click", () => (practice.telemetryFocus = d.idx));

      elDriversOnTrack.appendChild(row);
    });
  }

  /* ===============================
     LOOP PRINCIPAL (deltaTime real)
     =============================== */
  function animate(now) {
    const dt = clamp((now - practice.lastNow) / 1000, 0, 0.05);
    practice.lastNow = now;

    if (!practice.running || !practice.ready) {
      requestAnimationFrame(animate);
      return;
    }

    const simDt = dt * practice.speedMultiplier;
    practice.sessionSeconds -= simDt;
    if (practice.sessionSeconds <= 0) {
      practice.sessionSeconds = 0;
      practice.running = false;
    }

    // relógios
    const clock = formatClock(practice.sessionSeconds);
    if (elTimeRemaining) elTimeRemaining.textContent = clock;
    if (elHudClock) elHudClock.textContent = clock;

    // para setores (simplificado em % da volta)
    const s1End = 0.33;
    const s2End = 0.66;

    // atualiza carros
    for (const car of practice.cars) {
      // pit
      if (car.pit.active) {
        car.pit.remaining -= simDt;
        car._lastVms = 0;
        if (car.pit.remaining <= 0) {
          car.pit.active = false;
          car.pit.remaining = 0;
          car.tyres = clamp(car.tyres + 35, 0, 100);
          car.engineStress = Math.max(0, car.engineStress - 25);
        }
        continue;
      }

      const modeMul = car.mode === "ATTACK" ? 1.06 : car.mode === "ECO" ? 0.94 : 1.0;

      // pneus/combustível influenciam (leve)
      const tyreGrip = clamp((car.tyres / 100) * practice.setupMul.gripMul, 0.65, 1.05);
      const fuelMul = clamp(0.92 + (car.fuel / 100) * 0.08, 0.92, 1.0);

      // velocidade alvo
      const vMs = clamp(car.vMaxMs * modeMul * tyreGrip * fuelMul, 40, 98);
      car._lastVms = vMs;

      // desgaste/consumo (telemetria coerente)
      const tyreWearRate = 0.010 * (car.mode === "ATTACK" ? 1.35 : car.mode === "ECO" ? 0.80 : 1.0) * practice.setupMul.tyreWearMul;
      const fuelRate = 0.007 * (car.mode === "ATTACK" ? 1.30 : car.mode === "ECO" ? 0.80 : 1.0) * practice.setupMul.fuelUseMul;

      car.tyres = clamp(car.tyres - tyreWearRate * simDt * 10, 0, 100);
      car.fuel = clamp(car.fuel - fuelRate * simDt * 10, 0, 100);

      // motor
      car.engineTemp = clamp(car.engineTemp + (car.mode === "ATTACK" ? 0.9 : car.mode === "ECO" ? 0.2 : 0.5) * simDt, 80, 118);
      car.engineStress = clamp(car.engineStress + (car.mode === "ATTACK" ? 0.8 : 0.35) * simDt + (car.engineTemp > 110 ? 1.1 * simDt : 0), 0, 220);

      // ERS (simples)
      car.ers = clamp(car.ers + (car.mode === "ECO" ? 1.8 : car.mode === "ATTACK" ? -2.8 : -0.6) * simDt, 0, 100);

      // avança distância
      car.distM += vMs * simDt;

      // % volta (0..1)
      let prog = car.distM / practice.trackLengthM;

      // cruzou linha
      if (prog >= 1) {
        car.distM -= practice.trackLengthM;
        prog = car.distM / practice.trackLengthM;

        // fecha setores se faltou
        const lapMs = now - car.lapStartNow;
        car.lastLapMs = lapMs;
        car.bestLapMs = Math.min(car.bestLapMs, lapMs);

        practice.bestLapMs = Math.min(practice.bestLapMs, lapMs);

        // reseta setores
        car.lapStartNow = now;
        car.lapCount += 1;
        car._s1Done = false;
        car._s2Done = false;
        car.s1 = 0; car.s2 = 0; car.s3 = 0;
      }

      // setores (tempo relativo ao lapStartNow)
      const lapSec = (now - car.lapStartNow) / 1000;
      if (!car._s1Done && prog >= s1End) {
        car.s1 = lapSec;
        car._s1Done = true;
      }
      if (!car._s2Done && prog >= s2End) {
        car.s2 = lapSec - car.s1;
        car._s2Done = true;
      }
      if (car._s1Done && car._s2Done) {
        car.s3 = Math.max(0, lapSec - car.s1 - car.s2);
      }

      // posição no traçado
      const idx = Math.floor(prog * (practice.pathPoints.length - 1));
      const p = practice.pathPoints[idx];
      if (!p) continue;

      const px = svgToContainerPx(p.x, p.y);
      car.element.style.left = `${px.x}px`;
      car.element.style.top = `${px.y}px`;
    }

    // melhor volta UI
    const best = formatTimeMs(practice.bestLapMs);
    if (elBestLapValue) elBestLapValue.textContent = best;
    if (elBestLapValue2) elBestLapValue2.textContent = best;

    // cards info do usuário
    if (elP1Info && practice.cars[0]) {
      const c = practice.cars[0];
      elP1Info.textContent = `Modo: ${c.mode} • Pneus: ${Math.round(c.tyres)}% • ERS: ${Math.round(c.ers)}% • Última: ${formatTimeMs(c.lastLapMs)}`;
    }
    if (elP2Info && practice.cars[1]) {
      const c = practice.cars[1];
      elP2Info.textContent = `Modo: ${c.mode} • Pneus: ${Math.round(c.tyres)}% • ERS: ${Math.round(c.ers)}% • Última: ${formatTimeMs(c.lastLapMs)}`;
    }

    // lista + telemetria
    renderDriversList();
    updateTelemetry(now);

    requestAnimationFrame(animate);
  }

  /* ===============================
     INIT
     =============================== */
  (async function init() {
    // força estado inicial speed
    window.setSpeed(1);

    // preencher nomes/faces (antes mesmo do SVG)
    if (elP1Face) elP1Face.src = userDrivers[0].face;
    if (elP2Face) elP2Face.src = userDrivers[1].face;
    if (elP1Name) elP1Name.textContent = userDrivers[0].name;
    if (elP2Name) elP2Name.textContent = userDrivers[1].name;
    if (elP1Team) elP1Team.textContent = userDrivers[0].teamName || TEAMS[userDrivers[0].teamKey]?.name || userDrivers[0].teamKey;
    if (elP2Team) elP2Team.textContent = userDrivers[1].teamName || TEAMS[userDrivers[1].teamKey]?.name || userDrivers[1].teamKey;

    // carrega SVG
    const svg = await loadTrackSVG();
    if (!svg || !practice.pathPoints.length) return;

    // cria carros
    createCars();

    practice.ready = true;
    practice.lastNow = performance.now();
    requestAnimationFrame(animate);

    console.log("✅ practice.js inicializado (SVG + pathPoints + carros + velocidade OK)");
  })();
})();
