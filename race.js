// ==========================================================
// F1 MANAGER 2025 – RACE.JS (ETAPA 1)
// - Corrige: logo da equipe + Piloto 2 (nome/face/equipe)
// - Grid vem da Qualy (localStorage f1m2025_last_qualy)
// - Fallback: PilotMarketSystem -> preset DRIVERS
// - Render: SVG track + carros coloridos por equipe + lista sessão
// ==========================================================

/* ------------------------------
   PRESET DRIVERS (fallback)
   (mantém compatível com seus assets/faces/XXX.png e assets/logos/*.png)
------------------------------ */
const DRIVERS_2025 = [
  { id: "verstappen", code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98, color: "#ffb300", logo: "assets/logos/redbull.png" },
  { id: "perez",      code: "PER", name: "Sergio Pérez",   teamKey: "redbull", teamName: "Red Bull Racing", rating: 94, color: "#ffb300", logo: "assets/logos/redbull.png" },

  { id: "leclerc", code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95, color: "#ff0000", logo: "assets/logos/ferrari.png" },
  { id: "sainz",   code: "SAI", name: "Carlos Sainz",   teamKey: "ferrari", teamName: "Ferrari", rating: 93, color: "#ff0000", logo: "assets/logos/ferrari.png" },

  { id: "hamilton", code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95, color: "#00e5ff", logo: "assets/logos/mercedes.png" },
  { id: "russell",  code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 93, color: "#00e5ff", logo: "assets/logos/mercedes.png" },

  { id: "norris", code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 94, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },
  { id: "piastri", code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 92, color: "#ff8c1a", logo: "assets/logos/mclaren.png" },

  { id: "alonso", code: "ALO", name: "Fernando Alonso", teamKey: "aston", teamName: "Aston Martin", rating: 94, color: "#00b894", logo: "assets/logos/aston.png" },
  { id: "stroll",  code: "STR", name: "Lance Stroll",   teamKey: "aston", teamName: "Aston Martin", rating: 88, color: "#00b894", logo: "assets/logos/aston.png" },

  { id: "gasly", code: "GAS", name: "Pierre Gasly",  teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },
  { id: "ocon",  code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 90, color: "#4c6fff", logo: "assets/logos/alpine.png" },

  { id: "tsunoda", code: "TSU", name: "Yuki Tsunoda", teamKey: "racingbulls", teamName: "Racing Bulls", rating: 89, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },
  { id: "lawson",  code: "LAW", name: "Liam Lawson",  teamKey: "racingbulls", teamName: "Racing Bulls", rating: 88, color: "#7f00ff", logo: "assets/logos/racingbulls.png" },

  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",      teamKey: "sauber", teamName: "Sauber / Audi", rating: 89, color: "#00cec9", logo: "assets/logos/sauber.png" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto",    teamKey: "sauber", teamName: "Sauber / Audi", rating: 88, color: "#00cec9", logo: "assets/logos/sauber.png" },

  { id: "magnussen", code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },
  { id: "bearman",   code: "BEA", name: "Oliver Bearman",  teamKey: "haas", teamName: "Haas", rating: 87, color: "#ffffff", logo: "assets/logos/haas.png" },

  { id: "albon",    code: "ALB", name: "Alex Albon",        teamKey: "williams", teamName: "Williams Racing", rating: 89, color: "#0984e3", logo: "assets/logos/williams.png" },
  { id: "sargeant", code: "SAR", name: "Logan Sargeant",    teamKey: "williams", teamName: "Williams Racing", rating: 86, color: "#0984e3", logo: "assets/logos/williams.png" }
];

