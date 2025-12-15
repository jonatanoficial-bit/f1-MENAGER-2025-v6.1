/* =========================================================
   F1 MANAGER 2025 — RACE (BLINDADO)
   - NÃO usa assets/tracks/*.json (seu repo só tem SVG)
   - Gera pathPoints a partir do SVG (sampling)
   - 20 pilotos (grid completo)
   - PIT funcional (entra, para, troca pneu, sai)
   - Mínimo 10 voltas e pódio ao final
   - Faces/logos com fallback (não quebra se faltar imagem)
   - Desenha UMA pista (sem duplicar camada)
   ========================================================= */

(() => {
  // ---------- Utils ----------
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function normTeamKey(team) {
    return (team || "")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");
  }

  function initials(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "??";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function safeImg(src) {
    // Sempre relativo ao mesmo nível do race.html
    // Não coloca "/" no começo para funcionar em GitHub Pages e Vercel do mesmo jeito.
    return src;
  }

  // ---------- Dados (grid padrão) ----------
  // Você pode trocar nomes/equipes depois, mas isso garante 20 sempre.
  const DEFAULT_GRID = [
    { id:"leclerc",   name:"Charles Leclerc", team:"Ferrari" },
    { id:"sainz",     name:"Carlos Sainz",    team:"Ferrari" },
    { id:"norris",    name:"Lando Norris",    team:"McLaren" },
    { id:"piastri",   name:"Oscar Piastri",   team:"McLaren" },
    { id:"hamilton",  name:"Lewis Hamilton",  team:"Mercedes" },
    { id:"russell",   name:"George Russell",  team:"Mercedes" },
    { id:"verstappen",name:"Max Verstappen",  team:"Red Bull" },
    { id:"perez",     name:"Sergio Perez",    team:"Red Bull Racing" },
    { id:"alonso",    name:"Fernando Alonso", team:"Aston Martin" },
    { id:"stroll",    name:"Lance Stroll",    team:"Aston Martin" },
    { id:"gasly",     name:"Pierre Gasly",    team:"Alpine" },
    { id:"ocon",      name:"Esteban Ocon",    team:"Alpine" },
    { id:"albon",     name:"Alex Albon",      team:"Williams Racing" },
    { id:"sargeant",  name:"Logan Sargeant",  team:"Williams Racing" },
    { id:"hulkenberg",name:"Nico Hülkenberg", team:"Haas" },
    { id:"magnussen", name:"Kevin Magnussen", team:"Haas" },
    { id:"tsunoda",   name:"Yuki Tsunoda",    team:"RB" },
    { id:"lawson",    name:"Liam Lawson",     team:"RB" },
    { id:"zhou",      name:"Guanyu Zhou",     team:"Sauber" },
    { id:"bortoleto", name:"Gabriel Bortoleto",team:"Sauber" },
  ];

  // Cores por equipe (bolinhas e barras)
  const TEAM_COLORS = {
    ferrari:   "#d90429",
    mclaren:   "#ff7a00",
    mercedes:  "#00d2be",
    red_bull:  "#1e41ff",
    red_bull_racing: "#1e41ff",
    aston_martin: "#006f62",
    alpine:    "#ff4fd8",
    williams_racing: "#00a3ff",
    haas:      "#b0b0b0",
    rb:        "#4b8bff",
    sauber:    "#00ff8a",
  };

  function teamColor(team) {
    const k = normTeamKey(team);
    return TEAM_COLORS[k] || "#ffffff";
  }

  // ---------- DOM ----------
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  const elSession = document.getElementById("sessionList");
  const elYourDrivers = document.getElementById("yourDrivers");

  const elGpFlag = document.getElementById("gpFlag");
  const elGpName = document.getElementById("gpName");
  const elGpMeta = document.getElementById("gpMeta");

  const elHudLap = document.getElementById("hudLap");
  const elHudState = document.getElementById("hudState");
  const elHudWeather = document.getElementById("hudWeather");
  const elHudTrackTemp = document.getElementById("hudTrackTemp");

  const elModal = document.getElementById("podiumModal");
  const elPodiumBody = document.getElementById("podiumBody");
  const elPodiumTitle = document.getElementById("podiumTitle");
  const elPodiumClose = document.getElementById("podiumClose");

  // ---------- Config corrida ----------
  const trackKey = (qs("track") || "australia").toLowerCase();
  const gpName = qs("gp") || "GP";
  const userTeam = (qs("userTeam") || "ferrari").toLowerCase();

  // mínimo 10 voltas (pedido)
  const lapsTotal = Math.max(10, Number(qs("laps") || 10) || 10);

  // clima simples (pode evoluir)
  const weather = (qs("weather") || "Seco");
  const trackTemp = Number(qs("trackTemp") || 21) || 21;

  elGpName.textContent = gpName;
  elGpMeta.textContent = `Volta 1 · Clima: ${weather} · Pista: ${trackTemp}°C`;
  elHudWeather.textContent = weather;
  elHudTrackTemp.textContent = `${trackTemp}°C`;

  // Flag: tenta achar algo, senão deixa em branco sem quebrar
  // Ajuste se você tiver flags por gp. Aqui é só robustez.
  elGpFlag.src = safeImg("assets/flags/australia.png");
  elGpFlag.onerror = () => { elGpFlag.src = ""; elGpFlag.style.background = "rgba(255,255,255,0.08)"; };

  // Lobby
  document.getElementById("btnLobby").addEventListener("click", () => {
    // Se seu lobby é index.html, mantenha assim; ajuste se for outro.
    location.href = "index.html";
  });

  // Speed
  let timeScale = 1;
  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      timeScale = Number(btn.dataset.speed) || 1;
    });
  });

  // ---------- Estado de pista (pathPoints) ----------
  let pathPoints = [];     // [{x,y}]
  let bounds = { minX:0, minY:0, maxX:1, maxY:1 };

  // ---------- Estado corrida ----------
  let lap = 1;
  let raceState = "Correndo"; // "Correndo" | "Finalizada"
  elHudLap.textContent = `${lap}/${lapsTotal}`;
  elHudState.textContent = raceState;

  // Carros
  // progress: 0..1 (posição na pista)
  // speed: base + variação
  // tyreWear: 0..100 (desgaste)
  // engineWear: 0..100
  // ers: 0..100
  // pit: { requested, inPit, timer }
  const cars = [];

  // Seus pilotos: pega 2 do grid que pertencem ao userTeam se existir;
  // se não existir, pega os 2 primeiros e força team = userTeam “visual”.
  function pickYourDrivers(grid) {
    const normUser = normTeamKey(userTeam);
    const same = grid.filter(d => normTeamKey(d.team) === normUser);
    if (same.length >= 2) return [same[0], same[1]];
    // fallback: 2 primeiros
    const a = { ...grid[0], team: userTeam };
    const b = { ...grid[1], team: userTeam };
    return [a, b];
  }

  const grid = DEFAULT_GRID.slice(0, 20);
  const your2 = pickYourDrivers(grid);

  // Inicializa carros
  grid.forEach((d, i) => {
    cars.push({
      idx: i,
      driverId: d.id,
      name: d.name,
      team: d.team,
      color: teamColor(d.team),
      progress: (i / grid.length) % 1,
      speed: 0.040 + Math.random() * 0.010, // avanço por segundo (antes de timeScale)
      tyre: weather.toLowerCase().includes("chuva") ? "W" : "M",
      tyreWear: 0,
      engineWear: 0,
      ers: 50,
      aggression: 2,
      mode: "Normal", // "Economizar" | "Normal" | "Ataque"
      pit: { requested:false, inPit:false, timer:0 },
      time: 0, // tempo acumulado (ranking)
      finished: false,
    });
  });

  // ---------- Render UI: grid e seus pilotos ----------
  function buildSessionList() {
    elSession.innerHTML = "";
    const sorted = [...cars].sort((a,b) => a.time - b.time);
    sorted.forEach((c, pos) => {
      const row = document.createElement("div");
      row.className = "row";

      const posBox = document.createElement("div");
      posBox.className = "pos";
      posBox.style.setProperty("--bar", c.color);
      posBox.style.borderColor = "rgba(255,255,255,0.10)";
      posBox.style.background = "rgba(255,255,255,0.03)";
      posBox.style.position = "relative";
      posBox.style.overflow = "hidden";

      const bar = document.createElement("div");
      bar.style.position = "absolute";
      bar.style.left = "0";
      bar.style.top = "0";
      bar.style.bottom = "0";
      bar.style.width = "5px";
      bar.style.background = c.color;
      bar.style.opacity = "0.95";
      posBox.appendChild(bar);

      const posTxt = document.createElement("div");
      posTxt.style.position = "relative";
      posTxt.style.zIndex = "1";
      posTxt.textContent = (pos + 1);
      posBox.appendChild(posTxt);

      const who = document.createElement("div");
      who.className = "who";
      const n = document.createElement("div");
      n.className = "n";
      n.textContent = c.name;
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = c.team;
      who.appendChild(n);
      who.appendChild(t);

      const gap = document.createElement("div");
      gap.className = "gap";
      if (pos === 0) {
        gap.innerHTML = `LEADER<small>${c.tyre} • Voltas: ${lap - 1}</small>`;
      } else {
        const lead = sorted[0];
        const delta = (c.time - lead.time);
        gap.innerHTML = `+${delta.toFixed(3)}<small>${c.tyre} • Voltas: ${lap - 1}</small>`;
      }

      row.appendChild(posBox);
      row.appendChild(who);
      row.appendChild(gap);
      elSession.appendChild(row);
    });
  }

  function faceSrc(driverId) {
    // Ajuste aqui se seus arquivos tiverem outro padrão (ex.: .jpg)
    // Mas isso já resolve 90%: não pisca, e cai em fallback sem quebrar.
    return safeImg(`assets/faces/${driverId}.png`);
  }

  function logoSrc(team) {
    const key = normTeamKey(team);
    return safeImg(`assets/logos/${key}.png`);
  }

  function buildYourDrivers() {
    elYourDrivers.innerHTML = "";

    // Encontra os carros correspondentes aos dois pilotos escolhidos
    const a = cars.find(x => x.driverId === your2[0].id) || cars[0];
    const b = cars.find(x => x.driverId === your2[1].id) || cars[1];
    const yours = [a, b];

    yours.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.setProperty("--bar", c.color);

      // barra colorida lateral
      card.style.position = "relative";
      const bar = document.createElement("div");
      bar.style.position = "absolute";
      bar.style.left = "0";
      bar.style.top = "0";
      bar.style.bottom = "0";
      bar.style.width = "4px";
      bar.style.background = c.color;
      bar.style.opacity = "0.95";
      card.appendChild(bar);

      const header = document.createElement("div");
      header.className = "card-h";

      const avatar = document.createElement("div");
      avatar.className = "avatar";

      const img = document.createElement("img");
      img.alt = c.name;
      img.src = faceSrc(c.driverId);
      img.onerror = () => {
        // Fallback: iniciais (sem “piscar”)
        avatar.innerHTML = "";
        avatar.textContent = initials(c.name);
      };
      avatar.appendChild(img);

      const nameBox = document.createElement("div");
      nameBox.className = "card-name";

      const n = document.createElement("div");
      n.className = "n";
      n.textContent = c.name;

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `${c.team} • ${c.mode}`;

      nameBox.appendChild(n);
      nameBox.appendChild(t);

      header.appendChild(avatar);
      header.appendChild(nameBox);

      const stats = document.createElement("div");
      stats.className = "stats";
      const pTyre = document.createElement("div"); pTyre.className = "pill"; pTyre.textContent = `Pneu: ${c.tyre}`;
      const pCar = document.createElement("div");  pCar.className = "pill";  pCar.textContent = `Carro: ${Math.max(0, 100 - c.engineWear).toFixed(0)}%`;
      const pWear = document.createElement("div"); pWear.className = "pill"; pWear.textContent = `Pneu: ${Math.max(0, 100 - c.tyreWear).toFixed(0)}%`;
      const pErs = document.createElement("div");  pErs.className = "pill";  pErs.textContent = `ERS: ${c.ers.toFixed(0)}%`;
      stats.appendChild(pTyre); stats.appendChild(pCar); stats.appendChild(pWear); stats.appendChild(pErs);

      // Controles
      const pitRow = document.createElement("div");
      pitRow.style.display = "grid";
      pitRow.style.gridTemplateColumns = "110px 1fr";
      pitRow.style.gap = "10px";
      pitRow.style.marginBottom = "10px";

      const btnPit = document.createElement("button");
      btnPit.className = "btn red";
      btnPit.textContent = "PIT";
      btnPit.addEventListener("click", () => {
        c.pit.requested = true;
      });

      const sel = document.createElement("select");
      sel.className = "select";
      sel.innerHTML = `
        <option value="M">M (Medium)</option>
        <option value="H">H (Hard)</option>
        <option value="S">S (Soft)</option>
        <option value="W">W (Wet)</option>
        <option value="I">I (Inter)</option>
      `;
      sel.value = c.tyre;
      sel.addEventListener("change", () => {
        c.tyre = sel.value;
      });

      pitRow.appendChild(btnPit);
      pitRow.appendChild(sel);

      const controls = document.createElement("div");
      controls.className = "controls";

      const btnEco = document.createElement("button");
      btnEco.className = "btn";
      btnEco.textContent = "ECONOMIZAR";
      btnEco.addEventListener("click", () => c.mode = "Economizar");

      const btnAtk = document.createElement("button");
      btnAtk.className = "btn green";
      btnAtk.textContent = "ATAQUE";
      btnAtk.addEventListener("click", () => c.mode = "Ataque");

      const btnMotM = document.createElement("button");
      btnMotM.className = "btn";
      btnMotM.textContent = "MOTOR -";
      btnMotM.addEventListener("click", () => c.speed = clamp(c.speed - 0.002, 0.020, 0.070));

      const btnMotP = document.createElement("button");
      btnMotP.className = "btn";
      btnMotP.textContent = "MOTOR +";
      btnMotP.addEventListener("click", () => c.speed = clamp(c.speed + 0.002, 0.020, 0.070));

      const btnAggM = document.createElement("button");
      btnAggM.className = "btn";
      btnAggM.textContent = "AGRESS -";
      btnAggM.addEventListener("click", () => c.aggression = clamp(c.aggression - 1, 1, 5));

      const btnAggP = document.createElement("button");
      btnAggP.className = "btn";
      btnAggP.textContent = "AGRESS +";
      btnAggP.addEventListener("click", () => c.aggression = clamp(c.aggression + 1, 1, 5));

      const btnErs = document.createElement("button");
      btnErs.className = "btn";
      btnErs.style.gridColumn = "1 / -1";
      btnErs.textContent = "ERS BOOST";
      btnErs.addEventListener("click", () => {
        // Boost consome ERS e aumenta speed por um tempo curto
        if (c.ers < 10) return;
        c.ers -= 10;
        c.speed = clamp(c.speed + 0.006, 0.020, 0.080);
        setTimeout(() => { c.speed = clamp(c.speed - 0.006, 0.020, 0.080); }, 1200);
      });

      controls.appendChild(btnEco);
      controls.appendChild(btnAtk);
      controls.appendChild(btnMotM);
      controls.appendChild(btnMotP);
      controls.appendChild(btnAggM);
      controls.appendChild(btnAggP);
      controls.appendChild(btnErs);

      card.appendChild(header);
      card.appendChild(stats);
      card.appendChild(pitRow);
      card.appendChild(controls);

      elYourDrivers.appendChild(card);

      // atualiza stats periodicamente
      card._update = () => {
        pTyre.textContent = `Pneu: ${c.tyre}`;
        pCar.textContent  = `Carro: ${Math.max(0, 100 - c.engineWear).toFixed(0)}%`;
        pWear.textContent = `Pneu: ${Math.max(0, 100 - c.tyreWear).toFixed(0)}%`;
        pErs.textContent  = `ERS: ${c.ers.toFixed(0)}%`;
        t.textContent = `${c.team} • ${c.mode}`;
      };
    });
  }

  function tickYourCards() {
    [...elYourDrivers.children].forEach(card => {
      if (typeof card._update === "function") card._update();
    });
  }

  // ---------- Carrega SVG da pista e amostra pathPoints ----------
  async function loadTrackSVG(track) {
    const url = safeImg(`assets/tracks/${track}.svg`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${url} (HTTP ${res.status})`);
    const svgText = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("SVG inválido (sem <svg>)");

    // Pega o path principal (o primeiro path encontrado)
    // Se seu SVG tiver múltiplos paths, você pode ajustar para escolher pelo id.
    const path = doc.querySelector("path");
    if (!path) throw new Error("SVG inválido (sem <path>)");

    // Cria SVG em memória para usar getTotalLength/getPointAtLength
    const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    temp.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    temp.style.position = "absolute";
    temp.style.left = "-99999px";
    temp.style.top = "-99999px";
    temp.style.width = "0";
    temp.style.height = "0";

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path.getAttribute("d"));
    temp.appendChild(p);
    document.body.appendChild(temp);

    const len = p.getTotalLength();
    const samples = 420; // suficiente para ficar suave
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const pt = p.getPointAtLength((i / samples) * len);
      pts.push({ x: pt.x, y: pt.y });
    }

    // bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(pt => {
      minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
    });

    document.body.removeChild(temp);

    return { pts, bounds: { minX, minY, maxX, maxY } };
  }

  // ---------- Canvas sizing ----------
  function resizeCanvas() {
    // usa o tamanho real do elemento (CSS)
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  // ---------- Projeção: coordenadas do SVG -> canvas ----------
  function project(pt) {
    const pad = 30; // padding interno
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;

    // fit mantendo proporção
    const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = (w - bw * scale) / 2;
    const oy = (h - bh * scale) / 2;

    return {
      x: ox + (pt.x - bounds.minX) * scale,
      y: oy + (pt.y - bounds.minY) * scale,
      scale
    };
  }

  function pointAtProgress(t) {
    if (!pathPoints.length) return { x: 0, y: 0, scale: 1 };
    const idx = Math.floor(t * (pathPoints.length - 1));
    const idx2 = (idx + 1) % pathPoints.length;
    const f = (t * (pathPoints.length - 1)) - idx;
    const a = pathPoints[idx];
    const b = pathPoints[idx2];
    const p = { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
    return project(p);
  }

  // ---------- Desenho ----------
  function draw() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    // limpa
    ctx.clearRect(0, 0, w, h);

    // “estrelas” leves (só estética; pode remover)
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 32; i++) {
      const x = (i * 97) % w;
      const y = (i * 173) % h;
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (!pathPoints.length) return;

    // pista (APENAS UMA)
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // borda externa (sombra)
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    pathPoints.forEach((pt, i) => {
      const pr = project(pt);
      if (i === 0) ctx.moveTo(pr.x, pr.y);
      else ctx.lineTo(pr.x, pr.y);
    });
    ctx.closePath();
    ctx.stroke();

    // asfalto (cinza)
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    pathPoints.forEach((pt, i) => {
      const pr = project(pt);
      if (i === 0) ctx.moveTo(pr.x, pr.y);
      else ctx.lineTo(pr.x, pr.y);
    });
    ctx.closePath();
    ctx.stroke();

    // linha “oficial” clara por cima
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    pathPoints.forEach((pt, i) => {
      const pr = project(pt);
      if (i === 0) ctx.moveTo(pr.x, pr.y);
      else ctx.lineTo(pr.x, pr.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // carros (bolinhas na cor da equipe)
    // desenha em ordem de “posição atual”
    const drawCars = [...cars].sort((a,b) => a.time - b.time);
    drawCars.forEach(c => {
      const pos = pointAtProgress(c.progress);
      const r = 5.5;

      // glow
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // núcleo
      ctx.save();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // contorno
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // linha de chegada (simples)
    const finish = pointAtProgress(0.02);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(finish.x - 10, finish.y - 2, 20, 4);
    ctx.restore();
  }

  // ---------- Simulação ----------
  let lastTs = performance.now();

  function update(dt) {
    if (raceState !== "Correndo") return;

    // dt em segundos
    const k = dt * timeScale;

    // avanço de cada carro
    cars.forEach(c => {
      if (c.finished) return;

      // PIT logic
      if (c.pit.inPit) {
        c.pit.timer -= k;
        c.time += k * 1.4; // tempo passa no pit
        if (c.pit.timer <= 0) {
          c.pit.inPit = false;
          c.pit.requested = false;
          // “troca de pneus” efetiva: zera desgaste
          c.tyreWear = 0;
        }
        return;
      }

      // desgaste
      const wearRate = (c.mode === "Ataque" ? 1.8 : (c.mode === "Economizar" ? 0.9 : 1.2));
      c.tyreWear = clamp(c.tyreWear + k * wearRate * 0.8, 0, 100);
      c.engineWear = clamp(c.engineWear + k * wearRate * 0.35, 0, 100);

      // ERS regen/consumo
      c.ers = clamp(c.ers + (c.mode === "Economizar" ? k * 2.2 : k * 0.8), 0, 100);

      // performance afetada por desgaste
      const tyrePenalty = (c.tyreWear / 100) * 0.018;
      const engPenalty  = (c.engineWear / 100) * 0.010;
      const aggBonus = (c.aggression - 2) * 0.002;

      let v = c.speed - tyrePenalty - engPenalty + aggBonus;
      if (c.mode === "Ataque") v += 0.004;
      if (c.mode === "Economizar") v -= 0.003;

      v = clamp(v, 0.015, 0.080);

      // se pediu pit, entra quando passar por “janela” perto da linha (progress ~ 0)
      if (c.pit.requested && (c.progress < 0.03 || c.progress > 0.97)) {
        c.pit.inPit = true;
        c.pit.timer = 6.0 + Math.random() * 2.0; // 6–8s
        return;
      }

      // avança na pista
      const prev = c.progress;
      c.progress = (c.progress + v * k) % 1;

      // completou volta (cruzou 0)
      if (prev > 0.96 && c.progress < 0.04) {
        // incrementa “tempo” como se completou um setor/volta
        c.time += 65 + (c.tyreWear * 0.10) + (c.engineWear * 0.08) + (Math.random() * 0.8);
        c._laps = (c._laps || 0) + 1;

        // terminou corrida
        if (c._laps >= lapsTotal) {
          c.finished = true;
        }
      } else {
        // tempo correndo “em tempo real”
        c.time += k * 0.08;
      }
    });

    // volta global (baseada no líder)
    const leader = [...cars].sort((a,b)=>a.time-b.time)[0];
    const leaderLaps = leader? (leader._laps || 0) : 0;
    lap = clamp(leaderLaps + 1, 1, lapsTotal);
    elHudLap.textContent = `${lap}/${lapsTotal}`;
    elGpMeta.textContent = `Volta ${lap} · Clima: ${weather} · Pista: ${trackTemp}°C`;

    // fim da corrida quando todos finished
    const done = cars.every(c => c.finished);
    if (done) {
      raceState = "Finalizada";
      elHudState.textContent = "Finalizada";
      showPodium();
    } else {
      elHudState.textContent = "Correndo";
    }
  }

  // ---------- Pódio ----------
  function showPodium() {
    const sorted = [...cars].sort((a,b)=>a.time-b.time);
    const top3 = sorted.slice(0,3);

    elPodiumTitle.textContent = `PÓDIO — ${gpName}`;
    elPodiumBody.innerHTML = "";

    const labels = ["1º", "2º", "3º"];
    top3.forEach((c, i) => {
      const box = document.createElement("div");
      box.className = "pod";

      const p = document.createElement("div");
      p.className = "p";
      p.textContent = labels[i];

      const imgBox = document.createElement("div");
      imgBox.className = "img";
      imgBox.style.borderColor = "rgba(255,255,255,0.12)";
      imgBox.style.boxShadow = `0 0 0 2px ${c.color}33 inset`;

      const img = document.createElement("img");
      img.alt = c.name;
      img.src = faceSrc(c.driverId);
      img.onerror = () => { imgBox.textContent = initials(c.name); };

      imgBox.appendChild(img);

      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = c.name;

      const tm = document.createElement("div");
      tm.className = "tm";
      tm.textContent = `${c.team}`;

      box.appendChild(p);
      box.appendChild(imgBox);
      box.appendChild(nm);
      box.appendChild(tm);

      elPodiumBody.appendChild(box);
    });

    elModal.classList.add("show");
    elModal.setAttribute("aria-hidden", "false");
  }

  elPodiumClose.addEventListener("click", () => {
    elModal.classList.remove("show");
    elModal.setAttribute("aria-hidden", "true");
  });

  // ---------- Loop ----------
  function loop(ts) {
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    update(dt);
    draw();
    buildSessionList();
    tickYourCards();

    requestAnimationFrame(loop);
  }

  // ---------- Boot ----------
  async function boot() {
    try {
      resizeCanvas();

      // carrega pista por SVG
      const track = await loadTrackSVG(trackKey);
      pathPoints = track.pts;
      bounds = track.bounds;

      buildYourDrivers();
      buildSessionList();

      requestAnimationFrame(loop);
    } catch (err) {
      alert(`Erro na corrida: ${err.message}`);
      console.error(err);
    }
  }

  boot();
})();
