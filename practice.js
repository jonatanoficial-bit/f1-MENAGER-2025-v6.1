/* =========================================================
   PRACTICE SYSTEM — TL (Ligado ao Mercado de Pilotos)
   - Usa os mesmos pilotos do Mercado
   - Rating + Form influenciam pace
   - Ajusta Form para Quali
========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "f1m2025_career_v61";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function loadCareer() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveCareer(st) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  function getDrivers() {
    if (window.PilotMarketSystem) {
      return PilotMarketSystem.getTeams()
        .flatMap(t => PilotMarketSystem.getActiveDriversForTeam(t));
    }
    return [];
  }

  function simulatePractice() {
    const st = loadCareer();
    if (!st) return;

    const results = [];
    const drivers = getDrivers();

    drivers.forEach(p => {
      const rating = clamp(p.rating || 75, 40, 99);
      const form = clamp(p.form || 55, 0, 100);

      // TL: influência maior do carro do que do piloto
      const lapTime =
        90 -
        rating * 0.03 -
        form * 0.015 +
        Math.random() * 1.2;

      results.push({
        driverId: p.id,
        teamKey: p.teamKey,
        lapTime: Number(lapTime.toFixed(3))
      });

      // leve ajuste de form
      p.form = clamp(p.form + (lapTime < 89 ? 1 : -0.5), 0, 100);
    });

    results.sort((a, b) => a.lapTime - b.lapTime);

    st.season = st.season || {};
    st.season.session = st.season.session || {};
    st.season.session.practiceResults = results;

    saveCareer(st);

    console.log("✅ Treino livre concluído");
  }

  document.addEventListener("DOMContentLoaded", simulatePractice);
})();
