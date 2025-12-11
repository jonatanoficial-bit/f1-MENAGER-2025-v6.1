// =====================================================
// F1 MANAGER 2025 – PRACTICE (v6.1) — FINAL v3
// Correção principal: carregar faces reais em assets/faces/*.png (ex: ALO.png)
// - Resolve face via querystring (?p1=ALO&p2=...)
// - Resolve via localStorage (vários formatos) se existir
// - Fallback inteligente: tenta "assets/faces/ALO.png" e também ".PNG"
// - Se falhar, usa placeholder (não quebra UI)
// Mantém: cronômetro, speed 1x/2x/4x, pathPoints estilo QUALIFYING
// =====================================================

(() => {
  "use strict";

  // =========================
  // 1) PARAMS
  // =========================
  const urlParams = new URLSearchParams(window.location.search);
  const TRACK_KEY = (urlParams.get("track") || "australia").toLowerCase();
  const TEAM_KEY  = (urlParams.get("userTeam") || "ferrari").toLowerCase();

  // Faces por URL (opcional)
  // Ex: practice.html?track=australia&userTeam=ferrari&p1=ALO&p2=LEC
  const P1_CODE = (urlParams.get("p1") || "").trim();
  const P2_CODE = (urlParams.get("p2") || "").trim();

  // =========================
  // 2) TEAMS / TRACKS
  // =========================
  const TEAMS = {
    ferrari:  { color: "#ff2a2a", name: "Ferrari",  logo: "assets/logos/ferrari.png" },
    mercedes: { color: "#00e5ff", name: "Mercedes", logo: "assets/logos/mercedes.png" },
    redbull:  { color: "#ffb300", name: "Red Bull", logo: "assets/logos/redbull.png" },
    mclaren:  { color: "#ff8c00", name: "McLaren",  logo: "assets/logos/mclaren.png" },
    sauber:   { color: "#d0d0ff", name: "Sauber",   logo: "assets/logos/sauber.png" }
  };

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

  const trackData = TRACKS[TRACK_KEY] || TRACKS.australia;
  const teamData  = TEAMS[TEAM_KEY]  || TEAMS.ferrari;

  // =========================
  // 3) DOM
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
  if (elSessionLabel) elSessionLabel.textContent = "LIVE";
  if (elP1Team) elP1Team.textContent = teamData.name;
  if (elP2Team) elP2Team.textContent = teamData.name;

  // =========================
  // 4) SETUP (OFICINA) — LOCALSTORAGE
  // =========================
  const DEFAULT_SETUP = { speed: 50, consumo: 50, grip: 50, estabilidade: 50 };

  function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }

  function loadSetupFromLocalStorage() {
    const keys = [
      "oficinaSetup",
      "oficina_setup",
      "setupData",
      "carSetup",
      "f1_manager_setup",
      "f1m_setup_v61"
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (obj && typeof obj === "object") return obj;
    }
    return null;
  }

  function normalizeSetup(obj) {
    const s = { ...DEFAULT_SETUP, ...(obj || {}) };

    if (obj) {
      if (typeof obj.velocidade !== "undefined") s.speed = obj.velocidade;
      if (typeof obj.consumption !== "undefined") s.consumo = obj.consumption;
      if (typeof obj.consumo !== "undefined") s.consumo = obj.consumo;
      if (typeof obj.stability !== "undefined") s.estabilidade = obj.stability;
      if (typeof obj.estabilidade !== "undefined") s.estabilidade = obj.estabilidade;
      if (typeof obj.grip !== "undefined") s.grip = obj.grip;
    }

    for (const k of ["speed", "consumo", "grip", "estabilidade"]) {
      const v = Number(s[k]);
      if (!Number.isFinite(v)) s[k] = DEFAULT_SETUP[k];
      else s[k] = (v <= 1 ? v * 100 : v);
      s[k] = Math.max(0, Math.min(100, s[k]));
    }
    return s;
  }

  const setup = normalizeSetup(loadSetupFromLocalStorage());

  // =========================
  // 5) AVATAR RESOLVER (ALO.png etc)
  // =========================
  const PLACEHOLDER_FACE = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#111827"/>
          <stop offset="1" stop-color="#0b1220"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="22" fill="url(#g)"/>
      <circle cx="80" cy="62" r="26" fill="#ffffff" opacity="0.14"/>
      <path d="M35 134c9-26 33-40 45-40s36 14 45 40" fill="#ffffff" opacity="0.10"/>
      <circle cx="80" cy="80" r="72" fill="none" stroke="#ffffff" opacity="0.10" stroke-width="2"/>
    </svg>
  `)}`;

  function normalizeFaceCode(code) {
    if (!code) return "";
    // mantém letras/números/_- (sem espaços)
    return String(code).trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function buildFaceCandidates(codeOrPath) {
    const s = String(codeOrPath || "").trim();
    if (!s) return [];

    // Se já é caminho
    if (s.includes("/") || s.endsWith(".png") || s.endsWith(".PNG")) {
      return [s];
    }

    // Se é um "código" tipo ALO, VER, HAM
    const code = normalizeFaceCode(s);
    if (!code) return [];

    // Seu exemplo: assets/faces/ALO.png (maiusculo)
    // Vamos tentar várias variações para não quebrar em case sensitive
    return [
      `assets/faces/${code}.png`,
      `assets/faces/${code}.PNG`,
      `assets/faces/${code.toUpperCase()}.png`,
      `assets/faces/${code.toUpperCase()}.PNG`,
      `assets/faces/${code.toLowerCase()}.png`,
      `assets/faces/${code.toLowerCase()}.PNG`,
    ];
  }

  function setImgWithCandidateFallback(imgEl, candidates) {
    if (!imgEl) return;

    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.referrerPolicy = "no-referrer";

    const list = (Array.isArray(candidates) ? candidates : []).filter(Boolean);
    let i = 0;

    const tryNext = () => {
      if (i >= list.length) {
        imgEl.onerror = null;
        imgEl.src = PLACEHOLDER_FACE;
        return;
      }
      const src = list[i++];
      imgEl.onerror = tryNext;
      imgEl.src = src;
    };

    tryNext();
  }

  function resolveFaceFromStorage(driverIndex) {
    // Tentativas de chaves comuns de save/manager
    const keys = ["managerData", "careerData", "save_career_v61", "f1m_career_v61"];

    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (!obj) continue;

      // 1) faces array direto
      const faces = obj.teamFaces || obj.faces || obj.driverFaces;
      if (Array.isArray(faces) && faces[driverIndex]) return faces[driverIndex];

      // 2) roster/driver objects
      const roster = obj.roster || obj.drivers || obj.pilotos;
      if (Array.isArray(roster) && roster[driverIndex]) {
        const face = roster[driverIndex].face || roster[driverIndex].foto || roster[driverIndex].img || roster[driverIndex].code;
        if (face) return face;
      }

      // 3) códigos separados
      const codes = obj.driverCodes || obj.codes || obj.pilotCodes;
      if (Array.isArray(codes) && codes[driverIndex]) return codes[driverIndex];
    }

    return "";
  }

  function resolveFaceFinal(driverIndex, urlCode) {
    const fromUrl = normalizeFaceCode(urlCode);
    if (fromUrl) return fromUrl;

    const fromStorage = resolveFaceFromStorage(driverIndex);
    if (fromStorage) return fromStorage;

    // último fallback: default (se existir no seu repo)
    return "default";
  }

  // =========================
  // 6) DRIVERS
  // =========================
  const myDrivers = [
    {
      id: 1,
      name: "Piloto 1",
      faceCode: resolveFaceFinal(0, P1_CODE),
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
      name: "Piloto 2",
      faceCode: resolveFaceFinal(1, P2_CODE),
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

  if (elP1Name) elP1Name.textContent = myDrivers[0].name;
  if (elP2Name) elP2Name.textContent = myDrivers[1].name;

  // Aplicar faces com fallback robusto (ALO.png etc)
  setImgWithCandidateFallback(elP1Face, buildFaceCandidates(myDrivers[0].faceCode));
  setImgWithCandidateFallback(elP2Face, buildFaceCandidates(myDrivers[1].faceCode));

  // =========================
  // 7) SVG / PATH POINTS (QUALIFYING)
  // =========================
  let svgRoot = null;
  let trackPath = null;
  let pathPoints = [];
  const carNodes = new Map();

  function ensureSvgResponsive(svg) {
    if (!svg.hasAttribute("viewBox")) {
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
    const preferred = svg.querySelector("#raceLine");
    if (preferred && preferred.tagName.toLowerCase() === "path") return preferred;

    // Pega o MAIOR path (mais seguro quando há paths decorativos)
    const paths = [...svg.querySelectorAll("path")];
    let best = null;
    let bestLen = -1;

    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (Number.isFinite(len) && len > bestLen) {
          bestLen = len;
          best = p;
        }
      } catch { /* ignore */ }
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
  // 8) SIMULAÇÃO
  // =========================
  function lerp(a, b, t) { return a + (b - a) * t; }

  function calcDriverPaceFactor(driver) {
    const speedBoost = lerp(0.88, 1.18, setup.speed / 100);
    const gripBoost  = lerp(0.92, 1.10, setup.grip  / 100);
    const tirePenalty = lerp(1.0, 0.72, driver.tire.wear / 100);
    const fuelPenalty = lerp(1.0, 0.84, (100 - driver.fuel) / 100);

    let modeFactor = 1.0;
    if (driver.mode === "eco") modeFactor = 0.90;
    if (driver.mode === "attack") modeFactor = 1.08;

    return speedBoost * gripBoost * tirePenalty * fuelPenalty * modeFactor;
  }

  function calcStabilityWobble() {
    const st = setup.estabilidade / 100;
    return lerp(2.6, 0.25, st);
  }

  function consumeResources(driver, dtSim) {
    const consumoBase = lerp(0.018, 0.060, setup.consumo / 100);
    let modeFuel = 1.0, modeWear = 1.0;
    if (driver.mode === "eco")    { modeFuel = 0.75; modeWear = 0.86; }
    if (driver.mode === "attack") { modeFuel = 1.18; modeWear = 1.22; }

    driver.fuel = Math.max(0, driver.fuel - (consumoBase * 100 * modeFuel * dtSim));

    const wearBase = lerp(0.010, 0.040, (100 - setup.grip) / 100);
    driver.tire.wear = Math.min(100, driver.tire.wear + (wearBase * 100 * modeWear * dtSim));
  }

  // =========================
  // 9) UI
  // =========================
  function fmtMsToLap(ms) {
    if (!Number.isFinite(ms) || ms === Infinity) return "--:--.---";
    const total = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const millis  = total % 1000;
    return `${String(minutes)}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
  }

  function fmtMMSS(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
  }

  function buildPilotInfoHTML(d) {
    const modeLabel = d.mode === "attack" ? "ATAQUE" : d.mode === "eco" ? "ECONOMIZAR" : "NORMAL";
    return `
      <div style="font-weight:700; font-size:14px; margin-bottom:6px;">${d.name}</div>
      <div style="opacity:.95; font-size:12px; line-height:1.35;">
        <div>Modo: <b>${modeLabel}</b></div>
        <div>${d.tire.compound} • Desgaste ${d.tire.wear.toFixed(0)}%</div>
        <div>Combustível ${d.fuel.toFixed(0)}%</div>
        <div>Voltas: ${d.lap}</div>
        <div>Última volta: ${fmtMsToLap(d.lastLapMs)}</div>
        <div>Melhor volta: ${fmtMsToLap(d.bestLapMs)}</div>
      </div>
    `;
  }

  function updatePilotCards() {
    if (elP1Info) elP1Info.innerHTML = buildPilotInfoHTML(myDrivers[0]);
    if (elP2Info) elP2Info.innerHTML = buildPilotInfoHTML(myDrivers[1]);
  }

  function renderDriversOnTrackList() {
    if (!elDriversOnTrack) return;
    elDriversOnTrack.innerHTML = myDrivers
      .slice()
      .sort((a,b) => b.lap - a.lap || b.posF - a.posF)
      .map((d, idx) => `
        <div style="display:flex; align-items:center; gap:10px; margin:8px 0;">
          <div style="width:10px; height:10px; border-radius:50%; background:${teamData.color}; box-shadow:0 0 0 2px rgba(255,255,255,.25);"></div>
          <div style="font-size:12px; opacity:.95;">
            <b>#${idx+1}</b> ${d.name} • V${d.lap} • ${fmtMsToLap(d.bestLapMs)}
          </div>
        </div>
      `).join("");
  }

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
  // 10) SESSION
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
    if (elBestLapOverall) elBestLapOverall.textContent = fmtMsToLap(SESSION.bestLapMs);
  }

  function handleLapCrossing(driver, prevIdx, nextIdx) {
    if (pathPoints.length < 10) return;
    if (prevIdx > nextIdx) {
      driver.lap += 1;
      const now = performance.now();
      const lapMs = now - driver.lapStartAt;
      driver.lapStartAt = now;
      driver.lastLapMs = lapMs;
      driver.bestLapMs = Math.min(driver.bestLapMs, lapMs);
      SESSION.bestLapMs = Math.min(SESSION.bestLapMs, lapMs);
    }
  }

  function tick(now) {
    const dtReal = Math.min(0.05, Math.max(0.0, (now - SESSION.lastFrameAt) / 1000));
    SESSION.lastFrameAt = now;

    if (SESSION.running) {
      const dtSim = dtReal * SESSION.speedMultiplier;
      SESSION.elapsedSim += dtSim;

      if (SESSION.elapsedSim >= SESSION.sessionSeconds) {
        SESSION.elapsedSim = SESSION.sessionSeconds;
        SESSION.running = false;
        if (elSessionLabel) elSessionLabel.textContent = "FINAL";
      }

      const wobbleAmp = calcStabilityWobble();
      for (const d of myDrivers) {
        const pace = calcDriverPaceFactor(d);
        const baseStep = 18.0;
        const step = baseStep * pace * dtSim;

        const prevPosF = d.posF;
        d.posF = (d.posF + step) % pathPoints.length;

        consumeResources(d, dtSim);

        const prevIdx = Math.floor(prevPosF) % pathPoints.length;
        const idx = Math.floor(d.posF) % pathPoints.length;
        const nextIdx = (idx + 1) % pathPoints.length;

        handleLapCrossing(d, prevIdx, idx);

        const p = pathPoints[idx];
        const p2 = pathPoints[nextIdx];

        const wobx = wobbleAmp * (0.5 - Math.random());
        const woby = wobbleAmp * (0.5 - Math.random());
        setCarTransform(d.id, p.x + wobx, p.y + woby, angleBetween(p, p2));
      }
    }

    updatePilotCards();
    renderDriversOnTrackList();
    updateSessionUI();

    requestAnimationFrame(tick);
  }

  // =========================
  // 11) LOAD SVG
  // =========================
  async function loadTrackSVG() {
    try {
      const res = await fetch(trackData.svg, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();
      elTrackContainer.innerHTML = svgText;

      svgRoot = elTrackContainer.querySelector("svg");
      if (!svgRoot) throw new Error("SVG root não encontrado.");

      ensureSvgResponsive(svgRoot);

      trackPath = findBestTrackPath(svgRoot);
      if (!trackPath) throw new Error("Nenhum <path> válido encontrado no SVG.");

      pathPoints = buildPathPointsFromPath(trackPath, 1600);
      if (!pathPoints || pathPoints.length < 80) throw new Error("Falha ao gerar pathPoints.");

      carNodes.clear();
      createCarNode(svgRoot, 1, teamData.color);
      createCarNode(svgRoot, 2, teamData.color);

      // posicionamento inicial
      for (const d of myDrivers) {
        const idx = Math.floor(d.posF) % pathPoints.length;
        const next = (idx + 1) % pathPoints.length;
        const p = pathPoints[idx];
        const p2 = pathPoints[next];
        setCarTransform(d.id, p.x, p.y, angleBetween(p, p2));
      }

      injectTeamLogoTop();

      SESSION.lastFrameAt = performance.now();
      updateSessionUI();
      requestAnimationFrame(tick);
    } catch (err) {
      console.error("Practice init error:", err);
      elTrackContainer.innerHTML = `
        <div style="padding:18px; color:#fff; font-family:system-ui; max-width:680px;">
          <div style="font-weight:800; font-size:16px; margin-bottom:8px;">Erro ao iniciar Treino Livre</div>
          <div style="opacity:.9; font-size:13px; line-height:1.4;">${String(err.message || err)}</div>
          <div style="opacity:.75; font-size:12px; margin-top:10px;">
            Dica: marque o path principal do SVG com <b>id="raceLine"</b>.
          </div>
        </div>
      `;
    }
  }

  // =========================
  // 12) CONTROLES (GLOBAIS)
  // =========================
  window.setSpeed = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    SESSION.speedMultiplier = n;
    if (elSessionLabel) elSessionLabel.textContent = (SESSION.running ? "LIVE" : "FINAL") + ` • ${n}x`;
  };

  window.setMode = (id, mode) => {
    const d = myDrivers.find(x => x.id === Number(id));
    if (!d) return;
    if (mode !== "eco" && mode !== "attack") mode = "normal";
    d.mode = mode;
    updatePilotCards();
  };

  window.pitStop = (id) => {
    const d = myDrivers.find(x => x.id === Number(id));
    if (!d) return;
    d.tire.compound = "SOFT";
    d.tire.wear = 0;
    d.fuel = Math.min(100, d.fuel + 18);
    d.mode = "normal";
    updatePilotCards();
  };

  // =========================
  // 13) START
  // =========================
  updatePilotCards();
  renderDriversOnTrackList();
  updateSessionUI();
  loadTrackSVG();
})();
