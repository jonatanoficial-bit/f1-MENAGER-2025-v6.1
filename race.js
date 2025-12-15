(() => {
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function slug(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  function slugDash(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function initials(name) {
    const p = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "??";
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function normTeamKey(team) { return slug(team); }

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

  // ====== Params ======
  const trackKey = (qs("track") || "australia").toLowerCase();
  const gpName = qs("gp") || "GP";
  const userTeam = (qs("userTeam") || "ferrari").toLowerCase();

  const weather = (qs("weather") || "Seco");
  const trackTemp = Number(qs("trackTemp") || 21) || 21;
  const lapsTotal = Math.max(10, Number(qs("laps") || 10) || 10);

  elGpName.textContent = gpName;
  elHudWeather.textContent = weather;
  elHudTrackTemp.textContent = `${trackTemp}°C`;
  elGpMeta.textContent = `Volta 1 · Clima: ${weather} · Pista: ${trackTemp}°C`;

  elGpFlag.src = `assets/flags/${trackKey}.png`;
  elGpFlag.onerror = () => { elGpFlag.src = ""; elGpFlag.style.background = "rgba(255,255,255,0.10)"; };

  document.getElementById("btnLobby").addEventListener("click", () => {
    location.href = "index.html";
  });

  // ====== Speed ======
  let timeScale = 1;
  document.querySelectorAll(".sbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sbtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      timeScale = Number(btn.dataset.speed) || 1;
    });
  });

  // ====== Save / Setup / Staff robust ======
  function tryLocalKeys(keys) {
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
  function readGameState() {
    const w = window;
    const candidates = [
      w.saveSystem?.get?.bind(w.saveSystem),
      w.saveSystem?.load?.bind(w.saveSystem),
      w.SaveSystem?.get?.bind(w.SaveSystem),
      w.SaveSystem?.load?.bind(w.SaveSystem),
      w.loadGame,
      w.getSave,
    ].filter(Boolean);

    for (const fn of candidates) {
      try {
        const s = fn();
        if (s && typeof s === "object") return s;
      } catch {}
    }
    return tryLocalKeys([
      "F1M_CAREER","F1M_SAVE","F1_MANAGER_SAVE","careerSave","saveGame","f1_manager_save"
    ]) || {};
  }

  const SAVE = readGameState();
  const SETUP = SAVE.setup || tryLocalKeys(["F1M_SETUP","carSetup","setupSave","raceSetup"]) || {};
  const STAFF = SAVE.staff || tryLocalKeys(["F1M_STAFF","staffSave","teamStaff"]) || {};
  const QUALI = SAVE.quali || tryLocalKeys(["F1M_QUALI","qualiResult","qualifyingSave"]) || null;

  function num(v, def=0){ v = Number(v); return Number.isFinite(v) ? v : def; }
  function computeBonuses(setup, staff){
    const aero = num(setup.aero, num(setup.asa, 50));
    const susp = num(setup.suspension, num(setup.suspensao, 50));
    const eng  = num(setup.engine, num(setup.motor, 50));
    const bal  = num(setup.balance, num(setup.equilibrio, 50));

    const engineers = num(staff.engineers, num(staff.engenheiros, 50));
    const mechanics = num(staff.mechanics, num(staff.mecanicos, 50));
    const strategist= num(staff.strategist, num(staff.estrategista, 50));

    const setupQ = (aero+susp+eng+bal)/4;
    const staffQ = (engineers+mechanics+strategist)/3;

    const paceBonus = ((setupQ-50)/50)*0.010 + ((staffQ-50)/50)*0.006;
    const tyreWearMult = clamp(1.00 - ((engineers-50)/50)*0.10 - ((setupQ-50)/50)*0.06, 0.75, 1.25);
    const pitTimeMult  = clamp(1.00 - ((mechanics-50)/50)*0.18, 0.70, 1.30);
    const strategyBonus= clamp(1.00 + ((strategist-50)/50)*0.08, 0.85, 1.15);

    return { paceBonus, tyreWearMult, pitTimeMult, strategyBonus };
  }
  const BON = computeBonuses(SETUP, STAFF);

  // ====== Colors ======
  const TEAM_COLORS = {
    ferrari:"#d90429", mclaren:"#ff7a00", mercedes:"#00d2be",
    red_bull:"#1e41ff", red_bull_racing:"#1e41ff",
    aston_martin:"#006f62", alpine:"#ff4fd8",
    williams_racing:"#00a3ff", haas:"#b0b0b0",
    rb:"#4b8bff", sauber:"#00ff8a",
  };
  function teamColor(team){
    const k = normTeamKey(team);
    return TEAM_COLORS[k] || "#ffffff";
  }

  // ====== Grid ======
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
    { id:"hulkenberg", name:"Nico Hulkenberg", team:"Haas" },
    { id:"magnussen", name:"Kevin Magnussen", team:"Haas" },
    { id:"tsunoda", name:"Yuki Tsunoda", team:"RB" },
    { id:"lawson", name:"Liam Lawson", team:"RB" },
    { id:"zhou", name:"Guanyu Zhou", team:"Sauber" },
    { id:"bortoleto", name:"Gabriel Bortoleto", team:"Sauber" },
  ];

  function getGrid(){
    if (Array.isArray(QUALI?.grid) && QUALI.grid.length >= 10) {
      return QUALI.grid.slice(0,20).map(p => ({
        id: p.id || p.driverId || p.code || slug(p.name || "driver"),
        code: p.code || p.short || "",
        name: p.name || p.driverName || "Piloto",
        team: p.team || p.teamName || "Equipe"
      }));
    }
    if (Array.isArray(SAVE?.drivers) && SAVE.drivers.length >= 10) {
      return SAVE.drivers.slice(0,20).map(p => ({
        id: p.id || p.driverId || p.code || slug(p.name || "driver"),
        code: p.code || p.short || "",
        name: p.name || "Piloto",
        team: p.team || "Equipe"
      }));
    }
    return DEFAULT_GRID.slice(0,20).map(d => ({...d, code:""}));
  }
  const grid = getGrid();

  // ====== FACE/LOGO loader (sem HEAD) ======
  const FACE_EXTS = ["png","jpg","jpeg","webp"];
  const LOGO_EXTS = ["png","jpg","jpeg","webp"];

  function faceCandidates(driver){
    const id = slug(driver.id);
    const nmU = slug(driver.name);
    const nmD = slugDash(driver.name);
    const parts = (driver.name || "").trim().split(/\s+/).filter(Boolean);
    const last = parts.length ? slug(parts[parts.length-1]) : "";
    const first = parts.length ? slug(parts[0]) : "";
    const code = (driver.code || "").toString().trim().toLowerCase();

    const candidates = new Set();

    for (const ext of FACE_EXTS) {
      // padrões comuns
      candidates.add(`assets/faces/${id}.${ext}`);
      candidates.add(`assets/faces/${nmU}.${ext}`);
      candidates.add(`assets/faces/${nmD}.${ext}`);
      candidates.add(`assets/faces/${first}_${last}.${ext}`);
      candidates.add(`assets/faces/${last}.${ext}`);
      candidates.add(`assets/faces/${id}_face.${ext}`);
      candidates.add(`assets/faces/face_${id}.${ext}`);

      // iniciais / code
      if (code) candidates.add(`assets/faces/${code}.${ext}`);
      candidates.add(`assets/faces/${initials(driver.name).toLowerCase()}.${ext}`);
      candidates.add(`assets/faces/${initials(driver.name)}.${ext}`);
    }

    return [...candidates];
  }

  function logoCandidates(team){
    const k = normTeamKey(team);
    const candidates = new Set();
    for (const ext of LOGO_EXTS) {
      candidates.add(`assets/logos/${k}.${ext}`);
      candidates.add(`assets/logos/logo_${k}.${ext}`);
    }
    return [...candidates];
  }

  function loadImage(url){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error("not found"));
      // evita cache “enganar” em deploy
      img.src = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    });
  }

  async function pickFirstImage(urls){
    for (const u of urls) {
      try { return await loadImage(u); } catch {}
    }
    return null;
  }

  // ====== Canvas ======
  let pathPoints = [];
  let bounds = {minX:0,minY:0,maxX:1,maxY:1};

  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);

  async function loadTrackSVG(track){
    const url = `assets/tracks/${track}.svg`;
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${url} (HTTP ${res.status})`);
    const svgText = await res.text();
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const path = doc.querySelector("path");
    if (!path) throw new Error("SVG inválido (sem <path>)");

    const temp = document.createElementNS("http://www.w3.org/2000/svg","svg");
    temp.style.position="absolute"; temp.style.left="-99999px"; temp.style.top="-99999px";
    temp.style.width="0"; temp.style.height="0";

    const p = document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d", path.getAttribute("d"));
    temp.appendChild(p);
    document.body.appendChild(temp);

    const len = p.getTotalLength();
    const samples = 520;
    const pts = [];
    for (let i=0;i<samples;i++){
      const pt = p.getPointAtLength((i/samples)*len);
      pts.push({x:pt.x,y:pt.y});
    }

    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    pts.forEach(pt=>{
      minX=Math.min(minX,pt.x); minY=Math.min(minY,pt.y);
      maxX=Math.max(maxX,pt.x); maxY=Math.max(maxY,pt.y);
    });

    document.body.removeChild(temp);
    return { pts, bounds:{minX,minY,maxX,maxY} };
  }

  function project(pt){
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    // padding dinâmico: melhora o “zoom” no mobile
    const pad = Math.max(14, Math.min(w, h) * 0.06);

    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;

    const scale = Math.min((w - pad*2)/bw, (h - pad*2)/bh);
    const ox = (w - bw*scale)/2;
    const oy = (h - bh*scale)/2;

    return { x: ox + (pt.x - bounds.minX)*scale, y: oy + (pt.y - bounds.minY)*scale };
  }

  function pointAtProgress(t){
    const n = pathPoints.length;
    const u = (t%1 + 1)%1;
    const x = u*(n-1);
    const i = Math.floor(x);
    const j = (i+1)%n;
    const f = x-i;
    const a = pathPoints[i], b = pathPoints[j];
    return project({ x: lerp(a.x,b.x,f), y: lerp(a.y,b.y,f) });
  }

  // ====== Cars ======
  const cars = grid.map((d,i)=>({
    idx:i,
    driverId: slug(d.id),
    code: (d.code || "").toString(),
    name:d.name,
    team:d.team,
    color: teamColor(d.team),
    progress:(i/grid.length)%1,
    baseSpeed: 0.040 + Math.random()*0.010,
    speedTrim:0,
    tyre: (String(weather).toLowerCase().includes("chuva") ? "W" : "M"),
    tyreWear:0,
    engineWear:0,
    ers:50,
    aggression:2,
    mode:"Normal",
    pit:{requested:false,inPit:false,timer:0},
    time:0,
    laps:0,
    finished:false,
    faceUrl:null,
    logoUrl:null
  }));

  function pickYour2(){
    const key = normTeamKey(userTeam);
    const same = cars.filter(c => normTeamKey(c.team) === key);
    if (same.length >= 2) return [same[0], same[1]];
    return [cars[0], cars[1]];
  }
  const your2 = pickYour2();

  // ====== UI ======
  function buildSessionList(){
    elSession.innerHTML="";
    const sorted=[...cars].sort((a,b)=>a.time-b.time);

    sorted.forEach((c,pos)=>{
      const row=document.createElement("div");
      row.className="row";

      const posBox=document.createElement("div");
      posBox.className="pos";
      const bar=document.createElement("div");
      bar.className="bar";
      bar.style.background=c.color;
      posBox.appendChild(bar);
      const txt=document.createElement("div");
      txt.style.position="relative";
      txt.style.zIndex="1";
      txt.textContent=(pos+1);
      posBox.appendChild(txt);

      const who=document.createElement("div");
      who.className="who";
      const n=document.createElement("div");
      n.className="n";
      n.textContent=c.name;
      const t=document.createElement("div");
      t.className="t";
      t.textContent=c.team;
      who.appendChild(n); who.appendChild(t);

      const gap=document.createElement("div");
      gap.className="gap";
      if (pos===0) gap.innerHTML=`LEADER<small>${c.tyre} • Voltas: ${c.laps}</small>`;
      else gap.innerHTML=`+${(c.time-sorted[0].time).toFixed(3)}<small>${c.tyre} • Voltas: ${c.laps}</small>`;

      row.appendChild(posBox);
      row.appendChild(who);
      row.appendChild(gap);
      elSession.appendChild(row);
    });
  }

  function buildYourDrivers(){
    elYourDrivers.innerHTML="";

    your2.forEach(c=>{
      const card=document.createElement("div");
      card.className="card";

      const bar=document.createElement("div");
      bar.className="bar";
      bar.style.background=c.color;
      card.appendChild(bar);

      const ch=document.createElement("div");
      ch.className="ch";

      const av=document.createElement("div");
      av.className="av";

      if (c.faceUrl) {
        const img=document.createElement("img");
        img.alt=c.name;
        img.src = c.faceUrl;
        img.onerror=()=>{ av.innerHTML=""; av.textContent=initials(c.name); };
        av.appendChild(img);
      } else {
        av.textContent = initials(c.name);
      }

      const name=document.createElement("div");
      name.className="name";

      const n=document.createElement("div");
      n.className="n"; n.textContent=c.name;

      const t=document.createElement("div");
      t.className="t";
      if (c.logoUrl) {
        const logo=document.createElement("img");
        logo.className="logo";
        logo.alt=c.team;
        logo.src=c.logoUrl;
        logo.onerror=()=>logo.remove();
        t.appendChild(logo);
      }
      const ttxt=document.createElement("span");
      ttxt.textContent=`${c.team} • ${c.mode}`;
      t.appendChild(ttxt);

      name.appendChild(n);
      name.appendChild(t);

      ch.appendChild(av);
      ch.appendChild(name);

      const stats=document.createElement("div");
      stats.className="stats";
      const sTy=document.createElement("div"); sTy.className="sp"; sTy.textContent=`Pneu: ${c.tyre}`;
      const sCar=document.createElement("div"); sCar.className="sp"; sCar.textContent=`Carro: ${(100-c.engineWear).toFixed(0)}%`;
      const sWe=document.createElement("div"); sWe.className="sp"; sWe.textContent=`Pneu: ${(100-c.tyreWear).toFixed(0)}%`;
      const sEr=document.createElement("div"); sEr.className="sp"; sEr.textContent=`ERS: ${c.ers.toFixed(0)}%`;
      stats.appendChild(sTy); stats.appendChild(sCar); stats.appendChild(sWe); stats.appendChild(sEr);

      const pitRow=document.createElement("div");
      pitRow.style.display="grid";
      pitRow.style.gridTemplateColumns="110px 1fr";
      pitRow.style.gap="10px";
      pitRow.style.marginBottom="10px";

      const pit=document.createElement("button");
      pit.className="btn red";
      pit.textContent="PIT";
      pit.addEventListener("click", ()=> c.pit.requested=true );

      const sel=document.createElement("select");
      sel.className="sel";
      sel.innerHTML=`
        <option value="M">M (Medium)</option>
        <option value="H">H (Hard)</option>
        <option value="S">S (Soft)</option>
        <option value="W">W (Wet)</option>
        <option value="I">I (Inter)</option>
      `;
      sel.value=c.tyre;
      sel.addEventListener("change", ()=> c.tyre=sel.value );

      pitRow.appendChild(pit);
      pitRow.appendChild(sel);

      const ctrls=document.createElement("div");
      ctrls.className="ctrls";

      const eco=document.createElement("button");
      eco.className="btn";
      eco.textContent="ECONOMIZAR";
      eco.addEventListener("click", ()=> c.mode="Economizar");

      const atk=document.createElement("button");
      atk.className="btn green";
      atk.textContent="ATAQUE";
      atk.addEventListener("click", ()=> c.mode="Ataque");

      const mM=document.createElement("button");
      mM.className="btn"; mM.textContent="MOTOR -";
      mM.addEventListener("click", ()=> c.speedTrim=clamp(c.speedTrim-0.003,-0.020,0.020));

      const mP=document.createElement("button");
      mP.className="btn"; mP.textContent="MOTOR +";
      mP.addEventListener("click", ()=> c.speedTrim=clamp(c.speedTrim+0.003,-0.020,0.020));

      const aM=document.createElement("button");
      aM.className="btn"; aM.textContent="AGRESS -";
      aM.addEventListener("click", ()=> c.aggression=clamp(c.aggression-1,1,5));

      const aP=document.createElement("button");
      aP.className="btn"; aP.textContent="AGRESS +";
      aP.addEventListener("click", ()=> c.aggression=clamp(c.aggression+1,1,5));

      const ers=document.createElement("button");
      ers.className="btn";
      ers.style.gridColumn="1/-1";
      ers.textContent="ERS BOOST";
      ers.addEventListener("click", ()=>{
        if (c.ers < 15) return;
        c.ers -= 15;
        c._ersBoost = 1.2;
      });

      ctrls.appendChild(eco); ctrls.appendChild(atk);
      ctrls.appendChild(mM);  ctrls.appendChild(mP);
      ctrls.appendChild(aM);  ctrls.appendChild(aP);
      ctrls.appendChild(ers);

      card.appendChild(ch);
      card.appendChild(stats);
      card.appendChild(pitRow);
      card.appendChild(ctrls);

      card._update=()=>{
        sTy.textContent=`Pneu: ${c.tyre}`;
        sCar.textContent=`Carro: ${(100-c.engineWear).toFixed(0)}%`;
        sWe.textContent=`Pneu: ${(100-c.tyreWear).toFixed(0)}%`;
        sEr.textContent=`ERS: ${c.ers.toFixed(0)}%`;
        ttxt.textContent=`${c.team} • ${c.mode}`;
      };

      elYourDrivers.appendChild(card);
    });
  }

  function tickYourCards(){
    [...elYourDrivers.children].forEach(card => card._update && card._update());
  }

  // ====== Render ======
  function draw(){
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0,0,w,h);
    if (!pathPoints.length) return;

    ctx.save();
    ctx.lineCap="round";
    ctx.lineJoin="round";

    // sombra
    ctx.strokeStyle="rgba(0,0,0,0.65)";
    ctx.lineWidth=18;
    ctx.beginPath();
    pathPoints.forEach((pt,i)=>{
      const p=project(pt);
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // asfalto
    ctx.strokeStyle="rgba(255,255,255,0.22)";
    ctx.lineWidth=14;
    ctx.beginPath();
    pathPoints.forEach((pt,i)=>{
      const p=project(pt);
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // linha
    ctx.strokeStyle="rgba(255,255,255,0.92)";
    ctx.lineWidth=7;
    ctx.beginPath();
    pathPoints.forEach((pt,i)=>{
      const p=project(pt);
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // carros
    const sorted=[...cars].sort((a,b)=>a.time-b.time);
    sorted.forEach(c=>{
      const pos=pointAtProgress(c.progress);
      const r=5.5;

      ctx.save();
      ctx.globalAlpha=0.30;
      ctx.fillStyle=c.color;
      ctx.beginPath();
      ctx.arc(pos.x,pos.y,r*2.0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle=c.color;
      ctx.beginPath();
      ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.55)";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // ====== Sim ======
  let raceState="Correndo";
  let lastTs=performance.now();

  function update(dt){
    if (raceState !== "Correndo") return;

    const k = dt * timeScale;

    cars.forEach(c=>{
      if (c.finished) return;

      if (c.pit.inPit) {
        c.pit.timer -= k;
        c.time += k*1.6;
        if (c.pit.timer <= 0) {
          c.pit.inPit=false;
          c.pit.requested=false;
          c.tyreWear=0;
        }
        return;
      }

      const modeMult = (c.mode==="Ataque"?1.9:(c.mode==="Economizar"?0.85:1.15));
      const wearRate = modeMult * BON.tyreWearMult;

      c.tyreWear = clamp(c.tyreWear + k*wearRate*0.90, 0, 100);
      c.engineWear = clamp(c.engineWear + k*wearRate*0.35, 0, 100);

      const ersGain = (c.mode==="Economizar"?2.4:0.9);
      c.ers = clamp(c.ers + k*ersGain, 0, 100);

      const tyrePenalty = (c.tyreWear/100)*0.018;
      const engPenalty  = (c.engineWear/100)*0.010;
      const aggBonus    = (c.aggression-2)*0.002;

      let v = c.baseSpeed + c.speedTrim + BON.paceBonus - tyrePenalty - engPenalty + aggBonus;
      if (c.mode==="Ataque") v += 0.004;
      if (c.mode==="Economizar") v -= 0.003;

      if (c._ersBoost > 0) {
        v += 0.010 * BON.strategyBonus;
        c._ersBoost -= k;
      }
      v = clamp(v, 0.015, 0.085);

      if (c.pit.requested && (c.progress < 0.03 || c.progress > 0.97)) {
        c.pit.inPit=true;
        const basePit = 6.0 + Math.random()*2.0;
        c.pit.timer = basePit * BON.pitTimeMult;
        return;
      }

      const prev = c.progress;
      c.progress = (c.progress + v*k) % 1;

      if (prev > 0.96 && c.progress < 0.04) {
        c.laps += 1;
        c.time += (66 + Math.random()*0.9) * (1 + (c.tyreWear*0.10)/100 + (c.engineWear*0.08)/100) / (1 + BON.paceBonus*12);
        if (c.laps >= lapsTotal) c.finished = true;
      } else {
        c.time += k*0.09;
      }
    });

    const leader=[...cars].sort((a,b)=>a.time-b.time)[0];
    const lapLeader = clamp((leader?.laps||0)+1, 1, lapsTotal);

    elHudLap.textContent = `${lapLeader}/${lapsTotal}`;
    elHudState.textContent = "Correndo";
    elGpMeta.textContent = `Volta ${lapLeader} · Clima: ${weather} · Pista: ${trackTemp}°C`;

    if (cars.every(c=>c.finished)){
      raceState="Finalizada";
      elHudState.textContent="Finalizada";
    }
  }

  function loop(ts){
    const dt=(ts-lastTs)/1000;
    lastTs=ts;

    update(dt);
    draw();
    buildSessionList();
    tickYourCards();

    requestAnimationFrame(loop);
  }

  // ====== Boot ======
  async function boot(){
    try {
      resizeCanvas();

      // resolve faces/logos por preload real de imagem
      await Promise.all(cars.map(async c => {
        c.faceUrl = await pickFirstImage(faceCandidates({ id:c.driverId, name:c.name, code:c.code })) || null;
        c.logoUrl = await pickFirstImage(logoCandidates(c.team)) || null;
      }));

      const track = await loadTrackSVG(trackKey);
      pathPoints = track.pts;
      bounds = track.bounds;

      buildYourDrivers();
      buildSessionList();

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
