// Sistema de corrida 2D com pista procedural, pneus e pit-stop simples
(function () {
  const baseRaceInterval = 200;
  let raceSpeedMultiplier = 1;
  let raceInterval = null;
  let RACE_STATE = null;

  window.weatherState = window.weatherState || { trackTemp: 32, rainLevel: 0 };

  /* ==============================
     VELOCIDADE
     ============================== */
  window.setRaceSpeed = function (mult) {
    if (![1, 2, 4].includes(mult)) mult = 1;
    raceSpeedMultiplier = mult;

    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = setInterval(updateRace2D, baseRaceInterval / raceSpeedMultiplier);
    }

    const controls = document.getElementById("race-speed-controls");
    if (controls) {
      controls.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
      const btn = document.getElementById(`speed-${mult}x`);
      if (btn) btn.classList.add("active");
    }
  };

  /* ==============================
     PISTA
     ============================== */

  function generateTrackPath(key, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      let r = 0.43;
      let xMod = 1;
      let yMod = 0.9;

      switch (key) {
        case "bahrain":
          r = 0.42 + 0.05 * Math.sin(2 * t);
          xMod = 1.0; yMod = 0.85; break;
        case "jeddah":
          r = 0.40 + 0.04 * Math.sin(6 * t);
          xMod = 1.2; yMod = 0.6; break;
        case "australia":
          r = 0.43 + 0.05 * Math.sin(3 * t + Math.cos(5 * t));
          xMod = 1.0; yMod = 0.9; break;
        case "japan":
          r = 0.40 + 0.06 * Math.sin(2 * t) * Math.cos(3 * t);
          xMod = 1.1; yMod = 0.8; break;
        case "china":
          r = 0.38 + 0.08 * Math.sin(t + Math.sin(4 * t));
          xMod = 1.0; yMod = 0.9; break;
        case "miami":
          r = 0.44 + 0.04 * Math.sin(4 * t);
          xMod = 1.1; yMod = 0.7; break;
        case "imola":
          r = 0.45 + 0.04 * Math.sin(3 * t);
          xMod = 0.95; yMod = 1.0; break;
        case "monaco":
          r = 0.40 + 0.05 * Math.sin(5 * t + 0.5);
          xMod = 1.05; yMod = 0.75; break;
        case "canada":
          r = 0.43 + 0.05 * Math.sin(2 * t + Math.sin(4 * t));
          xMod = 1.0; yMod = 0.85; break;
        case "spain":
          r = 0.44 + 0.04 * Math.sin(3 * t);
          xMod = 1.0; yMod = 0.9; break;
        case "austria":
          r = 0.41 + 0.05 * Math.sin(2 * t);
          xMod = 1.1; yMod = 0.8; break;
        case "silverstone":
          r = 0.42 + 0.05 * Math.sin(3 * t + Math.sin(2 * t));
          xMod = 1.1; yMod = 0.9; break;
        case "hungary":
          r = 0.39 + 0.05 * Math.sin(4 * t);
          xMod = 0.95; yMod = 1.0; break;
        case "spa":
          r = 0.44 + 0.06 * Math.sin(2 * t) * Math.cos(3 * t);
          xMod = 1.05; yMod = 0.9; break;
        case "zandvoort":
          r = 0.42 + 0.05 * Math.sin(4 * t);
          xMod = 1.0; yMod = 0.88; break;
        case "monza":
          r = 0.40 + 0.04 * Math.sin(2 * t);
          xMod = 1.2; yMod = 0.7; break;
        case "baku":
          r = 0.41 + 0.06 * Math.sin(3 * t + Math.sin(2 * t));
          xMod = 1.15; yMod = 0.75; break;
        case "singapore":
          r = 0.39 + 0.05 * Math.sin(5 * t);
          xMod = 1.0; yMod = 0.8; break;
        case "cota":
          r = 0.43 + 0.04 * Math.sin(3 * t + Math.sin(4 * t));
          xMod = 1.05; yMod = 0.9; break;
        case "mexico":
          r = 0.42 + 0.05 * Math.sin(3 * t);
          xMod = 1.0; yMod = 0.9; break;
        case "interlagos":
          r = 0.41 + 0.05 * Math.sin(3 * t + Math.cos(4 * t));
          xMod = 1.05; yMod = 0.9; break;
        case "lasvegas":
          r = 0.42 + 0.04 * Math.sin(4 * t);
          xMod = 1.1; yMod = 0.7; break;
        case "qatar":
          r = 0.43 + 0.04 * Math.sin(3 * t);
          xMod = 1.0; yMod = 0.9; break;
        case "abudhabi":
          r = 0.42 + 0.05 * Math.sin(3 * t + Math.sin(2 * t));
          xMod = 1.05; yMod = 0.9; break;
        default:
          r = 0.43 + 0.04 * Math.sin(3 * t);
          xMod = 1.0; yMod = 0.9;
      }

      const x = 0.5 + r * Math.cos(t) * xMod;
      const y = 0.5 + r * Math.sin(t) * yMod;
      pts.push({ x, y });
    }
    return pts;
  }

  function generatePitLane(mainPath) {
    return mainPath.map(p => ({
      x: 0.5 + 0.3 * (p.x - 0.5),
      y: 0.5 + 0.3 * (p.y - 0.5)
    }));
  }

  function scalePath(path, width, height) {
    return path.map(p => ({ x: p.x * width, y: p.y * height }));
  }

  /* ==============================
     START RACE
     ============================== */

  window.startRace2D = function (gpKey, driversList, lapsTotal) {
    const totalLaps = lapsTotal || 10;

    const titleEl = document.getElementById("corrida-gp-nome");
    if (titleEl) titleEl.textContent = "Corrida - " + gpKey.toUpperCase();

    const trackImg = document.getElementById("track-image");
    const trackContainer = document.getElementById("track-container");
    const carsLayer = document.getElementById("cars-layer");
    const standingsEl = document.getElementById("race-standings");
    const hudEl = document.getElementById("race-hud");
    const pitPopup = document.getElementById("pit-popup");
    const boxBtn = document.getElementById("btn-box");
    const lapIndicator = document.getElementById("lap-indicator");

    if (standingsEl) standingsEl.innerHTML = "";
    if (pitPopup) pitPopup.classList.add("hidden");
    if (boxBtn) boxBtn.disabled = false;
    if (hudEl) hudEl.style.display = "flex";

    if (trackImg) {
      trackImg.src = "assets/tracks/" + gpKey + ".png";
    }

    if (!trackContainer || !carsLayer) return;

    const width = trackContainer.clientWidth || 800;
    const height = trackContainer.clientHeight || 450;

    const basePathNorm = generateTrackPath(gpKey, 400);
    const pitPathNorm = generatePitLane(basePathNorm);
    const mainPath = scalePath(basePathNorm, width, height);
    const pitPath = scalePath(pitPathNorm, width, height);

    const racers = driversList.map((p, idx) => {
      const tyreSet = typeof createTyreSet === "function"
        ? createTyreSet("MEDIUM")
        : { compound: "MEDIUM", wear: 0, temp: 90 };

      const carEl = document.createElement("div");
      carEl.className = "car-icon";
      carEl.style.backgroundColor = idx === 0 ? "#ffd700" : "#e10600";
      carEl.title = p.nome;
      carsLayer.appendChild(carEl);

      return {
        nome: p.nome,
        equipe: p.equipe,
        rating: p.rating || 90,
        pais: p.pais,
        avatar: p.avatar,
        tyreSet,
        pitStopCount: 0,
        inPit: false,
        pitTime: 0,
        lap: 0,
        posIndex: idx * 5,
        el: carEl,
        isPlayer: idx === 0
      };
    });

    RACE_STATE = {
      gpKey,
      mainPath,
      pitPath,
      racers,
      lapsTotal: totalLaps,
      finished: false
    };

    if (lapIndicator) lapIndicator.textContent = "Volta 1 / " + totalLaps;

    if (raceInterval) clearInterval(raceInterval);
    raceInterval = setInterval(updateRace2D, baseRaceInterval / raceSpeedMultiplier);

    if (boxBtn) {
      boxBtn.onclick = function () {
        abrirBox();
      };
    }
  };

  /* ==============================
     LOOP
     ============================== */

  function updateRace2D() {
    if (!RACE_STATE || RACE_STATE.finished) return;

    const mainPath = RACE_STATE.mainPath;
    const pitPath = RACE_STATE.pitPath;
    const racers = RACE_STATE.racers;
    const lapsTotal = RACE_STATE.lapsTotal;

    racers.forEach(dr => {
      if (dr.inPit) {
        dr.pitTime -= 0.2;
        if (dr.pitTime <= 0) {
          dr.inPit = false;
          dr.pitStopCount++;
          if (dr.nextCompound) {
            dr.tyreSet = createTyreSet(dr.nextCompound);
            dr.nextCompound = null;
          } else {
            dr.tyreSet = createTyreSet(dr.tyreSet.compound);
          }
        }
      } else {
        let setupFactor = 1;
        if (window.JOGO && JOGO.setup) {
          const s = JOGO.setup;
          const asa = (s.asa || 0.5) - 0.5;
          const susp = (s.suspensao || 0.5) - 0.5;
          const alt = 0.5 - (s.altura || 0.5);
          const dif = (s.diferencial || 0.5) - 0.5;
          setupFactor = 1 + (asa * 0.10 + susp * 0.06 + alt * 0.08 + dif * 0.06);
          if (setupFactor < 0.9) setupFactor = 0.9;
          if (setupFactor > 1.1) setupFactor = 1.1;
        }

        const drivingFactor = dr.isPlayer ? 1.0 : 1.05;
        const penalty = typeof updateTyresForLap === "function"
          ? updateTyresForLap(dr.tyreSet, drivingFactor, setupFactor)
          : 0;

        let speed = 1 + (dr.rating - 80) / 80;
        speed *= setupFactor;
        speed -= penalty * 0.2;

        dr.posIndex += speed;

        if (dr.posIndex >= mainPath.length) {
          dr.posIndex -= mainPath.length;
          dr.lap++;
          if (dr.lap >= lapsTotal) {
            RACE_STATE.finished = true;
          }
        }

        if (!dr.isPlayer && !dr.inPit) {
          if (dr.tyreSet.wear > 60 && dr.lap > 2 && dr.lap < lapsTotal - 1) {
            iniciarPitStopIA(dr);
          }
        }
      }

      const path = dr.inPit ? pitPath : mainPath;
      const coords = path[Math.floor(dr.posIndex) % path.length];
      if (coords && dr.el) {
        dr.el.style.left = coords.x + "px";
        dr.el.style.top = coords.y + "px";
      }
    });

    racers.sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.posIndex - a.posIndex;
    });

    renderStandings();
    atualizarHud();

    if (RACE_STATE.finished) {
      finalizarCorrida();
    }
  }

  /* ==============================
     PIT
     ============================== */

  function iniciarPitStopIA(dr) {
    dr.inPit = true;
    dr.pitTime = 2.5 + Math.random() * 1.5;
    dr.nextCompound = dr.tyreSet.compound === "SOFT" ? "MEDIUM" : "HARD";
  }

  window.abrirBox = function () {
    const popup = document.getElementById("pit-popup");
    if (popup) popup.classList.remove("hidden");
  };

  window.confirmarBox = function (compoundKey) {
    if (!RACE_STATE) return;
    const player = RACE_STATE.racers.find(r => r.isPlayer);
    if (!player || player.inPit) return;

    player.inPit = true;
    player.pitTime = 2.4 + Math.random() * 1.6;
    player.nextCompound = compoundKey || "SOFT";

    const popup = document.getElementById("pit-popup");
    if (popup) popup.classList.add("hidden");
  };

  window.cancelarBox = function () {
    const popup = document.getElementById("pit-popup");
    if (popup) popup.classList.add("hidden");
  };

  /* ==============================
     STANDINGS + HUD
     ============================== */

  function renderStandings() {
    const container = document.getElementById("race-standings");
    if (!container || !RACE_STATE) return;

    const racers = RACE_STATE.racers;
    let html = "<table><thead><tr><th>#</th><th>Piloto</th><th>Volta</th><th>Pits</th><th>Composto</th><th>Desgaste</th></tr></thead><tbody>";

    racers.forEach((dr, idx) => {
      const comp = window.TyreCompounds && window.TyreCompounds[dr.tyreSet.compound]
        ? window.TyreCompounds[dr.tyreSet.compound].name
        : dr.tyreSet.compound;
      html += `<tr>
        <td>${idx + 1}</td>
        <td>${dr.nome}</td>
        <td>${dr.lap}/${RACE_STATE.lapsTotal}</td>
        <td>${dr.pitStopCount}</td>
        <td>${comp}</td>
        <td>${dr.tyreSet.wear.toFixed(1)}%</td>
      </tr>`;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function atualizarHud() {
    if (!RACE_STATE) return;
    const player = RACE_STATE.racers.find(r => r.isPlayer);
    if (!player) return;

    const lapIndicator = document.getElementById("lap-indicator");
    if (lapIndicator) {
      const lapShown = Math.min(RACE_STATE.lapsTotal, Math.max(1, player.lap + 1));
      lapIndicator.textContent = "Volta " + lapShown + " / " + RACE_STATE.lapsTotal;
    }

    const elDriver = document.getElementById("hud-driver");
    const elTyre = document.getElementById("hud-tyre");
    const elWear = document.getElementById("hud-wear");
    const elTemp = document.getElementById("hud-temp");
    const elStops = document.getElementById("hud-stops");

    if (elDriver) elDriver.textContent = player.nome;
    if (elTyre) {
      const comp = window.TyreCompounds && window.TyreCompounds[player.tyreSet.compound]
        ? window.TyreCompounds[player.tyreSet.compound].name
        : player.tyreSet.compound;
      elTyre.textContent = comp;
    }
    if (elWear) elWear.textContent = player.tyreSet.wear.toFixed(1);
    if (elTemp) elTemp.textContent = player.tyreSet.temp.toFixed(0);
    if (elStops) elStops.textContent = player.pitStopCount;
  }

  /* ==============================
     FINAL DA CORRIDA / PÓDIO
     ============================== */

  function finalizarCorrida() {
    if (!RACE_STATE) return;
    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = null;
    }

    if (window.JOGO) {
      JOGO.resultadoCorrida = RACE_STATE.racers.map((dr, idx) => ({
        posicao: idx + 1,
        piloto: {
          nome: dr.nome,
          equipe: dr.equipe,
          pais: dr.pais,
          avatar: dr.avatar
        }
      }));
      JOGO.ultimaCorrida = RACE_STATE.gpKey;
    }

    if (typeof window.irParaPodio === "function") {
      window.irParaPodio();
    }

    RACE_STATE = null;
  }

  /* ==============================
     PARAR CORRIDA MANUALMENTE
     ============================== */
  window.stopRace2D = function () {
    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = null;
    }
    RACE_STATE = null;
  };

})();
