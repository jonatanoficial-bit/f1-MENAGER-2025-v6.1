/* ===========================
   raceRenderer.js (FULL)
   - Monta SVG no container
   - Cria overlay para carros (bolinhas)
   - Posiciona via getPointAtLength no path principal
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

      // insere SVG
      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.innerHTML = svgText;

      const svg = wrapper.querySelector("svg");
      if (!svg) {
        this.container.innerHTML = "<div style='color:#fff;padding:12px'>SVG inválido.</div>";
        return;
      }

      // garante escala consistente
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";

      // NÃO desenha pista duplicada: usa o que já está no SVG
      this.svgRoot = svg;

      // escolhe o path principal (o mais longo)
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

      // coloca no container
      this.container.appendChild(svg);

      // overlay para carros
      const overlay = document.createElement("div");
      overlay.id = "track-overlay";
      this.overlay = overlay;
      this.container.appendChild(overlay);

      this.nodes.clear();
    },

    render(state) {
      if (!this.mainPath || !this.overlay) return;

      // cria / atualiza bolinhas
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

        const pt = this._pointAt(d.t);
        // pequeno offset “fora da linha” (normal aproximada via lookahead)
        const out = this._offsetNormal(d.t, 7); // 7px para fora
        el.style.left = (pt.x + out.x) + "px";
        el.style.top = (pt.y + out.y) + "px";
        el.style.opacity = d.finished ? "0.65" : "1";
      }
    },

    _pointAt(t01) {
      const L = this.pathLen;
      const t = ((t01 % 1) + 1) % 1;
      const dist = t * L;
      const p = this.mainPath.getPointAtLength(dist);

      // converte para coordenada do SVG na tela
      const svg = this.svgRoot;
      const pt = svg.createSVGPoint();
      pt.x = p.x;
      pt.y = p.y;
      const ctm = this.mainPath.getCTM();
      const screen = pt.matrixTransform(ctm);

      // agora para coordenada do container:
      const bbox = svg.getBoundingClientRect();
      const cb = this.container.getBoundingClientRect();
      return {
        x: (screen.x - bbox.left) + (bbox.left - cb.left),
        y: (screen.y - bbox.top) + (bbox.top - cb.top),
      };
    },

    _offsetNormal(t01, magPx) {
      const eps = 0.003; // pequeno passo
      const p1 = this._pointAt(t01);
      const p2 = this._pointAt(t01 + eps);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;

      // normal (perp)
      const nx = -dy / len;
      const ny = dx / len;

      return { x: nx * magPx, y: ny * magPx };
    },

    _teamColor(team) {
      const t = (team || "").toUpperCase();
      // cores base (pode ajustar depois)
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
