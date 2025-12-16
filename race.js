/* ============================================================
   race.js (SUBSTITUIR ARQUIVO INTEIRO)
   - Corrida baseada em SVG (assets/tracks/<track>.svg)
   - Faces por SIGLA (assets/faces/LEC.png, NOR.png...)
   - Mantém Austrália funcionando e replica para todas as pistas.
   ============================================================ */

(() => {
  "use strict";

  /* ---------------------------
     Utilidades
  --------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function getParam(name, fallback = "") {
    const u = new URL(location.href);
    return u.searchParams.get(name) ?? fallback;
  }

  function normalizeId(raw) {
    const s = String(raw || "").trim().toLowerCase();
    return s
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_")
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${url} (${res.status})`);
    return await res.text();
  }

  function parseSVG(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("SVG inválido: sem <svg>");
    return svg;
  }

  function getDrawablePath(svg) {
    let el = svg.querySelector("path");
    if (!el) el = svg.querySelector("polyline");
    if (!el) el = svg.querySelector("polygon");
    if (!el) throw new Error("SVG não contém path/polyline/polygon.");
    return el;
  }

  function samplePathPoints(pathEl, samples = 1200) {
    if (typeof pathEl.getTotalLength === "function") {
      const len = pathEl.getTotalLength();
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const p = pathEl.getPointAtLength((i / samples) * len);
        pts.push({ x: p.x, y: p.y });
      }
      return pts;
    }

    const tag = pathEl.tagName.toLowerCase();
    if (tag === "polyline" || tag === "polygon") {
      const attr = pathEl.getAttribute("points") || "";
      const raw = attr
        .trim()
        .split(/\s+/g)
        .map(pair => pair.split(",").map(Number))
        .filter(a => a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]));
      if (raw.length < 2) throw new Error("Polyline/Polygon sem pontos suficientes.");

      const segs = [];
      for (let i = 0; i < raw.length - 1; i++) {
        segs.push({ a: { x: raw[i][0], y: raw[i][1] }, b: { x: raw[i + 1][0], y: raw[i + 1][1] } });
      }
      if (tag === "polygon") {
        segs.push({ a: { x: raw[raw.length - 1][0], y: raw[raw.length - 1][1] }, b: { x: raw[0][0], y: raw[0][1] } });
      }

      const lens = segs.map(s => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y));
      const total = lens.reduce((a, b) => a + b, 0) || 1;

      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const dist = (i / samples) * total;
        let acc = 0;
        let idx = 0;
        while (idx < segs.length && acc + lens[idx] < dist) {
          acc += lens[idx];
          idx++;
        }
        const s = segs[Math.min(idx, segs.length - 1)];
        const segLen = lens[Math.min(idx, lens.length - 1)] || 1;
        const t = clamp((dist - acc) / segLen, 0, 1);
        pts.push({ x: lerp(s.a.x, s.b.x, t), y: lerp(s.a.y, s.b.y, t) });
      }
      return pts;
    }

    throw new Error("Elemento de pista não suportado.");
  }

  function normalizePoints01(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const dx = (maxX - minX) || 1;
    const dy = (maxY - minY) || 1;
    return points.map(p => ({ x: (p.x - minX) / dx, y: (p.y - minY) / dy }));
  }

  async function loadTrackPoints(trackId) {
    const id = normalizeId(trackId) || "australia";

    const candidates = [
      `assets/tracks/${id}.svg`,
      `assets/tracks/${id.replace(/_/g, "-")}.svg`,
      `assets/tracks/${id.replace(/_/g, "")}.svg`,
    ];

    let svgText = null;
    let used = null;

    for (const url of candidates) {
      try {
        svgText = await fetchText(url);
        used = url;
        break;
      } catch (_) {}
    }

    if (!svgText) {
      throw new Error(`Erro na corrida: Falha ao carregar SVG da pista. Tentativas: ${candidates.join(" | ")}`);
    }

    const svg = parseSVG(svgText);
    const pathEl = getDrawablePath(svg);
    const rawPts = samplePathPoints(pathEl, 1200);
    const pts01 = normalizePoints01(rawPts);
    return { pts01, source: used };
  }

  /* ---------------------------
     Dados (usa o seu data.js se existir)
  --------------------------- */
  function readData() {
    const d =
      window.F1_DATA ||
      window.DATA ||
      window.data ||
      window.gameData ||
      null;

    if (d && typeof d === "object") return d;

    return {
      teams: [
        { id: "ferrari", name: "Ferrari", color: "#ff2b2b", logo: "assets/logos/ferrari.png" },
        { id: "mclaren", name: "McLaren", color: "#ff8a1e", logo: "assets/logos/mclaren.png" },
        { id: "mercedes", name: "Mercedes", color: "#00ffd0", logo: "assets/logos/mercedes.png" },
        { id: "redbull", name: "Red Bull", color: "#2f6cff", logo: "assets/logos/redbull.png" },
      ],
      drivers: [
        { id: "LEC", code: "LEC", name: "Charles Leclerc", team: "ferrari" },
        { id: "SAI", code: "SAI", name: "Carlos Sainz", team: "ferrari" },
        { id: "NOR", code: "NOR", name: "Lando Norris", team: "mclaren" },
        { id: "PIA", code: "PIA", name: "Oscar Piastri", team: "mclaren" },
      ]
    };
  }

  function teamColorMap(data) {
    const map = {};
    (data.teams || []).forEach(t => {
      map[normalizeId(t.id)] = t.color || "#ffffff";
      map[(t.name || "").toLowerCase()] = t.color || "#ffffff";
    });
    return map;
  }

  function teamLogoMap(data) {
    const map = {};
    (data.teams || []).forEach(t => {
      map[normalizeId(t.id)] = t.logo || "";
    });
    return map;
  }

  function getUserTeamFromUrl(data) {
    const raw = getParam("userTeam", "").trim().toLowerCase();
    if (!raw) return (data.teams && data.teams[0] && data.teams[0].id) ? data.teams[0].id : "ferrari";
    return normalizeId(raw);
  }

  function getGPTitleFromUrl() {
    const gp = getParam("gp", "");
    return gp ? decodeURIComponent(gp) : "GP";
  }

  /* ---------------------------
     Faces por SIGLA (assets/faces/LEC.png etc.)
  --------------------------- */
  function guessDriverCode(driver) {
    // Prioriza campos comuns do seu data.js
    const code =
      driver?.code ||
      driver?.abbr ||
      driver?.sigla ||
      driver?.short ||
      null;

    if (code && String(code).trim()) return String(code).trim().toUpperCase();

    // Se id já for tipo "LEC"
    if (driver?.id && String(driver.id).trim().length <= 4) {
      const id = String(driver.id).trim().toUpperCase();
      if (/^[A-Z0-9]{2,4}$/.test(id)) return id;
    }

    // Fallback: gera pela última palavra do nome (sobrenome)
    const nm = String(driver?.name || "").trim();
    if (!nm) return "PIL";
    const parts = nm.split(/\s+/g).filter(Boolean);
    const last = parts[parts.length - 1] || parts[0];
    const letters = last.replace(/[^A-Za-z]/g, "").toUpperCase();
    return (letters.slice(0, 3) || "PIL");
  }

  function createFaceEl(driver) {
    const wrap = document.createElement("div");
    wrap.className = "avatar";

    const img = document.createElement("img");
    img.alt = driver?.name || "Piloto";
    img.loading = "lazy";
    img.decoding = "async";

    const code = guessDriverCode(driver); // EX: LEC
    const candidates = [
      `assets/faces/${code}.png`,
      `assets/faces/${code}.jpg`,
      `assets/faces/${code}.webp`,
      `assets/faces/${code.toLowerCase()}.png`,
      `assets/faces/${code.toLowerCase()}.jpg`,
      `assets/faces/${code.toLowerCase()}.webp`,
    ];

    let idx = 0;
    img.src = candidates[idx];

    img.onerror = () => {
      idx++;
      if (idx < candidates.length) {
        img.src = candidates[idx];
        return;
      }
      // Fallback: iniciais
      wrap.classList.add("fallback");
      const initials = document.createElement("span");
      initials.className = "initials";
      const nm = (driver?.name || "Piloto").trim();
      const parts = nm.split(/\s+/g).filter(Boolean);
      const ini = (parts[0]?.[0] || "P") + (parts[1]?.[0] || "");
      initials.textContent = ini.toUpperCase();
      wrap.innerHTML = "";
      wrap.appendChild(initials);
    };

    wrap.appendChild(img);
    return wrap;
  }

  /* ---------------------------
     Estado da Corrida
  --------------------------- */
  const state = {
    trackId: "australia",
    gpTitle: "GP",
    lapsTotal: 10,
    lap: 1,
    running: true,
    speedMul: 1,
    time: 0,

    pts01: [],
    trackSource: "",

    cars: [],
    finished: false,

    canvas: null,
    ctx: null,
    w: 0,
    h: 0,
  };

  /* ---------------------------
     UI
  --------------------------- */
  function bindUI() {
    state.canvas = $("#trackCanvas") || $("canvas") || null;

    if (!state.canvas) {
      const wrap = $("#trackWrap") || $("#mapaPista") || document.body;
      const c = document.createElement("canvas");
      c.id = "trackCanvas";
      c.style.width = "100%";
      c.style.height = "100%";
      wrap.appendChild(c);
      state.canvas = c;
    }

    state.ctx = state.canvas.getContext("2d", { alpha: false });

    const b1 = $("[data-speed='1']") || $("#btn1x");
    const b2 = $("[data-speed='2']") || $("#btn2x");
    const b4 = $("[data-speed='4']") || $("#btn4x");

    if (b1) b1.onclick = () => setSpeed(1);
    if (b2) b2.onclick = () => setSpeed(2);
    if (b4) b4.onclick = () => setSpeed(4);

    const back = $("#backToLobby") || $("[data-back]");
    if (back) back.onclick = () => { location.href = "lobby.html"; };
  }

  function setSpeed(m) {
    state.speedMul = m;
    $$("[data-speed]").forEach(el => el.classList.toggle("active", String(el.dataset.speed) === String(m)));
    $("#btn1x")?.classList.toggle("active", m === 1);
    $("#btn2x")?.classList.toggle("active", m === 2);
    $("#btn4x")?.classList.toggle("active", m === 4);
  }

  function resizeCanvas() {
    const rect = state.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    state.w = Math.floor(rect.width * dpr);
    state.h = Math.floor(rect.height * dpr);
    state.canvas.width = state.w;
    state.canvas.height = state.h;
  }

  /* ---------------------------
     Render
  --------------------------- */
  function drawBackground(ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, state.w, state.h);
  }

  function drawTrack(ctx) {
    const pts = state.pts01;
    if (!pts || pts.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const lw = Math.max(6, Math.floor(Math.min(state.w, state.h) * 0.018));
    const inner = Math.max(2, Math.floor(lw * 0.45));

    ctx.strokeStyle = "#cfcfcf";
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i].x * state.w;
      const y = pts[i].y * state.h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#6f6f6f";
    ctx.lineWidth = inner;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i].x * state.w;
      const y = pts[i].y * state.h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawCars(ctx) {
    const pts = state.pts01;
    if (!pts || pts.length < 2) return;

    const size = Math.max(4, Math.floor(Math.min(state.w, state.h) * 0.012));

    for (const car of state.cars) {
      const idx = Math.floor(clamp(car.progress01, 0, 0.999999) * (pts.length - 1));
      const p = pts[idx];

      const x = p.x * state.w;
      const y = p.y * state.h;

      ctx.save();
      ctx.fillStyle = car.color || "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, Math.floor(size * 0.45)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function render() {
    const ctx = state.ctx;
    if (!ctx) return;
    drawBackground(ctx);
    drawTrack(ctx);
    drawCars(ctx);
  }

  /* ---------------------------
     Simulação (estável)
  --------------------------- */
  function initCars(data, userTeamId, colors) {
    const drivers = (data.drivers || []).slice();

    const teamDrivers = drivers.filter(d => normalizeId(d.team) === normalizeId(userTeamId));
    const otherDrivers = drivers.filter(d => normalizeId(d.team) !== normalizeId(userTeamId));
    const ordered = [...teamDrivers, ...otherDrivers];

    const cars = [];
    const n = Math.min(20, Math.max(6, ordered.length));
    for (let i = 0; i < n; i++) {
      const d = ordered[i] || ordered[ordered.length - 1];
      const teamId = normalizeId(d.team || userTeamId);
      const color = colors[teamId] || "#ffffff";

      cars.push({
        driver: d,
        teamId,
        color,
        progress01: (i / n) * 0.05,
        lap: 1,
        tyre: "M",
        wearTyre: 0,
        wearEngine: 0,
        ers: 1,
        mode: "NORMAL",
        pitRequest: false,
        pitCooldown: 0
      });
    }
    return cars;
  }

  function update(dt) {
    if (!state.running || state.finished) return;

    const baseSpeed = 0.020;
    const mul = state.speedMul;

    for (const car of state.cars) {
      car.wearTyre = clamp(car.wearTyre + dt * 0.0025 * mul, 0, 1);
      car.wearEngine = clamp(car.wearEngine + dt * 0.0018 * mul, 0, 1);
      car.ers = clamp(car.ers - dt * 0.004 * mul, 0, 1);

      car.pitCooldown = Math.max(0, car.pitCooldown - dt * mul);

      if (car.pitRequest && car.pitCooldown <= 0) {
        car.pitRequest = false;
        car.pitCooldown = 8;
        car.progress01 -= 0.035;
        if (car.progress01 < 0) car.progress01 += 1;
        car.wearTyre = 0;
        car.ers = 1;
        car.tyre = car.tyre === "M" ? "H" : "M";
      }

      const perf = 1 - (car.wearTyre * 0.55 + car.wearEngine * 0.35);
      const modeMul =
        car.mode === "ATAQUE" ? 1.12 :
        car.mode === "ECONOMIZAR" ? 0.92 :
        1.0;

      const speed = baseSpeed * perf * modeMul * mul;
      car.progress01 += dt * speed;

      if (car.progress01 >= 1) {
        car.progress01 -= 1;
        car.lap += 1;
      }
    }

    const leader = state.cars.reduce((a, b) => {
      const aDist = (a.lap - 1) + a.progress01;
      const bDist = (b.lap - 1) + b.progress01;
      return bDist > aDist ? b : a;
    }, state.cars[0]);

    state.lap = clamp(leader?.lap || 1, 1, state.lapsTotal);

    if (leader && leader.lap > state.lapsTotal) {
      state.finished = true;
      state.running = false;
      showPodium();
    }
  }

  /* ---------------------------
     Cards dos seus pilotos (faces + controles)
  --------------------------- */
  function buildUserCards(data, userTeamId, logos) {
    const userTeam = normalizeId(userTeamId);
    const userDrivers = (data.drivers || []).filter(d => normalizeId(d.team) === userTeam).slice(0, 2);

    const box = $("#userDrivers") || $("#seusPilotos") || $(".seus-pilotos") || null;
    if (!box) return;

    box.innerHTML = "";

    userDrivers.forEach((d, idx) => {
      const car = state.cars.find(c => (c.driver && (c.driver.id === d.id || guessDriverCode(c.driver) === guessDriverCode(d)))) || state.cars[idx];

      const card = document.createElement("div");
      card.className = "pilot-card";

      const top = document.createElement("div");
      top.className = "pilot-top";

      const face = createFaceEl(d);

      const meta = document.createElement("div");
      meta.className = "pilot-meta";

      const nm = document.createElement("div");
      nm.className = "pilot-name";
      nm.textContent = d.name || `Piloto ${idx + 1}`;

      const team = document.createElement("div");
      team.className = "pilot-team";
      team.textContent = (d.team || userTeamId || "").toString().toUpperCase();

      meta.appendChild(nm);
      meta.appendChild(team);

      const logo = document.createElement("img");
      logo.className = "team-logo";
      logo.alt = "Logo equipe";
      logo.loading = "lazy";
      logo.decoding = "async";
      logo.src = logos[userTeam] || "";
      logo.onerror = () => { logo.remove(); };

      top.appendChild(face);
      top.appendChild(meta);
      if (logo.src) top.appendChild(logo);

      const controls = document.createElement("div");
      controls.className = "pilot-controls";

      const pitBtn = document.createElement("button");
      pitBtn.className = "btn pit";
      pitBtn.textContent = "PIT";
      pitBtn.onclick = () => { if (car) car.pitRequest = true; };

      const modeRow = document.createElement("div");
      modeRow.className = "mode-row";

      const econ = document.createElement("button");
      econ.className = "btn";
      econ.textContent = "ECONOMIZAR";
      econ.onclick = () => { if (car) car.mode = "ECONOMIZAR"; };

      const atk = document.createElement("button");
      atk.className = "btn";
      atk.textContent = "ATAQUE";
      atk.onclick = () => { if (car) car.mode = "ATAQUE"; };

      modeRow.appendChild(econ);
      modeRow.appendChild(atk);

      controls.appendChild(pitBtn);
      controls.appendChild(modeRow);

      card.appendChild(top);
      card.appendChild(controls);

      box.appendChild(card);
    });
  }

  /* ---------------------------
     Pódio (com faces por sigla)
  --------------------------- */
  function showPodium() {
    let modal = $("#podiumModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "podiumModal";
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.background = "rgba(0,0,0,.75)";
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.zIndex = "9999";
      modal.style.padding = "16px";
      modal.innerHTML = `
        <div style="max-width:720px;width:100%;background:#101218;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="font-weight:800;color:#fff;font-size:18px;">Pódio</div>
            <button id="podiumClose" style="border:0;background:#fff;color:#111;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer;">FECHAR</button>
          </div>
          <div id="podiumList" style="margin-top:14px;display:grid;gap:10px;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      $("#podiumClose").onclick = () => modal.remove();
    }

    const list = $("#podiumList");
    if (!list) return;
    list.innerHTML = "";

    const sorted = [...state.cars].sort((a, b) => {
      const ad = (a.lap - 1) + a.progress01;
      const bd = (b.lap - 1) + b.progress01;
      return bd - ad;
    });

    const top3 = sorted.slice(0, 3);
    top3.forEach((car, i) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "10px 12px";
      row.style.borderRadius = "12px";
      row.style.border = "1px solid rgba(255,255,255,.10)";
      row.style.background = "rgba(255,255,255,.04)";

      const pos = document.createElement("div");
      pos.textContent = `${i + 1}`;
      pos.style.width = "34px";
      pos.style.height = "34px";
      pos.style.display = "grid";
      pos.style.placeItems = "center";
      pos.style.borderRadius = "10px";
      pos.style.background = "rgba(255,255,255,.10)";
      pos.style.color = "#fff";
      pos.style.fontWeight = "900";

      const face = createFaceEl(car.driver || { name: "Piloto" });
      face.style.width = "34px";
      face.style.height = "34px";

      const meta = document.createElement("div");
      const nm = document.createElement("div");
      nm.textContent = car.driver?.name || "Piloto";
      nm.style.color = "#fff";
      nm.style.fontWeight = "800";

      const tm = document.createElement("div");
      tm.textContent = (car.teamId || "").toUpperCase();
      tm.style.color = "rgba(255,255,255,.65)";
      tm.style.fontSize = "12px";

      meta.appendChild(nm);
      meta.appendChild(tm);

      const dot = document.createElement("div");
      dot.style.marginLeft = "auto";
      dot.style.width = "12px";
      dot.style.height = "12px";
      dot.style.borderRadius = "999px";
      dot.style.background = car.color || "#fff";

      row.appendChild(pos);
      row.appendChild(face);
      row.appendChild(meta);
      row.appendChild(dot);

      list.appendChild(row);
    });

    modal.style.display = "flex";
  }

  /* ---------------------------
     Loop
  --------------------------- */
  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    const dt = clamp((ts - last) / 1000, 0, 0.05);
    last = ts;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  /* ---------------------------
     Boot
  --------------------------- */
  async function boot() {
    bindUI();

    const data = readData();
    const colors = teamColorMap(data);
    const logos = teamLogoMap(data);

    state.trackId = normalizeId(getParam("track", "australia")) || "australia";
    state.gpTitle = getGPTitleFromUrl();

    // mínimo 10 voltas
    const lapsParam = parseInt(getParam("laps", "10"), 10);
    state.lapsTotal = Number.isFinite(lapsParam) ? Math.max(10, lapsParam) : 10;

    try {
      const { pts01, source } = await loadTrackPoints(state.trackId);
      state.pts01 = pts01;
      state.trackSource = source;
    } catch (err) {
      alert(err.message || String(err));
      console.error(err);
      return;
    }

    const userTeamId = getUserTeamFromUrl(data);
    state.cars = initCars(data, userTeamId, colors);

    buildUserCards(data, userTeamId, logos);

    resizeCanvas();
    window.addEventListener("resize", () => resizeCanvas());

    setSpeed(1);
    requestAnimationFrame(loop);
  }

  boot().catch(err => {
    alert(err.message || String(err));
    console.error(err);
  });

})();
