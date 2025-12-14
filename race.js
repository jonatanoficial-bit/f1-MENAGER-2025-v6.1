/* =========================================================
   F1 MANAGER 2025 – RACE.JS (STABLE + FULL)
   - Sem "..."
   - Bolinhas por cor (igual Practice/Qualy)
   - Puxa GRID da Qualy (f1m2025_last_qualy) quando existir
   - Tower com posições + gap
   - Preenche "Seus pilotos"
   - Speed 1x/2x/4x com botão ativo
   - Integra leves bônus de Setup + Staff (se existir no storage)
   ========================================================= */

import { TRACKS_2025 } from "./data.js";

/* =========================
   PARAMS / KEYS
   ========================= */
const params = new URLSearchParams(location.search);
const trackId = (params.get("track") || "australia").toLowerCase();
const gpName = params.get("gp") || `GP ${trackId.toUpperCase()} 2025`;
const userTeam = (params.get("userTeam") || localStorage.getItem("f1m2025_user_team") || "ferrari").toLowerCase();
localStorage.setItem("f1m2025_user_team", userTeam);

// storages usados no seu projeto (alguns podem existir, outros não)
const QUALY_KEY = "f1m2025_last_qualy";
const CAREER_KEY = "f1m2025_career_v61";      // economySystem.js
const SEASON_KEY = "f1m2025_season_state";    // versões novas
const SETUP_KEY_PREFIX = "F1M_SETUP_";        // oficina (F1M_SETUP_team)

/* =========================
   PRESETS (para face/código/cores)
   Ajustado p/ BOR existir e evitar “sumir”
   ========================= */
const TEAM_COLORS = {
  redbull: "#ffb300",
  ferrari: "#ff0000",
  mercedes: "#00e5ff",
  mclaren: "#ff6f00",
  astonmartin: "#00c853",
  aston: "#00c853",
  alpine: "#2979ff",
  williams: "#64b5f6",
  rb: "#90caf9",
  racingbulls: "#90caf9",
  sauber: "#76ff03",
  haas: "#bdbdbd"
};

const DRIVERS_PRESET = [
  { code: "VER", name: "Max Verstappen", teamKey: "redbull", teamName: "Red Bull Racing", rating: 98 },
  { code: "PER", name: "Sergio Pérez", teamKey: "redbull", teamName: "Red Bull Racing", rating: 94 },

  { code: "LEC", name: "Charles Leclerc", teamKey: "ferrari", teamName: "Ferrari", rating: 95 },
  { code: "SAI", name: "Carlos Sainz", teamKey: "ferrari", teamName: "Ferrari", rating: 93 },

  { code: "HAM", name: "Lewis Hamilton", teamKey: "mercedes", teamName: "Mercedes", rating: 95 },
  { code: "RUS", name: "George Russell", teamKey: "mercedes", teamName: "Mercedes", rating: 92 },

  { code: "NOR", name: "Lando Norris", teamKey: "mclaren", teamName: "McLaren", rating: 93 },
  { code: "PIA", name: "Oscar Piastri", teamKey: "mclaren", teamName: "McLaren", rating: 90 },

  { code: "ALO", name: "Fernando Alonso", teamKey: "astonmartin", teamName: "Aston Martin", rating: 92 },
  { code: "STR", name: "Lance Stroll", teamKey: "astonmartin", teamName: "Aston Martin", rating: 86 },

  { code: "GAS", name: "Pierre Gasly", teamKey: "alpine", teamName: "Alpine", rating: 90 },
  { code: "OCO", name: "Esteban Ocon", teamKey: "alpine", teamName: "Alpine", rating: 89 },

  { code: "ALB", name: "Alexander Albon", teamKey: "williams", teamName: "Williams", rating: 88 },
  { code: "SAR", name: "Logan Sargeant", teamKey: "williams", teamName: "Williams", rating: 84 },

  { code: "TSU", name: "Yuki Tsunoda", teamKey: "rb", teamName: "RB", rating: 88 },
  { code: "RIC", name: "Daniel Ricciardo", teamKey: "rb", teamName: "RB", rating: 87 },

  { code: "BOR", name: "Gabriel Bortoleto", teamKey: "sauber", teamName: "Sauber", rating: 86 },
  { code: "ZHO", name: "Guanyu Zhou", teamKey: "sauber", teamName: "Sauber", rating: 86 },

  { code: "HUL", name: "Nico Hülkenberg", teamKey: "haas", teamName: "Haas", rating: 87 },
  { code: "MAG", name: "Kevin Magnussen", teamKey: "haas", teamName: "Haas", rating: 86 }
];

