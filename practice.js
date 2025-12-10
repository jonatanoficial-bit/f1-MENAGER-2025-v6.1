// ==========================================================
// F1 MANAGER 2025 – PRACTICE.JS (Treino Livre)
// ----------------------------------------------------------
// Arquivo pensado para:
//
// - Ler parâmetros de URL (track, gp, userTeam)
// - Popular cabeçalho (equipe + manager)
// - Carregar o SVG da pista (sem interferir em qualy/corrida)
// - Controlar navegação: calendário, oficina, qualy
// - Controlar botões de velocidade da simulação de treino
//
// NÃO altera nada de qualifying.js ou race.js.
// ==========================================================

// ----------------------------------------------------------
// Configuração de equipes (nome + logo + país base)
// Ajuste os caminhos de logo se for necessário.
// ----------------------------------------------------------
const TEAMS_2025 = {
  redbull: {
    name: "Oracle Red Bull Racing",
    logo: "assets/teams/redbull.png",
    countryCode: "at",
    countryName: "Áustria"
  },
  ferrari: {
    name: "Scuderia Ferrari",
    logo: "assets/teams/ferrari.png",
    countryCode: "it",
    countryName: "Itália"
  },
  mercedes: {
    name: "Mercedes-AMG Petronas",
    logo: "assets/teams/mercedes.png",
    countryCode: "de",
    countryName: "Alemanha"
  },
  mclaren: {
    name: "McLaren",
    logo: "assets/teams/mclaren.png",
    countryCode: "gb",
    countryName: "Reino Unido"
  },
  aston: {
    name: "Aston Martin",
    logo: "assets/teams/aston.png",
    countryCode: "gb",
    countryName: "Reino Unido"
  },
  alpine: {
    name: "BWT Alpine F1 Team",
    logo: "assets/teams/alpine.png",
    countryCode: "fr",
    countryName: "França"
  },
  racingbulls: {
    name: "Visa Cash App RB",
    logo: "assets/teams/racingbulls.png",
    countryCode: "it",
    countryName: "Itália"
  },
  sauber: {
    name: "Stake F1 Team Kick Sauber",
    logo: "assets/teams/sauber.png",
    countryCode: "ch",
    countryName: "Suíça"
  },
  haas: {
    name: "MoneyGram Haas F1 Team",
    logo: "assets/teams/haas.png",
    countryCode: "us",
    countryName: "Estados Unidos"
  },
  williams: {
    name: "Williams Racing",
    logo: "assets/teams/williams.png",
    countryCode: "gb",
    countryName: "Reino Unido"
  }
};

// ----------------------------------------------------------
// Defaults de manager (caso ainda não exista nada salvo)
// ----------------------------------------------------------
const DEFAULT_MANAGER_PROFILE = {
  name: "Manager Player",
  avatar: "assets/managers/manager_ethnic_01.png",
  countryCode: "br",
  countryName: "Brasil"
};

// chave no localStorage para perfil do manager
const MANAGER_PROFILE_KEY = "f1m2025_manager_profile";

// chave para salvar setup do treino (que depois a corrida pode ler)
const PRACTICE_SETUP_KEY = "f1m2025_practice_setup";

// ----------------------------------------------------------
// Utilitários
// ----------------------------------------------------------
function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getParamOrStorage(name, storageKey, defaultValue) {
  const fromUrl = getParam(name);
  if (fromUrl) return fromUrl;

  try {
    const val = localStorage.getItem(storageKey);
    if (val) return val;
  } catch (e) {
    console.warn("Não foi possível ler localStorage para", storageKey, e);
  }

  return defaultValue;
}

function loadManagerProfile() {
  try {
    const raw = localStorage.getItem(MANAGER_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_MANAGER_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MANAGER_PROFILE,
      ...parsed
    };
  } catch (e) {
    console.warn("Erro lendo perfil do manager:", e);
    return { ...DEFAULT_MANAGER_PROFILE };
  }
}

function savePracticeSetup(setupObj) {
  try {
    localStorage.setItem(PRACTICE_SETUP_KEY, JSON.stringify(setupObj));
  } catch (e) {
    console.warn("Não foi possível salvar setup de treino:", e);
  }
}

