/* =========================================================
   F1 MANAGER 2025 – PRACTICE.JS (TREINO LIVRE) — v6.1
   Alinhado ao HTML real (practice.html) e SVG real (assets/tracks/*.svg)

   OBJETIVOS (corrigidos aqui):
   ✔ Mantém visual do SVG original (não redesenha pista por cima)
   ✔ Carros SEMPRE andam em cima do traçado (carros DENTRO do SVG)
   ✔ pathPoints gerado pelo <path> do SVG (getPointAtLength) — lógica do qualifying
   ✔ Velocidade 1x/2x/4x real (deltaTime) sem “supervelocidade”
   ✔ Pilotos corretos por equipe via ?userTeam=
   ✔ Faces corretas (assets/faces/*.png) + fallback seguro
   ✔ Telemetria avançada alimentando os IDs reais do HTML
   ✔ Botões: ir p/ oficina, avançar p/ qualy, voltar p/ lobby (com querystring preservada)
   ✔ Integra setup da OFICINA via localStorage (vários nomes aceitos; usa o primeiro válido)
   ========================================================= */

(() => {
  "use strict";

  /* ===============================
     URL PARAMS
     =============================== */
  const params = new URLSearchParams(window.location.search);
  const trackKey = (params.get("track") || "australia").toLowerCase();
  const gpName = params.get("gp") || "GP";
  const userTeam = (params.get("userTeam") || "ferrari").toLowerCase();

  /* ===============================
     DADOS (use os mesmos códigos/arquivos do projeto)
     - faces: assets/faces/XXX.png (3 letras)
     - cores por equipe: base visual
     =============================== */
  const DRIVERS_2025 = [
    { id: "ver", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull", rating: 98, color: "#1e41ff" },
    { id: "per", code: "PER", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull", rating: 94, color: "#1e41ff" },

    { id: "lec", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#dc0000" },
    { id: "sai", code: "SAI", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#dc0000" },

    { id: "nor", code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8700" },
    { id: "pia", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8700" },

    { id: "ham", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00d2be" },
    { id: "rus", code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00d2be" },

    { id: "alo", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#006f62" },
    { id: "str", code: "STR", name: "Lance Stroll", teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#006f62" },

    { id: "gas", code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff" },
    { id: "oco", code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#0090ff" },

    // SAUBER 2025 (pedido seu: Bortoleto)
    { id: "bor", code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 88, color: "#00ffcc" },
    { id: "hul", code: "HUL", name: "Nico Hülkenberg", teamKey: "sauber", teamName: "Sauber", rating: 89, color: "#00ffcc" },

    { id: "alb", code: "ALB", name: "Alex Albon", teamKey: "williams", teamName: "Williams", rating: 86, color: "#00a0de" },
    { id: "sar", code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 86, color: "#00a0de" },

    { id: "pia2", code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "Racing Bulls", rating: 89, color: "#2b4562" },
    { id: "law", code: "LAW", name: "Liam Lawson", teamKey: "rb", teamName: "Racing Bulls", rating: 88, color: "#2b4562" },

    { id: "mag", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#b6babd" },
    { id: "bea", code: "BEA", name: "Oliver Bearman", teamKey: "haas", teamName: "Haas", rating: 87, color: "#b6babd" },
  ];

  const TEAM_LOGO = {
    redbull: "assets/logos/redbull.png",
    ferrari: "assets/logos/ferrari.png",
    mclaren: "assets/logos/mclaren.png",
    mercedes: "assets/logos/mercedes.png",
    aston: "assets/logos/aston.png",
    alpine: "assets/logos/alpine.png",
    sauber: "assets/logos/sauber.png",
    williams: "assets/logos/williams.png",
    rb: "assets/logos/racingbulls.png",
    haas: "assets/logos/haas.png",
  };

  function facePath(code3) {
    return `assets/faces/${code3}.png`;
  }

  /* ===============================
     DOM (IDs reais do seu practice.html)
     =============================== */
  const elTrackContainer = document.getElementById("track-container");
  const elTrackName = document.getElementById("trackName");

  const elHudClock = document.getElementById("hudClock");
  const elTimeRemaining = document.getElementById("timeRemaining");

  const elP1Face = document.getElementById("p1face");
  const elP2Face = document.getElementById("p2face");
  const elP1Name = document.getElementById("p1name");
  const elP2Name = document.getElementById("p2name");
  const elP1Team = document.getElementById("p1team");
  const elP2Team = document.getElementById("p2team");
  const elP1Info = document.getElementById("p1info");
  const elP2Info = document.getElementById("p2info");

  const elTeamLogo = document.getElementById("teamLogo");

  const elBtnBackLobby = document.getElementById("btnBackLobby");
  const elBtnGoOficina = document.getElementById("btnGoOficina");
  const elBtnGoQualy = document.getElementById("btnGoQualy");

  // Telemetria (IDs reais)
  const tel = {
    panel: document.getElementById("telemetryPanel"),
    source: document.getElementById("telemetrySource"),
    mode: document.getElementById("telemetryMode"),
    ers: document.getElementById("telemetryERS"),

    speed: document.getElementById("telSpeed"),
    barSpeed: document.getElementById("barSpeed"),
    gear: document.getElementById("telGear"),
    rpm: document.getElementById("telRPM"),

    throttle: document.getElementById("telThrottle"),
    traction: document.getElementById("telTraction"),
    grip: document.getElementById("telGrip"),

    brake: document.getElementById("telBrake"),
    stability: document.getElementById("telStability"),
    delta: document.getElementById("telDelta"),

    tyreWear: document.getElementById("telTyreWear"),
    tyreTemp: document.getElementById("telTyreTemp"),
    tyrePsi: document.getElementById("telTyrePsi"),

    fuel: document.getElementById("telFuel"),
    fuelRate: document.getElementById("telFuelRate"),
    fuelMix: document.getElementById("telFuelMix"),

    engineTemp: document.getElementById("telEngineTemp"),
    ers2: document.getElementById("telERS2"),
    stress: document.getElementById("telStress"),

    s1: document.getElementById("telS1"),
    s2: document.getElementById("telS2"),
    s3: document.getElementById("telS3"),
    lap: document.getElementById("telLap"),

    spark: document.getElementById("telemetrySpark"),
  };

  /* ===============================
     HELPERS
     =============================== */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function fmtLap(sec) {
    if (!isFinite(sec) || sec <= 0) return "--:--.---";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec - Math.floor(sec)) * 1000);
    return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }

  function setImgSafe(imgEl, src, alt) {
    if (!imgEl) return;
    imgEl.alt = alt || "Piloto";
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.onerror = () => {
      // fallback silencioso (não quebra layout)
      imgEl.style.opacity = "0.35";
      imgEl.style.filter = "grayscale(1)";
    };
    imgEl.src = src;
  }

  function preserveQuery(url) {
    const q = params.toString();
    return q ? `${url}?${q}` : url;
  }

  /* ===============================
     SETUP (OFICINA) — leitura robusta
     - Aceita várias chaves e formatos, aplica o que existir.
     =============================== */
  function readSetup() {
    const keys = [
      "f1m2025_setup",
      "f1m2025_car_setup",
      "f1m2025_oficina_setup",
      "f1m2025_office_setup",
      "f1m2025_setup_car",
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
      } catch { /* ignore */ }
    }
    return null;
  }

  function setupToModifiers(setup) {
    // defaults neutros
    const mod = {
      topSpeed: 1.0,       // afeta velocidade
      accel: 1.0,          // afeta variação de throttle/saida
      grip: 1.0,           // afeta tração/grip e desgaste
      stability: 1.0,      // afeta estabilidade/delta
      fuel: 1.0,           // afeta consumo
      tyre: 1.0,           // afeta desgaste
      engineHeat: 1.0,     // afeta temperatura do motor
    };

    if (!setup) return mod;

    // tenta mapear sliders da sua oficina
    const fw = Number(setup.frontWing ?? setup.asaDianteira ?? setup.asa_dianteira);
    const rw = Number(setup.rearWing ?? setup.asaTraseira ?? setup.asa_traseira);
    const tp = Number(setup.tyrePressure ?? setup.pressaoPneus ?? setup.pressao_pneus);
    const rh = Number(setup.rideHeight ?? setup.alturaCarro ?? setup.altura_do_carro);
    const su = Number(setup.suspension ?? setup.rigidezSuspensao ?? setup.rigidez_da_suspensao);

    // Se sliders não vierem (NaN), mantém neutro
    // Interpretação:
    // - Mais asa => mais grip, menos topSpeed
    // - Pressão alta => menos grip + mais desgaste + mais temp
    // - Altura alta => mais estabilidade em zebra, menos topSpeed
    // - Suspensão dura => mais resposta, menos tração em baixa
    const fwN = isFinite(fw) ? clamp(fw / 100, 0, 1) : 0.5;
    const rwN = isFinite(rw) ? clamp(rw / 100, 0, 1) : 0.5;
    const tpN = isFinite(tp) ? clamp(tp / 40, 0.4, 1.6) : 1.0;   // 20–35 psi vira ~0.5–0.9 / etc (robusto)
    const rhN = isFinite(rh) ? clamp(rh / 100, 0, 1) : 0.5;
    const suN = isFinite(su) ? clamp(su / 100, 0, 1) : 0.5;

    const wing = (fwN + rwN) / 2; // 0..1
    mod.topSpeed *= lerp(1.03, 0.97, wing);
    mod.grip *= lerp(0.98, 1.04, wing);
    mod.fuel *= lerp(0.99, 1.02, wing);

    mod.grip *= lerp(1.02, 0.96, clamp(tpN - 0.9, 0, 1));     // pressão muito alta reduz grip
    mod.tyre *= lerp(0.98, 1.06, clamp(tpN - 0.9, 0, 1));     // e aumenta desgaste
    mod.engineHeat *= lerp(0.99, 1.04, clamp(tpN - 0.9, 0, 1));

    mod.stability *= lerp(0.98, 1.03, rhN);
    mod.topSpeed *= lerp(1.01, 0.99, rhN);

    mod.accel *= lerp(0.98, 1.03, suN);
    mod.grip *= lerp(1.02, 0.97, suN);

    return mod;
  }

  /* ===============================
     ESTADO DA SESSÃO
     =============================== */
  const practice = {
    running: true,
    speedMultiplier: 1,            // 1x/2x/4x
    sessionSeconds: 60 * 60,       // 60:00 (em segundos)
    lastNow: performance.now(),

    svg: null,
    trackPath: null,
    pathLen: 0,
    pathPoints: [],

    // Telemetria
    sparkData: [],                 // últimos N pontos de “speed”
    sparkMax: 140,

    // carros (2)
    cars: [],
    focusCarIndex: 0,              // telemetria foca no carro 0
    setup: setupToModifiers(readSetup()),
  };

  /* ===============================
     PILOTOS DO USUÁRIO (2)
     =============================== */
  function getUserDrivers() {
    const list = DRIVERS_2025.filter(d => d.teamKey === userTeam);
    if (list.length >= 2) return list.slice(0, 2);

    // fallback se equipe inválida
    console.warn("Equipe inválida/sem 2 pilotos:", userTeam, "— fallback Ferrari");
    return DRIVERS_2025.filter(d => d.teamKey === "ferrari").slice(0, 2);
  }

  const userDrivers = getUserDrivers();

  /* ===============================
     NAVEGAÇÃO (botões)
     =============================== */
  function wireNav() {
    if (elBtnBackLobby) {
      elBtnBackLobby.addEventListener("click", () => {
        window.location.href = preserveQuery("lobby.html");
      });
    }

    if (elBtnGoOficina) {
      elBtnGoOficina.addEventListener("click", () => {
        window.location.href = preserveQuery("oficina.html");
      });
    }

    if (elBtnGoQualy) {
      elBtnGoQualy.addEventListener("click", () => {
        window.location.href = preserveQuery("qualifying.html");
      });
    }
  }

  /* ===============================
     CONTROLES (globais, pois o HTML usa onclick="")
     =============================== */
  window.setSpeed = (mult) => {
    const v = Number(mult);
    practice.speedMultiplier = (v === 2 || v === 4) ? v : 1;

    // visual do botão (active)
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`.speed-btn[data-speed="${practice.speedMultiplier}"]`);
    if (btn) btn.classList.add("active");

    const liveTag = document.getElementById("hudLiveTag");
    if (liveTag) liveTag.textContent = `LIVE • ${practice.speedMultiplier}X`;
  };

  window.setMode = (carIndex1Based, mode) => {
    const idx = clamp(Number(carIndex1Based) - 1, 0, practice.cars.length - 1);
    const car = practice.cars[idx];
    if (!car) return;

    if (mode === "eco") car.mode = "ECO";
    else if (mode === "atk") car.mode = "ATAQUE";
    else car.mode = "NORMAL";

    // se clicar, também foca telemetria nesse carro
    practice.focusCarIndex = idx;
    renderUserCards();
  };

  window.pitStop = (carIndex1Based) => {
    const idx = clamp(Number(carIndex1Based) - 1, 0, practice.cars.length - 1);
    const car = practice.cars[idx];
    if (!car) return;

    // pit curto no treino: repõe pneus e dá pausa curta
    car.pitUntil = performance.now() + 6500; // 6.5s simulado
    car.tyreWear = clamp(car.tyreWear + 55, 0, 100);
    car.fuel = clamp(car.fuel + 10, 0, 100);
    car.engineTemp = clamp(car.engineTemp - 12, 60, 130);
  };

  /* ===============================
     CARREGAR SVG + DEFINIR PATH
     - mantém o SVG original (visual)
     - encontra o melhor <path> automaticamente
     =============================== */
  async function loadSvg() {
    const url = `assets/tracks/${trackKey}.svg`;

    let svgText = "";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      svgText = await res.text();
    } catch (e) {
      console.error("Falha ao carregar SVG:", url, e);
      if (elTrackName) elTrackName.textContent = "Erro ao carregar pista";
      return false;
    }

    // injeta no container
    elTrackContainer.innerHTML = svgText;

    // pega o svg inserido
    const svg = elTrackContainer.querySelector("svg");
    if (!svg) {
      console.error("SVG inválido:", url);
      return false;
    }

    // garante responsivo sem quebrar viewBox
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.style.overflow = "visible";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    practice.svg = svg;

    // tenta nome da pista a partir do gpName/trackKey
    if (elTrackName) {
      const t = (gpName && gpName !== "GP") ? gpName : trackKey.toUpperCase();
      elTrackName.textContent = t.replaceAll("+", " ");
    }

    // encontra melhor <path> para ser o traçado:
    // heurística: maior getTotalLength()
    const paths = Array.from(svg.querySelectorAll("path"));
    if (!paths.length) {
      console.error("SVG sem <path>:", url);
      return false;
    }

    let best = null;
    let bestLen = 0;
    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (len > bestLen) {
          bestLen = len;
          best = p;
        }
      } catch { /* ignore */ }
    }

    if (!best || bestLen <= 0) {
      console.error("Não foi possível detectar o path principal:", url);
      return false;
    }

    practice.trackPath = best;
    practice.pathLen = bestLen;

    // se o traçado estiver “escuro”, força um visual claro sem redesenhar por cima
    // (não altera se já estiver correto no SVG)
    const stroke = (best.getAttribute("stroke") || "").trim();
    if (!stroke || stroke === "none") {
      best.setAttribute("stroke", "#e8e8e8");
      best.setAttribute("stroke-width", best.getAttribute("stroke-width") || "6");
      best.setAttribute("fill", "none");
    }

    // cria pathPoints (mesma ideia do qualifying: amostra ao longo do comprimento)
    buildPathPoints(1400);

    return true;
  }

  function buildPathPoints(samples) {
    const p = practice.trackPath;
    const L = practice.pathLen;
    const n = clamp(Number(samples) || 1200, 600, 2400);

    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const pt = p.getPointAtLength(t * L);
      pts.push({ x: pt.x, y: pt.y });
    }

    practice.pathPoints = pts;
    window.pathPoints = pts; // compat se algo externo usa

    // cria/atualiza “grupo” de carros dentro do SVG
    let g = practice.svg.querySelector("#cars-layer");
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", "cars-layer");
      practice.svg.appendChild(g);
    }
  }

  /* ===============================
     CRIAR CARROS (dentro do SVG)
     =============================== */
  function makeCarCircle(color) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "7.5");
    c.setAttribute("fill", color);
    c.setAttribute("stroke", "rgba(0,0,0,.55)");
    c.setAttribute("stroke-width", "2");
    c.setAttribute("opacity", "0.98");
    return c;
  }

  function initCars() {
    const g = practice.svg.querySelector("#cars-layer");
    g.innerHTML = "";

    practice.cars = userDrivers.map((d, i) => {
      const circle = makeCarCircle(d.color);
      g.appendChild(circle);

      // lap time base “realista” para treino (varia por rating e setup)
      // base ~ 86s a 100s, ajustável com oficina e modo
      const baseLap = clamp(104 - d.rating * 0.18, 84, 104);

      const car = {
        driver: d,
        circle,
        progress: (i === 0 ? 0.02 : 0.08),
        baseLapSec: baseLap,
        mode: "NORMAL",      // NORMAL / ECO / ATAQUE

        // estados dinâmicos
        lapStartNow: performance.now(),
        lastLapSec: 0,
        bestLapSec: Infinity,

        // “consumíveis”
        tyreWear: 100,        // 0..100 (100 = novo)
        fuel: 100,            // 0..100
        engineTemp: 92,       // °C
        ers: 92,              // 0..100
        stress: 8,            // 0..200

        // pit
        pitUntil: 0,

        // telem
        kmh: 0,
        throttle: 0,
        brake: 0,
        gear: 1,
        rpm: 9000,
        gforce: 0,
        delta: 0,
        s1: 0, s2: 0, s3: 0,
        lapSecLive: 0,
      };

      return car;
    });

    // UI cards
    if (elP1Name) elP1Name.textContent = userDrivers[0]?.name || "Piloto 1";
    if (elP2Name) elP2Name.textContent = userDrivers[1]?.name || "Piloto 2";
    if (elP1Team) elP1Team.textContent = userDrivers[0]?.teamName || userTeam;
    if (elP2Team) elP2Team.textContent = userDrivers[1]?.teamName || userTeam;

    setImgSafe(elP1Face, facePath(userDrivers[0]?.code || "LEC"), userDrivers[0]?.name);
    setImgSafe(elP2Face, facePath(userDrivers[1]?.code || "SAI"), userDrivers[1]?.name);

    renderUserCards();
  }

  /* ===============================
     LOGO DO TOPO
     =============================== */
  function setTopLogo() {
    if (!elTeamLogo) return;
    const src = TEAM_LOGO[userTeam] || TEAM_LOGO.ferrari;
    setImgSafe(elTeamLogo, src, `Logo ${userTeam}`);
  }

  /* ===============================
     RENDER: CARDS / LISTA / TELEMETRIA
     =============================== */
  function renderUserCards() {
    const a = practice.cars[0];
    const b = practice.cars[1];
    if (!a || !b) return;

    // linha compacta (status) no card
    const lineA = `Modo: ${a.mode} • Pneus: ${Math.round(a.tyreWear)}% • ERS: ${Math.round(a.ers)}% • Última: ${fmtLap(a.lastLapSec)}`;
    const lineB = `Modo: ${b.mode} • Pneus: ${Math.round(b.tyreWear)}% • ERS: ${Math.round(b.ers)}% • Última: ${fmtLap(b.lastLapSec)}`;

    if (elP1Info) elP1Info.textContent = lineA;
    if (elP2Info) elP2Info.textContent = lineB;
  }

  function writeTelemetry(car) {
    if (!car || !tel.panel) return;

    const mode = car.mode;
    const ers = Math.round(car.ers);

    if (tel.source) tel.source.textContent = `Fonte: ${car.driver.name}`;
    if (tel.mode) tel.mode.textContent = mode;
    if (tel.ers) tel.ers.textContent = `${ers}%`;

    if (tel.speed) tel.speed.textContent = `${Math.round(car.kmh)} km/h`;
    if (tel.barSpeed) tel.barSpeed.style.width = `${clamp(car.kmh / 360, 0, 1) * 100}%`;
    if (tel.gear) tel.gear.textContent = `${car.gear}`;
    if (tel.rpm) tel.rpm.textContent = `${Math.round(car.rpm)}`;

    if (tel.throttle) tel.throttle.textContent = `${Math.round(car.throttle)}%`;
    if (tel.traction) tel.traction.textContent = `${Math.round(clamp(80 + (practice.setup.grip - 1) * 120, 0, 100))}`;
    if (tel.grip) tel.grip.textContent = `${Math.round(clamp(85 + (practice.setup.grip - 1) * 140, 0, 100))}`;

    if (tel.brake) tel.brake.textContent = `${Math.round(car.brake)}%`;
    if (tel.stability) tel.stability.textContent = `${Math.round(clamp(85 + (practice.setup.stability - 1) * 140, 0, 100))}`;
    if (tel.delta) tel.delta.textContent = `${car.delta >= 0 ? "+" : ""}${car.delta.toFixed(1)}`;

    if (tel.tyreWear) tel.tyreWear.textContent = `${Math.round(car.tyreWear)}%`;
    if (tel.tyreTemp) tel.tyreTemp.textContent = `${Math.round(clamp(86 + (100 - car.tyreWear) * 0.12, 70, 115))}°C`;
    if (tel.tyrePsi) tel.tyrePsi.textContent = `${(22.0 + (100 - car.tyreWear) * 0.02).toFixed(1)}`;

    if (tel.fuel) tel.fuel.textContent = `${Math.round(car.fuel)}%`;
    if (tel.fuelRate) tel.fuelRate.textContent = `${car.mode === "ECO" ? "BAIXO" : car.mode === "ATAQUE" ? "ALTO" : "MÉDIO"}`;
    if (tel.fuelMix) tel.fuelMix.textContent = `${car.mode === "ECO" ? "LEAN" : car.mode === "ATAQUE" ? "RICH" : "STD"}`;

    if (tel.engineTemp) tel.engineTemp.textContent = `${Math.round(car.engineTemp)}°C`;
    if (tel.ers2) tel.ers2.textContent = `${Math.round(car.ers)}%`;
    if (tel.stress) tel.stress.textContent = `${Math.round(car.stress)}`;

    if (tel.s1) tel.s1.textContent = fmtLap(car.s1);
    if (tel.s2) tel.s2.textContent = fmtLap(car.s2);
    if (tel.s3) tel.s3.textContent = fmtLap(car.s3);
    if (tel.lap) tel.lap.textContent = fmtLap(car.lapSecLive);

    drawSpark(car.kmh);
  }

  function drawSpark(valueKmh) {
    if (!tel.spark) return;

    // garante canvas com tamanho correto (hiDPI)
    const canvas = tel.spark;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    practice.sparkData.push(valueKmh);
    if (practice.sparkData.length > practice.sparkMax) practice.sparkData.shift();

    ctx.clearRect(0, 0, w, h);

    // base
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, h - 1, w, 1);
    ctx.globalAlpha = 1;

    // linha
    const data = practice.sparkData;
    const max = 360;
    const min = 0;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#3bd3ff";
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const t = clamp((data[i] - min) / (max - min), 0, 1);
      const y = h - (t * (h - 6)) - 3;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  /* ===============================
     FÍSICA SIMPLIFICADA (treino)
     - velocidade e desgaste dependem de:
       rating + setup + modo + 1x/2x/4x
     =============================== */
  function modeMult(mode) {
    if (mode === "ECO") return { pace: 0.965, tyre: 0.82, fuel: 0.80, heat: 0.92, ers: 0.85, stress: 0.80 };
    if (mode === "ATAQUE") return { pace: 1.025, tyre: 1.22, fuel: 1.20, heat: 1.18, ers: 1.28, stress: 1.20 };
    return { pace: 1.0, tyre: 1.0, fuel: 1.0, heat: 1.0, ers: 1.0, stress: 1.0 };
  }

  function updateCar(car, simDt, now) {
    // pit (congela)
    if (car.pitUntil && now < car.pitUntil) {
      car.throttle = lerp(car.throttle, 0, 0.18);
      car.brake = lerp(car.brake, 40, 0.12);
      car.kmh = lerp(car.kmh, 24, 0.08);
      car.rpm = lerp(car.rpm, 6000, 0.08);
      car.gear = 1;
      car.gforce = 0.2;
      car.delta = 0;
      return;
    }

    const mm = modeMult(car.mode);

    // lap time alvo (quanto menor, mais rápido)
    const lapTarget =
      car.baseLapSec
      * (1 / practice.setup.topSpeed)
      * (1 / mm.pace);

    // progress por segundo = 1 / lapTarget
    const progPerSec = 1 / clamp(lapTarget, 75, 120);

    // atualiza progress
    car.progress += progPerSec * simDt;
    if (car.progress >= 1) {
      car.progress -= 1;

      const lapSec = (now - car.lapStartNow) / 1000;
      car.lapStartNow = now;
      car.lastLapSec = lapSec;
      if (lapSec > 0 && lapSec < car.bestLapSec) car.bestLapSec = lapSec;

      // setores (simulação plausível)
      const s1 = lapSec * (0.32 + Math.random() * 0.02);
      const s2 = lapSec * (0.35 + Math.random() * 0.02);
      const s3 = Math.max(0, lapSec - s1 - s2);
      car.s1 = s1; car.s2 = s2; car.s3 = s3;
    }

    // pega ponto no array (carro SEMPRE em cima da linha)
    const pts = practice.pathPoints;
    const idx = Math.floor(car.progress * (pts.length - 1));
    const p = pts[idx] || pts[0];

    car.circle.setAttribute("cx", p.x);
    car.circle.setAttribute("cy", p.y);

    // telemetria derivada (km/h, rpm, throttle, brake)
    // km/h aproximado pela “pace” e por parte do traçado (variação)
    const wave = Math.sin(car.progress * Math.PI * 2) * 0.18 + Math.cos(car.progress * Math.PI * 4) * 0.08;
    const baseKmh = 285 + (car.driver.rating - 85) * 2.1; // rating influencia
    const kmh =
      baseKmh
      * practice.setup.topSpeed
      * mm.pace
      * (1 + wave);

    car.kmh = clamp(lerp(car.kmh, kmh, 0.22), 70, 352);

    // throttle / brake coerentes
    const throttleTarget = clamp(60 + wave * 110, 0, 100);
    const brakeTarget = clamp(18 - wave * 90, 0, 100);

    car.throttle = lerp(car.throttle, throttleTarget, 0.14);
    car.brake = lerp(car.brake, brakeTarget, 0.14);

    // marcha e rpm
    const gear = clamp(Math.round(car.kmh / 55) + 1, 1, 8);
    car.gear = gear;

    const rpmTarget = 7200 + (car.kmh / 352) * 5200;
    car.rpm = clamp(lerp(car.rpm, rpmTarget, 0.18), 6500, 12500);

    car.gforce = clamp(1.5 + Math.abs(wave) * 6.5, 0.8, 6.8);

    // consumíveis (por segundo)
    const tyreRate = (0.020 * mm.tyre) * (1 / practice.setup.grip) * practice.setup.tyre;
    const fuelRate = (0.014 * mm.fuel) * practice.setup.fuel;
    const ersRate = (0.020 * mm.ers);

    car.tyreWear = clamp(car.tyreWear - tyreRate * simDt * 100, 0, 100);
    car.fuel = clamp(car.fuel - fuelRate * simDt * 100, 0, 100);
    car.ers = clamp(car.ers - ersRate * simDt * 100, 0, 100);

    const heatGain = (0.12 * mm.heat) * practice.setup.engineHeat;
    car.engineTemp = clamp(car.engineTemp + heatGain * simDt * 10 - 0.06 * simDt * 10, 70, 132);

    car.stress = clamp(car.stress + (0.28 * mm.stress) * simDt * 10, 0, 200);

    // delta: simplificado (negativo = melhor)
    const paceNoise = (Math.random() - 0.5) * 0.18;
    car.delta = clamp((lapTarget - 90) * 0.10 + paceNoise, -4.5, 4.5);

    // lap live
    car.lapSecLive = (now - car.lapStartNow) / 1000;
  }

  /* ===============================
     LOOP PRINCIPAL (deltaTime correto)
     =============================== */
  function tick(now) {
    const dt = (now - practice.lastNow) / 1000;
    practice.lastNow = now;

    // delta de simulação com speedMultiplier
    const simDt = dt * practice.speedMultiplier;

    if (practice.running) {
      practice.sessionSeconds = Math.max(0, practice.sessionSeconds - simDt);
      if (practice.sessionSeconds <= 0) practice.running = false;
    }

    // relógios
    const tStr = fmtTime(practice.sessionSeconds);
    if (elHudClock) elHudClock.textContent = tStr;
    if (elTimeRemaining) elTimeRemaining.textContent = tStr;

    // atualiza setup a cada frame (se usuário mexer na oficina e voltar sem recarregar)
    practice.setup = setupToModifiers(readSetup());

    // atualiza carros
    for (const car of practice.cars) updateCar(car, simDt, now);

    // UI / telemetria
    renderUserCards();
    const focus = practice.cars[practice.focusCarIndex] || practice.cars[0];
    writeTelemetry(focus);

    requestAnimationFrame(tick);
  }

  /* ===============================
     INIT
     =============================== */
  async function init() {
    if (!elTrackContainer) {
      console.error("HTML inválido: #track-container não encontrado.");
      return;
    }

    wireNav();
    setTopLogo();

    // speed default visual
    window.setSpeed(1);

    const ok = await loadSvg();
    if (!ok) return;

    initCars();

    // clique no card foca telemetria
    document.querySelectorAll(".practice-user-card").forEach((card, i) => {
      card.addEventListener("click", () => {
        practice.focusCarIndex = i;
        renderUserCards();
      });
    });

    // start loop
    practice.lastNow = performance.now();
    requestAnimationFrame(tick);

    console.log("✅ practice.js inicializado (SVG real + pathPoints + carros no traçado + velocidade OK)");
  }

  init();
})();
