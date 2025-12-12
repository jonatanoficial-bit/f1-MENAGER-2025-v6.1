/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE) — v6.1
   Alinhado ao HTML real (practice.html) e SVG (assets/tracks/*.svg)

   ✔ Carrega SVG em #track-container
   ✔ Gera pathPoints a partir do PATH principal (lógica estilo qualifying)
   ✔ Carros como elementos SVG (cx/cy) => SEM desalinhamento ao redimensionar
   ✔ Velocidade realista por km/h, com variação por curva + modo + setup da oficina
   ✔ 1x / 2x / 4x com deltaTime correto (sem “supervelocidade”)
   ✔ Pit stop + modos (eco/normal/attack)
   ✔ Telemetria avançada + gráfico (canvas #telemetrySpark atualiza de verdade)
   ✔ Pilotos dinâmicos por equipe (userTeam) + faces (assets/faces/*.png)
   ========================================================= */

(() => {
  "use strict";

  /* ===============================
     BASE DE PILOTOS (ajuste livre)
     =============================== */
  const DRIVERS_2025 = [
    { id: "ver", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull", rating: 98, color: "#1e41ff", face: "assets/faces/VER.png", short: "VER" },
    { id: "per", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull", rating: 94, color: "#1e41ff", face: "assets/faces/PER.png", short: "PER" },

    { id: "lec", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#dc0000", face: "assets/faces/LEC.png", short: "LEC" },
    { id: "sai", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#dc0000", face: "assets/faces/SAI.png", short: "SAI" },

    { id: "nor", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8700", face: "assets/faces/NOR.png", short: "NOR" },
    { id: "pia", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8700", face: "assets/faces/PIA.png", short: "PIA" },

    { id: "ham", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00d2be", face: "assets/faces/HAM.png", short: "HAM" },
    { id: "rus", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00d2be", face: "assets/faces/RUS.png", short: "RUS" },

    { id: "alo", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#006f62", face: "assets/faces/ALO.png", short: "ALO" },
    { id: "str", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#006f62", face: "assets/faces/STR.png", short: "STR" },

    { id: "gas", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/GAS.png", short: "GAS" },
    { id: "oco", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff", face: "assets/faces/OCO.png", short: "OCO" },

    // SAUBER 2025 (corrigido conforme pedido)
    { id: "hul", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber", rating: 89, color: "#00ffcc", face: "assets/faces/HUL.png", short: "HUL" },
    { id: "bor", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 88, color: "#00ffcc", face: "assets/faces/BOR.png", short: "BOR" },

    { id: "tsu", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#2b4562", face: "assets/faces/TSU.png", short: "TSU" },
    { id: "law", name: "Liam Lawson", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#2b4562", face: "assets/faces/LAW.png", short: "LAW" },

    { id: "alb", name: "Alex Albon", teamKey: "williams", teamName: "Williams", rating: 89, color: "#00a0de", face: "assets/faces/ALB.png", short: "ALB" },
    { id: "sar", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 86, color: "#00a0de", face: "assets/faces/SAR.png", short: "SAR" },

    { id: "mag", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#b6babd", face: "assets/faces/MAG.png", short: "MAG" },
    { id: "bea", name: "Oliver Bearman", teamKey: "haas", teamName: "Haas", rating: 87, color: "#b6babd", face: "assets/faces/BEA.png", short: "BEA" },
  ];

  /* ===============================
     TRACK LENGTHS (km) p/ realismo
     =============================== */
  const TRACK_LENGTH_KM = {
    australia: 5.278,
    bahrain: 5.412,
    saudiarabia: 6.174,
    japan: 5.807,
    china: 5.451,
    miami: 5.412,
    imola: 4.909,
    monaco: 3.337,
    canada: 4.361,
    spain: 4.657,
    austria: 4.318,
    britain: 5.891,
    hungary: 4.381,
    belgium: 7.004,
    netherlands: 4.259,
    italy: 5.793,
    azerbaijan: 6.003,
    singapore: 4.940,
    usa: 5.513,
    mexico: 4.304,
    brazil: 4.309,
    lasvegas: 6.201,
    qatar: 5.419,
    abudhabi: 5.281,
  };

  /* ===============================
     URL PARAMS
     =============================== */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP da Austrália 2025";
  const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();

  /* ===============================
     DOM (ids reais do HTML)
     =============================== */
  const elTeamLogoTop = document.getElementById("teamLogoTop");
  const elTrackName = document.getElementById("trackName");

  const elSessionStatus = document.getElementById("sessionStatus");
  const elTimeRemaining = document.getElementById("timeRemaining");

  const elBestLapValue = document.getElementById("bestLapValue");
  const elBestLapValue2 = document.getElementById("bestLapValue2");
  const elDriversOnTrack = document.getElementById("driversOnTrack");

  const elHudLiveTag = document.getElementById("hudLiveTag");
  const elHudClock = document.getElementById("hudClock");

  const elTelemetrySource = document.getElementById("telemetrySource");
  const elTelemetryMode = document.getElementById("telemetryMode");
  const elTelemetryERS = document.getElementById("telemetryERS");

  const elTelSpeed = document.getElementById("telSpeed");
  const elBarSpeed = document.getElementById("barSpeed");
  const elTelGear = document.getElementById("telGear");
  const elTelRPM = document.getElementById("telRPM");
  const elTelG = document.getElementById("telG");

  const elTelThrottle = document.getElementById("telThrottle");
  const elBarThrottle = document.getElementById("barThrottle");
  const elTelTraction = document.getElementById("telTraction");
  const elTelGrip = document.getElementById("telGrip");

  const elTelBrake = document.getElementById("telBrake");
  const elBarBrake = document.getElementById("barBrake");
  const elTelStability = document.getElementById("telStability");
  const elTelDelta = document.getElementById("telDelta");

  const elTelTyreWear = document.getElementById("telTyreWear");
  const elBarTyre = document.getElementById("barTyre");
  const elTelTyreTemp = document.getElementById("telTyreTemp");
  const elTelTyrePress = document.getElementById("telTyrePress");

  const elTelFuel = document.getElementById("telFuel");
  const elBarFuel = document.getElementById("barFuel");
  const elTelConsumption = document.getElementById("telConsumption");
  const elTelMix = document.getElementById("telMix");

  const elTelEngineTemp = document.getElementById("telEngineTemp");
  const elBarEngine = document.getElementById("barEngine");
  const elTelERS = document.getElementById("telERS");
  const elBarERS = document.getElementById("barERS");
  const elTelStress = document.getElementById("telStress");

  const elTelS1 = document.getElementById("telS1");
  const elTelS2 = document.getElementById("telS2");
  const elTelS3 = document.getElementById("telS3");
  const elTelLap = document.getElementById("telLap");

  const elTelemetrySpark = document.getElementById("telemetrySpark");

  const elP1Face = document.getElementById("p1face");
  const elP1Name = document.getElementById("p1name");
  const elP1Team = document.getElementById("p1team");
  const elP1Info = document.getElementById("p1info");

  const elP2Face = document.getElementById("p2face");
  const elP2Name = document.getElementById("p2name");
  const elP2Team = document.getElementById("p2team");
  const elP2Info = document.getElementById("p2info");

  const btnBackLobby = document.getElementById("btnBackLobby");
  const btnGoOficina = document.getElementById("btnGoOficina");
  const btnGoQualy = document.getElementById("btnGoQualy");

  const trackContainer = document.getElementById("track-container");

  /* ===============================
     HELPERS
     =============================== */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const formatLap = (sec) => {
    if (!isFinite(sec) || sec <= 0) return "--:--.---";
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    const ss = String(Math.floor(s)).padStart(2, "0");
    const ms = String(Math.floor((s - Math.floor(s)) * 1000)).padStart(3, "0");
    return `${m}:${ss}.${ms}`;
  };

  const formatClock = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  function safeSetText(el, txt) {
    if (!el) return;
    el.textContent = txt;
  }

  function safeSetBar(el, pct) {
    if (!el) return;
    el.style.width = `${clamp(pct, 0, 100)}%`;
  }

  /* ===============================
     SETUP (OFICINA) – leitura robusta
     =============================== */
  function readSetup() {
    // tenta vários nomes (compatibilidade com versões anteriores)
    const keys = ["f1m2025_setup", "f1m2025_car_setup", "setupCarro", "carSetup"];
    let raw = null;
    for (const k of keys) {
      raw = localStorage.getItem(k);
      if (raw) break;
    }
    if (!raw) {
      return {
        asaDianteira: 6,
        asaTraseira: 6,
        pressaoPneus: 21.5,
        alturaCarro: 6,
        rigidezSuspensao: 6,
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        asaDianteira: Number(obj.asaDianteira ?? obj.frontWing ?? 6),
        asaTraseira: Number(obj.asaTraseira ?? obj.rearWing ?? 6),
        pressaoPneus: Number(obj.pressaoPneus ?? obj.tyrePressure ?? 21.5),
        alturaCarro: Number(obj.alturaCarro ?? obj.rideHeight ?? 6),
        rigidezSuspensao: Number(obj.rigidezSuspensao ?? obj.suspension ?? 6),
      };
    } catch {
      return {
        asaDianteira: 6,
        asaTraseira: 6,
        pressaoPneus: 21.5,
        alturaCarro: 6,
        rigidezSuspensao: 6,
      };
    }
  }

  function setupToFactors(setup) {
    // Escalas baseadas em comportamento “sim” (não científico, mas consistente e controlável)
    const fw = clamp(setup.asaDianteira, 1, 11);
    const rw = clamp(setup.asaTraseira, 1, 11);
    const tp = clamp(setup.pressaoPneus, 18.0, 26.0);
    const rh = clamp(setup.alturaCarro, 1, 11);
    const su = clamp(setup.rigidezSuspensao, 1, 11);

    // downforce (mais asa => mais grip, menos v.final)
    const downforce = clamp((fw + rw) / 22, 0.15, 1.0); // 0..1
    const topSpeedFactor = clamp(1.06 - downforce * 0.10, 0.92, 1.06);

    // grip por asa + suspensão
    const gripFactor = clamp(0.90 + downforce * 0.14 + (su - 6) * 0.006, 0.90, 1.10);

    // estabilidade por altura + suspensão
    const stabilityFactor = clamp(0.92 + (rh - 6) * (-0.006) + (su - 6) * 0.010, 0.85, 1.12);

    // pneus: pressão alta aquece e desgasta mais, mas reduz resistência
    const tyreWearFactor = clamp(1.0 + (tp - 21.5) * 0.03 + (1.0 - gripFactor) * 0.35, 0.75, 1.45);
    const rollingResistance = clamp(1.0 - (tp - 21.5) * 0.008, 0.92, 1.06);

    // consumo: mais drag e mais agressividade => mais consumo (o modo vai aplicar também)
    const fuelFactor = clamp(1.0 + (downforce - 0.55) * 0.10 + (1.0 - rollingResistance) * 0.20, 0.90, 1.20);

    return { topSpeedFactor, gripFactor, stabilityFactor, tyreWearFactor, fuelFactor };
  }

  /* ===============================
     PILOTOS DO USUÁRIO
     =============================== */
  function getUserDrivers(teamKey) {
    const list = DRIVERS_2025.filter(d => d.teamKey === teamKey);
    if (list.length >= 2) return list.slice(0, 2);

    // fallback: se a equipe não existir, mantém Ferrari
    return DRIVERS_2025.filter(d => d.teamKey === "ferrari").slice(0, 2);
  }

  const userDrivers = getUserDrivers(userTeam);

  /* ===============================
     HEADER / LINKS
     =============================== */
  safeSetText(elTrackName, gpName || trackKey.toUpperCase());
  safeSetText(elSessionStatus, "Treino Livre");
  safeSetText(elHudLiveTag, "LIVE");

  // Logo topo (se não existir, não quebra)
  if (elTeamLogoTop) {
    // tenta dois padrões comuns do projeto: assets/logos/*.png OU assets/teams/*.png
    const candidates = [
      `assets/logos/${userTeam}.png`,
      `assets/teams/${userTeam}.png`,
      `assets/logos/${userTeam.toUpperCase()}.png`,
      `assets/teams/${userTeam.toUpperCase()}.png`,
    ];
    let idx = 0;
    elTeamLogoTop.onerror = () => {
      idx++;
      if (idx < candidates.length) elTeamLogoTop.src = candidates[idx];
    };
    elTeamLogoTop.src = candidates[0];
    elTeamLogoTop.alt = `Logo ${userTeam}`;
  }

  if (btnBackLobby) {
    btnBackLobby.addEventListener("click", () => {
      const url = new URL("lobby.html", window.location.href);
      url.searchParams.set("userTeam", userTeam);
      window.location.href = url.toString();
    });
  }

  if (btnGoOficina) {
    btnGoOficina.addEventListener("click", () => {
      const url = new URL("oficina.html", window.location.href);
      url.searchParams.set("track", trackKey);
      url.searchParams.set("gp", gpName);
      url.searchParams.set("userTeam", userTeam);
      window.location.href = url.toString();
    });
  }

  if (btnGoQualy) {
    btnGoQualy.addEventListener("click", () => {
      const url = new URL("qualifying.html", window.location.href);
      url.searchParams.set("track", trackKey);
      url.searchParams.set("gp", gpName);
      url.searchParams.set("userTeam", userTeam);
      window.location.href = url.toString();
    });
  }

  /* ===============================
     SPEED BUTTONS (1x/2x/4x)
     =============================== */
  const speedButtons = Array.from(document.querySelectorAll("[data-speed]"));
  function setSpeedMultiplier(v) {
    state.speedMultiplier = v;
    speedButtons.forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === v));
    safeSetText(elHudLiveTag, `LIVE · ${v}x`);
  }
  speedButtons.forEach(btn => {
    btn.addEventListener("click", () => setSpeedMultiplier(Number(btn.dataset.speed || 1)));
  });

  /* ===============================
     SVG LOADER + PATHPOINTS
     =============================== */
  let svgRoot = null;
  let mainPath = null;
  let pathPoints = [];
  let curvature = []; // 0..1 (quanto mais alto, mais curva)
  let carsLayer = null;

  async function loadTrackSVG() {
    if (!trackContainer) throw new Error("track-container não encontrado no HTML.");

    const url = `assets/tracks/${trackKey}.svg`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar SVG: ${url} (${res.status})`);

    const svgText = await res.text();
    trackContainer.innerHTML = svgText;

    svgRoot = trackContainer.querySelector("svg");
    if (!svgRoot) throw new Error("SVG inválido: <svg> não encontrado.");

    // garante responsivo
    svgRoot.setAttribute("width", "100%");
    svgRoot.setAttribute("height", "100%");
    svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // encontra o PATH principal pelo maior length (mais robusto)
    const paths = Array.from(svgRoot.querySelectorAll("path"));
    if (!paths.length) throw new Error("Nenhum <path> encontrado no SVG.");

    let best = null;
    let bestLen = -1;
    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (len > bestLen) {
          bestLen = len;
          best = p;
        }
      } catch {
        // ignora path inválido
      }
    }
    if (!best) throw new Error("Não foi possível detectar o path principal da pista.");
    mainPath = best;

    // estiliza pista (mantém look: fundo preto com traço claro)
    // NÃO destrói o SVG original — apenas aplica estilo no path principal
    mainPath.style.fill = "none";
    mainPath.style.stroke = "#eaeaea";
    mainPath.style.strokeWidth = "8";
    mainPath.style.strokeLinecap = "round";
    mainPath.style.strokeLinejoin = "round";
    mainPath.style.filter = "drop-shadow(0 0 6px rgba(0,0,0,.55))";

    // cria layer para carros dentro do próprio SVG (alinhamento perfeito)
    carsLayer = svgRoot.querySelector("#cars-layer");
    if (!carsLayer) {
      carsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      carsLayer.setAttribute("id", "cars-layer");
      svgRoot.appendChild(carsLayer);
    }

    // gera pontos (densidade boa p/ 60fps)
    pathPoints = buildPathPoints(mainPath, 1400);
    curvature = buildCurvature(pathPoints);

    // expõe para debug
    window.pathPoints = pathPoints;

    safeSetText(elSessionStatus, "Treino Livre");
  }

  function buildPathPoints(pathEl, samples) {
    const len = pathEl.getTotalLength();
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const p = pathEl.getPointAtLength((i / samples) * len);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  function buildCurvature(pts) {
    const curv = new Array(pts.length).fill(0);
    for (let i = 2; i < pts.length - 2; i++) {
      const a = pts[i - 2], b = pts[i], c = pts[i + 2];
      const abx = b.x - a.x, aby = b.y - a.y;
      const bcx = c.x - b.x, bcy = c.y - b.y;
      const ab = Math.hypot(abx, aby) || 1;
      const bc = Math.hypot(bcx, bcy) || 1;

      const dot = (abx * bcx + aby * bcy) / (ab * bc);
      const ang = Math.acos(clamp(dot, -1, 1)); // 0 reto, ~pi curva forte
      const norm = clamp(ang / 2.6, 0, 1); // normaliza
      curv[i] = norm;
    }
    // suaviza
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i < curv.length - 1; i++) {
        curv[i] = (curv[i - 1] + curv[i] + curv[i + 1]) / 3;
      }
    }
    return curv;
  }

  /* ===============================
     STATE
     =============================== */
  const state = {
    running: true,
    speedMultiplier: 1,

    sessionSeconds: 60 * 60, // 60:00
    lastFrame: performance.now(),

    trackLengthKm: TRACK_LENGTH_KM[trackKey] || 5.0,

    // cars
    cars: [],
    telemetryTargetIndex: 0, // 0 = carro 1, 1 = carro 2

    // sparkline
    spark: {
      buf: new Array(180).fill(0),
      idx: 0
    }
  };

  /* ===============================
     CAR FACTORY (SVG circle)
     =============================== */
  function createCar(driver, slotIndex) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "9");
    circle.setAttribute("fill", driver.color);
    circle.setAttribute("stroke", "#000");
    circle.setAttribute("stroke-width", "2");
    circle.style.filter = "drop-shadow(0 0 6px rgba(0,0,0,.55))";
    carsLayer.appendChild(circle);

    // base top speed km/h (prática: ~260–330 conforme curva/mode/setup)
    const baseTop = 290 + (driver.rating - 88) * 2.2; // rating 88->290 / 98->312 aprox
    // base pace multipliers
    const baseGrip = 0.92 + (driver.rating - 88) * 0.006;

    return {
      slot: slotIndex, // 1 ou 2
      driver,
      el: circle,

      mode: "normal", // eco|normal|attack
      ers: 0.90,       // 0..1
      fuel: 1.00,      // 0..1
      tyreWear: 0.06,  // 0..1 (quanto maior, pior)
      tyreTemp: 88,    // °C
      tyrePress: 22.0, // PSI

      engineTemp: 92,  // °C
      stress: 12,      // 0..200

      progress: slotIndex === 1 ? 0.10 : 0.13, // start separado
      lapStart: performance.now(),
      lastLap: 0,
      bestLap: 0,

      // telemetria instantânea
      speedKmh: 0,
      rpm: 0,
      gear: 1,
      gforce: 0,
      throttle: 0,
      brake: 0,
      traction: 0,
      grip: 0,
      stability: 0,
      delta: 0,

      // performance base
      baseTopSpeedKmh: baseTop,
      baseGrip,

      // setores (simulado por progress)
      s1: 0, s2: 0, s3: 0,
      s1t: 0, s2t: 0, s3t: 0,
    };
  }

  /* ===============================
     USER CARDS (faces/names)
     =============================== */
  function applyUserCards() {
    const d1 = state.cars[0]?.driver || userDrivers[0];
    const d2 = state.cars[1]?.driver || userDrivers[1];

    if (elP1Face) elP1Face.src = d1?.face || "";
    if (elP2Face) elP2Face.src = d2?.face || "";

    safeSetText(elP1Name, d1?.name || "Piloto 1");
    safeSetText(elP2Name, d2?.name || "Piloto 2");

    safeSetText(elP1Team, d1?.teamName || userTeam);
    safeSetText(elP2Team, d2?.teamName || userTeam);

    // fallback de imagem (não quebra layout)
    const fallback = "assets/ui/driver_placeholder.png";
    if (elP1Face) elP1Face.onerror = () => { elP1Face.src = fallback; };
    if (elP2Face) elP2Face.onerror = () => { elP2Face.src = fallback; };
  }

  /* ===============================
     GLOBAL FUNCS (HTML onclick)
     =============================== */
  window.setMode = (slot, mode) => {
    const car = state.cars.find(c => c.slot === Number(slot));
    if (!car) return;
    car.mode = mode === "eco" ? "eco" : (mode === "attack" ? "attack" : "normal");
  };

  window.pitStop = (slot) => {
    const car = state.cars.find(c => c.slot === Number(slot));
    if (!car) return;

    // pit: recupera pneus/temperatura/ers, custa tempo (simulado por queda instantânea de progress)
    car.tyreWear = clamp(car.tyreWear - 0.20, 0.02, 0.85);
    car.tyreTemp = clamp(car.tyreTemp - 10, 75, 115);
    car.ers = clamp(car.ers + 0.35, 0, 1);
    car.fuel = clamp(car.fuel + 0.08, 0, 1);

    // “tempo de pit” (sem pit lane completo aqui): perde posição no traçado um pouco
    car.progress = (car.progress + 0.02) % 1;
  };

  /* ===============================
     TELEMETRY TARGET (clique nos cards)
     =============================== */
  function hookTelemetryTarget() {
    const card1 = document.getElementById("p1name")?.closest(".practice-user-card") || null;
    const card2 = document.getElementById("p2name")?.closest(".practice-user-card") || null;

    if (card1) card1.addEventListener("click", () => state.telemetryTargetIndex = 0);
    if (card2) card2.addEventListener("click", () => state.telemetryTargetIndex = 1);
  }

  /* ===============================
     SIM: SPEED MODEL (realista)
     =============================== */
  function modeFactors(mode) {
    if (mode === "eco") return { pace: 0.90, wear: 0.85, fuel: 0.88, ersUse: 0.60 };
    if (mode === "attack") return { pace: 1.05, wear: 1.25, fuel: 1.18, ersUse: 1.25 };
    return { pace: 1.00, wear: 1.00, fuel: 1.00, ersUse: 1.00 };
  }

  function computeInstantSpeed(car, idx, setupFactors) {
    // severidade de curva em idx
    const turn = curvature[idx] || 0; // 0..1
    // em curvas fortes, speed cai até ~65% dependendo do grip/stability
    const cornerFloor = clamp(0.60 + (setupFactors.gripFactor - 1.0) * 0.10 + (car.baseGrip - 1.0) * 0.10, 0.58, 0.72);
    const cornerFactor = lerp(1.0, cornerFloor, turn);

    const mf = modeFactors(car.mode);

    // ERS: reduz gradualmente conforme uso; ataca mais => usa mais
    const ersBoost = car.ers > 0.15 ? (0.015 * mf.ersUse) : 0; // +1.5% aprox se tiver energia
    const tyrePenalty = clamp(1.0 - car.tyreWear * 0.22, 0.78, 1.0);
    const enginePenalty = clamp(1.0 - (car.stress / 220) * 0.10, 0.86, 1.0);

    const top = car.baseTopSpeedKmh * setupFactors.topSpeedFactor * mf.pace * tyrePenalty * enginePenalty * (1 + ersBoost);
    const v = top * cornerFactor;

    // limita teto por pista (prática: Albert Park ~ 330 km/h)
    const cap = (trackKey === "australia") ? 332 : 340;
    return clamp(v, 110, cap);
  }

  function speedKmhToProgressPerSec(speedKmh) {
    const ms = speedKmh / 3.6;
    const trackM = (state.trackLengthKm || 5.0) * 1000;
    return ms / trackM; // fração de volta por segundo
  }

  /* ===============================
     TELEMETRY: SPARKLINE
     =============================== */
  function pushSpark(value01) {
    const s = state.spark;
    s.buf[s.idx] = clamp(value01, 0, 1);
    s.idx = (s.idx + 1) % s.buf.length;
  }

  function drawSpark() {
    if (!elTelemetrySpark) return;
    const ctx = elTelemetrySpark.getContext("2d");
    if (!ctx) return;

    const w = elTelemetrySpark.width;
    const h = elTelemetrySpark.height;

    ctx.clearRect(0, 0, w, h);

    // fundo leve
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, w, h);

    // linha
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,210,255,0.95)";
    ctx.beginPath();

    const buf = state.spark.buf;
    const n = buf.length;
    const start = state.spark.idx; // desenha do mais antigo pro mais novo

    for (let i = 0; i < n; i++) {
      const v = buf[(start + i) % n];
      const x = (i / (n - 1)) * w;
      const y = h - (v * (h * 0.82) + h * 0.09);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // baseline
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(0, h - 1);
    ctx.lineTo(w, h - 1);
    ctx.stroke();
  }

  /* ===============================
     UI UPDATES
     =============================== */
  function updateSessionClock() {
    const txt = formatClock(state.sessionSeconds);
    safeSetText(elTimeRemaining, txt);
    safeSetText(elHudClock, txt);
  }

  function updateRankingPanel() {
    if (!elDriversOnTrack) return;

    const sorted = [...state.cars].sort((a, b) => {
      const la = a.bestLap > 0 ? a.bestLap : 9999;
      const lb = b.bestLap > 0 ? b.bestLap : 9999;
      return la - lb;
    });

    const best = sorted[0]?.bestLap || 0;
    safeSetText(elBestLapValue, formatLap(best));
    safeSetText(elBestLapValue2, formatLap(best));

    const html = sorted.map((c, i) => {
      const lap = (c.bestLap > 0) ? formatLap(c.bestLap) : "--:--.---";
      const v = Math.round(c.speedKmh || 0);
      const dot = `<span class="dot" style="background:${c.driver.color}"></span>`;
      return `
        <div class="practice-row">
          <div class="pos">${i + 1}</div>
          <div class="who">${dot}<div class="nm">${c.driver.name}</div><div class="tm">${c.driver.teamName} · ${c.mode.toUpperCase()}</div></div>
          <div class="meta">V${v} · ${lap}</div>
        </div>
      `;
    }).join("");

    elDriversOnTrack.innerHTML = html;
  }

  function updateUserCards() {
    const c1 = state.cars[0];
    const c2 = state.cars[1];
    if (!c1 || !c2) return;

    const t1 = (c1.lastLap > 0) ? formatLap(c1.lastLap) : "--:--.---";
    const t2 = (c2.lastLap > 0) ? formatLap(c2.lastLap) : "--:--.---";

    safeSetText(elP1Info, `Modo: ${c1.mode.toUpperCase()} · Pneus: ${Math.round((1 - c1.tyreWear) * 100)}% · ERS: ${Math.round(c1.ers * 100)}% · Última: ${t1}`);
    safeSetText(elP2Info, `Modo: ${c2.mode.toUpperCase()} · Pneus: ${Math.round((1 - c2.tyreWear) * 100)}% · ERS: ${Math.round(c2.ers * 100)}% · Última: ${t2}`);
  }

  function updateTelemetry() {
    const car = state.cars[state.telemetryTargetIndex] || state.cars[0];
    if (!car) return;

    safeSetText(elTelemetrySource, car.driver.name);
    safeSetText(elTelemetryMode, car.mode.toUpperCase());
    safeSetText(elTelemetryERS, `${Math.round(car.ers * 100)}%`);

    safeSetText(elTelSpeed, `${Math.round(car.speedKmh)} km/h`);
    safeSetBar(elBarSpeed, (car.speedKmh / 340) * 100);

    safeSetText(elTelGear, String(car.gear));
    safeSetText(elTelRPM, String(Math.round(car.rpm)));
    safeSetText(elTelG, String(car.gforce.toFixed(0)));

    safeSetText(elTelThrottle, `${Math.round(car.throttle)}%`);
    safeSetBar(elBarThrottle, car.throttle);

    safeSetText(elTelBrake, `${Math.round(car.brake)}%`);
    safeSetBar(elBarBrake, car.brake);

    safeSetText(elTelTraction, String(Math.round(car.traction)));
    safeSetText(elTelGrip, String(Math.round(car.grip)));

    safeSetText(elTelStability, String(Math.round(car.stability)));
    safeSetText(elTelDelta, (car.delta >= 0 ? "+" : "") + car.delta.toFixed(1));

    safeSetText(elTelTyreWear, `${Math.round((1 - car.tyreWear) * 100)}%`);
    safeSetBar(elBarTyre, (1 - car.tyreWear) * 100);

    safeSetText(elTelTyreTemp, `${Math.round(car.tyreTemp)}°C`);
    safeSetText(elTelTyrePress, `${car.tyrePress.toFixed(1)}`);

    safeSetText(elTelFuel, `${Math.round(car.fuel * 100)}%`);
    safeSetBar(elBarFuel, car.fuel * 100);

    safeSetText(elTelConsumption, car.mode === "attack" ? "ALTO" : (car.mode === "eco" ? "BAIXO" : "MÉDIO"));
    safeSetText(elTelMix, car.mode === "attack" ? "RICH" : (car.mode === "eco" ? "LEAN" : "STD"));

    safeSetText(elTelEngineTemp, `${Math.round(car.engineTemp)}°C`);
    safeSetBar(elBarEngine, clamp((car.engineTemp - 70) / 60, 0, 1) * 100);

    safeSetText(elTelERS, `${Math.round(car.ers * 100)}%`);
    safeSetBar(elBarERS, car.ers * 100);

    safeSetText(elTelStress, String(Math.round(car.stress)));

    safeSetText(elTelS1, car.s1t > 0 ? formatLap(car.s1t) : "--:--.---");
    safeSetText(elTelS2, car.s2t > 0 ? formatLap(car.s2t) : "--:--.---");
    safeSetText(elTelS3, car.s3t > 0 ? formatLap(car.s3t) : "--:--.---");
    safeSetText(elTelLap, car.lastLap > 0 ? formatLap(car.lastLap) : "--:--.---");

    // sparkline: usa speed normalizada
    pushSpark(car.speedKmh / 340);
    drawSpark();
  }

  /* ===============================
     MAIN LOOP
     =============================== */
  function tick(now) {
    const dt = (now - state.lastFrame) / 1000;
    state.lastFrame = now;

    const simDt = dt * state.speedMultiplier;

    if (state.running) {
      state.sessionSeconds -= simDt;
      if (state.sessionSeconds <= 0) {
        state.sessionSeconds = 0;
        state.running = false;
      }
    }

    // setup influences
    const setup = readSetup();
    const setupFactors = setupToFactors(setup);

    // move cars
    for (const car of state.cars) {
      const idx = Math.floor(car.progress * pathPoints.length) % pathPoints.length;

      // speed model
      const v = computeInstantSpeed(car, idx, setupFactors);
      car.speedKmh = v;

      // throttle/brake from curvature
      const turn = curvature[idx] || 0;
      car.throttle = clamp(92 - turn * 70 + (car.mode === "attack" ? 8 : car.mode === "eco" ? -10 : 0), 0, 100);
      car.brake = clamp(turn * 55 + (car.mode === "attack" ? 5 : 0), 0, 100);

      // gear/rpm (aprox)
      const gear = clamp(Math.floor(v / 55) + 1, 1, 8);
      car.gear = gear;
      car.rpm = clamp(8000 + (v / 340) * 4500 + turn * 1200, 7000, 12900);
      car.gforce = clamp(2 + turn * 6 + (car.mode === "attack" ? 0.7 : 0), 1, 8);

      // grip/traction/stability (0..100)
      car.grip = clamp(80 + (setupFactors.gripFactor - 1) * 120 - car.tyreWear * 40, 40, 100);
      car.traction = clamp(75 + (setupFactors.gripFactor - 1) * 110 - turn * 10 - car.tyreWear * 35, 35, 100);
      car.stability = clamp(78 + (setupFactors.stabilityFactor - 1) * 120 - turn * 12 - car.tyreWear * 25, 35, 100);

      // delta (sim): negativo é melhor
      const ideal = 305 - (turn * 95);
      car.delta = clamp((ideal - v) / 35, -2.5, 3.5);

      // desgaste / combustível / ERS / temperatura / stress
      const mf = modeFactors(car.mode);

      // consumo e desgaste por simDt (ajustado p/ não explodir)
      const wearRate = (0.000030 * mf.wear) * setupFactors.tyreWearFactor * (1 + turn * 0.9);
      car.tyreWear = clamp(car.tyreWear + wearRate * simDt * 60, 0.01, 0.98); // *60 para ficar “vivo” em 60min

      const fuelRate = (0.000018 * mf.fuel) * setupFactors.fuelFactor * (1 + (v / 340) * 0.4);
      car.fuel = clamp(car.fuel - fuelRate * simDt * 60, 0, 1);

      const ersDrain = (0.000030 * mf.ersUse) * (v / 340);
      car.ers = clamp(car.ers - ersDrain * simDt * 60, 0, 1);

      // temperaturas (alvo ~90–105)
      car.tyreTemp = clamp(car.tyreTemp + (turn * 0.18 + (car.mode === "attack" ? 0.10 : -0.03)) * simDt * 60, 72, 118);
      car.tyrePress = clamp(21.5 + (car.tyreTemp - 88) * 0.035, 20.0, 25.5);

      car.engineTemp = clamp(car.engineTemp + ((car.mode === "attack" ? 0.18 : 0.05) + (v / 340) * 0.10) * simDt * 60, 78, 122);

      // stress: se motor quente e attack, sobe; se eco, desce
      const stressUp = (car.engineTemp > 110 ? 0.30 : 0.10) + (car.mode === "attack" ? 0.25 : 0.05);
      const stressDown = (car.mode === "eco" ? 0.35 : 0.10);
      car.stress = clamp(car.stress + (stressUp - stressDown) * simDt * 6, 0, 220);

      // progresso (fração de volta por segundo)
      const dProg = speedKmhToProgressPerSec(v) * simDt;
      car.progress += dProg;

      // setorização (sim por progress)
      // 0.0–0.33 s1, 0.33–0.66 s2, 0.66–1.0 s3
      if (car.progress >= 1) {
        car.progress -= 1;

        const lapSec = (now - car.lapStart) / 1000;
        car.lapStart = now;
        car.lastLap = lapSec;
        if (!car.bestLap || lapSec < car.bestLap) car.bestLap = lapSec;

        // setores (aprox por fração)
        if (car.s1 > 0 && car.s2 > 0 && car.s3 > 0) {
          car.s1t = car.s1;
          car.s2t = car.s2;
          car.s3t = car.s3;
        }
        car.s1 = 0; car.s2 = 0; car.s3 = 0;
      } else {
        const prog = car.progress % 1;
        const lapElapsed = (now - car.lapStart) / 1000;
        if (prog < 0.33) car.s1 = lapElapsed;
        else if (prog < 0.66) car.s2 = lapElapsed - car.s1;
        else car.s3 = lapElapsed - car.s1 - car.s2;
      }

      // posiciona no SVG
      const p = pathPoints[idx];
      if (p) {
        car.el.setAttribute("cx", String(p.x));
        car.el.setAttribute("cy", String(p.y));
      }
    }

    // UI
    updateSessionClock();
    updateRankingPanel();
    updateUserCards();
    updateTelemetry();

    requestAnimationFrame(tick);
  }

  /* ===============================
     INIT
     =============================== */
  async function init() {
    try {
      safeSetText(elSessionStatus, "Carregando...");
      safeSetText(elTrackName, gpName || `GP ${trackKey}`);

      await loadTrackSVG();

      // cria carros com pilotos corretos da equipe escolhida
      state.cars = [
        createCar(userDrivers[0], 1),
        createCar(userDrivers[1], 2),
      ];

      applyUserCards();
      hookTelemetryTarget();

      // velocidade inicial 1x
      setSpeedMultiplier(1);

      // start
      state.lastFrame = performance.now();
      requestAnimationFrame(tick);

      console.log("✅ practice.js inicializado (SVG + pathPoints + carros + velocidade OK)");
    } catch (err) {
      console.error(err);
      safeSetText(elSessionStatus, "ERRO ao carregar treino livre");
    }
  }

  init();
})();
