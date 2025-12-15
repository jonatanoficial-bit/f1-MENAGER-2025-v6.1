/* raceRenderer.js — carrega SVG, amostra path, desenha pista + carros no canvas */

(function () {
  "use strict";

  const { RaceState } = window.RaceSystem;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    return { w: canvas.width, h: canvas.height, dpr };
  }

  function parseSvgAndAttach(svgText, stageEl) {
    stageEl.querySelectorAll("svg").forEach(s => s.remove());

    const wrap = document.createElement("div");
    wrap.innerHTML = svgText.trim();
    const svg = wrap.querySelector("svg");
    if (!svg) throw new Error("SVG inválido");

    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.pointerEvents = "none";

    // Garante viewBox
    if (!svg.getAttribute("viewBox")) {
      const w = parseFloat(svg.getAttribute("width") || "1000");
      const h = parseFloat(svg.getAttribute("height") || "600");
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }

    stageEl.appendChild(svg);
    return svg;
  }

  function findMainPath(svg) {
    // preferências: #racePath, path mais longo, polyline maior
    const preferred = svg.querySelector("#racePath");
    if (preferred && preferred.tagName.toLowerCase() === "path") return preferred;

    const polys = [...svg.querySelectorAll("polyline, polygon")];
    if (polys.length) {
      // pega o que tem mais pontos
      polys.sort((a, b) => (b.getAttribute("points") || "").length - (a.getAttribute("points") || "").length);
      return polys[0];
    }

    const paths = [...svg.querySelectorAll("path")];
    if (paths.length) {
      // pega o mais longo
      let best = paths[0];
      let bestLen = 0;
      paths.forEach(p => {
        try {
          const len = p.getTotalLength();
          if (len > bestLen) { bestLen = len; best = p; }
        } catch {}
      });
      return best;
    }

    return null;
  }

  function samplePointsFromPath(svg, shape, samples = 900) {
    const tag = shape.tagName.toLowerCase();

    if (tag === "polyline" || tag === "polygon") {
      const pts = (shape.getAttribute("points") || "").trim();
      if (!pts) throw new Error("Polyline sem points");
      const arr = pts.split(/[\s]+/).map(p => p.split(",").map(Number)).filter(p => p.length === 2 && isFinite(p[0]) && isFinite(p[1]));
      return arr.map(([x,y]) => ({ x, y }));
    }

    if (tag === "path") {
      const len = shape.getTotalLength();
      const points = [];
      for (let i = 0; i < samples; i++) {
        const p = shape.getPointAtLength((i / samples) * len);
        points.push({ x: p.x, y: p.y });
      }
      return points;
    }

    throw new Error("Shape não suportado para sampling");
  }

  function computeBounds(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    return { minX, minY, maxX, maxY, w, h };
  }

  function fitToCanvas(points, canvasW, canvasH, pad = 60) {
    const b = computeBounds(points);
    const scale = Math.min((canvasW - pad * 2) / b.w, (canvasH - pad * 2) / b.h);
    const ox = (canvasW - b.w * scale) / 2 - b.minX * scale;
    const oy = (canvasH - b.h * scale) / 2 - b.minY * scale;

    return points.map(p => ({
      x: p.x * scale + ox,
      y: p.y * scale + oy
    }));
  }

  function drawTrack(ctx, pts) {
    if (!pts || pts.length < 2) return;

    // pista “asfalto”
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // shadow
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.lineWidth = 22;
    ctx.stroke();

    // road base
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(230,230,240,.85)";
    ctx.lineWidth = 16;
    ctx.stroke();

    // inner line highlight
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  function drawStartLine(ctx, pts, idx) {
    if (!pts || pts.length < 2) return;
    const i = clamp(idx, 0, pts.length - 2);
    const a = pts[i], b = pts[i + 1];

    // normal
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    const midx = (a.x + b.x) / 2;
    const midy = (a.y + b.y) / 2;

    const w = 18;
    const h = 56;

    ctx.save();
    ctx.translate(midx, midy);
    const ang = Math.atan2(dy, dx);
    ctx.rotate(ang);

    // bandeirada
    for (let r = -2; r <= 2; r++) {
      for (let c = -1; c <= 1; c++) {
        const x = r * 6;
        const y = c * 12;
        const isBlack = (r + c) % 2 === 0;
        ctx.fillStyle = isBlack ? "rgba(255,255,255,.90)" : "rgba(0,0,0,.65)";
        ctx.fillRect(x - 3, y - 6, 6, 12);
      }
    }

    ctx.restore();
  }

  function pointAtProgress(trackPts, progress) {
    if (!trackPts || trackPts.length < 2) return { x: 0, y: 0 };
    const n = trackPts.length;
    const idx = Math.floor(progress * n) % n;
    return trackPts[idx];
  }

  function drawCars(ctx, trackPts, sortedDrivers) {
    if (!trackPts || trackPts.length < 2) return;

    sortedDrivers.forEach(d => {
      const p = pointAtProgress(trackPts, d.progress);

      // “offtrack” pequena: coloca o carro levemente ao lado da linha, para não ficar exatamente em cima
      // calculamos direção aproximada
      const n = trackPts.length;
      const idx = Math.floor(d.progress * n) % n;
      const a = trackPts[idx];
      const b = trackPts[(idx + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;

      const side = (d.position % 2 === 0) ? 1 : -1;
      const off = 5 * side;

      const x = p.x + nx * off;
      const y = p.y + ny * off;

      // glow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      // car
      ctx.beginPath();
      ctx.fillStyle = d.teamColor || "#ccc";
      ctx.arc(x, y, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // dot center
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.arc(x, y, 2.1, 0, Math.PI * 2);
      ctx.fill();

      // pit indicator
      if (d.inPit) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,.8)";
        ctx.lineWidth = 2;
        ctx.arc(x, y, 10.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  // ===== Renderer State =====
  const Renderer = {
    stageEl: null,
    canvas: null,
    ctx: null,
    svgEl: null,

    rawPoints: [],
    fittedPoints: [],
    lastSizeKey: "",

    async loadTrack(trackKey) {
      const stage = Renderer.stageEl;
      if (!stage) throw new Error("trackStage não encontrado");

      // sempre SVG
      const url = `assets/tracks/${trackKey}.svg`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao carregar: ${url} (${res.status})`);
      const svgText = await res.text();

      Renderer.svgEl = parseSvgAndAttach(svgText, stage);

      // precisa estar no DOM para getTotalLength funcionar
      const mainShape = findMainPath(Renderer.svgEl);
      if (!mainShape) throw new Error("Não encontrei path/polyline no SVG da pista");

      // amostra pontos
      Renderer.rawPoints = samplePointsFromPath(Renderer.svgEl, mainShape, 900);

      // start line (índice próximo ao “meio” do desenho ou o ponto mais próximo do lado direito)
      // aqui preferimos o ponto com maior X (tende a ficar “perto” da reta principal)
      let best = 0;
      let bestX = -Infinity;
      Renderer.rawPoints.forEach((p, i) => {
        if (p.x > bestX) { bestX = p.x; best = i; }
      });
      RaceState.track.startIndex = best;

      // marca pronto
      window.dispatchEvent(new CustomEvent("track:ready", { detail: { trackKey } }));
    },

    resize() {
      const { w, h, dpr } = getCanvasSize(Renderer.canvas);
      Renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // desenhar em coords CSS

      // fit points
      const cssW = Renderer.canvas.getBoundingClientRect().width;
      const cssH = Renderer.canvas.getBoundingClientRect().height;
      const sizeKey = `${Math.round(cssW)}x${Math.round(cssH)}`;
      if (sizeKey !== Renderer.lastSizeKey) {
        Renderer.lastSizeKey = sizeKey;
        Renderer.fittedPoints = fitToCanvas(Renderer.rawPoints, cssW, cssH, 70);
        RaceState.track.points = Renderer.fittedPoints;
      }
    },

    draw(sorted) {
      const ctx = Renderer.ctx;
      const rect = Renderer.canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // pista
      drawTrack(ctx, Renderer.fittedPoints);
      drawStartLine(ctx, Renderer.fittedPoints, RaceState.track.startIndex);

      // carros
      drawCars(ctx, Renderer.fittedPoints, sorted);
    }
  };

  // ===== Boot =====
  window.RaceRenderer = {
    async init() {
      Renderer.stageEl = document.getElementById("trackStage");
      Renderer.canvas = document.getElementById("trackCanvas");
      Renderer.ctx = Renderer.canvas.getContext("2d");

      await Renderer.loadTrack(RaceState.trackKey);

      Renderer.resize();
      window.addEventListener("resize", () => Renderer.resize(), { passive: true });
    },

    render(sortedDrivers) {
      Renderer.draw(sortedDrivers);
    }
  };
})();
