// ===============================================================
// F1 MANAGER 2025 – PRACTICE SYSTEM
// Treino livre com pista em SVG, carros coloridos e painel básico
// ===============================================================

(function () {
  // -----------------------------
  // 1. Utilidades gerais
  // -----------------------------
  function getParam(name, def) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || def;
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // -----------------------------
  // 2. Dados básicos
  // -----------------------------

  // Equipes 2025 (apenas cor e logo; ajuste os caminhos se necessário)
  const TEAMS_2025 = {
    ferrari:   { name: "Ferrari",        color: "#ff2b2b", logo: "assets/teams/ferrari.png" },
    redbull:   { name: "Red Bull",       color: "#002060", logo: "assets/teams/redbull.png" },
    mercedes:  { name: "Mercedes",       color: "#00c0c0", logo: "assets/teams/mercedes.png" },
    mclaren:   { name: "McLaren",        color: "#ff8700", logo: "assets/teams/mclaren.png" },
    astonmartin:{name: "Aston Martin",   color: "#006b53", logo: "assets/teams/astonmartin.png" },
    sauber:    { name: "Sauber / Audi",  color: "#ffffff", logo: "assets/teams/sauber.png" },
    alpine:    { name: "Alpine",         color: "#ff66cc", logo: "assets/teams/alpine.png" },
    rb:        { name: "RB",             color: "#4b0082", logo: "assets/teams/rb.png" },
    haas:      { name: "Haas",           color: "#d6d6d6", logo: "assets/teams/haas.png" },
    williams:  { name: "Williams",       color: "#00a4ff", logo: "assets/teams/williams.png" }
  };

  // Pilotos por equipe (apenas os 2 de cada time + caminho das faces)
  // Os arquivos das faces seguem o padrão que você mostrou: assets/faces/XXX.png
  const DRIVERS_BY_TEAM = {
    ferrari: [
      { code: "LEC", name: "Charles Leclerc", face: "assets/faces/LEC.png" },
      { code: "SAI", name: "Carlos Sainz",    face: "assets/faces/SAI.png" }
    ],
    redbull: [
      { code: "VER", name: "Max Verstappen", face: "assets/faces/VER.png" },
      { code: "PER", name: "Sergio Pérez",   face: "assets/faces/PER.png" }
    ],
    mercedes: [
      { code: "HAM", name: "Lewis Hamilton", face: "assets/faces/HAM.png" },
      { code: "RUS", name: "George Russell", face: "assets/faces/RUS.png" }
    ],
    mclaren: [
      { code: "NOR", name: "Lando Norris",   face: "assets/faces/NOR.png" },
      { code: "PIA", name: "Oscar Piastri",  face: "assets/faces/PIA.png" }
    ],
    astonmartin: [
      { code: "ALO", name: "Fernando Alonso", face: "assets/faces/ALO.png" },
      { code: "STR", name: "Lance Stroll",    face: "assets/faces/STR.png" }
    ],
    sauber: [
      { code: "HUL", name: "Nico Hülkenberg", face: "assets/faces/HUL.png" },
      { code: "BOT", name: "Valtteri Bottas", face: "assets/faces/BOT.png" }
    ],
    alpine: [
      { code: "GAS", name: "Pierre Gasly",    face: "assets/faces/GAS.png" },
      { code: "OCO", name: "Esteban Ocon",    face: "assets/faces/OCO.png" }
    ],
    rb: [
      { code: "TSU", name: "Yuki Tsunoda",    face: "assets/faces/TSU.png" },
      { code: "LAW", name: "Liam Lawson",     face: "assets/faces/LAW.png" }
    ],
    haas: [
      { code: "MAG", name: "Kevin Magnussen", face: "assets/faces/MAG.png" },
      { code: "BEA", name: "Oliver Bearman",  face: "assets/faces/BEA.png" }
    ],
    williams: [
      { code: "ALB", name: "Alex Albon",      face: "assets/faces/ALB.png" },
      { code: "SAR", name: "Logan Sargeant",  face: "assets/faces/SAR.png" }
    ]
  };

  // Pistas para treino – por enquanto só Australia, mas já deixo estrutura
  // Os pontos são normalizados em uma área 1000 x 1000; o script escala e centraliza.
  // Se quiser, depois ajustamos os pontos para ficar idêntico ao mapa oficial.
  const TRACKS = {
    australia: {
      name: "Albert Park – Melbourne",
      gpName: "GP da Austrália 2025",
      laps: 20,
      points: [
        { x: 200, y: 850 },
        { x: 150, y: 780 },
        { x: 140, y: 700 },
        { x: 170, y: 640 },
        { x: 230, y: 600 },
        { x: 320, y: 560 },
        { x: 400, y: 540 },
        { x: 480, y: 520 },
        { x: 560, y: 510 },
        { x: 640, y: 520 },
        { x: 720, y: 550 },
        { x: 790, y: 600 },
        { x: 830, y: 660 },
        { x: 840, y: 730 },
        { x: 830, y: 800 },
        { x: 780, y: 860 },
        { x: 700, y: 900 },
        { x: 610, y: 920 },
        { x: 520, y: 915 },
        { x: 430, y: 900 },
        { x: 340, y: 880 },
        { x: 260, y: 860 },
        { x: 220, y: 850 } // fecha o loop
      ]
    }
  };

  // -----------------------------
  // 3. Estado do treino
  // -----------------------------
  const state = {
    trackKey: getParam("track", "australia"),
    gpName: getParam("gp", "GP 2025"),
    userTeamKey: getParam("userTeam", "ferrari"),

    svg: null,
    polyline: null,
    cars: [],
    animHandle: null,
    speedMultiplier: 1,
    totalSeconds: 60 * 60, // 60 minutos de sessão
    currentLap: 1,
    maxLaps: 20,
    lastTimestamp: null
  };

  // -----------------------------
  // 4. Inicialização de UI
  // -----------------------------
  function setupHeaderAndPanels() {
    const trackConfig = TRACKS[state.trackKey] || TRACKS.australia;
    state.maxLaps = trackConfig.laps;

    // Cabeçalho do GP / sessão, se existir
    const elTitle = $("#practice-gp-title") || $("#gp-title") || $("#gp-name");
    if (elTitle) elTitle.textContent = state.gpName || trackConfig.gpName;

    const elTrackInfo = $("#practice-track-info") || $("#track-info");
    if (elTrackInfo) elTrackInfo.textContent = trackConfig.name;

    const elLap = $("#practice-lap-counter") || $("#lap-counter");
    if (elLap) elLap.textContent = `Volta ${state.currentLap} / ${state.maxLaps}`;

    const elTimer = $("#practice-session-time") || $("#session-time");
    if (elTimer) elTimer.textContent = formatTime(state.totalSeconds);

    // Badge da equipe no topo
    const team = TEAMS_2025[state.userTeamKey] || TEAMS_2025.ferrari;
    const teamLogoEl = $("#practice-team-logo") || $("#team-badge-logo");
    const teamNameEl = $("#practice-team-name") || $("#team-badge-name");

    if (teamLogoEl) teamLogoEl.src = team.logo;
    if (teamNameEl) teamNameEl.textContent = team.name;

    // Painéis dos dois pilotos (apenas informações visuais)
    const drivers = DRIVERS_BY_TEAM[state.userTeamKey] || DRIVERS_BY_TEAM.ferrari;

    const p1 = drivers[0];
    const p2 = drivers[1];

    const p1NameEl = $("#pilot1-name");
    const p2NameEl = $("#pilot2-name");
    const p1FaceEl = $("#pilot1-face");
    const p2FaceEl = $("#pilot2-face");

    if (p1NameEl) p1NameEl.textContent = p1.name;
    if (p2NameEl) p2NameEl.textContent = p2.name;
    if (p1FaceEl) p1FaceEl.src = p1.face;
    if (p2FaceEl) p2FaceEl.src = p2.face;

    // Botoes de velocidade (1x, 2x, 4x)
    const speed1 = $("#speed-1x") || $("button[data-speed='1']");
    const speed2 = $("#speed-2x") || $("button[data-speed='2']");
    const speed4 = $("#speed-4x") || $("button[data-speed='4']");

    function setSpeed(mult) {
      state.speedMultiplier = mult;
      if (speed1) speed1.classList.toggle("active", mult === 1);
      if (speed2) speed2.classList.toggle("active", mult === 2);
      if (speed4) speed4.classList.toggle("active", mult === 4);
    }

    if (speed1) speed1.addEventListener("click", () => setSpeed(1));
    if (speed2) speed2.addEventListener("click", () => setSpeed(2));
    if (speed4) speed4.addEventListener("click", () => setSpeed(4));
    setSpeed(1);

    // Botões de navegação – se existirem
    const backBtn = $("#btn-back-lobby") || $("#btn-voltar-lobby");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "lobby.html";
      });
    }

    const officeBtn = $("#btn-go-office") || $("#btn-ir-oficina");
    if (officeBtn) {
      officeBtn.addEventListener("click", () => {
        const qs = window.location.search || "";
        window.location.href = "oficina.html" + qs;
      });
    }
  }

  // -----------------------------
  // 5. Desenho da pista
  // -----------------------------
  function createTrackSVG() {
    const trackConfig = TRACKS[state.trackKey] || TRACKS.australia;
    const container =
      $("#practice-track") ||
      $("#track-container") ||
      $(".practice-track") ||
      $(".track-area");

    if (!container) {
      console.warn("[practice] Contêiner da pista não encontrado.");
      return;
    }

    // Limpa qualquer coisa antiga
    container.innerHTML = "";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.style.display = "block";

    // Fundo sutil (não mexe no fundo do layout, só da área da pista)
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("x", 0);
    bg.setAttribute("y", 0);
    bg.setAttribute("width", 1000);
    bg.setAttribute("height", 1000);
    bg.setAttribute("fill", "transparent");
    svg.appendChild(bg);

    // Polyline da pista
    const poly = document.createElementNS(svgNS, "polyline");
    const pointsAttr = trackConfig.points.map(p => `${p.x},${p.y}`).join(" ");
    poly.setAttribute("points", pointsAttr);
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#ffffff");
    poly.setAttribute("stroke-width", "16");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly);

    // Pontos de referência (brancos)
    trackConfig.points.forEach(pt => {
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", 10);
      circle.setAttribute("fill", "#ffffff");
      svg.appendChild(circle);
    });

    container.appendChild(svg);

    state.svg = svg;
    state.polyline = poly;

    // Criação dos carros do usuário – 2 pilotos
    const drivers = DRIVERS_BY_TEAM[state.userTeamKey] || DRIVERS_BY_TEAM.ferrari;
    const team = TEAMS_2025[state.userTeamKey] || TEAMS_2025.ferrari;

    state.cars = drivers.map((driver, idx) => {
      const car = document.createElementNS(svgNS, "circle");
      car.setAttribute("r", 12);
      car.setAttribute("fill", team.color);
      car.setAttribute("stroke", "#000000");
      car.setAttribute("stroke-width", "3");
      svg.appendChild(car);

      return {
        driver,
        element: car,
        progress: idx * 0.5, // espalha um pouco
        baseSpeed: 0.12 + Math.random() * 0.03 // "velocidade" relativa
      };
    });

    // Centraliza visualmente a pista (em letras grandes o usuário já tinha fundo, então aqui só cuido do SVG)
    centerTrack(trackConfig.points);
  }

  function centerTrack(points) {
    if (!state.svg) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const cx = minX + width / 2;
    const cy = minY + height / 2;

    const scale = 0.8 * Math.min(1000 / width, 1000 / height);

    const viewBoxSize = 1000;
    const tx = viewBoxSize / 2 - cx * scale;
    const ty = viewBoxSize / 2 - cy * scale;

    state.svg.setAttribute(
      "viewBox",
      `${-tx / scale} ${-ty / scale} ${viewBoxSize / scale} ${viewBoxSize / scale}`
    );
  }

  // -----------------------------
  // 6. Movimento dos carros
  // -----------------------------
  function getPointOnTrack(trackPoints, t) {
    // t de 0 a 1
    const pts = trackPoints;
    const totalSegments = pts.length - 1;
    const totalT = t * totalSegments;
    const i = Math.floor(totalT);
    const localT = totalT - i;

    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];

    return {
      x: p1.x + (p2.x - p1.x) * localT,
      y: p1.y + (p2.y - p1.y) * localT
    };
  }

  function updateCars(dtSeconds) {
    const trackConfig = TRACKS[state.trackKey] || TRACKS.australia;
    const pts = trackConfig.points;

    state.cars.forEach(car => {
      const delta = car.baseSpeed * dtSeconds * state.speedMultiplier;
      car.progress = (car.progress + delta) % 1;

      const pos = getPointOnTrack(pts, car.progress);
      car.element.setAttribute("cx", pos.x);
      car.element.setAttribute("cy", pos.y);
    });
  }

  // -----------------------------
  // 7. Tempo de sessão
  // -----------------------------
  function formatTime(totalSec) {
    const s = clamp(Math.floor(totalSec), 0, 60 * 60 * 24);
    const minutes = Math.floor(s / 60);
    const seconds = s % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateSessionTime(dtSeconds) {
    const timerEl = $("#practice-session-time") || $("#session-time");
    const lapEl = $("#practice-lap-counter") || $("#lap-counter");

    if (state.totalSeconds <= 0) {
      state.totalSeconds = 0;
      if (timerEl) timerEl.textContent = formatTime(0);
      return;
    }

    state.totalSeconds -= dtSeconds * state.speedMultiplier;
    if (timerEl) timerEl.textContent = formatTime(state.totalSeconds);

    // Exemplo simples: a cada 3 minutos "fecha" uma volta do piloto 1
    const totalElapsed = 60 * 60 - state.totalSeconds;
    const virtualLap = 1 + Math.floor(totalElapsed / (3 * 60));
    state.currentLap = clamp(virtualLap, 1, state.maxLaps);

    if (lapEl) lapEl.textContent = `Volta ${state.currentLap} / ${state.maxLaps}`;
  }

  // -----------------------------
  // 8. Loop de animação
  // -----------------------------
  function loop(timestamp) {
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    const dtMs = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;

    const dtSeconds = dtMs / 1000;

    updateCars(dtSeconds);
    updateSessionTime(dtSeconds);

    state.animHandle = requestAnimationFrame(loop);
  }

  // -----------------------------
  // 9. Start
  // -----------------------------
  function startPractice() {
    setupHeaderAndPanels();
    createTrackSVG();
    state.lastTimestamp = null;
    if (state.animHandle) cancelAnimationFrame(state.animHandle);
    state.animHandle = requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", startPractice);
})();