const PRESET_BY_CODE = Object.fromEntries(DRIVERS_PRESET.map(d => [d.code, d]));
const PRESET_BY_NAME = (() => {
  const m = {};
  DRIVERS_PRESET.forEach(d => m[normalizeName(d.name)] = d);
  return m;
})();

/* =========================
   DOM
   ========================= */
const elGpTitle = document.getElementById("gpTitle");
const elTrackLabel = document.getElementById("trackLabel");
const elRaceLap = document.getElementById("raceLapLabel");
const elWeather = document.getElementById("weatherLabel");
const elSpeedBtns = Array.from(document.querySelectorAll(".speed-btn"));
const elTower = document.getElementById("race-tower-list");

const elUserCard1 = document.getElementById("user-driver-1");
const elUserCard2 = document.getElementById("user-driver-2");

const elTrackContainer = document.getElementById("track-container");

/* =========================
   HELPERS
   ========================= */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function safeText(el, v) { if (el) el.textContent = String(v ?? ""); }
function normalizeName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
function formatGapSeconds(sec) {
  if (!isFinite(sec)) return "--";
  if (sec <= 0) return "0.0";
  return `+${sec.toFixed(1)}`;
}
function formatLapLabel(cur, total) {
  return `Volta ${cur}/${total}`;
}

/* =========================
   LOADERS (Career / Setup / Season)
   ========================= */
function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStaffModifiers() {
  // tenta pegar de economySystem (career_v61) e/ou season_state
  const career = loadJSON(CAREER_KEY);
  const season = loadJSON(SEASON_KEY);

  const staff =
    career?.staff ||
    season?.staff ||
    {};

  // níveis esperados: 1..5 (mas aceitamos qualquer)
  const pitCrew = Number(staff.pitCrewLevel ?? staff.pitcrew ?? 3);
  const tyreEng = Number(staff.tyreEngineerLevel ?? staff.tyre ?? 3);
  const setupEng = Number(staff.setupEngineerLevel ?? staff.setup ?? 3);

  // efeitos leves e seguros (não mudam a “jogabilidade”, só conectam dados)
  const pitTimeMul = clamp(1 - (pitCrew - 3) * 0.03, 0.88, 1.12); // melhor pitcrew => pit menor
  const tyreWearMul = clamp(1 - (tyreEng - 3) * 0.02, 0.90, 1.10); // melhor engenheiro => menos desgaste
  const paceConsistency = clamp(1 - (setupEng - 3) * 0.01, 0.94, 1.06); // reduz ruído

  return { pitTimeMul, tyreWearMul, paceConsistency };
}

function getSetupForTeam(teamKey) {
  // oficina salva: F1M_SETUP_<team>
  const setup = loadJSON(`${SETUP_KEY_PREFIX}${teamKey}`);
  if (!setup) return null;
  return setup;
}

function getSetupPaceBonus(teamKey) {
  // efeito leve baseado no "score" que você já calcula na oficina
  const setup = getSetupForTeam(teamKey);
  const score = Number(setup?.score ?? setup?.overallScore ?? NaN);
  if (!isFinite(score)) return 1;

  // score normalmente ~0..100 (ou 0..1) — tratamos ambos
  const s = score > 1 ? score : score * 100;
  // 50 = neutro, 100 = levemente melhor
  const bonus = 1 + clamp((s - 50) / 1000, -0.03, 0.05);
  return clamp(bonus, 0.95, 1.06);
}

/* =========================
   TRACK BASE
   ========================= */
