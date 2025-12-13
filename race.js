/* ==========================================================
   F1 MANAGER 2025 – RACE.JS (CORRIDA – ESTÁVEL)
   ✔ NÃO redeclara DRIVERS / TEAMS
   ✔ SVG funcional
   ✔ Mobile OK
   ✔ Loop real
   ✔ Pódio funcional
========================================================== */

(function () {
  "use strict";

  /* =========================
     UTILIDADES
  ========================= */
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =========================
     PARAMS DA URL
  ========================= */
  const params = new URLSearchParams(location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP";
  const userTeam = params.get("userTeam") || "ferrari";

  /* =========================
     DADOS GLOBAIS (SEM REDECLARAR)
  ========================= */
  if (!window.DRIVERS_2025 || !Array.isArray(window.DRIVERS_2025)) {
    alert("Erro crítico: DRIVERS_2025 não carregado.");
    return;
  }

  const DRIVERS = window.DRIVERS_2025;

  /* =========================
     ESTADO DA CORRIDA
  ========================= */
  const race = {
    totalLaps: 25,
    lap: 1,
    speed: 1,
    running: true,
    drivers: [],
    visuals: [],
    path: [],
    lastTime: null,
    finished: false
  };

  /* =========================
     SVG DA PISTA
  ========================= */
  const trackBox = qs("#track-map");
  trackBox.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  trackBox.appendChild(svg);

  /* =========================
     PATH DA PISTA (fallback)
  ========================= */
  function generateFallbackPath() {
    const pts = [];
    for (let i = 0; i <= 360; i += 3) {
      const rad = (i * Math.PI) / 180;
      pts.push({
        x: 500 + Math.cos(rad) * 220,
        y: 300 + Math.sin(rad) * 140
      });
    }
    return pts;
  }

  race.path = window.pathPoints && window.pathPoints.length
    ? window.pathPoints
    : generateFallbackPath();

  /* Desenho da pista */
  const pathEl = document.createElementNS(svgNS, "path");
  pathEl.setAttribute(
    "d",
    "M " + race.path.map(p => `${p.x} ${p.y}`).join(" L ")
  );
  pathEl.setAttribute("fill", "none");
  pathEl.setAttribute("stroke", "#ffffff");
  pathEl.setAttribute("stroke-width", "4");
  svg.appendChild(pathEl);

  /* =========================
     GRID DE LARGADA
  ========================= */
  function loadGrid() {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (raw) {
      const ids = JSON.parse(raw);
      return ids.map(id => DRIVERS.find(d => d.id === id)).filter(Boolean);
    }
    return [...DRIVERS].sort((a, b) => b.rating - a.rating);
  }

  race.drivers = loadGrid().map((d, i) => ({
    ...d,
    idx: 0,
    lap: 1,
    progress: i * 8,
    finished: false
  }));

  /* =========================
     CARROS (SVG)
  ========================= */
  race.visuals = race.drivers.map(driver => {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("r", "6");
    c.setAttribute("fill", driver.color || "#fff");
    svg.appendChild(c);
    return c;
  });

  /* =========================
     LOOP DA CORRIDA
  ========================= */
  function tick(t) {
    if (!race.running) return;

    if (!race.lastTime) race.lastTime = t;
    const dt = (t - race.lastTime) * race.speed;
    race.lastTime = t;

    race.drivers.forEach((d, i) => {
      if (d.finished) return;

      d.progress += dt * (0.00008 + d.rating * 0.000001);

      if (d.progress >= race.path.length) {
        d.progress = 0;
        d.lap++;

        if (d.lap > race.totalLaps) {
          d.finished = true;
          d.finishTime = performance.now();
        }
      }

      const p = race.path[Math.floor(d.progress)];
      if (p) {
        race.visuals[i].setAttribute("cx", p.x);
        race.visuals[i].setAttribute("cy", p.y);
      }
    });

    if (race.drivers.every(d => d.finished)) {
      finishRace();
      return;
    }

    requestAnimationFrame(tick);
  }

  /* =========================
     CONTROLE DE VELOCIDADE
  ========================= */
  window.setRaceSpeed = (m) => (race.speed = m);

  /* =========================
     FINAL + PÓDIO
  ========================= */
  function finishRace() {
    race.running = false;

    const results = [...race.drivers]
      .sort((a, b) => a.finishTime - b.finishTime)
      .slice(0, 3);

    showPodium(results);
  }

  function showPodium(p) {
    const modal = qs("#podium-modal");
    if (!modal) return;

    ["p1", "p2", "p3"].forEach((k, i) => {
      const d = p[i];
      if (!d) return;
      qs(`#${k}-name`).textContent = d.name;
      qs(`#${k}-team`).textContent = d.teamName;
      qs(`#${k}-face`).src = d.face;
      qs(`#${k}-logo`).src = d.logo;
    });

    modal.classList.remove("hidden");
  }

  window.closePodium = () => {
    qs("#podium-modal")?.classList.add("hidden");
    location.href = "calendar.html";
  };

  /* =========================
     START
  ========================= */
  requestAnimationFrame(tick);

})();
