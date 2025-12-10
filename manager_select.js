// =============================================
// MANAGER_SELECT.JS
// Tela de escolha de manager, bandeira e time
// =============================================
const ManagerData = (function () {
  const TEAMS = [
    { key: "redbull", name: "Oracle Red Bull Racing", logo: "assets/logos/redbull.png" },
    { key: "ferrari", name: "Scuderia Ferrari", logo: "assets/logos/ferrari.png" },
    { key: "mercedes", name: "Mercedes-AMG Petronas F1 Team", logo: "assets/logos/mercedes.png" },
    { key: "mclaren", name: "McLaren Formula 1 Team", logo: "assets/logos/mclaren.png" },
    { key: "aston", name: "Aston Martin Aramco F1 Team", logo: "assets/logos/aston.png" },
    { key: "alpine", name: "BWT Alpine F1 Team", logo: "assets/logos/alpine.png" },
    { key: "racingbulls", name: "Visa Cash App RB F1 Team", logo: "assets/logos/racingbulls.png" },
    { key: "sauber", name: "Stake F1 Team Kick Sauber (Audi)", logo: "assets/logos/sauber.png" },
    { key: "haas", name: "MoneyGram Haas F1 Team", logo: "assets/logos/haas.png" },
    { key: "williams", name: "Williams Racing", logo: "assets/logos/williams.png" },
  ];

  // use apenas códigos de países que você tem em assets/flags
  const COUNTRIES = [
    { code: "br", name: "Brasil" },
    { code: "gb", name: "Reino Unido" },
    { code: "it", name: "Itália" },
    { code: "fr", name: "França" },
    { code: "de", name: "Alemanha" },
    { code: "es", name: "Espanha" },
    { code: "nl", name: "Holanda" },
    { code: "au", name: "Austrália" },
    { code: "ca", name: "Canadá" },
    { code: "us", name: "Estados Unidos" },
    { code: "jp", name: "Japão" },
    { code: "mx", name: "México" },
    { code: "ar", name: "Argentina" },
    { code: "fi", name: "Finlândia" },
  ];

  const REAL_MANAGERS = [
    {
      id: "wolff",
      name: "Toto Wolff",
      teamKey: "mercedes",
      countryCode: "at",
      countryName: "Áustria",
      photo: "assets/managers_real/wolff.png",
    },
    {
      id: "horner",
      name: "Christian Horner",
      teamKey: "redbull",
      countryCode: "gb",
      countryName: "Reino Unido",
      photo: "assets/managers_real/horner.png",
    },
    {
      id: "vasseur",
      name: "Frédéric Vasseur",
      teamKey: "ferrari",
      countryCode: "fr",
      countryName: "França",
      photo: "assets/managers_real/vasseur.png",
    },
    {
      id: "stella",
      name: "Andrea Stella",
      teamKey: "mclaren",
      countryCode: "it",
      countryName: "Itália",
      photo: "assets/managers_real/stella.png",
    },
    {
      id: "komatsu",
      name: "Ayao Komatsu",
      teamKey: "haas",
      countryCode: "jp",
      countryName: "Japão",
      photo: "assets/managers_real/komatsu.png",
    },
    {
      id: "vowles",
      name: "James Vowles",
      teamKey: "williams",
      countryCode: "gb",
      countryName: "Reino Unido",
      photo: "assets/managers_real/vowles.png",
    },
    {
      id: "mekies",
      name: "Laurent Mekies",
      teamKey: "racingbulls",
      countryCode: "fr",
      countryName: "França",
      photo: "assets/managers_real/mekies.png",
    },
    {
      id: "alunni",
      name: "Alunni Bravi",
      teamKey: "sauber",
      countryCode: "it",
      countryName: "Itália",
      photo: "assets/managers_real/alunni.png",
    },
    {
      id: "krack",
      name: "Mike Krack",
      teamKey: "aston",
      countryCode: "lu",
      countryName: "Luxemburgo",
      photo: "assets/managers_real/krack.png",
    },
    {
      id: "images",
      name: "Diretor Esportivo",
      teamKey: "alpine",
      countryCode: "fr",
      countryName: "França",
      photo: "assets/managers_real/images.png",
    },
  ];

  const AVATARS = [
    "assets/managers/manager_ethnic_01.png",
    "assets/managers/manager_ethnic_02.png",
    "assets/managers/manager_ethnic_03.png",
    "assets/managers/manager_ethnic_04.png",
    "assets/managers/manager_ethnic_05.png",
    "assets/managers/manager_ethnic_06.png",
  ];

  return { TEAMS, COUNTRIES, REAL_MANAGERS, AVATARS };
})();