function getTrackBaseLapMs(id) {
  // tenta data.js / TRACKS_2025 (varia conforme sua estrutura)
  const t = Array.isArray(TRACKS_2025)
    ? TRACKS_2025.find(x => String(x?.id || x?.key || "").toLowerCase() === id)
    : null;

  const fromData =
    Number(t?.baseLapMs ?? t?.baseLapTimeMs ?? t?.lapMs ?? NaN);

  if (isFinite(fromData) && fromData > 30000) return fromData;

  // fallback seguro
  const fallback = {
    australia: 84000, bahrain: 94000, saudi: 88000, jeddah: 88000,
    japan: 86000, suzuka: 86000, china: 93000, miami: 88000,
    imola: 86000, monaco: 72000, canada: 86000, spain: 84000,
    austria: 65000, britain: 82000, silverstone: 82000,
    hungary: 74000, belgium: 100000, spa: 100000, netherlands: 70000,
    monza: 78000, singapore: 98000, austin: 93000, mexico: 76000,
    brazil: 71000, las_vegas: 88000, qatar: 80000, abu_dhabi: 84000
  };
  return fallback[id] || 84000;
}

function getRaceLaps(id) {
  // tenta data.js
  const t = Array.isArray(TRACKS_2025)
    ? TRACKS_2025.find(x => String(x?.id || x?.key || "").toLowerCase() === id)
    : null;

  const laps = Number(t?.laps ?? t?.raceLaps ?? NaN);
  if (isFinite(laps) && laps >= 5) return laps;

  // fallback curto para “modo demo”
  return 12;
}

/* =========================
   GRID / DRIVERS BUILD
   ========================= */
function inferCodeFromQualyRow(row) {
  // tenta campos conhecidos
  const rawId = String(row?.id || "");
  const rawName = String(row?.name || "");

  const idUpper = rawId.toUpperCase();
  if (/^[A-Z]{3}$/.test(idUpper) && PRESET_BY_CODE[idUpper]) return idUpper;

  // tenta por nome
  const n = normalizeName(rawName);
  if (PRESET_BY_NAME[n]) return PRESET_BY_NAME[n].code;

  // heurísticas mínimas
  if (n.includes("bortoleto")) return "BOR";
  if (n.includes("hulkenberg") || n.includes("hülkenberg")) return "HUL";
  if (n.includes("verstappen")) return "VER";
  if (n.includes("leclerc")) return "LEC";
  if (n.includes("hamilton")) return "HAM";
  if (n.includes("russell")) return "RUS";
  if (n.includes("sainz")) return "SAI";
  if (n.includes("norris")) return "NOR";
  if (n.includes("piastri")) return "PIA";
  if (n.includes("ricciardo")) return "RIC";
  if (n.includes("tsunoda")) return "TSU";
  if (n.includes("zhou")) return "ZHO";
  if (n.includes("magnussen")) return "MAG";
  if (n.includes("albon")) return "ALB";
  if (n.includes("sargeant")) return "SAR";

  return null;
}

function loadGridFromQualy() {
  const q = loadJSON(QUALY_KEY);
  if (!q || !Array.isArray(q.grid) || !q.grid.length) return null;
  if (q.track && String(q.track).toLowerCase() !== trackId) {
    // se for de outra pista, ainda pode usar como fallback, mas tentamos manter consistente
    // return null;
  }
  return q.grid.slice().sort((a, b) => Number(a.position) - Number(b.position));
}

function buildDrivers() {
  const staffMods = getStaffModifiers();
  const baseLapMs = getTrackBaseLapMs(trackId);

  const grid = loadGridFromQualy();

  // base list: ou grid da qualy ou preset fixo
  const baseList = (grid && grid.length >= 10)
    ? grid.map(g => {
        const code = inferCodeFromQualyRow(g);
        const preset = code ? PRESET_BY_CODE[code] : null;

        const teamKey = String(g.teamKey || preset?.teamKey || "ferrari").toLowerCase();
        const teamName = g.teamName || preset?.teamName || teamKey.toUpperCase();

        const rating = Number(preset?.rating ?? 85);
        const color = TEAM_COLORS[teamKey] || "#ffffff";

        return {
          id: code || String(g.id || preset?.code || teamKey + "_" + Math.random()),
          code: code || (preset?.code || "UNK"),
          name: g.name || preset?.name || "Piloto",
          teamKey,
          teamName,
          rating,
          color
        };
      })
    : DRIVERS_PRESET.map(p => ({
        id: p.code,
        code: p.code,
        name: p.name,
        teamKey: p.teamKey,
        teamName: p.teamName,
        rating: p.rating,
        color: TEAM_COLORS[p.teamKey] || "#fff"
      }));

  // runtime state da corrida
  return baseList.map((d, i) => {
    // rating influencia pace; setup e staff entram leve
    const ratingDelta = (d.rating || 85) - 90;
    let skillFactor = 1 - ratingDelta * 0.006;           // menor = mais rápido
    skillFactor = clamp(skillFactor, 0.78, 1.20);

    const setupBonus = getSetupPaceBonus(d.teamKey);     // >1 = melhor
    const consistency = staffMods.paceConsistency;       // ruído menor com staff melhor

    // “target lap”
    const targetLap = baseLapMs * skillFactor / setupBonus;

    return {
      ...d,
      index: i,
      // sim
      progress: Math.random(),
      laps: 0,
      distance: 0,             // laps + progress
      speedBase: 1 / targetLap,
      noiseConsistency: consistency,
      pit: { active: false, timerMs: 0 },
      tyres: { wear: 0, wearMul: staffMods.tyreWearMul },
      face: `assets/faces/${d.code}.png`
    };
  });
}

