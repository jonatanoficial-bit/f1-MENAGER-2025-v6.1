/* ==========================================================
   RACE SYSTEM — MOTOR ÚNICO DA CORRIDA (ESTÁVEL)
   Objetivos:
   - NÃO depende de *.json de pista (você só tem SVGs)
   - Carrega SEMPRE assets/tracks/{track}.svg
   - Gera pathPoints pelo PATH do SVG
   - NÃO duplica pista (renderer controla 1 camada)
   - Voltas avançam, corrida termina e chama pódio
   - Setup + Staff influenciam (se existirem no save)
========================================================== */

(function () {
  "use strict";

  // ==========================
  // CONFIG
  // ==========================
  const FPS = 60;
  const DT = 1 / FPS;
  const DEFAULT_LAPS = 10;
  const PATH_SAMPLES = 900; // mais pontos = movimento mais suave
  const TRACKS_BASE = "assets/tracks/";
  const SAVE_KEY = "f1Manager2025_save_v61"; // se você usa outro, o race.js pode passar via window
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Paleta simples por equipe (ajuste se quiser, mas já resolve “todas iguais”)
  const TEAM_COLORS = {
    "Ferrari": "#ff2a2a",
    "McLaren": "#ff7a00",
    "Red Bull": "#2e57ff",
    "Mercedes": "#00ffd5",
    "Aston Martin": "#00a86b",
    "Alpine": "#ff4fd8",
    "Williams": "#2aa1ff",
    "Haas": "#bdbdbd",
    "RB": "#5d7bff",
    "Sauber": "#44ff44"
  };

  // ==========================
  // STATE
  // ==========================
  const RaceSystem = window.RaceSystem || (window.RaceSystem = {});
  let race = null;
  let running = false;
  let speedMult = 1;
  let lastTick = 0;

  // ==========================
  // HELPERS — URL PARAMS
  // ==========================
  function q(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function decodePlus(s) {
    if (!s) return "";
    return decodeURIComponent(s.replace(/\+/g, " "));
  }

  // ==========================
  // SAVE / LOAD CAREER DATA
  // ==========================
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function pickTeamFromParamOrSave(save) {
    const userTeam = decodePlus(q("userTeam")) || "";
    if (userTeam) return userTeam;

    // fallback
    if (save?.career?.team) return save.career.team;
    if (save?.team) return save.team;
    return "Ferrari";
  }

  // ==========================
  // DRIVERS BASE (fallback)
  // Se o seu data.js já define window.DRIVERS / window.TEAMS, usamos.
  // ==========================
  function getDriverPool() {
    if (Array.isArray(window.DRIVERS) && window.DRIVERS.length) return window.DRIVERS;
    // fallback mínimo (não deveria acontecer no seu projeto)
    return [
      { id: "LEC", code: "LEC", name: "Charles Leclerc", team: "Ferrari" },
      { id: "SAI", code: "SAI", name: "Carlos Sainz", team: "Ferrari" },
      { id: "NOR", code: "NOR", name: "Lando Norris", team: "McLaren" },
      { id: "PIA", code: "PIA", name: "Oscar Piastri", team: "McLaren" }
    ];
  }

  function getTeamDrivers(teamName) {
    const pool = getDriverPool();
    const inTeam = pool.filter(d => (d.team || "").toLowerCase() === (teamName || "").toLowerCase());
    // se não achar (variação de nome), retorna os 2 primeiros do pool
    return inTeam.length >= 2 ? inTeam.slice(0, 2) : pool.slice(0, 2);
  }

  // ==========================
  // TRACK LOADER (SVG -> PATH -> POINTS)
  // ==========================
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${url} (${res.status})`);
    return await res.text();
  }

  function parseMainPathFromSVG(svgText) {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("SVG inválido (sem <svg>)");

    // regra: primeiro <path> é a pista. Se tiver id="track" melhor ainda.
    const preferred = svg.querySelector("path#track") || svg.querySelector("path.track");
    const path = preferred || svg.querySelector("path");

    if (!path) throw new Error("SVG sem <path> para a pista");

    return {
      viewBox: svg.getAttribute("viewBox") || null,
      width: svg.getAttribute("width") || null,
      height: svg.getAttribute("height") || null,
      d: path.getAttribute("d")
    };
  }

  function buildSVGForCanvas(trackPath, viewBox) {
    // cria um SVG “limpo” para ser injetado no container do renderer
    const vb = viewBox || "0 0 1000 1000";
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <path d="${trackPath}" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${trackPath}" fill="none" stroke="rgba(255,255,255,0.90)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function samplePointsFromPath(d, viewBox) {
    // cria SVG/Path offscreen para amostrar
    const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    temp.setAttribute("viewBox", viewBox || "0 0 1000 1000");

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    temp.appendChild(p);
    document.body.appendChild(temp);
    temp.style.position = "absolute";
    temp.style.left = "-99999px";
    temp.style.top = "-99999px";
    temp.style.width = "1px";
    temp.style.height = "1px";
    temp.style.opacity = "0";

    const len = p.getTotalLength();
    const pts = [];
    for (let i = 0; i < PATH_SAMPLES; i++) {
      const t = (i / PATH_SAMPLES) * len;
      const pt = p.getPointAtLength(t);
      pts.push({ x: pt.x, y: pt.y });
    }

    document.body.removeChild(temp);
    return pts;
  }

  async function loadTrack(trackKey) {
    const svgUrl = `${TRACKS_BASE}${trackKey}.svg`;
    const svgText = await fetchText(svgUrl);
    const parsed = parseMainPathFromSVG(svgText);

    // viewBox: se svg não tiver, usa fallback
    let viewBox = parsed.viewBox;
    if (!viewBox) viewBox = "0 0 1000 1000";

    const points = samplePointsFromPath(parsed.d, viewBox);
    const svgClean = buildSVGForCanvas(parsed.d, viewBox);

    return { trackKey, svgUrl, svgClean, viewBox, points };
  }

  // ==========================
  // SIMULATION CORE
  // ==========================
  function makeDriverRuntime(driver, idx) {
    return {
      ...driver,
      index: idx,
      gap: 0,
      lap: 0,
      progress: Math.random() * 0.05, // espalha um pouco na largada
      basePace: 1.0 + Math.random() * 0.02,
      tyre: "M",
      ers: 72,
      carWear: 100,
      motor: 2,
      aggress: 2,
      mode: "normal",
      pitting: false,
      pitTimer: 0
    };
  }

  function applySetupAndStaffInfluence(save, teamName) {
    // influência leve (não “quebra” balanceamento)
    // se não existir nada no save, retorna 0.
    const setup = save?.setup?.[teamName] || save?.carSetup?.[teamName] || null;
    const staff = save?.staff?.[teamName] || save?.teamStaff?.[teamName] || null;

    let bonus = 0;

    if (setup) {
      // exemplo: se setupScore existe, usa; senão calcula de campos comuns
      if (typeof setup.setupScore === "number") bonus += (setup.setupScore - 50) * 0.0008;
      if (typeof setup.balance === "number") bonus += (setup.balance - 50) * 0.0003;
      if (typeof setup.aero === "number") bonus += (setup.aero - 50) * 0.0002;
    }

    if (staff) {
      if (typeof staff.pitCrew === "number") bonus += (staff.pitCrew - 50) * 0.0002;
      if (typeof staff.engineers === "number") bonus += (staff.engineers - 50) * 0.0002;
      if (typeof staff.strategy === "number") bonus += (staff.strategy - 50) * 0.0002;
    }

    return bonus;
  }

  function paceDelta(driver) {
    // modo
    let m = 0;
    if (driver.mode === "eco") m -= 0.015;
    if (driver.mode === "attack") m += 0.018;

    // agressividade e motor (discreto)
    m += (driver.motor - 2) * 0.006;
    m += (driver.aggress - 2) * 0.004;

    // desgaste: quanto menor carWear, mais lento
    m += ((driver.carWear - 100) * 0.0004); // carWear cai -> m negativo

    // pneu: Wet mais lento no seco; Medium base
    if (driver.tyre === "W") m -= 0.010;

    // ERS: boost momentâneo é tratado por botão (se existir)
    return m;
  }

  function stepTyreWear(driver, dt) {
    // desgaste proporcional ao modo/agress
    const wear = (0.20 + (driver.motor - 2) * 0.08 + (driver.aggress - 2) * 0.05 + (driver.mode === "attack" ? 0.10 : 0)) * dt;
    driver.carWear = clamp(driver.carWear - wear, 0, 100);
  }

  function stepPit(driver, dt) {
    if (!driver.pitting) return;

    driver.pitTimer -= dt;
    if (driver.pitTimer <= 0) {
      driver.pitting = false;
      driver.pitTimer = 0;
      driver.carWear = clamp(driver.carWear + 18, 0, 100);
      // troca pneu simplificada
      driver.tyre = (race.weather === "Chuva") ? "W" : "M";
    }
  }

  function stepDriver(driver, dt, setupBonus) {
    // pit para “congelar” progresso um pouco
    if (driver.pitting) {
      stepPit(driver, dt);
      return;
    }

    const pace = driver.basePace + setupBonus + paceDelta(driver);
    // andamento: progress aumenta até 1.0 -> volta
    driver.progress += (0.060 * pace) * dt * speedMult;

    if (driver.progress >= 1) {
      driver.progress -= 1;
      driver.lap += 1;

      // pequena recuperação de ERS a cada volta (simplificado)
      driver.ers = clamp(driver.ers + 5, 0, 100);
    }

    stepTyreWear(driver, dt);
  }

  function computeGaps(drivers) {
    // ordenar por volta/progresso
    drivers.sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      return b.progress - a.progress;
    });

    // gap sintético: diferença de “distância” no ciclo
    const leader = drivers[0];
    drivers.forEach(d => {
      const distLeader = leader.lap + leader.progress;
      const distD = d.lap + d.progress;
      const delta = distLeader - distD;
      d.gap = delta <= 0 ? 0 : delta * 12.0; // 12s por volta (escala)
    });
  }

  function checkFinish(drivers) {
    const finished = drivers.some(d => d.lap >= race.totalLaps);
    if (!finished) return false;

    // trava corrida, calcula resultado final
    running = false;
    race.state = "Finalizado";

    computeGaps(drivers); // garante ordenação final
    RaceUI.showResults(drivers.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      team: d.team
    })));

    return true;
  }

  // ==========================
  // PUBLIC ACTIONS (UI -> SYSTEM)
  // ==========================
  RaceSystem.setSpeed = function (mult) {
    speedMult = mult;
  };

  RaceSystem.setMode = function (driverId, mode) {
    const d = race?.drivers?.find(x => x.id === driverId);
    if (!d) return;
    d.mode = mode;
  };

  RaceSystem.adjustMotor = function (driverId, delta) {
    const d = race?.drivers?.find(x => x.id === driverId);
    if (!d) return;
    d.motor = clamp(d.motor + delta, 1, 4);
  };

  RaceSystem.adjustAggress = function (driverId, delta) {
    const d = race?.drivers?.find(x => x.id === driverId);
    if (!d) return;
    d.aggress = clamp(d.aggress + delta, 1, 4);
  };

  RaceSystem.callPit = function (driverId) {
    const d = race?.drivers?.find(x => x.id === driverId);
    if (!d) return;
    if (d.pitting) return;

    d.pitting = true;
    // tempo de pit depende do staff (se existir)
    const save = loadSave() || {};
    const teamBonus = applySetupAndStaffInfluence(save, d.team);
    const pitBase = 4.0; // segundos simulados
    d.pitTimer = clamp(pitBase - (teamBonus * 80), 2.8, 4.8);
  };

  // ==========================
  // BOOT / INIT
  // ==========================
  async function init() {
    const trackKey = (q("track") || "australia").toLowerCase();
    const gpName = decodePlus(q("gp")) || "GP";
    const save = loadSave() || {};
    const userTeam = pickTeamFromParamOrSave(save);

    // clima simples
    const weather = "Seco";
    const trackTemp = 21;

    // Carrega pista via SVG (SEM JSON)
    let trackData;
    try {
      trackData = await loadTrack(trackKey);
    } catch (e) {
      alert(`Erro na corrida: Falha ao carregar: ${e.message}`);
      return;
    }

    // Monta grid
    const pool = getDriverPool().map((d, i) => makeDriverRuntime(d, i));
    // garante os 2 pilotos do jogador “identificáveis”
    const my2 = getTeamDrivers(userTeam);
    const myIds = new Set(my2.map(x => x.id));

    // se ids não baterem, tenta por code
    const myCodes = new Set(my2.map(x => x.code));

    pool.forEach(d => {
      if (myIds.has(d.id) || myCodes.has(d.code)) d.isPlayer = true;
      d.teamColor = TEAM_COLORS[d.team] || "#ffffff";
    });

    // corrida
    race = {
      name: gpName,
      trackKey,
      totalLaps: DEFAULT_LAPS,
      currentLap: 1,
      weather,
      trackTemp,
      state: "Correndo",
      flag: "assets/flags/australia.png", // se não existir, UI ignora

      // track
      svgClean: trackData.svgClean,
      points: trackData.points,

      drivers: pool,
      playerTeam: userTeam
    };

    // injeta SVG no renderer (uma vez)
    if (window.RaceRenderer && typeof window.RaceRenderer.setTrack === "function") {
      window.RaceRenderer.setTrack(race.svgClean, race.points);
    }

    // UI inicial
    RaceUI.updateHeader(race);
    RaceUI.updateTrackStatus(race);

    // start loop
    running = true;
    lastTick = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;

    const dt = ((now - lastTick) / 1000);
    lastTick = now;

    // estabilidade: limita dt em travadas do navegador
    const step = clamp(dt, 0, 0.05);

    // setup/staff: cada piloto recebe “bonus” baseado no time dele
    const save = loadSave() || {};
    const bonusCache = new Map();

    race.drivers.forEach(d => {
      if (!bonusCache.has(d.team)) bonusCache.set(d.team, applySetupAndStaffInfluence(save, d.team));
      stepDriver(d, step, bonusCache.get(d.team));
    });

    // gaps + lap atual
    computeGaps(race.drivers);

    // currentLap = lap do leader + 1 (visual)
    const leader = race.drivers[0];
    race.currentLap = clamp(leader.lap + 1, 1, race.totalLaps);

    // UI
    RaceUI.updateHeader(race);
    RaceUI.updateTrackStatus(race);
    RaceUI.renderSession(race.drivers.slice(0, 20));

    const playerDrivers = race.drivers.filter(d => d.isPlayer).slice(0, 2);
    // garante sempre 2 cards mesmo se salvar estranho
    if (playerDrivers.length < 2) {
      const fallback = getTeamDrivers(race.playerTeam);
      fallback.forEach(fd => {
        if (!playerDrivers.find(x => x.id === fd.id)) {
          const inPool = race.drivers.find(x => x.id === fd.id || x.code === fd.code);
          if (inPool) playerDrivers.push(inPool);
        }
      });
    }
    RaceUI.renderPlayerDrivers(playerDrivers);

    // render posições dos carros no mapa
    if (window.RaceRenderer && typeof window.RaceRenderer.renderCars === "function") {
      window.RaceRenderer.renderCars(race.drivers, race.points);
    }

    // fim
    if (!checkFinish(race.drivers)) requestAnimationFrame(loop);
  }

  // ==========================
  // HOOKS UI SPEED BUTTONS
  // ==========================
  function hookSpeedButtons() {
    const b1 = document.getElementById("speed-1x");
    const b2 = document.getElementById("speed-2x");
    const b4 = document.getElementById("speed-4x");

    if (b1) b1.onclick = () => RaceSystem.setSpeed(1);
    if (b2) b2.onclick = () => RaceSystem.setSpeed(2);
    if (b4) b4.onclick = () => RaceSystem.setSpeed(4);
  }

  function hookBackButton() {
    const btn = document.getElementById("back-lobby");
    if (btn) btn.onclick = () => (window.location.href = "lobby.html");
  }

  document.addEventListener("DOMContentLoaded", () => {
    hookSpeedButtons();
    hookBackButton();
    init();
  });

})();
