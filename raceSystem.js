// ============================================================
// RACE SYSTEM 2D – F1 MANAGER 2025
// Usa mapa da pista, pneus, pit-stop e tabela completa.
// ============================================================
(function () {
  // Intervalo base (ms) – será dividido por 1x/2x/4x
  const BASE_INTERVAL = 200;
  let speedMultiplier = 1;
  let raceTimer = null;

  /** Estado interno da corrida */
  let STATE = null;

  // ------------------------------------------------------------
  // Utilidades de HUD (funciona com os dois layouts possíveis)
  // ------------------------------------------------------------
  function setHudValue(idList, value) {
    idList.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  // ------------------------------------------------------------
  // CONTROLE DE VELOCIDADE (1x / 2x / 4x)
  // ------------------------------------------------------------
  window.setRaceSpeed = function (mult) {
    if (![1, 2, 4].includes(mult)) mult = 1;
    speedMultiplier = mult;

    ['speed-1x', 'speed-2x', 'speed-4x'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const val = id === 'speed-1x' ? 1 : id === 'speed-2x' ? 2 : 4;
      if (val === mult) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (STATE && STATE.running) {
      if (raceTimer) clearInterval(raceTimer);
      raceTimer = setInterval(tickRace, BASE_INTERVAL / speedMultiplier);
    }
  };

  // ------------------------------------------------------------
  // GERAÇÃO DO TRAÇADO (normalizado 0–1)
  // ------------------------------------------------------------
  function generateTrackPath(key, n) {
    const pts = [];
    const k = (key || '').toLowerCase();

    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      let r = 0.44;
      let xMod = 1.0;
      let yMod = 0.9;

      switch (k) {
        case 'bahrain':
          r = 0.42 + 0.05 * Math.sin(2 * t);
          xMod = 1.05;
          yMod = 0.85;
          break;
        case 'jeddah':
          r = 0.40 + 0.04 * Math.sin(6 * t);
          xMod = 1.25;
          yMod = 0.7;
          break;
        case 'australia':
          r = 0.43 + 0.05 * Math.sin(3 * t + Math.cos(5 * t));
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'monaco':
          r = 0.38 + 0.06 * Math.sin(4 * t);
          xMod = 0.9;
          yMod = 1.05;
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
          yMod = 0.9;
          break;
      }

      const x = 0.5 + r * Math.cos(t) * xMod;
      const y = 0.5 + r * Math.sin(t) * yMod;
      pts.push({ x, y });
    }
    return pts;
  }

  function generatePitLane(mainPath) {
    const factor = 0.9; // “para dentro” da pista principal
    return mainPath.map((p) => ({
      x: 0.5 + (p.x - 0.5) * factor,
      y: 0.5 + (p.y - 0.5) * factor
    }));
  }

  function scalePath(path, width, height, margin = 0.08) {
    const w = width * (1 - margin * 2);
    const h = height * (1 - margin * 2);
    const offX = width * margin;
    const offY = height * margin;

    return path.map((p) => ({
      x: offX + p.x * w,
      y: offY + p.y * h
    }));
  }

  // ------------------------------------------------------------
  // RENDERIZAÇÃO – TABELA E HUD
  // ------------------------------------------------------------
  function renderStandings() {
    const el = document.getElementById('race-standings');
    if (!el || !STATE) return;

    const racers = STATE.racers;
    if (!racers || !racers.length) {
      el.innerHTML = '';
      return;
    }

    const mainLen = STATE.mainPath.length;
    const leader = racers[0];

    let html = '<table><thead><tr>' +
      '<th>Pos</th><th>Piloto</th><th>Volta</th><th>Gap</th>' +
      '<th>Pneu</th><th>Desg.</th><th>Pits</th>' +
      '</tr></thead><tbody>';

    racers.forEach((d, i) => {
      let gapTxt = 'Líder';
      if (i > 0) {
        const diffIndex =
          (leader.lap - d.lap) * mainLen +
          (leader.positionIndex - d.positionIndex);
        const seconds = Math.max(0, diffIndex * 0.04);
        gapTxt = '+' + seconds.toFixed(1) + 's';
      }

      let tyreName = '-';
      let wearTxt = '-';
      if (d.tyreSet) {
        if (window.TyreCompounds &&
            window.TyreCompounds[d.tyreSet.compound]) {
          tyreName = window.TyreCompounds[d.tyreSet.compound].name;
        } else {
          tyreName = d.tyreSet.compound;
        }
        wearTxt = d.tyreSet.wear.toFixed(0) + '%';
      }

      html += '<tr>' +
        `<td>${i + 1}</td>` +
        `<td>${d.name}</td>` +
        `<td>${d.lap + 1}</td>` +
        `<td>${gapTxt}</td>` +
        `<td>${tyreName}</td>` +
        `<td>${wearTxt}</td>` +
        `<td>${d.pitStopCount || 0}</td>` +
        '</tr>';
    });

    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function renderHud(player) {
    if (!player || !player.tyreSet) return;

    // Piloto / pneus / desgaste / temperatura / paradas (para layouts antigos e novos)
    setHudValue(['hud-piloto', 'hud-piloto-valor'], player.name);

    let tyreName = player.tyreSet.compound;
    if (window.TyreCompounds &&
        window.TyreCompounds[player.tyreSet.compound]) {
      tyreName = window.TyreCompounds[player.tyreSet.compound].name;
    }

    setHudValue(['hud-tyre', 'hud-pneus', 'hud-pneus-valor'], tyreName);
    setHudValue(
      ['hud-wear', 'hud-desgaste', 'hud-desgaste-valor'],
      player.tyreSet.wear.toFixed(0)
    );

    const virtTemp = 80 + player.tyreSet.wear * 0.4;
    setHudValue(['hud-temp', 'hud-temp-valor'], virtTemp.toFixed(0));
    setHudValue(
      ['hud-paradas', 'hud-paradas-valor'],
      String(player.pitStopCount || 0)
    );

    // Lap indicator
    const lapEl = document.getElementById('lap-indicator');
    if (lapEl && STATE) {
      const cur = Math.min(player.lap + 1, STATE.totalLaps);
      lapEl.textContent = 'Volta ' + cur + ' / ' + STATE.totalLaps;
    }
  }

  // ------------------------------------------------------------
  // LOOP PRINCIPAL DA CORRIDA
  // ------------------------------------------------------------
  function tickRace() {
    if (!STATE || !STATE.running) return;

    const { mainPath, pitPath } = STATE;
    const len = mainPath.length;

    STATE.racers.forEach((d) => {
      if (d.inPit) {
        d.pitTime -= BASE_INTERVAL / 1000;
        if (d.pitTime <= 0) {
          d.inPit = false;
          d.pitStopCount = (d.pitStopCount || 0) + 1;

          if (window.createTyreSet) {
            d.tyreSet = window.createTyreSet(d.nextCompound || d.tyreSet.compound);
          }
        }
      } else {
        // Desgaste dos pneus
        let penalty = 0;
        if (window.updateTyresForLap && d.tyreSet) {
          penalty = window.updateTyresForLap(d.tyreSet, 1.0, 1.0);
        }
        penalty = Math.min(Math.max(penalty, 0), 20);

        const baseSpeed = 3 + (d.rating - 80) * 0.15;
        const speed = Math.max(1, baseSpeed - penalty * 0.05);

        d.positionIndex += speed;
        if (d.positionIndex >= len) {
          d.positionIndex -= len;
          d.lap += 1;
        }

        // Decisão de box (IA)
        if (!d.isPlayer && !d.inPit && window.decideAiPit) {
          if (window.decideAiPit(d, STATE)) {
            d.inPit = true;
            if (window.calculatePitTime) {
              const pit = window.calculatePitTime();
              d.pitTime = pit.time;
              d.pitError = pit.error;
            } else {
              d.pitTime = 3;
              d.pitError = null;
            }

            if (window.chooseNextCompoundForAi) {
              d.nextCompound = window.chooseNextCompoundForAi(d, STATE);
            } else {
              d.nextCompound =
                d.tyreSet.compound === 'SOFT'
                  ? 'MEDIUM'
                  : d.tyreSet.compound === 'MEDIUM'
                  ? 'HARD'
                  : 'SOFT';
            }
          }
        }
      }

      // Atualiza posição visual
      const path = d.inPit ? pitPath : mainPath;
      const idx = Math.floor(d.positionIndex) % path.length;
      const nextIdx = (idx + 1) % path.length;
      const p = path[idx];
      const np = path[nextIdx];

      if (p && np && d.el) {
        const dx = np.x - p.x;
        const dy = np.y - p.y;
        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
        d.el.style.left = p.x + 'px';
        d.el.style.top = p.y + 'px';
        d.el.style.transform = 'rotate(' + ang + 'deg)';
      }
    });

    // Ordena grid
    STATE.racers.sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.positionIndex - a.positionIndex;
    });

    renderStandings();
    const player = STATE.racers.find((r) => r.isPlayer);
    if (player) renderHud(player);

    const leader = STATE.racers[0];
    if (leader && leader.lap >= STATE.totalLaps) {
      STATE.running = false;
      if (raceTimer) clearInterval(raceTimer);
    }
  }

  // ------------------------------------------------------------
  // INICIALIZAÇÃO DA CORRIDA
  // ------------------------------------------------------------
  window.startRace2D = function (trackKey, driversList, lapsTotal) {
    const totalLaps = lapsTotal || 10;

    const standingsEl = document.getElementById('race-standings');
    if (standingsEl) standingsEl.innerHTML = '';

    const lapEl = document.getElementById('lap-indicator');
    if (lapEl) lapEl.textContent = 'Volta 1 / ' + totalLaps;

    const hudEl = document.getElementById('race-hud');
    if (hudEl) hudEl.style.display = 'flex';

    const popup = document.getElementById('pit-popup');
    if (popup) popup.classList.add('hidden');

    const boxBtn = document.getElementById('btn-box');
    if (boxBtn) boxBtn.disabled = false;

    const trackImg = document.getElementById('track-image');
    const trackContainer = document.getElementById('track-container');
    const carsLayer = document.getElementById('cars-layer');
    if (!trackImg || !trackContainer || !carsLayer) return;

    // Garante grid completo: se lista tiver poucos pilotos, usa PILOTOS
    let grid = [];
    if (driversList && driversList.length >= 10) {
      grid = driversList;
    } else if (typeof PILOTOS !== 'undefined') {
      grid = PILOTOS;
    } else {
      grid = driversList || [];
    }

    const key = (trackKey || 'monaco').toLowerCase();
    const candidates = [
      'assets/tracks/' + key + '.svg.svg',
      'assets/tracks/' + key + '.svg',
      'assets/tracks/' + key + '.png',
      'assets/tracks/' + key + '.jpg',
      'assets/tracks/' + key + '.webp'
    ];
    trackImg.src = candidates[0];

    trackImg.onload = function () {
      const w = trackContainer.clientWidth || 600;
      const h = trackContainer.clientHeight || 400;

      const baseMain = generateTrackPath(key, 500);
      const basePit = generatePitLane(baseMain);
      const mainPath = scalePath(baseMain, w, h);
      const pitPath = scalePath(basePit, w, h);

      const racers = grid.map((p, idx) => {
        const tyreSet = window.createTyreSet
          ? window.createTyreSet('MEDIUM')
          : { compound: 'MEDIUM', wear: 0 };
        return {
          name: p.nome || p.name || 'Piloto ' + (idx + 1),
          team: p.equipe || p.team || '',
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
          isPlayer: idx === 0,
          order: idx
        };
      });

      carsLayer.innerHTML = '';
      racers.forEach((d) => {
        const img = document.createElement('img');
        img.className = 'car-icon';
        const teamKey = (d.team || 'generic').toLowerCase().replace(/\s+/g, '_');
        img.src = 'assets/cars/' + teamKey + '.png';
        img.alt = d.name;
        carsLayer.appendChild(img);
        d.el = img;
      });

      STATE = {
        running: true,
        totalLaps,
        mainPath,
        pitPath,
        racers
      };

      if (raceTimer) clearInterval(raceTimer);
      raceTimer = setInterval(tickRace, BASE_INTERVAL / speedMultiplier);
    };
  };

  // ------------------------------------------------------------
  // COMANDO DE BOX (JOGADOR)
  // ------------------------------------------------------------
  window.comandarBox = function () {
    if (!STATE || !STATE.running) return;
    const player = STATE.racers.find((r) => r.isPlayer);
    if (!player || player.inPit) return;

    const popup = document.getElementById('pit-popup');
    const opts = document.getElementById('pit-tyre-options');
    if (!popup || !opts) return;

    popup.classList.remove('hidden');
    opts.innerHTML = '';

    const compounds = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
    compounds.forEach((c) => {
      if (!window.TyreCompounds || !window.TyreCompounds[c]) return;
      const btn = document.createElement('button');
      btn.textContent = window.TyreCompounds[c].name;
      btn.onclick = function () {
        player.inPit = true;
        if (window.calculatePitTime) {
          const pit = window.calculatePitTime();
          player.pitTime = pit.time;
          player.pitError = pit.error;
        } else {
          player.pitTime = 3;
          player.pitError = null;
        }
        player.nextCompound = c;
        popup.classList.add('hidden');
      };
      opts.appendChild(btn);
    });
  };

  window.cancelarBox = function () {
    const popup = document.getElementById('pit-popup');
    if (popup) popup.classList.add('hidden');
  };

  window.stopRace2D = function () {
    if (raceTimer) clearInterval(raceTimer);
    raceTimer = null;
    STATE = null;
  };
})();
