(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function qs(name, fallback = "") {
    const u = new URL(location.href);
    return u.searchParams.get(name) || fallback;
  }

  function normalizeTrackId(id) {
    return (id || "").toLowerCase().trim().replace(/\s+/g, "");
  }

  // =========================
  // CONFIG
  // =========================
  const trackId = normalizeTrackId(qs("track", "australia"));
  const gpName = qs("gp", "GP");
  const userTeam = (qs("userTeam", "ferrari") || "ferrari").toUpperCase();

  const TOTAL_LAPS = Math.max(10, parseInt(qs("laps", "19"), 10) || 19);
  let SPEED = 1;
  let paused = false;

  // Canvas
  const canvas = $("#trackCanvas");
  const ctx = canvas.getContext("2d");

  // UI
  const uiLapSmall = $("#uiLapSmall");
  const uiLapBig = $("#uiLapBig");
  const uiLapBottom = $("#uiLapBottom");
  const uiLapsRemaining = $("#uiLapsRemaining");
  const uiSessionClock = $("#uiSessionClock");

  const leaderboardEl = $("#leaderboard");
  const yourDriversEl = $("#yourDrivers");

  // PIT Modal
  const pitModal = $("#pitModal");
  const pitClose = $("#pitClose");
  const pitCancel = $("#pitCancel");
  const pitOk = $("#pitOk");
  const pitDriverName = $("#pitDriverName");
  const tyreBtns = Array.from(document.querySelectorAll(".tyreBtn"));

  // Podium
  const podiumModal = $("#podiumModal");
  const podiumGrid = $("#podiumGrid");
  const podiumClose = $("#podiumClose");

  // Buttons
  $("#btnBack").addEventListener("click", () => (location.href = "lobby.html"));

  $("#btnPause").addEventListener("click", () => {
    paused = !paused;
    $("#btnPause").textContent = paused ? "▶" : "⏸";
  });

  $("#btnFast").addEventListener("click", () => {
    SPEED = SPEED === 4 ? 1 : SPEED === 2 ? 4 : 2;
    setSpeedUI();
  });

  document.querySelectorAll(".speedBtn").forEach((b) => {
    b.addEventListener("click", () => {
      SPEED = parseInt(b.dataset.speed, 10) || 1;
      setSpeedUI();
    });
  });

  function setSpeedUI() {
    document.querySelectorAll(".speedBtn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.speed, 10) === SPEED);
    });
  }
  setSpeedUI();

  // =========================
  // DATA (fallback)
  // =========================
  const DRIVERS = [
    { code: "VER", name: "Max Verstappen", team: "RED BULL" },
    { code: "PER", name: "Sergio Perez", team: "RED BULL" },
    { code: "HAM", name: "Lewis Hamilton", team: "MERCEDES" },
    { code: "RUS", name: "George Russell", team: "MERCEDES" },
    { code: "LEC", name: "Charles Leclerc", team: "FERRARI" },
    { code: "SAI", name: "Carlos Sainz", team: "FERRARI" },
    { code: "NOR", name: "Lando Norris", team: "MCLAREN" },
    { code: "PIA", name: "Oscar Piastri", team: "MCLAREN" },
    { code: "ALO", name: "Fernando Alonso", team: "ASTON MARTIN" },
    { code: "STR", name: "Lance Stroll", team: "ASTON MARTIN" },
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

  function faceUrl(code) {
    return `assets/faces/${code}.png`;
  }

  // Se você tiver uma seleção real no localStorage, respeita; senão LEC/SAI
  function getUserDrivers() {
    try {
      const saved = JSON.parse(localStorage.getItem("userTeamDrivers") || "null");
      if (saved && Array.isArray(saved) && saved.length >= 2) {
        return saved.slice(0, 2).map((x) => {
          const code = String(x.code || x).toUpperCase();
          const base = DRIVERS.find((d) => d.code === code);
          return base || { code, name: x.name || code, team: userTeam };
        });
      }
    } catch (_) {}
    const lec = DRIVERS.find((d) => d.code === "LEC") || DRIVERS[0];
    const sai = DRIVERS.find((d) => d.code === "SAI") || DRIVERS[1];
    return [lec, sai];
  }

  // =========================
  // TRACK PATH
  // =========================
  let PATH = [];
  let BOUNDS = null;

  async function loadTrack() {
    const url = `assets/tracks/${trackId}.svg`;
    let svgText = null;

    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("svg not ok");
      svgText = await r.text();
    } catch (e) {
      // fallback: australia
      const r2 = await fetch(`assets/tracks/australia.svg`, { cache: "no-store" });
      svgText = await r2.text();
    }

    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    const paths = Array.from(doc.querySelectorAll("path"));
    if (!svg || !paths.length) throw new Error("SVG inválido/sem path");

    // maior comprimento
    let best = paths[0];
    let bestLen = 0;
    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        if (len > bestLen) { bestLen = len; best = p; }
      } catch (_) {}
    }

    // viewBox
    const vb = (svg.getAttribute("viewBox") || "").trim();
    let vbX = 0, vbY = 0, vbW = 1000, vbH = 1000;
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) [vbX, vbY, vbW, vbH] = parts;
    }

    // sample
    const samples = 1200;
    const totalLen = best.getTotalLength();
    const pts = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const pt = best.getPointAtLength(t * totalLen);
      const x = (pt.x - vbX) / vbW;
      const y = (pt.y - vbY) / vbH;
      pts.push({ x, y });
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }

    PATH = pts;
    BOUNDS = { minX, minY, maxX, maxY };

    if (PATH.length) PATH.push({ ...PATH[0] });
  }

  function toCanvas(p) {
    const pad = 90;
    const cw = canvas.width, ch = canvas.height;

    const w = (BOUNDS.maxX - BOUNDS.minX) || 1;
    const h = (BOUNDS.maxY - BOUNDS.minY) || 1;

    const usableW = cw - pad * 2;
    const usableH = ch - pad * 2;

    const s = Math.min(usableW / w, usableH / h);
    const ox = (cw - w * s) / 2;
    const oy = (ch - h * s) / 2;

    return {
      x: ox + (p.x - BOUNDS.minX) * s,
      y: oy + (p.y - BOUNDS.minY) * s,
    };
  }

  function pointAt(progress01) {
    const n = PATH.length - 1;
    const raw = progress01 * n;
    const i = Math.floor(raw);
    const t = raw - i;
    const a = PATH[i];
    const b = PATH[Math.min(n, i + 1)];
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  // =========================
  // RACE SIM
  // =========================
  function tyreGrip(t) {
    if (t === "S") return 1.05;
    if (t === "M") return 1.00;
    if (t === "H") return 0.97;
    if (t === "W") return 0.98;
    return 1.0;
  }
  function wearRate(t) {
    if (t === "S") return 0.00060;
    if (t === "M") return 0.00042;
    if (t === "H") return 0.00032;
    if (t === "W") return 0.00046;
    return 0.00042;
  }
  function skill(code) {
    const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return 0.985 + ((seed % 25) / 1000); // 0.985..1.010
  }

  const userDrivers = getUserDrivers();
  const userSet = new Set(userDrivers.map((d) => d.code));

  function makeCar(d, isUser, color) {
    return {
      code: d.code,
      name: d.name,
      team: d.team,
      isUser,
      color,
      lap: 0,
      pos: Math.random() * 0.01,
      total: 0,
      tyre: "M",
      tyreWear: 0,
      condition: 1.0,
      power: 1.0,     // “potência/energia”
      paceMode: 0,    // -2..+2
      powerMode: 0,   // -2..+2
      pitPending: false,
      pitTyre: "M",
      pitLock: 0
    };
  }

  // Cores FIXAS:
  // - User #1: amarelo
  // - User #2: branco
  // - IA: azul/cinza discreto
  const cars = DRIVERS.map((d) => {
    const isUser = userSet.has(d.code);
    if (isUser) return null; // adiciona abaixo para garantir ordem/cores
    return makeCar(d, false, "rgba(90,160,255,.85)");
  }).filter(Boolean);

  // garante 2 user cars
  const u1 = userDrivers[0];
  const u2 = userDrivers[1];

  cars.push(makeCar(u1, true, "rgba(242,209,75,.95)"));
  cars.push(makeCar(u2, true, "rgba(255,255,255,.92)"));

  let raceTime = 0;
  let finished = false;

  // PIT modal state
  let pitTarget = null;
  let pitChosenTyre = "M";

  function openPit(car) {
    pitTarget = car;
    pitChosenTyre = car.pitTyre || "M";
    pitDriverName.textContent = `${car.name} • ${car.team}`;
    tyreBtns.forEach((b) => b.classList.toggle("active", b.dataset.tyre === pitChosenTyre));
    pitModal.classList.remove("hidden");
  }
  function closePit() {
    pitModal.classList.add("hidden");
    pitTarget = null;
  }

  tyreBtns.forEach((b) => {
    b.addEventListener("click", () => {
      pitChosenTyre = b.dataset.tyre;
      tyreBtns.forEach((x) => x.classList.toggle("active", x.dataset.tyre === pitChosenTyre));
    });
  });

  pitClose.addEventListener("click", closePit);
  pitCancel.addEventListener("click", closePit);

  pitOk.addEventListener("click", () => {
    if (!pitTarget) return closePit();
    pitTarget.pitPending = true;
    pitTarget.pitTyre = pitChosenTyre;
    closePit();
    renderRight();
  });

  if (podiumClose) podiumClose.addEventListener("click", () => podiumModal.classList.add("hidden"));

  function step(dt) {
    if (finished || paused) return;

    raceTime += dt;

    for (const c of cars) {
      // PIT lock (tempo parado)
      if (c.pitLock > 0) { c.pitLock -= 1; continue; }

      // entra no box no fim da volta
      if (c.pitPending && c.pos > 0.985) {
        c.pitPending = false;
        c.pitLock = Math.floor(75 / SPEED);
        c.tyre = c.pitTyre || "M";
        c.tyreWear = 0.0;
        c.power = clamp(c.power + 0.35, 0, 1);
      }

      // modos
      const grip = tyreGrip(c.tyre);
      const wearPenalty = 1.0 - (c.tyreWear * 0.60);

      const paceMul = 1.0 + (c.paceMode * 0.02);
      const powerMul = 1.0 + (c.powerMode * 0.02);

      // power drain (mais agressivo consome)
      const drain = (0.00022 + Math.max(0, c.powerMode) * 0.00018 + Math.max(0, c.paceMode) * 0.00010) * dt * SPEED;
      c.power = clamp(c.power - drain, 0, 1);

      const boost = (c.power > 0.12 && c.powerMode > 0) ? 1.014 : 1.0;

      // wear
      const w = wearRate(c.tyre) * dt * SPEED * (1.0 + Math.max(0, c.paceMode) * 0.25 + Math.max(0, c.powerMode) * 0.20);
      c.tyreWear = clamp(c.tyreWear + w, 0, 1);

      // condition (pune desgaste extremo)
      if (c.tyreWear > 0.85 && c.paceMode >= 1) {
        c.condition = clamp(c.condition - 0.00010 * dt * SPEED, 0.6, 1);
      }

      const base = 0.0198; // velocidade base
      const v = base * skill(c.code) * grip * wearPenalty * paceMul * powerMul * boost * c.condition;

      c.pos += v * dt * SPEED;

      if (c.pos >= 1) {
        c.pos -= 1;
        c.lap += 1;
      }

      c.total = c.lap + c.pos;
    }

    // finish condition: líder completa TOTAL_LAPS
    const sorted = [...cars].sort((a, b) => b.total - a.total);
    if (sorted[0].lap >= TOTAL_LAPS) {
      finished = true;
      showPodium(sorted.slice(0, 3));
    }
  }

  // =========================
  // DRAW
  // =========================
  function drawTrack() {
    if (!PATH.length) return;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // base cinza
    ctx.beginPath();
    const p0 = toCanvas(PATH[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < PATH.length; i++) {
      const p = toCanvas(PATH[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 22;
    ctx.stroke();

    // linha branca
    ctx.strokeStyle = "rgba(255,255,255,.88)";
    ctx.lineWidth = 10;
    ctx.stroke();

    // brilho
    ctx.strokeStyle = "rgba(90,160,255,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawCars() {
    for (const c of cars) {
      const p = pointAt(c.pos);
      const cp = toCanvas(p);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, c.isUser ? 8 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,.65)";
      ctx.stroke();
      ctx.restore();
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrack();
    drawCars();
  }

  // =========================
  // UI RENDER
  // =========================
  function leaderLap() {
    const lead = [...cars].sort((a, b) => b.total - a.total)[0];
    return lead ? lead.lap : 0;
  }

  function updateTop() {
    const lap = Math.min(TOTAL_LAPS, leaderLap() + 1);
    const remaining = Math.max(0, TOTAL_LAPS - lap);

    uiLapSmall.textContent = `Volta ${lap}/${TOTAL_LAPS}`;
    uiLapBig.textContent = `VOLTA ${lap}/${TOTAL_LAPS}`;
    uiLapBottom.textContent = `VOLTA ${lap}/${TOTAL_LAPS}`;
    uiLapsRemaining.textContent = `${remaining} VOLTAS RESTANTES`;

    uiSessionClock.textContent = `t=${raceTime.toFixed(1)}s • ${SPEED}x`;
  }

  function renderLeft() {
    const sorted = [...cars].sort((a, b) => b.total - a.total);
    const leader = sorted[0];

    leaderboardEl.innerHTML = "";
    sorted.slice(0, 20).forEach((c, idx) => {
      const gap = idx === 0 ? "Líder" : `+${((leader.total - c.total) * 60).toFixed(3)}`;

      const row = document.createElement("div");
      row.className = "lbRow";

      const pos = document.createElement("div");
      pos.className = "lbPos";
      pos.textContent = String(idx + 1);

      const name = document.createElement("div");
      name.className = "lbName";
      name.innerHTML = `
        <div class="nm">${c.name}</div>
        <div class="sub">${c.team} • ${c.tyre} • ${Math.round((1 - c.tyreWear) * 100)}%</div>
      `;

      const g = document.createElement("div");
      g.className = "lbGap";
      g.textContent = gap;

      row.appendChild(pos);
      row.appendChild(name);
      row.appendChild(g);

      leaderboardEl.appendChild(row);
    });
  }

  function barHTML(value01, colorCss) {
    const pct = clamp(value01, 0, 1) * 100;
    return `<div class="bar"><i style="width:${pct}%;background:${colorCss};"></i></div>`;
  }

  function renderRight() {
    const yours = cars.filter((c) => c.isUser);

    yourDriversEl.innerHTML = "";
    for (const c of yours) {
      const card = document.createElement("div");
      card.className = "driverCard";

      const header = document.createElement("div");
      header.className = "driverHeader";

      const img = document.createElement("img");
      img.className = "face";
      img.src = faceUrl(c.code);
      img.alt = c.code;
      img.onerror = () => (img.style.visibility = "hidden");

      const title = document.createElement("div");
      title.className = "driverTitle";
      title.innerHTML = `
        <div class="name">${c.name}</div>
        <div class="team">${c.team} • VOLTA ${Math.max(1, c.lap)}</div>
      `;

      header.appendChild(img);
      header.appendChild(title);

      const kpis = document.createElement("div");
      kpis.className = "kpiRow";

      const conditionPct = Math.round(c.condition * 100);
      const tyrePct = Math.round((1 - c.tyreWear) * 100);
      const powerPct = Math.round(c.power * 100);

      const k1 = document.createElement("div");
      k1.className = "kpi";
      k1.innerHTML = `
        <div class="label">CONDIÇÃO</div>
        <div class="value"><span>${conditionPct}%</span><span>${c.tyre}</span></div>
        ${barHTML(c.condition, "rgba(34,201,124,.85)")}
      `;

      const k2 = document.createElement("div");
      k2.className = "kpi";
      k2.innerHTML = `
        <div class="label">PNEU (desgaste)</div>
        <div class="value"><span>${tyrePct}%</span><span>Uso +${(c.tyreWear * 10).toFixed(1)}x</span></div>
        ${barHTML(1 - c.tyreWear, "rgba(242,209,75,.85)")}
      `;

      const k3 = document.createElement("div");
      k3.className = "kpi";
      k3.innerHTML = `
        <div class="label">POTÊNCIA</div>
        <div class="value"><span>${powerPct}%</span><span>Modo ${c.powerMode}</span></div>
        ${barHTML(c.power, "rgba(57,183,255,.85)")}
      `;

      const k4 = document.createElement("div");
      k4.className = "kpi";
      k4.innerHTML = `
        <div class="label">RITMO</div>
        <div class="value"><span>Modo ${c.paceMode}</span><span>${c.pitPending ? "PIT ✔" : "—"}</span></div>
        ${barHTML(clamp((c.paceMode + 2) / 4, 0, 1), "rgba(255,255,255,.55)")}
      `;

      kpis.appendChild(k1);
      kpis.appendChild(k2);
      kpis.appendChild(k3);
      kpis.appendChild(k4);

      const actions = document.createElement("div");
      actions.className = "actions";

      const pit = document.createElement("button");
      pit.className = "actionBtn pit";
      pit.textContent = c.pitPending ? "PIT STOP (AGENDADO)" : "PIT STOP";
      pit.addEventListener("click", () => openPit(c));

      actions.appendChild(pit);

      const small = document.createElement("div");
      small.className = "smallActions";

      const paceDown = document.createElement("button");
      paceDown.className = "smallBtn acc";
      paceDown.textContent = "RITMO -";
      paceDown.onclick = () => { c.paceMode = clamp(c.paceMode - 1, -2, 2); renderRight(); };

      const paceUp = document.createElement("button");
      paceUp.className = "smallBtn acc";
      paceUp.textContent = "RITMO +";
      paceUp.onclick = () => { c.paceMode = clamp(c.paceMode + 1, -2, 2); renderRight(); };

      const powDown = document.createElement("button");
      powDown.className = "smallBtn pow";
      powDown.textContent = "POTÊNCIA -";
      powDown.onclick = () => { c.powerMode = clamp(c.powerMode - 1, -2, 2); renderRight(); };

      const powUp = document.createElement("button");
      powUp.className = "smallBtn pow";
      powUp.textContent = "POTÊNCIA +";
      powUp.onclick = () => { c.powerMode = clamp(c.powerMode + 1, -2, 2); renderRight(); };

      small.appendChild(paceDown);
      small.appendChild(paceUp);
      small.appendChild(powDown);
      small.appendChild(powUp);

      card.appendChild(header);
      card.appendChild(kpis);
      card.appendChild(actions);
      card.appendChild(small);

      yourDriversEl.appendChild(card);
    }
  }

  function showPodium(top3) {
    podiumGrid.innerHTML = "";
    top3.forEach((c, i) => {
      const div = document.createElement("div");
      div.style.padding = "12px";
      div.style.borderRadius = "14px";
      div.style.border = "1px solid rgba(255,255,255,.10)";
      div.style.background = "rgba(255,255,255,.06)";
      div.innerHTML = `<div style="font-weight:950;">#${i + 1} • ${c.name}</div><div style="color:rgba(255,255,255,.65);margin-top:4px;">${c.team}</div>`;
      podiumGrid.appendChild(div);
    });
    podiumModal.classList.remove("hidden");
  }

  // =========================
  // LOOP
  // =========================
  let last = performance.now();

  function tick(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    step(dt);
    render();
    updateTop();
    renderLeft();

    requestAnimationFrame(tick);
  }

  // =========================
  // INIT
  // =========================
  async function init() {
    await loadTrack();
    renderRight();
    updateTop();
    renderLeft();
    requestAnimationFrame(tick);
  }

  init().catch((e) => {
    console.error(e);
    alert("Erro ao iniciar corrida: " + (e.message || e));
  });

})();