// =============================================

const ManagerUI = (function () {
  let mode = "real";
  let selectedRealId = null;
  let selectedAvatar = ManagerData.AVATARS[0];
  let selectedCountryCode = "br";
  let selectedTeamKey = "mercedes";

  function qs(id) {
    return document.getElementById(id);
  }

  function renderRealManagers() {
    const container = qs("manager-real-grid");
    if (!container) return;
    container.innerHTML = "";

    ManagerData.REAL_MANAGERS.forEach((m) => {
      const team = ManagerData.TEAMS.find((t) => t.key === m.teamKey);
      const card = document.createElement("article");
      card.className = "manager-card-select";
      card.dataset.id = m.id;
      card.innerHTML = `
        <div class="manager-card-photo">
          <img src="${m.photo}" alt="${m.name}">
        </div>
        <div class="manager-card-name">${m.name}</div>
        <div class="manager-card-team">${team ? team.name : ""}</div>
        <div class="manager-card-meta">
          <span>${m.countryName}</span>
          <span>${
            m.countryCode
              ? `<img src="assets/flags/${m.countryCode}.png" style="width:16px;height:16px;border-radius:999px;">`
              : ""
          }</span>
        </div>
      `;
      card.addEventListener("click", () => selectRealManager(m.id));
      container.appendChild(card);
    });
  }

  function renderCustomAvatars() {
    const container = qs("manager-custom-grid");
    if (!container) return;
    container.innerHTML = "";

    ManagerData.AVATARS.forEach((src) => {
      const card = document.createElement("article");
      card.className = "manager-card-select";
      card.dataset.avatar = src;
      card.innerHTML = `
        <div class="manager-card-photo">
          <img src="${src}" alt="Avatar">
        </div>
        <div class="manager-card-name">Avatar personalizado</div>
        <div class="manager-card-meta">
          <span>Use para criar seu próprio manager</span>
        </div>
      `;
      card.addEventListener("click", () => selectAvatar(src));
      container.appendChild(card);
    });

    selectAvatar(selectedAvatar);
  }

  function renderCountries() {
    const select = qs("select-country");
    if (!select) return;
    select.innerHTML = "";

    ManagerData.COUNTRIES.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = c.name;
      select.appendChild(opt);
    });

    select.value = selectedCountryCode;
    select.addEventListener("change", () => {
      selectedCountryCode = select.value;
      updateSummaryFromInputs();
    });
  }

  function renderTeams() {
    const select = qs("select-team");
    if (!select) return;
    select.innerHTML = "";

    ManagerData.TEAMS.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.key;
      opt.textContent = t.name;
      select.appendChild(opt);
    });

    select.value = selectedTeamKey;
    select.addEventListener("change", () => {
      selectedTeamKey = select.value;
      updateTeamPreview();
    });

    updateTeamPreview();
  }

  function updateTeamPreview() {
    const t = ManagerData.TEAMS.find((team) => team.key === selectedTeamKey);
    const logoEl = qs("team-preview-logo");
    const nameEl = qs("team-preview-name");
    if (t && logoEl && nameEl) {
      logoEl.src = t.logo;
      nameEl.textContent = t.name;
    }
  }

  function selectRealManager(id) {
    selectedRealId = id;
    const m = ManagerData.REAL_MANAGERS.find((x) => x.id === id);
    if (!m) return;

    selectedAvatar = m.photo;
    selectedCountryCode = m.countryCode || "br";
    selectedTeamKey = m.teamKey || "mercedes";

    const nameInput = qs("input-name");
    if (nameInput) nameInput.value = m.name;

    const countrySelect = qs("select-country");
    if (countrySelect) countrySelect.value = selectedCountryCode;

    const teamSelect = qs("select-team");
    if (teamSelect) teamSelect.value = selectedTeamKey;

    updateTeamPreview();
    updateSummary(m.name, selectedAvatar, selectedCountryCode, m.countryName);

    document
      .querySelectorAll(".manager-card-select")
      .forEach((el) => el.classList.remove("is-selected"));
    const active = document.querySelector(
      `.manager-card-select[data-id="${id}"]`
    );
    if (active) active.classList.add("is-selected");
  }

  function selectAvatar(src) {
    selectedAvatar = src;
    updateSummaryFromInputs();

    document
      .querySelectorAll("#manager-custom-grid .manager-card-select")
      .forEach((el) => el.classList.remove("is-selected"));
    const active = document.querySelector(
      `.manager-card-select[data-avatar="${src}"]`
    );
    if (active) active.classList.add("is-selected");
  }

  function updateSummaryFromInputs() {
    const nameInput = qs("input-name");
    const name = nameInput && nameInput.value ? nameInput.value : "Novo Manager";
    const country = ManagerData.COUNTRIES.find(
      (c) => c.code === selectedCountryCode
    );
    updateSummary(
      name,
      selectedAvatar,
      selectedCountryCode,
      country ? country.name : ""
    );
  }

  function updateSummary(name, avatarSrc, countryCode, countryName) {
    const avatarEl = qs("summary-avatar");
    const nameEl = qs("summary-name");
    const flagWrap = qs("summary-flag");
    const countryEl = qs("summary-country");

    if (avatarEl && avatarSrc) avatarEl.src = avatarSrc;
    if (nameEl) nameEl.textContent = name || "Novo Manager";

    if (flagWrap) {
      if (countryCode) {
        flagWrap.innerHTML =
          '<img src="assets/flags/' +
          countryCode +
          '.png" style="width:18px;height:18px;border-radius:999px;">';
      } else {
        flagWrap.innerHTML = "";
      }
    }
    if (countryEl) countryEl.textContent = countryName || "";
  }

  function switchMode(newMode) {
    mode = newMode;
    const tabReal = qs("tab-real");
    const tabCustom = qs("tab-custom");
    const gridReal = qs("manager-real-grid");
    const gridCustom = qs("manager-custom-grid");

    if (tabReal && tabCustom) {
      tabReal.classList.toggle("is-active", mode === "real");
      tabCustom.classList.toggle("is-active", mode === "custom");
    }
    if (gridReal && gridCustom) {
      gridReal.style.display = mode === "real" ? "grid" : "none";
      gridCustom.style.display = mode === "custom" ? "grid" : "none";
    }

    updateSummaryFromInputs();
  }

  function saveAndContinue() {
    const nameInput = qs("input-name");
    const name = nameInput && nameInput.value ? nameInput.value : "Novo Manager";

    const country = ManagerData.COUNTRIES.find(
      (c) => c.code === selectedCountryCode
    );

    const payload = {
      name,
      avatar: selectedAvatar,
      countryCode: selectedCountryCode,
      countryName: country ? country.name : "",
      flagCode: selectedCountryCode,
      teamKey: selectedTeamKey,
      mode,
      realId: selectedRealId,
    };

    try {
      localStorage.setItem("f1m2025_user_manager", JSON.stringify(payload));
      localStorage.setItem("f1m2025_user_team", selectedTeamKey);
    } catch (e) {
      console.warn("Erro salvando manager:", e);
    }

    window.location.href = "lobby.html";
  }

  function initFromStorage() {
    try {
      const raw = localStorage.getItem("f1m2025_user_manager");
      if (!raw) {
        updateSummaryFromInputs();
        return;
      }
      const saved = JSON.parse(raw);
      selectedAvatar = saved.avatar || selectedAvatar;
      selectedCountryCode = saved.flagCode || saved.countryCode || "br";
      selectedTeamKey = saved.teamKey || "mercedes";

      const nameInput = qs("input-name");
      if (nameInput) nameInput.value = saved.name || "Novo Manager";

      const countrySelect = qs("select-country");
      if (countrySelect) countrySelect.value = selectedCountryCode;

      const teamSelect = qs("select-team");
      if (teamSelect) teamSelect.value = selectedTeamKey;

      updateTeamPreview();
      updateSummary(
        saved.name,
        selectedAvatar,
        selectedCountryCode,
        saved.countryName
      );
    } catch (e) {
      console.warn("Erro lendo manager salvo:", e);
    }
  }

  function init() {
    renderRealManagers();
    renderCustomAvatars();
    renderCountries();
    renderTeams();
    initFromStorage();
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    switchMode,
    saveAndContinue,
  };
})();

window.ManagerUI = ManagerUI;
