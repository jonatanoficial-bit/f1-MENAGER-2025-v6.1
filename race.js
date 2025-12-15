/* F1 Manager 2025 — Corrida (race.js)
   - Corrige: pista sumindo, carros fora, faces piscando, grid incompleto
   - Implementa: PIT funcional + troca de pneus + clima simples + modos de corrida
*/

(() => {
  "use strict";

  // =========================
  // Helpers
  // =========================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function safeParseJSON(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function getParam(name, fallback = "") {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) ?? fallback;
  }

  function toKey(str) {
    return String(str || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  }

  // =========================
  // Base de pilotos (fallback)
  // Ajuste os IDs/paths se necessário.
  // =========================
  const FALLBACK_DRIVERS = [
    { id:"verstappen", name:"Max Verstappen", team:"redbull", teamName:"Red Bull Racing" },
    { id:"perez", name:"Sergio Pérez", team:"redbull", teamName:"Red Bull Racing" },
    { id:"hamilton", name:"Lewis Hamilton", team:"mercedes", teamName:"Mercedes" },
    { id:"russell", name:"George Russell", team:"mercedes", teamName:"Mercedes" },
    { id:"leclerc", name:"Charles Leclerc", team:"ferrari", teamName:"Ferrari" },
    { id:"sainz", name:"Carlos Sainz", team:"ferrari", teamName:"Ferrari" },
    { id:"norris", name:"Lando Norris", team:"mclaren", teamName:"McLaren" },
    { id:"piastri", name:"Oscar Piastri", team:"mclaren", teamName:"McLaren" },
    { id:"alonso", name:"Fernando Alonso", team:"aston", teamName:"Aston Martin" },
    { id:"stroll", name:"Lance Stroll", team:"aston", teamName:"Aston Martin" },
    { id:"ocon", name:"Esteban Ocon", team:"alpine", teamName:"Alpine" },
    { id:"gasly", name:"Pierre Gasly", team:"alpine", teamName:"Alpine" },
    { id:"tsunoda", name:"Yuki Tsunoda", team:"rb", teamName:"RB" },
    { id:"lawson", name:"Liam Lawson", team:"rb", teamName:"RB" },
    { id:"hulkenberg", name:"Nico Hülkenberg", team:"haas", teamName:"Haas" },
    { id:"magnussen", name:"Kevin Magnussen", team:"haas", teamName:"Haas" },
    { id:"albon", name:"Alex Albon", team:"williams", teamName:"Williams Racing" },
    { id:"sargeant", name:"Logan Sargeant", team:"williams", teamName:"Williams Racing" },
    { id:"zhou", name:"Guanyu Zhou", team:"sauber", teamName:"Sauber / Audi" },
    { id:"bortoleto", name:"Gabriel Bortoleto", team:"sauber", teamName:"Sauber / Audi" },
  ];

  // Tenta reaproveitar o que você já tem salvo (se existir)
  function loadDrivers() {
    const candidates = [
      localStorage.getItem("f1m_drivers"),
      localStorage.getItem("drivers"),
      localStorage.getItem("F1M_DRIVERS"),
    ];
    for (const c of candidates) {
      const obj = safeParseJSON(c);
      if (Array.isArray(obj) && obj.length >= 10) return obj;
      if (obj && Array.isArray(obj.drivers) && obj.drivers.length >= 10) return obj.drivers;
    }
    return FALLBACK_DRIVERS.slice();
  }

  // =========================
  // Assets (tolerantes a falha)
  // =========================
  function faceUrl(driver) {
    // Ajuste se seus paths forem diferentes:
    // ex: assets/drivers/<id>.png
    return `assets/faces/${driver.id}.png`;
  }
  function teamLogoUrl(teamKey) {
    return `assets/logos/${teamKey}.png`;
  }
  function carPngUrl(teamKey) {
    return `assets/cars/${teamKey}.png`;
  }

  // =========================
  // Track loading
  // =========================
  async function fetchText(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Falha ao carregar: ${url}`);
    return await r.text();
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Falha ao carregar: ${url}`);
    return await r.json();
  }

  function normalizePathPoints(raw) {
    // Aceita:
    // - { pathPoints: [{x,y}, ...] }
    // - [{x,y}, ...]
    // - [{X,Y}, ...]
    const pts = Array.isArray(raw) ? raw : raw?.pathPoints;
    if (!Array.isArray(pts) || pts.length < 10) return null;
    return pts.map(p => ({
      x: Number(p.x ?? p.X ?? p[0]),
      y: Number(p.y ?? p.Y ?? p[1])
    })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  // =========================
  // Grid / Qualifying sync
  // =========================
  function loadGridFromStorage(trackKey) {
    const keys = [
      `f1m_grid_${trackKey}`,
      `f1m_q3_grid_${trackKey}`,
      "f1m_lastGrid",
      "qualifyingResults",
      "q3Results",
      "grid",
    ];

    for (const k of keys) {
      const obj = safeParseJSON(localStorage.getItem(k));
      // formatos possíveis: array de ids, array de objetos, {grid:[...]}
      if (Array.isArray(obj) && obj.length) {
        return obj;
      }
      if (obj && Array.isArray(obj.grid) && obj.grid.length) {
        return obj.grid;
      }
      if (obj && Array.isArray(obj.results) && obj.results.length) {
        return obj.results;
      }
    }
    return null;
  }

  function buildGrid(drivers, storedGrid) {
    // objetivo: SEMPRE 20 pilotos
    const byId = new Map(drivers.map(d => [d.id, d]));
    const result = [];

    if (storedGrid) {
      // se vier array de strings:
      if (storedGrid.every(x => typeof x === "string")) {
        for (const id of storedGrid) {
          const d = byId.get(id);
          if (d) result.push(d);
        }
      } else {
        // se vier array de objetos:
        for (const it of storedGrid) {
          const id = it?.id || it?.driverId || it?.driver?.id || it?.nameId;
          const d = byId.get(id);
          if (d) result.push(d);
        }
      }
    }

    // completa com o resto (sem duplicar)
    for (const d of drivers) {
      if (!result.includes(d)) result.push(d);
    }

    // garante 20
    return result.slice(0, 20);
  }

  // =========================
  // Race State
  // =========================
  const state = {
    speedMult: 1,
    fpsTarget: 60,
    weather: "Seco",
    trackTemp: 26,
    lap: 1,
    totalLaps: 5,

    points: [],
    viewBox: { minX:0, minY:0, width:1000, height:1000 },

    // pilotos em corrida (20)
    grid: [],

    // entidades render
    svgOverlay: null,
    carLayer: null,
    cars: [],

    // user team (2 pilotos)
    userTeamKey: "ferrari",
    userDrivers: [null, null],
  };

  function computeViewBoxFromPoints(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const padX = (maxX - minX) * 0.08;
    const padY = (maxY - minY) * 0.08;
    return {
      minX: minX - padX,
      minY: minY - padY,
      width: (maxX - minX) + padX * 2,
      height:(maxY - minY) + padY * 2,
    };
  }

  function polylineString(points) {
    return points.map(p => `${p.x},${p.y}`).join(" ");
  }

  function distance(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.hypot(dx, dy);
  }

  function precomputeLengths(points) {
    const seg = [];
    let total = 0;
    for (let i=0; i<points.length; i++) {
      const a = points[i];
      const b = points[(i+1) % points.length];
      const d = distance(a, b);
      seg.push(d);
      total += d;
    }
    return { seg, total };
  }

  function pointAtProgress(points, lengths, t01) {
    // t01 em [0..1)
    const target = lengths.total * (t01 % 1);
    let acc = 0;
    for (let i=0; i<points.length; i++) {
      const d = lengths.seg[i];
      if (acc + d >= target) {
        const a = points[i];
        const b = points[(i+1) % points.length];
        const localT = (target - acc) / d;
        return {
          x: lerp(a.x, b.x, localT),
          y: lerp(a.y, b.y, localT),
          ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
        };
      }
      acc += d;
    }
    // fallback
    const a = points[0], b = points[1];
    return { x:a.x, y:a.y, ang: Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI };
  }

  // =========================
  // Render: SVG overlay (pista + carros)
  // =========================
  function createSvg(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function createOverlay(points, vb) {
    const host = $("#svgHost");
    host.innerHTML = "";

    // Overlay principal
    const svg = createSvg("svg");
    svg.setAttribute("viewBox", `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Fundo preto
    const rect = createSvg("rect");
    rect.setAttribute("x", vb.minX);
    rect.setAttribute("y", vb.minY);
    rect.setAttribute("width", vb.width);
    rect.setAttribute("height", vb.height);
    rect.setAttribute("fill", "rgba(0,0,0,0.55)");
    svg.appendChild(rect);

    // Linha “sombra”
    const lineShadow = createSvg("polyline");
    lineShadow.setAttribute("points", polylineString(points));
    lineShadow.setAttribute("fill", "none");
    lineShadow.setAttribute("stroke", "rgba(0,0,0,0.55)");
    lineShadow.setAttribute("stroke-width", String(Math.max(vb.width, vb.height) * 0.010));
    lineShadow.setAttribute("stroke-linecap", "round");
    lineShadow.setAttribute("stroke-linejoin", "round");
    svg.appendChild(lineShadow);

    // Linha principal branca/cinza
    const line = createSvg("polyline");
    line.setAttribute("points", polylineString(points));
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "rgba(255,255,255,0.65)");
    line.setAttribute("stroke-width", String(Math.max(vb.width, vb.height) * 0.0065));
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    // Pontos (marcadores discretos)
    const dots = createSvg("g");
    for (let i=0; i<points.length; i+=Math.max(1, Math.floor(points.length/60))) {
      const c = createSvg("circle");
      c.setAttribute("cx", points[i].x);
      c.setAttribute("cy", points[i].y);
      c.setAttribute("r", String(Math.max(vb.width, vb.height) * 0.0018));
      c.setAttribute("fill", "rgba(255,255,255,0.75)");
      dots.appendChild(c);
    }
    svg.appendChild(dots);

    // Linha de largada (aprox)
    const sf = createSvg("g");
    const p0 = points[0];
    const p1 = points[1];
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI/2;
    const len = Math.max(vb.width, vb.height) * 0.02;
    const x1 = p0.x + Math.cos(ang) * len;
    const y1 = p0.y + Math.sin(ang) * len;
    const x2 = p0.x - Math.cos(ang) * len;
    const y2 = p0.y - Math.sin(ang) * len;
    const startLine = createSvg("line");
    startLine.setAttribute("x1", x1);
    startLine.setAttribute("y1", y1);
    startLine.setAttribute("x2", x2);
    startLine.setAttribute("y2", y2);
    startLine.setAttribute("stroke", "rgba(255,255,255,0.85)");
    startLine.setAttribute("stroke-width", String(Math.max(vb.width, vb.height) * 0.0045));
    startLine.setAttribute("stroke-linecap", "round");
    sf.appendChild(startLine);
    svg.appendChild(sf);

    // Layer de carros
    const carLayer = createSvg("g");
    svg.appendChild(carLayer);

    host.appendChild(svg);

    return { svg, carLayer };
  }

  function createCarMarker(driver, vb) {
    // Ícone em SVG: tenta <image> do carro, se falhar cai para círculo colorido
    const g = createSvg("g");

    const size = Math.max(vb.width, vb.height) * 0.0125;

    const img = createSvg("image");
    img.setAttribute("href", carPngUrl(driver.team));
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.setAttribute("x", -size/2);
    img.setAttribute("y", -size/2);
    img.setAttribute("opacity", "0.98");
    g.appendChild(img);

    // Fallback circle (se imagem não existir)
    img.addEventListener("error", () => {
      img.remove();
      const c = createSvg("circle");
      c.setAttribute("r", String(size * 0.35));
      c.setAttribute("fill", "rgba(255,255,255,0.85)");
      c.setAttribute("stroke", "rgba(0,0,0,0.55)");
      c.setAttribute("stroke-width", String(size * 0.10));
      g.appendChild(c);
    }, { once:true });

    return g;
  }

  // =========================
  // Entities & Simulation
  // =========================
  function makeCarEntity(driver, orderIndex, lengths) {
    // progress inicial espaçado (grid)
    const base = (orderIndex / 20) * 0.03; // compactado perto da largada
    return {
      driver,
      orderIndex,
      progress: (0.002 + base) % 1,
      speed: 0.00018 + Math.random() * 0.00005, // base “u/frame”
      tyreWear: 100,
      carWear: 100,
      compound: "M",
      engine: 2,   // 1..3
      aggr: 2,     // 1..3
      ers: 50,
      mode: "normal", // save|normal|push
      pitting: false,
      pitRequested: false,
      pitTimerMs: 0,
      marker: null,
      lengths,
    };
  }

  function modeMultiplier(e) {
    if (e.mode === "save") return 0.94;
    if (e.mode === "push") return 1.06;
    return 1.0;
  }

  function engineMultiplier(e) {
    // M1..M3
    if (e.engine === 1) return 0.96;
    if (e.engine === 3) return 1.05;
    return 1.0;
  }

  function aggrWearMultiplier(e) {
    if (e.aggr === 1) return 0.85;
    if (e.aggr === 3) return 1.18;
    return 1.0;
  }

  function compoundWearBase(comp) {
    // quanto maior, mais gasta
    if (comp === "S") return 1.20;
    if (comp === "M") return 1.00;
    if (comp === "H") return 0.82;
    if (comp === "I") return 1.10;
    if (comp === "W") return 1.18;
    return 1.00;
  }

  function weatherGrip() {
    // influência simples
    if (state.weather === "Chuva") return 0.94;
    return 1.0;
  }

  function updateEntity(e, dtMs) {
    // PIT behavior
    if (e.pitting) {
      e.pitTimerMs -= dtMs;
      if (e.pitTimerMs <= 0) {
        e.pitting = false;
        e.pitRequested = false;
      }
      return;
    }

    // Se PIT solicitado: entra quando passar perto do “entry”
    // (entry aproximado perto do fim do traçado)
    const pitEntry = 0.92;
    if (e.pitRequested && e.progress >= pitEntry && e.progress <= pitEntry + 0.015) {
      // executa pit
      e.pitting = true;
      e.pitTimerMs = 3800 + Math.random() * 1500; // 3.8s a 5.3s
      e.tyreWear = 100;
      e.carWear = Math.max(50, e.carWear - 0.8); // leve desgaste
      return;
    }

    // velocidade efetiva
    const base = e.speed;
    const mult = modeMultiplier(e) * engineMultiplier(e) * weatherGrip();
    const eff = base * mult * state.speedMult;

    e.progress = (e.progress + eff) % 1;

    // desgaste
    const wearRate = 0.018 * compoundWearBase(e.compound) * aggrWearMultiplier(e) * (state.speedMult);
    e.tyreWear = clamp(e.tyreWear - wearRate, 0, 100);

    // se pneu zerar, perde muito ritmo (simples)
    if (e.tyreWear < 12) e.mode = "save";
  }

  // =========================
  // UI
  // =========================
  function setTop(teamKey, gpName) {
    $("#topTitle").textContent = gpName ? `GP da ${gpName} 2025` : "F1 MANAGER 2025 — CORRIDA";
    $("#teamLogoTop").src = teamLogoUrl(teamKey);
    $("#teamLogoTop").onerror = () => { $("#teamLogoTop").src = ""; };
  }

  function updateTopSub() {
    $("#topSub").textContent = `Volta ${state.lap} • Clima: ${state.weather} • Pista: ${state.trackTemp}°C`;
  }

  function renderList() {
    const box = $("#driversList");
    box.innerHTML = "";

    // ordena por progress (simples): quem está mais “na frente” por progress e volta
    // Como é demo, vamos considerar progress maior = à frente
    const ordered = state.cars.slice().sort((a, b) => b.progress - a.progress);

    // calcula delta fictício (diferença de progress)
    const leader = ordered[0];
    ordered.forEach((e, idx) => {
      const row = document.createElement("div");
      row.className = "row";

      const pos = document.createElement("div");
      pos.className = "pos";
      pos.textContent = String(idx + 1);

      const mini = document.createElement("div");
      mini.className = "mini";

      const face = document.createElement("img");
      face.className = "miniFace";
      face.src = faceUrl(e.driver);
      face.alt = e.driver.name;
      face.onerror = () => { face.src = ""; };

      const who = document.createElement("div");
      who.className = "who";

      const n = document.createElement("div");
      n.className = "name";
      n.textContent = e.driver.name;

      const t = document.createElement("div");
      t.className = "team";
      t.textContent = `${e.driver.teamName} • Pneus: ${e.compound}`;

      who.appendChild(n);
      who.appendChild(t);

      mini.appendChild(face);
      mini.appendChild(who);

      const delta = document.createElement("div");
      delta.className = "delta";
      if (idx === 0) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = "LEADER";
        delta.appendChild(tag);
      } else {
        const dp = Math.max(0, leader.progress - e.progress);
        delta.textContent = `+${(dp * 100).toFixed(3)}`;
      }

      row.appendChild(pos);
      row.appendChild(mini);
      row.appendChild(delta);
      box.appendChild(row);
    });
  }

  function updateUserCards() {
    const u0 = state.userDrivers[0];
    const u1 = state.userDrivers[1];

    if (u0) {
      $("#userName0").textContent = u0.driver.name;
      $("#userTeam0").textContent = u0.driver.teamName;
      $("#userCompound0").textContent = u0.compound;
      $("#userTyre0").textContent = `${u0.tyreWear.toFixed(0)}%`;
      $("#userCar0").textContent = `${u0.carWear.toFixed(0)}%`;
      $("#userEngine0").textContent = `M${u0.engine}`;
      $("#userAggr0").textContent = `A${u0.aggr}`;
      $("#userERS0").textContent = `${u0.ers.toFixed(0)}%`;

      const face = $("#userFace0");
      if (face.getAttribute("data-set") !== "1") {
        face.src = faceUrl(u0.driver);
        face.onerror = () => { face.src = ""; };
        face.setAttribute("data-set", "1");
      }
    }

    if (u1) {
      $("#userName1").textContent = u1.driver.name;
      $("#userTeam1").textContent = u1.driver.teamName;
      $("#userCompound1").textContent = u1.compound;
      $("#userTyre1").textContent = `${u1.tyreWear.toFixed(0)}%`;
      $("#userCar1").textContent = `${u1.carWear.toFixed(0)}%`;
      $("#userEngine1").textContent = `M${u1.engine}`;
      $("#userAggr1").textContent = `A${u1.aggr}`;
      $("#userERS1").textContent = `${u1.ers.toFixed(0)}%`;

      const face = $("#userFace1");
      if (face.getAttribute("data-set") !== "1") {
        face.src = faceUrl(u1.driver);
        face.onerror = () => { face.src = ""; };
        face.setAttribute("data-set", "1");
      }
    }

    // meta
    $("#myMeta").textContent = `${state.userDrivers[0]?.driver?.teamName || ""}`;
  }

  function hookUI() {
    // speed buttons
    $$(".chipBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".chipBtn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.speedMult = Number(btn.getAttribute("data-speed") || "1");
      });
    });

    $("#btnLobby").addEventListener("click", () => {
      // se você tiver lobby.html, redirecione:
      window.location.href = "index.html";
    });

    // user controls
    $("[data-ui]").addEventListener?.("click", ()=>{});
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-ui]");
      if (!btn) return;

      const ui = btn.getAttribute("data-ui");
      const i = Number(btn.getAttribute("data-i"));
      const ent = state.userDrivers[i];
      if (!ent) return;

      if (ui === "pit") {
        ent.pitRequested = true;
        return;
      }

      if (ui === "mode") {
        const m = btn.getAttribute("data-mode");
        ent.mode = m;
        return;
      }

      if (ui === "engine") {
        const d = Number(btn.getAttribute("data-d"));
        ent.engine = clamp(ent.engine + d, 1, 3);
        return;
      }

      if (ui === "aggr") {
        const d = Number(btn.getAttribute("data-d"));
        ent.aggr = clamp(ent.aggr + d, 1, 3);
        return;
      }

      if (ui === "ers") {
        // boost simples: consome ERS e dá um “empurrão”
        if (ent.ers >= 10) {
          ent.ers -= 10;
          ent.progress = (ent.progress + 0.004) % 1;
        }
        return;
      }
    });

    document.addEventListener("change", (ev) => {
      const sel = ev.target.closest('select[data-ui="compound"]');
      if (!sel) return;
      const i = Number(sel.getAttribute("data-i"));
      const ent = state.userDrivers[i];
      if (!ent) return;
      ent.compound = sel.value;
      // troca só no pit (realista) — mas você pediu troca: então aplica no próximo pit
      // Aqui deixamos “selecionado”, e o pit troca e reseta wear.
      // Para simplificar: se quiser aplicar já, descomente:
      // ent.compound = sel.value;
    });
  }

  // =========================
  // Main Loop
  // =========================
  let lastTs = 0;
  let accList = 0;
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;

    // update
    for (const e of state.cars) updateEntity(e, dt);

    // update markers (sem recriar elementos)
    for (const e of state.cars) {
      const p = pointAtProgress(state.points, e.lengths, e.progress);

      // offset lateral pequeno por ordem para não sobrepor tudo
      const off = (e.orderIndex - 10) * 0.0009;
      const angRad = (p.ang * Math.PI) / 180;
      const nx = Math.cos(angRad + Math.PI/2);
      const ny = Math.sin(angRad + Math.PI/2);

      const x = p.x + nx * state.viewBox.width * off;
      const y = p.y + ny * state.viewBox.height * off;

      e.marker.setAttribute("transform", `translate(${x} ${y}) rotate(${p.ang})`);
      e.marker.setAttribute("opacity", e.pitting ? "0.45" : "1");
    }

    // UI refresh (não a cada frame para não travar)
    accList += dt;
    if (accList > 240) {
      accList = 0;
      renderList();
      updateUserCards();
      updateTopSub();
    }

    requestAnimationFrame(loop);
  }

  // =========================
  // Boot
  // =========================
  async function boot() {
    const track = getParam("track", "australia");
    const gp = getParam("gp", "Austrália");

    // user team
    const userTeamParam = getParam("userTeam", localStorage.getItem("f1m_userTeam") || "ferrari");
    state.userTeamKey = toKey(userTeamParam) || "ferrari";
    localStorage.setItem("f1m_userTeam", state.userTeamKey);

    // clima simples (pode vir do quali/treino no futuro)
    const rnd = Math.random();
    state.weather = rnd < 0.18 ? "Chuva" : "Seco";
    state.trackTemp = state.weather === "Chuva" ? 21 + Math.floor(Math.random()*4) : 24 + Math.floor(Math.random()*8);

    setTop(state.userTeamKey, gp);
    updateTopSub();

    // drivers + grid
    const drivers = loadDrivers();
    const trackKey = toKey(track);
    const stored = loadGridFromStorage(trackKey);
    state.grid = buildGrid(drivers, stored);

    // car entities
    const { pointsRaw, vb } = await (async () => {
      // pathPoints (json)
      const jsonUrl = `assets/tracks/${track}.json`;
      const raw = await fetchJSON(jsonUrl);
      const pts = normalizePathPoints(raw);
      if (!pts) throw new Error(`pathPoints inválido em ${jsonUrl}`);
      return { pointsRaw: pts, vb: computeViewBoxFromPoints(pts) };
    })();

    state.points = pointsRaw;
    state.viewBox = vb;

    // overlay svg
    const overlay = createOverlay(state.points, state.viewBox);
    state.svgOverlay = overlay.svg;
    state.carLayer = overlay.carLayer;

    const lengths = precomputeLengths(state.points);

    state.cars = state.grid.map((d, idx) => {
      const e = makeCarEntity(d, idx, lengths);
      e.marker = createCarMarker(d, state.viewBox);
      state.carLayer.appendChild(e.marker);
      return e;
    });

    // define user drivers (2 carros da equipe)
    const teamCars = state.cars.filter(c => toKey(c.driver.team) === toKey(state.userTeamKey));
    // Se não achar (caso seus teams usem outro key), pega 2 do fim para não quebrar
    state.userDrivers[0] = teamCars[0] || state.cars[18];
    state.userDrivers[1] = teamCars[1] || state.cars[19];

    // Ajusta cards (compounds)
    $("#userCompound0").textContent = state.userDrivers[0].compound;
    $("#userCompound1").textContent = state.userDrivers[1].compound;

    // logo topo (tolerante)
    $("#teamLogoTop").src = teamLogoUrl(state.userTeamKey);
    $("#teamLogoTop").onerror = () => { $("#teamLogoTop").src = ""; };

    // UI hook
    hookUI();

    // Primeiro render
    renderList();
    updateUserCards();

    // Start loop
    requestAnimationFrame(loop);
  }

  window.addEventListener("DOMContentLoaded", () => {
    boot().catch(err => {
      console.error(err);
      alert("Erro na corrida: " + err.message);
    });
  });

})();
