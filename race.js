/* =========================================================
   F1 MANAGER 2025 – RACE.JS (CORRIGIDO DEFINITIVO)
   Compatível com mobile, SVG e assets reais do projeto
   ========================================================= */

(() => {

  /* ===============================
     PARAMS
     =============================== */
  const params = new URLSearchParams(window.location.search);
  const trackKey = params.get("track") || "australia";

  /* ===============================
     ELEMENTOS
     =============================== */
  const trackContainer = document.getElementById("trackContainer");
  const carsLayer = document.getElementById("carsLayer");

  if (!trackContainer || !carsLayer) {
    console.error("❌ Containers da pista não encontrados");
    return;
  }

  /* ===============================
     CARREGAR SVG DA PISTA
     =============================== */
  async function loadTrack() {
    const res = await fetch(`assets/pistas/${trackKey}.svg`);
    if (!res.ok) {
      console.error("❌ SVG da pista não encontrado:", trackKey);
      return;
    }

    const svgText = await res.text();
    trackContainer.innerHTML = svgText;

    const svg = trackContainer.querySelector("svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", svg.getAttribute("viewBox"));

    extractPathPoints(svg);
  }

  /* ===============================
     PATH POINTS
     =============================== */
  let pathPoints = [];

  function extractPathPoints(svg) {
    const path = svg.querySelector("path");
    if (!path) {
      console.error("❌ Path não encontrado no SVG");
      return;
    }

    const length = path.getTotalLength();
    const samples = 2000;

    pathPoints = [];
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength((i / samples) * length);
      pathPoints.push({ x: p.x, y: p.y });
    }

    initCars();
    requestAnimationFrame(loop);
  }

  /* ===============================
     PILOTOS (BASE)
     =============================== */
  const drivers = [
    { name: "Leclerc", team: "Ferrari", color: "#dc0000" },
    { name: "Sainz", team: "Ferrari", color: "#dc0000" },
    { name: "Verstappen", team: "Red Bull", color: "#1e41ff" },
    { name: "Perez", team: "Red Bull", color: "#1e41ff" }
  ];

  /* ===============================
     CARROS
     =============================== */
  const cars = [];

  function initCars() {
    carsLayer.innerHTML = "";
    drivers.forEach((d, i) => {
      const car = document.createElement("div");
      car.className = "race-car";
      car.style.background = d.color;
      carsLayer.appendChild(car);

      cars.push({
        el: car,
        progress: i * 0.25,
        speed: 0.04
      });
    });
  }

  /* ===============================
     LOOP PRINCIPAL
     =============================== */
  let last = performance.now();

  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;

    cars.forEach(car => {
      car.progress += car.speed * dt;
      if (car.progress >= 1) car.progress -= 1;

      const idx = Math.floor(car.progress * pathPoints.length);
      const p = pathPoints[idx];
      if (!p) return;

      car.el.style.left = `${p.x}px`;
      car.el.style.top = `${p.y}px`;
    });

    requestAnimationFrame(loop);
  }

  /* ===============================
     START
     =============================== */
  loadTrack();

})();