/* =========================
   SVG TRACK LOADER
   ========================= */
const trackState = {
  svg: null,
  pathPoints: [],
  visuals: [],
  lastFrame: null
};

async function loadTrackSvg() {
  if (!elTrackContainer) return;

  elTrackContainer.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "track-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  elTrackContainer.appendChild(svg);

  let text = "";
  try {
    const resp = await fetch(`assets/tracks/${trackId}.svg`, { cache: "no-cache" });
    text = await resp.text();
  } catch (e) {
    console.error("Falha ao carregar SVG:", e);
    return;
  }

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("SVG sem <path>:", trackId);
    return;
  }

  // sample points
  const len = path.getTotalLength();
  const samples = 520;
  const rawPts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((len * i) / samples);
    rawPts.push({ x: p.x, y: p.y });
  }

  // normalize to 1000x600 (igual qualy)
  const xs = rawPts.map(p => p.x);
  const ys = rawPts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) || 1;
  const h = (maxY - minY) || 1;

  trackState.pathPoints = rawPts.map(p => ({
    x: ((p.x - minX) / w) * 1000,
    y: ((p.y - minY) / h) * 600
  }));

  // draw track
  const outer = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  outer.setAttribute("points", trackState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  outer.setAttribute("fill", "none");
  outer.setAttribute("stroke", "#555");
  outer.setAttribute("stroke-width", "18");
  outer.setAttribute("stroke-linecap", "round");
  outer.setAttribute("stroke-linejoin", "round");
  svg.appendChild(outer);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  inner.setAttribute("points", trackState.pathPoints.map(p => `${p.x},${p.y}`).join(" "));
  inner.setAttribute("fill", "none");
  inner.setAttribute("stroke", "#aaaaaa");
  inner.setAttribute("stroke-width", "6");
  inner.setAttribute("stroke-linecap", "round");
  inner.setAttribute("stroke-linejoin", "round");
  svg.appendChild(inner);

  // dotted racing line
  for (let i = 0; i < trackState.pathPoints.length; i += 8) {
    const p = trackState.pathPoints[i];
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", "2.6");
    c.setAttribute("fill", "#ffffff");
    c.setAttribute("opacity", "0.9");
    svg.appendChild(c);
  }

  // start flag
  const sp = trackState.pathPoints[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", sp.x);
  flag.setAttribute("y", sp.y - 10);
  flag.setAttribute("fill", "#fff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);

  trackState.svg = svg;
}

/* =========================
   RACE STATE
   ========================= */
const raceState = {
  running: true,
  speedMult: 1,
  baseLapMs: getTrackBaseLapMs(trackId),
  totalLaps: getRaceLaps(trackId),
  lap: 1,
  weather: { name: "Seco", trackTemp: 26 }, // simples
  drivers: [],
  visuals: []
};

/* =========================
   VISUALS
   ========================= */
function buildDriverVisuals() {
  if (!trackState.svg) return;

  // limpa visuais anteriores (mantém pista)
  // (não removemos os primeiros elementos; só criamos grupos)
  // cria um layer de visuais no final
  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layer.setAttribute("id", "cars-layer");
  trackState.svg.appendChild(layer);

  raceState.visuals = raceState.drivers.map(d => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    body.setAttribute("r", "6.3");
    body.setAttribute("fill", d.color || "#fff");
    body.setAttribute("stroke", "#000");
    body.setAttribute("stroke-width", "1.6");
    g.appendChild(body);

    // destaca seus pilotos com triângulo
    if (d.teamKey === userTeam) {
      const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      tri.setAttribute("points", "0,-11 7,1 -7,1");
      tri.setAttribute("fill", d.color || "#fff");
      tri.setAttribute("stroke", "#000");
      tri.setAttribute("stroke-width", "1.2");
      g.appendChild(tri);
    }

    layer.appendChild(g);
    return { id: d.id, g };
  });
}

function getPosOnTrack(progress) {
  const pts = trackState.pathPoints;
  if (!pts.length) return { x: 0, y: 0 };
  const total = pts.length;
  const idxFloat = progress * total;
  let i0 = Math.floor(idxFloat);
  let i1 = (i0 + 1) % total;
  const t = idxFloat - i0;
  if (i0 >= total) i0 = total - 1;
  if (i1 >= total) i1 = 0;
  const p0 = pts[i0], p1 = pts[i1];
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

/* =========================
   UI: USER CARDS
   ========================= */
function fillUserCards() {
  const teamDrivers = raceState.drivers.filter(d => d.teamKey === userTeam).slice(0, 2);
  const picks = teamDrivers.length ? teamDrivers : raceState.drivers.slice(0, 2);

  const cards = [elUserCard1, elUserCard2];
  picks.forEach((d, idx) => {
    const card = cards[idx];
    if (!card) return;

    const faceEl = card.querySelector(".user-face");
    const nameEl = card.querySelector(".user-name");
    const teamEl = card.querySelector(".user-team");

    if (faceEl) {
      faceEl.src = d.face;
      faceEl.onerror = () => {
        faceEl.onerror = null;
        faceEl.src = "assets/faces/default.png";
      };
    }
    if (nameEl) nameEl.textContent = d.name;
    if (teamEl) teamEl.textContent = d.teamName;

    const carEl = card.querySelector(".user-car");
    const tyreEl = card.querySelector(".user-tyre");
    const modeEl = card.querySelector(".user-mode");

    // mantém placeholders (sem inventar novos sistemas)
    if (carEl) carEl.textContent = `Carro: ${Math.round(100 - d.tyres.wear)}%`;
    if (tyreEl) tyreEl.textContent = `Pneu: ${Math.round(100 - d.tyres.wear)}%`;
    if (modeEl) modeEl.textContent = "Normal";
  });
}

/* =========================
   UI: TOWER
   ========================= */
function renderTower() {
  if (!elTower) return;

  const ordered = raceState.drivers.slice().sort((a, b) => {
    // maior distância = mais à frente
    if (b.distance !== a.distance) return b.distance - a.distance;
    // desempate: menor desgaste
    return a.tyres.wear - b.tyres.wear;
  });

  const leader = ordered[0];
  const leaderDist = leader ? leader.distance : 0;

  elTower.innerHTML = "";

  ordered.forEach((d, i) => {
    const gapLaps = Math.max(0, leaderDist - d.distance);
    const gapSec = gapLaps * (raceState.baseLapMs / 1000);

    const row = document.createElement("div");
    row.className = "tower-row";
    row.innerHTML = `
      <div class="tower-pos">${i + 1}</div>
      <div class="tower-info">
        <img class="tower-face" src="${d.face}" alt="${d.name}" />
        <div class="tower-text">
          <div class="tower-name">${d.name}</div>
          <div class="tower-team">${d.teamName}</div>
        </div>
      </div>
      <div class="tower-gap">${i === 0 ? "LÍDER" : formatGapSeconds(gapSec)}</div>
    `;

    const img = row.querySelector("img");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = "assets/faces/default.png";
      };
    }

    if (d.teamKey === userTeam) row.classList.add("user-team-row");
    elTower.appendChild(row);
  });
}

