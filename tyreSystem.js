// Sistema de pneus realista para a corrida 2D
(function () {
  /* ============================================================
     DEFINIÇÃO DOS COMPOSTOS
     ============================================================ */

  // Cada composto tem:
  // - baseDeg: desgaste médio por volta (%)
  // - wearPenalty: quanto tempo (em "unidades de penalidade") ele perde
  //                quando está desgastado
  // - tempIdeal: temperatura ideal (°C) para melhor rendimento
  window.TyreCompounds = {
    SOFT:  { name: "Soft",          baseDeg: 1.8, wearPenalty: 0.04, tempIdeal: 100 },
    MEDIUM:{ name: "Medium",        baseDeg: 1.2, wearPenalty: 0.03, tempIdeal: 100 },
    HARD:  { name: "Hard",          baseDeg: 0.9, wearPenalty: 0.025,tempIdeal: 100 },
    INTER: { name: "Intermediário", baseDeg: 1.3, wearPenalty: 0.03, tempIdeal: 80  },
    WET:   { name: "Wet",           baseDeg: 1.1, wearPenalty: 0.03, tempIdeal: 60  }
  };

  /* ============================================================
     CRIA UM NOVO SET DE PNEUS
     ============================================================ */
  /**
   * Cria um novo conjunto de pneus a partir do composto escolhido.
   * @param {string} compoundKey - "SOFT" | "MEDIUM" | "HARD" | "INTER" | "WET"
   * @returns {{compound:string, wear:number, temp:number}}
   */
  window.createTyreSet = function (compoundKey) {
    const key = compoundKey && window.TyreCompounds[compoundKey]
      ? compoundKey
      : "MEDIUM";

    return {
      compound: key,
      wear: 0,            // desgaste em %
      temp:  window.TyreCompounds[key].tempIdeal
    };
  };

  /* ============================================================
     ATUALIZA DESGASTE POR VOLTA
     ============================================================ */
  /**
   * Atualiza o desgaste de um set de pneus para uma "unidade" de volta.
   *
   * @param {{compound:string, wear:number, temp:number}} tyreSet
   * @param {number} drivingFactor  - estilo de pilotagem
   *                                  (1.0 = normal, >1 = agressivo, <1 = conservador)
   * @param {number} setupFactor    - influência do setup
   *                                  (1.0 = neutro, >1 = mais agressivo, <1 = mais suave)
   * @returns {number} penalty      - penalidade de performance baseada no desgaste
   */
  window.updateTyresForLap = function (tyreSet, drivingFactor, setupFactor) {
    if (!tyreSet || !tyreSet.compound) return 0;

    const comp  = window.TyreCompounds[tyreSet.compound] || window.TyreCompounds.MEDIUM;
    const drive = drivingFactor || 1;
    const setup = setupFactor   || 1;

    // ========================= CLIMA =========================
    const weather = window.weatherState || { trackTemp: 30, rainLevel: 0 };
    const trackTemp = weather.trackTemp || 30;
    const rainLevel = weather.rainLevel || 0;

    // Diferença de temperatura em relação ao ideal do composto
    const tempDiff = trackTemp - comp.tempIdeal;

    // Fator de temperatura: quanto mais longe do ideal, mais desgaste
    // Aproximadamente +1% de desgaste relativo a cada 5°C fora do ideal
    let tempFactor = 1 + (tempDiff / 50);
    if (tempFactor < 0.85) tempFactor = 0.85;
    if (tempFactor > 1.25) tempFactor = 1.25;

    // Fator de chuva:
    // - Slick (SOFT/MEDIUM/HARD) em chuva → punição grande
    // - INTER/WET no seco → desgaste maior (superaquecendo)
    let rainFactor = 1;
    const isSlick = tyreSet.compound === "SOFT" || tyreSet.compound === "MEDIUM" || tyreSet.compound === "HARD";
    const isWetTyre = tyreSet.compound === "INTER" || tyreSet.compound === "WET";

    if (rainLevel > 0.2) {
      if (isSlick) {
        // slick na chuva se acaba
        rainFactor = 1.4 + rainLevel * 0.6; // de ~1.4 até ~2.0
      } else {
        // pneu de chuva na chuva: um pouco mais de desgaste, mas OK
        rainFactor = 1.0 + rainLevel * 0.2;
      }
    } else {
      if (isWetTyre) {
        // pneu de chuva no seco estraga rápido
        rainFactor = 1.3;
      }
    }

    // ========================= DESGASTE ======================
    // Desgaste base do composto * estilo * setup * clima
    let wearGain = comp.baseDeg * drive * setup * tempFactor * rainFactor;

    tyreSet.wear += wearGain;
    if (tyreSet.wear > 100) tyreSet.wear = 100;
    if (tyreSet.wear < 0) tyreSet.wear = 0;

    // Atualiza temperatura de maneira simples (mais agressivo = mais quente)
    tyreSet.temp += (drive - 1) * 3 + (setup - 1) * 2;
    // também puxa levemente em direção à temperatura da pista
    tyreSet.temp += (trackTemp - tyreSet.temp) * 0.05;

    // ========================= PENALIDADE ====================
    // Penalidade cresce com o desgaste. Ex: 50% de desgaste em SOFT:
    //  penalty ~ 50 * 0.04 = 2.0 (unidade que o raceSystem converte em perda real)
    const penalty = tyreSet.wear * comp.wearPenalty;

    return penalty;
  };

  /* ============================================================
     HELPERS OPCIONAIS PARA HUD
     ============================================================ */

  /**
   * Retorna um nome amigável do composto com desgaste.
   * Exemplo: "Soft (23.4%)"
   */
  window.describeTyreSet = function (tyreSet) {
    if (!tyreSet || !tyreSet.compound) return "-";
    const comp = window.TyreCompounds[tyreSet.compound] || window.TyreCompounds.MEDIUM;
    return `${comp.name} (${tyreSet.wear.toFixed(1)}%)`;
  };

})();
