/* =========================================================
   F1 MANAGER 2025 – RACE SYSTEM (stable)
   - Carrega SVG por pista: assets/tracks/<track>.svg
   - Extrai o primeiro <path> do SVG e amostra pontos
   - Desenha linha (cinza + branco) e move carros no path
   - Faces: assets/faces/<CODE>.png (ex LEC.png, SAI.png)
   - UI de controles sempre completa (motor +/- e agress +/-)
   - Corrida termina e mostra PÓDIO
========================================================= */

(function () {
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function getQS(name, fallback = "") {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || fallback;
  }

  function safeText(el, txt) {
    if (el) el.textContent = txt;
  }

  function safeImg(el, src) {
    if (!el) return;
    el.onerror = () => { el.style.visibility = "hidden"; };
    el.onload = () => { el.style.visibility = "visible"; };
    el.src = src;
  }

  function normalizeTrackId(id) {
    return (id || "").toLowerCase().trim().replace(/\s+/g, "");
  }

  // ---------------------------
  // Minimal data fallback (se data.js não existir ou faltar algo)
  // ---------------------------
  const FALLBACK_DRIVERS = [
    { code: "VER", name: "Max Verstappen", team: "RED BULL" },
    { code: "PER", name: "Sergio Perez", team: "RED BULL RACING" },
    { code: "HAM", name: "Lewis Hamilton", team: "MERCEDES" },
    { code: "RUS", name: "George Russell", team: "MERCEDES" },
    { code: "LEC", name: "Charles Leclerc", team: "FERRARI" },
    { code: "SAI", name: "Carlos Sainz", team: "FERRARI" },
    { code: "NOR", name: "Lando Norris", team: "MCLAREN" },
    { code: "PIA", name: "Oscar Piastri", team: "MCLAREN" },
    { code: "ALO", name: "Fernando Alonso", team: "ASTONMARTIN" },
    { code: "STR", name: "Lance Stroll", team: "ASTONMARTIN" },
    { code: "GAS", name: "Pierre Gasly", team: "ALPINE" },
    { code: "OCO", name: "Esteban Ocon", team: "ALPINE" },
    { code: "HUL", name: "Nico Hulkenberg", team: "HAAS" },
    { code: "MAG", name: "Kevin Magnussen", team: "HAAS" },
    { code: "TSU", name: "Yuki Tsunoda", team: "RB" },
    { code: "LAW", name: "Liam Lawson", team: "RB" },
    { code: "ZHO", name: "Guanyu Zhou", team: "SAUBER" },
    { code: "BOT", name: "Gabriel Bortoleto", team: "SAUBER" },
    { code: "ALB", name: "Alex Albon", team: "WILLIAMS" },
    { code: "SAR", name: "Logan Sargeant", team: "WILLIAMS" },
  ];

  // Tenta usar drivers do data.js se existir no seu projeto.
  function getDriversFromProject() {
    // Procura algumas chaves comuns (não quebra se não existir)
    const g = window;
    const candidates =
      (g.DRIVERS && Array.isArray(g.DRIVERS) && g.DRIVERS) ||
      (g.drivers && Array.isArray(g.drivers) && g.drivers) ||
      (g.gameData && Array.isArray(g.gameData.drivers) && g.gameData.drivers) ||
      null;

    if (!candidates) return FALLBACK_DRIVERS;

    // Normaliza campos mínimos
    const out = candidates
      .map((d) => ({
        code: String(d.code || d.abbr || d.short || "").toUpperCase(),
        name: String(d.name || d.fullName || "Piloto"),
        team: String(d.team || d.teamName || "EQUIPE"),
      }))
      .filter((d) => d.code.length >= 2);

    return out.length ? out : FALLBACK_DRIVERS;
  }

  // ---------------------------
  // State
  // ---------------------------
  const canvas = $("#trackCanvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  let SPEED_MULT = 1;
  const TOTAL_LAPS = Math.max(10, parseInt(getQS("laps", "10"), 10) || 10);

  const trackId = normalizeTrackId(getQS("track", "australia"));
  const gpName = getQS("gp", "GP");
  const userTeam = getQS("userTeam", "ferrari");

  // UI refs
  const gpTitleEl = $("#gpTitle");
  const gpMetaEl = $("#gpMeta");
  const uiLapEl = $("#uiLap");
  const uiStateEl = $("#uiState");
  const uiWeatherEl = $("#uiWeather");
  const uiTempEl = $("#uiTemp");
  const sessionListEl = $("#sessionList");
  const yourDriversEl = $("#yourDrivers");
  const trackInfoEl = $("#trackInfo");
  const podiumModal = $("#podiumModal");
  const podiumGrid = $("#podiumGrid");

  // Setup/clima (pode integrar com o seu sistema depois)
  const weather = "Seco";
  const trackTemp = "21°C";

  // Path points
  let PATH = []; // {x,y}
  let PATH_BOUNDS = null;

  // Cars
  const drivers = getDriversFromProject();

  // Seleciona 2 pilotos do usuário (Ferrari padrão)
  function pickUserDrivers() {
    // Se seu projeto já salva isso no localStorage, respeita:
    // Tenta chaves comuns: userTeamDrivers, career, save, etc.
    try {
      const saved = JSON.parse(localStorage.getItem("userTeamDrivers") || "null");
      if (saved && Array.isArray(saved) && saved.length >= 2) {
        return saved.slice(0, 2).map((x) => ({
          code: String(x.code || x).toUpperCase(),
          name: String(x.name || x.fullName || x.code || x),
          team: String(x.team || userTeam.toUpperCase()),
        }));
      }
    } catch (_) {}

    // fallback: Ferrari LEC/SAI se existirem
    const lec = drivers.find((d) => d.code === "LEC") || drivers[0];
    const sai = drivers.find((d) => d.code === "SAI") || drivers[1] || drivers[0];
    return [lec, sai];
  }

  const userDrivers = pickUserDrivers();

  function faceUrl(code) {
    // Seus arquivos estão em assets/faces/LEC.png etc.
    // (se estiverem em outro lugar, ajuste aqui)
    return `assets/faces/${code}.png`;
  }

  // Cada carro tem "pos" (0..1) dentro da volta atual
  function makeCar(d, isUser) {
    return {
      code: d.code,
      name: d.name,
      team: d.team,
      isUser,
      lap: 0,
      pos: Math.random() * 0.02, // evita empilhar tudo
      totalProgress: 0, // em voltas (ex 2.35 = volta 3)
      delta: 0,
      tyre: "M",
      tyreWear: 0.0, // 0..1
      carHealth: 1.0,
      ers: 1.0,
      engineMode: 0, // -2..+2
      aggr: 0, // -2..+2
      pitPending: false,
      pitLock: 0, // frames
    };
  }

  let cars = [];
  let finished = false;
  let raceTime = 0; // segundos "simulados"

  // ---------------------------
  // SVG -> PATH sampling
  // ---------------------------
  async function loadTrackSvgAndSample() {
    const svgUrl = `assets/tracks/${trackId}.svg`;
    const fallbackUrl = `assets/tracks/australia.svg`;

    let text = null;
    let usedUrl = svgUrl;

    try {
      const r = await fetch(svgUrl, { cache: "no-store" });
      if (!r.ok) throw new Error("SVG not ok");
      text = await r.text();
    } catch (e) {
      usedUrl = fallbackUrl;
      const r2 = await fetch(fallbackUrl, { cache: "no-store" });
      text = await r2.text();
    }

    safeText(trackInfoEl, `SVG • ${usedUrl.split("/").pop()} • path sampling • 60fps`);

    // Parse
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("SVG inválido");

    // Pega o primeiro path grande
    const paths = Array.from(doc.querySelectorAll("path"));
    if (!paths.length) throw new Error("SVG sem <path>");

    // Heurística: pega o path com maior comprimento
    let best = paths[0];
    let bestLen = 0;
    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (len > bestLen) {
          bestLen = len;
          best = p;
        }
      } catch (_) {}
    }

    // Normaliza viewBox
    const vb = (svg.getAttribute("viewBox") || "").trim();
    let vbX = 0, vbY = 0, vbW = 1000, vbH = 1000;
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        [vbX, vbY, vbW, vbH] = parts;
      }
    }

    // Amostra pontos ao longo do path
    const samples = 900; // alta resolução pro carro "colar" no traçado
    const pts = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const totalLen = best.getTotalLength();
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const pt = best.getPointAtLength(t * totalLen);
      const x = (pt.x - vbX) / vbW;
      const y = (pt.y - vbY) / vbH;
      pts.push({ x, y });

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    PATH = pts;
    PATH_BOUNDS = { minX, minY, maxX, maxY };

    // “Fecha” o loop (último ponto = primeiro) para evitar salto visual
    if (PATH.length) PATH.push({ ...PATH[0] });
  }

  function pathToCanvas(p) {
    // Mapeia (0..1) do SVG para canvas com padding e mantendo proporção
    const pad = 60;
    const cw = canvas.width;
    const ch = canvas.height;

    const bx = PATH_BOUNDS;
    const w = (bx.maxX - bx.minX) || 1;
    const h = (bx.maxY - bx.minY) || 1;

    const usableW = cw - pad * 2;
    const usableH = ch - pad * 2;

    const s = Math.min(usableW / w, usableH / h);

    const ox = (cw - w * s) / 2;
    const oy = (ch - h * s) / 2;

    const x = ox + (p.x - bx.minX) * s;
    const y = oy + (p.y - bx.minY) * s;

    return { x, y };
  }

  function getPointByProgress(progress01) {
    // progress01: 0..1
    if (!PATH.length) return { x: 0.5, y: 0.5 };
    const idx = Math.floor(progress01 * (PATH.length - 1));
    const next = Math.min(PATH.length - 1, idx + 1);
    const t = (progress01 * (PATH.length - 1)) - idx;
    const a = PATH[idx];
    const b = PATH[next];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  // ---------------------------
  // Rendering
  // ---------------------------
  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawTrack() {
    if (!PATH.length) return;

    // sombra
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // base cinza grossa
    ctx.beginPath();
    const p0 = pathToCanvas(PATH[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < PATH.length; i++) {
      const p = pathToCanvas(PATH[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 18;
    ctx.stroke();

    // linha branca interna
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // linha highlight suave
    ctx.strokeStyle = "rgba(90,160,255,.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawCars() {
    for (const c of cars) {
      const p = getPointByProgress(c.pos);
      const cp = pathToCanvas(p);

      // cor por equipe / usuário
      const fill = c.isUser ? "rgba(255,80,90,.95)" : "rgba(110,190,255,.90)";
      const edge = "rgba(0,0,0,.65)";

      ctx.save();
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, c.isUser ? 7 : 6, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = edge;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------
  // UI
  // ---------------------------
  function setSpeed(mult) {
    SPEED_MULT = mult;
    document.querySelectorAll(".btn.chip").forEach((b) => {
      const v = parseInt(b.getAttribute("data-speed"), 10);
      b.classList.toggle("active", v === mult);
    });
  }

  function renderSessionList() {
    // Ordena por totalProgress desc
    const sorted = [...cars].sort((a, b) => b.totalProgress - a.totalProgress);

    sessionListEl.innerHTML = "";
    sorted.slice(0, 20).forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "sessionRow";

      const left = document.createElement("div");
      left.className = "sessionLeft";

      const pill = document.createElement("div");
      pill.className = "posPill";
      pill.textContent = String(i + 1);

      const info = document.createElement("div");
      info.style.minWidth = "0";

      const nm = document.createElement("div");
      nm.className = "sessionName";
      nm.textContent = c.name;

      const meta = document.createElement("div");
      meta.className = "sessionMeta";
      meta.textContent = `${c.team} • Voltas: ${c.lap} • Pneu: ${c.tyre}`;

      info.appendChild(nm);
      info.appendChild(meta);

      left.appendChild(pill);
      left.appendChild(info);

      const right = document.createElement("div");
      right.className = "sessionRight";
      right.textContent = i === 0 ? "LEADER" : `+${(sorted[0].delta - c.delta).toFixed(3)}`;

      row.appendChild(left);
      row.appendChild(right);

      sessionListEl.appendChild(row);
    });
  }

  function renderYourDrivers() {
    yourDriversEl.innerHTML = "";

    const yours = cars.filter((c) => c.isUser);

    for (const c of yours) {
      const card = document.createElement("div");
      card.className = "driverCard";

      const top = document.createElement("div");
      top.className = "driverTop";

      const img = document.createElement("img");
      img.className = "face";
      img.alt = c.code;
      img.src = faceUrl(c.code);
      img.onerror = () => { img.style.visibility = "hidden"; };

      const tbox = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "driverName";
      nm.textContent = c.name;

      const tm = document.createElement("div");
      tm.className = "driverTeam";
      tm.textContent = `${c.team} • NORMAL`;

      tbox.appendChild(nm);
      tbox.appendChild(tm);

      top.appendChild(img);
      top.appendChild(tbox);

      const stats = document.createElement("div");
      stats.className = "statsRow";
      stats.innerHTML = `
        <div class="statPill"><span>Carro</span> ${Math.round(c.carHealth * 100)}%</div>
        <div class="statPill"><span>Pneu</span> ${Math.round((1 - c.tyreWear) * 100)}%</div>
        <div class="statPill"><span>ERS</span> ${Math.round(c.ers * 100)}%</div>
        <div class="statPill"><span>Motor</span> M${c.engineMode + 2}</div>
      `;

      const controls = document.createElement("div");
      controls.className = "controls";

      // PIT + seletor pneu
      const pitBtn = document.createElement("button");
      pitBtn.className = "btn primary wide";
      pitBtn.textContent = c.pitPending ? "PIT (AGENDADO)" : "PIT";
      pitBtn.onclick = () => {
        c.pitPending = !c.pitPending;
        renderYourDrivers();
      };

      const tyreSel = document.createElement("select");
      tyreSel.className = "select wide";
      ["S", "M", "H", "W"].forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t === "W" ? "W (Wet)" : (t === "S" ? "S (Soft)" : t === "M" ? "M (Medium)" : "H (Hard)");
        if (c.tyre === t) o.selected = true;
        tyreSel.appendChild(o);
      });
      tyreSel.onchange = () => { c.tyre = tyreSel.value; renderYourDrivers(); };

      // Estratégia
      const ecoBtn = document.createElement("button");
      ecoBtn.className = "btn gray";
      ecoBtn.textContent = "ECONOMIZAR";
      ecoBtn.onclick = () => { c.engineMode = clamp(c.engineMode - 1, -2, 2); renderYourDrivers(); };

      const atkBtn = document.createElement("button");
      atkBtn.className = "btn green";
      atkBtn.textContent = "ATAQUE";
      atkBtn.onclick = () => { c.engineMode = clamp(c.engineMode + 1, -2, 2); renderYourDrivers(); };

      // Motor - / +
      const mMinus = document.createElement("button");
      mMinus.className = "btn gray";
      mMinus.textContent = "MOTOR -";
      mMinus.onclick = () => { c.engineMode = clamp(c.engineMode - 1, -2, 2); renderYourDrivers(); };

      const mPlus = document.createElement("button");
      mPlus.className = "btn gray";
      mPlus.textContent = "MOTOR +";
      mPlus.onclick = () => { c.engineMode = clamp(c.engineMode + 1, -2, 2); renderYourDrivers(); };

      // Agress - / +
      const aMinus = document.createElement("button");
      aMinus.className = "btn gray";
      aMinus.textContent = "AGRESS -";
      aMinus.onclick = () => { c.aggr = clamp(c.aggr - 1, -2, 2); renderYourDrivers(); };

      const aPlus = document.createElement("button");
      aPlus.className = "btn gray";
      aPlus.textContent = "AGRESS +";
      aPlus.onclick = () => { c.aggr = clamp(c.aggr + 1, -2, 2); renderYourDrivers(); };

      controls.appendChild(pitBtn);
      controls.appendChild(tyreSel);
      controls.appendChild(ecoBtn);
      controls.appendChild(atkBtn);
      controls.appendChild(mMinus);
      controls.appendChild(mPlus);
      controls.appendChild(aMinus);
      controls.appendChild(aPlus);

      card.appendChild(top);
      card.appendChild(stats);
      card.appendChild(controls);

      yourDriversEl.appendChild(card);
    }
  }

  function updateHeader() {
    safeText(gpTitleEl, gpName);
    safeText(gpMetaEl, `Volta ${Math.min(TOTAL_LAPS, getLeaderLap() + 1)} • Clima: ${weather} • Pista: ${trackTemp}`);
    safeText(uiWeatherEl, weather);
    safeText(uiTempEl, trackTemp);
  }

  function getLeaderLap() {
    const leader = [...cars].sort((a, b) => b.totalProgress - a.totalProgress)[0];
    return leader ? leader.lap : 0;
  }

  function updateMini() {
    safeText(uiLapEl, `${Math.min(TOTAL_LAPS, getLeaderLap() + 1)}/${TOTAL_LAPS}`);
    safeText(uiStateEl, finished ? "Finalizado" : "Correndo");
  }

  // ---------------------------
  // Race simulation (simple but stable)
  // ---------------------------
  function tyreGrip(tyre) {
    // grip base: S> M > H, W só exemplo
    if (tyre === "S") return 1.04;
    if (tyre === "M") return 1.00;
    if (tyre === "H") return 0.97;
    if (tyre === "W") return 0.98;
    return 1.0;
  }

  function tyreWearRate(tyre) {
    if (tyre === "S") return 0.00055;
    if (tyre === "M") return 0.00040;
    if (tyre === "H") return 0.00030;
    if (tyre === "W") return 0.00045;
    return 0.00040;
  }

  function basePaceFor(car) {
    // base “habilidade” pseudo determinística
    const seed = car.code.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const skill = 0.98 + ((seed % 17) / 1000); // 0.98..0.996
    return skill;
  }

  function step(dt) {
    if (finished) return;

    raceTime += dt;

    // Atualiza cada carro
    for (const c of cars) {
      // PIT handling (simples e estável)
      if (c.pitLock > 0) {
        c.pitLock -= 1;
        continue;
      }
      if (c.pitPending && c.pos > 0.985) {
        // entra no pit ao fim da volta
        c.pitPending = false;
        c.pitLock = Math.floor(70 / SPEED_MULT); // "tempo" parado
        c.tyreWear = 0.0;
        c.ers = Math.min(1.0, c.ers + 0.35);
        c.carHealth = Math.max(0.72, c.carHealth); // não deixa morrer
      }

      const grip = tyreGrip(c.tyre);
      const wearPenalty = 1.0 - (c.tyreWear * 0.55); // quanto mais gasto, mais lento
      const eng = 1.0 + (c.engineMode * 0.02);
      const ag = 1.0 + (c.aggr * 0.02);

      // ERS (consome quando motor/agressivo alto)
      const ersDrain = (0.00020 + Math.max(0, c.engineMode) * 0.00018 + Math.max(0, c.aggr) * 0.00010) * dt * SPEED_MULT;
      c.ers = clamp(c.ers - ersDrain, 0, 1);

      const ersBoost = (c.ers > 0.15 && c.engineMode > 0) ? 1.012 : 1.0;

      // desgaste
      const wear = tyreWearRate(c.tyre) * dt * SPEED_MULT * (1.0 + Math.max(0, c.aggr) * 0.22 + Math.max(0, c.engineMode) * 0.18);
      c.tyreWear = clamp(c.tyreWear + wear, 0, 1);

      // dano leve se for muito agressivo com pneu muito gasto
      if (c.tyreWear > 0.82 && c.aggr >= 1) {
        c.carHealth = clamp(c.carHealth - 0.00010 * dt * SPEED_MULT, 0, 1);
      }

      const pace = basePaceFor(c) * grip * wearPenalty * eng * ag * ersBoost * c.carHealth;
      const speed = 0.0205 * pace; // “velocidade base” no espaço 0..1 por segundo (ajustada)

      c.pos += speed * dt * SPEED_MULT;

      // completou volta?
      if (c.pos >= 1) {
        c.pos -= 1;
        c.lap += 1;
      }

      c.totalProgress = c.lap + c.pos;

      // delta (apenas um número estável pro leaderboard)
      c.delta = c.totalProgress * 90.0; // escala arbitrária
    }

    // fim da corrida: quando o líder completar TOTAL_LAPS
    const leader = [...cars].sort((a, b) => b.totalProgress - a.totalProgress)[0];
    if (leader && leader.lap >= TOTAL_LAPS) {
      finished = true;
      showPodium();
    }
  }

  function showPodium() {
    const sorted = [...cars].sort((a, b) => b.totalProgress - a.totalProgress);
    const top3 = sorted.slice(0, 3);

    podiumGrid.innerHTML = "";
    top3.forEach((c, i) => {
      const slot = document.createElement("div");
      slot.className = "podiumSlot";

      const img = document.createElement("img");
      img.alt = c.code;
      img.src = faceUrl(c.code);
      img.onerror = () => { img.style.visibility = "hidden"; };

      const box = document.createElement("div");
      const pos = document.createElement("div");
      pos.className = "podiumPos";
      pos.textContent = `#${i + 1}`;

      const nm = document.createElement("div");
      nm.className = "podiumName";
      nm.textContent = c.name;

      const meta = document.createElement("div");
      meta.className = "podiumMeta";
      meta.textContent = `${c.team} • Voltas: ${c.lap}`;

      box.appendChild(pos);
      box.appendChild(nm);
      box.appendChild(meta);

      slot.appendChild(img);
      slot.appendChild(box);

      podiumGrid.appendChild(slot);
    });

    // salva resultado mínimo para seu resultsSystem ler depois, se quiser
    try {
      localStorage.setItem("lastRaceResult", JSON.stringify({
        gp: gpName,
        track: trackId,
        laps: TOTAL_LAPS,
        top3: top3.map((c, i) => ({ pos: i + 1, code: c.code, name: c.name, team: c.team })),
        timestamp: Date.now()
      }));
    } catch (_) {}

    podiumModal.classList.remove("hidden");
  }

  // ---------------------------
  // Main loop
  // ---------------------------
  let lastT = performance.now();

  function frame(t) {
    const dt = clamp((t - lastT) / 1000, 0, 0.05);
    lastT = t;

    step(dt);

    clear();
    drawTrack();
    drawCars();

    updateHeader();
    updateMini();
    renderSessionList();

    requestAnimationFrame(frame);
  }

  // ---------------------------
  // Init
  // ---------------------------
  async function init() {
    // Botões speed
    document.querySelectorAll(".btn.chip").forEach((b) => {
      b.addEventListener("click", () => setSpeed(parseInt(b.getAttribute("data-speed"), 10)));
    });
    setSpeed(1);

    // Voltar
    $("#btnBack").addEventListener("click", () => {
      // ajuste o destino conforme seu fluxo real
      window.location.href = "lobby.html";
    });

    // Continue (pós-corrida)
    $("#btnContinue").addEventListener("click", () => {
      podiumModal.classList.add("hidden");
      // ajuste conforme seu fluxo real (ex: results.html / calendario.html)
      window.location.href = "calendario.html";
    });

    // Logo da equipe do usuário (se existir)
    // Se você tiver outro caminho, ajuste aqui.
    safeImg($("#teamLogo"), `assets/teams/${userTeam}.png`);

    // Monta grid de carros: todos drivers + marca 2 como user
    const userCodes = new Set(userDrivers.map((d) => d.code));
    cars = drivers.slice(0, 20).map((d) => makeCar(d, userCodes.has(d.code)));

    // garante que os 2 do usuário existam no array, mesmo se drivers do projeto não incluírem
    for (const ud of userDrivers) {
      if (!cars.find((c) => c.code === ud.code)) cars.push(makeCar(ud, true));
    }

    // carrega pista e inicia UI
    await loadTrackSvgAndSample();
    renderYourDrivers();
    updateHeader();
    updateMini();

    requestAnimationFrame(frame);
  }

  init().catch((err) => {
    console.error(err);
    safeText($("#gpTitle"), "Erro ao iniciar corrida");
    safeText($("#gpMeta"), String(err && err.message ? err.message : err));
  });

})();
