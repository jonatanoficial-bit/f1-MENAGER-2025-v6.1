// Sistema de corrida 2D com mapa, pneus e pit-stop
(function () {
  // Base interval (ms) for race updates. Can be multiplied by raceSpeedMultiplier
  const baseRaceInterval = 200;
  // Multiplier for race speed (1x, 2x, 4x)
  let raceSpeedMultiplier = 1;
  /**
   * Ajusta a velocidade da corrida. Reinicia o loop de atualização com
   * intervalo proporcional ao multiplicador. Também atualiza o estado
   * visual dos botões na interface (classe 'active').
   * @param {number} mult Multiplicador de velocidade (1, 2 ou 4)
   */
  window.setRaceSpeed = function (mult) {
    // valores válidos: 1, 2 ou 4
    if (![1, 2, 4].includes(mult)) {
      mult = 1;
    }
    raceSpeedMultiplier = mult;
    // Atualiza o estado visual dos botões
    ['speed-1x', 'speed-2x', 'speed-4x'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const btnMult = id === 'speed-1x' ? 1 : id === 'speed-2x' ? 2 : 4;
      if (btnMult === mult) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    // Se já estivermos com a corrida rodando (RACE_STATE ativo),
    // reiniciamos o intervalo principal com o novo multiplicador.
    if (RACE_STATE && RACE_STATE.running) {
      if (raceInterval) clearInterval(raceInterval);
      raceInterval = setInterval(raceTick, baseRaceInterval / raceSpeedMultiplier);
    }
  };

  // Função auxiliar para lançar log de debug (fácil de desligar depois)
  function debugLog(...args) {
    // console.log('[RACE]', ...args);
  }

  /**
   * Gera um traçado estilizado de circuito em forma de "loop"
   * com variações por pista. O retorno é um array de pontos [ {x, y}, ... ]
   * onde x e y variam aproximadamente entre 0 e 1.
   * @param {string} key Nome-chave da pista (ex.: 'bahrain', 'monaco')
   * @param {number} n Número de pontos a gerar
   */
  function generateTrackPath(key, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      let r = 0.45;
      let xMod = 1;
      let yMod = 1;
      // Ajustes específicos por pista para variar a forma do circuito. Estes
      // ajustes modificam o raio (r) e multiplicadores de x/y para criar
      // retas longas, curvas apertadas e chicanes simples.
      switch (key) {
        case 'bahrain':
          // Retas longas e frenagens fortes
          r = 0.42 + 0.05 * Math.sin(2 * t);
          xMod = 1.0;
          yMod = 0.85;
          break;
        case 'jeddah':
          // Circuito de rua rápido e estreito
          r = 0.40 + 0.04 * Math.sin(6 * t);
          xMod = 1.2;
          yMod = 0.6;
          break;
        case 'australia':
          // Albert Park com chicanes
          r = 0.43 + 0.05 * Math.sin(3 * t + Math.cos(5 * t));
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'japan':
          // Suzuka em formato de oito estilizado
          r = 0.40 + 0.06 * Math.sin(2 * t) * Math.cos(3 * t);
          xMod = 1.1;
          yMod = 0.8;
          break;
        case 'china':
          // Xangai com reta em forma de caracol
          r = 0.42 + 0.06 * Math.sin(3 * t);
          xMod = 1.1;
          yMod = 0.8;
          break;
        case 'miami':
          // Mistura de retas e curvas de rua
          r = 0.41 + 0.05 * Math.sin(4 * t + 0.5);
          xMod = 1.1;
          yMod = 0.7;
          break;
        case 'imola':
          // Subidas e descidas clássicas
          r = 0.43 + 0.04 * Math.sin(2 * t) * Math.cos(2 * t);
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'monaco':
          // Circuito de rua mais travado
          r = 0.38 + 0.05 * Math.sin(4 * t);
          xMod = 1.0;
          yMod = 0.7;
          break;
        case 'canada':
          // Retas e chicanes
          r = 0.44 + 0.04 * Math.sin(3 * t);
          xMod = 1.0;
          yMod = 0.85;
          break;
        case 'spain':
          r = 0.43 + 0.05 * Math.sin(2 * t + 0.5 * Math.cos(4 * t));
          xMod = 1.0;
          yMod = 0.88;
          break;
        case 'austria':
          r = 0.41 + 0.06 * Math.sin(2 * t);
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'uk':
        case 'silverstone':
          r = 0.42 + 0.05 * Math.sin(4 * t);
          xMod = 1.1;
          yMod = 0.8;
          break;
        case 'hungary':
          r = 0.39 + 0.05 * Math.sin(3 * t);
          xMod = 1.0;
          yMod = 0.8;
          break;
        case 'belgium':
        case 'spa':
          r = 0.45 + 0.03 * Math.sin(2 * t) + 0.03 * Math.sin(6 * t);
          xMod = 1.0;
          yMod = 0.95;
          break;
        case 'netherlands':
        case 'zandvoort':
          r = 0.40 + 0.06 * Math.sin(3 * t + 0.5);
          xMod = 1.05;
          yMod = 0.85;
          break;
        case 'italy':
        case 'monza':
          r = 0.46 + 0.03 * Math.sin(2 * t);
          xMod = 1.1;
          yMod = 0.9;
          break;
        case 'singapore':
          r = 0.39 + 0.05 * Math.sin(4 * t);
          xMod = 1.0;
          yMod = 0.7;
          break;
        case 'mexico':
          r = 0.44 + 0.04 * Math.sin(3 * t);
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'brazil':
        case 'interlagos':
          r = 0.41 + 0.05 * Math.sin(2 * t + Math.cos(4 * t));
          xMod = 1.0;
          yMod = 0.9;
          break;
        case 'qatar':
          r = 0.42 + 0.04 * Math.sin(4 * t);
          xMod = 1.1;
          yMod = 0.8;
          break;
        case 'abu_dhabi':
        case 'abudhabi':
          r = 0.43 + 0.04 * Math.sin(3 * t);
          xMod = 1.05;
          yMod = 0.85;
          break;
        case 'lasvegas':
          r = 0.40 + 0.06 * Math.sin(3 * t + 0.7);
          xMod = 1.2;
          yMod = 0.6;
          break;
        default:
          // Pista genérica
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

  /**
   * Gera um "pit lane" básico a partir do caminho principal.
   * O pit lane é desenhado como um circuito paralelo deslocado em
   * uma pequena distância, com entrada e saída suave.
   */
  function generatePitLane(mainPath) {
    const n = mainPath.length;
    const pitPath = [];
    for (let i = 0; i < n; i++) {
      const p = mainPath[i];
      // desloca levemente para dentro (cria "linha" de pit paralela)
      const factor = 0.98;
      pitPath.push({ x: 0.5 + (p.x - 0.5) * factor, y: 0.5 + (p.y - 0.5) * factor });
    }
    return pitPath;
  }

  // Escala pontos para o tamanho da pista
  function scalePath(path, width, height) {
    return path.map(p => ({ x: p.x * width, y: p.y * height }));
  }

  // Estado interno da corrida
  let RACE_STATE = null;
  let raceInterval = null;

  /**
   * Atualiza o HUD (piloto, pneus, temperatura, desgaste, etc.)
   */
  function updateHUD() {
    if (!RACE_STATE || !RACE_STATE.running) return;
    const player = RACE_STATE.racers.find(r => r.isPlayer);
    if (!player) return;

    const pilotEl = document.getElementById('hud-piloto');
    const tyreEl = document.getElementById('hud-pneus');
    const wearEl = document.getElementById('hud-desgaste');
    const tempEl = document.getElementById('hud-temp');
    const pitEl = document.getElementById('hud-paradas');

    if (pilotEl) pilotEl.textContent = player.name + ' (' + player.team + ')';
    if (tyreEl) tyreEl.textContent = (player.tyreSet && player.tyreSet.compound) || '-';
    if (wearEl) {
      const w = player.tyreSet ? player.tyreSet.wear.toFixed(1) : 0;
      wearEl.textContent = w + ' %';
    }
    if (tempEl) {
      const temp = player.tyreSet ? player.tyreSet.temperature.toFixed(1) : 0;
      tempEl.textContent = temp + ' ºC';
    }
    if (pitEl) pitEl.textContent = player.pitStopCount || 0;
  }

  /**
   * Atualiza o painel de posições (standings) com base no estado atual.
   */
  function updateStandings() {
    if (!RACE_STATE) return;
    const cont = document.getElementById('race-standings');
    if (!cont) return;
    cont.innerHTML = '';
    const racers = [...RACE_STATE.racers].sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.positionIndex - a.positionIndex;
    });
    racers.forEach((r, index) => {
      const row = document.createElement('div');
      row.className = 'standings-row';
      const pos = document.createElement('div');
      pos.className = 'standings-pos';
      pos.textContent = index + 1;
      const name = document.createElement('div');
      name.className = 'standings-name';
      name.textContent = r.name;
      const team = document.createElement('div');
      team.textContent = r.team || '';
      const gap = document.createElement('div');
      gap.className = 'standings-gap';
      gap.textContent = index === 0 ? 'Líder' : '+' + (index * 0.8).toFixed(1) + 's';
      row.appendChild(pos);
      row.appendChild(name);
      row.appendChild(team);
      row.appendChild(gap);
      cont.appendChild(row);
    });
  }

  /**
   * Atualiza os pneus de um piloto e aplica penalidade de desgaste/temperatura
   */
  function updateTyresForRacer(racer, setupFactor) {
    if (!racer.tyreSet) return 0;
    const drivingFactor = 1.0;
    const penalty = window.updateTyresForLap(racer.tyreSet, drivingFactor, setupFactor || 1.0);
    const weatherFactor = (RACE_STATE && RACE_STATE.weather && RACE_STATE.weather.gripLoss) || 0;
    return penalty + weatherFactor;
  }

  /**
   * Efetua um pit-stop para o piloto, trocando composto se definido.
   */
  function doPitStop(racer) {
    if (!racer.tyreSet) return;
    const result = window.calculatePitTime();
    racer.pitStopCount = (racer.pitStopCount || 0) + 1;
    racer.pitTime = result.time;
    racer.pitError = result.error;
    if (racer.nextCompound && window.TyreCompounds[racer.nextCompound]) {
      racer.tyreSet = window.createTyreSet(racer.nextCompound);
    } else {
      racer.tyreSet = window.createTyreSet(racer.tyreSet.compound);
    }
  }

  /**
   * Atualiza uma volta para cada piloto: posição, desgaste, pit, etc.
   */
  function raceTick() {
    if (!RACE_STATE || !RACE_STATE.running) return;
    const state = RACE_STATE;

    state.currentLap += 0.25;
    if (state.currentLap >= state.totalLaps + 1) {
      state.currentLap = state.totalLaps;
      state.running = false;
      if (raceInterval) clearInterval(raceInterval);
      debugLog('Corrida finalizada');
    }

    state.racers.forEach((racer, idx) => {
      const penalty = updateTyresForRacer(racer, 1.0);
      let deltaPosition = (racer.rating / 100) * (1 - penalty / 50);
      if (racer.isPlayer) {
        deltaPosition *= 1.02;
      }
      racer.positionIndex += deltaPosition;
      const mainPath = state.mainPath;
      const pitPath = state.pitPath;

      const totalMain = mainPath.length;
      const baseIndex = racer.positionIndex % totalMain;

      if (racer.inPit) {
        racer.pitTime -= baseRaceInterval / 1000;
        if (racer.pitTime <= 0) {
          racer.inPit = false;
        }
      } else {
        if (Math.random() < 0.002 && racer.lap > 2 && racer.pitStopCount < 3) {
          racer.inPit = true;
          doPitStop(racer);
        }
      }

      if (racer.positionIndex >= totalMain) {
        racer.lap += 1;
        racer.positionIndex = racer.positionIndex % totalMain;
      }

      const path = racer.inPit ? pitPath : mainPath;
      const totalPath = path.length;
      const posIndex = Math.floor(racer.positionIndex) % totalPath;
      const nextIndex = (posIndex + 1) % totalPath;

      const p = path[posIndex];
      const np = path[nextIndex];
      if (p && np && racer.el) {
        const dx = np.x - p.x;
        const dy = np.y - p.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        racer.el.style.left = p.x + 'px';
        racer.el.style.top = p.y + 'px';
        racer.el.style.transform = 'rotate(' + angle + 'deg)';
      }
    });

    updateHUD();
    updateStandings();
  }

  /**
   * Inicia a Corrida 2D
   * @param {string} gpName
   * @param {Array} driversList
   * @param {number} lapsTotal
   */
  window.startRace2D = function (gpName, driversList, lapsTotal) {
    const totalLaps = lapsTotal || 10;
    document.getElementById('race-standings').innerHTML = '';
    document.getElementById('race-hud').style.display = 'flex';
    document.getElementById('pit-popup').classList.add('hidden');
    document.getElementById('btn-box').disabled = false;

    const titleEl = document.getElementById('corrida-gp-nome');
    if (titleEl) {
      titleEl.textContent = 'Corrida - ' + gpName;
    }
    const trackImg = document.getElementById('track-image');
    // tenta carregar imagem correspondente, fallback para monaco
    const trackKey = gpName.toLowerCase().replace(/\s+/g, '_');
    const possibleNames = [
      trackKey + '.svg.svg',
      trackKey + '.svg',
      trackKey + '.png',
      trackKey + '.jpg',
      trackKey + '.webp'
    ];
    let loaded = false;
    for (const name of possibleNames) {
      const path = 'assets/tracks/' + name;
      trackImg.src = path;
      loaded = true;
      break;
    }
    if (!loaded) {
      trackImg.src = 'assets/tracks/monaco.svg.svg';
    }
    const trackContainer = document.getElementById('track-container');
    const carsLayer = document.getElementById('cars-layer');
    trackImg.onload = function () {
      const width = trackContainer.clientWidth;
      const height = trackContainer.clientHeight;
      const basePath = generateTrackPath(gpName, 400);
      const basePit = generatePitLane(basePath);
      const mainPath = scalePath(basePath, width, height);
      const pitPath = scalePath(basePit, width, height);
      const racers = driversList.map((p, idx) => {
        const tyreSet = createTyreSet('MEDIUM');
        return {
          name: p.nome,
          team: p.equipe,
          rating: p.rating,
          tyreSet: tyreSet,
          pitStopCount: 0,
          inPit: false,
          pitTime: 0,
          pitError: null,
          nextCompound: null,
          lap: 0,
          positionIndex: idx * 5,
          el: null,
          isPlayer: idx === 0,
          order: idx
        };
      });
      carsLayer.innerHTML = '';
      racers.forEach((racer) => {
        const carImg = document.createElement('img');
        carImg.className = 'car-icon';
        carImg.src = 'assets/cars/' + (racer.team || 'generic') + '.png';
        carImg.style.left = (trackContainer.clientWidth / 2) + 'px';
        carImg.style.top = (trackContainer.clientHeight / 2) + 'px';
        carsLayer.appendChild(carImg);
        racer.el = carImg;
      });
      RACE_STATE = {
        running: true,
        totalLaps: totalLaps,
        currentLap: 1,
        racers,
        mainPath,
        pitPath,
        weather: window.prepareWeatherForRace ? window.prepareWeatherForRace() : null
      };
      if (raceInterval) clearInterval(raceInterval);
      raceInterval = setInterval(raceTick, baseRaceInterval / raceSpeedMultiplier);
      setRaceSpeed(raceSpeedMultiplier);
      updateHUD();
      updateStandings();
    };
  };
})();
