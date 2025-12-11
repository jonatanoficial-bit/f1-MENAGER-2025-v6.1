// =====================================================
// F1 MANAGER 2025 – PRACTICE (v6.1) — FINAL (SVG PATH)
// Lógica de pontos: estilo QUALIFYING (getPointAtLength)
// =====================================================

(() => {
  "use strict";

  // =========================
  // 1) PARAMS / CONTEXTO
  // =========================
  const urlParams = new URLSearchParams(window.location.search);
  const TRACK_KEY = (urlParams.get("track") || "australia").toLowerCase();
  const TEAM_KEY = (urlParams.get("userTeam") || "ferrari").toLowerCase();

  // =========================
  // 2) DADOS (MÍNIMOS / SAFE)
  // =========================
  const TEAMS = {
    ferrari:  { color: "#ff2a2a", name: "Ferrari",  logo: "assets/logos/ferrari.png" },
    mercedes: { color: "#00e5ff", name: "Mercedes", logo: "assets/logos/mercedes.png" },
    redbull:  { color: "#ffb300", name: "Red Bull", logo: "assets/logos/redbull.png" },
    mclaren:  { color: "#ff8c00", name: "McLaren",  logo: "assets/logos/mclaren.png" },
    sauber:   { color: "#d0d0ff", name: "Sauber",   logo: "assets/logos/sauber.png" }
  };

  // Se você tem 24 pistas, mantenha aqui a mesma chave/arquivo.
  // (Sem renomear SVGs!)
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
  // 3) ELEMENTOS DOM
  // =========================
  const elTrackName = document.getElementById("trackName");
  const elTrackContainer = document.getElementById("track-container");
  const elDriversOnTrack = document.getElementById("driversOnTrack");
  const elP1Face = document.getElementById("p1face");
  const elP2Face = document.getElementById("p2face");
  const elP1Info = document.getElementById("p1info");
  const elP2Info = document.getElementById("p2info");

  if (elTrackName) elTrackName.textContent = trackData.name;

  // =========================
  // 4) SETUP (OFICINA) — PERSISTÊNCIA
  // =========================
  const DEFAULT_SETUP = {
    // 0..100 (ou 0..1) — suportar ambos
    speed: 50,       // impacta velocidade
    consumo: 50,     // impacta desgaste combustível
    grip: 50,        // impacta ganho/consistência
    estabilidade: 50 // impacta wobble/erro
  };

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

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

    // aceitar sinônimos
    if (obj) {
      if (typeof obj.velocidade !== "undefined") s.speed = obj.velocidade;
      if (typeof obj.consumption !== "undefined") s.consumo = obj.consumption;
      if (typeof obj.consumo !== "undefined") s.consumo = obj.consumo;
      if (typeof obj.grip !== "undefined") s.grip = obj.grip;
      if (typeof obj.stability !== "undefined") s.estabilidade = obj.stability;
      if (typeof obj.estabilidade !== "undefined") s.estabilidade = obj.estabilidade;
    }

    // se vier 0..1 converter para 0..100
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
  // 5) ESTADO DA SESSÃO
  // =========================
  const SESSION = {
    running: true,
    speedMultiplier: 1,
    startedAt: performance.now(),
    lastFrameAt: performance.now(),
    sessionSeconds: 60 * 60, // 60:00
    elapsed: 0,
    bestLapMs: Infinity
  };

  // =========================
  // 6) PILOTOS (2 da equipe)
  // =========================
  function resolveFacePath(driverIndex) {
    // se você tiver nomes reais no localStorage do manager, use aqui.
    // fallback para default.png
    const fallback = "assets/faces/default.png";
    const keys = [
      "managerData",
      "careerData",
      "save_career_v61",
      "f1m_career_v61"
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (!obj) continue;

      // tentativa de achar faces por equipe
      // (mantém compatível sem quebrar)
      if (obj.userTeam && String(obj.userTeam).toLowerCase() === TEAM_KEY) {
        const faces = obj.teamFaces || obj.faces || obj.driverFaces;
        if (Array.isArray(faces) && faces[driverIndex]) return faces[driverIndex];
      }
    }
    return fallback;
  }

  const myDrivers = [
    {
      id: 1,
      name: "Piloto 1",
      face: resolveFacePath(0),
      mode: "normal",          // eco | attack | normal
      tire: { compound: "SOFT", wear: 0 }, // wear 0..100
      fuel: 100,               // 0..100
      posF: 0,                 // posição float nos pontos
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity
    },
    {
      id: 2,
      name: "Piloto 2",
      face: resolveFacePath(1),
      mode: "normal",
      tire: { compound: "SOFT", wear: 0 },
      fuel: 100,
      posF: 40, // offset inicial para não colar
      lap: 0,
      lapStartAt: performance.now(),
      lastLapMs: null,
      bestLapMs: Infinity
    }
  ];

  if (elP1Face) elP1Face.src = myDrivers[0].face;
  if (elP2Face) elP2Face.src = myDrivers[1].face;

  // =========================
  // 7) SVG / PATH POINTS (QUALIFYING STYLE)
  // =========================
  let svgRoot = null;
  let trackPath = null;
  let pathPoints = [];
  let carNodes = new Map();

  function findBestTrackPath(svg) {
    // Prioridades comuns (sem depender de um único id)
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
      const el = svg.querySelector(sel);
      if (el && el.tagName.toLowerCase() === "path") return el;
    }
    return null;
  }

  function ensureSvgResponsive(svg) {
    // garantir viewBox para responsividade, sem distorcer
    const hasViewBox = svg.hasAttribute("viewBox");
    if (!hasViewBox) {
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      const wb = (w && h) ? `0 0 ${parseFloat(w)} ${parseFloat(h)}` : null;
      if (wb) svg.setAttribute("viewBox", wb);
    }
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.style.overflow = "visible";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function buildPathPointsFromPath(path, sampleCount = 1600) {
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0) return [];

    const pts = [];
    const step = total / sampleCount;

    for (let i = 0; i <= sampleCount; i++) {
      const p = path.getPointAtLength(i * step);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
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

  function angleBetween(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  // =========================
  // 8) FÍSICA / MODELOS (SETUP)
  // =========================
  function lerp(a, b, t) { return a + (b - a) * t; }

  function calcDriverPaceFactor(driver) {
    // base 1.0
    const speedBoost = lerp(0.85, 1.12, setup.speed / 100);
    const gripBoost = lerp(0.90, 1.08, setup.grip / 100);
    const tirePenalty = lerp(1.0, 0.70, driver.tire.wear / 100);
    const fuelPenalty = lerp(1.0, 0.82, (100 - driver.fuel) / 100);

    let modeFactor = 1.0;
    if (driver.mode === "eco") modeFactor = 0.92;
    if (driver.mode === "attack") modeFactor = 1.06;

    return speedBoost * gripBoost * tirePenalty * fuelPenalty * modeFactor;
  }

  function calcStabilityWobble() {
    // menor estabilidade -> mais "wobble"
    const st = setup.estabilidade / 100; // 0..1
    return lerp(2.8, 0.3, st);
  }

  function consumeResources(driver, dtSec) {
    // consumo (setup) + modo
    const consumoBase = lerp(0.020, 0.060, setup.consumo / 100); // por segundo
    let modeFuel = 1.0;
    let modeWear = 1.0;

    if (driver.mode === "eco") { modeFuel = 0.78; modeWear = 0.88; }
    if (driver.mode === "attack") { modeFuel = 1.18; modeWear = 1.22; }

    driver.fuel = Math.max(0, driver.fuel - (consumoBase * 100 * modeFuel * dtSec));

    const wearBase = lerp(0.010, 0.040, (100 - setup.grip) / 100); // menos grip -> mais desgaste
    driver.tire.wear = Math.min(100, driver.tire.wear + (wearBase * 100 * modeWear * dtSec));
  }

  // =========================
  // 9) UI / INFO
  // =========================
  function fmtMsToLap(ms) {
    if (!Number.isFinite(ms) || ms === Infinity) return "--:--.---";
    const total = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const millis  = total % 1000;
    return `${String(minutes).padStart(1,"0")}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
  }

  function updatePilotCards() {
    if (elP1Info) elP1Info.innerHTML = buildPilotInfoHTML(myDrivers[0]);
    if (elP2Info) elP2Info.innerHTML = buildPilotInfoHTML(myDrivers[1]);
  }

  function buildPilotInfoHTML(d) {
    const modeLabel = d.mode === "attack" ? "ATAQUE" : d.mode === "eco" ? "ECONOMIZAR" : "NORMAL";
    const tire = `${d.tire.compound} • Desgaste ${d.tire.wear.toFixed(0)}%`;
    const fuel = `Combustível ${d.fuel.toFixed(0)}%`;
    const last = `Última volta: ${fmtMsToLap(d.lastLapMs)}`;
    const best = `Melhor volta: ${fmtMsToLap(d.bestLapMs)}`;
    const lap  = `Voltas: ${d.lap}`;
    return `
      <div style="font-weight:700; font-size:14px; margin-bottom:6px;">${d.name}</div>
      <div style="opacity:.95; font-size:12px; line-height:1.35;">
        <div>Modo: <b>${modeLabel}</b></div>
        <div>${tire}</div>
        <div>${fuel}</div>
        <div>${lap}</div>
        <div>${last}</div>
        <div>${best}</div>
      </div>
    `;
  }

  function renderDriversOnTrackList() {
    if (!elDriversOnTrack) return;
    // lista simples (2 carros). Se você adicionar IA depois, encaixa aqui.
    const items = myDrivers
      .slice()
      .sort((a,b) => b.lap - a.lap || b.posF - a.posF)
      .map((d, idx) => {
        const col = teamData.color;
        return `
          <div style="display:flex; align-items:center; gap:10px; margin:8px 0;">
            <div style="width:10px; height:10px; border-radius:50%; background:${col}; box-shadow:0 0 0 2px rgba(255,255,255,.25);"></div>
            <div style="font-size:12px; opacity:.95;">
              <b>#${idx+1}</b> ${d.name} • V${d.lap} • ${fmtMsToLap(d.bestLapMs)}
            </div>
          </div>
        `;
      })
      .join("");
    elDriversOnTrack.innerHTML = items;
  }

  function injectTeamLogoTop() {
    // "Logo APENAS no topo" — injeta no header sem duplicar.
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
      // Insere no começo
      topBar.insertBefore(img, topBar.firstChild);
    }
    img.src = teamData.logo;
  }

  // =========================
  // 10) SIMULAÇÃO DE VOLTA
  // =========================
  function handleLapCrossing(driver, prevIdx, nextIdx) {
    // crossing: quando "volta" do fim para o começo
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

  // =========================
  // 11) LOOP PRINCIPAL
  // =========================
  function tick(now) {
    if (!SESSION.running) {
      SESSION.lastFrameAt = now;
      requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(0.05, Math.max(0.0, (now - SESSION.lastFrameAt) / 1000)); // clamp
    SESSION.lastFrameAt = now;

    // tempo sessão
    SESSION.elapsed += dt * SESSION.speedMultiplier;
    if (SESSION.elapsed >= SESSION.sessionSeconds) {
      SESSION.elapsed = SESSION.sessionSeconds;
      SESSION.running = false;
    }

    // move carros
    const wobbleAmp = calcStabilityWobble();
    for (const d of myDrivers) {
      const pace = calcDriverPaceFactor(d);
      const baseStep = 12.0; // pontos/seg em 1x (ajuste fino)
      const step = baseStep * pace * dt * SESSION.speedMultiplier;

      const prevPosF = d.posF;
      d.posF = (d.posF + step) % pathPoints.length;

      // consumo / desgaste
      consumeResources(d, dt * SESSION.speedMultiplier);

      const prevIdx = Math.floor(prevPosF) % pathPoints.length;
      const idx = Math.floor(d.posF) % pathPoints.length;
      const nextIdx = (idx + 1) % pathPoints.length;

      handleLapCrossing(d, prevIdx, idx);

      const p = pathPoints[idx];
      const p2 = pathPoints[nextIdx];

      // wobble leve (instabilidade) sem sair da pista (só micro deslocamento)
      const wob = wobbleAmp * (0.5 - Math.random());
      const wob2 = wobbleAmp * (0.5 - Math.random());

      const ang = angleBetween(p, p2);

      setCarTransform(d.id, p.x + wob, p.y + wob2, ang);
    }

    // UI
    updatePilotCards();
    renderDriversOnTrackList();

    requestAnimationFrame(tick);
  }

  // =========================
  // 12) LOAD SVG (ROBUSTO)
  // =========================
  async function loadTrackSVG() {
    try {
      const res = await fetch(trackData.svg, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();

      // inserir
      elTrackContainer.innerHTML = svgText;

      svgRoot = elTrackContainer.querySelector("svg");
      if (!svgRoot) throw new Error("SVG root não encontrado (verifique o arquivo da pista).");

      ensureSvgResponsive(svgRoot);

      trackPath = findBestTrackPath(svgRoot);
      if (!trackPath) throw new Error("Nenhum <path> encontrado no SVG para gerar pathPoints.");

      // pontos do path (lógica estilo qualifying)
      pathPoints = buildPathPointsFromPath(trackPath, 1600);
      if (!pathPoints || pathPoints.length < 50) {
        throw new Error("Falha ao gerar pathPoints (path muito curto ou inválido).");
      }

      // carros
      carNodes.clear();
      createCarNode(svgRoot, 1, teamData.color);
      createCarNode(svgRoot, 2, teamData.color);

      // posicionar inicial (sem undefined)
      for (const d of myDrivers) {
        const idx = Math.floor(d.posF) % pathPoints.length;
        const next = (idx + 1) % pathPoints.length;
        const p = pathPoints[idx];
        const p2 = pathPoints[next];
        const ang = angleBetween(p, p2);
        setCarTransform(d.id, p.x, p.y, ang);
      }

      // topo (logo única)
      injectTeamLogoTop();

      // iniciar loop
      SESSION.startedAt = performance.now();
      SESSION.lastFrameAt = performance.now();
      requestAnimationFrame(tick);
    } catch (err) {
      console.error("Practice SVG load/init error:", err);
      elTrackContainer.innerHTML = `
        <div style="padding:18px; color:#fff; font-family:system-ui; max-width:680px;">
          <div style="font-weight:800; font-size:16px; margin-bottom:8px;">Erro ao iniciar Treino Livre</div>
          <div style="opacity:.9; font-size:13px; line-height:1.4;">
            ${String(err.message || err)}
          </div>
          <div style="opacity:.75; font-size:12px; margin-top:10px;">
            Verifique o arquivo SVG em <b>${trackData.svg}</b> e se ele contém ao menos um <b>&lt;path&gt;</b>.
          </div>
        </div>
      `;
    }
  }

  // =========================
  // 13) CONTROLES (API GLOBAL)
  // =========================
  window.setSpeed = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    SESSION.speedMultiplier = n;
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

    // pit: troca pneu, recupera um pouco de combustível (simples e estável)
    d.tire.compound = "SOFT";
    d.tire.wear = 0;
    d.fuel = Math.min(100, d.fuel + 18);

    // pit também volta modo normal
    d.mode = "normal";

    updatePilotCards();
  };

  // =========================
  // 14) START
  // =========================
  updatePilotCards();
  renderDriversOnTrackList();
  loadTrackSVG();

  // =========================
  // 15) OBS: ARQUIVO INÚTIL?
  // =========================
  // Se existir no seu repo algum arquivo antigo do treino livre tipo:
  // "practiceSystem.js" ou "practice_old.js" (não referenciado por practice.html),
  // pode excluir do GitHub para evitar confusão.
})();
