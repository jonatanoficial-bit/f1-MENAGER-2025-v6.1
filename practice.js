/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE) — v6.1
   Alinhado ao HTML real (practice.html) e SVG (assets/tracks/*.svg)

   ✔ Carrega SVG em #track-container
   ✔ Gera pathPoints a partir do PATH principal (lógica estilo qualifying)
   ✔ Carros como elementos SVG (cx/cy) => SEM desalinhamento ao redimensionar
   ✔ Velocidade realista por km/h, com variação por curva + modo + setup da oficina
   ✔ 1x / 2x / 4x com deltaTime correto (sem “supervelocidade”)
   ✔ Pit stop + modos (eco/normal/attack)
   ✔ Telemetria avançada + gráfico
   ✔ Integração TL → Quali/Race via Season Store (NÃO altera jogabilidade)
========================================================= */

(() => {
  "use strict";

  /* ===============================
     SEASON STORE (TL/QUALI/RACE LINK)
     =============================== */
  const SEASON_KEY = "f1m2025_season_state";
  const ECON_KEY = "f1m2025_economy";

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
    for (const k of Object.keys(patch)) {
      const pv = patch[k];
      const bv = out[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv)) out[k] = deepMerge(bv || {}, pv);
      else out[k] = pv;
    }
    return out;
  }

  function loadSeason() {
    try {
      const raw = localStorage.getItem(SEASON_KEY);
      if (!raw) return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
      const obj = JSON.parse(raw);
      return deepMerge({ version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} }, obj);
    } catch (e) {
      return { version: 1, current: {}, setup: {}, practice: {}, qualifying: {}, race: {}, staff: {} };
    }
  }

  function saveSeason(patch) {
    try {
      const s = loadSeason();
      const next = deepMerge(s, patch || {});
      localStorage.setItem(SEASON_KEY, JSON.stringify(next));
      return next;
    } catch (e) {
      return null;
    }
  }

  function syncStaffFromEconomy() {
    try {
      const raw = localStorage.getItem(ECON_KEY);
      if (!raw) return;
      const econ = JSON.parse(raw);
      if (!econ || !econ.staff) return;
      saveSeason({
        staff: {
          pitCrewLevel: Number(econ.staff.pitCrewLevel ?? 3),
          tyreEngineerLevel: Number(econ.staff.tyreEngineerLevel ?? 3),
          setupEngineerLevel: Number(econ.staff.setupEngineerLevel ?? 3)
        }
      });
    } catch (e) {}
  }

  /* ===============================
     BASE DE PILOTOS (ajuste solicitado)
     =============================== */
  const DRIVERS_2025 = [
    { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
    { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

    { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
    { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

    { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
    { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 92, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

    { id: "norris",  code: "NOR", name: "Lando Norris",  teamKey: "mclaren", teamName: "McLaren", rating: 93, color: "#ff6f00", logo: "assets/logos/mclaren.png" },
    { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 90, color: "#ff6f00", logo: "assets/logos/mclaren.png" },

    { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "astonmartin", teamName: "Aston Martin", rating: 92, color: "#00c853", logo: "assets/logos/aston_martin.png" },
    { id: "stroll", code: "STR", name: "Lance Stroll",    teamKey: "astonmartin", teamName: "Aston Martin", rating: 86, color: "#00c853", logo: "assets/logos/aston_martin.png" },

    { id: "gasly", code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#2979ff", logo: "assets/logos/alpine.png" },
    { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 89, color: "#2979ff", logo: "assets/logos/alpine.png" },

    { id: "albon", code: "ALB", name: "Alexander Albon", teamKey: "williams", teamName: "Williams", rating: 88, color: "#64b5f6", logo: "assets/logos/williams.png" },
    { id: "sargeant", code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 84, color: "#64b5f6", logo: "assets/logos/williams.png" },

    { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", rating: 88, color: "#90caf9", logo: "assets/logos/rb.png" },
    { id: "ricciardo", code: "RIC", name: "Daniel Ricciardo", teamKey: "rb", teamName: "RB", rating: 87, color: "#90caf9", logo: "assets/logos/rb.png" },

    // SAUBER 2025 (corrigido conforme pedido)
    { id: "bortoleto", code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03", logo: "assets/logos/sauber.png" },
    { id: "zhou",      code: "ZHO", name: "Guanyu Zhou",      teamKey: "sauber", teamName: "Sauber", rating: 86, color: "#76ff03", logo: "assets/logos/sauber.png" },

    { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg", teamKey: "haas", teamName: "Haas", rating: 87, color: "#bdbdbd", logo: "assets/logos/haas.png" },
    { id: "magnussen",  code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 86, color: "#bdbdbd", logo: "assets/logos/haas.png" },
  ];

  /* ===============================
     DOM
     =============================== */
  const elTrackName = document.getElementById("trackName");
  const elSessionStatus = document.getElementById("sessionStatus");
  const elHudLiveTag = document.getElementById("hudLiveTag");
  const elTeamLogoTop = document.getElementById("teamLogoTop");

  const elBestLapValue = document.getElementById("bestLapValue");
  const elBestLapValue2 = document.getElementById("bestLapValue2");

  const btnSpeed1 = document.getElementById("btnSpeed1");
  const btnSpeed2 = document.getElementById("btnSpeed2");
  const btnSpeed4 = document.getElementById("btnSpeed4");

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
    const ss = s.toFixed(3).padStart(6, "0");
    return `${m}:${ss}`;
  };

  function safeSetText(el, text) {
    if (!el) return;
    el.textContent = String(text ?? "");
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
    } catch (e) {
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

  /* ===============================
     PRACTICE SNAPSHOT (para Quali/Race)
     - NÃO altera jogabilidade: apenas salva dados
     =============================== */
  function savePracticeSnapshot(reason) {
    try {
      syncStaffFromEconomy();

      const setupRaw = readSetup();
      const setupFactors = setupToFactors(setupRaw);

      const bestLaps = {};
      if (Array.isArray(cars)) {
        cars.forEach((c) => {
          if (c && c.code) {
            // practice usa segundos; padroniza em ms para consumo em quali/race
            const ms = c.bestLap ? Math.round(c.bestLap * 1000) : 0;
            bestLaps[c.code] = ms;
          }
        });
      }

      saveSeason({
        current: { track: trackKey, gp: gpName, updatedAt: Date.now() },
        setup: {
          track: trackKey,
          gp: gpName,
          userTeamKey: userTeam,
          updatedAt: Date.now(),
          raw: setupRaw,
          factors: setupFactors
        },
        practice: {
          track: trackKey,
          gp: gpName,
          userTeamKey: userTeam,
          updatedAt: Date.now(),
          reason: reason || "autosave",
          bestLaps
        }
      });
    } catch (e) {
      console.warn("Practice snapshot não pôde ser salvo:", e);
    }
  }
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

  // -------------------------------
  // PARAMS URL
  // -------------------------------
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || `GP ${trackKey.toUpperCase()} 2025`;
  const userTeam =
    (params.get("userTeam") ||
      localStorage.getItem("f1m2025_user_team") ||
      "ferrari").toLowerCase();

  localStorage.setItem("f1m2025_user_team", userTeam);

  const userDrivers = getUserDrivers(userTeam);

  /* ===============================
     HEADER / LINKS
     =============================== */
  safeSetText(elTrackName, gpName || trackKey.toUpperCase());
  safeSetText(elSessionStatus, "Treino Livre");
  safeSetText(elHudLiveTag, "LIVE");

  // Logo topo (se não existir, não quebra)
  if (elTeamLogoTop) {
    elTeamLogoTop.src = `assets/teams/${userTeam}.png`;
    elTeamLogoTop.onerror = () => {
      if (userTeam === "astonmartin") elTeamLogoTop.src = "assets/teams/aston_martin.png";
    };
  }

  if (btnBackLobby) {
    btnBackLobby.addEventListener("click", () => {
      const url = new URL("lobby.html", window.location.href);
      url.searchParams.set("userTeam", userTeam);
      savePracticeSnapshot("goLobby");
      window.location.href = url.toString();
    });
  }

  if (btnGoOficina) {
    btnGoOficina.addEventListener("click", () => {
      const url = new URL("oficina.html", window.location.href);
      url.searchParams.set("track", trackKey);
      url.searchParams.set("gp", gpName);
      url.searchParams.set("userTeam", userTeam);
      savePracticeSnapshot("goOficina");
      window.location.href = url.toString();
    });
  }

  if (btnGoQualy) {
    btnGoQualy.addEventListener("click", () => {
      const url = new URL("qualifying.html", window.location.href);
      url.searchParams.set("track", trackKey);
      url.searchParams.set("gp", gpName);
      url.searchParams.set("userTeam", userTeam);
      savePracticeSnapshot("goQualy");
      window.location.href = url.toString();
    });
  }

  /* ===============================
     SPEED CONTROLS
     =============================== */
  let speedMult = 1;

  function setSpeedMultiplier(v) {
    speedMult = v;
    [btnSpeed1, btnSpeed2, btnSpeed4].forEach(b => b && b.classList.remove("active"));
    if (v === 1 && btnSpeed1) btnSpeed1.classList.add("active");
    if (v === 2 && btnSpeed2) btnSpeed2.classList.add("active");
    if (v === 4 && btnSpeed4) btnSpeed4.classList.add("active");
  }

  if (btnSpeed1) btnSpeed1.addEventListener("click", () => setSpeedMultiplier(1));
  if (btnSpeed2) btnSpeed2.addEventListener("click", () => setSpeedMultiplier(2));
  if (btnSpeed4) btnSpeed4.addEventListener("click", () => setSpeedMultiplier(4));

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

    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");

    const path = doc.querySelector("path");
    if (!path) throw new Error("SVG inválido: nenhum <path> encontrado.");

    mainPath = path;

    // cria SVG local com viewBox fixo
    trackContainer.innerHTML = "";
    svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgRoot.setAttribute("width", "100%");
    svgRoot.setAttribute("height", "100%");
    svgRoot.setAttribute("viewBox", "0 0 1000 600");
    svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");
    trackContainer.appendChild(svgRoot);

    // amostra pontos do PATH
    const len = path.getTotalLength();
    const samples = 700;

    const pts = [];
    for (let i = 0; i < samples; i++) {
      const p = path.getPointAtLength((len * i) / samples);
      pts.push({ x: p.x, y: p.y });
    }

    // normaliza no viewBox 1000x600
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = (maxX - minX) || 1;
    const h = (maxY - minY) || 1;
    const pad = 22;

    pathPoints = pts.map(p => ({
      x: pad + ((p.x - minX) / w) * (1000 - pad * 2),
      y: pad + ((p.y - minY) / h) * (600 - pad * 2)
    }));

    // calcula curvatura simples (diferença de ângulo)
    curvature = [];
    for (let i = 0; i < pathPoints.length; i++) {
      const p0 = pathPoints[(i - 1 + pathPoints.length) % pathPoints.length];
      const p1 = pathPoints[i];
      const p2 = pathPoints[(i + 1) % pathPoints.length];
      const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      let diff = Math.abs(a2 - a1);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      curvature.push(clamp(diff / (Math.PI / 2), 0, 1));
    }

    // desenha pista (duas linhas)
    const polyOuter = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyOuter.setAttribute("points", pathPoints.map(p => `${p.x},${p.y}`).join(" "));
    polyOuter.setAttribute("fill", "none");
    polyOuter.setAttribute("stroke", "#555");
    polyOuter.setAttribute("stroke-width", "18");
    polyOuter.setAttribute("stroke-linecap", "round");
    polyOuter.setAttribute("stroke-linejoin", "round");
    svgRoot.appendChild(polyOuter);

    const polyInner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyInner.setAttribute("points", pathPoints.map(p => `${p.x},${p.y}`).join(" "));
    polyInner.setAttribute("fill", "none");
    polyInner.setAttribute("stroke", "#ffffff");
    polyInner.setAttribute("stroke-width", "6");
    polyInner.setAttribute("stroke-linecap", "round");
    polyInner.setAttribute("stroke-linejoin", "round");
    svgRoot.appendChild(polyInner);

    // camada dos carros
    carsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    carsLayer.setAttribute("id", "cars-layer");
    svgRoot.appendChild(carsLayer);
  }

  function getPointAtProgress(t01) {
    if (!pathPoints.length) return { x: 0, y: 0 };
    const n = pathPoints.length;
    const idxFloat = t01 * n;
    let i0 = Math.floor(idxFloat);
    let i1 = (i0 + 1) % n;
    const t = idxFloat - i0;
    if (i0 >= n) i0 = n - 1;
    const p0 = pathPoints[i0];
    const p1 = pathPoints[i1];
    return { x: lerp(p0.x, p1.x, t), y: lerp(p0.y, p1.y, t), c: curvature[i0] || 0 };
  }

  /* ===============================
     SIMULAÇÃO (carros)
     =============================== */
  const cars = DRIVERS_2025.map((d) => ({
    ...d,
    progress: Math.random(),
    speed: 0,
    mode: "normal", // eco / normal / attack
    tyre: 100,
    fuel: 100,
    engine: 100,
    bestLap: 0,
    lapStart: 0,
    laps: 0,
    inPit: false,
    pitTimer: 0,
    svgEl: null
  }));

  function createCarSVG(car) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", car.teamKey === userTeam ? "7" : "6");
    c.setAttribute("fill", car.color || "#fff");
    c.setAttribute("stroke", "rgba(0,0,0,0.55)");
    c.setAttribute("stroke-width", "2");
    carsLayer.appendChild(c);
    car.svgEl = c;
  }

  function initCars() {
    if (!carsLayer) return;
    carsLayer.innerHTML = "";
    cars.forEach(createCarSVG);
  }

  function updateCars(dt) {
    const setup = readSetup();
    const factors = setupToFactors(setup);

    cars.forEach((car) => {
      // velocidade base + variação por curva + modo
      const p = getPointAtProgress(car.progress);
      const curve = p.c;

      const baseKmh = 315;
      const curvePenalty = 1.0 - curve * 0.36;

      let modeFactor = 1.0;
      if (car.mode === "eco") modeFactor = 0.92;
      if (car.mode === "attack") modeFactor = 1.05;

      // aplica setup apenas ao time do usuário (como já era a intenção do projeto)
      let setupFactor = 1.0;
      if (car.teamKey === userTeam) {
        setupFactor = clamp((factors.topSpeedFactor * 0.65 + factors.gripFactor * 0.35), 0.92, 1.06);
      }

      const kmh = baseKmh * curvePenalty * modeFactor * setupFactor;
      const mps = (kmh * 1000) / 3600;

      // converte p/ avanço no traçado (dt já é ms)
      const trackLenMeters = 5200;
      const dist = mps * (dt / 1000) * speedMult;
      const deltaProgress = dist / trackLenMeters;

      // desgaste simplificado (mantém o comportamento original)
      const tyreWear = (dt / 1000) * 0.03 * (car.mode === "attack" ? 1.2 : car.mode === "eco" ? 0.8 : 1.0);
      car.tyre = clamp(car.tyre - tyreWear, 0, 100);

      // pit stop simplificado (mantém original)
      if (car.inPit) {
        car.pitTimer -= dt * speedMult;
        if (car.pitTimer <= 0) {
          car.inPit = false;
          car.tyre = 100;
        }
        return;
      }

      car.progress += deltaProgress;
      if (car.progress >= 1) {
        car.progress -= 1;
        car.laps += 1;

        const now = performance.now();
        const lapSec = (now - car.lapStart) / 1000;
        car.lapStart = now;

        if (!car.bestLap || lapSec < car.bestLap) car.bestLap = lapSec;

        // pit aleatório (igual ao seu)
        if (Math.random() < 0.08 && car.laps > 0) {
          car.inPit = true;
          car.pitTimer = 4000 + Math.random() * 2500;
        }
      }
    });
  }

  function renderCars() {
    cars.forEach((car) => {
      if (!car.svgEl) return;
      const p = getPointAtProgress(car.progress);
      car.svgEl.setAttribute("cx", String(p.x));
      car.svgEl.setAttribute("cy", String(p.y));
      car.svgEl.setAttribute("opacity", car.inPit ? "0.55" : "0.98");
    });
  }

  function renderBestLap() {
    const sorted = cars.slice().sort((a, b) => {
      const la = a.bestLap > 0 ? a.bestLap : 9999;
      const lb = b.bestLap > 0 ? b.bestLap : 9999;
      return la - lb;
    });

    const best = sorted[0]?.bestLap || 0;
    const second = sorted[1]?.bestLap || 0;

    safeSetText(elBestLapValue, formatLap(best));
    safeSetText(elBestLapValue2, formatLap(second));
  }

  /* ===============================
     LOOP
     =============================== */
  const state = {
    lastFrame: 0
  };

  function tick(now) {
    const dt = clamp(now - state.lastFrame, 0, 50);
    state.lastFrame = now;

    updateCars(dt);
    renderCars();
    renderBestLap();

    requestAnimationFrame(tick);
  }

  /* ===============================
     INIT
     =============================== */
  async function init() {
    try {
      syncStaffFromEconomy();

      await loadTrackSVG();
      initCars();

      // marca lapStart
      const t0 = performance.now();
      cars.forEach(c => (c.lapStart = t0));

      // velocidade inicial 1x
      setSpeedMultiplier(1);

      // autosave leve (não impacta performance)
      setInterval(() => savePracticeSnapshot("interval"), 12000);

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