const TRACK_BASE_LAP_TIME_MS = {
  australia: 80000, bahrain: 91000, jeddah: 88000, imola: 76000, monaco: 72000,
  canada: 77000, spain: 78000, austria: 65000, silverstone: 83000, hungary: 77000,
  spa: 115000, zandvoort: 74000, monza: 78000, singapore: 100000, suzuka: 82000,
  qatar: 87000, austin: 89000, mexico: 77000, brazil: 70000, abu_dhabi: 84000
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeQS(sel) { return document.querySelector(sel); }
function safeQSA(sel) { return Array.from(document.querySelectorAll(sel)); }

function resolveFacePath(code) {
  const c = String(code || "").toUpperCase();
  return `assets/faces/${c}.png`;
}
function resolveLogoPath(teamKey) {
  const k = String(teamKey || "").toLowerCase();
  // mantém seu padrão já usado nos presets
  return `assets/logos/${k}.png`;
}

/* ------------------------------
   Estado da Corrida (ETAPA 1)
------------------------------ */
const raceState = {
  track: "australia",
  gp: "GP 2025",
  userTeam: "ferrari",
  baseLapMs: 90000,

  speedMultiplier: 1,
  running: true,
  lastFrame: null,

  pathPoints: [],
  drivers: [],
  visuals: [],
  svg: null
};

/* ------------------------------
   Runtime drivers (Mercado) + fallback
------------------------------ */
function getRuntimeDriversFromMarket() {
  try {
    if (!window.PilotMarketSystem) return null;
    if (typeof window.PilotMarketSystem.init === "function") window.PilotMarketSystem.init();
    if (typeof window.PilotMarketSystem.getTeams !== "function") return null;

    const teams = window.PilotMarketSystem.getTeams() || [];
    if (!teams.length) return null;

    // index preset por code para herdar cor/logo/teamName quando existir
    const byCode = {};
    DRIVERS_2025.forEach(d => { byCode[String(d.code).toUpperCase()] = d; });

    const list = [];
    teams.forEach(teamKey => {
      const active = window.PilotMarketSystem.getActiveDriversForTeam(teamKey) || [];
      active.forEach(p => {
        const code = String(p.code || p.id || "").toUpperCase();
        if (!code) return;

        const preset = byCode[code];
        list.push({
          id: preset?.id || code.toLowerCase(),
          code,
          name: preset?.name || p.name || code,
          teamKey: String(p.teamKey || preset?.teamKey || teamKey || "free"),
          teamName: preset?.teamName || p.teamName || String(teamKey).toUpperCase(),
          rating: Number(p.rating || preset?.rating || 75),
          color: preset?.color || p.color || "#ffffff",
          logo: preset?.logo || p.logo || resolveLogoPath(p.teamKey || teamKey)
        });
      });
    });

    return list.length ? list : null;
  } catch (e) {
    console.warn("PilotMarketSystem falhou no race.js:", e);
    return null;
  }
}

function loadGridFromLastQualy() {
  try {
    const raw = localStorage.getItem("f1m2025_last_qualy");
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || !Array.isArray(payload.grid) || !payload.grid.length) return null;
    return payload;
  } catch {
    return null;
  }
}

function buildDriversList() {
  // 1) tenta grid salvo da qualy (ordem oficial)
  const q = loadGridFromLastQualy();

  // base de dados para completar cor/logo/face
  const presetById = {};
  const presetByCode = {};
  DRIVERS_2025.forEach(d => {
    presetById[String(d.id)] = d;
    presetByCode[String(d.code).toUpperCase()] = d;
  });

  // runtime market para enriquecer
  const market = getRuntimeDriversFromMarket();
  const marketByCode = {};
  (market || []).forEach(d => { marketByCode[String(d.code).toUpperCase()] = d; });

  const list = [];

  if (q && Array.isArray(q.grid)) {
    q.grid.forEach((g, idx) => {
      const fromPreset = presetById[String(g.id)] || null;
      const fromMarket = (fromPreset?.code ? marketByCode[String(fromPreset.code).toUpperCase()] : null);

      const code = (fromPreset?.code || fromMarket?.code || String(g.id || "").slice(0,3).toUpperCase());
      const teamKey = g.teamKey || fromPreset?.teamKey || fromMarket?.teamKey || "free";
      const teamName = g.teamName || fromPreset?.teamName || fromMarket?.teamName || String(teamKey).toUpperCase();

      list.push({
        id: fromPreset?.id || fromMarket?.id || String(g.id || code).toLowerCase(),
        code,
        name: g.name || fromPreset?.name || fromMarket?.name || code,
        teamKey,
        teamName,
        rating: Number(fromMarket?.rating || fromPreset?.rating || 75),
        color: fromMarket?.color || fromPreset?.color || "#ffffff",
        logo: fromMarket?.logo || fromPreset?.logo || resolveLogoPath(teamKey),
        gridPos: Number(g.position || (idx + 1))
      });
    });

    // track/gp/userTeam se vierem no payload
    if (q.track) raceState.track = q.track;
    if (q.gp) raceState.gp = q.gp;
    if (q.userTeamKey) raceState.userTeam = q.userTeamKey;

    return list;
  }

  // 2) se não tem qualy, tenta mercado
  if (market && market.length) return market;

  // 3) fallback total
  return DRIVERS_2025.slice();
}

