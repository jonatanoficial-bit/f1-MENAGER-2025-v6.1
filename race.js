/* =========================================================
   F1 MANAGER 2025 — RACE.JS (FULL)
   - Grid 20 pilotos (fallback robusto)
   - Liga com quali (grid Q3 via localStorage)
   - PIT stop funcional + troca de pneus
   - Meteorologia (seco/chuva) + temperatura pista
   - Modos: Motor / Agressividade / ERS (impactam ritmo)
   - Atualiza HUD/Lista + "SEUS PILOTOS" (cards)
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------
     Utils
  --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function now() { return performance.now(); }

  function parseParams() {
    const u = new URL(location.href);
    return {
      track: (u.searchParams.get("track") || "australia").toLowerCase(),
      gp: u.searchParams.get("gp") || "GP",
      userTeam: (u.searchParams.get("userTeam") || "ferrari").toLowerCase()
    };
  }

  function safeJSONParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function pickFirstExistingLocalStorageKey(candidates) {
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.length > 2) return k;
    }
    return null;
  }

  // Procura “qualquer coisa” que pareça grid de quali no localStorage
  function findAnyQualiGridInLocalStorage() {
    const keys = Object.keys(localStorage);
    // preferências explícitas
    const explicit = pickFirstExistingLocalStorageKey([
      "fm25_quali_grid_q3",
      "fm25_quali_grid",
      "fm25_quali_result_q3",
      "quali_grid_q3",
      "quali_grid",
      "qualifying_grid",
      "q3_grid",
      "grid_q3"
    ]);
    if (explicit) return safeJSONParse(localStorage.getItem(explicit));

    // busca heurística
    for (const k of keys) {
      const lk = k.toLowerCase();
      if (lk.includes("quali") && (lk.includes("grid") || lk.includes("q3"))) {
        const parsed = safeJSONParse(localStorage.getItem(k));
        if (parsed) return parsed;
      }
    }
    return null;
  }

  function uniq(arr) {
    const s = new Set();
    const out = [];
    for (const x of arr) {
      if (!s.has(x)) { s.add(x); out.push(x); }
    }
    return out;
  }

  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/á|à|ã|â/g, "a")
      .replace(/é|è|ê/g, "e")
      .replace(/í|ì|î/g, "i")
      .replace(/ó|ò|õ|ô/g, "o")
      .replace(/ú|ù|û/g, "u")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function setImgWithFallback(imgEl, src, fallbackSrc) {
    if (!imgEl) return;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      if (fallbackSrc) imgEl.src = fallbackSrc;
    };
    imgEl.src = src;
  }

  /* ---------------------------
     Base Data (roster/teams)
     Ajuste os caminhos se seus assets forem diferentes.
  --------------------------- */
  const TEAM = {
    ferrari:   { name: "Ferrari",        color: "#d00000", logo: "assets/teams/ferrari.png" },
    redbull:   { name: "Red Bull Racing",color: "#1e2a78", logo: "assets/teams/redbull.png" },
    mercedes:  { name: "Mercedes",       color: "#00d2be", logo: "assets/teams/mercedes.png" },
    mclaren:   { name: "McLaren",        color: "#ff8700", logo: "assets/teams/mclaren.png" },
    aston:     { name: "Aston Martin",   color: "#006f62", logo: "assets/teams/aston.png" },
    alpine:    { name: "Alpine",         color: "#0090ff", logo: "assets/teams/alpine.png" },
    williams:  { name: "Williams",       color: "#005aff", logo: "assets/teams/williams.png" },
    haas:      { name: "Haas",           color: "#b6babd", logo: "assets/teams/haas.png" },
    rb:        { name: "RB",             color: "#6c6cff", logo: "assets/teams/rb.png" },
    sauber:    { name: "Sauber / Audi",  color: "#00ff66", logo: "assets/teams/sauber.png" }
  };

  // 20 pilotos (IDs estáveis). Se seus assets tiverem outros nomes, mantenha o id e ajuste "face".
  const ROSTER = [
    { id:"verstappen", name:"Max Verstappen", team:"redbull",  pace:94, face:"assets/drivers/max_verstappen.png" },
    { id:"perez",      name:"Sergio Pérez",   team:"redbull",  pace:88, face:"assets/drivers/sergio_perez.png" },

    { id:"leclerc",    name:"Charles Leclerc",team:"ferrari",  pace:92, face:"assets/drivers/charles_leclerc.png" },
    { id:"sainz",      name:"Carlos Sainz",   team:"ferrari",  pace:90, face:"assets/drivers/carlos_sainz.png" },

    { id:"hamilton",   name:"Lewis Hamilton", team:"mercedes", pace:91, face:"assets/drivers/lewis_hamilton.png" },
    { id:"russell",    name:"George Russell", team:"mercedes", pace:89, face:"assets/drivers/george_russell.png" },

    { id:"norris",     name:"Lando Norris",   team:"mclaren",  pace:90, face:"assets/drivers/lando_norris.png" },
    { id:"piastri",    name:"Oscar Piastri",  team:"mclaren",  pace:88, face:"assets/drivers/oscar_piastri.png" },

    { id:"alonso",     name:"Fernando Alonso",team:"aston",    pace:88, face:"assets/drivers/fernando_alonso.png" },
    { id:"stroll",     name:"Lance Stroll",   team:"aston",    pace:83, face:"assets/drivers/lance_stroll.png" },

    { id:"ocon",       name:"Esteban Ocon",   team:"alpine",   pace:84, face:"assets/drivers/esteban_ocon.png" },
    { id:"gasly",      name:"Pierre Gasly",   team:"alpine",   pace:85, face:"assets/drivers/pierre_gasly.png" },

    { id:"albon",      name:"Alex Albon",     team:"williams", pace:84, face:"assets/drivers/alex_albon.png" },
    { id:"sargeant",   name:"Logan Sargeant", team:"williams", pace:78, face:"assets/drivers/logan_sargeant.png" },

    { id:"hulkenberg", name:"Nico Hülkenberg",team:"haas",     pace:82, face:"assets/drivers/nico_hulkenberg.png" },
    { id:"magnussen",  name:"Kevin Magnussen",team:"haas",     pace:80, face:"assets/drivers/kevin_magnussen.png" },

    { id:"tsunoda",    name:"Yuki Tsunoda",   team:"rb",       pace:82, face:"assets/drivers/yuki_tsunoda.png" },
    { id:"lawson",     name:"Liam Lawson",    team:"rb",       pace:79, face:"assets/drivers/liam_lawson.png" },

    { id:"zhou",       name:"Guanyu Zhou",    team:"sauber",   pace:79, face:"assets/drivers/guanyu_zhou.png" },
    { id:"bortoleto",  name:"Gabriel Bortoleto",team:"sauber", pace:78, face:"assets/drivers/gabriel_bortoleto.png" }
  ];

  function normalizeTeamKey(t) {
    t = (t || "").toLowerCase();
    if (t.includes("ferrari")) return "ferrari";
    if (t.includes("red") || t.includes("bull")) return "redbull";
    if (t.includes("mercedes")) return "mercedes";
    if (t.includes("mclaren")) return "mclaren";
    if (t.includes("aston")) return "aston";
    if (t.includes("alpine")) return "alpine";
    if (t.includes("williams")) return "williams";
    if (t.includes("haas")) return "haas";
    if (t === "rb" || t.includes("alphatauri") || t.includes("visa")) return "rb";
    if (t.includes("sauber") || t.includes("audi") || t.includes("kick")) return "sauber";
    return t;
  }

  function getTeamData(teamKey) {
    const k = normalizeTeamKey(teamKey);
    return TEAM[k] || { name: teamKey || "Equipe", color: "#888", logo: "assets/teams/default.png" };
  }

  /* ---------------------------
     DOM refs (ids do seu HTML)
  --------------------------- */
  const el = {
    teamLogoTop: $("#teamLogoTop"),
    gpTitle: $("#gp-title"),
    lapLabel: $("#race-lap-label"),
    weatherLabel: $("#weather-label"),
    trackTempLabel: $("#tracktemp-label"),
    btnBack: $("#btnBackLobby"),
    trackContainer: $("#track-container"),
    driversList: $("#drivers-list"),

    userCard0: $("#user-driver-card-0"),
    userCard1: $("#user-driver-card-1"),

    userCar0: $("#user-car-0"),
    userCar1: $("#user-car-1"),
    userTyre0: $("#user-tyre-0"),
    userTyre1: $("#user-tyre-1"),
    userEngine0: $("#user-engine-0"),
    userEngine1: $("#user-engine-1"),
    userAggr0: $("#user-aggr-0"),
    userAggr1: $("#user-aggr-1"),
    userErs0: $("#user-ers-0"),
    userErs1: $("#user-ers-1")
  };

  /* ---------------------------
     Game state
  --------------------------- */
  const params = parseParams();

  const state = {
    running: true,
    speedMul: 1,
    lap: 1,
    totalLaps: 5,              // ajuste se quiser
    weather: "Seco",           // "Chuva"
    trackTemp: 26,
    track: {
      name: params.track,
      svg: null,
      pathPoints: [],
      pitEntryIndex: null,
      pitExitIndex: null
    },
    drivers: [],
    user: {
      team: normalizeTeamKey(params.userTeam),
      driverIds: [] // preenchido no init
    },
    lastTick: now(),
    lastUiUpdate: 0
  };

  /* ---------------------------
     Track loading (SVG + JSON pathPoints)
  --------------------------- */
  async function loadTrackAssets() {
    const track = params.track;

    // 1) SVG
    const svgUrl = `assets/tracks/${track}.svg`;
    try {
      const svgText = await fetch(svgUrl, { cache: "no-store" }).then(r => r.text());
      el.trackContainer.innerHTML = svgText;
      state.track.svg = el.trackContainer.querySelector("svg");
      if (state.track.svg) {
        state.track.svg.style.width = "100%";
        state.track.svg.style.height = "100%";
        state.track.svg.style.display = "block";
      }
    } catch (e) {
      // fallback minimal: não trava corrida
      el.trackContainer.innerHTML = `<div style="color:#fff;padding:16px">Falha ao carregar SVG: ${svgUrl}</div>`;
    }

    // 2) pathPoints JSON
    const jsonUrl = `assets/tracks/${track}.json`;
    try {
      const data = await fetch(jsonUrl, { cache: "no-store" }).then(r => r.json());
      const pts = data.pathPoints || data.points || data.path || [];
      state.track.pathPoints = pts.map(p => ({ x: Number(p.x), y: Number(p.y) })).filter(p => isFinite(p.x) && isFinite(p.y));
      state.track.pitEntryIndex = (data.pitEntryIndex ?? data.pit_entry ?? null);
      state.track.pitExitIndex  = (data.pitExitIndex  ?? data.pit_exit  ?? null);
    } catch (e) {
      // Sem pathPoints = sem animação. Vamos criar um fallback usando pontos do SVG (se existirem).
      state.track.pathPoints = extractFallbackPointsFromSvg();
      state.track.pitEntryIndex = null;
      state.track.pitExitIndex = null;
    }

    // Se ainda não tem pontos, cria um loop simples pra não quebrar UI
    if (!state.track.pathPoints || state.track.pathPoints.length < 20) {
      state.track.pathPoints = makeSimpleOvalPoints(220);
    }
  }

  function extractFallbackPointsFromSvg() {
    try {
      const svg = state.track.svg;
      if (!svg) return [];
      // tenta achar polyline/polygon primeiro
      const pl = svg.querySelector("polyline, polygon");
      if (pl && pl.getAttribute("points")) {
        const raw = pl.getAttribute("points").trim().split(/\s+/);
        const pts = raw.map(pair => {
          const [x, y] = pair.split(",").map(Number);
          return { x, y };
        }).filter(p => isFinite(p.x) && isFinite(p.y));
        return densifyPoints(pts, 400);
      }
      // tenta path usando getTotalLength (se disponível)
      const path = svg.querySelector("path");
      if (path && typeof path.getTotalLength === "function") {
        const len = path.getTotalLength();
        const n = 450;
        const pts = [];
        for (let i = 0; i < n; i++) {
          const pt = path.getPointAtLength((i / n) * len);
          pts.push({ x: pt.x, y: pt.y });
        }
        return pts;
      }
    } catch {}
    return [];
  }

  function densifyPoints(pts, targetCount) {
    if (!pts || pts.length < 2) return pts || [];
    const out = [];
    const segs = pts.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[i+1];
      const steps = Math.max(2, Math.floor(targetCount / segs));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function makeSimpleOvalPoints(n = 240) {
    // oval dentro da área do SVG/container (valores “genéricos”)
    const cx = 250, cy = 250, rx = 180, ry = 110;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    }
    return pts;
  }

  /* ---------------------------
     Grid building (from quali)
  --------------------------- */
  function buildGridFromQualiOrDefault() {
    const quali = findAnyQualiGridInLocalStorage();

    // Aceitamos vários formatos:
    // - array de ids: ["leclerc","sainz",...]
    // - array de objetos: [{id:"leclerc", pos:1}, ...]
    // - objeto: { grid:[...] } ou { q3:[...] }
    let arr = null;

    if (Array.isArray(quali)) arr = quali;
    else if (quali && Array.isArray(quali.grid)) arr = quali.grid;
    else if (quali && Array.isArray(quali.q3)) arr = quali.q3;
    else if (quali && Array.isArray(quali.result)) arr = quali.result;

    let orderedIds = [];

    if (arr) {
      if (typeof arr[0] === "string") orderedIds = arr.slice();
      else if (typeof arr[0] === "object") {
        // tenta várias chaves comuns
        orderedIds = arr.map(o => o.id || o.driverId || o.driver_id || o.slug || o.code || "").filter(Boolean);
      }
    }

    orderedIds = orderedIds.map(slug).filter(Boolean);

    // garante que seja roster completo 20 (sem repetir)
    const allIds = ROSTER.map(d => d.id);
    const finalIds = uniq([...orderedIds, ...allIds]).slice(0, 20);

    // monta drivers state na ordem do grid
    const drivers = finalIds.map((id, idx) => {
      const base = ROSTER.find(d => d.id === id) || ROSTER[idx] || ROSTER[0];
      const teamKey = normalizeTeamKey(base.team);
      const tdata = getTeamData(teamKey);
      return {
        id: base.id,
        name: base.name,
        team: teamKey,
        teamName: tdata.name,
        color: tdata.color,
        logo: tdata.logo,
        face: base.face,
        pace: base.pace,

        // corrida
        gridPos: idx + 1,
        pos: idx + 1,
        progress: 0,      // 0..1
        lap: 0,
        gap: 0,
        lastLapTime: 0,
        totalTime: 0,

        // pneus e estratégias
        tyre: "M",
        tyreWear: 100,        // %
        engineMode: "NORMAL", // ECON / NORMAL / ATTACK
        aggr: "A2",           // A0..A3 (afeta desgaste)
        ers: 50,              // %
        pit: {
          requested: false,
          inPit: false,
          pitUntil: 0,
          lastPitLap: -999
        },

        // UI car element
        carEl: null
      };
    });

    state.drivers = drivers;

    // user team drivers (2)
    const userTeam = normalizeTeamKey(params.userTeam);
    const userCandidates = drivers.filter(d => d.team === userTeam);
    if (userCandidates.length >= 2) {
      state.user.driverIds = [userCandidates[0].id, userCandidates[1].id];
    } else {
      // fallback Ferrari Sainz/Leclerc
      state.user.driverIds = ["sainz", "leclerc"];
    }
  }

  /* ---------------------------
     Cars rendering over SVG
  --------------------------- */
  function createCars() {
    // container overlay (absolute)
    const overlay = document.createElement("div");
    overlay.id = "cars-overlay";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "5";

    // garante que track-container seja relative
    el.trackContainer.style.position = "relative";
    el.trackContainer.appendChild(overlay);

    for (const d of state.drivers) {
      const car = document.createElement("div");
      car.className = "car-dot";
      car.style.position = "absolute";
      car.style.width = "10px";
      car.style.height = "10px";
      car.style.borderRadius = "999px";
      car.style.background = d.color || "#fff";
      car.style.boxShadow = "0 0 10px rgba(255,255,255,.35)";
      car.style.transform = "translate(-50%,-50%)";
      car.title = `${d.name} (${d.teamName})`;
      overlay.appendChild(car);
      d.carEl = car;
    }

    // distribui no grid (progress espaçado)
    const n = state.drivers.length;
    for (let i = 0; i < n; i++) {
      state.drivers[i].progress = (i / n) * 0.12; // “grid” compactado no início
    }
  }

  function getPointAtProgress(p) {
    const pts = state.track.pathPoints;
    const n = pts.length;
    if (!pts || n < 2) return { x: 0, y: 0 };
    const idx = Math.floor(p * (n - 1));
    const t = (p * (n - 1)) - idx;
    const a = pts[idx];
    const b = pts[(idx + 1) % n];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  /* ---------------------------
     Weather + temperature
  --------------------------- */
  function initWeather() {
    // tenta usar algo salvo
    const saved = safeJSONParse(localStorage.getItem("fm25_weather"));
    if (saved && saved.weather) {
      state.weather = saved.weather;
      state.trackTemp = saved.trackTemp ?? state.trackTemp;
    } else {
      // random leve
      const rainChance = 0.18;
      state.weather = (Math.random() < rainChance) ? "Chuva" : "Seco";
      state.trackTemp = state.weather === "Chuva" ? 21 + Math.floor(Math.random() * 3) : 24 + Math.floor(Math.random() * 8);
      localStorage.setItem("fm25_weather", JSON.stringify({ weather: state.weather, trackTemp: state.trackTemp }));
    }
  }

  function weatherWearMultiplier() {
    // chuva desgasta menos slick? (na vida real slick não serve, mas aqui simplificado)
    if (state.weather === "Chuva") return 0.85;
    return 1.0;
  }

  /* ---------------------------
     Tyres / Modes effects
  --------------------------- */
  function engineFactor(mode) {
    if (mode === "ECON") return 0.965;
    if (mode === "ATTACK") return 1.020;
    return 1.0; // NORMAL
  }

  function aggrWearFactor(aggr) {
    // A0..A3
    const map = { A0: 0.80, A1: 0.92, A2: 1.00, A3: 1.12 };
    return map[aggr] || 1.0;
  }

  function tyreBaseGrip(tyre) {
    // S>M>H (seco). I/W (chuva)
    if (tyre === "S") return 1.020;
    if (tyre === "M") return 1.000;
    if (tyre === "H") return 0.985;
    if (tyre === "I") return (state.weather === "Chuva") ? 1.005 : 0.960;
    if (tyre === "W") return (state.weather === "Chuva") ? 1.015 : 0.940;
    return 1.0;
  }

  function tyreWearDeltaPerSecond(d) {
    // desgaste por segundo (simplificado)
    const base = 0.028; // ajuste fino
    const grip = tyreBaseGrip(d.tyre);
    const mode = engineFactor(d.engineMode);
    const ag = aggrWearFactor(d.aggr);
    const wmul = weatherWearMultiplier();

    // slicks em chuva “derretem” mais
    let rainPenalty = 1.0;
    if (state.weather === "Chuva" && (d.tyre === "S" || d.tyre === "M" || d.tyre === "H")) rainPenalty = 1.55;

    return base * grip * mode * ag * wmul * rainPenalty;
  }

  /* ---------------------------
     PIT logic
  --------------------------- */
  function requestPit(driver) {
    if (!driver) return;
    if (driver.pit.inPit) return;
    driver.pit.requested = true;
  }

  function performPitStop(driver) {
    // já em pit
    driver.pit.requested = false;
    driver.pit.inPit = true;

    // tempo base do pit (segundos) influenciado por ERS/aggr/engine um pouco
    const base = 3.1;
    const extra = (driver.engineMode === "ATTACK") ? 0.15 : 0;
    const pitTime = base + extra + Math.random() * 0.35;

    driver.pit.pitUntil = now() + pitTime * 1000 / state.speedMul;
    driver.pit.lastPitLap = driver.lap;

    // troca de pneu: se chover => W por padrão, se seco => M por padrão
    let target = driver.tyre;
    if (state.weather === "Chuva") target = "W";
    else target = "M";

    // se for piloto do usuário, mantém o que estiver no HUD (ele já clicou antes)
    if (state.user.driverIds.includes(driver.id)) {
      // mantém driver.tyre (já definido por HUD)
      target = driver.tyre;
    }

    driver.tyre = target;
    driver.tyreWear = 100;

    // “penalidade” de tempo (gap) simplificada
    driver.totalTime += pitTime + 17.0; // pitlane time-loss
  }

  function updatePit(driver) {
    if (!driver) return;

    if (driver.pit.inPit) {
      // parado
      if (now() >= driver.pit.pitUntil) {
        driver.pit.inPit = false;
      }
      return;
    }

    if (!driver.pit.requested) return;

    // condição: só faz pit se já completou pelo menos 1 volta e não pitou nessa volta
    if (driver.lap < 1) return;
    if (driver.pit.lastPitLap === driver.lap) return;

    // gatilho simples: assim que passa por “zona de box” (se tiver)
    // se não houver pitEntryIndex no track, faz o pit quando progress estiver perto de 0.98 (reta dos boxes)
    const pts = state.track.pathPoints;
    const n = pts.length;
    let trigger = false;

    if (typeof state.track.pitEntryIndex === "number" && n > 20) {
      const entryP = state.track.pitEntryIndex / (n - 1);
      if (driver.progress >= entryP && driver.progress <= entryP + 0.01) trigger = true;
    } else {
      if (driver.progress >= 0.975) trigger = true;
    }

    if (trigger) performPitStop(driver);
  }

  /* ---------------------------
     HUD / user cards wiring
  --------------------------- */
  function setTopBar() {
    el.gpTitle.textContent = params.gp;
    const teamData = getTeamData(state.user.team);
    setImgWithFallback(el.teamLogoTop, teamData.logo, "assets/teams/default.png");
  }

  function setWeatherUI() {
    if (el.weatherLabel) el.weatherLabel.textContent = `Clima: ${state.weather}`;
    if (el.trackTempLabel) el.trackTempLabel.textContent = `Pista: ${state.trackTemp}°C`;
  }

  function bindSpeedButtons() {
    $$(".speed-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const s = Number(btn.dataset.speed || "1");
        state.speedMul = clamp(s, 1, 4);
        // UI active
        $$(".speed-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function bindBackButton() {
    if (!el.btnBack) return;
    el.btnBack.addEventListener("click", () => {
      // mantém seu fluxo atual
      location.href = "index.html";
    });
  }

  function wireUserCards() {
    // Atualiza títulos e imagens dos 2 pilotos do usuário
    const d0 = state.drivers.find(d => d.id === state.user.driverIds[0]) || state.drivers[0];
    const d1 = state.drivers.find(d => d.id === state.user.driverIds[1]) || state.drivers[1];

    hydrateUserCard(0, d0);
    hydrateUserCard(1, d1);

    // Botões (PIT / ATAQUE / ECONOMIZAR / MOTOR+ / AGRESS+ / ERS BOOST)
    [0, 1].forEach(i => {
      const card = i === 0 ? el.userCard0 : el.userCard1;
      if (!card) return;

      const pid = i === 0 ? d0.id : d1.id;

      $$(".user-btn", card).forEach(btn => {
        btn.addEventListener("click", () => {
          const act = (btn.dataset.action || "").toLowerCase();
          onUserAction(pid, act, i);
        });
      });
    });

    // Clique no pneu no HUD para alternar composto
    if (el.userTyre0) el.userTyre0.addEventListener("click", () => cycleUserTyre(0));
    if (el.userTyre1) el.userTyre1.addEventListener("click", () => cycleUserTyre(1));
  }

  function hydrateUserCard(index, driver) {
    const card = index === 0 ? el.userCard0 : el.userCard1;
    if (!card || !driver) return;

    const nameEl = $(".user-name", card);
    const teamEl = $(".user-team", card);
    const faceEl = $(".user-face", card);

    if (nameEl) nameEl.textContent = driver.name;
    if (teamEl) teamEl.textContent = driver.teamName;

    if (faceEl) setImgWithFallback(faceEl, driver.face, "assets/drivers/default.png");

    // inicia HUD spans
    setUserHud(index, driver);
  }

  function setUserHud(index, driver) {
    if (!driver) return;

    const car = (index === 0) ? el.userCar0 : el.userCar1;
    const tyre= (index === 0) ? el.userTyre0 : el.userTyre1;
    const eng = (index === 0) ? el.userEngine0 : el.userEngine1;
    const ag  = (index === 0) ? el.userAggr0 : el.userAggr1;
    const ers = (index === 0) ? el.userErs0 : el.userErs1;

    if (car) car.textContent = `${Math.round(driver.tyreWear)}%`;
    if (tyre) tyre.textContent = driver.tyre;
    if (eng) eng.textContent = driver.engineMode;
    if (ag) ag.textContent = driver.aggr;
    if (ers) ers.textContent = `${Math.round(driver.ers)}%`;
  }

  function cycleUserTyre(index) {
    const driverId = state.user.driverIds[index];
    const d = state.drivers.find(x => x.id === driverId);
    if (!d) return;

    const orderDry = ["S", "M", "H"];
    const orderWet = ["I", "W"];

    // se estiver chovendo, prioriza pneus de chuva no ciclo
    const order = (state.weather === "Chuva") ? [...orderWet, ...orderDry] : [...orderDry, ...orderWet];

    const cur = d.tyre;
    const idx = order.indexOf(cur);
    const next = order[(idx + 1 + order.length) % order.length];
    d.tyre = next;

    setUserHud(index, d);
  }

  function onUserAction(driverId, action, index) {
    const d = state.drivers.find(x => x.id === driverId);
    if (!d) return;

    switch (action) {
      case "pit":
        requestPit(d);
        break;

      case "ataque":
        d.engineMode = "ATTACK";
        break;

      case "economizar":
        d.engineMode = "ECON";
        break;

      case "motor+":
      case "motor":
        // ciclo ECON -> NORMAL -> ATTACK
        d.engineMode = (d.engineMode === "ECON") ? "NORMAL" : (d.engineMode === "NORMAL" ? "ATTACK" : "ECON");
        break;

      case "agress+":
      case "agress":
        // ciclo A1->A2->A3->A0->A1
        d.aggr = (d.aggr === "A0") ? "A1" : (d.aggr === "A1" ? "A2" : (d.aggr === "A2" ? "A3" : "A0"));
        break;

      case "ers boost":
      case "ersboost":
      case "ers":
        // gasta ERS para ganho curto
        if (d.ers >= 10) d.ers -= 10;
        break;
    }

    // NORMAL se não for econ/attack e usuário alternou
    if (action === "motor+" || action === "motor") {
      // já ciclou acima
    } else if (action === "ataque" || action === "economizar") {
      // mantém
    } else if (action === "ers boost") {
      // mantém
    }

    // atualiza HUD do usuário
    const idx = (state.user.driverIds[0] === driverId) ? 0 : 1;
    setUserHud(idx, d);
  }

  /* ---------------------------
     Race loop / physics (simplificado)
  --------------------------- */
  function computeDriverSpeed(d, dtSec) {
    // base pace + fatores
    const pace = d.pace || 80;

    const wearPenalty = (100 - d.tyreWear) * 0.0023; // quanto mais gasto, pior
    const engine = engineFactor(d.engineMode);
    const grip = tyreBaseGrip(d.tyre);

    // ERS: se alto, dá leve bônus; se baixo, leve perda
    const ersBonus = (d.ers - 50) * 0.00035;

    // agressividade dá micro ganho mas aumenta desgaste
    const aggrBonusMap = { A0: -0.002, A1: 0.0, A2: 0.001, A3: 0.002 };
    const aggrBonus = aggrBonusMap[d.aggr] || 0;

    // tempo base por segundo (progress/s)
    let v = (pace / 100) * 0.045; // ajuste base
    v *= engine;
    v *= grip;
    v *= (1 - wearPenalty);
    v *= (1 + ersBonus + aggrBonus);

    // chuva reduz ritmo geral
    if (state.weather === "Chuva") v *= 0.965;

    // clamp
    v = clamp(v, 0.010, 0.085);
    return v;
  }

  function tick(dtMs) {
    const dtSec = (dtMs / 1000) * state.speedMul;

    // atualiza cada piloto
    for (const d of state.drivers) {
      // PIT (se estiver em pit, não anda)
      updatePit(d);
      if (d.pit.inPit) continue;

      // desgaste pneu
      const wear = tyreWearDeltaPerSecond(d) * dtSec;
      d.tyreWear = clamp(d.tyreWear - wear, 0, 100);

      // ERS recarrega devagar se ECON, gasta se ATTACK
      if (d.engineMode === "ECON") d.ers = clamp(d.ers + 0.18 * dtSec, 0, 100);
      else if (d.engineMode === "ATTACK") d.ers = clamp(d.ers - 0.25 * dtSec, 0, 100);
      else d.ers = clamp(d.ers + 0.05 * dtSec, 0, 100);

      // move
      const v = computeDriverSpeed(d, dtSec);
      d.progress += v * dtSec;

      // completou volta?
      if (d.progress >= 1) {
        d.progress -= 1;
        d.lap += 1;

        // fim da corrida por piloto (simplificado)
        if (d.lap >= state.totalLaps) {
          // segura no final
          d.progress = 0.999;
        }
      }

      // tempo acumulado (para gaps)
      d.totalTime += dtSec;
    }

    // ordena posições
    updatePositions();

    // desenha carros
    renderCars();

    // UI 6x por segundo (não a cada frame)
    const t = now();
    if (t - state.lastUiUpdate > 160) {
      state.lastUiUpdate = t;
      updateUI();
    }
  }

  function updatePositions() {
    // rank por (lap desc, progress desc, totalTime asc)
    state.drivers.sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.totalTime - b.totalTime;
    });

    for (let i = 0; i < state.drivers.length; i++) {
      state.drivers[i].pos = i + 1;
    }

    // gaps simples vs leader (totalTime)
    const leader = state.drivers[0];
    for (const d of state.drivers) {
      d.gap = d.totalTime - leader.totalTime;
    }
  }

  function renderCars() {
    // desenha no SVG space — usamos coordenadas dos pathPoints (que são no sistema do SVG)
    const svg = state.track.svg;
    if (!svg) return;

    // pega viewBox para escala
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
    const rect = svg.getBoundingClientRect();

    // converter ponto SVG -> px dentro do container
    function svgToPx(pt) {
      const sx = rect.width / vb.width;
      const sy = rect.height / vb.height;
      return {
        x: (pt.x - vb.x) * sx,
        y: (pt.y - vb.y) * sy
      };
    }

    for (const d of state.drivers) {
      if (!d.carEl) continue;

      // se terminou corrida, segura
      if (d.lap >= state.totalLaps) {
        d.carEl.style.opacity = "0.85";
      }

      // se pit, some
      if (d.pit.inPit) {
        d.carEl.style.opacity = "0.15";
      } else {
        d.carEl.style.opacity = "1";
      }

      const pt = getPointAtProgress(d.progress);
      const px = svgToPx(pt);

      d.carEl.style.left = `${px.x}px`;
      d.carEl.style.top  = `${px.y}px`;

      // destaque seus pilotos
      if (state.user.driverIds.includes(d.id)) {
        d.carEl.style.width = "12px";
        d.carEl.style.height = "12px";
        d.carEl.style.boxShadow = "0 0 12px rgba(255,255,255,.65)";
      } else {
        d.carEl.style.width = "10px";
        d.carEl.style.height = "10px";
        d.carEl.style.boxShadow = "0 0 10px rgba(255,255,255,.35)";
      }
    }
  }

  /* ---------------------------
     Right panel list (drivers-list)
  --------------------------- */
  function updateUI() {
    // lap label
    if (el.lapLabel) {
      // mostra volta do líder (1..total)
      const leaderLap = state.drivers[0]?.lap ?? 0;
      el.lapLabel.textContent = `Volta ${Math.min(leaderLap + 1, state.totalLaps)} / ${state.totalLaps}`;
    }

    // lista lateral — sempre 20
    if (el.driversList) {
      const frag = document.createDocumentFragment();

      const leader = state.drivers[0];
      for (const d of state.drivers) {
        const row = document.createElement("div");
        row.className = "driver-row";
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.gap = "10px";
        row.style.padding = "10px 10px";
        row.style.borderRadius = "12px";
        row.style.background = "rgba(255,255,255,0.06)";
        row.style.marginBottom = "8px";

        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "10px";

        const pos = document.createElement("div");
        pos.textContent = d.pos;
        pos.style.width = "18px";
        pos.style.opacity = "0.95";

        const avatar = document.createElement("img");
        avatar.width = 26;
        avatar.height = 26;
        avatar.style.borderRadius = "999px";
        avatar.style.objectFit = "cover";
        avatar.style.border = "2px solid rgba(255,255,255,.22)";
        setImgWithFallback(avatar, d.face, "assets/drivers/default.png");

        const info = document.createElement("div");
        info.style.display = "flex";
        info.style.flexDirection = "column";
        info.style.lineHeight = "1.05";

        const name = document.createElement("div");
        name.textContent = d.name;
        name.style.fontSize = "13px";
        name.style.fontWeight = "700";

        const sub = document.createElement("div");
        sub.textContent = `${d.teamName} • Voltas: ${d.lap} • Pneu: ${d.tyre}`;
        sub.style.fontSize = "11px";
        sub.style.opacity = "0.8";

        info.appendChild(name);
        info.appendChild(sub);

        left.appendChild(pos);
        left.appendChild(avatar);
        left.appendChild(info);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.flexDirection = "column";
        right.style.alignItems = "flex-end";
        right.style.gap = "2px";

        const gap = document.createElement("div");
        if (d === leader) {
          gap.textContent = "LEADER";
          gap.style.fontWeight = "800";
          gap.style.opacity = "0.95";
        } else {
          gap.textContent = `+${d.gap.toFixed(3)}`;
          gap.style.opacity = "0.9";
        }

        const wear = document.createElement("div");
        wear.textContent = `${Math.round(d.tyreWear)}%`;
        wear.style.fontSize = "11px";
        wear.style.opacity = "0.75";

        right.appendChild(gap);
        right.appendChild(wear);

        row.appendChild(left);
        row.appendChild(right);

        // destaque seus pilotos
        if (state.user.driverIds.includes(d.id)) {
          row.style.outline = "1px solid rgba(255,255,255,.25)";
          row.style.background = "rgba(255,255,255,0.09)";
        }

        frag.appendChild(row);
      }

      el.driversList.innerHTML = "";
      el.driversList.appendChild(frag);
    }

    // atualiza HUD seus pilotos
    const d0 = state.drivers.find(d => d.id === state.user.driverIds[0]);
    const d1 = state.drivers.find(d => d.id === state.user.driverIds[1]);
    if (d0) setUserHud(0, d0);
    if (d1) setUserHud(1, d1);
  }

  /* ---------------------------
     Main loop
  --------------------------- */
  function loop() {
    if (!state.running) return;

    const t = now();
    const dt = t - state.lastTick;
    state.lastTick = t;

    // evita saltos grandes em celular quando perde foco
    const safeDt = clamp(dt, 0, 50);

    tick(safeDt);
    requestAnimationFrame(loop);
  }

  /* ---------------------------
     Init
  --------------------------- */
  async function init() {
    // título e topo
    setTopBar();

    // weather
    initWeather();
    setWeatherUI();

    // grid + roster
    buildGridFromQualiOrDefault();

    // track assets
    await loadTrackAssets();

    // cars
    createCars();

    // UI binds
    bindSpeedButtons();
    bindBackButton();
    wireUserCards();

    // primeira render UI
    updateUI();

    // start
    state.lastTick = now();
    requestAnimationFrame(loop);
  }

  // Start
  window.addEventListener("load", init);
})();
