/* =========================================================
   F1 MANAGER 2025 — RACE.JS (ROBUSTO MOBILE)
   Objetivo:
   - Nunca iniciar corrida sem SVG + pathPoints
   - Carregar pista automaticamente por ?track=
   - Recalcular escala no mobile (resize/orientation)
   - Evitar tela preta (status overlay)
   ========================================================= */

(() => {
  "use strict";

  /* ===============================
     HELPERS
     =============================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function safeText(el, text) {
    if (el) el.textContent = text;
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /* ===============================
     PARAMS
     =============================== */
  const params = new URLSearchParams(location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();
  const gpName = params.get("gp") || `GP ${trackKey}`;

  /* ===============================
     UI ELEMENTS (DEFENSIVO)
     Ajuste aqui se seus IDs/classes forem diferentes.
     =============================== */
  const elMapWrap =
    $(".race-map") ||
    $(".track-map") ||
    $("#map") ||
    $(".map") ||
    $(".practice-track") || // fallback caso reaproveite layout
    document.body;

  const elSvgHost =
    $("#trackSvgHost") ||
    $(".race-track-svg") ||
    $(".track-svg") ||
    $(".svg-host") ||
    elMapWrap;

  const elStatus =
    $("#raceStatus") ||
    (() => {
      const d = document.createElement("div");
      d.id = "raceStatus";
      d.style.position = "fixed";
      d.style.left = "12px";
      d.style.top = "12px";
      d.style.zIndex = "99999";
      d.style.padding = "10px 12px";
      d.style.borderRadius = "12px";
      d.style.background = "rgba(0,0,0,0.55)";
      d.style.border = "1px solid rgba(255,255,255,0.14)";
      d.style.backdropFilter = "blur(10px)";
      d.style.color = "#fff";
      d.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
      d.style.fontSize = "12px";
      d.style.maxWidth = "80vw";
      d.style.pointerEvents = "none";
      d.textContent = "Carregando corrida…";
      document.body.appendChild(d);
      return d;
    })();

  // Botões de velocidade (aceita data-speed="1|2|4" OU ids conhecidos)
  const speedButtons =
    $$("[data-speed]") ||
    [$("#speed1x"), $("#speed2x"), $("#speed4x")].filter(Boolean);

  // Onde colocar carros
  // Ideal: um overlay absoluto por cima do SVG
  const elCarsLayer =
    $("#carsLayer") ||
    (() => {
      const layer = document.createElement("div");
      layer.id = "carsLayer";
      layer.style.position = "absolute";
      layer.style.left = "0";
      layer.style.top = "0";
      layer.style.right = "0";
      layer.style.bottom = "0";
      layer.style.pointerEvents = "none";
      layer.style.zIndex = "5";

      // garante que o host seja "posicionado"
      const host = elMapWrap;
      if (host && getComputedStyle(host).position === "static") {
        host.style.position = "relative";
      }
      if (host) host.appendChild(layer);
      return layer;
    })();

  // HUD (opcional)
  const elLap = $(".race-lap") || $("#raceLap");
  const elSession = $(".race-session") || $("#raceSession");
  const elClock = $(".race-time") || $("#raceTime");

  /* ===============================
     DADOS (MÍNIMO) — você pode trocar por seus data.js
     =============================== */
  const DRIVERS_2025 = [
    { id: "ver", name: "Max Verstappen", teamKey: "redbull", team: "Red Bull", rating: 98, face: "assets/faces/VER.png", teamLogo: "assets/teams/redbull.png" },
    { id: "per", name: "Sergio Pérez", teamKey: "redbull", team: "Red Bull", rating: 92, face: "assets/faces/PER.png", teamLogo: "assets/teams/redbull.png" },

    { id: "lec", name: "Charles Leclerc", teamKey: "ferrari", team: "Ferrari", rating: 95, face: "assets/faces/LEC.png", teamLogo: "assets/teams/ferrari.png" },
    { id: "sai", name: "Carlos Sainz", teamKey: "ferrari", team: "Ferrari", rating: 93, face: "assets/faces/SAI.png", teamLogo: "assets/teams/ferrari.png" },

    { id: "nor", name: "Lando Norris", teamKey: "mclaren", team: "McLaren", rating: 94, face: "assets/faces/NOR.png", teamLogo: "assets/teams/mclaren.png" },
    { id: "pia", name: "Oscar Piastri", teamKey: "mclaren", team: "McLaren", rating: 92, face: "assets/faces/PIA.png", teamLogo: "assets/teams/mclaren.png" },

    { id: "ham", name: "Lewis Hamilton", teamKey: "mercedes", team: "Mercedes", rating: 94, face: "assets/faces/HAM.png", teamLogo: "assets/teams/mercedes.png" },
    { id: "rus", name: "George Russell", teamKey: "mercedes", team: "Mercedes", rating: 92, face: "assets/faces/RUS.png", teamLogo: "assets/teams/mercedes.png" },
  ];

  function getTeamDrivers(teamKey) {
    const list = DRIVERS_2025.filter(d => d.teamKey === teamKey);
    if (list.length >= 2) return list.slice(0, 2);
    // fallback
    return DRIVERS_2025.filter(d => d.teamKey === "ferrari").slice(0, 2);
  }

  /* ===============================
     TRACK LOADING
     =============================== */
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${url}`);
    return await res.text();
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${url}`);
    return await res.json();
  }

  async function tryLoadSvg(track) {
    const svgUrl = `assets/tracks/${track}.svg`;
    try {
      const svgText = await fetchText(svgUrl);
      // injeta SVG dentro do host
      elSvgHost.innerHTML = svgText;

      // garante responsivo
      const svg = $("svg", elSvgHost);
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";
        // evita "colapsar" no mobile
        if (elMapWrap && !elMapWrap.style.minHeight) {
          elMapWrap.style.minHeight = "60svh";
        }
      }
      return true;
    } catch (e) {
      // SVG pode não existir — sem problema se você usa só pathPoints
      return false;
    }
  }

  function normalizePathPoints(points) {
    // aceita [{x,y}] em pixels ou normalizado; mantém como está
    if (!Array.isArray(points) || points.length < 10) return [];
    const sample = points[0];
    if (typeof sample.x !== "number" || typeof sample.y !== "number") return [];
    return points;
  }

  async function tryLoadPathPoints(track) {
    // 1) já existe (pista pré-carregada)
    if (Array.isArray(window.pathPoints) && window.pathPoints.length > 10) {
      return normalizePathPoints(window.pathPoints);
    }

    // 2) tentar JS que define window.pathPoints
    const jsUrl = `assets/tracks/${track}.js`;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = jsUrl;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Falha ao carregar ${jsUrl}`));
        document.head.appendChild(s);
      });

      if (Array.isArray(window.pathPoints) && window.pathPoints.length > 10) {
        return normalizePathPoints(window.pathPoints);
      }
    } catch (e) {
      // segue para JSON
    }

    // 3) tentar JSON
    const jsonUrl = `assets/tracks/${track}.json`;
    try {
      const data = await fetchJSON(jsonUrl);
      const arr = Array.isArray(data) ? data : data?.pathPoints;
      if (Array.isArray(arr) && arr.length > 10) return normalizePathPoints(arr);
    } catch (e) {
      // falhou
    }

    return [];
  }

  /* ===============================
     MAP FIT (mobile-safe)
     Converte points para coordenadas no container.
     =============================== */
  function computeFit(points, width, height, padding = 24) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const srcW = Math.max(1, maxX - minX);
    const srcH = Math.max(1, maxY - minY);

    const dstW = Math.max(1, width - padding * 2);
    const dstH = Math.max(1, height - padding * 2);

    const scale = Math.min(dstW / srcW, dstH / srcH);
    const offX = (width - srcW * scale) / 2 - minX * scale;
    const offY = (height - srcH * scale) / 2 - minY * scale;

    return { scale, offX, offY };
  }

  /* ===============================
     RACE STATE
     =============================== */
  const state = {
    ready: false,
    running: false,
    speedMult: 1,
    lastT: performance.now(),

    track: {
      points: [],
      fit: { scale: 1, offX: 0, offY: 0 },
      w: 0,
      h: 0
    },

    session: {
      lap: 1,
      totalLaps: 10,
      timeLeft: 0, // opcional
    },

    cars: []
  };

  function updateFit() {
    const rect = elMapWrap.getBoundingClientRect();
    state.track.w = Math.max(1, rect.width);
    state.track.h = Math.max(1, rect.height);
    state.track.fit = computeFit(state.track.points, state.track.w, state.track.h, 28);
  }

  function mapPoint(p) {
    const { scale, offX, offY } = state.track.fit;
    return { x: p.x * scale + offX, y: p.y * scale + offY };
  }

  /* ===============================
     CARS
     =============================== */
  function makeCarElement(driver) {
    const el = document.createElement("div");
    el.className = "race-car";
    el.style.position = "absolute";
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.borderRadius = "50%";
    el.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.6)";
    el.style.background = "rgba(255,255,255,0.85)";
    el.style.transform = "translate(-50%, -50%)";
    el.style.willChange = "transform,left,top";

    // tenta usar PNG do time como “skin” se quiser:
    // el.style.backgroundImage = `url(${driver.teamLogo})`;
    // el.style.backgroundSize = "cover";

    elCarsLayer.appendChild(el);
    return el;
  }

  function initCars() {
    const drivers = getTeamDrivers(userTeam);

    // cria dois carros do usuário
    state.cars = drivers.map((d, i) => {
      const el = makeCarElement(d);
      return {
        driver: d,
        el,
        progress: 0.15 + i * 0.05,
        baseSpeed: 0.020 + d.rating * 0.00008, // velocidade “realista” relativa ao traçado
        lap: 1,
        lastLapTime: null,
        lapStart: performance.now()
      };
    });
  }

  function placeCars(dtSim) {
    const pts = state.track.points;
    const n = pts.length;
    if (n < 10) return;

    for (const car of state.cars) {
      car.progress += car.baseSpeed * dtSim;

      if (car.progress >= 1) {
        car.progress -= 1;
        car.lap += 1;

        const now = performance.now();
        car.lastLapTime = (now - car.lapStart) / 1000;
        car.lapStart = now;

        // avança volta global (simples: quando o carro 0 passa)
        if (car === state.cars[0]) {
          state.session.lap = car.lap;
          safeText(elLap, `Volta ${Math.min(state.session.lap, state.session.totalLaps)}`);
        }
      }

      const idx = Math.floor(car.progress * (n - 1));
      const p0 = pts[idx];
      const p1 = pts[(idx + 1) % n];
      if (!p0 || !p1) continue;

      // interpola para suavidade
      const localT = (car.progress * (n - 1)) - idx;
      const px = lerp(p0.x, p1.x, localT);
      const py = lerp(p0.y, p1.y, localT);

      const mapped = mapPoint({ x: px, y: py });

      car.el.style.left = `${mapped.x}px`;
      car.el.style.top = `${mapped.y}px`;
    }
  }

  /* ===============================
     SPEED BUTTONS
     =============================== */
  function hookSpeedButtons() {
    const btns = $$("[data-speed]");
    if (!btns.length) return;

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const v = Number(btn.dataset.speed);
        if (![1, 2, 4].includes(v)) return;
        state.speedMult = v;
        btns.forEach(b => b.classList.toggle("active", b === btn));
      });
    });
  }

  /* ===============================
     PODIUM (fim da corrida)
     - Cria um overlay simples se você ainda não tiver.
     =============================== */
  function showPodium() {
    // ordena por melhor “lap time” (placeholder)
    const ordered = [...state.cars].sort((a, b) => {
      const ta = a.lastLapTime ?? 9999;
      const tb = b.lastLapTime ?? 9999;
      return ta - tb;
    });

    const top3 = ordered.slice(0, 3);

    const overlay = document.createElement("div");
    overlay.id = "podiumOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "999999";
    overlay.style.background = "rgba(0,0,0,0.78)";
    overlay.style.backdropFilter = "blur(12px)";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.style.padding = "24px";

    overlay.innerHTML = `
      <div style="width:min(920px, 94vw); border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(18,18,24,0.72); box-shadow:0 30px 120px rgba(0,0,0,0.6); overflow:hidden;">
        <div style="padding:16px 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.10);">
          <div style="font:700 14px system-ui; letter-spacing:.12em; text-transform:uppercase;">PÓDIO</div>
          <button id="podiumClose" style="background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.14); padding:10px 12px; border-radius:12px; font:600 12px system-ui;">Fechar</button>
        </div>
        <div style="padding:18px; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
          ${top3.map((c, i) => `
            <div style="border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:14px; background:rgba(0,0,0,0.35);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <div style="font:800 22px system-ui;">#${i + 1}</div>
                <img src="${c.driver.teamLogo}" onerror="this.style.display='none'" style="width:34px; height:34px; object-fit:contain; filter:drop-shadow(0 8px 16px rgba(0,0,0,.6));"/>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${c.driver.face}" onerror="this.style.display='none'" style="width:54px; height:54px; border-radius:14px; object-fit:cover; border:1px solid rgba(255,255,255,0.12);" />
                <div>
                  <div style="font:800 14px system-ui;">${c.driver.name}</div>
                  <div style="font:600 12px system-ui; opacity:.85;">${c.driver.team}</div>
                  <div style="font:600 12px system-ui; opacity:.75;">Última volta: ${c.lastLapTime ? c.lastLapTime.toFixed(3) + "s" : "--"}</div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    $("#podiumClose", overlay)?.addEventListener("click", () => overlay.remove());
  }

  /* ===============================
     MAIN LOOP
     =============================== */
  function tick(now) {
    const dt = (now - state.lastT) / 1000;
    state.lastT = now;

    if (!state.running) {
      requestAnimationFrame(tick);
      return;
    }

    const dtSim = dt * state.speedMult;

    // move carros
    placeCars(dtSim);

    // fim da corrida
    if (state.session.lap > state.session.totalLaps) {
      state.running = false;
      safeText(elStatus, "Corrida finalizada — exibindo pódio…");
      elStatus.style.opacity = "1";
      showPodium();
      return;
    }

    requestAnimationFrame(tick);
  }

  /* ===============================
     INIT
     =============================== */
  async function init() {
    try {
      safeText(elStatus, `Carregando pista: ${trackKey}…`);
      safeText(elSession, `Corrida — ${gpName}`);

      // tenta SVG (opcional)
      await tryLoadSvg(trackKey);

      // carrega pathPoints (obrigatório)
      const points = await tryLoadPathPoints(trackKey);
      if (!points.length) {
        elStatus.style.opacity = "1";
        elStatus.textContent =
          `ERRO: pista "${trackKey}" sem pathPoints.\n` +
          `Verifique: assets/tracks/${trackKey}.js OU ${trackKey}.json`;
        console.error("[RACE] pathPoints não encontrados para", trackKey);
        return;
      }

      state.track.points = points;

      // garante wrap com tamanho no mobile
      if (elMapWrap) {
        const st = elMapWrap.style;
        if (!st.minHeight) st.minHeight = "60svh";
        if (!st.height) st.height = "60svh";
      }

      // calcula fit
      updateFit();
      window.addEventListener("resize", () => {
        // debounce simples
        setTimeout(() => {
          updateFit();
        }, 80);
      });
      window.addEventListener("orientationchange", () => {
        setTimeout(() => updateFit(), 120);
      });

      // inicializa carros e botões
      initCars();
      hookSpeedButtons();

      // HUD base
      safeText(elLap, `Volta ${state.session.lap}`);
      safeText(elClock, "00:00");

      // start
      state.ready = true;
      state.running = true;

      // some com status depois de iniciar
      elStatus.textContent = `Pista carregada: ${trackKey} — corrida iniciada`;
      setTimeout(() => {
        elStatus.style.opacity = "0";
      }, 900);

      requestAnimationFrame(tick);
      console.log("[RACE] OK —", { trackKey, userTeam, points: points.length });

    } catch (err) {
      console.error("[RACE] init falhou:", err);
      elStatus.style.opacity = "1";
      elStatus.textContent = `ERRO ao iniciar corrida: ${String(err?.message || err)}`;
    }
  }

  init();
})();