/* ------------------------------
   Track SVG -> pathPoints 1000x600
------------------------------ */
async function loadTrackSvg(trackKey) {
  const container = document.getElementById("track-container");
  if (!container) return;

  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "track-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);
  raceState.svg = svg;

  let text = "";
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`, { cache: "no-store" });
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG da pista:", e);
    return;
  }

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("SVG sem <path> (assets/tracks/" + trackKey + ".svg)");
    return;
  }

  const len = path.getTotalLength();
  const samples = 520;
  const rawPts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    rawPts.push({ x: p.x, y: p.y });
  }

  // normaliza pro viewBox 1000x600
  const xs = rawPts.map(p => p.x), ys = rawPts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;

  raceState.pathPoints = rawPts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  // pista (bordas)
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  poly.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", "#555");
  poly.setAttribute("stroke-width", "18");
  poly.setAttribute("stroke-linecap", "round");
  poly.setAttribute("stroke-linejoin", "round");
  svg.appendChild(poly);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  inner.setAttribute("points", raceState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "#cfcfcf");
  inner.setAttribute("stroke-width", "6");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  svg.appendChild(inner);

  // dots
  raceState.pathPoints.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 2.6);
    c.setAttribute("fill", "#ffffff");
    c.setAttribute("opacity", "0.9");
    svg.appendChild(c);
  });

  // bandeira
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", raceState.pathPoints[0].x);
  flag.setAttribute("y", raceState.pathPoints[0].y - 10);
  flag.setAttribute("fill", "#fff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);
}

/* ------------------------------
   Visual dos carros
------------------------------ */
function buildCarVisuals() {
  if (!raceState.svg) return;
  raceState.visuals = raceState.drivers.map((drv) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // corpo
    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", "6.3");
    body.setAttribute("fill", drv.color || "#ffffff");
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.4");
    g.appendChild(body);

    // destaque do time do usuário (triângulo)
    if (String(drv.teamKey) === String(raceState.userTeam)) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-12 7,0 -7,0");
      tri.setAttribute("fill", drv.color || "#fff");
      tri.setAttribute("opacity", "0.95");
      g.appendChild(tri);
    }

    raceState.svg.appendChild(g);

    return { id: drv.id, g };
  });
}

/* ------------------------------
   UI: Logo topo + cards pilotos
------------------------------ */
function setTopTeamLogo() {
  const img = document.getElementById("teamLogoTop");
  if (!img) return;

  const teamKey = raceState.userTeam;
  // tenta pegar logo pelo piloto da equipe
  const candidate = raceState.drivers.find(d => String(d.teamKey) === String(teamKey));
  const src = candidate?.logo || resolveLogoPath(teamKey);

  img.src = src;
  img.onerror = () => {
    img.onerror = null;
    // fallback: tenta nomes alternativos (caso você tenha outro arquivo)
    img.src = resolveLogoPath(teamKey);
  };
}

function ensureLogoInsideUserCard(cardEl, logoSrc) {
  if (!cardEl) return;

  // se já existe user-logo, só atualiza
  let logo = cardEl.querySelector(".user-logo");
  if (!logo) {
    // cria uma logo pequena ao lado da face (sem mexer no HTML)
    const headerRow = cardEl.querySelector("div[style*='display:flex']");
    if (!headerRow) return;

    logo = document.createElement("img");
    logo.className = "user-logo";
    logo.alt = "Logo equipe";
    logo.style.width = "28px";
    logo.style.height = "28px";
    logo.style.borderRadius = "8px";
    logo.style.objectFit = "contain";
    logo.style.border = "1px solid rgba(255,255,255,.18)";
    logo.style.background = "rgba(0,0,0,.25)";

    // coloca logo depois da face
    const face = headerRow.querySelector(".user-face");
    if (face && face.parentNode === headerRow) {
      headerRow.insertBefore(logo, face.nextSibling);
    } else {
      headerRow.appendChild(logo);
    }
  }

  logo.src = logoSrc || "";
  logo.onerror = () => {
    logo.onerror = null;
    logo.src = "assets/logos/default.png";
  };
}

function fillUserDriversCards() {
  const teamKey = raceState.userTeam;

  const driversTeam = raceState.drivers.filter(d => String(d.teamKey) === String(teamKey));

  // garante 2 pilotos sempre
  const chosen = [];
  if (driversTeam[0]) chosen.push(driversTeam[0]);
  if (driversTeam[1]) chosen.push(driversTeam[1]);

  // se só veio 1, tenta puxar do preset como segundo
  if (chosen.length < 2) {
    const preset2 = DRIVERS_2025.filter(d => String(d.teamKey) === String(teamKey)).slice(0, 2);
    preset2.forEach(p => {
      if (chosen.length >= 2) return;
      if (!chosen.some(x => x.code === p.code)) chosen.push(p);
    });
  }

  // se ainda faltar, duplica o primeiro (pra nunca ficar "Piloto")
  if (chosen.length === 1) chosen.push({ ...chosen[0], id: chosen[0].id + "_2", code: chosen[0].code, name: chosen[0].name });

  for (let i = 0; i < 2; i++) {
    const card = document.getElementById(`user-driver-card-${i}`);
    if (!card) continue;

    const face = card.querySelector(".user-face");
    const name = card.querySelector(".user-name");
    const team = card.querySelector(".user-team");
    const status = card.querySelector(".user-status");

    const d = chosen[i];
    if (!d) continue;

    if (face) {
      face.src = resolveFacePath(d.code);
      face.onerror = () => {
        face.onerror = null;
        face.src = "assets/faces/default.png";
      };
    }

    if (name) name.textContent = d.name || `Piloto ${i + 1}`;
    if (team) team.textContent = d.teamName || String(d.teamKey || "Equipe");
    if (status) status.textContent = "Normal";

    // LOGO DENTRO DO CARD (cria se não existir)
    ensureLogoInsideUserCard(card, d.logo || resolveLogoPath(d.teamKey));
  }
}

/* ------------------------------
   Sessão / lista (grid + posições)
------------------------------ */
function computeOrderByProgress() {
  // ordem por volta + progresso
  return [...raceState.drivers].sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return b.progress - a.progress;
  });
}

function updateSessionList() {
  const list = document.getElementById("session-list");
  if (!list) return;

  const ordered = computeOrderByProgress();
  const leader = ordered[0];

  list.innerHTML = "";

  ordered.forEach((d, idx) => {
    const row = document.createElement("div");
    row.className = "session-row";

    // gap simples (Etapa 1): baseado em diferença de "distância" em progresso
    const gap = leader ? ((leader.laps + leader.progress) - (d.laps + d.progress)) : 0;
    const gapStr = (idx === 0) ? "LEADER" : `+${(gap * 80).toFixed(3)}`; // escala visual

    row.innerHTML = `
      <div class="pos">${idx + 1}</div>
      <div class="avatar"><img src="${resolveFacePath(d.code)}" onerror="this.onerror=null;this.src='assets/faces/default.png';"></div>
      <div class="meta">
        <div class="name">${d.name}</div>
        <div class="team">${d.teamName}</div>
        <div class="mini">Voltas: ${d.laps}</div>
      </div>
      <div class="gap">${gapStr}</div>
    `;

    if (String(d.teamKey) === String(raceState.userTeam)) row.classList.add("user-team-row");
    list.appendChild(row);
  });
}

/* ------------------------------
   Movimento + render
------------------------------ */
function getPointByProgress(progress) {
  const pts = raceState.pathPoints;
  if (!pts || !pts.length) return { x: 0, y: 0 };
  const total = pts.length;
  const idxFloat = progress * total;
  let i0 = Math.floor(idxFloat);
  let i1 = (i0 + 1) % total;
  const t = idxFloat - i0;
  if (i0 >= total) i0 = total - 1;
  const p0 = pts[i0], p1 = pts[i1];
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

function initRaceDrivers() {
  const list = buildDriversList();

  raceState.drivers = list.map((d, idx) => {
    const ratingCenter = 92;
    const delta = (Number(d.rating || 75) - ratingCenter);
    const skillFactor = 1 - delta * 0.006;        // mais rating = menor tempo
    const targetLap = raceState.baseLapMs * skillFactor;

    // velocidade em "voltas por ms"
    const speedBase = 1 / clamp(targetLap, 58000, 140000);

    return {
      ...d,
      index: idx,
      progress: Math.random(),
      speedBase,
      laps: 0
    };
  });
}

function updateRace(dtMs) {
  if (!raceState.pathPoints.length) return;

  raceState.drivers.forEach(d => {
    const noise = 1 + (Math.random() - 0.5) * 0.05; // +/-2.5%
    const delta = d.speedBase * noise * dtMs;
    let p = d.progress + delta;

    if (p >= 1) {
      p -= 1;
      d.laps += 1;
    }
    d.progress = p;
  });
}

function renderRace() {
  const byId = {};
  raceState.drivers.forEach(d => { byId[d.id] = d; });

  raceState.visuals.forEach(v => {
    const d = byId[v.id];
    if (!d) return;
    const pos = getPointByProgress(d.progress);
    v.g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
  });

  updateSessionList();
}

/* ------------------------------
   Velocidade (1x/2x/4x)
------------------------------ */
function setRaceSpeed(mult) {
  raceState.speedMultiplier = Number(mult || 1);
}

function setupSpeedButtons() {
  // seus botões são <button class="speed-btn" data-speed="1"> etc.
  const buttons = safeQSA(".speed-btn");
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const sp = Number(btn.dataset.speed || "1") || 1;
      setRaceSpeed(sp);

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/* ------------------------------
   Loop principal
------------------------------ */
function loop(ts) {
  if (raceState.lastFrame == null) raceState.lastFrame = ts;
  const dt = (ts - raceState.lastFrame) * raceState.speedMultiplier;
  raceState.lastFrame = ts;

  if (raceState.running) updateRace(dt);
  renderRace();

  requestAnimationFrame(loop);
}

/* ------------------------------
   INIT
------------------------------ */
window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  raceState.track = params.get("track") || raceState.track;
  raceState.gp = params.get("gp") || raceState.gp;
  raceState.userTeam =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    raceState.userTeam;

  raceState.baseLapMs = TRACK_BASE_LAP_TIME_MS[raceState.track] || 90000;

  // título topo (se existir)
  const titleTop = document.getElementById("race-title-gp");
  if (titleTop) titleTop.textContent = raceState.gp;

  // logo topo (corrige)
  initRaceDrivers();
  setTopTeamLogo();

  // cards do usuário (corrige piloto 2 + logo no card)
  fillUserDriversCards();

  setupSpeedButtons();

  await loadTrackSvg(raceState.track);
  buildCarVisuals();

  raceState.lastFrame = performance.now();
  requestAnimationFrame(loop);
});

// export (caso HTML use inline onclick em algum lugar)
window.setRaceSpeed = setRaceSpeed;
