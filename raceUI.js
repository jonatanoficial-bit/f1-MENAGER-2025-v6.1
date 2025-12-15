/* raceUI.js — UI + Loop (60fps), sessão, controles, faces, pódio */

(function () {
  "use strict";

  const RS = window.RaceSystem;
  const RR = window.RaceRenderer;

  const state = RS.RaceState;

  let lastT = performance.now();

  // ===== DOM =====
  const gpTitle = document.getElementById("gpTitle");
  const gpSub = document.getElementById("gpSub");
  const lapCounter = document.getElementById("lapCounter");
  const raceStatus = document.getElementById("raceStatus");
  const weatherLabel = document.getElementById("weatherLabel");
  const trackTempLabel = document.getElementById("trackTempLabel");
  const sessionList = document.getElementById("sessionList");
  const yourDrivers = document.getElementById("yourDrivers");
  const backLobby = document.getElementById("backLobby");
  const backLobby2 = document.getElementById("backLobby2");
  const gpFlag = document.getElementById("gpFlag");

  const speed1 = document.getElementById("speed1");
  const speed2 = document.getElementById("speed2");
  const speed4 = document.getElementById("speed4");

  const podiumWrap = document.getElementById("podiumWrap");
  const podiumGrid = document.getElementById("podiumGrid");
  const restartRace = document.getElementById("restartRace");

  // ===== Routing =====
  function goLobby() {
    // ajuste aqui para o seu lobby real
    // se existir index.html como lobby:
    location.href = "index.html";
  }

  // ===== Faces =====
  function facePath(driverId) {
    return `assets/faces/${driverId}.png`;
  }

  function makeFaceEl(driver) {
    const box = document.createElement("div");
    box.className = "driver-face";

    const img = document.createElement("img");
    img.alt = driver.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = facePath(driver.id);

    // fallback SEM piscar: se falhar, remove img e mostra iniciais
    img.onerror = () => {
      img.remove();
      box.textContent = driver.code || driver.name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
    };

    box.appendChild(img);
    return box;
  }

  function setSpeedActive(mult) {
    [speed1, speed2, speed4].forEach(b => b.classList.remove("active"));
    if (mult === 1) speed1.classList.add("active");
    if (mult === 2) speed2.classList.add("active");
    if (mult === 4) speed4.classList.add("active");
  }

  // ===== UI Builders =====
  function buildSessionRow(driver, isLeader) {
    const row = document.createElement("div");
    row.className = "session-row";

    const left = document.createElement("div");
    left.className = "session-left";

    const pos = document.createElement("div");
    pos.className = "pos-badge";
    pos.textContent = String(driver.position);

    const face = makeFaceEl(driver);

    const meta = document.createElement("div");
    meta.className = "driver-meta";

    const name = document.createElement("div");
    name.className = "driver-name";
    name.textContent = driver.name;

    const sub = document.createElement("div");
    sub.className = "driver-sub";
    sub.textContent = `${driver.teamName} • Voltas: ${Math.max(0, driver.lap - 1)} • Pneu: ${state.weather === "Chuva" ? "W" : "M"}`;

    meta.appendChild(name);
    meta.appendChild(sub);

    left.appendChild(pos);
    left.appendChild(face);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "session-right";

    const delta = document.createElement("div");
    delta.className = "delta";
    delta.textContent = isLeader ? "0.000" : `+${(driver.delta / 10).toFixed(3)}`;

    const tag = document.createElement("div");
    tag.className = "leader-tag";
    tag.textContent = isLeader ? "LEADER" : "";

    right.appendChild(delta);
    right.appendChild(tag);

    // borda colorida por equipe (via pseudo before no driver-card; aqui no row usaremos outline)
    row.style.boxShadow = "none";
    row.style.borderColor = "rgba(255,255,255,.06)";
    row.style.position = "relative";
    row.style.overflow = "hidden";
    row.style.background = "rgba(0,0,0,.20)";

    // stripe
    const stripe = document.createElement("div");
    stripe.style.position = "absolute";
    stripe.style.left = "0";
    stripe.style.top = "0";
    stripe.style.bottom = "0";
    stripe.style.width = "4px";
    stripe.style.background = driver.teamColor || "rgba(255,255,255,.12)";
    stripe.style.opacity = "0.95";
    row.appendChild(stripe);

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  function buildYourDriverCard(driver) {
    const card = document.createElement("div");
    card.className = "driver-card";
    card.style.setProperty("--teamColor", driver.teamColor);

    // stripe
    card.style.setProperty("border-color", "rgba(255,255,255,.07)");
    card.style.setProperty("position", "relative");
    card.style.setProperty("overflow", "hidden");
    card.style.setProperty("box-shadow", "none");
    card.style.setProperty("background", "rgba(0,0,0,.20)");
    card.style.setProperty("border-radius", "18px");
    card.style.setProperty("border", "1px solid rgba(255,255,255,.07)");
    card.style.setProperty("padding", "12px");
    card.style.setProperty("min-height", "220px");
    card.style.setProperty("display", "flex");
    card.style.setProperty("flex-direction", "column");

    card.style.setProperty("--stripe", driver.teamColor || "rgba(255,255,255,.12)");
    card.style.setProperty("box-shadow", "none");
    card.style.setProperty("border-left", `4px solid ${driver.teamColor || "rgba(255,255,255,.12)"}`);

    const head = document.createElement("div");
    head.className = "head";

    const title = document.createElement("div");
    title.className = "title";

    const face = makeFaceEl(driver);

    const t = document.createElement("div");
    t.className = "t";

    const n = document.createElement("div");
    n.className = "n";
    n.textContent = driver.name;

    const s = document.createElement("div");
    s.className = "s";
    s.textContent = `${driver.teamName} • ${driver.mode}`;

    t.appendChild(n);
    t.appendChild(s);

    title.appendChild(face);
    title.appendChild(t);

    const tyrePill = document.createElement("div");
    tyrePill.className = "pill";
    tyrePill.textContent = state.weather === "Chuva" ? "Pneu: W (Wet)" : "Pneu: M (Medium)";

    head.appendChild(title);
    head.appendChild(tyrePill);

    const kpis = document.createElement("div");
    kpis.className = "kpis";

    const kCar = document.createElement("div");
    kCar.className = "kpi";
    kCar.textContent = `Carro: ${RS.format.fmtPct(driver.engine)}`;

    const kTyre = document.createElement("div");
    kTyre.className = "kpi";
    kTyre.textContent = `Pneu: ${RS.format.fmtPct(driver.tyre)}`;

    const kErs = document.createElement("div");
    kErs.className = "kpi";
    kErs.textContent = `ERS: ${RS.format.fmtPct(driver.ers)}`;

    const kMotor = document.createElement("div");
    kMotor.className = "kpi";
    kMotor.textContent = `Motor: M${driver.motorMap}`;

    const kAgg = document.createElement("div");
    kAgg.className = "kpi";
    kAgg.textContent = `Agress.: A${driver.aggress}`;

    kpis.appendChild(kCar);
    kpis.appendChild(kTyre);
    kpis.appendChild(kErs);
    kpis.appendChild(kMotor);
    kpis.appendChild(kAgg);

    const controls = document.createElement("div");
    controls.className = "controls";

    // PIT
    const btnPit = document.createElement("button");
    btnPit.className = "btn-mini danger";
    btnPit.textContent = "PIT";
    btnPit.onclick = () => RS.requestPit(driver.id);

    // Tyre select (placeholder, mantém compatível)
    const tyreSel = document.createElement("select");
    tyreSel.className = "select-mini";
    const opt = (v, label) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      return o;
    };
    tyreSel.appendChild(opt(state.weather === "Chuva" ? "W" : "M", state.weather === "Chuva" ? "W (Wet)" : "M (Medium)"));
    tyreSel.appendChild(opt("M", "M (Medium)"));
    tyreSel.appendChild(opt("W", "W (Wet)"));
    tyreSel.value = state.weather === "Chuva" ? "W" : "M";
    tyreSel.onchange = () => RS.setTyre(driver.id, tyreSel.value);

    // ECONOMIZAR / ATAQUE
    const btnEco = document.createElement("button");
    btnEco.className = "btn-mini";
    btnEco.textContent = "ECONOMIZAR";
    btnEco.onclick = () => RS.setMode(driver.id, "ECONOMIZAR");

    const btnAtk = document.createElement("button");
    btnAtk.className = "btn-mini primary";
    btnAtk.textContent = "ATAQUE";
    btnAtk.onclick = () => RS.setMode(driver.id, "ATAQUE");

    // MOTOR - / +
    const btnMotorMinus = document.createElement("button");
    btnMotorMinus.className = "btn-mini";
    btnMotorMinus.textContent = "MOTOR -";
    btnMotorMinus.onclick = () => RS.adjustMotor(driver.id, -1);

    const btnMotorPlus = document.createElement("button");
    btnMotorPlus.className = "btn-mini";
    btnMotorPlus.textContent = "MOTOR +";
    btnMotorPlus.onclick = () => RS.adjustMotor(driver.id, +1);

    // AGRESS - / +
    const btnAggMinus = document.createElement("button");
    btnAggMinus.className = "btn-mini";
    btnAggMinus.textContent = "AGRESS -";
    btnAggMinus.onclick = () => RS.adjustAggress(driver.id, -1);

    const btnAggPlus = document.createElement("button");
    btnAggPlus.className = "btn-mini";
    btnAggPlus.textContent = "AGRESS +";
    btnAggPlus.onclick = () => RS.adjustAggress(driver.id, +1);

    // ERS BOOST
    const btnERS = document.createElement("button");
    btnERS.className = "btn-mini";
    btnERS.textContent = "ERS BOOST";
    btnERS.onclick = () => RS.toggleERS(driver.id);

    controls.appendChild(btnPit);
    controls.appendChild(tyreSel);
    controls.appendChild(btnEco);
    controls.appendChild(btnAtk);
    controls.appendChild(btnMotorMinus);
    controls.appendChild(btnMotorPlus);
    controls.appendChild(btnAggMinus);
    controls.appendChild(btnAggPlus);
    controls.appendChild(btnERS);

    card.appendChild(head);
    card.appendChild(kpis);
    card.appendChild(controls);

    // atualizador interno (sem recriar DOM)
    card.__update = () => {
      s.textContent = `${driver.teamName} • ${driver.mode}${driver.inPit ? " • PIT" : ""}`;
      kCar.textContent = `Carro: ${RS.format.fmtPct(driver.engine)}`;
      kTyre.textContent = `Pneu: ${RS.format.fmtPct(driver.tyre)}`;
      kErs.textContent = `ERS: ${RS.format.fmtPct(driver.ers)}`;
      kMotor.textContent = `Motor: M${driver.motorMap}`;
      kAgg.textContent = `Agress.: A${driver.aggress}`;

      btnERS.style.borderColor = driver.ersBoost ? "rgba(31,191,117,.45)" : "rgba(255,255,255,.10)";
      btnERS.style.background = driver.ersBoost ? "linear-gradient(180deg, rgba(31,191,117,.22), rgba(31,191,117,.08))" : "rgba(255,255,255,.04)";
    };

    return card;
  }

  function renderSession(sorted) {
    sessionList.innerHTML = "";
    sorted.forEach((d, idx) => {
      const row = buildSessionRow(d, idx === 0);
      sessionList.appendChild(row);
    });
  }

  let yourCards = [];
  function renderYourDrivers() {
    yourDrivers.innerHTML = "";
    yourCards = [];

    state.yourDriverIds.forEach(id => {
      const d = RS.getDriver(id);
      if (!d) return;
      const card = buildYourDriverCard(d);
      yourCards.push(card);
      yourDrivers.appendChild(card);
    });
  }

  function updateHUD(sorted) {
    const leader = sorted[0];
    const maxLap = Math.min(state.totalLaps, Math.max(...sorted.map(d => Math.max(1, d.lap))));
    lapCounter.textContent = `${Math.min(maxLap, state.totalLaps)}/${state.totalLaps}`;
    raceStatus.textContent = state.finished ? "Finalizada" : "Correndo";
    weatherLabel.textContent = state.weather;
    trackTempLabel.textContent = `${state.trackTemp}°C`;

    // atualiza cards sem recriar
    yourCards.forEach(c => c.__update && c.__update());

    // top bar gp
    gpTitle.textContent = state.gpName;
    gpSub.textContent = `Volta ${Math.min(maxLap, state.totalLaps)} • Clima: ${state.weather} • Pista: ${state.trackTemp}°C`;

    // bandeira (opcional): tenta assets/flags/<track>.png
    if (!gpFlag.__loaded) {
      const img = document.createElement("img");
      img.alt = "GP";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = `assets/flags/${state.trackKey}.png`;
      img.onerror = () => { img.remove(); };
      gpFlag.appendChild(img);
      gpFlag.__loaded = true;
    }
  }

  function showPodium(sorted) {
    podiumGrid.innerHTML = "";

    const top3 = sorted.slice(0, 3);

    top3.forEach((d, i) => {
      const slot = document.createElement("div");
      slot.className = "podium-slot";
      slot.style.borderColor = "rgba(255,255,255,.10)";
      slot.style.borderLeft = `6px solid ${d.teamColor || "rgba(255,255,255,.25)"}`;

      const rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = `${i + 1}º lugar`;

      const who = document.createElement("div");
      who.className = "who";

      const face = makeFaceEl(d);
      const box = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = d.name;

      const tm = document.createElement("div");
      tm.className = "tm";
      tm.textContent = d.teamName;

      box.appendChild(nm);
      box.appendChild(tm);

      who.appendChild(face);
      who.appendChild(box);

      slot.appendChild(rank);
      slot.appendChild(who);

      podiumGrid.appendChild(slot);
    });

    podiumWrap.classList.add("show");
    podiumWrap.setAttribute("aria-hidden", "false");
  }

  function hidePodium() {
    podiumWrap.classList.remove("show");
    podiumWrap.setAttribute("aria-hidden", "true");
  }

  // ===== Loop =====
  function loop(t) {
    const dt = Math.min(0.050, (t - lastT) / 1000); // max 50ms
    lastT = t;

    // tick
    RS.tick(dt);

    requestAnimationFrame(loop);
  }

  // ===== Events =====
  window.addEventListener("race:ready", () => {});
  window.addEventListener("track:ready", () => {});
  window.addEventListener("race:tick", (ev) => {
    const sorted = ev.detail.sorted;
    RR.render(sorted);
    renderSession(sorted);
    updateHUD(sorted);
  });

  window.addEventListener("race:finished", (ev) => {
    const sorted = ev.detail.sorted;
    updateHUD(sorted);
    showPodium(sorted);
  });

  window.addEventListener("race:restart", () => {
    hidePodium();
    renderYourDrivers();
  });

  // ===== Boot =====
  async function boot() {
    RS.init();

    // GP texts
    gpTitle.textContent = state.gpName;
    gpSub.textContent = `Volta 1 • Clima: ${state.weather} • Pista: ${state.trackTemp}°C`;
    weatherLabel.textContent = state.weather;
    trackTempLabel.textContent = `${state.trackTemp}°C`;
    lapCounter.textContent = `1/${state.totalLaps}`;
    raceStatus.textContent = "Correndo";

    // buttons
    speed1.onclick = () => { RS.setSpeed(1); setSpeedActive(1); };
    speed2.onclick = () => { RS.setSpeed(2); setSpeedActive(2); };
    speed4.onclick = () => { RS.setSpeed(4); setSpeedActive(4); };
    setSpeedActive(state.speedMult);

    backLobby.onclick = goLobby;
    backLobby2.onclick = goLobby;

    restartRace.onclick = () => {
      RS.restart();
      hidePodium();
    };

    // render your drivers cards
    renderYourDrivers();

    // init renderer (loads SVG assets/tracks/<track>.svg)
    try {
      await RR.init();
    } catch (e) {
      alert(`Erro na corrida: Falha ao carregar: ${e.message}`);
      return;
    }

    // start loop
    requestAnimationFrame(loop);
  }

  boot();
})();