/* =========================
   SIMULATION CORE
   ========================= */
function updateRace(dtMs) {
  const staffMods = getStaffModifiers();

  // desgaste e ritmo: simples e estável
  raceState.drivers.forEach(d => {
    // pit simples (se algum dia você ligar botões, já está pronto)
    if (d.pit.active) {
      d.pit.timerMs -= dtMs;
      if (d.pit.timerMs <= 0) {
        d.pit.active = false;
        d.pit.timerMs = 0;
        d.tyres.wear = Math.max(0, d.tyres.wear - 35); // troca “recupera”
      }
      return;
    }

    // ruído controlado (engenheiro de setup reduz “sobe e desce”)
    const noise = (Math.random() - 0.5) * 0.05;
    const noiseFactor = 1 + noise * d.noiseConsistency;

    // ritmo base
    const deltaProg = d.speedBase * noiseFactor * dtMs;
    d.progress += deltaProg;

    // desgaste de pneus (afetado por staff)
    d.tyres.wear = clamp(d.tyres.wear + (dtMs / 1000) * 0.08 * d.tyres.wearMul, 0, 100);

    if (d.progress >= 1) {
      d.progress -= 1;
      d.laps += 1;

      // chance simples de pit “AI” quando desgaste alto (não muda jogabilidade, só evita travar)
      if (d.tyres.wear > 72 && Math.random() < 0.10) {
        const basePit = 22000; // 22s base
        const pitTime = basePit * staffMods.pitTimeMul * (0.92 + Math.random() * 0.16);
        d.pit.active = true;
        d.pit.timerMs = pitTime;
      }
    }

    d.distance = d.laps + d.progress;
  });

  // volta atual = do líder
  const leader = raceState.drivers.slice().sort((a, b) => b.distance - a.distance)[0];
  const leaderLap = leader ? leader.laps + 1 : 1;
  raceState.lap = clamp(leaderLap, 1, raceState.totalLaps);

  // fim da corrida (modo seguro)
  if (leader && leader.laps >= raceState.totalLaps) {
    raceState.running = false;
  }
}

