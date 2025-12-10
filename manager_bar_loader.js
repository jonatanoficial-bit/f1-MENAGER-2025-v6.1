// MANAGER_BAR_LOADER.JS
// Carrega dados básicos do manager + time na topbar

(function () {
  function qs(id) {
    return document.getElementById(id);
  }

  try {
    const managerRaw = localStorage.getItem("f1m2025_user_manager");
    const teamKey =
      localStorage.getItem("f1m2025_user_team") || "mercedes";

    const manager = managerRaw ? JSON.parse(managerRaw) : null;

    const teamLogos = {
      redbull: "assets/logos/redbull.png",
      ferrari: "assets/logos/ferrari.png",
      mercedes: "assets/logos/mercedes.png",
      mclaren: "assets/logos/mclaren.png",
      aston: "assets/logos/aston.png",
      alpine: "assets/logos/alpine.png",
      racingbulls: "assets/logos/racingbulls.png",
      sauber: "assets/logos/sauber.png",
      haas: "assets/logos/haas.png",
      williams: "assets/logos/williams.png",
    };

    const teamNames = {
      redbull: "Oracle Red Bull Racing",
      ferrari: "Scuderia Ferrari",
      mercedes: "Mercedes-AMG Petronas F1 Team",
      mclaren: "McLaren Formula 1 Team",
      aston: "Aston Martin Aramco F1 Team",
      alpine: "BWT Alpine F1 Team",
      racingbulls: "Visa Cash App RB F1 Team",
      sauber: "Stake F1 Team Kick Sauber (Audi)",
      haas: "MoneyGram Haas F1 Team",
      williams: "Williams Racing",
    };

    const logoEl = qs("topbar-team-logo");
    const teamNameEl = qs("topbar-team-name");
    if (logoEl && teamLogos[teamKey]) {
      logoEl.src = teamLogos[teamKey];
    }
    if (teamNameEl && teamNames[teamKey]) {
      teamNameEl.textContent = teamNames[teamKey];
    }

    if (manager) {
      const nameEls = document.querySelectorAll(
        "#topbar-manager-name, #footer-manager-name"
      );
      nameEls.forEach((el) => {
        if (el) el.textContent = manager.name || "Manager";
      });

      const avatarEl = qs("topbar-manager-avatar");
      if (avatarEl && manager.avatar) avatarEl.src = manager.avatar;

      const countryEl = qs("topbar-manager-country");
      if (countryEl && manager.countryName) {
        countryEl.textContent = manager.countryName;
      }

      const flagWrap = qs("topbar-manager-flag-wrapper");
      if (flagWrap && manager.flagCode) {
        flagWrap.innerHTML =
          '<img src="assets/flags/' +
          manager.flagCode +
          '.png" style="width:18px;height:18px;border-radius:999px;">';
      }
    }
  } catch (e) {
    console.warn("Erro carregando barra do manager:", e);
  }
})();
