// ============================================================
// RACE SYSTEM 2D – F1 MANAGER 2025
// Usa mapa SVG, pneus, pit-stop e grid completo (20 pilotos).
// ============================================================
(function () {
  const BASE_INTERVAL = 250;          // ms base do loop
  let raceSpeedMultiplier = 1;        // 1x, 2x, 4x
  let raceInterval = null;
  let RACE_STATE = null;

  // =========================
  // CONTROLE DE VELOCIDADE
  // =========================
  window.setRaceSpeed = function (mult) {
    if (![1, 2, 4].includes(mult)) mult = 1;
    raceSpeedMultiplier = mult;

    ['speed-1x', 'speed-2x', 'speed-4x'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const btnMult = id === 'speed-1x' ? 1 : id === 'speed-2x' ? 2 : 4;
      if (btnMult === mult) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (RACE_STATE && RACE_STATE.running) {
      if (raceInterval) clearInterval(raceInterval);
      raceInterval = setInterval(raceTick, BASE_INTERVAL / raceSpeedMultiplier);
    }
  };

  // =========================
  // TRAÇADO DA PISTA
  // =========================
  function generateTrackPath(key, n) {
    const pts = [];
    key = (key || '').toLowerCase();

    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      let r = 0.45;
      let xMod = 1;
      let yMod = 1;

      switch (key) {
        case 'bahrain':
          r = 0.42 + 0.05 * Math.sin(2 * t);
          xMod = 1.05;
          yMod = 0.85;
          break;
        case 'jeddah':
          r = 0.40 + 0.04 * Math.sin(6 * t);
          xMod = 1.2;
          yMod = 0.65;
          break;
        case 'australia':
          r = 0.43 + 0.05 * Math.sin(3 * t + Math.cos(5 * t));
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'monaco':
          r = 0.38 + 0.05 * Math.sin(4 * t);
          xMod = 1.0;
          yMod = 0.7;
          break;
        case 'imola':
          r = 0.43 + 0.04 * Math.sin(2 * t) * Math.cos(2 * t);
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'interlagos':
        case 'brazil':
          r = 0.41 + 0.05 * Math.sin(2 * t + Math.cos(4 * t));
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'monza':
          r = 0.46 + 0.03 * Math.sin(2 * t);
          xMod = 1.1;
          yMod = 0.9;
          break;
        case 'spa':
        case 'belgium':
          r = 0.45 + 0.03 * Math.sin(2 * t) + 0.03 * Math.sin(6 * t);
          xMod = 1.0;
          yMod = 0.95;
          break;
        case 'lasvegas':
          r = 0.40 + 0.06 * Math.sin(3 * t + 0.7);
          xMod = 1.25;
          yMod = 0.6;
          break;
        default:
          r = 0.44 + 0.04 * Math.sin(3 * t);
          xMod = 1.0;
          yMod = 0.85;
          break;
      }

      const x = 0.5 + r * Math.cos(t) * xMod;
      const y = 0.5 + r * Math.sin(t) * yMod;
      pts.push({ x, y });
    }
    return pts;
  }

  function generatePitLane(mainPath) {
    return mainPath.map((p) => {
      const factor = 0.92; // “para dentro”
      return {
        x: 0.5 + (p.x - 0.5) * factor,
        y: 0.5 + (p.y - 0.5) * factor
      };
    });
  }

  function scalePath(path, width, height, margin = 0.08) {
    const w = width * (1 - margin * 2);
    const h = height * (1 - margin * 2);
    const offsetX = width * margin;
    const offsetY = height * margin;

    return path.map((p) => ({
      x: offsetX + p.x * w,
      y: offsetY + p.y * h
    }));
  }

  // =========================
  // RENDERIZAÇÃO: TABELA / HUD
  // =========================
  function renderStandings() {
    const standingsEl = document.getElementById('race-standings');
    if (!standingsEl || !RACE_STATE) return;

    const racers = RACE_STATE.racers;
    if (!racers || !racers.length) {
      standingsEl.innerHTML = '';
      return;
    }

    const mainLen = RACE_STATE.mainPath.length;
    const leader = racers[0];

    let html = '<table><thead><tr>' +
      '<th>Pos</th><th>Piloto</th><th>Volta</th><th>Gap</th>' +
      '<th>Pneu</th><th>Desg.</th><th>Pits</th>' +
      '</tr></thead><tbody>';

    racers.forEach((dr, idx) => {
      let gapText = 'Líder';
      if (idx > 0) {
        const diffIndex =
          (leader.lap - dr.lap) * mainLen +
          (leader.positionIndex - dr.positionIndex);
        const seconds = Math.max(0, diffIndex * 0.04);
        gapText = '+' + seconds.toFixed(1) + 's';
      }
      const tyreName = dr.tyreSet && window.TyreCompounds
        ? (window.TyreCompounds[dr.tyreSet.compound] || {}).name || dr.tyreSet.compound
        : '-';
      const wear = dr.tyreSet ? dr.tyreSet.wear.toFixed(0) + '%' : '-';

      html += `<tr>
        <td>${idx + 1}</td>
        <td>${dr.name}</td>
        <td>${dr.lap + 1}</td>
        <td>${gapText}</td>
        <td>${tyreName}</td>
        <td>${wear}</td>
        <td>${dr.pitStopCount || 0}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    standingsEl.innerHTML = html;
  }

  function renderHud(player) {
    if (!player || !player.tyreSet) return;

    // IDs em português, batendo com o HTML
    const pilotEl = document.getElementById('hud-piloto');
    const tyreEl = document.getElementById('hud-pneus');
    const wearEl = document.getElementById('hud-desgaste');
    const tempEl = document.getElementById('hud-temp');
    const pitEl = document.getElementById('hud-paradas');

    if (pilotEl) pilotEl.textContent = player.name + ' (' + (player.team || '') + ')';

    if (tyreEl) {
      const comp = window.TyreCompounds
        ? (window.TyreCompounds[player.tyreSet.compound] || {}).name || player.tyreSet.compound
        : player.tyreSet.compound;
      tyreEl.textContent = comp;
    }

    if (wearEl) wearEl.textContent = player.tyreSet.wear.toFixed(0) + '%';

    const virtTemp = 80 + player.tyreSet.wear * 0.4;
    if (tempEl) tempEl.textContent = virtTemp.toFixed(0) + ' ºC';

    if (pitEl) pitEl.textContent = player.pitStopCount || 0;

    const lapIndicator = document.getElementById('lap-indicator');
    if (lapIndicator && RACE_STATE) {
      const currentLap = Math.min(player.lap + 1, RACE_STATE.lapsTotal);
      lapIndicator.textContent =
        'Volta ' + currentLap + ' / ' + RACE_STATE.lapsTotal;
    }
  }

  // =========================
  // LÓGICA PRINCIPAL
  // =========================
  function raceTick() {
    if (!RACE_STATE || !RACE_STATE.running) return;

    const { mainPath, pitPath } = RACE_STATE;
    const racers = RACE_STATE.racers;
    const pathLen = mainPath.length;

    racers.forEach((dr) => {
      if (dr.inPit) {
        // Contagem do tempo de pit
        dr.pitTime -= BASE_INTERVAL / 1000;
        if (dr.pitTime <= 0) {
          dr.inPit = false;
          dr.pitStopCount = (dr.pitStopCount || 0) + 1;
          if (window.createTyreSet) {
            dr.tyreSet = window.createTyreSet(dr.nextCompound || dr.tyreSet.compound);
          }
          dr.pitError = null;
        }
      } else {
        // Desgaste / penalidade de pneus
        let penalty = 0;
        if (window.updateTyresForLap && dr.tyreSet) {
          penalty = window.updateTyresForLap(dr.tyreSet, 1.0, 1.0);
        }
        penalty = Math.min(Math.max(penalty, 0), 20); // trava para não “matar” o carro

        // Velocidade base bem maior para a corrida andar (3–6 por tick)
        const baseSpeed = 3 + (dr.rating - 80) * 0.15;
        const speed = Math.max(1, baseSpeed - penalty * 0.05);

        dr.positionIndex += speed;

        if (dr.positionIndex >= pathLen) {
          dr.positionIndex -= pathLen;
          dr.lap += 1;
        }

        // IA decide ir ao box
        if (!dr.isPlayer && !dr.inPit && window.decideAiPit) {
          if (window.decideAiPit(dr, RACE_STATE)) {
            dr.inPit = true;
            if (window.calculatePitTime) {
              const pitInfo = window.calculatePitTime();
              dr.pitTime = pitInfo.time;
              dr.pitError = pitInfo.error;
            } else {
              dr.pitTime = 3;
              dr.pitError = null;
            }
            if (window.chooseNextCompoundForAi) {
              dr.nextCompound = window.chooseNextCompoundForAi(dr, RACE_STATE);
            } else {
              dr.nextCompound =
                dr.tyreSet.compound === 'SOFT'
                  ? 'MEDIUM'
                  : dr.tyreSet.compound === 'MEDIUM'
                  ? 'HARD'
                  : 'SOFT';
            }
          }
        }
      }

      // Movimento visual
      const path = dr.inPit ? pitPath : mainPath;
      const idx = Math.floor(dr.positionIndex) % path.length;
      const nextIdx = (idx + 1) % path.length;
      const p = path[idx];
      const np = path[nextIdx];

      if (p && np && dr.el) {
        const dx = np.x - p.x;
        const dy = np.y - p.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        dr.el.style.left = p.x + 'px';
        dr.el.style.top = p.y + 'px';
        dr.el.style.transform = 'rotate(' + angle + 'deg)';
      }
    });

    // Ordena grid
    racers.sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.positionIndex - a.positionIndex;
    });

    renderStandings();
    const player = racers.find((r) => drIsPlayer(dr = r)); // truque só pra não quebrar
    if (player) renderHud(player);

    // Fim de corrida: líder completou todas as voltas
    const leader = racers[0];
    if (leader && leader.lap >= RACE_STATE.lapsTotal) {
      RACE_STATE.running = false;
      if (raceInterval) clearInterval(raceInterval);
    }
  }

  function drIsPlayer(dr) {
    return dr && dr.isPlayer;
  }

  // =========================
  // INÍCIO DA CORRIDA
  // =========================
  window.startRace2D = function (trackKey, driversList, totalLaps) {
    const laps = totalLaps || 10;

    const standingsEl = document.getElementById('race-standings');
    if (standingsEl) standingsEl.innerHTML = '';

    const lapInd = document.getElementById('lap-indicator');
    if (lapInd) lapInd.textContent = 'Volta 1 / ' + laps;

    const trackImg = document.getElementById('track-image');
    const trackContainer = document.getElementById('track-container');
    const carsLayer = document.getElementById('cars-layer');
    if (!trackImg || !trackContainer || !carsLayer) return;

    // GRID COMPLETO: se vier só 2 pilotos do script, completa com const PILOTOS (20)
    let grid;
    if (driversList && driversList.length >= 10) {
      grid = driversList;
    } else if (typeof PILOTOS !== 'undefined') {
      grid = PILOTOS; // usa 20 pilotos do data.js
    } else {
      grid = driversList || [];
    }

    const key = (trackKey || 'monaco').toLowerCase().replace(/\s+/g, '_');
    const candidates = [
      'assets/tracks/' + key + '.svg.svg',
      'assets/tracks/' + key + '.svg',
      'assets/tracks/' + key + '.png',
      'assets/tracks/' + key + '.jpg',
      'assets/tracks/' + key + '.webp'
    ];
    trackImg.src = candidates[0];

    trackImg.onload = function () {
      const width = trackContainer.clientWidth || 600;
      const height = trackContainer.clientHeight || 400;

      const basePath = generateTrackPath(key, 500);
      const basePit = generatePitLane(basePath);

      const mainPath = scalePath(basePath, width, height);
      const pitPath = scalePath(basePit, width, height);

      const racers = (grid || []).map((p, idx) => {
        const tyreSet = window.createTyreSet
          ? window.createTyreSet('MEDIUM')
          : { compound: 'MEDIUM', wear: 0 };
        return {
          name: p.nome || p.name || 'Piloto ' + (idx + 1),
          team: (p.equipe || p.team || '').toLowerCase(),
          rating: p.rating || 80,
          tyreSet,
          pitStopCount: 0,
          inPit: false,
          pitTime: 0,
          pitError: null,
          nextCompound: null,
          lap: 0,
          positionIndex: idx * 10,
          el: null,
          isPlayer: idx === 0, // primeiro é o jogador
          order: idx
        };
      });

      carsLayer.innerHTML = '';
      racers.forEach((dr) => {
        const img = document.createElement('img');
        img.className = 'car-icon';
        const teamKey = (dr.team || 'generic').toLowerCase().replace(/\s+/g, '_');
        img.src = 'assets/cars/' + teamKey + '.png';
        img.alt = dr.name;
        carsLayer.appendChild(img);
        dr.el = img;
      });

      RACE_STATE = {
        running: true,
        lapsTotal: laps,
        mainPath,
        pitPath,
        racers
      };

      if (raceInterval) clearInterval(raceInterval);
      raceInterval = setInterval(raceTick, BASE_INTERVAL / raceSpeedMultiplier);
      setRaceSpeed(raceSpeedMultiplier);
    };
  };

  // =========================
  // COMANDO DE BOX (JOGADOR)
  // =========================
  window.comandarBox = function () {
    if (!RACE_STATE || !RACE_STATE.running) return;
    const player = RACE_STATE.racers.find((r) => r.isPlayer);
    if (!player || player.inPit) return;

    const popup = document.getElementById('pit-popup');
    const optionsEl = document.getElementById('pit-tyre-options');
    if (!popup || !optionsEl) return;

    popup.classList.remove('hidden');
    optionsEl.innerHTML = '';

    const compounds = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
    compounds.forEach((c) => {
      if (!window.TyreCompounds || !window.TyreCompounds[c]) return;
      const btn = document.createElement('button');
      btn.textContent = window.TyreCompounds[c].name;
      btn.onclick = function () {
        player.inPit = true;
        if (window.calculatePitTime) {
          const pitInfo = window.calculatePitTime();
          player.pitTime = pitInfo.time;
          player.pitError = pitInfo.error;
        } else {
          player.pitTime = 3;
          player.pitError = null;
        }
        player.nextCompound = c;
        popup.classList.add('hidden');
      };
      optionsEl.appendChild(btn);
    });
  };

  window.cancelarBox = function () {
    const popup = document.getElementById('pit-popup');
    if (popup) popup.classList.add('hidden');
  };

  window.stopRace2D = function () {
    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = null;
    }
    RACE_STATE = null;
  };
})();
