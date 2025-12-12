/* ==========================================================
   F1 MANAGER 2025 — PRACTICE.JS (Treino Livre) — v6.1
   - SVG + pathPoints (mesma lógica base de qualifying/race)
   - requestAnimationFrame com deltaTime real
   - Velocidade 1x / 2x / 4x funcionando (clock + carros + telemetria)
   - Pilotos corretos por equipe (userTeam)
   - Telemetria avançada (preenche painéis existentes, por IDs comuns)
   - Integração com Oficina via localStorage (modificadores reais)
   ========================================================== */

(() => {
  "use strict";

  /* ===========================
     URL PARAMS
     =========================== */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP da Austrália 2025";
  const userTeamKey = (params.get("userTeam") || "ferrari").toLowerCase();

  /* ===========================
     HELPERS
     =========================== */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  // tenta vários seletores/IDs (para não depender de um único HTML)
  function pickEl(selectors) {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }
  function setText(selectors, text) {
    const el = pickEl(selectors);
    if (el) el.textContent = text;
  }
  function setHTML(selectors, html) {
    const el = pickEl(selectors);
    if (el) el.innerHTML = html;
  }
  function setBar(selectors, pct01) {
    const el = pickEl(selectors);
    if (!el) return;
    const pct = clamp(pct01, 0, 1) * 100;
    el.style.width = pct.toFixed(1) + "%";
  }

  function fmtMMSS(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  function fmtLap(ms) {
    if (!isFinite(ms) || ms <= 0) return "--:--.---";
    const total = Math.floor(ms);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const millis  = total % 1000;
    return `${minutes}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
  }

  /* ===========================
     DRIVER DATA (baseado na estrutura do qualifying/race)
     - IMPORTANTÍSSIMO: faces em assets/faces/COD.png
     - logos em assets/logos/team.png (ajuste se seu repo usar assets/teams/)
     =========================== */
  const TEAM_META = {
    redbull:     { name:"Red Bull",      color:"#1e41ff", logo:"assets/logos/redbull.png" },
    ferrari:     { name:"Ferrari",       color:"#dc0000", logo:"assets/logos/ferrari.png" },
    mercedes:    { name:"Mercedes",      color:"#00d2be", logo:"assets/logos/mercedes.png" },
    mclaren:     { name:"McLaren",       color:"#ff8700", logo:"assets/logos/mclaren.png" },
    aston:       { name:"Aston Martin",  color:"#006f62", logo:"assets/logos/aston.png" },
    alpine:      { name:"Alpine",        color:"#0090ff", logo:"assets/logos/alpine.png" },
    racingbulls: { name:"Racing Bulls",  color:"#2b4562", logo:"assets/logos/racingbulls.png" },
    williams:    { name:"Williams",      color:"#005aff", logo:"assets/logos/williams.png" },
    haas:        { name:"Haas",          color:"#b6babd", logo:"assets/logos/haas.png" },
    sauber:      { name:"Sauber",        color:"#00e676", logo:"assets/logos/sauber.png" },
  };

  // OBS: você pediu Bortoleto na Sauber 2025 (e não Bottas).
  // Se o arquivo de face dele for diferente de BOR.png, ajuste o code abaixo.
  const DRIVERS_2025 = [
    { id:"verstappen", code:"VER", name:"Max Verstappen", teamKey:"redbull", rating:98 },
    { id:"perez",      code:"PER", name:"Sergio Pérez",   teamKey:"redbull", rating:92 },

    { id:"leclerc",    code:"LEC", name:"Charles Leclerc",teamKey:"ferrari", rating:95 },
    { id:"sainz",      code:"SAI", name:"Carlos Sainz",   teamKey:"ferrari", rating:93 },

    { id:"hamilton",   code:"HAM", name:"Lewis Hamilton", teamKey:"mercedes",rating:95 },
    { id:"russell",    code:"RUS", name:"George Russell", teamKey:"mercedes",rating:93 },

    { id:"norris",     code:"NOR", name:"Lando Norris",   teamKey:"mclaren", rating:94 },
    { id:"piastri",    code:"PIA", name:"Oscar Piastri",  teamKey:"mclaren", rating:92 },

    { id:"alonso",     code:"ALO", name:"Fernando Alonso",teamKey:"aston",   rating:90 },
    { id:"stroll",     code:"STR", name:"Lance Stroll",   teamKey:"aston",   rating:86 },

    { id:"gasly",      code:"GAS", name:"Pierre Gasly",   teamKey:"alpine",  rating:89 },
    { id:"ocon",       code:"OCO", name:"Esteban Ocon",   teamKey:"alpine",  rating:88 },

    { id:"tsunoda",    code:"TSU", name:"Yuki Tsunoda",   teamKey:"racingbulls", rating:88 },
    { id:"lawson",     code:"LAW", name:"Liam Lawson",    teamKey:"racingbulls", rating:87 },

    { id:"albon",      code:"ALB", name:"Alex Albon",     teamKey:"williams",rating:88 },
    { id:"sargeant",   code:"SAR", name:"Logan Sargeant", teamKey:"williams",rating:84 },

    { id:"hulkenberg", code:"HUL", name:"Nico Hülkenberg",teamKey:"sauber",  rating:86 },
    { id:"bortoleto",  code:"BOR", name:"Gabriel Bortoleto", teamKey:"sauber",rating:84 },

    { id:"magnussen",  code:"MAG", name:"Kevin Magnussen",teamKey:"haas",    rating:85 },
    { id:"bearman",    code:"BEA", name:"Oliver Bearman", teamKey:"haas",    rating:83 },
  ].map(d => ({
    ...d,
    teamName: TEAM_META[d.teamKey]?.name || d.teamKey,
    color: TEAM_META[d.teamKey]?.color || "#ffffff",
    face: `assets/faces/${d.code}.png`,
    logo: TEAM_META[d.teamKey]?.logo || "assets/logos/ferrari.png",
  }));

  function getTeamDrivers(teamKey) {
    const list = DRIVERS_2025.filter(d => d.teamKey === teamKey);
    if (list.length >= 2) return [list[0], list[1]];
    // fallback: se algo estiver faltando, pega 2 quaisquer para não quebrar
    return [DRIVERS_2025[0], DRIVERS_2025[1]];
  }

  /* ===========================
     OFICINA / SETUP (localStorage)
     - lê múltiplas chaves possíveis
     - converte sliders em modificadores consistentes
     =========================== */
  function readSetupRaw() {
    const keysToTry = [
      "f1m2025_setup",
      "f1m2025_setupData",
      "setupData",
      "carSetup",
      `setup_${userTeamKey}`,
      `f1m2025_setup_${userTeamKey}`
    ];
    for (const k of keysToTry) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try { return JSON.parse(raw); } catch (_) {}
    }
    return null;
  }

  // Normaliza sliders da oficina (0..100 ou 0..10 etc.)
  function normalizeSetup(raw) {
    const s = raw || {};
    // tenta nomes comuns
    const fw = Number(s.frontWing ?? s.asaDianteira ?? s.asa_dianteira ?? 50);
    const rw = Number(s.rearWing  ?? s.asaTraseira  ?? s.asa_traseira  ?? 50);
    const tp = Number(s.tyrePressure ?? s.pressaoPneus ?? s.pressao_pneus ?? 50);
    const rh = Number(s.rideHeight ?? s.alturaCarro ?? s.altura_carro ?? 50);
    const su = Number(s.suspension ?? s.rigidezSuspensao ?? s.rigidez_suspensao ?? 50);

    // converte para 0..1
    const n = {
      frontWing: clamp(fw / 100, 0, 1),
      rearWing:  clamp(rw / 100, 0, 1),
      tyrePress: clamp(tp / 100, 0, 1),
      rideH:     clamp(rh / 100, 0, 1),
      susp:      clamp(su / 100, 0, 1),
    };

    // modelo “telemetria plausível”:
    // - asas ↑ => downforce ↑, topSpeed ↓, desgaste ↓/↑ depende de arrasto
    // - pressão ↑ => temp ↓ um pouco, mas grip ↓ e desgaste ↑ (muito alta)
    // - altura ↑ => estabilidade ↑ em zebras, mas downforce ↓
    // - suspensão ↑ => resposta ↑, mas pneus sofrem em irregularidade
    const aero = lerp(0.80, 1.10, (n.frontWing * 0.5 + n.rearWing * 0.5));         // 0.80..1.10
    const drag = lerp(0.90, 1.10, (n.frontWing * 0.55 + n.rearWing * 0.45));       // 0.90..1.10
    const mechGrip = lerp(0.92, 1.06, 1 - Math.abs(n.tyrePress - 0.55) * 2);       // melhor perto de ~0.55
    const stability = lerp(0.92, 1.05, (1 - n.rideH) * 0.25 + (1 - n.susp) * 0.25 + 0.5); // suave
    const tyreWear = lerp(0.90, 1.15, Math.abs(n.tyrePress - 0.55) * 1.6 + (n.susp - 0.5) * 0.25 + (drag - 1) * 0.35);

    // top speed e consumo (drag afeta tudo)
    const topSpeed = 1 / drag;         // 0.91..1.11 aprox
    const fuelUse  = lerp(0.92, 1.14, (drag - 0.9) / 0.2); // 0.92..1.14 aprox

    return {
      raw: s,
      aero, drag, mechGrip, stability, tyreWear,
      topSpeed, fuelUse
    };
  }

  /* ===========================
     STATE
     =========================== */
  const TEAM = TEAM_META[userTeamKey] || TEAM_META.ferrari;
  const [userDriver1, userDriver2] = getTeamDrivers(userTeamKey);

  const state = {
    trackKey,
    gpName,
    userTeamKey,
    sessionTotalSec: 60 * 60,              // 60:00
    sessionRemainingSec: 60 * 60,
    speedMultiplier: 1,                    // 1x/2x/4x (afeta tudo no TL)
    running: true,
    lastTs: null,

    pathPoints: [],
    svgReady: false,

    setup: normalizeSetup(readSetupRaw()),

    // dois carros do usuário (treino)
    cars: [
      makeCar(userDriver1, 0.05),
      makeCar(userDriver2, 0.09),
    ],

    // telemetria “fonte” (carro focado)
    telemetryFocusIdx: 0,

    bestLapMs: Infinity,
    bestLapDriver: null,
  };

  function makeCar(driver, startProgress) {
    return {
      driver,
      progress: startProgress,         // 0..1
      speed01: 0.0,                    // 0..1 (velocidade relativa)
      throttle: 0.0,
      brake: 0.0,
      rpm: 9000,
      gear: 1,
      g: 0.8,

      tyresPct: 1.0,
      tyreTempC: 90,
      tyrePressPsi: 23.0,

      fuelPct: 1.0,

      engineTempC: 98,
      ersPct: 1.0,
      ersMode: "STD",                 // STD/BOOST
      mode: "NORMAL",                 // ECON/ATTACK/NORMAL

      lapStartTs: performance.now(),
      lastLapMs: 0,
      lastLapShownMs: 0,
      laps: 0,

      // variações
      rng: Math.random() * 9999,
    };
  }

  /* ===========================
     DOM HOOKS (tolerante)
     =========================== */
  function hydrateHeader() {
    setText(["#gpTitle", ".gpTitle", "#gpName"], state.gpName);
    setText(["#trackTitle", ".trackTitle", "#trackName"], (state.trackKey || "").toUpperCase());

    // logo topo (se existir)
    const logoEl = pickEl(["#teamLogoTop", "#teamLogo", ".teamLogo", ".topLogo img"]);
    if (logoEl && logoEl.tagName === "IMG") logoEl.src = TEAM.logo;
    if (logoEl && logoEl.tagName !== "IMG") {
      // se for div, tenta setar background
      logoEl.style.backgroundImage = `url("${TEAM.logo}")`;
    }

    // nomes nos cards (se existirem)
    setText(["#pilot1Name", "#p1Name", ".p1Name"], userDriver1.name);
    setText(["#pilot2Name", "#p2Name", ".p2Name"], userDriver2.name);

    // faces nos cards (se existirem)
    const p1Face = pickEl(["#pilot1Face", "#p1Face", ".p1Face img", ".pilotCard[data-pilot='1'] img"]);
    const p2Face = pickEl(["#pilot2Face", "#p2Face", ".p2Face img", ".pilotCard[data-pilot='2'] img"]);

    if (p1Face && p1Face.tagName === "IMG") p1Face.src = userDriver1.face;
    if (p2Face && p2Face.tagName === "IMG") p2Face.src = userDriver2.face;

    // se o HTML usar background-image
    const p1FaceBg = pickEl([".pilotFace.p1", ".pilotFace[data-pilot='1']"]);
    const p2FaceBg = pickEl([".pilotFace.p2", ".pilotFace[data-pilot='2']"]);
    if (p1FaceBg) p1FaceBg.style.backgroundImage = `url("${userDriver1.face}")`;
    if (p2FaceBg) p2FaceBg.style.backgroundImage = `url("${userDriver2.face}")`;
  }

  function bindButtons() {
    // velocidade
    const btn1 = pickEl(["#btnSpeed1", "#speed1", ".speed1", "button[data-speed='1']"]);
    const btn2 = pickEl(["#btnSpeed2", "#speed2", ".speed2", "button[data-speed='2']"]);
    const btn4 = pickEl(["#btnSpeed4", "#speed4", ".speed4", "button[data-speed='4']"]);

    const setSpeed = (m) => {
      state.speedMultiplier = m;
      setText(["#liveSpeedLabel", "#speedLabel", ".liveSpeed"], `LIVE • ${m}X`);
      // feedback visual (se seus botões tiverem classe 'active')
      [btn1, btn2, btn4].forEach(b => b && b.classList.remove("active"));
      if (m === 1 && btn1) btn1.classList.add("active");
      if (m === 2 && btn2) btn2.classList.add("active");
      if (m === 4 && btn4) btn4.classList.add("active");
    };

    if (btn1) btn1.addEventListener("click", () => setSpeed(1));
    if (btn2) btn2.addEventListener("click", () => setSpeed(2));
    if (btn4) btn4.addEventListener("click", () => setSpeed(4));

    // modo piloto (se existir em botões PIT/ECON/ATAQUE já no card)
    const bindMode = (carIdx, mode) => {
      const car = state.cars[carIdx];
      car.mode = mode;
      // ECON reduz ritmo, ATK aumenta
      if (mode === "ECONOMIZAR") car.ersMode = "STD";
      if (mode === "ATAQUE") car.ersMode = "BOOST";
      refreshPilotCards();
    };

    const p1Pit = pickEl(["#p1Pit", ".p1Pit", "button[data-pilot='1'][data-action='pit']"]);
    const p2Pit = pickEl(["#p2Pit", ".p2Pit", "button[data-pilot='2'][data-action='pit']"]);
    if (p1Pit) p1Pit.addEventListener("click", () => doPit(0));
    if (p2Pit) p2Pit.addEventListener("click", () => doPit(1));

    const p1Econ = pickEl(["#p1Econ", ".p1Econ", "button[data-pilot='1'][data-action='econ']"]);
    const p2Econ = pickEl(["#p2Econ", ".p2Econ", "button[data-pilot='2'][data-action='econ']"]);
    if (p1Econ) p1Econ.addEventListener("click", () => bindMode(0, "ECONOMIZAR"));
    if (p2Econ) p2Econ.addEventListener("click", () => bindMode(1, "ECONOMIZAR"));

    const p1Atk = pickEl(["#p1Atk", ".p1Atk", "button[data-pilot='1'][data-action='attack']"]);
    const p2Atk = pickEl(["#p2Atk", ".p2Atk", "button[data-pilot='2'][data-action='attack']"]);
    if (p1Atk) p1Atk.addEventListener("click", () => bindMode(0, "ATAQUE"));
    if (p2Atk) p2Atk.addEventListener("click", () => bindMode(1, "ATAQUE"));

    // navegação
    const btnOffice = pickEl(["#btnOffice", "#goOffice", ".goOffice", "button[data-nav='office']"]);
    const btnQualy  = pickEl(["#btnGoQualy", "#goQualy", ".goQualy", "button[data-nav='qualy']"]);
    const btnLobby  = pickEl(["#btnBackLobby", "#backLobby", ".backLobby", "button[data-nav='lobby']"]);

    if (btnOffice) btnOffice.addEventListener("click", () => {
      // volta depois para practice
      const url = `oficina.html?track=${encodeURIComponent(trackKey)}&gp=${encodeURIComponent(gpName)}&userTeam=${encodeURIComponent(userTeamKey)}&return=practice`;
      window.location.href = url;
    });

    if (btnQualy) btnQualy.addEventListener("click", () => {
      const url = `qualifying.html?track=${encodeURIComponent(trackKey)}&gp=${encodeURIComponent(gpName)}&userTeam=${encodeURIComponent(userTeamKey)}`;
      window.location.href = url;
    });

    if (btnLobby) btnLobby.addEventListener("click", () => {
      window.location.href = "lobby.html";
    });

    // clique na telemetria para alternar foco (se existir área grande)
    const tlmArea = pickEl(["#telemetryPanel", ".telemetryPanel", ".telemetry"]);
    if (tlmArea) {
      tlmArea.addEventListener("click", () => {
        state.telemetryFocusIdx = (state.telemetryFocusIdx + 1) % state.cars.length;
      });
    }

    // default label
    setText(["#liveSpeedLabel", "#speedLabel", ".liveSpeed"], "LIVE • 1X");
  }

  /* ===========================
     SVG + PATH POINTS
     =========================== */
  async function loadTrackSVG() {
    const container = pickEl(["#trackContainer", "#svgContainer", ".trackContainer", ".mapContainer"]);
    if (!container) {
      console.warn("[practice] Container do SVG não encontrado.");
      return;
    }

    const url = `assets/tracks/${trackKey}.svg`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();
      container.innerHTML = svgText;

      // tenta achar um path principal
      const svg = container.querySelector("svg");
      if (!svg) throw new Error("SVG não encontrado após inserção.");

      // centraliza/escala via viewBox + CSS do seu layout; aqui só garantimos responsivo básico
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";

      const path =
        svg.querySelector("#raceLine") ||
        svg.querySelector("#trackPath") ||
        svg.querySelector(".raceLine") ||
        svg.querySelector("path");

      if (!path) throw new Error("Path principal não encontrado no SVG.");

      state.pathPoints = buildPathPointsFromSVGPath(path, 900); // mais pontos => movimento suave
      state.svgReady = true;

      // desenha linha (stroke) por cima, sem alterar seu SVG original:
      drawPolylineOverlay(svg, state.pathPoints);

      // cria os carros (bolinhas) no SVG
      initCarDots(svg);

    } catch (err) {
      console.error("[practice] Falha ao carregar SVG:", err);
    }
  }

  function buildPathPointsFromSVGPath(pathEl, samples) {
    const pts = [];
    const len = pathEl.getTotalLength();
    const n = Math.max(200, samples | 0);
    for (let i = 0; i < n; i++) {
      const p = pathEl.getPointAtLength((i / n) * len);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  function drawPolylineOverlay(svg, pts) {
    // evita duplicar
    if (svg.querySelector("#_polyOverlay")) return;

    const ns = "http://www.w3.org/2000/svg";
    const poly = document.createElementNS(ns, "polyline");
    poly.setAttribute("id", "_polyOverlay");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "rgba(255,255,255,0.22)");
    poly.setAttribute("stroke-width", "2.2");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    // deixa em cima
    svg.appendChild(poly);
  }

  function initCarDots(svg) {
    const ns = "http://www.w3.org/2000/svg";
    // remove antigos
    $all("circle[data-car-dot='1'], circle[data-car-dot='2']").forEach(n => n.remove());

    state.cars.forEach((car, idx) => {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("data-car-dot", String(idx + 1));
      c.setAttribute("r", "7");
      c.setAttribute("fill", car.driver.color);
      c.setAttribute("stroke", "rgba(0,0,0,0.55)");
      c.setAttribute("stroke-width", "2");

      // posição inicial
      const p = getPointOnTrack(car.progress);
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));

      // tooltip
      c.style.cursor = "pointer";
      c.addEventListener("click", () => { state.telemetryFocusIdx = idx; });

      svg.appendChild(c);
    });
  }

  function getPointOnTrack(progress01) {
    const pts = state.pathPoints;
    if (!pts || pts.length < 2) return { x: 0, y: 0 };

    const total = pts.length;
    const t = (progress01 % 1 + 1) % 1;
    const idxFloat = t * total;
    const i0 = Math.floor(idxFloat) % total;
    const i1 = (i0 + 1) % total;
    const f = idxFloat - i0;
    const p0 = pts[i0], p1 = pts[i1];
    return { x: lerp(p0.x, p1.x, f), y: lerp(p0.y, p1.y, f) };
  }

  /* ===========================
     PIT (simples para TL)
     =========================== */
  function doPit(carIdx) {
    const car = state.cars[carIdx];
    // pit reset leve (TL): pneus + combustível + ERS
    car.tyresPct = clamp(car.tyresPct + 0.35, 0, 1);
    car.fuelPct  = clamp(car.fuelPct  + 0.25, 0, 1);
    car.ersPct   = clamp(car.ersPct   + 0.30, 0, 1);
    car.engineTempC = clamp(car.engineTempC - 8, 80, 115);
    car.tyreTempC   = clamp(car.tyreTempC - 4, 70, 115);
    car.mode = "NORMAL";
    car.ersMode = "STD";
    refreshPilotCards();
  }

  /* ===========================
     SIMULAÇÃO — SPEED + TELEMETRIA
     =========================== */
  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const rawDt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;

    // dt clamp para evitar “salto” quando aba volta do background
    const dt = clamp(rawDt, 0, 0.050);

    if (state.running && state.svgReady) {
      const simDt = dt * state.speedMultiplier;

      // sessão
      state.sessionRemainingSec -= simDt;
      if (state.sessionRemainingSec <= 0) {
        state.sessionRemainingSec = 0;
        state.running = false;
      }

      // atualizar setup em runtime (se voltar da oficina)
      state.setup = normalizeSetup(readSetupRaw());

      // carros
      for (let i = 0; i < state.cars.length; i++) {
        stepCar(state.cars[i], simDt, ts);
      }

      // UI
      updateClockUI();
      updateCarDots();
      refreshPilotCards();
      updateLeaderboardUI();
      updateTelemetryUI();
    }

    requestAnimationFrame(tick);
  }

  function stepCar(car, simDt, tsNow) {
    // perfil de pista: variação pseudo-real baseada em progress + RNG
    const p = (car.progress % 1 + 1) % 1;
    const wave = Math.sin((p * 2 * Math.PI) * 2.5 + car.rng * 0.01) * 0.5 + 0.5; // 0..1
    const corner = Math.sin((p * 2 * Math.PI) * 5.0 + car.rng * 0.02) * 0.5 + 0.5; // 0..1

    // modo
    let modeMul = 1.0;
    let fuelMul = 1.0;
    let wearMul = 1.0;
    let ersMul  = 1.0;

    if (car.mode === "ECONOMIZAR") {
      modeMul = 0.92;
      fuelMul = 0.86;
      wearMul = 0.90;
      ersMul  = 0.90;
    } else if (car.mode === "ATAQUE") {
      modeMul = 1.06;
      fuelMul = 1.12;
      wearMul = 1.18;
      ersMul  = 1.10;
    } else {
      modeMul = 1.00;
      fuelMul = 1.00;
      wearMul = 1.00;
      ersMul  = 1.00;
    }

    // base performance (driver rating + setup)
    const ratingMul = lerp(0.92, 1.08, clamp((car.driver.rating - 80) / 20, 0, 1)); // 80..100
    const setup = state.setup;

    // velocidade alvo “plausível” (km/h) para telemetria
    // (topSpeed + aero/grip influenciam)
    const topKmh = 345 * setup.topSpeed * ratingMul;                      // ~315..380
    const minKmh = 125 * setup.mechGrip * setup.stability * ratingMul;    // curvas

    // throttle/brake model
    const desiredThrottle = clamp(0.65 + wave * 0.45 - corner * 0.55, 0, 1);
    const desiredBrake = clamp(0.10 + corner * 0.65 - wave * 0.40, 0, 1);

    car.throttle = lerp(car.throttle, desiredThrottle, clamp(simDt * 3.5, 0, 1));
    car.brake    = lerp(car.brake,    desiredBrake,    clamp(simDt * 4.0, 0, 1));

    // speed factor 0..1
    const gripFactor = setup.aero * 0.50 + setup.mechGrip * 0.50;
    const speedTargetKmh = lerp(minKmh, topKmh, clamp(car.throttle * 1.05 - car.brake * 0.85, 0, 1));
    const speedWithGripKmh = speedTargetKmh * gripFactor * modeMul;

    // converte para 0..1 com base no topo
    const target01 = clamp(speedWithGripKmh / Math.max(260, topKmh), 0.25, 1.05);
    car.speed01 = lerp(car.speed01, target01, clamp(simDt * 2.2, 0, 1));

    // ERS
    const ersDrain = (car.ersMode === "BOOST" ? 0.030 : 0.012) * ersMul;
    const ersRegen = (car.ersMode === "BOOST" ? 0.006 : 0.010);
    car.ersPct = clamp(car.ersPct - ersDrain * simDt + ersRegen * simDt * (1 - car.throttle), 0, 1);

    // progresso na pista:
    // IMPORTANTÍSSIMO: o erro de “carro muito rápido” geralmente vem de passo fixo por frame.
    // Aqui usamos simDt (já com 1x/2x/4x) + escala bem controlada.
    const baseMetersPerSec = 78; // ~280 km/h médio
    const pace = baseMetersPerSec * car.speed01 * setup.topSpeed * ratingMul * 0.72; // controla ritmo
    const trackScale = 5200; // escala virtual do “comprimento” do circuito (m)
    const dp = (pace * simDt) / trackScale;

    const prevP = car.progress;
    car.progress = (car.progress + dp) % 1;

    // lap detect (passou de 0)
    if (car.progress < prevP) {
      const now = tsNow || performance.now();
      const lapMs = now - car.lapStartTs;

      car.lastLapMs = lapMs;
      car.lastLapShownMs = lapMs;
      car.laps += 1;
      car.lapStartTs = now;

      if (lapMs < state.bestLapMs) {
        state.bestLapMs = lapMs;
        state.bestLapDriver = car.driver;
      }
    }

    // pneus / combustível / motor
    const tyreWearRate = 0.0009 * setup.tyreWear * wearMul * (0.6 + car.speed01 * 0.8);
    car.tyresPct = clamp(car.tyresPct - tyreWearRate * simDt, 0, 1);

    const fuelRate = 0.00055 * setup.fuelUse * fuelMul * (0.6 + car.speed01 * 0.9);
    car.fuelPct = clamp(car.fuelPct - fuelRate * simDt, 0, 1);

    // temperatura/pressão pneus e motor (plausível)
    car.tyreTempC = clamp(
      lerp(car.tyreTempC, 86 + car.speed01 * 20 + (car.brake * 10) + (setup.tyreWear - 1) * 6, clamp(simDt * 0.9, 0, 1)),
      70, 115
    );
    car.tyrePressPsi = clamp(
      lerp(car.tyrePressPsi, 22.5 + (setup.tyreWear - 1) * 2.5 + car.tyreTempC * 0.01, clamp(simDt * 0.5, 0, 1)),
      20.0, 26.0
    );
    car.engineTempC = clamp(
      lerp(car.engineTempC, 92 + car.speed01 * 18 + (car.ersMode === "BOOST" ? 5 : 0), clamp(simDt * 0.7, 0, 1)),
      80, 120
    );

    // RPM / marcha / G
    const kmh = speedWithGripKmh;
    car.gear = clamp(1 + Math.floor(kmh / 40), 1, 8);
    car.rpm = clamp(9000 + kmh * 9 + (car.ersMode === "BOOST" ? 450 : 0), 8500, 12500);
    car.g = clamp(0.8 + car.brake * 3.8 + (corner * 1.2) - car.throttle * 0.6, 0.6, 5.5);
  }

  /* ===========================
     UI UPDATES
     =========================== */
  function updateClockUI() {
    // canto superior (tempo geral)
    setText(["#sessionClock", ".sessionClock", "#clockTop"], fmtMMSS(state.sessionRemainingSec));

    // painel sessão (tempo repetido)
    setText(["#sessionClockPanel", "#clockPanel", ".sessionTime"], fmtMMSS(state.sessionRemainingSec));

    // melhor volta geral
    const best = state.bestLapMs < Infinity ? fmtLap(state.bestLapMs) : "--:--.---";
    setText(["#bestLapGlobal", ".bestLapGlobal", "#bestLap"], best);

    // label LIVE • xX (se existir)
    setText(["#liveSpeedLabel", "#speedLabel", ".liveSpeed"], `LIVE • ${state.speedMultiplier}X`);
  }

  function updateCarDots() {
    const svg = pickEl(["#trackContainer svg", "#svgContainer svg", ".trackContainer svg", ".mapContainer svg"]);
    if (!svg) return;

    state.cars.forEach((car, idx) => {
      const dot = svg.querySelector(`circle[data-car-dot='${idx + 1}']`);
      if (!dot) return;
      const p = getPointOnTrack(car.progress);
      dot.setAttribute("cx", String(p.x));
      dot.setAttribute("cy", String(p.y));
      dot.setAttribute("fill", car.driver.color);
    });
  }

  function refreshPilotCards() {
    // card 1
    setText(["#p1Mode", "#pilot1Mode", ".p1Mode"], carModeLabel(state.cars[0]));
    setText(["#p1Tyre", "#pilot1Tyre", ".p1Tyre"], `PNEUS ${(state.cars[0].tyresPct * 100).toFixed(0)}%`);
    setText(["#p1Fuel", "#pilot1Fuel", ".p1Fuel"], `Combustível ${(state.cars[0].fuelPct * 100).toFixed(0)}%`);
    setText(["#p1Laps", "#pilot1Laps", ".p1Laps"], `Voltas: ${state.cars[0].laps}`);
    setText(["#p1LastLap", "#pilot1LastLap", ".p1LastLap"], `Última volta: ${fmtLap(state.cars[0].lastLapShownMs)}`);
    setText(["#p1BestLap", "#pilot1BestLap", ".p1BestLap"], `Melhor volta: ${bestLapForCar(state.cars[0])}`);

    // card 2
    setText(["#p2Mode", "#pilot2Mode", ".p2Mode"], carModeLabel(state.cars[1]));
    setText(["#p2Tyre", "#pilot2Tyre", ".p2Tyre"], `PNEUS ${(state.cars[1].tyresPct * 100).toFixed(0)}%`);
    setText(["#p2Fuel", "#pilot2Fuel", ".p2Fuel"], `Combustível ${(state.cars[1].fuelPct * 100).toFixed(0)}%`);
    setText(["#p2Laps", "#pilot2Laps", ".p2Laps"], `Voltas: ${state.cars[1].laps}`);
    setText(["#p2LastLap", "#pilot2LastLap", ".p2LastLap"], `Última volta: ${fmtLap(state.cars[1].lastLapShownMs)}`);
    setText(["#p2BestLap", "#pilot2BestLap", ".p2BestLap"], `Melhor volta: ${bestLapForCar(state.cars[1])}`);
  }

  function carModeLabel(car) {
    const m = car.mode === "ECONOMIZAR" ? "ECONOMIZAR" : (car.mode === "ATAQUE" ? "ATAQUE" : "NORMAL");
    return `Modo: ${m}`;
  }
  function bestLapForCar(car) {
    // aqui usamos melhor global como “proxy” caso não tenha melhor individual guardada
    // (se quiser, você pode guardar bestLapMs por carro também)
    return fmtLap(car.lastLapShownMs);
  }

  function updateLeaderboardUI() {
    // Preenche a lista simples “#1, #2” se existir
    // Para não brigar com seu layout, só atualiza campos comuns.
    const rows = $all(".practiceRow, .sessionRow, [data-row='practice']");
    if (rows.length >= 2) {
      // tenta preencher os 2 primeiros
      fillRow(rows[0], 1, state.cars[0]);
      fillRow(rows[1], 2, state.cars[1]);
    } else {
      // fallback por IDs comuns
      setText(["#row1Name", "#pRow1Name"], state.cars[0].driver.name);
      setText(["#row2Name", "#pRow2Name"], state.cars[1].driver.name);

      setText(["#row1Lap", "#pRow1Lap"], fmtLap(state.cars[0].lastLapShownMs));
      setText(["#row2Lap", "#pRow2Lap"], fmtLap(state.cars[1].lastLapShownMs));
    }

    // melhor volta global (texto)
    if (state.bestLapDriver) {
      setText(["#bestLapDriver", ".bestLapDriver"], state.bestLapDriver.name);
      setText(["#bestLapGlobal", ".bestLapGlobal", "#bestLap"], fmtLap(state.bestLapMs));
    }
  }

  function fillRow(rowEl, pos, car) {
    const nameEl = rowEl.querySelector(".rowName, .name, [data-cell='name']");
    const lapEl  = rowEl.querySelector(".rowLap, .lap, [data-cell='lap']");
    const teamEl = rowEl.querySelector(".rowTeam, .team, [data-cell='team']");
    const vEl    = rowEl.querySelector(".rowV, .v, [data-cell='v']");

    if (nameEl) nameEl.textContent = car.driver.name;
    if (teamEl) teamEl.textContent = `${TEAM_META[car.driver.teamKey]?.name || car.driver.teamName} • ${car.mode}`;
    if (lapEl)  lapEl.textContent = fmtLap(car.lastLapShownMs);
    if (vEl)    vEl.textContent = `V${car.laps}`;
  }

  function updateTelemetryUI() {
    const car = state.cars[state.telemetryFocusIdx] || state.cars[0];

    // header/fonte
    setText(
      ["#tlmSource", ".tlmSource", "#telemetrySource", ".telemetrySource"],
      `Fonte: ${car.driver.name} • Modo: ${car.mode} • ERS ${(car.ersPct * 100).toFixed(0)}%`
    );

    // valores principais (tenta IDs comuns)
    const kmh = Math.round(lerp(150, 360, clamp(car.speed01, 0, 1)));
    setText(["#tlmSpeed", "#teleSpeed", ".tlmSpeed .value", "[data-tlm='speedValue']"], `${kmh} km/h`);
    setBar (["#tlmSpeedBar", ".tlmSpeed .barFill", "[data-tlm='speedBar']"], clamp(car.speed01, 0, 1));

    setText(["#tlmThrottle", "#teleThrottle", ".tlmThrottle .value", "[data-tlm='throttleValue']"], `${Math.round(car.throttle * 100)} %`);
    setBar (["#tlmThrottleBar", ".tlmThrottle .barFill", "[data-tlm='throttleBar']"], car.throttle);

    setText(["#tlmBrake", "#teleBrake", ".tlmBrake .value", "[data-tlm='brakeValue']"], `${Math.round(car.brake * 100)} %`);
    setBar (["#tlmBrakeBar", ".tlmBrake .barFill", "[data-tlm='brakeBar']"], car.brake);

    setText(["#tlmTyres", "#teleTyres", ".tlmTyres .value", "[data-tlm='tyresValue']"], `${Math.round(car.tyresPct * 100)} %`);
    setBar (["#tlmTyresBar", ".tlmTyres .barFill", "[data-tlm='tyresBar']"], car.tyresPct);

    setText(["#tlmFuel", "#teleFuel", ".tlmFuel .value", "[data-tlm='fuelValue']"], `${Math.round(car.fuelPct * 100)} %`);
    setBar (["#tlmFuelBar", ".tlmFuel .barFill", "[data-tlm='fuelBar']"], car.fuelPct);

    setText(["#tlmEngineTemp", "#teleEngineTemp", ".tlmEngine .value", "[data-tlm='engineTempValue']"], `${Math.round(car.engineTempC)} °C`);
    setBar (["#tlmEngineTempBar", ".tlmEngine .barFill", "[data-tlm='engineTempBar']"], clamp((car.engineTempC - 80) / 40, 0, 1));

    // detalhes pequenos (se existirem)
    setText(["#tlmG", "#teleG", "[data-tlm='gValue']"], `${car.g.toFixed(1)} G`);
    setText(["#tlmRPM", "#teleRPM", "[data-tlm='rpmValue']"], `${Math.round(car.rpm)}`);
    setText(["#tlmGear", "#teleGear", "[data-tlm='gearValue']"], `${car.gear}`);

    setText(["#tlmTraction", "#teleTraction", "[data-tlm='tractionValue']"], `${Math.round(state.setup.mechGrip * 100)}`);
    setText(["#tlmGrip", "#teleGrip", "[data-tlm='gripValue']"], `${Math.round((state.setup.aero * 0.5 + state.setup.mechGrip * 0.5) * 100)}`);
    setText(["#tlmStab", "#teleStab", "[data-tlm='stabilityValue']"], `${Math.round(state.setup.stability * 100)}`);

    setText(["#tlmTyreTemp", "#teleTyreTemp", "[data-tlm='tyreTempValue']"], `${Math.round(car.tyreTempC)}°C`);
    setText(["#tlmTyrePress", "#teleTyrePress", "[data-tlm='tyrePressValue']"], `${car.tyrePressPsi.toFixed(1)}`);

    setText(["#tlmErs", "#teleErs", "[data-tlm='ersValue']"], `${Math.round(car.ersPct * 100)}%`);
    setText(["#tlmStress", "#teleStress", "[data-tlm='stressValue']"], `${Math.round((1 - car.tyresPct) * 120 + (car.engineTempC - 90) * 2)}`);
  }

  /* ===========================
     INIT
     =========================== */
  function boot() {
    hydrateHeader();
    bindButtons();
    loadTrackSVG().then(() => {
      // garante dots alinhados com a pista
      updateCarDots();
    });

    // arranca loop
    requestAnimationFrame(tick);
  }

  // start
  document.addEventListener("DOMContentLoaded", boot);

})();
