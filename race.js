/* =========================================================
   F1 MANAGER 2025 — RACE.JS (FIX DEFINITIVO)
   FIXES:
   - Carros renderizados DENTRO do SVG (mesmo viewBox) => nunca “fora da pista”
   - Traçado branco/cinza sempre desenhado (polyline no SVG)
   - Faces com fallback em cadeia (para parar de sumir)
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------
     Utils
  --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const NS = "http://www.w3.org/2000/svg";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function now() { return performance.now(); }

  function safeJSONParse(str) { try { return JSON.parse(str); } catch { return null; } }

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

  function parseParams() {
    const u = new URL(location.href);
    return {
      track: (u.searchParams.get("track") || "australia").toLowerCase(),
      gp: u.searchParams.get("gp") || "GP",
      userTeam: (u.searchParams.get("userTeam") || "ferrari").toLowerCase()
    };
  }

  function uniq(arr) {
    const s = new Set();
    const out = [];
    for (const x of arr) { if (!s.has(x)) { s.add(x); out.push(x); } }
    return out;
  }

  function ensureViewBox(svg) {
    if (!svg) return;
    if (svg.getAttribute("viewBox")) return;

    const w = Number(svg.getAttribute("width")) || 1000;
    const h = Number(svg.getAttribute("height")) || 1000;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }

  function makeSimpleOvalPoints(n = 260) {
    const cx = 500, cy = 500, rx = 360, ry = 230;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    }
    return pts;
  }

  /* ---------------------------
     Asset fallback (faces/logos)
  --------------------------- */
  function setImgWithFallbackChain(imgEl, srcList) {
    if (!imgEl) return;
    const list = (srcList || []).filter(Boolean);

    const first = list[0] || "";
    if (imgEl.dataset.lastSrc === first) return; // evita flicker/reload
    imgEl.dataset.lastSrc = first;

    let idx = 0;
    imgEl.onerror = () => {
      idx++;
      if (idx < list.length) imgEl.src = list[idx];
    };
    imgEl.src = first;
  }

  function faceCandidates(driver) {
    // Mantém o que você já tinha + tenta variações comuns.
    const id = slug(driver?.id || "");
    const direct = driver?.face || "";

    return [
      direct,

      // caminhos comuns
      `assets/drivers/${id}.png`,
      `assets/drivers/${id}.jpg`,
      `assets/driver_faces/${id}.png`,
      `assets/faces/${id}.png`,
      `assets/pilots/${id}.png`,

      // fallback final
      `assets/drivers/default.png`,
      `assets/ui/default_driver.png`
    ];
  }

  function logoCandidates(teamKey) {
    const k = normalizeTeamKey(teamKey);
    return [
      `assets/teams/${k}.png`,
      `assets/teams/${k}.webp`,
      `assets/teams/${k}.jpg`,
      `assets/teams/default.png`,
      `assets/ui/default_team.png`
    ];
  }

  /* ---------------------------
     Base Data (igual ao seu)
  --------------------------- */
  const TEAM = {
    ferrari:   { name: "Ferrari",         color: "#d00000" },
    redbull:   { name: "Red Bull Racing", color: "#1e2a78" },
    mercedes:  { name: "Mercedes",        color: "#00d2be" },
    mclaren:   { name: "McLaren",         color: "#ff8700" },
    aston:     { name: "Aston Martin",    color: "#006f62" },
    alpine:    { name: "Alpine",          color: "#0090ff" },
    williams:  { name: "Williams",        color: "#005aff" },
    haas:      { name: "Haas",            color: "#b6babd" },
    rb:        { name: "RB",              color: "#6c6cff" },
    sauber:    { name: "Sauber / Audi",   color: "#00ff66" }
  };

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
    return TEAM[k] || { name: teamKey || "Equipe", color: "#888" };
  }

  function findAnyQualiGridInLocalStorage() {
    const keys = [
      "fm25_quali_grid_q3",
      "fm25_quali_grid",
      "fm25_quali_result_q3",
      "quali_grid_q3",
      "quali_grid",
      "qualifying_grid",
      "q3_grid",
      "grid_q3"
    ];

    for (const k of keys) {
      const v = localStorage.getItem(k);
      const p = safeJSONParse(v);
      if (p) return p;
    }

    // fallback heurístico
    for (const k of Object.keys(localStorage)) {
      const lk = k.toLowerCase();
      if (lk.includes("quali") && (lk.includes("grid") || lk.includes("q3"))) {
        const p = safeJSONParse(localStorage.getItem(k));
        if (p) return p;
      }
    }
    return null;
  }

  /* ---------------------------
     DOM
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
     State
  --------------------------- */
  const params = parseParams();

  const state = {
    running: true,
    speedMul: 1,
    totalLaps: 5,

    weather: "Seco",
    trackTemp: 26,

    track: {
      name: params.track,
      svg: null,
      vb: { x: 0, y: 0, width: 1000, height: 1000 },
      pathPoints: [],
      gTrack: null,
      gCars: null
    },

    drivers: [],
    user: {
      team: normalizeTeamKey(params.userTeam),
      driverIds: []
    },

    ui: { standingsRows: [] },

    lastTick: now(),
    lastUiUpdate: 0
  };

  /* ---------------------------
     Weather
  --------------------------- */
  function initWeather() {
    const saved = safeJSONParse(localStorage.getItem("fm25_weather"));
    if (saved && saved.weather) {
      state.weather = saved.weather;
      state.trackTemp = saved.trackTemp ?? state.trackTemp;
      return;
    }

    const rainChance = 0.18;
    state.weather = (Math.random() < rainChance) ? "Chuva" : "Seco";
    state.trackTemp = state.weather === "Chuva"
      ? 21 + Math.floor(Math.random() * 3)
      : 24 + Math.floor(Math.random() * 8);

    localStorage.setItem("fm25_weather", JSON.stringify({
      weather: state.weather,
      trackTemp: state.trackTemp
    }));
  }

  function setTopBar() {
    if (el.gpTitle) el.gpTitle.textContent = params.gp;
    setImgWithFallbackChain(el.teamLogoTop, logoCandidates(state.user.team));
  }

  function setWeatherUI() {
    if (el.weatherLabel) el.weatherLabel.textContent = `Clima: ${state.weather}`;
    if (el.trackTempLabel) el.trackTempLabel.textContent = `Pista: ${state.trackTemp}°C`;
  }

  /* ---------------------------
     Track loading
  --------------------------- */
  async function loadTrackAssets() {
    const track = params.track;

    // SVG
    const svgUrl = `assets/tracks/${track}.svg`;
    const svgText = await fetch(svgUrl, { cache: "no-store" }).then(r => r.text());
    el.trackContainer.innerHTML = svgText;

    state.track.svg = el.trackContainer.querySelector("svg");
    if (!state.track.svg) throw new Error("SVG não encontrado no container.");

    state.track.svg.style.width = "100%";
    state.track.svg.style.height = "100%";
    state.track.svg.style.display = "block";

    ensureViewBox(state.track.svg);
    const vb = state.track.svg.viewBox.baseVal;
    state.track.vb = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };

    // JSON
    const jsonUrl = `assets/tracks/${track}.json`;
    let pts = [];
    try {
      const data = await fetch(jsonUrl, { cache: "no-store" }).then(r => r.json());
      const raw = data.pathPoints || data.points || data.path || [];
      pts = raw.map(p => ({ x: Number(p.x), y: Number(p.y) })).filter(p => isFinite(p.x) && isFinite(p.y));
    } catch {
      pts = [];
    }

    if (!pts || pts.length < 20) pts = makeSimpleOvalPoints(280);

    state.track.pathPoints = normalizePathPointsToViewBox(pts);

    // Layers
    mountSvgLayers();

    // Track line
    drawTrackLine();

    // Car circles
    createCarsInSvg();
  }

  function normalizePathPointsToViewBox(pts) {
    const vb = state.track.vb;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const spanX = maxX - minX;
    const spanY = maxY - minY;

    // 0..1
    if (maxX <= 1.5 && maxY <= 1.5) {
      return pts.map(p => ({
        x: vb.x + p.x * vb.width,
        y: vb.y + p.y * vb.height
      }));
    }

    // 0..100
    if (maxX <= 110 && maxY <= 110 && (spanX > 10 || spanY > 10)) {
      return pts.map(p => ({
        x: vb.x + (p.x / 100) * vb.width,
        y: vb.y + (p.y / 100) * vb.height
      }));
    }

    // Se já está “na escala” do viewBox, mantém
    const close =
      spanX > vb.width * 0.6 && spanX < vb.width * 1.4 &&
      spanY > vb.height * 0.6 && spanY < vb.height * 1.4;
    if (close) return pts;

    // fit no viewBox
    const margin = 0.08;
    const targetW = vb.width * (1 - margin * 2);
    const targetH = vb.height * (1 - margin * 2);
    const scale = Math.min(targetW / (spanX || 1), targetH / (spanY || 1));

    const offsetX = vb.x + vb.width * margin - minX * scale;
    const offsetY = vb.y + vb.height * margin - minY * scale;

    return pts.map(p => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }));
  }

  function mountSvgLayers() {
    const svg = state.track.svg;

    // remove layers antigos
    svg.querySelectorAll("[data-layer='track']").forEach(n => n.remove());
    svg.querySelectorAll("[data-layer='cars']").forEach(n => n.remove());

    const gTrack = document.createElementNS(NS, "g");
    gTrack.setAttribute("data-layer", "track");

    const gCars = document.createElementNS(NS, "g");
    gCars.setAttribute("data-layer", "cars");

    // Track abaixo
    svg.insertBefore(gTrack, svg.firstChild);
    svg.appendChild(gCars);

    state.track.gTrack = gTrack;
    state.track.gCars = gCars;
  }

  function drawTrackLine() {
    const g = state.track.gTrack;
    const pts = state.track.pathPoints;
    if (!g || !pts || pts.length < 2) return;

    g.innerHTML = "";

    // base cinza
    const base = document.createElementNS(NS, "polyline");
    base.setAttribute("fill", "none");
    base.setAttribute("stroke", "rgba(160,160,160,0.70)");
    base.setAttribute("stroke-width", "12");
    base.setAttribute("stroke-linecap", "round");
    base.setAttribute("stroke-linejoin", "round");
    base.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));

    // topo branco
    const top = document.createElementNS(NS, "polyline");
    top.setAttribute("fill", "none");
    top.setAttribute("stroke", "rgba(255,255,255,0.92)");
    top.setAttribute("stroke-width", "5");
    top.setAttribute("stroke-linecap", "round");
    top.setAttribute("stroke-linejoin", "round");
    top.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));

    g.appendChild(base);
    g.appendChild(top);
  }

  /* ---------------------------
     Grid / drivers
  --------------------------- */
  function buildGridFromQualiOrDefault() {
    const quali = findAnyQualiGridInLocalStorage();

    let arr = null;
    if (Array.isArray(quali)) arr = quali;
    else if (quali && Array.isArray(quali.grid)) arr = quali.grid;
    else if (quali && Array.isArray(quali.q3)) arr = quali.q3;
    else if (quali && Array.isArray(quali.result)) arr = quali.result;

    let orderedIds = [];
    if (arr) {
      if (typeof arr[0] === "string") orderedIds = arr.slice();
      else if (typeof arr[0] === "object") {
        orderedIds = arr.map(o => o.id || o.driverId || o.driver_id || o.slug || o.code || "").filter(Boolean);
      }
    }

    orderedIds = orderedIds.map(slug).filter(Boolean);
    const allIds = ROSTER.map(d => d.id);
    const finalIds = uniq([...orderedIds, ...allIds]).slice(0, 20);

    state.drivers = finalIds.map((id, idx) => {
      const base = ROSTER.find(d => d.id === id) || ROSTER[idx] || ROSTER[0];
      const teamKey = normalizeTeamKey(base.team);
      const t = getTeamData(teamKey);

      return {
        id: base.id,
        name: base.name,
        team: teamKey,
        teamName: t.name,
        color: t.color,
        face: base.face,
        pace: base.pace,

        gridPos: idx + 1,
        pos: idx + 1,

        progress: (idx / finalIds.length) * 0.12,
        lap: 0,
        gap: 0,
        totalTime: 0,

        tyre: "M",
        tyreWear: 100,
        engineMode: "NORMAL",
        aggr: "A2",
        ers: 50,

        pit: { requested: false, inPit: false, pitUntil: 0, lastPitLap: -999 },

        carEl: null // agora é circle SVG
      };
    });

    const userTeam = normalizeTeamKey(params.userTeam);
    const userCandidates = state.drivers.filter(d => d.team === userTeam);
    state.user.driverIds = (userCandidates.length >= 2)
      ? [userCandidates[0].id, userCandidates[1].id]
      : ["sainz", "leclerc"];
  }

  /* ---------------------------
     Cars in SVG (FIX PRINCIPAL)
  --------------------------- */
  function createCarsInSvg() {
    const g = state.track.gCars;
    if (!g) return;

    g.innerHTML = "";

    for (const d of state.drivers) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", state.user.driverIds.includes(d.id) ? "7" : "6");
      c.setAttribute("fill", d.color || "#fff");
      c.setAttribute("stroke", "rgba(255,255,255,0.55)");
      c.setAttribute("stroke-width", "1.2");
      c.setAttribute("opacity", "1");
      g.appendChild(c);
      d.carEl = c;
    }
  }

  function getPointAtProgress(p) {
    const pts = state.track.pathPoints;
    const n = pts.length;
    const pp = ((p % 1) + 1) % 1;
    const idx = Math.floor(pp * (n - 1));
    const t = (pp * (n - 1)) - idx;
    const a = pts[idx];
    const b = pts[(idx + 1) % n];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  function renderCars() {
    for (const d of state.drivers) {
      if (!d.carEl) continue;

      if (d.pit.inPit) {
        d.carEl.setAttribute("opacity", "0.20");
        continue;
      }
      d.carEl.setAttribute("opacity", "1");

      const pt = getPointAtProgress(d.progress);
      d.carEl.setAttribute("cx", String(pt.x));
      d.carEl.setAttribute("cy", String(pt.y));
    }
  }

  /* ---------------------------
     UI: standings (persistente)
  --------------------------- */
  function buildStandingsUIOnce() {
    if (!el.driversList) return;

    el.driversList.innerHTML = "";
    state.ui.standingsRows = [];

    for (let i = 0; i < 20; i++) {
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
      pos.style.width = "18px";
      pos.style.opacity = "0.95";

      const avatar = document.createElement("img");
      avatar.width = 26;
      avatar.height = 26;
      avatar.style.borderRadius = "999px";
      avatar.style.objectFit = "cover";
      avatar.style.border = "2px solid rgba(255,255,255,.22)";

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.flexDirection = "column";
      info.style.lineHeight = "1.05";

      const name = document.createElement("div");
      name.style.fontSize = "13px";
      name.style.fontWeight = "700";

      const sub = document.createElement("div");
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
      gap.style.opacity = "0.9";

      const wear = document.createElement("div");
      wear.style.fontSize = "11px";
      wear.style.opacity = "0.75";

      right.appendChild(gap);
      right.appendChild(wear);

      row.appendChild(left);
      row.appendChild(right);
      el.driversList.appendChild(row);

      state.ui.standingsRows.push({ row, pos, avatar, name, sub, gap, wear });
    }
  }

  function updateStandingsUI() {
    const rows = state.ui.standingsRows;
    if (!rows || rows.length < 1) return;

    const leader = state.drivers[0];

    for (let i = 0; i < rows.length; i++) {
      const d = state.drivers[i];
      const r = rows[i];
      if (!d) continue;

      r.pos.textContent = d.pos;
      r.name.textContent = d.name;
      r.sub.textContent = `${d.teamName} • Voltas: ${d.lap} • Pneu: ${d.tyre}`;
      r.wear.textContent = `${Math.round(d.tyreWear)}%`;

      setImgWithFallbackChain(r.avatar, faceCandidates(d));

      if (d === leader) {
        r.gap.textContent = "LEADER";
        r.gap.style.fontWeight = "800";
      } else {
        r.gap.textContent = `+${d.gap.toFixed(3)}`;
        r.gap.style.fontWeight = "500";
      }

      if (state.user.driverIds.includes(d.id)) {
        r.row.style.outline = "1px solid rgba(255,255,255,.25)";
        r.row.style.background = "rgba(255,255,255,0.09)";
      } else {
        r.row.style.outline = "none";
        r.row.style.background = "rgba(255,255,255,0.06)";
      }
    }
  }

  /* ---------------------------
     HUD user (mantém)
  --------------------------- */
  function setUserHud(index, driver) {
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

  function hydrateUserCard(index, driver) {
    const card = index === 0 ? el.userCard0 : el.userCard1;
    if (!card || !driver) return;

    const nameEl = $(".user-name", card);
    const teamEl = $(".user-team", card);
    const faceEl = $(".user-face", card);

    if (nameEl) nameEl.textContent = driver.name;
    if (teamEl) teamEl.textContent = driver.teamName;
    if (faceEl) setImgWithFallbackChain(faceEl, faceCandidates(driver));

    setUserHud(index, driver);
  }

  function wireUserCards() {
    const d0 = state.drivers.find(d => d.id === state.user.driverIds[0]) || state.drivers[0];
    const d1 = state.drivers.find(d => d.id === state.user.driverIds[1]) || state.drivers[1];

    hydrateUserCard(0, d0);
    hydrateUserCard(1, d1);

    [0, 1].forEach(i => {
      const card = i === 0 ? el.userCard0 : el.userCard1;
      if (!card) return;
      const pid = i === 0 ? d0.id : d1.id;

      $$(".user-btn", card).forEach(btn => {
        btn.addEventListener("click", () => {
          const act = (btn.dataset.action || "").toLowerCase();
          onUserAction(pid, act);
        });
      });
    });
  }

  /* ---------------------------
     Modes / wear
  --------------------------- */
  function weatherWearMultiplier() { return (state.weather === "Chuva") ? 0.85 : 1.0; }
  function engineFactor(mode) { if (mode === "ECON") return 0.965; if (mode === "ATTACK") return 1.020; return 1.0; }
  function aggrWearFactor(aggr) { return ({ A0:0.80, A1:0.92, A2:1.00, A3:1.12 }[aggr] || 1.0); }

  function tyreBaseGrip(tyre) {
    if (tyre === "S") return 1.020;
    if (tyre === "M") return 1.000;
    if (tyre === "H") return 0.985;
    if (tyre === "I") return (state.weather === "Chuva") ? 1.005 : 0.960;
    if (tyre === "W") return (state.weather === "Chuva") ? 1.015 : 0.940;
    return 1.0;
  }

  function tyreWearDeltaPerSecond(d) {
    const base = 0.028;
    const grip = tyreBaseGrip(d.tyre);
    const mode = engineFactor(d.engineMode);
    const ag = aggrWearFactor(d.aggr);
    const wmul = weatherWearMultiplier();

    let rainPenalty = 1.0;
    if (state.weather === "Chuva" && (d.tyre === "S" || d.tyre === "M" || d.tyre === "H")) rainPenalty = 1.55;

    return base * grip * mode * ag * wmul * rainPenalty;
  }

  /* ---------------------------
     PIT (mantém simples por enquanto)
  --------------------------- */
  function requestPit(driver) {
    if (!driver || driver.pit.inPit) return;
    driver.pit.requested = true;
  }

  function performPitStop(driver) {
    driver.pit.requested = false;
    driver.pit.inPit = true;

    const base = 3.1;
    const extra = (driver.engineMode === "ATTACK") ? 0.15 : 0;
    const pitTime = base + extra + Math.random() * 0.35;

    driver.pit.pitUntil = now() + pitTime * 1000 / state.speedMul;
    driver.pit.lastPitLap = driver.lap;

    driver.tyreWear = 100;
    if (state.weather === "Chuva") driver.tyre = "W";
    else driver.tyre = "M";

    driver.totalTime += pitTime + 17.0;
  }

  function updatePit(driver) {
    if (!driver) return;

    if (driver.pit.inPit) {
      if (now() >= driver.pit.pitUntil) driver.pit.inPit = false;
      return;
    }

    if (!driver.pit.requested) return;
    if (driver.lap < 1) return;
    if (driver.pit.lastPitLap === driver.lap) return;

    if (driver.progress >= 0.975) performPitStop(driver);
  }

  /* ---------------------------
     User actions
  --------------------------- */
  function onUserAction(driverId, action) {
    const d = state.drivers.find(x => x.id === driverId);
    if (!d) return;

    switch (action) {
      case "pit": requestPit(d); break;
      case "ataque": d.engineMode = "ATTACK"; break;
      case "economizar": d.engineMode = "ECON"; break;
      case "motor":
      case "motor+":
        d.engineMode = (d.engineMode === "ECON") ? "NORMAL" : (d.engineMode === "NORMAL" ? "ATTACK" : "ECON");
        break;
      case "agress":
      case "agress+":
        d.aggr = (d.aggr === "A0") ? "A1" : (d.aggr === "A1" ? "A2" : (d.aggr === "A2" ? "A3" : "A0"));
        break;
      case "ers":
      case "ersboost":
      case "ers boost":
        if (d.ers >= 10) d.ers -= 10;
        break;
    }
  }

  /* ---------------------------
     Race loop
  --------------------------- */
  function computeDriverSpeed(d, dtSec) {
    const pace = d.pace || 80;
    const wearPenalty = (100 - d.tyreWear) * 0.0023;
    const engine = engineFactor(d.engineMode);
    const grip = tyreBaseGrip(d.tyre);

    const ersBonus = (d.ers - 50) * 0.00035;
    const aggrBonusMap = { A0:-0.002, A1:0.0, A2:0.001, A3:0.002 };
    const aggrBonus = aggrBonusMap[d.aggr] || 0;

    let v = (pace / 100) * 0.045;
    v *= engine;
    v *= grip;
    v *= (1 - wearPenalty);
    v *= (1 + ersBonus + aggrBonus);

    if (state.weather === "Chuva") v *= 0.965;
    return clamp(v, 0.010, 0.085);
  }

  function tick(dtMs) {
    const dtSec = (dtMs / 1000) * state.speedMul;

    for (const d of state.drivers) {
      updatePit(d);
      if (d.pit.inPit) continue;

      const wear = tyreWearDeltaPerSecond(d) * dtSec;
      d.tyreWear = clamp(d.tyreWear - wear, 0, 100);

      if (d.engineMode === "ECON") d.ers = clamp(d.ers + 0.18 * dtSec, 0, 100);
      else if (d.engineMode === "ATTACK") d.ers = clamp(d.ers - 0.25 * dtSec, 0, 100);
      else d.ers = clamp(d.ers + 0.05 * dtSec, 0, 100);

      const v = computeDriverSpeed(d, dtSec);
      d.progress += v * dtSec;

      if (d.progress >= 1) {
        d.progress -= 1;
        d.lap += 1;

        if (d.lap >= state.totalLaps) d.progress = 0.999;
      }

      d.totalTime += dtSec;
    }

    updatePositions();
    renderCars();

    const t = now();
    if (t - state.lastUiUpdate > 160) {
      state.lastUiUpdate = t;
      updateUI();
    }
  }

  function updatePositions() {
    state.drivers.sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.totalTime - b.totalTime;
    });

    for (let i = 0; i < state.drivers.length; i++) state.drivers[i].pos = i + 1;

    const leader = state.drivers[0];
    for (const d of state.drivers) d.gap = d.totalTime - leader.totalTime;
  }

  function updateUI() {
    if (el.lapLabel) {
      const leaderLap = state.drivers[0]?.lap ?? 0;
      el.lapLabel.textContent = `Volta ${Math.min(leaderLap + 1, state.totalLaps)} / ${state.totalLaps}`;
    }

    updateStandingsUI();

    const d0 = state.drivers.find(d => d.id === state.user.driverIds[0]);
    const d1 = state.drivers.find(d => d.id === state.user.driverIds[1]);
    if (d0) setUserHud(0, d0);
    if (d1) setUserHud(1, d1);
  }

  function bindSpeedButtons() {
    $$(".speed-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const s = Number(btn.dataset.speed || "1");
        state.speedMul = clamp(s, 1, 4);
        $$(".speed-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function bindBackButton() {
    if (!el.btnBack) return;
    el.btnBack.addEventListener("click", () => { location.href = "index.html"; });
  }

  function loop() {
    if (!state.running) return;
    const t = now();
    const dt = t - state.lastTick;
    state.lastTick = t;

    tick(clamp(dt, 0, 50));
    requestAnimationFrame(loop);
  }

  async function init() {
    setTopBar();
    initWeather();
    setWeatherUI();

    buildGridFromQualiOrDefault();
    await loadTrackAssets();

    buildStandingsUIOnce();
    bindSpeedButtons();
    bindBackButton();
    wireUserCards();

    updateUI();

    state.lastTick = now();
    requestAnimationFrame(loop);
  }

  window.addEventListener("load", init);
})();
