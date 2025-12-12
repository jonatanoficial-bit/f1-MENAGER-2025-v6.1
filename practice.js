// =====================================================
// F1 MANAGER 2025 – PRACTICE (v6.1) — SVG PATH + TELEMETRIA
// - Mantém lógica estilo QUALIFYING: pathPoints via getPointAtLength
// - requestAnimationFrame + velocidade 1x/2x/4x
// - 2 carros do usuário seguindo pontos do SVG (sem sair da pista)
// - Integra setup da OFICINA (localStorage): velocidade/consumo/grip/estabilidade
// - ✅ Telemetria avançada (painel no campo vazio grande) + sparkline ao vivo
// =====================================================

(() => {
  "use strict";

  // =========================
  // 1) PARAMS / CONTEXTO
  // =========================
  const urlParams = new URLSearchParams(window.location.search);
  const TRACK_KEY = (urlParams.get("track") || "australia").toLowerCase();
  const TEAM_KEY = (urlParams.get("userTeam") || localStorage.getItem("f1m2025_user_team") || "ferrari").toLowerCase();
  localStorage.setItem("f1m2025_user_team", TEAM_KEY);

  // =========================
  // 2) ELEMENTOS DOM
  // =========================
  const elTrackName = document.getElementById("trackName");
  const elTrackContainer = document.getElementById("track-container");
  const elDriversOnTrack = document.getElementById("driversOnTrack");

  const elTeamLogoTop = document.getElementById("teamLogoTop");

  const elTimeRemaining = document.getElementById("timeRemaining");
  const elHudClock = document.getElementById("hudClock");
  const elBestLapValue = document.getElementById("bestLapValue");
  const elBestLapValue2 = document.getElementById("bestLapValue2");
  const elHudLiveTag = document.getElementById("hudLiveTag");

  const btnBackLobby = document.getElementById("btnBackLobby");
  const btnGoOficina = document.getElementById("btnGoOficina");
  const btnGoQualy = document.getElementById("btnGoQualy");

  // Telemetria (NOVO)
  const tel = {
    source: document.getElementById("telemetrySource"),
    mode: document.getElementById("telemetryMode"),
    ers: document.getElementById("telemetryERS"),

    speed: document.getElementById("telSpeed"),
    gear: document.getElementById("telGear"),
    rpm: document.getElementById("telRPM"),
    throttle: document.getElementById("telThrottle"),
    brake: document.getElementById("telBrake"),
    traction: document.getElementById("telTraction"),
    grip: document.getElementById("telGrip"),
    stability: document.getElementById("telStability"),
    delta: document.getElementById("telDelta"),
    tyreWear: document.getElementById("telTyreWear"),
    tyreTemp: document.getElementById("telTyreTemp"),
    tyrePsi: document.getElementById("telTyrePsi"),
    fuel: document.getElementById("telFuel"),
    fuelRate: document.getElementById("telFuelRate"),
    fuelMix: document.getElementById("telFuelMix"),
    engineTemp: document.getElementById("telEngineTemp"),
    ers2: document.getElementById("telERS2"),
    stress: document.getElementById("telStress"),

    s1: document.getElementById("telS1"),
    s2: document.getElementById("telS2"),
    s3: document.getElementById("telS3"),
    lap: document.getElementById("telLap"),

    barSpeed: document.getElementById("barSpeed"),
    barThrottle: document.getElementById("barThrottle"),
    barBrake: document.getElementById("barBrake"),
    barTyre: document.getElementById("barTyre"),
    barFuel: document.getElementById("barFuel"),
    barEngine: document.getElementById("barEngine"),

    spark: document.getElementById("telemetrySpark")
  };

  // =========================
  // 3) TRACK DATA
  // =========================
  const TRACKS = {
    australia: { name: "Albert Park — Melbourne", svg: "assets/tracks/australia.svg", baseLapMs: 92000 },
    bahrain: { name: "Sakhir — Bahrain", svg: "assets/tracks/bahrain.svg", baseLapMs: 95000 },
    saudi: { name: "Jeddah — Arábia Saudita", svg: "assets/tracks/saudi.svg", baseLapMs: 89000 },
    japan: { name: "Suzuka — Japão", svg: "assets/tracks/japan.svg", baseLapMs: 91000 },
    china: { name: "Xangai — China", svg: "assets/tracks/china.svg", baseLapMs: 96000 },
    miami: { name: "Miami — EUA", svg: "assets/tracks/miami.svg", baseLapMs: 93000 },
    imola: { name: "Imola — Itália", svg: "assets/tracks/imola.svg", baseLapMs: 93000 },
    monaco: { name: "Mônaco", svg: "assets/tracks/monaco.svg", baseLapMs: 74000 },
    canada: { name: "Montreal — Canadá", svg: "assets/tracks/canada.svg", baseLapMs: 90000 },
    spain: { name: "Barcelona — Espanha", svg: "assets/tracks/spain.svg", baseLapMs: 94000 },
    austria: { name: "Spielberg — Áustria", svg: "assets/tracks/austria.svg", baseLapMs: 82000 },
    britain: { name: "Silverstone — Reino Unido", svg: "assets/tracks/britain.svg", baseLapMs: 88000 },
    hungary: { name: "Hungaroring — Hungria", svg: "assets/tracks/hungary.svg", baseLapMs: 78000 },
    belgium: { name: "Spa — Bélgica", svg: "assets/tracks/belgium.svg", baseLapMs: 105000 },
    netherlands: { name: "Zandvoort — Holanda", svg: "assets/tracks/netherlands.svg", baseLapMs: 86000 },
    monza: { name: "Monza — Itália", svg: "assets/tracks/monza.svg", baseLapMs: 80000 },
    azerbaijan: { name: "Baku — Azerbaijão", svg: "assets/tracks/azerbaijan.svg", baseLapMs: 103000 },
    singapore: { name: "Singapura", svg: "assets/tracks/singapore.svg", baseLapMs: 104000 },
    usa: { name: "Austin — EUA", svg: "assets/tracks/usa.svg", baseLapMs: 98000 },
    mexico: { name: "Cidade do México — México", svg: "assets/tracks/mexico.svg", baseLapMs: 97000 },
    brazil: { name: "Interlagos — Brasil", svg: "assets/tracks/brazil.svg", baseLapMs: 93000 },
    lasvegas: { name: "Las Vegas — EUA", svg: "assets/tracks/lasvegas.svg", baseLapMs: 96000 },
    qatar: { name: "Lusail — Qatar", svg: "assets/tracks/qatar.svg", baseLapMs: 90000 },
    abudhabi: { name: "Yas Marina — Abu Dhabi", svg: "assets/tracks/abudhabi.svg", baseLapMs: 94000 }
  };

  const trackData = TRACKS[TRACK_KEY] || TRACKS.australia;

  // =========================
  // 4) ASSETS / EQUIPES
  // =========================
  const TEAM_LOGO = {
    ferrari: "assets/logos/ferrari.png",
    mercedes: "assets/logos/mercedes.png",
    redbull: "assets/logos/redbull.png",
    mclaren: "assets/logos/mclaren.png",
    aston: "assets/logos/aston.png",
    alpine: "assets/logos/alpine.png",
    williams: "assets/logos/williams.png",
    haas: "assets/logos/haas.png",
    sauber: "assets/logos/sauber.png",
    racingbulls: "assets/logos/racingbulls.png"
  };

  const TEAM_COLOR = {
    ferrari: "#ff2a2a",
    mercedes: "#00e5ff",
    redbull: "#ffb300",
    mclaren: "#ff8c00",
    aston: "#00b894",
    alpine: "#4c6fff",
    williams: "#09a4e5",
    haas: "#d6d6d6",
    sauber: "#d0d0ff",
    racingbulls: "#7aa2ff"
  };

  // =========================
  // 5) SETUP OFICINA (persistência)
  // =========================
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function norm01(v, min, max) {
    if (!Number.isFinite(v)) return 0.5;
    return clamp((v - min) / (max - min), 0, 1);
  }

  function readAnySetup(teamKey) {
    const keys = [
      `f1m2025_setup_${teamKey}`,
      "f1m2025_setup",
      "f1m2025_car_setup",
      "carSetup",
      "setupData",
      "oficina_setup",
      "f1m2025_oficina"
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") return obj;
      } catch {}
    }
    return null;
  }

  // Converte setup em modificadores para treino livre (telemetria também usa)
  function setupToMods(setup) {
    const m = {
      speed: 1.0,       // pace global (reta)
      grip: 1.0,        // aderência
      stability: 1.0,   // estabilidade (menos wobble e menos “stress”)
      fuel: 1.0,        // consumo (menor = economiza)
      tyreWear: 1.0,    // desgaste
      psi: 23.0         // PSI estimado (telemetria)
    };
    if (!setup) return m;

    const fw = setup.frontWing ?? setup.asaDianteira ?? setup.asa_frente ?? setup.asaD ?? null;
    const rw = setup.rearWing ?? setup.asaTraseira ?? setup.asa_tras ?? setup.asaT ?? null;
    const tp = setup.tyrePressure ?? setup.pressaoPneus ?? setup.pressao ?? null;
    const rh = setup.rideHeight ?? setup.alturaCarro ?? setup.altura ?? null;
    const su = setup.suspension ?? setup.rigidezSuspensao ?? setup.suspensao ?? null;

    const fw01 = (fw !== null) ? (fw <= 100 ? norm01(fw, 0, 100) : norm01(fw, 10, 50)) : 0.5;
    const rw01 = (rw !== null) ? (rw <= 100 ? norm01(rw, 0, 100) : norm01(rw, 10, 50)) : 0.5;
    const tp01 = (tp !== null) ? (tp <= 100 ? norm01(tp, 0, 100) : norm01(tp, 18, 28)) : 0.5;
    const rh01 = (rh !== null) ? (rh <= 100 ? norm01(rh, 0, 100) : norm01(rh, 20, 70)) : 0.5;
    const su01 = (su !== null) ? (su <= 100 ? norm01(su, 0, 100) : norm01(su, 1, 10)) : 0.5;

    // Aero: mais asa = mais grip, menos reta
    const aero = (fw01 + rw01) * 0.5;
    m.speed *= (1.02 * (1 - aero) + 0.985 * aero);
    m.grip  *= (0.985 * (1 - aero) + 1.03 * aero);

    // Pressão: extremos pioram desgaste
    const tpMid = 1 - Math.abs(tp01 - 0.5) * 2;
    m.tyreWear *= (1.10 * (1 - tpMid) + 0.93 * tpMid);
    m.grip     *= (0.985 * (1 - tpMid) + 1.01 * tpMid);
    m.psi = (tp !== null && Number.isFinite(tp)) ? tp : (21 + tp01 * 6);

    // Altura: baixo = risco/instável; alto = perde performance
    const lowPenalty = clamp((0.35 - rh01) / 0.35, 0, 1);
    m.stability *= (1.02 * (1 - lowPenalty) + 0.92 * lowPenalty);
    m.speed     *= (0.985 * (1 - rh01) + 1.005 * rh01);

    // Suspensão: dura = rápida em seco porém instável e gasta pneus
    m.grip      *= (0.995 * (1 - su01) + 1.02 * su01);
    m.stability *= (1.04 * (1 - su01) + 0.92 * su01);
    m.tyreWear  *= (0.98 * (1 - su01) + 1.08 * su01);

    // Consumo: mais asa e ataque costuma subir consumo por arrasto
    m.fuel *= (0.98 * (1 - aero) + 1.05 * aero);

    return m;
  }

  const SETUP_MODS = setupToMods(readAnySetup(TEAM_KEY));

  // =========================
  // 6) UTIL
  // =========================
  function fmtTime(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "--:--.---";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const x = Math.floor(ms % 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(x).padStart(3, "0")}`;
  }

  function fmtClock(secLeft) {
    const s = Math.max(0, Math.floor(secLeft));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function angleBetween(a, b) {
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }

  function ensureSvgResponsive(svg) {
    if (!svg) return;
    if (!svg.getAttribute("viewBox")) {
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h) svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function findBestTrackPath(svg) {
    const selectors = [
      "#raceLine",
      "#trackPath",
      "#mainPath",
      "path.racing-line",
      "path.race-line",
      "path.track-path",
      "path.line",
      "path"
    ];
    for (const sel of selectors) {
      const p = svg.querySelector(sel);
      if (p && p.tagName && p.tagName.toLowerCase() === "path") {
        try {
          const len = p.getTotalLength();
          if (Number.isFinite(len) && len > 50) return p;
        } catch {}
      }
    }
    const all = Array.from(svg.querySelectorAll("path"));
    let best = null, bestLen = 0;
    for (const p of all) {
      try {
        const len = p.getTotalLength();
        if (Number.isFinite(len) && len > bestLen) { bestLen = len; best = p; }
      } catch {}
    }
    return best;
  }

  function buildPathPoints(path, samples = 1800) {
    let total = 0;
    try { total = path.getTotalLength(); } catch { return []; }
    if (!Number.isFinite(total) || total <= 0) return [];
    const pts = [];
    const step = total / samples;
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength(i * step);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  // “Curvatura” simples (0..1) para telemetria: quanto maior, mais curva/freio
  function curvatureAt(points, idx) {
    const n = points.length;
    if (n < 5) return 0.2;
    const a = points[(idx - 6 + n) % n];
    const b = points[idx];
    const c = points[(idx + 6) % n];
    const ang1 = Math.atan2(b.y - a.y, b.x - a.x);
    const ang2 = Math.atan2(c.y - b.y, c.x - b.x);
    let d = Math.abs(ang2 - ang1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return clamp(d / 1.4, 0, 1);
  }

  // =========================
  // 7) SESSION STATE
  // =========================
  const SESSION = {
    running: true,
    speedMultiplier: 1,
    startAt: performance.now(),
    durationSec: 60 * 60, // 60:00
    remainingSec: 60 * 60,
    bestLapMs: Infinity
  };

  // =========================
  // 8) DRIVERS (treino livre)
  // =========================
  // OBS: nomes/faces aqui precisam bater com seus assets (ex.: assets/faces/ALO.png)
  // Você já confirmou o padrão de faces, então mantemos.
  const myDrivers = [
    {
      id: 1,
      name: "Charles Leclerc",
      team: TEAM_KEY,
      face: "assets/faces/LEC.png",
      color: TEAM_COLOR[TEAM_KEY] || "#ff2a2a",
      mode: "normal",
      progress: 0.02,
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity,
      tire: { comp: "SOFT", wear: 16, temp: 93 },
      fuel: 75,
      ers: 55,
      s1: null, s2: null, s3: null
    },
    {
      id: 2,
      name: "Carlos Sainz",
      team: TEAM_KEY,
      face: "assets/faces/SAI.png",
      color: TEAM_COLOR[TEAM_KEY] || "#ff2a2a",
      mode: "normal",
      progress: 0.07,
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity,
      tire: { comp: "SOFT", wear: 16, temp: 93 },
      fuel: 75,
      ers: 55,
      s1: null, s2: null, s3: null
    }
  ];

  // =========================
  // 9) SVG / PATH / CARS
  // =========================
  let svgRoot = null;
  let trackPath = null;
  let pathPoints = [];

  const carNodes = new Map();

  function createSvgLayer(svg, id) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    svg.appendChild(g);
    return g;
  }

  function createCarNode(parentLayer, driver) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shadow.setAttribute("r", "10");
    shadow.setAttribute("fill", "rgba(0,0,0,0.35)");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "7.5");
    dot.setAttribute("fill", driver.color);

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("r", "9");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "rgba(255,255,255,0.65)");
    ring.setAttribute("stroke-width", "1.25");

    g.appendChild(shadow);
    g.appendChild(dot);
    g.appendChild(ring);

    parentLayer.appendChild(g);
    carNodes.set(driver.id, g);
  }

  function setCarTransform(id, x, y, angleDeg) {
    const node = carNodes.get(id);
    if (!node) return;
    node.setAttribute("transform", `translate(${x} ${y}) rotate(${angleDeg})`);
  }

  // =========================
  // 10) UI (pilotos)
  // =========================
  const p1face = document.getElementById("p1face");
  const p2face = document.getElementById("p2face");
  const p1info = document.getElementById("p1info");
  const p2info = document.getElementById("p2info");
  const p1name = document.getElementById("p1name");
  const p2name = document.getElementById("p2name");
  const p1team = document.getElementById("p1team");
  const p2team = document.getElementById("p2team");

  function safeImg(img, src) {
    if (!img) return;
    img.src = src;
    img.onerror = () => {
      img.onerror = null;
      img.src = "assets/faces/default.png";
    };
  }

  function updatePilotCards() {
    const d1 = myDrivers[0];
    const d2 = myDrivers[1];

    if (p1name) p1name.textContent = d1.name;
    if (p2name) p2name.textContent = d2.name;
    if (p1team) p1team.textContent = TEAM_KEY;
    if (p2team) p2team.textContent = TEAM_KEY;

    safeImg(p1face, d1.face);
    safeImg(p2face, d2.face);

    if (p1info) {
      p1info.innerHTML =
        `Modo: <b>${d1.mode.toUpperCase()}</b><br>` +
        `${d1.tire.comp} • Desgaste <b>${d1.tire.wear.toFixed(0)}%</b><br>` +
        `Combustível <b>${d1.fuel.toFixed(0)}%</b> • ERS <b>${d1.ers.toFixed(0)}%</b><br>` +
        `Última volta: <b>${fmtTime(d1.lastLapMs)}</b> • Melhor: <b>${fmtTime(d1.bestLapMs)}</b>`;
    }

    if (p2info) {
      p2info.innerHTML =
        `Modo: <b>${d2.mode.toUpperCase()}</b><br>` +
        `${d2.tire.comp} • Desgaste <b>${d2.tire.wear.toFixed(0)}%</b><br>` +
        `Combustível <b>${d2.fuel.toFixed(0)}%</b> • ERS <b>${d2.ers.toFixed(0)}%</b><br>` +
        `Última volta: <b>${fmtTime(d2.lastLapMs)}</b> • Melhor: <b>${fmtTime(d2.bestLapMs)}</b>`;
    }

    const best = Math.min(SESSION.bestLapMs, d1.bestLapMs, d2.bestLapMs);
    const bestText = best === Infinity ? "--:--.---" : fmtTime(best);
    if (elBestLapValue) elBestLapValue.textContent = bestText;
    if (elBestLapValue2) elBestLapValue2.textContent = bestText;
  }

  function renderDriversOnTrackList() {
    if (!elDriversOnTrack) return;

    const ordered = myDrivers.slice().sort((a, b) => (b.lap - a.lap) || (b.progress - a.progress));
    elDriversOnTrack.innerHTML = "";

    ordered.forEach((d, i) => {
      const row = document.createElement("div");
      row.className = "practice-driver-row";

      const left = document.createElement("div");
      left.className = "practice-driver-left";

      const pos = document.createElement("div");
      pos.className = "practice-driver-pos";
      pos.textContent = `#${i + 1}`;

      const face = document.createElement("img");
      face.className = "practice-driver-face";
      face.src = d.face;
      face.onerror = () => { face.onerror = null; face.src = "assets/faces/default.png"; };

      const text = document.createElement("div");
      text.className = "practice-driver-text";

      const nm = document.createElement("div");
      nm.className = "practice-driver-name";
      nm.textContent = d.name;

      const tm = document.createElement("div");
      tm.className = "practice-driver-team";
      tm.textContent = `${TEAM_KEY.toUpperCase()} • ${d.mode.toUpperCase()}`;

      text.appendChild(nm);
      text.appendChild(tm);

      left.appendChild(pos);
      left.appendChild(face);
      left.appendChild(text);

      const right = document.createElement("div");
      right.className = "practice-driver-right";

      const stats = document.createElement("div");
      stats.className = "practice-driver-stats";
      stats.textContent = `V${d.lap} • ${fmtTime(d.lastLapMs)}`;

      right.appendChild(stats);

      row.appendChild(left);
      row.appendChild(right);

      // Click define fonte da telemetria
      row.style.cursor = "pointer";
      row.addEventListener("click", () => setTelemetryDriver(d.id));

      elDriversOnTrack.appendChild(row);
    });
  }

  // =========================
  // 11) LÓGICA DE VOLTA / SETOR (telemetria usa)
  // =========================
  function updateLapAndSectors(driver, prevProgress, nextProgress) {
    // setores (0..1)
    const s1End = 0.33, s2End = 0.66, s3End = 0.99;

    // registradores: quando cruza cada marco, calcula parcial
    if (prevProgress < s1End && nextProgress >= s1End && driver.s1 === null) {
      driver.s1 = performance.now() - driver.lapStartAt;
    }
    if (prevProgress < s2End && nextProgress >= s2End && driver.s2 === null) {
      driver.s2 = performance.now() - driver.lapStartAt;
    }
    if (prevProgress < s3End && nextProgress >= s3End && driver.s3 === null) {
      driver.s3 = performance.now() - driver.lapStartAt;
    }

    // volta completa (wrap)
    if (prevProgress > nextProgress) {
      driver.lap += 1;
      const now = performance.now();
      const lapMs = now - driver.lapStartAt;

      driver.lastLapMs = lapMs;
      driver.bestLapMs = Math.min(driver.bestLapMs, lapMs);
      SESSION.bestLapMs = Math.min(SESSION.bestLapMs, lapMs);

      // reset setores
      driver.lapStartAt = now;
      driver.s1 = null; driver.s2 = null; driver.s3 = null;
    }
  }

  // =========================
  // 12) TELEMETRIA (NOVO)
  // =========================
  let telemetryDriverId = 1;

  // buffer sparkline
  const spark = {
    ctx: null,
    w: 920,
    h: 88,
    speed: new Array(180).fill(0),
    throttle: new Array(180).fill(0),
    brake: new Array(180).fill(0)
  };

  function setTelemetryDriver(id) {
    telemetryDriverId = id;
    const d = myDrivers.find(x => x.id === id) || myDrivers[0];
    if (tel.source) tel.source.textContent = d ? d.name : "Piloto";
  }

  function initSpark() {
    if (!tel.spark) return;
    spark.ctx = tel.spark.getContext("2d");
    spark.w = tel.spark.width;
    spark.h = tel.spark.height;
  }

  function pushSpark(speedKmh, thr, brk) {
    spark.speed.push(speedKmh);
    spark.throttle.push(thr);
    spark.brake.push(brk);
    spark.speed.shift();
    spark.throttle.shift();
    spark.brake.shift();
  }

  function drawSpark() {
    if (!spark.ctx) return;
    const ctx = spark.ctx;
    ctx.clearRect(0, 0, spark.w, spark.h);

    // grid sutil
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (spark.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(spark.w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // helpers
    const drawLine = (arr, maxV) => {
      ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = (i / (arr.length - 1)) * spark.w;
        const v = clamp(arr[i] / maxV, 0, 1);
        const y = spark.h - v * (spark.h - 8) - 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // speed (branco)
    ctx.strokeStyle = "rgba(255,255,255,0.90)";
    ctx.lineWidth = 2;
    drawLine(spark.speed, 360);

    // throttle (ciano)
    ctx.strokeStyle = "rgba(0,255,255,0.85)";
    ctx.lineWidth = 2;
    drawLine(spark.throttle, 100);

    // brake (azul)
    ctx.strokeStyle = "rgba(0,140,255,0.70)";
    ctx.lineWidth = 2;
    drawLine(spark.brake, 100);
  }

  // Telemetria sintética porém coerente com o traçado (curvatura) + modo + setup
  function computeTelemetry(d, idxOnPath, dtSec) {
    const curv = curvatureAt(pathPoints, idxOnPath);

    // Base por modo
    const mode = d.mode;
    const modePace = (mode === "attack") ? 1.05 : (mode === "eco" ? 0.94 : 1.0);
    const modeFuel = (mode === "attack") ? 1.12 : (mode === "eco" ? 0.82 : 1.0);
    const modeStress = (mode === "attack") ? 1.18 : (mode === "eco" ? 0.86 : 1.0);

    // “Speed target” (curvas reduzem)
    const top = 345 * SETUP_MODS.speed;
    const corner = 135 + (SETUP_MODS.grip - 1) * 30;
    const targetSpeed = (top * (1 - curv) + corner * curv) * modePace;

    // throttle/brake coerentes
    const throttle = clamp(100 * (1 - curv * 0.85) + (mode === "attack" ? 6 : 0) - (mode === "eco" ? 10 : 0), 0, 100);
    const brake = clamp(curv * 115 - (mode === "attack" ? 6 : 0) - (SETUP_MODS.stability - 1) * 10, 0, 100);

    // speed filtrada
    d._v = d._v ?? targetSpeed;
    const accel = 7.5 * (throttle / 100) * (1.0 + (SETUP_MODS.grip - 1) * 0.6);
    const decel = 10.5 * (brake / 100);
    const dv = (accel - decel) * dtSec * 18; // escala
    d._v = clamp(d._v + dv, 60, top);

    // RPM e marcha
    const gear = clamp(Math.round(1 + (d._v / top) * 7), 1, 8);
    const rpm = Math.round(9000 + (d._v / top) * 3000 + (mode === "attack" ? 300 : 0) - curv * 250);

    // ERS
    d.ers = clamp(d.ers + (mode === "eco" ? 1.2 : 0.6) - (mode === "attack" ? 0.9 : 0.4), 0, 100);

    // Fuel
    d.fuel = clamp(d.fuel - (0.012 * modeFuel * SETUP_MODS.fuel) * (dtSec * 60), 0, 100);

    // Tyre wear / temp
    const wearRate = 0.035 * (mode === "attack" ? 1.35 : (mode === "eco" ? 0.82 : 1.0)) * SETUP_MODS.tyreWear;
    d.tire.wear = clamp(d.tire.wear + wearRate * (dtSec * 60) * (0.6 + curv), 0, 100);

    const tempTarget = 92 + curv * 9 + (mode === "attack" ? 4 : 0) - (mode === "eco" ? 2 : 0);
    d.tire.temp = clamp(d.tire.temp + (tempTarget - d.tire.temp) * (dtSec * 2.2), 70, 120);

    // Engine temp / stress
    d._engT = d._engT ?? 101;
    const engTarget = 98 + (mode === "attack" ? 8 : 2) + (curv * 3) + (SETUP_MODS.speed > 1 ? 2 : 0);
    d._engT = clamp(d._engT + (engTarget - d._engT) * (dtSec * 1.4), 80, 128);

    const traction = clamp(100 - curv * 35 + (SETUP_MODS.grip - 1) * 25, 0, 100);
    const grip = clamp(100 - curv * 18 + (SETUP_MODS.grip - 1) * 40, 0, 120);
    const stability = clamp(100 + (SETUP_MODS.stability - 1) * 60 - curv * 12, 0, 120);

    const delta = ((d._v - targetSpeed) / 25) * -1; // apenas “sensação” de delta

    return {
      speed: d._v,
      throttle,
      brake,
      gear,
      rpm,
      traction,
      grip,
      stability,
      delta,
      tyreWear: d.tire.wear,
      tyreTemp: d.tire.temp,
      tyrePsi: SETUP_MODS.psi,
      fuel: d.fuel,
      fuelRate: (mode === "attack") ? "ALTO" : (mode === "eco" ? "BAIXO" : "MÉDIO"),
      fuelMix: (mode === "attack") ? "RICO" : (mode === "eco" ? "LEAN" : "STD"),
      engineTemp: d._engT,
      ers: d.ers,
      stress: clamp(100 * modeStress + (curv * 12) - (SETUP_MODS.stability - 1) * 15, 60, 140)
    };
  }

  function updateTelemetryUI(d, t, lapMs) {
    if (!tel.speed) return;

    // textos
    tel.mode.textContent = d.mode.toUpperCase();
    tel.ers.textContent = `${t.ers.toFixed(0)}%`;
    tel.ers2.textContent = `${t.ers.toFixed(0)}%`;

    tel.speed.textContent = t.speed.toFixed(0);
    tel.gear.textContent = String(t.gear);
    tel.rpm.textContent = String(t.rpm);

    tel.throttle.textContent = t.throttle.toFixed(0);
    tel.brake.textContent = t.brake.toFixed(0);

    tel.traction.textContent = t.traction.toFixed(0);
    tel.grip.textContent = t.grip.toFixed(0);
    tel.stability.textContent = t.stability.toFixed(0);

    tel.delta.textContent = (t.delta >= 0 ? `+${t.delta.toFixed(1)}` : t.delta.toFixed(1));

    tel.tyreWear.textContent = t.tyreWear.toFixed(0);
    tel.tyreTemp.textContent = `${t.tyreTemp.toFixed(0)}°C`;
    tel.tyrePsi.textContent = t.tyrePsi.toFixed(1);

    tel.fuel.textContent = t.fuel.toFixed(0);
    tel.fuelRate.textContent = t.fuelRate;
    tel.fuelMix.textContent = t.fuelMix;

    tel.engineTemp.textContent = t.engineTemp.toFixed(0);
    tel.stress.textContent = t.stress.toFixed(0);

    // setores (se existirem)
    tel.s1.textContent = d.s1 ? (d.s1 / 1000).toFixed(2) : "--.--";
    tel.s2.textContent = d.s2 ? (d.s2 / 1000).toFixed(2) : "--.--";
    tel.s3.textContent = d.s3 ? (d.s3 / 1000).toFixed(2) : "--.--";
    tel.lap.textContent = fmtTime(lapMs);

    // barras
    tel.barSpeed.style.width = `${clamp((t.speed / 360) * 100, 0, 100)}%`;
    tel.barThrottle.style.width = `${t.throttle}%`;
    tel.barBrake.style.width = `${t.brake}%`;
    tel.barTyre.style.width = `${clamp(t.tyreWear, 0, 100)}%`;
    tel.barFuel.style.width = `${clamp(t.fuel, 0, 100)}%`;
    tel.barEngine.style.width = `${clamp(((t.engineTemp - 80) / 50) * 100, 0, 100)}%`;

    // sparkline
    pushSpark(t.speed, t.throttle, t.brake);
    drawSpark();
  }

  // =========================
  // 13) LOOP (movimento + tempo)
  // =========================
  let lastNow = performance.now();

  function tick(now) {
    if (!SESSION.running) {
      requestAnimationFrame(tick);
      return;
    }

    const dtMs = Math.min(40, now - lastNow);
    lastNow = now;

    const dtSec = dtMs / 1000;

    // Tempo de sessão (com speed multiplier)
    SESSION.remainingSec = clamp(SESSION.remainingSec - dtSec * SESSION.speedMultiplier, 0, SESSION.durationSec);
    const clock = fmtClock(SESSION.remainingSec);
    if (elTimeRemaining) elTimeRemaining.textContent = clock;
    if (elHudClock) elHudClock.textContent = clock;

    if (SESSION.remainingSec <= 0) {
      SESSION.running = false;
      if (elHudLiveTag) elHudLiveTag.textContent = "FINAL";
      requestAnimationFrame(tick);
      return;
    }

    if (!pathPoints || pathPoints.length < 80) {
      requestAnimationFrame(tick);
      return;
    }

    // Atualiza cada piloto (progress → posição)
    for (const d of myDrivers) {
      const prev = d.progress;

      // velocidade por modo + setup
      const pace = (d.mode === "attack") ? 1.08 : (d.mode === "eco" ? 0.93 : 1.0);
      const base = (1 / trackData.baseLapMs) * 1000; // progress/ms
      const fuelPenalty = 1 - (1 - d.fuel / 100) * 0.08; // pouco impacto
      const tyrePenalty = 1 - (d.tire.wear / 100) * 0.12;

      const speed = base * pace * SETUP_MODS.speed * fuelPenalty * tyrePenalty;

      // move (escala pelo speedMultiplier)
      d.progress += speed * dtMs * SESSION.speedMultiplier;

      // wrap
      if (d.progress >= 1) d.progress -= 1;

      // setores/volta
      updateLapAndSectors(d, prev, d.progress);

      // desgaste/combustível (leve) — telemetria já faz “real-time”, aqui mantém estado global estável
      d.fuel = clamp(d.fuel - 0.002 * SESSION.speedMultiplier, 0, 100);
      d.ers = clamp(d.ers + (d.mode === "eco" ? 0.10 : 0.05) - (d.mode === "attack" ? 0.07 : 0.03), 0, 100);

      // posição no SVG
      const idxFloat = d.progress * (pathPoints.length - 1);
      const idx = Math.floor(idxFloat);
      const next = (idx + 1) % pathPoints.length;
      const p = pathPoints[idx];
      const p2 = pathPoints[next];
      if (!p || !p2) continue;

      const ang = angleBetween(p, p2);

      // wobble (estabilidade do setup reduz)
      const wobbleAmp = 0.9 * (2.0 - SETUP_MODS.stability);
      const wob = wobbleAmp * (0.5 - Math.random());
      const wob2 = wobbleAmp * (0.5 - Math.random());

      setCarTransform(d.id, p.x + wob, p.y + wob2, ang);
    }

    // Telemetria (atualiza com base no piloto selecionado)
    const source = myDrivers.find(x => x.id === telemetryDriverId) || myDrivers[0];
    const idxOnPath = Math.floor(source.progress * (pathPoints.length - 1));
    const t = computeTelemetry(source, idxOnPath, dtSec);
    const lapMs = performance.now() - source.lapStartAt;
    updateTelemetryUI(source, t, lapMs);

    // UI listas
    updatePilotCards();
    renderDriversOnTrackList();

    requestAnimationFrame(tick);
  }

  // =========================
  // 14) LOAD SVG (robusto)
  // =========================
  async function loadTrackSVG() {
    const res = await fetch(trackData.svg, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar SVG: ${trackData.svg} (HTTP ${res.status})`);
    const svgText = await res.text();

    elTrackContainer.innerHTML = svgText;

    svgRoot = elTrackContainer.querySelector("svg");
    if (!svgRoot) throw new Error("SVG root não encontrado no container");

    ensureSvgResponsive(svgRoot);

    trackPath = findBestTrackPath(svgRoot);
    if (!trackPath) throw new Error("Nenhum <path> válido encontrado no SVG (race line)");

    pathPoints = buildPathPoints(trackPath, 1800);
    if (!pathPoints || pathPoints.length < 80) throw new Error("Falha ao gerar pathPoints (path curto/inválido)");

    const routeLayer = createSvgLayer(svgRoot, "routeLayer");
    const carsLayer = createSvgLayer(svgRoot, "carsLayer");

    // Desenha a “linha do trajeto” sutil (sem alterar o mapa bruscamente)
    const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pl.setAttribute("fill", "none");
    pl.setAttribute("stroke", "rgba(255,255,255,0.26)");
    pl.setAttribute("stroke-width", "4");
    pl.setAttribute("stroke-linecap", "round");
    pl.setAttribute("stroke-linejoin", "round");
    pl.setAttribute("opacity", "0.9");
    const pts = pathPoints.slice();
    pts.push(pts[0]);
    pl.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
    routeLayer.appendChild(pl);

    // carros
    carNodes.clear();
    for (const d of myDrivers) createCarNode(carsLayer, d);
  }

  // =========================
  // 15) CONTROLES (globais p/ onclick do HTML)
  // =========================
  window.setSpeed = (mult) => {
    SESSION.speedMultiplier = (mult === 2 || mult === 4) ? mult : 1;
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
    const active = document.querySelector(`.speed-btn[data-speed="${SESSION.speedMultiplier}"]`);
    if (active) active.classList.add("active");
    if (elHudLiveTag) elHudLiveTag.textContent = `LIVE • ${SESSION.speedMultiplier}x`;
  };

  window.setMode = (id, mode) => {
    const d = myDrivers.find(x => x.id === Number(id));
    if (!d) return;
    if (mode !== "eco" && mode !== "attack") mode = "normal";
    d.mode = mode;
    updatePilotCards();

    // mantém telemetria coerente com o piloto selecionado
    if (telemetryDriverId === d.id) {
      if (tel.mode) tel.mode.textContent = d.mode.toUpperCase();
    }
  };

  window.pitStop = (id) => {
    const d = myDrivers.find(x => x.id === Number(id));
    if (!d) return;

    // pit: troca pneus, rebaixa temp, recupera ERS, pequena penalidade “simulada”
    d.tire.wear = 0;
    d.tire.temp = 88;
    d.ers = clamp(d.ers + 20, 0, 100);

    // combustível no treino: “reabastece” parcialmente (para rodar)
    d.fuel = clamp(d.fuel + 18, 0, 100);

    updatePilotCards();
  };

  // =========================
  // 16) NAV / BOTÕES
  // =========================
  function bindNavButtons() {
    if (btnBackLobby) {
      btnBackLobby.addEventListener("click", () => {
        window.location.href = `lobby.html?${urlParams.toString()}`;
      });
    }
    if (btnGoOficina) {
      btnGoOficina.addEventListener("click", () => {
        // volta para treino mantendo params (oficina usa os mesmos)
        window.location.href = `oficina.html?track=${encodeURIComponent(TRACK_KEY)}&userTeam=${encodeURIComponent(TEAM_KEY)}&gp=${encodeURIComponent(urlParams.get("gp") || "GP da Austrália 2025")}`;
      });
    }
    if (btnGoQualy) {
      btnGoQualy.addEventListener("click", () => {
        window.location.href = `qualifying.html?track=${encodeURIComponent(TRACK_KEY)}&userTeam=${encodeURIComponent(TEAM_KEY)}&gp=${encodeURIComponent(urlParams.get("gp") || "GP da Austrália 2025")}`;
      });
    }
  }

  // =========================
  // 17) INIT
  // =========================
  function initTop() {
    if (elTrackName) elTrackName.textContent = trackData.name;

    if (elTeamLogoTop) {
      elTeamLogoTop.src = TEAM_LOGO[TEAM_KEY] || TEAM_LOGO.ferrari;
      elTeamLogoTop.onerror = () => { elTeamLogoTop.onerror = null; elTeamLogoTop.src = TEAM_LOGO.ferrari; };
    }

    if (elHudLiveTag) elHudLiveTag.textContent = "LIVE • 1x";
    if (tel.source) tel.source.textContent = myDrivers[0].name;
    setTelemetryDriver(1);
    initSpark();
  }

  async function start() {
    try {
      initTop();
      bindNavButtons();

      await loadTrackSVG();

      updatePilotCards();
      renderDriversOnTrackList();

      requestAnimationFrame(tick);
    } catch (err) {
      console.error("PRACTICE INIT ERROR:", err);
      elTrackContainer.innerHTML = `
        <div style="padding:14px; color:#fff;">
          <div style="font-weight:900; margin-bottom:8px;">Erro ao carregar o Treino Livre</div>
          <div style="opacity:.9; font-size:13px; line-height:1.45;">${String(err.message || err)}</div>
          <div style="opacity:.75; font-size:12px; margin-top:8px;">
            Verifique se existe: <b>${trackData.svg}</b> e se contém um <b>&lt;path&gt;</b> válido.
          </div>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();
