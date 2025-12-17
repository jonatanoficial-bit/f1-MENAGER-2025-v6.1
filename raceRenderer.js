/* ==========================================================
   RACE RENDERER — ÚNICA CAMADA DE DESENHO DO MAPA
   - Injeta 1 SVG limpo (sem duplicar)
   - Desenha carros como “bolinhas” coloridas por equipe
   - Mantém escala consistente em PC e Mobile
   - Carros seguem em cima da linha
========================================================== */

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  const state = {
    svgRoot: null,
    svgCarsLayer: null,
    svgTrackLayer: null,
    pathPoints: [],
    cars: new Map(), // id -> { g, body, outline, label }
    viewBox: "0 0 1000 1000",
    ready: false
  };

  // ==============
  // HELPERS
  // ==============
  function createSvgEl(tag) {
    return document.createElementNS(NS, tag);
  }

  function setAttrs(el, attrs) {
    for (const k in attrs) el.setAttribute(k, attrs[k]);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getPoint(points, t) {
    if (!points || !points.length) return { x: 0, y: 0 };
    const n = points.length;
    const idx = t * (n - 1);
    const i0 = Math.floor(idx);
    const i1 = (i0 + 1) % n;
    const frac = idx - i0;

    const p0 = points[clamp(i0, 0, n - 1)];
    const p1 = points[clamp(i1, 0, n - 1)];

    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac
    };
  }

  function inferTeamColor(driver) {
    // se o RaceSystem já colocou teamColor, usa
    if (driver && driver.teamColor) return driver.teamColor;

    // fallback simples
    const team = (driver?.team || "").toLowerCase();
    if (team.includes("ferrari")) return "#ff2a2a";
    if (team.includes("mclaren")) return "#ff7a00";
    if (team.includes("red")) return "#2e57ff";
    if (team.includes("mercedes")) return "#00ffd5";
    if (team.includes("aston")) return "#00a86b";
    if (team.includes("alpine")) return "#ff4fd8";
    if (team.includes("williams")) return "#2aa1ff";
    if (team.includes("haas")) return "#bdbdbd";
    if (team.includes("rb")) return "#5d7bff";
    if (team.includes("sauber")) return "#44ff44";
    return "#ffffff";
  }

  // ==============
  // CREATE ROOT
  // ==============
  function ensureRoot() {
    const container = document.getElementById("track-container");
    if (!container) throw new Error("track-container não encontrado no HTML.");

    // Limpa somente o container do mapa (UI fica fora)
    container.innerHTML = "";

    const svg = createSvgEl("svg");
    svg.setAttribute("id", "race-track-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", state.viewBox);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Layers (ordem importa)
    const trackLayer = createSvgEl("g");
    trackLayer.setAttribute("id", "track-layer");

    const carsLayer = createSvgEl("g");
    carsLayer.setAttribute("id", "cars-layer");

    svg.appendChild(trackLayer);
    svg.appendChild(carsLayer);

    container.appendChild(svg);

    state.svgRoot = svg;
    state.svgTrackLayer = trackLayer;
    state.svgCarsLayer = carsLayer;
  }

  // ==============
  // SET TRACK
  // ==============
  function setTrack(svgClean, pathPoints) {
    state.ready = false;

    // Extrai viewBox do svgClean (se houver)
    try {
      const doc = new DOMParser().parseFromString(svgClean, "image/svg+xml");
      const svg = doc.querySelector("svg");
      const vb = svg?.getAttribute("viewBox");
      if (vb) state.viewBox = vb;
    } catch {}

    ensureRoot();

    // Limpa layer da pista e injeta 1 SVG (sem duplicar)
    state.svgTrackLayer.innerHTML = "";

    // Injeta markup do SVG limpo dentro do track-layer
    const wrapper = document.createElement("div");
    wrapper.innerHTML = svgClean.trim();
    const injectedSvg = wrapper.querySelector("svg");

    if (!injectedSvg) throw new Error("SVG inválido (sem <svg> injetável).");

    // Move apenas os paths internos para o track-layer
    const children = Array.from(injectedSvg.childNodes).filter(n => n.nodeType === 1);
    children.forEach(node => {
      state.svgTrackLayer.appendChild(node);
    });

    // Traçado pontilhado (bolinhas pequenas) — UM conjunto apenas
    // (isso resolve “sumiu a linha” e ajuda visual AAA)
    if (Array.isArray(pathPoints) && pathPoints.length > 0) {
      const dots = createSvgEl("g");
      dots.setAttribute("opacity", "0.6");

      const step = Math.max(1, Math.floor(pathPoints.length / 220));
      for (let i = 0; i < pathPoints.length; i += step) {
        const p = pathPoints[i];
        const c = createSvgEl("circle");
        setAttrs(c, {
          cx: p.x,
          cy: p.y,
          r: 2.0,
          fill: "rgba(255,255,255,0.55)"
        });
        dots.appendChild(c);
      }
      state.svgTrackLayer.appendChild(dots);
    }

    state.pathPoints = Array.isArray(pathPoints) ? pathPoints : [];

    // Cars reset
    state.cars.clear();
    state.svgCarsLayer.innerHTML = "";

    // Ajusta viewBox final
    state.svgRoot.setAttribute("viewBox", state.viewBox);

    state.ready = true;
  }

  // ==============
  // CREATE/UPDATE CARS
  // ==============
  function ensureCar(driver) {
    const id = driver.id;
    if (state.cars.has(id)) return state.cars.get(id);

    const g = createSvgEl("g");
    g.setAttribute("class", "car-marker");

    // outline (para destacar no traçado)
    const outline = createSvgEl("circle");
    setAttrs(outline, {
      r: 7.8,
      fill: "rgba(0,0,0,0.65)"
    });

    const body = createSvgEl("circle");
    setAttrs(body, {
      r: 6.3,
      fill: inferTeamColor(driver),
      stroke: "rgba(0,0,0,0.55)",
      "stroke-width": "1.2"
    });

    // label pequeno (código do piloto) — opcional, mas ajuda muito
    const label = createSvgEl("text");
    setAttrs(label, {
      x: 0,
      y: -10,
      "text-anchor": "middle",
      "font-size": "10",
      "font-family": "system-ui, -apple-system, Segoe UI, sans-serif",
      fill: "rgba(255,255,255,0.9)",
      stroke: "rgba(0,0,0,0.55)",
      "stroke-width": "2",
      "paint-order": "stroke"
    });
    label.textContent = driver.code || "";

    // seta para pilotos do usuário
    if (driver.isPlayer) {
      const tri = createSvgEl("polygon");
      tri.setAttribute("points", "0,-18 8,-4 -8,-4");
      tri.setAttribute("fill", inferTeamColor(driver));
      tri.setAttribute("stroke", "rgba(0,0,0,0.6)");
      tri.setAttribute("stroke-width", "1");
      g.appendChild(tri);
    }

    g.appendChild(outline);
    g.appendChild(body);
    g.appendChild(label);

    state.svgCarsLayer.appendChild(g);

    const obj = { g, body, outline, label };
    state.cars.set(id, obj);
    return obj;
  }

  // ==============
  // RENDER
  // ==============
  function renderCars(drivers, pathPoints) {
    if (!state.ready) return;
    if (!drivers || !drivers.length) return;

    const pts = pathPoints && pathPoints.length ? pathPoints : state.pathPoints;
    if (!pts || !pts.length) return;

    for (const d of drivers) {
      const car = ensureCar(d);

      // Atualiza cor se mudou (nunca fica “tudo igual”)
      const col = inferTeamColor(d);
      if (car.body.getAttribute("fill") !== col) car.body.setAttribute("fill", col);

      // Posição: em cima da linha (sem offset lateral)
      const p = getPoint(pts, clamp(d.progress, 0, 1));
      car.g.setAttribute("transform", `translate(${p.x},${p.y})`);
    }
  }

  // ==========================
  // PUBLIC API
  // ==========================
  window.RaceRenderer = {
    setTrack,
    renderCars
  };

})();
