(() => {
  /* =========================================================
     RACE — usa base de TL/Quali por localStorage (setup + staff)
     Protege contra CSS e evita regressão.
     ========================================================= */

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
    const p = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "??";
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function safeImg(src) { return src; }

  // ====== Tentativa “inteligente” de ler o que TL/Quali já salvaram ======
  // Sem você precisar “me dizer” a chave exata agora.
  function tryLoadAny(keys) {
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (!v) continue;
        const obj = JSON.parse(v);
        if (obj && typeof obj === "object") return obj;
      } catch {}
    }
    return null;
  }

  // Estado de carreira/temporada (se existir)
  const CAREER = tryLoadAny([
    "F1M_CAREER", "F1M_SAVE", "F1_MANAGER_SAVE", "careerSave", "saveGame", "f1_manager_save"
  ]) || {};

  // Setup (se existir)
  const SETUP = tryLoadAny([
    "F1M_SETUP", "carSetup", "setupSave", "F1_SETUP", "raceSetup"
  ]) || (CAREER.setup || {});

  // Staff (se existir)
  const STAFF = tryLoadAny([
    "F1M_STAFF", "staffSave", "teamStaff", "F1_STAFF"
  ]) || (CAREER.staff || {});

  // Resultados Quali (se existir)
  const QUALI = tryLoadAny([
    "F1M_QUALI", "qualiResult", "qualifyingSave"
  ]) || (CAREER.quali || null);

  // ====== Parâmetros de corrida ======
  const trackKey = (qs("track") || "australia").toLowerCase();
  const gpName = qs("gp") || "GP";
  const userTeam = (qs("userTeam") || "ferrari").toLowerCase();

  const weather = (qs("weather") || (CAREER.weather || "Seco"));
  const trackTemp = Number(qs("trackTemp") || (CAREER.trackTemp || 21)) || 21;
  const lapsTotal = Math.max(10, Number(qs("laps") || (CAREER.laps || 10)) || 10);

  // ====== DOM ======
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

  // UI header
  elGpName.textContent = gpName;
  elHudWeather.textContent = weather;
  elHudTrackTemp.textContent = `${trackTemp}°C`;

  // Flag: não quebra se não existir
  elGpFlag.src = safeImg("assets/flags/australia.png");
  elGpFlag.onerror = () => { elGpFlag.src = ""; elGpFlag.style.background = "rgba(255,255,255,0.10)"; };

  // Lobby
  document.getElementById("btnLobby").addEventListener("click", () => {
    location.href = "index.html";
  });

  // Speed
  let timeScale = 1;
  document.querySelectorAll(".sbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sbtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      timeScale = Number(btn.dataset.speed) || 1;
    });
  });

  // ====== Cores por equipe ======
  const TEAM_COLORS = {
    ferrari: "#d90429",
    mclaren: "#ff7a00",
    mercedes: "#00d2be",
    red_bull: "#1e41ff",
    red_bull_racing: "#1e41ff",
    aston_martin: "#006f62",
    alpine: "#ff4fd8",
    williams_racing: "#00a3ff",
    haas: "#b0b0b0",
    rb: "#4b8bff",
    sauber: "#00ff8a",
  };
  function teamColor(team) {
    const k = normTeamKey(team);
    return TEAM_COLORS[k] || "#ffffff";
  }

  // ====== GRID BASE (fallback) ======
  // Se Quali já salvou ordem, usamos. Se não, usamos default.
  const DEFAULT_GRID = [
    { id:"leclerc", name:"Charles Leclerc", team:"Ferrari" },
    { id:"sainz", name:"Carlos Sainz", team:"Ferrari" },
    { id:"norris", name:"Lando Norris", team:"McLaren" },
    { id:"piastri", name:"Oscar Piastri", team:"McLaren" },
    { id:"hamilton", name:"Lewis Hamilton", team:"Mercedes" },
    { id:"russell", name:"George Russell", team:"Mercedes" },
    { id:"verstappen", name:"Max Verstappen", team:"Red Bull" },
    { id:"perez", name:"Sergio Perez", team:"Red Bull Racing" },
    { id:"alonso", name:"Fernando Alonso", team:"Aston Martin" },
    { id:"stroll", name:"Lance Stroll", team:"Aston Martin" },
    { id:"gasly", name:"Pierre Gasly", team:"Alpine" },
    { id:"ocon", name:"Esteban Ocon", team:"Alpine" },
    { id:"albon", name:"Alex Albon", team:"Williams Racing" },
    { id:"sargeant", name:"Logan Sargeant", team:"Williams Racing" },
    { id:"hulkenberg", name:"Nico Hülkenberg", team:"Haas" },
    { id:"magnussen", name:"Kevin Magnussen", team:"Haas" },
    { id:"tsunoda", name:"Yuki Tsunoda", team:"RB" },
    { id:"lawson", name:"Liam Lawson", team:"RB" },
    { id:"zhou", name:"Guanyu Zhou", team:"Sauber" },
    { id:"bortoleto", name:"Gabriel Bortoleto", team:"Sauber" },
  ];

  function getGrid() {
    // Se QUALI trouxe grid como array de pilotos, usamos.
    if (Array.isArray(QUALI?.grid) && QUALI.grid.length >= 10) {
      return QUALI.grid.slice(0, 20).map(p => ({
        id: p.id || p.driverId || p.code || normTeamKey(p.name || "driver"),
        name: p.name || p.driverName || "Piloto",
        team: p.team || p.teamName || "Equipe"
      }));
    }
    // Se CAREER trouxe drivers
    if (Array.isArray(CAREER?.drivers) && CAREER.drivers.length >= 10) {
      return CAREER.drivers.slice(0, 20).map(p => ({
        id: p.id || p.driverId || p.code || normTeamKey(p.name || "driver"),
        name: p.name || "Piloto",
        team: p.team || "Equipe"
      }));
    }
    return DEFAULT_GRID.slice(0, 20);
  }

  const grid = getGrid();

  // ====== Setup + Staff -> bônus reais ======
  // Setup esperado (se existir): { aero, suspension, engine, balance } ou similar.
  // Staff esperado (se existir): { engineers, mechanics, strategist } ou similar.
  function num(v, def=0) { v = Number(v); return Number.isFinite(v) ? v : def; }

  function computeBonuses(setup, staff) {
    // NORMALIZA para 0..100 quando possível
    const aero = num(setup?.aero, num(setup?.asa, 50));
    const susp = num(setup?.suspension, num(setup?.suspensao, 50));
    const eng  = num(setup?.engine, num(setup?.motor, 50));
    const bal  = num(setup?.balance, num(setup?.equilibrio, 50));

    const engineers = num(staff?.engineers, num(staff?.engenheiros, 50));
    const mechanics = num(staff?.mechanics, num(staff?.mecanicos, 50));
    const strategist= num(staff?.strategist, num(staff?.estrategista, 50));

    // Pace: setup alinhado melhora ritmo; staff melhora consistência
    const setupQuality = (aero + susp + eng + bal) / 4; // 0..100
    const staffQuality = (engineers + mechanics + strategist) / 3; // 0..100

    // Ajustes (valores conservadores para não “quebrar” a simulação)
    const paceBonus = ((setupQuality - 50) / 50) * 0.010 + ((staffQuality - 50) / 50) * 0.006; // -..+
    const tyreWearMult = clamp(1.00 - ((engineers - 50) / 50) * 0.10 - ((setupQuality - 50)/50)*0.06, 0.75, 1.25);
    const pitTimeMult  = clamp(1.00 - ((mechanics - 50) / 50) * 0.18, 0.70, 1.30);
    const strategyBonus= clamp(1.00 + ((strategist - 50) / 50) * 0.08, 0.85, 1.15);

    return { paceBonus, tyreWearMult, pitTimeMult, strategyBonus };
  }

  const BON = computeBonuses(SETUP, STAFF);

  // ====== Assets: faces e logos ======
  function faceSrc(driverId) { return safeImg(`assets/faces/${driverId}.png`); }
  function logoSrc(team) { return safeImg(`assets/logos/${normTeamKey(team)}.png`); }

  // ====== Track via SVG sampling ======
  let pathPoints = [];
  let bounds = { minX:0, minY:0, maxX:1, maxY:1 };

  async function loadTrackSVG(track) {
    const url = safeImg(`assets/tracks/${track}.svg`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${url} (HTTP ${res.status})`);
    const svgText = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const path = doc.querySelector("path");
    if (!path) throw new Error("SVG inválido (sem <path>)");

    const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
    const samples = 520;
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const pt = p.getPointAtLength((i / samples) * len);
      pts.push({ x: pt.x, y: pt.y });
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(pt => {
      minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
    });

    document.body.removeChild(temp);
    return { pts, bounds: { minX, minY, maxX, maxY } };
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);

  function project(pt) {
    const pad = 30;
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;

    const scale = Math.min((w - pad*2)/bw, (h - pad*2)/bh);
    const ox = (w - bw*scale)/2;
    const oy = (h - bh*scale)/2;

    return { x: ox + (pt.x - bounds.minX)*scale, y: oy + (pt.y - bounds.minY)*scale };
  }

  function pointAtProgress(t) {
    const n = pathPoints.length;
    const u = (t % 1 + 1) % 1;
    const x = u * (n - 1);
    const i = Math.floor(x);
    const j = (i + 1) % n;
    const f = x - i;
    const a = pathPoints[i], b = pathPoints[j];
    return project({ x: lerp(a.x,b.x,f), y: lerp(a.y,b.y,f) });
  }

  // ====== Cars (simulação) ======
  const cars = grid.map((d, i) => ({
    idx: i,
    driverId: d.id,
    name: d.name,
    team: d.team,
    color: teamColor(d.team),
    progress: (i / grid.length) % 1,
    baseSpeed: 0.040 + Math.random()*0.010,
    speedTrim: 0,
    tyre: (String(weather).toLowerCase().includes("chuva") ? "W" : "M"),
    tyreWear: 0,
    engineWear: 0,
    ers: 50,
    aggression: 2,
    mode: "Normal",
    pit: { requested:false, inPit:false, timer:0 },
    time: 0,
    laps: 0,
    finished: false
  }));

  // Se seu time de usuário for passado, tenta escolher 2 pilotos dele; se não, pega 2 primeiros
  function pickYour2() {
    const key = normTeamKey(userTeam);
    const same = cars.filter(c => normTeamKey(c.team) === key);
    if (same.length >= 2) return [same[0], same[1]];
    return [cars[0], cars[1]];
  }
  const your2 = pickYour2();

  // ====== UI Builders ======
  function buildSessionList() {
    elSession.innerHTML = "";
    const sorted = [...cars].sort((a,b) => a.time - b.time);

    sorted.forEach((c, pos) => {
      const row = document.createElement("div");
      row.className = "row";

      const posBox = document.createElement("div");
      posBox.className = "pos";
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.background = c.color;
      posBox.appendChild(bar);
      const txt = document.createElement("div");
      txt.style.position = "relative";
      txt.style.zIndex = "1";
      txt.textContent = (pos + 1);
      posBox.appendChild(txt);

      const who = document.createElement("div");
      who.className = "who";
      const n = document.createElement("div");
      n.className = "n";
      n.textContent = c.name;
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = c.team;
      who.appendChild(n); who.appendChild(t);

      const gap = document.createElement("div");
      gap.className = "gap";
      if (pos === 0) gap.innerHTML = `LEADER<small>${c.tyre} • Voltas: ${c.laps}</small>`;
      else gap.innerHTML = `+${(c.time - sorted[0].time).toFixed(3)}<small>${c.tyre} • Voltas: ${c.laps}</small>`;

      row.appendChild(posBox);
      row.appendChild(who);
      row.appendChild(gap);
      elSession.appendChild(row);
    });
  }

  function buildYourDrivers() {
    elYourDrivers.innerHTML = "";

    your2.forEach(c => {
      const card = document.createElement("div");
      card.className = "card";

      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.background = c.color;
      card.appendChild(bar);

      const ch = document.createElement("div");
      ch.className = "ch";

      const av = document.createElement("div");
      av.className = "av";
      const img = document.createElement("img");
      img.alt = c.name;
      img.src = faceSrc(c.driverId);
      img.onerror = () => { av.innerHTML = ""; av.textContent = initials(c.name); };
      av.appendChild(img);

      const name = document.createElement("div");
      name.className = "name";
      const n = document.createElement("div");
      n.className = "n"; n.textContent = c.name;

      const t = document.createElement("div");
      t.className = "t";
      const logo = document.createElement("img");
      logo.className = "logo";
      logo.alt = c.team;
      logo.src = logoSrc(c.team);
      logo.onerror = () => { logo.remove(); };
      t.appendChild(logo);
      const ttxt = document.createElement("span");
      ttxt.textContent = `${c.team} • ${c.mode}`;
      t.appendChild(ttxt);

      name.appendChild(n);
      name.appendChild(t);

      ch.appendChild(av);
      ch.appendChild(name);

      const stats = document.createElement("div");
      stats.className = "stats";
      const sTy = document.createElement("div"); sTy.className="sp"; sTy.textContent=`Pneu: ${c.tyre}`;
      const sCar= document.createElement("div"); sCar.className="sp"; sCar.textContent=`Carro: ${(100-c.engineWear).toFixed(0)}%`;
      const sWe = document.createElement("div"); sWe.className="sp"; sWe.textContent=`Pneu: ${(100-c.tyreWear).toFixed(0)}%`;
      const sEr = document.createElement("div"); sEr.className="sp"; sEr.textContent=`ERS: ${c.ers.toFixed(0)}%`;
      stats.appendChild(sTy); stats.appendChild(sCar); stats.appendChild(sWe); stats.appendChild(sEr);

      const pitRow = document.createElement("div");
      pitRow.style.display = "grid";
      pitRow.style.gridTemplateColumns = "110px 1fr";
      pitRow.style.gap = "10px";
      pitRow.style.marginBottom = "10px";

      const pit = document.createElement("button");
      pit.className = "btn red";
      pit.textContent = "PIT";
      pit.addEventListener("click", () => c.pit.requested = true);

      const sel = document.createElement("select");
      sel.className = "sel";
      sel.innerHTML = `
        <option value="M">M (Medium)</option>
        <option value="H">H (Hard)</option>
        <option value="S">S (Soft)</option>
        <option value="W">W (Wet)</option>
        <option value="I">I (Inter)</option>
      `;
      sel.value = c.tyre;
      sel.addEventListener("change", () => c.tyre = sel.value);

      pitRow.appendChild(pit);
      pitRow.appendChild(sel);

      const ctrls = document.createElement("div");
      ctrls.className = "ctrls";

      const eco = document.createElement("button");
      eco.className = "btn";
      eco.textContent = "ECONOMIZAR";
      eco.addEventListener("click", () => c.mode = "Economizar");

      const atk = document.createElement("button");
      atk.className = "btn green";
      atk.textContent = "ATAQUE";
      atk.addEventListener("click", () => c.mode = "Ataque");

      const mM = document.createElement("button");
      mM.className="btn"; mM.textContent="MOTOR -";
      mM.addEventListener("click", () => c.speedTrim = clamp(c.speedTrim - 0.003, -0.020, 0.020));

      const mP = document.createElement("button");
      mP.className="btn"; mP.textContent="MOTOR +";
      mP.addEventListener("click", () => c.speedTrim = clamp(c.speedTrim + 0.003, -0.020, 0.020));

      const aM = document.createElement("button");
      aM.className="btn"; aM.textContent="AGRESS -";
      aM.addEventListener("click", () => c.aggression = clamp(c.aggression - 1, 1, 5));

      const aP = document.createElement("button");
      aP.className="btn"; aP.textContent="AGRESS +";
      aP.addEventListener("click", () => c.aggression = clamp(c.aggression + 1, 1, 5));

      const ers = document.createElement("button");
      ers.className="btn";
      ers.style.gridColumn="1/-1";
      ers.textContent="ERS BOOST";
      ers.addEventListener("click", () => {
        if (c.ers < 15) return;
        c.ers -= 15;
        c._ersBoost = 1.2; // segundos
      });

      ctrls.appendChild(eco); ctrls.appendChild(atk);
      ctrls.appendChild(mM);  ctrls.appendChild(mP);
      ctrls.appendChild(aM);  ctrls.appendChild(aP);
      ctrls.appendChild(ers);

      card.appendChild(ch);
      card.appendChild(stats);
      card.appendChild(pitRow);
      card.appendChild(ctrls);

      card._update = () => {
        sTy.textContent = `Pneu: ${c.tyre}`;
        sCar.textContent = `Carro: ${(100-c.engineWear).toFixed(0)}%`;
        sWe.textContent = `Pneu: ${(100-c.tyreWear).toFixed(0)}%`;
        sEr.textContent = `ERS: ${c.ers.toFixed(0)}%`;
        ttxt.textContent = `${c.team} • ${c.mode}`;
      };

      elYourDrivers.appendChild(card);
    });
  }

  function tickYourCards() {
    [...elYourDrivers.children].forEach(card => card._update && card._update());
  }

  // ====== Race state ======
  let raceState = "Correndo";
  let shownPodium = false;

  let lastTs = performance.now();
  let lapLeader = 1;

  // ====== Render ======
  function draw() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    if (!pathPoints.length) return;

    // Pista única (sem “duas pistas”)
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // sombra
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    pathPoints.forEach((pt,i) => {
      const p = project(pt);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // asfalto
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    pathPoints.forEach((pt,i) => {
      const p = project(pt);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // linha oficial
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    pathPoints.forEach((pt,i) => {
      const p = project(pt);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // carros
    const sorted = [...cars].sort((a,b)=>a.time-b.time);
    sorted.forEach(c => {
      const pos = pointAtProgress(c.progress);
      const r = 5.5;

      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r*2.0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    });

    // finish mark
    const finish = pointAtProgress(0.02);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(finish.x-10, finish.y-2, 20, 4);
    ctx.restore();
  }

  // ====== Simulação (setup + staff influenciam) ======
  function update(dt) {
    if (raceState !== "Correndo") return;

    const k = dt * timeScale;

    cars.forEach(c => {
      if (c.finished) return;

      // PIT
      if (c.pit.inPit) {
        c.pit.timer -= k;
        c.time += k * 1.6;
        if (c.pit.timer <= 0) {
          c.pit.inPit = false;
          c.pit.requested = false;
          c.tyreWear = 0;
        }
        return;
      }

      // desgaste influenciado por staff/setup
      const modeMult = (c.mode === "Ataque" ? 1.9 : (c.mode === "Economizar" ? 0.85 : 1.15));
      const wearRate = modeMult * BON.tyreWearMult;

      c.tyreWear = clamp(c.tyreWear + k * wearRate * 0.90, 0, 100);
      c.engineWear = clamp(c.engineWear + k * wearRate * 0.35, 0, 100);

      // ERS
      const ersGain = (c.mode === "Economizar" ? 2.4 : 0.9);
      c.ers = clamp(c.ers + k * ersGain, 0, 100);

      // ritmo: base + ajuste usuário + bônus setup/staff
      const tyrePenalty = (c.tyreWear/100) * 0.018;
      const engPenalty  = (c.engineWear/100) * 0.010;
      const aggBonus    = (c.aggression - 2) * 0.002;

      let v = c.baseSpeed + c.speedTrim + BON.paceBonus - tyrePenalty - engPenalty + aggBonus;

      if (c.mode === "Ataque") v += 0.004;
      if (c.mode === "Economizar") v -= 0.003;

      if (c._ersBoost > 0) {
        v += 0.010 * BON.strategyBonus;
        c._ersBoost -= k;
      }

      v = clamp(v, 0.015, 0.085);

      // entrar no pit perto do fim/início da volta
      if (c.pit.requested && (c.progress < 0.03 || c.progress > 0.97)) {
        c.pit.inPit = true;
        const basePit = 6.0 + Math.random()*2.0;
        c.pit.timer = basePit * BON.pitTimeMult;
        return;
      }

      const prev = c.progress;
      c.progress = (c.progress + v * k) % 1;

      // completou volta
      if (prev > 0.96 && c.progress < 0.04) {
        c.laps += 1;
        // tempo de volta (simplificado)
        c.time += (66 + Math.random()*0.9) * (1 + (c.tyreWear*0.10)/100 + (c.engineWear*0.08)/100) / (1 + BON.paceBonus*12);

        if (c.laps >= lapsTotal) {
          c.finished = true;
        }
      } else {
        c.time += k * 0.09;
      }
    });

    // HUD lap (líder)
    const leader = [...cars].sort((a,b)=>a.time-b.time)[0];
    lapLeader = clamp((leader?.laps || 0) + 1, 1, lapsTotal);

    document.getElementById("hudLap").textContent = `${lapLeader}/${lapsTotal}`;
    document.getElementById("hudState").textContent = "Correndo";
    elGpMeta.textContent = `Volta ${lapLeader} · Clima: ${weather} · Pista: ${trackTemp}°C`;

    if (cars.every(c => c.finished)) {
      raceState = "Finalizada";
      document.getElementById("hudState").textContent = "Finalizada";
      if (!shownPodium) {
        shownPodium = true;
        showPodium();
      }
    }
  }

  // ====== Pódio ======
  function showPodium() {
    const sorted = [...cars].sort((a,b)=>a.time-b.time);
    const top3 = sorted.slice(0,3);

    elPodiumTitle.textContent = `PÓDIO — ${gpName}`;
    elPodiumBody.innerHTML = "";

    const labels = ["1º", "2º", "3º"];
    top3.forEach((c, i) => {
      const box = document.createElement("div");
      box.className = "p";

      const rk = document.createElement("div");
      rk.className = "rank";
      rk.textContent = labels[i];

      const imgBox = document.createElement("div");
      imgBox.className = "img";
      imgBox.style.boxShadow = `0 0 0 2px ${c.color}33 inset`;

      const img = document.createElement("img");
      img.alt = c.name;
      img.src = faceSrc(c.driverId);
      img.onerror = () => { imgBox.innerHTML = ""; imgBox.textContent = initials(c.name); };
      imgBox.appendChild(img);

      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = c.name;

      const tm = document.createElement("div");
      tm.className = "tm";
      tm.textContent = c.team;

      box.appendChild(rk);
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

  // ====== Loop ======
  function loop(ts) {
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    update(dt);
    draw();
    buildSessionList();
    tickYourCards();

    requestAnimationFrame(loop);
  }

  // ====== Boot ======
  async function boot() {
    try {
      resizeCanvas();

      const track = await loadTrackSVG(trackKey);
      pathPoints = track.pts;
      bounds = track.bounds;

      buildYourDrivers();
      buildSessionList();

      // HUD init
      elHudLap.textContent = `1/${lapsTotal}`;
      elHudState.textContent = "Correndo";

      requestAnimationFrame(loop);
    } catch (err) {
      alert(`Erro na corrida: ${err.message}`);
      console.error(err);
    }
  }

  boot();
})();