function loadPracticeSetup() {
  try {
    const raw = localStorage.getItem(PRACTICE_SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Erro lendo setup de treino:", e);
    return null;
  }
}

// ----------------------------------------------------------
// Carregar cabeçalho (equipe + manager)
// ----------------------------------------------------------
function preencherHeaderPractice(trackKey, gpName, userTeamKey) {
  // equipe
  const teamData = TEAMS_2025[userTeamKey] || TEAMS_2025["ferrari"];

  const logoEl = document.getElementById("header-team-logo");
  const nameEl = document.getElementById("header-team-name");
  if (logoEl) {
    logoEl.src = teamData.logo;
    logoEl.alt = teamData.name;
  }
  if (nameEl) {
    nameEl.textContent = teamData.name;
  }

  // GP e sessão no título
  const gpEl = document.getElementById("practice-gp-name");
  if (gpEl) {
    gpEl.textContent = gpName || "Grande Prêmio 2025";
  }

  // manager
  const manager = loadManagerProfile();

  const mAvatar = document.getElementById("header-manager-avatar");
  const mName = document.getElementById("header-manager-name");
  const mFlag = document.getElementById("header-manager-flag");
  const mCountryName = document.getElementById("header-manager-country-name");

  if (mAvatar) {
    mAvatar.src = manager.avatar;
    mAvatar.alt = manager.name;
  }
  if (mName) mName.textContent = manager.name;
  if (mFlag) {
    mFlag.src = "assets/flags/" + (manager.countryCode || "br") + ".png";
    mFlag.alt = manager.countryName || "País";
  }
  if (mCountryName) {
    mCountryName.textContent = manager.countryName || "Brasil";
  }

  // se já existe um setup salvo de treino, exibir
  const saved = loadPracticeSetup();
  if (saved) {
    const wings = document.getElementById("setup-wings");
    const susp  = document.getElementById("setup-suspension");
    const eng   = document.getElementById("setup-engine");
    const tyre  = document.getElementById("setup-tyre-strategy");
    if (wings && saved.wings) wings.textContent = saved.wings;
    if (susp && saved.suspension) susp.textContent = saved.suspension;
    if (eng && saved.engine) eng.textContent = saved.engine;
    if (tyre && saved.tyreStrategy) tyre.textContent = saved.tyreStrategy;
  }
}

// ----------------------------------------------------------
// Carregar SVG da pista (versão reduzida só para treino)
//   – NÃO reutiliza funções da qualy/corrida para não quebrar nada
// ----------------------------------------------------------
async function loadPracticeTrackSvg(trackKey) {
  const container = document.getElementById("practice-track-container");
  if (!container) return;

  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "practice-track-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 1000 600");
  container.appendChild(svg);

  let text;
  try {
    const resp = await fetch(`assets/tracks/${trackKey}.svg`);
    text = await resp.text();
  } catch (e) {
    console.error("Erro carregando SVG da pista de treino:", e);
    // fallback simples (retângulo)
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "100");
    rect.setAttribute("y", "100");
    rect.setAttribute("width", "800");
    rect.setAttribute("height", "400");
    rect.setAttribute("fill", "#000");
    rect.setAttribute("stroke", "#555");
    rect.setAttribute("stroke-width", "18");
    svg.appendChild(rect);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const path = doc.querySelector("path");
  if (!path) {
    console.error("Nenhum <path> encontrado no SVG de treino.");
    return;
  }

  const pathLen = path.getTotalLength();
  const samples = 400;
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const p = path.getPointAtLength((pathLen * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  const normPts = pts.map((p) => ({
    x: ((p.x - minX) / width) * 1000,
    y: ((p.y - minY) / height) * 600
  }));

  // pista – mesma estética das outras telas
  const trackPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trackPath.setAttribute(
    "points",
    normPts.map((p) => `${p.x},${p.y}`).join(" ")
  );
  trackPath.setAttribute("fill", "none");
  trackPath.setAttribute("stroke", "#555");
  trackPath.setAttribute("stroke-width", "18");
  trackPath.setAttribute("stroke-linecap", "round");
  trackPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(trackPath);

  const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  innerPath.setAttribute(
    "points",
    normPts.map((p) => `${p.x},${p.y}`).join(" ")
  );
  innerPath.setAttribute("fill", "none");
  innerPath.setAttribute("stroke", "#cccccc");
  innerPath.setAttribute("stroke-width", "6");
  innerPath.setAttribute("stroke-linecap", "round");
  innerPath.setAttribute("stroke-linejoin", "round");
  svg.appendChild(innerPath);

  normPts.forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 3);
    c.setAttribute("fill", "#ffffff");
    svg.appendChild(c);
  });

  const flagPoint = normPts[0];
  const flag = document.createElementNS("http://www.w3.org/2000/svg", "text");
  flag.setAttribute("x", flagPoint.x);
  flag.setAttribute("y", flagPoint.y - 10);
  flag.setAttribute("fill", "#ffffff");
  flag.setAttribute("font-size", "18");
  flag.setAttribute("text-anchor", "middle");
  flag.textContent = "🏁";
  svg.appendChild(flag);
}

