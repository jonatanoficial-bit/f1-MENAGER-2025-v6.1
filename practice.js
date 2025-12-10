// =======================================================
// TREINO LIVRE – LÓGICA BÁSICA
// =======================================================

(function () {
  // -----------------------------
  // LEITURA DOS PARÂMETROS
  // -----------------------------
  const params = new URLSearchParams(window.location.search);
  const trackKey = params.get("track") || "australia";
  const gpName = params.get("gp") || "GP 2025";
  const userTeamKey =
    params.get("userTeam") ||
    localStorage.getItem("f1m2025_user_team") ||
    "ferrari";

  // Persistir equipe escolhida
  localStorage.setItem("f1m2025_user_team", userTeamKey);

  // -----------------------------
  // METADADOS DE EQUIPE
  // -----------------------------
  const TEAM_METADATA = {
    ferrari: {
      name: "Ferrari",
      base: "Maranello, Itália",
      logo: "assets/teams/ferrari.png",
      drivers: ["Charles Leclerc", "Carlos Sainz"],
    },
    redbull: {
      name: "Red Bull Racing",
      base: "Milton Keynes, Reino Unido",
      logo: "assets/teams/redbull.png",
      drivers: ["Max Verstappen", "Sergio Pérez"],
    },
    mercedes: {
      name: "Mercedes",
      base: "Brackley, Reino Unido",
      logo: "assets/teams/mercedes.png",
      drivers: ["Lewis Hamilton", "George Russell"],
    },
    mclaren: {
      name: "McLaren",
      base: "Woking, Reino Unido",
      logo: "assets/teams/mclaren.png",
      drivers: ["Lando Norris", "Oscar Piastri"],
    },
    aston: {
      name: "Aston Martin",
      base: "Silverstone, Reino Unido",
      logo: "assets/teams/aston.png",
      drivers: ["Fernando Alonso", "Lance Stroll"],
    },
    alpine: {
      name: "Alpine",
      base: "Enstone / Viry, França",
      logo: "assets/teams/alpine.png",
      drivers: ["Pierre Gasly", "Esteban Ocon"],
    },
    sauber: {
      name: "Sauber / Audi",
      base: "Hinwil, Suíça",
      logo: "assets/teams/sauber.png",
      drivers: ["Piloto 1", "Piloto 2"],
    },
    haas: {
      name: "Haas",
      base: "Kannapolis, EUA",
      logo: "assets/teams/haas.png",
      drivers: ["Piloto 1", "Piloto 2"],
    },
    williams: {
      name: "Williams",
      base: "Grove, Reino Unido",
      logo: "assets/teams/williams.png",
      drivers: ["Piloto 1", "Piloto 2"],
    },
    racingbulls: {
      name: "Racing Bulls",
      base: "Faenza, Itália",
      logo: "assets/teams/racingbulls.png",
      drivers: ["Piloto 1", "Piloto 2"],
    },
  };

  const teamMeta = TEAM_METADATA[userTeamKey] || TEAM_METADATA.ferrari;

  // -----------------------------
  // CIRCUITOS (NOME BONITO)
  // -----------------------------
  const TRACK_METADATA = {
    australia: { circuit: "Albert Park – Melbourne", country: "Austrália" },
    bahrain: { circuit: "Sakhir", country: "Bahrein" },
    jeddah: { circuit: "Jeddah Corniche", country: "Arábia Saudita" },
    japan: { circuit: "Suzuka", country: "Japão" },
    china: { circuit: "Xangai", country: "China" },
    miami: { circuit: "Miami International Autodrome", country: "EUA" },
    imola: { circuit: "Imola", country: "Itália" },
    monaco: { circuit: "Monte Carlo", country: "Mônaco" },
    canada: { circuit: "Circuit Gilles Villeneuve", country: "Canadá" },
    spain: { circuit: "Barcelona-Catalunha", country: "Espanha" },
    austria: { circuit: "Red Bull Ring", country: "Áustria" },
    uk: { circuit: "Silverstone", country: "Reino Unido" },
    hungary: { circuit: "Hungaroring", country: "Hungria" },
    belgium: { circuit: "Spa-Francorchamps", country: "Bélgica" },
    netherlands: { circuit: "Zandvoort", country: "Países Baixos" },
    monza: { circuit: "Monza", country: "Itália" },
    baku: { circuit: "Baku City Circuit", country: "Azerbaijão" },
    singapore: { circuit: "Marina Bay", country: "Singapura" },
    cota: { circuit: "Circuit of the Americas", country: "EUA" },
    mexico: { circuit: "Hermanos Rodríguez", country: "México" },
    brazil: { circuit: "Interlagos", country: "Brasil" },
    lasvegas: { circuit: "Las Vegas Strip Circuit", country: "EUA" },
    qatar: { circuit: "Losail", country: "Qatar" },
    abudhabi: { circuit: "Yas Marina", country: "Emirados Árabes" },
  };

  const trackMeta = TRACK_METADATA[trackKey] || {
    circuit: "Circuito — a definir",
    country: "",
  };

  // -----------------------------
  // PREENCHER BARRA SUPERIOR
  // -----------------------------
  function preencherTopBar() {
    // Equipe
    document.getElementById("team-name").textContent = teamMeta.name;
    document.getElementById("team-base").textContent = teamMeta.base;
    document.getElementById("team-logo").src = teamMeta.logo;

    // Manager (se houver no localStorage)
    const raw = localStorage.getItem("f1m2025_manager");
    if (raw) {
      try {
        const m = JSON.parse(raw);
        if (m.name) document.getElementById("manager-name").textContent = m.name;
        if (m.country)
          document.getElementById("manager-country").textContent = m.country;
        if (m.avatar)
          document.getElementById("manager-avatar").src = m.avatar;
      } catch (e) {
        console.warn("Erro ao ler manager do localStorage:", e);
      }
    }
  }

  // -----------------------------
  // PISTA (SVG)
  // -----------------------------
  function carregarPista() {
    const panel = document.getElementById("track-panel");
    panel.innerHTML = "";

    const img = document.createElement("img");
    img.src = `assets/tracks/${trackKey}.svg`;
    img.alt = trackMeta.circuit;
    panel.appendChild(img);

    document.getElementById("circuit-name").textContent =
      trackMeta.circuit +
      (trackMeta.country ? ` • ${trackMeta.country}` : "");
  }

  // -----------------------------
  // PILOTOS DA EQUIPE
  // -----------------------------
  const driverStates = [
    { name: teamMeta.drivers[0] || "Piloto 1", car: 100, tyre: 0 },
    { name: teamMeta.drivers[1] || "Piloto 2", car: 100, tyre: 0 },
  ];

  function preencherPilotos() {
    document.getElementById("driver-1-name").textContent = driverStates[0].name;
    document.getElementById("driver-2-name").textContent = driverStates[1].name;

    document.getElementById("driver-1-team").textContent = teamMeta.name;
    document.getElementById("driver-2-team").textContent = teamMeta.name;

    document.getElementById("driver-1-avatar").src = teamMeta.logo;
    document.getElementById("driver-2-avatar").src = teamMeta.logo;

    atualizarStatsPilotos();
  }

  function atualizarStatsPilotos() {
    const d1 = driverStates[0];
    const d2 = driverStates[1];

    document.getElementById(
      "driver-1-stats"
    ).textContent = `Carro: ${d1.car.toFixed(0)}% • Pneus: ${d1.tyre.toFixed(
      0
    )}%`;
    document.getElementById(
      "driver-2-stats"
    ).textContent = `Carro: ${d2.car.toFixed(0)}% • Pneus: ${d2.tyre.toFixed(
      0
    )}%`;
  }

  // -----------------------------
  // SESSÃO (TEMPO / VOLTAS)
  // -----------------------------
  let sessionDurationSeconds = 60 * 60; // 60 minutos
  let sessionRemaining = sessionDurationSeconds;
  let speedMultiplier = 1;
  let currentLap = 1;
  const totalLaps = 20;

  function formatTime(seconds) {
    const m = Math.max(0, Math.floor(seconds / 60));
    const s = Math.max(0, Math.floor(seconds % 60));
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function atualizarHeaderSessao() {
    document.getElementById("gp-name").textContent = gpName;
    document.getElementById("session-time").textContent = formatTime(
      sessionRemaining
    );
    document.getElementById(
      "session-lap"
    ).textContent = `Volta ${currentLap} / ${totalLaps}`;
  }

  function tickSessao() {
    if (sessionRemaining <= 0) return;

    sessionRemaining -= speedMultiplier;
    if (sessionRemaining < 0) sessionRemaining = 0;

    // A cada ~90s de "tempo real", considera que completou 1 volta
    const elapsed = sessionDurationSeconds - sessionRemaining;
    const lapsSimuladas = Math.min(
      totalLaps,
      1 + Math.floor((elapsed * speedMultiplier) / 90)
    );
    currentLap = Math.max(1, Math.min(totalLaps, lapsSimuladas));

    // Desgaste simples de pneus e carro
    driverStates.forEach((d) => {
      // Pneus sobem até 100%
      if (d.tyre < 100) d.tyre += 0.4 * speedMultiplier;
      if (d.tyre > 100) d.tyre = 100;

      // Carro cai devagar
      if (d.car > 70) d.car -= 0.05 * speedMultiplier;
      if (d.car < 0) d.car = 0;
    });

    atualizarStatsPilotos();
    atualizarHeaderSessao();
  }

  // -----------------------------
  // CONTROLES DE VELOCIDADE
  // -----------------------------
  function configurarSpeedButtons() {
    const btns = document.querySelectorAll(".btn-speed");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const sp = Number(btn.dataset.speed || "1");
        speedMultiplier = sp > 0 ? sp : 1;
      });
    });
  }

  // -----------------------------
  // NAVEGAÇÃO (OFICINA / LOBBY)
  // -----------------------------
  function configurarNavButtons() {
    const preserveParams = () => {
      const p = new URLSearchParams();
      p.set("track", trackKey);
      p.set("gp", gpName);
      p.set("userTeam", userTeamKey);
      return p.toString();
    };

    document.getElementById("btn-office").addEventListener("click", () => {
      window.location.href = "oficina.html?" + preserveParams();
    });

    document.getElementById("btn-lobby").addEventListener("click", () => {
      window.location.href = "lobby.html";
    });
  }

  // -----------------------------
  // INIT
  // -----------------------------
  function init() {
    preencherTopBar();
    carregarPista();
    preencherPilotos();
    atualizarHeaderSessao();
    configurarSpeedButtons();
    configurarNavButtons();

    // Loop da sessão
    setInterval(tickSessao, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
