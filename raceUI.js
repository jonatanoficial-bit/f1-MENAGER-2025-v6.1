/* ==========================================================
   RACE UI SYSTEM — ÚNICA CAMADA DE INTERFACE DA CORRIDA
   - NÃO recria DOM
   - NÃO apaga botões
   - NÃO perde faces
   - Compatível com TODAS as pistas
========================================================== */

const RaceUI = (() => {

  const facesBasePath = "assets/faces/";

  // ==========================
  // UTIL
  // ==========================
  function getFace(driver) {
    if (!driver || !driver.code) return null;
    return `${facesBasePath}${driver.code}.png`;
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // ==========================
  // HEADER
  // ==========================
  function updateHeader(race) {
    document.getElementById("gp-name").textContent = race.name;
    document.getElementById("gp-meta").textContent =
      `Volta ${race.currentLap} · ${race.weather} · ${race.trackTemp}°C`;

    const flag = document.getElementById("gp-flag");
    if (race.flag) flag.src = race.flag;
  }

  // ==========================
  // MAPA / STATUS
  // ==========================
  function updateTrackStatus(race) {
    document.getElementById("lap-info").textContent =
      `${race.currentLap}/${race.totalLaps}`;
    document.getElementById("race-state").textContent = race.state;
    document.getElementById("weather-info").textContent = race.weather;
    document.getElementById("track-temp").textContent = `${race.trackTemp}°C`;
  }

  // ==========================
  // SESSÃO (GRID / TEMPOS)
  // ==========================
  function renderSession(drivers) {
    const container = document.getElementById("session-list");
    container.innerHTML = "";

    drivers.forEach((d, i) => {
      const row = el("div", "session-row");

      const pos = el("div", "pos", i + 1);
      const info = el(
        "div",
        "info",
        `<strong>${d.name}</strong><br><span>${d.team}</span>`
      );
      const time = el(
        "div",
        "time",
        d.gap === 0 ? "LEADER" : `+${d.gap.toFixed(3)}`
      );

      row.append(pos, info, time);
      container.appendChild(row);
    });
  }

  // ==========================
  // PILOTOS DO JOGADOR
  // ==========================
  function renderPlayerDrivers(playerDrivers) {
    const container = document.getElementById("player-drivers");
    container.innerHTML = "";

    playerDrivers.forEach(driver => {
      const card = el("div", "driver-card");

      // FACE
      const face = el("img", "driver-face");
      const faceSrc = getFace(driver);
      if (faceSrc) face.src = faceSrc;

      // INFO
      const info = el(
        "div",
        "driver-info",
        `<strong>${driver.name}</strong>
         <span>${driver.team}</span>`
      );

      // STATUS
      const status = el(
        "div",
        "driver-status",
        `
        <div>Pneu: ${driver.tyre}</div>
        <div>Carro: ${driver.carWear}%</div>
        <div>ERS: ${driver.ers}%</div>
        `
      );

      // CONTROLES
      const controls = el("div", "driver-controls");

      const pitBtn = el("button", "btn pit", "PIT");
      pitBtn.onclick = () => RaceSystem.callPit(driver.id);

      const ecoBtn = el("button", "btn eco", "ECONOMIZAR");
      ecoBtn.onclick = () => RaceSystem.setMode(driver.id, "eco");

      const atkBtn = el("button", "btn attack", "ATAQUE");
      atkBtn.onclick = () => RaceSystem.setMode(driver.id, "attack");

      const motorMinus = el("button", "btn", "MOTOR -");
      motorMinus.onclick = () => RaceSystem.adjustMotor(driver.id, -1);

      const motorPlus = el("button", "btn", "MOTOR +");
      motorPlus.onclick = () => RaceSystem.adjustMotor(driver.id, 1);

      const agMinus = el("button", "btn", "AGRESS -");
      agMinus.onclick = () => RaceSystem.adjustAggress(driver.id, -1);

      const agPlus = el("button", "btn", "AGRESS +");
      agPlus.onclick = () => RaceSystem.adjustAggress(driver.id, 1);

      controls.append(
        pitBtn,
        ecoBtn,
        atkBtn,
        motorMinus,
        motorPlus,
        agMinus,
        agPlus
      );

      card.append(face, info, status, controls);
      container.appendChild(card);
    });
  }

  // ==========================
  // RESULTADOS / PÓDIO
  // ==========================
  function showResults(results) {
    const overlay = document.getElementById("results-overlay");
    overlay.innerHTML = "";
    overlay.classList.remove("hidden");

    const title = el("h1", null, "RESULTADO FINAL");
    overlay.appendChild(title);

    results.slice(0, 3).forEach((d, i) => {
      const row = el("div", "podium-row");

      const pos = el("div", "podium-pos", `${i + 1}º`);
      const face = el("img", "podium-face");
      face.src = getFace(d);

      const name = el("div", "podium-name", d.name);

      row.append(pos, face, name);
      overlay.appendChild(row);
    });

    const btn = el("button", "btn-back", "VOLTAR AO LOBBY");
    btn.onclick = () => window.location.href = "lobby.html";

    overlay.appendChild(btn);
  }

  // ==========================
  // API PÚBLICA
  // ==========================
  return {
    updateHeader,
    updateTrackStatus,
    renderSession,
    renderPlayerDrivers,
    showResults
  };

})();
