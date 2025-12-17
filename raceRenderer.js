/* ===========================
   raceRenderer.js (FULL) - FIX
   - Carros seguem exatamente o traçado
   - Força uma linha branca/cinza do traçado (overlay)
   - Conversão de coordenadas robusta (getScreenCTM)
   =========================== */

(function () {
  "use strict";

  const RaceRenderer = {
    container: null,
    overlay: null,
    svgRoot: null,
    mainPath: null,
    pathLen: 0,
    nodes: new Map(),

    mount(svgText) {
      this.container = document.getElementById("track-container");
      if (!this.container) return;

      this.container.innerHTML = "";

      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.innerHTML = svgText;

      const svg = wrapper.querySelector("svg");
      if (!svg) {
        this.container.innerHTML = "<div style='color:#fff;padding:12px'>SVG inválido.</div>";
        return;
      }

      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";

      this.svgRoot = svg;

      // escolhe path principal (o maior)
      const paths = Array.from(svg.querySelectorAll("path"));
      if (!paths.length) {
        this.container.appendChild(svg);
        return;
      }

      let best = paths[0];
      let bestLen = 0;
      for (const p of paths) {
        try {
          const L = p.getTotalLength();
          if (L > bestLen) {
            bestLen = L;
            best = p;
          }
        } catch (_) {}
      }

      this.mainPath = best;
      this.pathLen = bestLen || this.mainPath.getTotalLength();

      // >>> Overlay de linha (branca/cinza) para garantir traçado visível <<<
      this._ensureTrackStroke(svg, this.mainPath);

      // monta no container
      this.container.appendChild(svg);

      // overlay dos carros
      const overlay = document.createElement("div");
      overlay.id = "track-overlay";
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      this.overlay = overlay;
      this.container.style.position = "relative";
      this.container.appendChild(overlay);

      this.nodes.clear();
    },

    render(state) {
      if (!this.mainPath || !this.overlay) return;

      const cb = this.container.getBoundingClientRect();

      for (const d of state.drivers) {
        let el = this.nodes.get(d.code);
        if (!el) {
          el = document.createElement("div");
          el.className = "car-dot";
          el.style.position = "absolute";
          el.style.width = "10px";
          el.style.height = "10px";
          el.style.borderRadius = "999px";
          el.style.transform = "translate(-50%,-50%)";
          el.style.boxShadow = "0 6px 16px rgba(0,0,0,.45)";
          el.style.border = "2px solid rgba(255,255,255,.18)";
          el.style.background = this._teamColor(d.team);

          this.overlay.appendChild(el);
          this.nodes.set(d.code, el);
        } else {
          el.style.background = this._teamColor(d.team);
        }

        // ponto exato no path
        const { x, y } = this._pointOnPathScreen(d.t);

        // converte screen -> container
        el.style.left = (x - cb.left) + "px";
        el.style.top = (y - cb.top) + "px";
        el.style.opacity = d.finished ? "0.65" : "1";
      }
    },

    _pointOnPathScreen(t01) {
      const t = ((t01 % 1) + 1) % 1;
      const dist = t * this.pathLen;

      const p = this.mainPath.getPointAtLength(dist);

      const svg = this.svgRoot;
      const pt = svg.createSVGPoint();
      pt.x = p.x;
      pt.y = p.y;

      // MATRIZ CORRETA: screen CTM do path
      const m = this.mainPath.getScreenCTM();
      if (!m) return { x: 0, y: 0 };

      const sp = pt.matrixTransform(m);
      return { x: sp.x, y: sp.y };
    },

    _ensureTrackStroke(svg, path) {
      // cria um grupo overlay no final (garante “por cima”)
      let g = svg.querySelector("g[data-track-overlay='1']");
      if (!g) {
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("data-track-overlay", "1");
        svg.appendChild(g);
      } else {
        while (g.firstChild) g.removeChild(g.firstChild);
      }

      // duplica o path e força stroke visível
      const clone = path.cloneNode(true);
      clone.removeAttribute("fill");

      // linha externa cinza
      clone.setAttribute("stroke", "rgba(220,220,220,0.92)");
      clone.setAttribute("stroke-width", "10");
      clone.setAttribute("stroke-linecap", "round");
      clone.setAttribute("stroke-linejoin", "round");
      clone.setAttribute("opacity", "0.95");

      // linha interna branca (fica AAA)
      const inner = path.cloneNode(true);
      inner.removeAttribute("fill");
      inner.setAttribute("stroke", "rgba(255,255,255,0.92)");
      inner.setAttribute("stroke-width", "6");
      inner.setAttribute("stroke-linecap", "round");
      inner.setAttribute("stroke-linejoin", "round");
      inner.setAttribute("opacity", "0.95");

      g.appendChild(clone);
      g.appendChild(inner);
    },

    _teamColor(team) {
      const t = (team || "").toUpperCase();
      if (t.includes("FERRARI")) return "#e10600";
      if (t.includes("MCLAREN")) return "#ff7a00";
      if (t.includes("MERCEDES")) return "#00d2be";
      if (t.includes("REDBULL")) return "#1e41ff";
      if (t.includes("ASTON")) return "#006f62";
      if (t.includes("ALPINE")) return "#ff87bc";
      if (t.includes("HAAS")) return "#b6babd";
      if (t.includes("RB")) return "#5e8faa";
      if (t.includes("SAUBER")) return "#00ff47";
      if (t.includes("WILLIAMS")) return "#00a0de";
      return "#ffffff";
    },
  };

  window.RaceRenderer = RaceRenderer;
})();