// ----------------------------------------------------------
// Velocidade do treino
//   – se existir window.setPracticeSpeed(mult) (implementação
//     mais avançada no futuro), usa.
//   – senão, só guarda em window.practiceSpeedMultiplier.
// ----------------------------------------------------------
function inicializarBotoesVelocidadePractice() {
  const container = document.getElementById("practice-speed-buttons");
  if (!container) return;

  const buttons = Array.from(container.querySelectorAll("button[data-speed]"));
  if (!buttons.length) return;

  function setActive(mult) {
    buttons.forEach((btn) => {
      const val = Number(btn.getAttribute("data-speed"));
      if (val === mult) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mult = Number(btn.getAttribute("data-speed")) || 1;

      if (typeof window.setPracticeSpeed === "function") {
        window.setPracticeSpeed(mult);
      } else {
        window.practiceSpeedMultiplier = mult;
      }

      setActive(mult);
    });
  });

  // default 1x
  setActive(1);
  window.practiceSpeedMultiplier = 1;
}

// ----------------------------------------------------------
// Navegação: calendário / oficina / qualy
// ----------------------------------------------------------
function inicializarNavegacaoPractice(trackKey, gpName, userTeamKey) {
  const params = new URLSearchParams();
  if (trackKey) params.set("track", trackKey);
  if (gpName) params.set("gp", gpName);
  if (userTeamKey) params.set("userTeam", userTeamKey);

  const baseQuery = params.toString();

  const btnBackCal = document.getElementById("btn-back-to-calendar");
  if (btnBackCal) {
    btnBackCal.addEventListener("click", () => {
      window.location.href = "calendar.html" + (baseQuery ? "?" + baseQuery : "");
    });
  }

  const btnGarage = document.getElementById("btn-open-garage");
  if (btnGarage) {
    btnGarage.addEventListener("click", () => {
      const p = new URLSearchParams(params);
      p.set("from", "practice");
      window.location.href = "oficina.html?" + p.toString();
    });
  }

  const btnGoQualy = document.getElementById("btn-go-to-qualy");
  if (btnGoQualy) {
    btnGoQualy.addEventListener("click", () => {
      window.location.href = "qualifying.html" + (baseQuery ? "?" + baseQuery : "");
    });
  }

  const btnEndPractice = document.getElementById("btn-end-practice");
  if (btnEndPractice) {
    btnEndPractice.addEventListener("click", () => {
      // aqui você pode, no futuro, abrir um resumo da sessão.
      // por enquanto, apenas manda para a Oficina para revisar o setup.
      const p = new URLSearchParams(params);
      p.set("from", "practice_end");
      window.location.href = "oficina.html?" + p.toString();
    });
  }
}

// ----------------------------------------------------------
// Salvamento simples de setup a partir dos textos exibidos
//   – Isso garante que o que o usuário vê no treino pode
//     ser levado para a corrida pela race.js lendo a mesma chave.
// ----------------------------------------------------------
function inicializarSalvamentoSetup() {
  const btnSave = document.getElementById("btn-save-practice-setup");
  if (!btnSave) return;

  btnSave.addEventListener("click", () => {
    const wings = document.getElementById("setup-wings")?.textContent || "";
    const susp = document.getElementById("setup-suspension")?.textContent || "";
    const eng  = document.getElementById("setup-engine")?.textContent || "";
    const tyre = document.getElementById("setup-tyre-strategy")?.textContent || "";

    const payload = {
      wings,
      suspension: susp,
      engine: eng,
      tyreStrategy: tyre,
      updatedAt: Date.now()
    };

    savePracticeSetup(payload);
    alert("Ajuste de treino salvo. Ele será usado na próxima corrida.");
  });
}

// ----------------------------------------------------------
// Inicialização geral da página de treino
// ----------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // track / gp / userTeam vindos da URL ou de localStorage
  const trackKey = getParamOrStorage("track", "f1m2025_last_track", "australia");
  const gpName =
    getParam("gp") ||
    "GP oficial 2025";
  const userTeamKey =
    getParamOrStorage("userTeam", "f1m2025_user_team", "ferrari");

  // guardar track default no localStorage para próximas telas
  try {
    localStorage.setItem("f1m2025_last_track", trackKey);
    localStorage.setItem("f1m2025_user_team", userTeamKey);
  } catch (e) {
    console.warn("Não foi possível salvar track/userTeam no localStorage:", e);
  }

  preencherHeaderPractice(trackKey, gpName, userTeamKey);
  inicializarBotoesVelocidadePractice();
  inicializarNavegacaoPractice(trackKey, gpName, userTeamKey);
  inicializarSalvamentoSetup();
  loadPracticeTrackSvg(trackKey);
});