/* =========================
   RENDER
   ========================= */
function renderRace() {
  // move bolinhas
  const byId = Object.fromEntries(raceState.drivers.map(d => [d.id, d]));
  raceState.visuals.forEach(v => {
    const d = byId[v.id];
    if (!d) return;
    const p = getPosOnTrack(d.progress);
    v.g.setAttribute("transform", `translate(${p.x},${p.y})`);
  });

  // UI
  safeText(elRaceLap, formatLapLabel(raceState.lap, raceState.totalLaps));
  safeText(elWeather, `Clima: ${raceState.weather.name}  ·  Pista: ${raceState.weather.trackTemp}°C`);

  renderTower();
  fillUserCards();
}

/* =========================
   LOOP
   ========================= */
function loop(ts) {
  if (trackState.lastFrame == null) trackState.lastFrame = ts;
  const dt = (ts - trackState.lastFrame) * raceState.speedMult;
  trackState.lastFrame = ts;

  if (raceState.running) updateRace(dt);
  renderRace();

  requestAnimationFrame(loop);
}

/* =========================
   SPEED CONTROLS
   ========================= */
function bindSpeedControls() {
  if (!elSpeedBtns.length) return;

  elSpeedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const v = Number(btn.dataset.speed || "1") || 1;
      raceState.speedMult = v;

      elSpeedBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // default active = 1x
  const b1 = elSpeedBtns.find(b => Number(b.dataset.speed || "1") === 1) || elSpeedBtns[0];
  if (b1) b1.classList.add("active");
}

/* =========================
   INIT
   ========================= */
async function initRace() {
  safeText(elGpTitle, gpName);
  safeText(elTrackLabel, `Equipe  ·  F1 MANAGER 2025 — CORRIDA (${trackId})`);

  raceState.baseLapMs = getTrackBaseLapMs(trackId);
  raceState.totalLaps = getRaceLaps(trackId);

  // drivers
  raceState.drivers = buildDrivers();

  // track
  await loadTrackSvg();
  buildDriverVisuals();

  // ui
  bindSpeedControls();
  fillUserCards();
  renderTower();
  safeText(elRaceLap, formatLapLabel(raceState.lap, raceState.totalLaps));
  safeText(elWeather, `Clima: ${raceState.weather.name}  ·  Pista: ${raceState.weather.trackTemp}°C`);

  // start loop
  trackState.lastFrame = performance.now();
  requestAnimationFrame(loop);
}

initRace();
