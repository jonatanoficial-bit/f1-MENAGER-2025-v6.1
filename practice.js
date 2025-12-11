// =====================================================
// F1 MANAGER 2025 – PRACTICE.JS (v6.1) — STABLE FINAL
// Corrige: tela travada, cronômetro parado, carros sem mover,
// SVG desconfigurado (viewBox/fit), path errado (pega maior path / #raceLine)
// Mantém: pathPoints (qualifying-like), requestAnimationFrame, 1x/2x/4x,
// 2 carros do userTeam, botões: Oficina / Qualifying / Lobby
// Faces: assets/faces/CODE.png (ex: LEC.png) com fallback robusto
// Setup (OFICINA): lê localStorage["f1m_setup_v61"] (fallback em outras chaves)
// =====================================================

(() => {
  "use strict";

  // =========================
  // 1) PARAMS
  // =========================
  const urlParams = new URLSearchParams(window.location.search);
  const TRACK_KEY = (urlParams.get("track") || "australia").toLowerCase();
  const TEAM_KEY  = (urlParams.get("userTeam") || "ferrari").toLowerCase();
  const GP_LABEL  = (urlParams.get("gp") || "").trim();

  // =========================
  // 2) TRACKS / TEAMS (mínimo necessário)
  // =========================
  const TRACKS = {
    australia: { name: "Albert Park – Melbourne", svg: "assets/tracks/australia.svg" },
    bahrain:   { name: "Bahrain – Sakhir",        svg: "assets/tracks/bahrain.svg" },
    saudi:     { name: "Saudi Arabia – Jeddah",   svg: "assets/tracks/saudi.svg" },
    japan:     { name: "Japan – Suzuka",          svg: "assets/tracks/japan.svg" },
    china:     { name: "China – Shanghai",        svg: "assets/tracks/china.svg" },
    miami:     { name: "Miami – USA",             svg: "assets/tracks/miami.svg" },
    imola:     { name: "Emilia-Romagna – Imola",  svg: "assets/tracks/imola.svg" },
    monaco:    { name: "Monaco – Monte Carlo",    svg: "assets/tracks/monaco.svg" },
    canada:    { name: "Canada – Montréal",       svg: "assets/tracks/canada.svg" },
    spain:     { name: "Spain – Barcelona",       svg: "assets/tracks/spain.svg" },
    austria:   { name: "Austria – Spielberg",     svg: "assets/tracks/austria.svg" },
    britain:   { name: "Great Britain – Silverstone", svg: "assets/tracks/britain.svg" },
    hungary:   { name: "Hungary – Hungaroring",   svg: "assets/tracks/hungary.svg" },
    belgium:   { name: "Belgium – Spa",           svg: "assets/tracks/belgium.svg" },
    netherlands:{ name: "Netherlands – Zandvoort",svg: "assets/tracks/netherlands.svg" },
    monza:     { name: "Italy – Monza",           svg: "assets/tracks/monza.svg" },
    azerbaijan:{ name: "Azerbaijan – Baku",       svg: "assets/tracks/azerbaijan.svg" },
    singapore: { name: "Singapore – Marina Bay",  svg: "assets/tracks/singapore.svg" },
    usa:       { name: "USA – Austin",            svg: "assets/tracks/usa.svg" },
    mexico:    { name: "Mexico – Mexico City",    svg: "assets/tracks/mexico.svg" },
    brazil:    { name: "Brazil – Interlagos",     svg: "assets/tracks/brazil.svg" },
    vegas:     { name: "Las Vegas – Street",      svg: "assets/tracks/lasvegas.svg" },
    qatar:     { name: "Qatar – Lusail",          svg: "assets/tracks/qatar.svg" },
    abudhabi:  { name: "Abu Dhabi – Yas Marina",  svg: "assets/tracks/abudhabi.svg" }
  };

  const TEAM_META = {
    ferrari:  { name: "Ferrari",  color: "#ff2a2a", logo: "assets/logos/ferrari.png" },
    mercedes: { name: "Mercedes", color: "#00e5ff", logo: "assets/logos/mercedes.png" },
    redbull:  { name: "Red Bull", color: "#ffb300", logo: "assets/logos/redbull.png" },
    mclaren:  { name: "McLaren",  color: "#ff8c00", logo: "assets/logos/mclaren.png" },
    aston:    { name: "Aston Martin", color: "#00b894", logo: "assets/logos/aston.png" },
    alpine:   { name: "Alpine",   color: "#4aa3ff", logo: "assets/logos/alpine.png" },
    williams: { name: "Williams", color: "#3b82f6", logo: "assets/logos/williams.png" },
    haas:     { name: "Haas",     color: "#e5e7eb", logo: "assets/logos/haas.png" },
    rb:       { name: "RB",       color: "#8b5cf6", logo: "assets/logos/rb.png" },
    sauber:   { name: "Sauber",   color: "#d0d0ff", logo: "assets/logos/sauber.png" }
  };

  const trackData = TRACKS[TRACK_KEY] || TRACKS.australia;
  const teamData  = TEAM_META[TEAM_KEY] || TEAM_META.ferrari;

  // =========================
  // 3) DOM (IDs do seu practice.html)
  // =========================
  const elTrackName      = document.getElementById("trackName");
  const elTrackContainer = document.getElementById("track-container");
  const elDriversOnTrack = document.getElementById("driversOnTrack");

  const elP1Face = document.getElementById("p1face");
  const elP2Face = document.getElementById("p2face");
  const elP1Info = document.getElementById("p1info");
  const elP2Info = document.getElementById("p2info");

  const elBestLapOverall = document.getElementById("bestLapOverall");
  const elTimeRemaining  = document.querySelector(".practice-time-remaining");
  const elSessionLabel   = document.querySelector(".practice-session-label");

  const elP1Name = document.getElementById("p1name");
  const elP2Name = document.getElementById("p2name");
  const elP1Team = document.getElementById("p1team");
  const elP2Team = document.getElementById("p2team");

  if (elTrackName) elTrackName.textContent = trackData.name;
  if (elP1Team) elP1Team.textContent = teamData.name;
  if (elP2Team) elP2Team.textContent = teamData.name;

  // =========================
  // 4) HELPERS
  // =========================
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp  = (a, b, t) => a + (b - a) * t;

  function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }

  function fmtMs(ms) {
    if (!Number.isFinite(ms) || ms === Infinity) return "--:--.---";
    ms = Math.max(0, Math.floor(ms));
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const x = ms % 1000;
    return `${m}:${String(s).padStart(2,"0")}.${String(x).padStart(3,"0")}`;
  }

  function fmtMMSS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
  }

  // =========================
  // 5) OFICINA SETUP (fonte oficial: f1m_setup_v61)
  // =========================
  const DEFAULT_TELEMETRY = {
    engineMap: 5,
    wingFront: 6,
    wingRear: 7,
    aeroBalance: 52,
    suspension: 6,
    diffEntry: 55,
    diffExit: 60,
    brakeBias: 54,
    tyrePressure: 21.5,
    fuelMix: 2,
    ersMode: 2
  };

  function loadTelemetry() {
    const keys = [
      "f1m_setup_v61",     // OFICIAL
      "carSetup",
      "oficinaSetup",
      "oficina_setup",
      "setupData",
      "f1_manager_setup"
    ];

    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (obj && typeof obj === "object") return { ...DEFAULT_TELEMETRY, ...obj };
    }
    return { ...DEFAULT_TELEMETRY };
  }

  const telemetry = (() => {
    const t = loadTelemetry();
    t.engineMap    = clamp(Number(t.engineMap) || 5, 1, 10);
    t.wingFront    = clamp(Number(t.wingFront) || 6, 1, 10);
    t.wingRear     = clamp(Number(t.wingRear) || 7, 1, 10);
    t.aeroBalance  = clamp(Number(t.aeroBalance) || 52, 45, 60);
    t.suspension   = clamp(Number(t.suspension) || 6, 1, 10);
    t.diffEntry    = clamp(Number(t.diffEntry) || 55, 40, 70);
    t.diffExit     = clamp(Number(t.diffExit) || 60, 40, 75);
    t.brakeBias    = clamp(Number(t.brakeBias) || 54, 50, 60);
    t.tyrePressure = clamp(Number(t.tyrePressure) || 21.5, 18.0, 26.0);
    t.fuelMix      = clamp(Number(t.fuelMix) || 2, 1, 3);
    t.ersMode      = clamp(Number(t.ersMode) || 2, 1, 3);
    return t;
  })();

  function calcTelemetryFactors() {
    // power ↑ com engineMap + fuelMix/ERS
    const enginePower = lerp(0.92, 1.10, (telemetry.engineMap - 1) / 9);
    const engineFuel  = lerp(0.85, 1.22, (telemetry.engineMap - 1) / 9);

    const fuelMixFactor = telemetry.fuelMix === 1 ? 0.95 : telemetry.fuelMix === 3 ? 1.03 : 1.00;
    const ersFactor     = telemetry.ersMode === 1 ? 0.98 : telemetry.ersMode === 3 ? 1.03 : 1.00;

    // wings: grip ↑ e drag ↑
    const wingMean = (telemetry.wingFront + telemetry.wingRear) / 2;
    const aeroGrip = lerp(0.92, 1.08, (wingMean - 1) / 9);
    const aeroDrag = lerp(0.92, 1.12, (wingMean - 1) / 9);

    // stability penalties
    const balanceDelta = Math.abs(telemetry.aeroBalance - 52);
    const stabilityPenalty = lerp(1.00, 0.92, clamp(balanceDelta / 8, 0, 1));

    const suspDelta = Math.abs(telemetry.suspension - 6);
    const suspStability = lerp(1.00, 0.93, clamp(suspDelta / 4, 0, 1));

    const diffAgg = (telemetry.diffEntry + telemetry.diffExit) / 2;
    const diffGrip = lerp(1.02, 0.96, clamp((diffAgg - 55) / 20, 0, 1));

    const brakeDelta = Math.abs(telemetry.brakeBias - 54);
    const brakeStab = lerp(1.00, 0.95, clamp(brakeDelta / 6, 0, 1));

    const pDelta = Math.abs(telemetry.tyrePressure - 21.5);
    const tyreGrip = lerp(1.00, 0.95, clamp(pDelta / 4.5, 0, 1));
    const tyreWear = lerp(1.00, 1.15, clamp(pDelta / 4.5, 0, 1));

    return {
      power: enginePower * fuelMixFactor * ersFactor,
      drag: aeroDrag,
      grip: aeroGrip * diffGrip * tyreGrip,
      stability: stabilityPenalty * suspStability * brakeStab,
      fuelUse: engineFuel * (telemetry.fuelMix === 1 ? 0.92 : telemetry.fuelMix === 3 ? 1.08 : 1.00),
      tyreWear
    };
  }

  const factors = calcTelemetryFactors();

  // =========================
  // 6) DRIVERS (2 do userTeam) — fonte única (localStorage) + fallback seguro
  // =========================
  const FALLBACK_TEAM_DRIVERS = {
    ferrari:  [{ code:"LEC", name:"Charles Leclerc" }, { code:"SAI", name:"Carlos Sainz" }],
    mercedes: [{ code:"HAM", name:"Lewis Hamilton" },  { code:"RUS", name:"George Russell" }],
    redbull:  [{ code:"VER", name:"Max Verstappen" },  { code:"PER", name:"Sergio Pérez" }],
    mclaren:  [{ code:"NOR", name:"Lando Norris" },    { code:"PIA", name:"Oscar Piastri" }],
    aston:    [{ code:"ALO", name:"Fernando Alonso" }, { code:"STR", name:"Lance Stroll" }],
    sauber:   [{ code:"BOT", name:"Valtteri Bottas" }, { code:"ZHO", name:"Zhou Guanyu" }],
    alpine:   [{ code:"OCO", name:"Esteban Ocon" },    { code:"GAS", name:"Pierre Gasly" }],
    williams: [{ code:"ALB", name:"Alex Albon" },      { code:"SAR", name:"Logan Sargeant" }],
    haas:     [{ code:"HUL", name:"Nico Hülkenberg" }, { code:"MAG", name:"Kevin Magnussen" }],
    rb:       [{ code:"TSU", name:"Yuki Tsunoda" },    { code:"RIC", name:"Daniel Ricciardo" }]
  };

  function tryGetDriversFromStorage() {
    // tenta encontrar o mesmo "pool" que Qualifying usa (sem adivinhar nome exato)
    const keys = ["careerData","seasonData","saveGame","save_career_v61","f1m_career_v61","managerData","gridData","qualifyingData"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (!obj) continue;

      const pools = [
        obj.DRIVERS_2025, obj.drivers, obj.pilots, obj.pilotos, obj.grid, obj.roster,
        (obj.data && (obj.data.drivers || obj.data.pilots || obj.data.DRIVERS_2025))
      ].filter(Boolean);

      for (const pool of pools) {
        if (!Array.isArray(pool)) continue;
        const teamDrivers = pool.filter(d => String(d.teamKey || d.team || d.equipe || "").toLowerCase() === TEAM_KEY);
        if (teamDrivers.length >= 2) {
          const a = teamDrivers[0], b = teamDrivers[1];
          return [
            { code: String(a.code || a.sigla || a.abbr || "").toUpperCase(), name: a.name || a.nome || "Piloto 1" },
            { code: String(b.code || b.sigla || b.abbr || "").toUpperCase(), name: b.name || b.nome || "Piloto 2" }
          ];
        }
      }
    }
    return null;
  }

  const baseDrivers = tryGetDriversFromStorage() || FALLBACK_TEAM_DRIVERS[TEAM_KEY] || FALLBACK_TEAM_DRIVERS.ferrari;

  // =========================
  // 7) FACES (case-safe) + fallback
  // =========================
  const PLACEHOLDER_FACE = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="22" fill="#0b1220"/>
      <circle cx="80" cy="62" r="26" fill="#ffffff" opacity="0.14"/>
      <path d="M35 134c9-26 33-40 45-40s36 14 45 40" fill="#ffffff" opacity="0.10"/>
    </svg>
  `)}`;

  function setFace(imgEl, code) {
    if (!imgEl) return;
    const c = String(code || "").trim().replace(/[^A-Za-z0-9_-]/g,"");
    if (!c) { imgEl.src = PLACEHOLDER_FACE; return; }

    const candidates = [
      `assets/faces/${c}.png`,
      `assets/faces/${c}.PNG`,
      `assets/faces/${c.toUpperCase()}.png`,
      `assets/faces/${c.toUpperCase()}.PNG`,
      `assets/faces/${c.toLowerCase()}.png`,
      `assets/faces/${c.toLowerCase()}.PNG`
    ];

    let i = 0;
    const tryNext = () => {
      if (i >= candidates.length) {
        imgEl.onerror = null;
        imgEl.src = PLACEHOLDER_FACE;
        return;
      }
      imgEl.onerror = tryNext;
      imgEl.src = candidates[i++];
    };
    tryNext();
  }

  // =========================
  // 8) STATE
  // =========================
  const drivers = [
    {
      id: 1,
      code: baseDrivers[0].code,
      name: baseDrivers[0].name,
      mode: "normal",
      tire: { compound: "SOFT", wear: 0 },
      fuel: 100,
      posF: 0,
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity
    },
    {
      id: 2,
      code: baseDrivers[1].code,
      name: baseDrivers[1].name,
      mode: "normal",
      tire: { compound: "SOFT", wear: 0 },
      fuel: 100,
      posF: 40,
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity
    }
  ];

  if (elP1Name) elP1Name.textContent = drivers[0].name;
  if (elP2Name) elP2Name.textContent = drivers[1].name;

  setFace(elP1Face, drivers[0].code);
  setFace(elP2Face, drivers[1].code);

  // =========================
  // 9) SVG / PATHPOINTS (robusto)
  // =========================
  let svgRoot = null;
  let trackPath = null;
  let pathPoints = [];
  const carNodes = new Map();

  function ensureSvgResponsive(svg) {
    // corrige pista "desconfigurada": garante viewBox + remove width/height
    if (!svg.getAttribute("viewBox")) {
      const w = parseFloat(svg.getAttribute("width") || "0");
      const h = parseFloat(svg.getAttribute("height") || "0");
      if (w > 0 && h > 0) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      else svg.setAttribute("viewBox", "0 0 1200 800");
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function findBestTrackPath(svg) {
    // prioridade: #raceLine se existir
    const preferred = svg.querySelector("#raceLine");
    if (preferred && preferred.tagName && preferred.tagName.toLowerCase() === "path") return preferred;

    // fallback: maior path por comprimento
    const paths = Array.from(svg.querySelectorAll("path"));
    let best = null;
    let bestLen = -1;

    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (Number.isFinite(len) && len > bestLen) {
          bestLen = len;
          best = p;
        }
      } catch {}
    }
    return best;
  }

  function buildPathPointsFromPath(path, sampleCount = 1600) {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return [];
    const pts = [];
    const step = total / sampleCount;
    for (let i = 0; i <= sampleCount; i++) {
      const pt = path.getPointAtLength(i * step);
      pts.push({ x: pt.x, y: pt.y });
    }
    return pts;
  }

  function angleBetween(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  function createCarNode(svg, driverId, colorHex) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "car-dot");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    shadow.setAttribute("r", "10");
    shadow.setAttribute("fill", "rgba(0,0,0,0.35)");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "7.5");
    dot.setAttribute("fill", colorHex);

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("r", "9");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "rgba(255,255,255,0.65)");
    ring.setAttribute("stroke-width", "1.25");

    g.appendChild(shadow);
    g.appendChild(dot);
    g.appendChild(ring);

    svg.appendChild(g);
    carNodes.set(driverId, g);
    return g;
  }

  function setCarTransform(driverId, x, y, angleDeg) {
    const node = carNodes.get(driverId);
    if (!node) return;
    node.setAttribute("transform", `translate(${x} ${y}) rotate(${angleDeg})`);
  }

  // =========================
  // 10) SESSION / LOOP (cronômetro + speed)
  // =========================
  const SESSION = {
    running: true,
    speedMultiplier: 1,
    lastFrameAt: performance.now(),
    sessionSeconds: 60 * 60,
    elapsedSim: 0,
    bestLapMs: Infinity
  };

  function updateSessionUI() {
    const remaining = Math.max(0, SESSION.sessionSeconds - SESSION.elapsedSim);
    if (elTimeRemaining) elTimeRemaining.textContent = fmtMMSS(remaining);
    if (elBestLapOverall) elBestLapOverall.textContent = fmtMs(SESSION.bestLapMs);
  }

  function handleLapCrossing(d, prevIdx, idx) {
    if (prevIdx > idx) {
      d.lap += 1;
      const now = performance.now();
      const lapMs = now - d.lapStartAt;
      d.lapStartAt = now;
      d.lastLapMs = lapMs;
      d.bestLapMs = Math.min(d.bestLapMs, lapMs);
      SESSION.bestLapMs = Math.min(SESSION.bestLapMs, lapMs);
    }
  }

  function calcPace(d) {
    const power = factors.power;
    const drag  = factors.drag;
    const grip  = factors.grip;
    const stab  = factors.stability;

    let mode = 1.0;
    if (d.mode === "eco") mode = 0.92;
    if (d.mode === "attack") mode = 1.06;

    const tirePenalty = lerp(1.0, 0.74, d.tire.wear / 100);
    const fuelPenalty = lerp(1.0, 0.86, (100 - d.fuel) / 100);

    const aeroNet = (grip / drag);
    return power * aeroNet * stab * mode * tirePenalty * fuelPenalty;
  }

  function stabilityWobble() {
    return lerp(2.6, 0.25, clamp(factors.stability, 0.85, 1.0));
  }

  function consume(d, dtSim) {
    const baseFuel = 0.020; // %/s
    const baseWear = 0.014; // %/s
    let modeFuel = 1.0, modeWear = 1.0;
    if (d.mode === "eco")    { modeFuel = 0.78; modeWear = 0.88; }
    if (d.mode === "attack") { modeFuel = 1.18; modeWear = 1.22; }

    d.fuel = Math.max(0, d.fuel - (baseFuel * 100 * factors.fuelUse * modeFuel * dtSim));
    d.tire.wear = Math.min(100, d.tire.wear + (baseWear * 100 * factors.tyreWear * modeWear * dtSim));
  }

  function renderRightList() {
    if (!elDriversOnTrack) return;
    elDriversOnTrack.innerHTML = drivers
      .slice()
      .sort((a,b) => b.lap - a.lap || b.posF - a.posF)
      .map((d, i) => `
        <div style="display:flex; align-items:center; gap:10px; margin:8px 0;">
          <div style="width:10px; height:10px; border-radius:50%; background:${teamData.color}; box-shadow:0 0 0 2px rgba(255,255,255,.25);"></div>
          <div style="font-size:12px; opacity:.95;">
            <b>#${i+1}</b> ${d.name} • V${d.lap} • ${fmtMs(d.bestLapMs)}
          </div>
        </div>
      `).join("");
  }

  function pilotCardHTML(d) {
    const modeLabel = d.mode === "attack" ? "ATAQUE" : d.mode === "eco" ? "ECONOMIZAR" : "NORMAL";
    return `
      <div style="opacity:.95; font-size:12px; line-height:1.35;">
        <div>Modo: <b>${modeLabel}</b></div>
        <div>${d.tire.compound} • Desgaste ${d.tire.wear.toFixed(0)}%</div>
        <div>Combustível ${d.fuel.toFixed(0)}%</div>
        <div>Voltas: ${d.lap}</div>
        <div>Última volta: ${fmtMs(d.lastLapMs)}</div>
        <div>Melhor volta: ${fmtMs(d.bestLapMs)}</div>
      </div>
    `;
  }

  function updatePilotCards() {
    if (elP1Info) elP1Info.innerHTML = pilotCardHTML(drivers[0]);
    if (elP2Info) elP2Info.innerHTML = pilotCardHTML(drivers[1]);
  }

  function tick(now) {
    const dtReal = Math.min(0.05, Math.max(0, (now - SESSION.lastFrameAt) / 1000));
    SESSION.lastFrameAt = now;

    // se SVG/path ainda não carregou, mantém loop vivo (não trava)
    if (!pathPoints || pathPoints.length < 50) {
      updatePilotCards();
      renderRightList();
      updateSessionUI();
      requestAnimationFrame(tick);
      return;
    }

    if (SESSION.running) {
      const dtSim = dtReal * SESSION.speedMultiplier;
      SESSION.elapsedSim += dtSim;

      if (SESSION.elapsedSim >= SESSION.sessionSeconds) {
        SESSION.elapsedSim = SESSION.sessionSeconds;
        SESSION.running = false;
        if (elSessionLabel) elSessionLabel.textContent = "FINAL";
      }

      const wob = stabilityWobble();

      for (const d of drivers) {
        const pace = calcPace(d);
        const baseStep = 18.0;
        const step = baseStep * pace * dtSim;

        const prev = d.posF;
        d.posF = (d.posF + step) % pathPoints.length;

        consume(d, dtSim);

        const prevIdx = Math.floor(prev) % pathPoints.length;
        const idx = Math.floor(d.posF) % pathPoints.length;
        const nextIdx = (idx + 1) % pathPoints.length;

        handleLapCrossing(d, prevIdx, idx);

        const p  = pathPoints[idx];
        const p2 = pathPoints[nextIdx];

        const wobx = wob * (0.5 - Math.random());
        const woby = wob * (0.5 - Math.random());
        setCarTransform(d.id, p.x + wobx, p.y + woby, angleBetween(p, p2));
      }
    }

    updatePilotCards();
    renderRightList();
    updateSessionUI();
    requestAnimationFrame(tick);
  }

  // =========================
  // 11) TEAM LOGO TOP (apenas topo)
  // =========================
  function injectTeamLogoTop() {
    const topBar = document.getElementById("top-bar");
    if (!topBar) return;

    let img = document.getElementById("teamLogoTop");
    if (!img) {
      img = document.createElement("img");
      img.id = "teamLogoTop";
      img.alt = teamData.name;
      img.style.height = "30px";
      img.style.width = "auto";
      img.style.objectFit = "contain";
      img.style.marginRight = "10px";
      img.style.filter = "drop-shadow(0 2px 8px rgba(0,0,0,.45))";
      img.style.verticalAlign = "middle";
      topBar.insertBefore(img, topBar.firstChild);
    }
    img.src = teamData.logo;
  }

  // =========================
  // 12) LOAD SVG (robusto + NÃO TRAVA)
  // =========================
  async function loadTrackSVG() {
    try {
      const res = await fetch(trackData.svg, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao carregar SVG: HTTP ${res.status}`);

      const svgText = await res.text();
      elTrackContainer.innerHTML = svgText;

      svgRoot = elTrackContainer.querySelector("svg");
      if (!svgRoot) throw new Error("SVG root não encontrado (sem <svg>).");

      ensureSvgResponsive(svgRoot);

      trackPath = findBestTrackPath(svgRoot);
      if (!trackPath) throw new Error("Nenhum <path> encontrado no SVG (raceLine/maior path).");

      pathPoints = buildPathPointsFromPath(trackPath, 1600);
      if (!pathPoints || pathPoints.length < 80) throw new Error("Falha ao gerar pathPoints (pontos insuficientes).");

      carNodes.clear();
      createCarNode(svgRoot, 1, teamData.color);
      createCarNode(svgRoot, 2, teamData.color);

      // posição inicial
      for (const d of drivers) {
        const idx = Math.floor(d.posF) % pathPoints.length;
        const next = (idx + 1) % pathPoints.length;
        const p  = pathPoints[idx];
        const p2 = pathPoints[next];
        setCarTransform(d.id, p.x, p.y, angleBetween(p, p2));
      }

      injectTeamLogoTop();

    } catch (err) {
      console.error("Practice SVG error:", err);
      elTrackContainer.innerHTML = `
        <div style="padding:16px; color:#fff; font-family:system-ui; max-width:720px;">
          <div style="font-weight:800; font-size:16px; margin-bottom:6px;">Erro no Treino Livre</div>
          <div style="opacity:.9; font-size:13px; line-height:1.45;">${String(err.message || err)}</div>
          <div style="opacity:.75; font-size:12px; margin-top:10px;">
            Corrija o SVG definindo o path principal com <b>id="raceLine"</b> para máxima estabilidade.
          </div>
        </div>
      `;
    }
  }

  // =========================
  // 13) BOTÕES / NAVEGAÇÃO (conforme practice.html)
  // =========================
  function buildNextUrl(page) {
    const p = new URLSearchParams();
    p.set("track", TRACK_KEY);
    p.set("userTeam", TEAM_KEY);
    if (GP_LABEL) p.set("gp", GP_LABEL);
    return `${page}?${p.toString()}`;
  }

  function persistPractice() {
    const payload = {
      track: TRACK_KEY,
      userTeam: TEAM_KEY,
      gp: GP_LABEL || "",
      bestLapOverallMs: Number.isFinite(SESSION.bestLapMs) ? SESSION.bestLapMs : null,
      drivers: drivers.map(d => ({
        id: d.id, code: d.code, name: d.name,
        bestLapMs: Number.isFinite(d.bestLapMs) ? d.bestLapMs : null,
        lastLapMs: Number.isFinite(d.lastLapMs) ? d.lastLapMs : null,
        laps: d.lap
      })),
      telemetry,
      savedAt: Date.now()
    };
    localStorage.setItem("practiceResult_v61", JSON.stringify(payload));
  }

  // Funções chamadas pelo HTML
  window.goOficina = () => { persistPractice(); window.location.href = buildNextUrl("oficina.html"); };
  window.goQualifying = () => { persistPractice(); window.location.href = buildNextUrl("qualifying.html"); };

  // =========================
  // 14) CONTROLES (velocidade / modo / pit)
  // =========================
  window.setSpeed = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    SESSION.speedMultiplier = n;
    if (elSessionLabel) elSessionLabel.textContent = (SESSION.running ? "LIVE" : "FINAL") + ` • ${n}x`;
  };

  window.setMode = (id, mode) => {
    const d = drivers.find(x => x.id === Number(id));
    if (!d) return;
    if (mode !== "eco" && mode !== "attack") mode = "normal";
    d.mode = mode;
    updatePilotCards();
  };

  window.pitStop = (id) => {
    const d = drivers.find(x => x.id === Number(id));
    if (!d) return;
    d.tire.compound = "SOFT";
    d.tire.wear = 0;
    d.fuel = Math.min(100, d.fuel + 18);
    d.mode = "normal";
    updatePilotCards();
  };

  // =========================
  // 15) START (NÃO TRAVA)
  // =========================
  updatePilotCards();
  renderRightList();
  updateSessionUI();
  if (elSessionLabel) elSessionLabel.textContent = "LIVE";

  loadTrackSVG().finally(() => {
    // garante que o loop sempre inicia (mesmo com erro de SVG)
    SESSION.lastFrameAt = performance.now();
    requestAnimationFrame(tick);
  });

})();
