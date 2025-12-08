// ============================================================
// F1 MANAGER 2025 - MAIN.JS
// CONTROLADOR DE TELAS, ESTADO DO JOGO, SAVE/LOAD
// ============================================================

// ============================================================
// ESTADO PRINCIPAL DO JOGO
// ============================================================

window.gameState = {
    managerName: "",
    teamName: "",
    currentStage: 1,
    cash: 5000000,
    currentGP: null,
    lastRaceResult: null
};

// ============================================================
// LISTA DE GP 2025 (ORDEM REAL)
// ============================================================

window.calendar = [
    "Bahrein",
    "Arábia Saudita",
    "Austrália",
    "Japão",
    "China",
    "Miami",
    "Imola",
    "Mônaco",
    "Canadá",
    "Espanha",
    "Áustria",
    "Inglaterra",
    "Hungria",
    "Bélgica",
    "Holanda",
    "Monza",
    "Azerbaijão",
    "Singapura",
    "Austin",
    "México",
    "Brasil",
    "Las Vegas",
    "Catar",
    "Abu Dhabi"
];

// ============================================================
// FUNÇÃO DE TROCA DE TELAS
// ============================================================

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => {
        s.classList.remove("active");
    });

    const scr = document.getElementById(id);
    if (scr) scr.classList.add("active");

    updateHUD();
}

// ============================================================
// HUD SUPERIOR
// ============================================================

function updateHUD() {
    const cashEl = document.getElementById("hud-cash");
    const stageEl = document.getElementById("hud-stage");

    if (cashEl) {
        cashEl.textContent = "R$ " + window.gameState.cash.toLocaleString("pt-BR");
    }
    if (stageEl) {
        stageEl.textContent = window.gameState.currentStage;
    }
}

// ============================================================
// NOVO JOGO / CONTINUAR
// ============================================================

document.getElementById("btn-new-game")?.addEventListener("click", () => {
    showScreen("screen-manager-select");
});

document.getElementById("btn-continue")?.addEventListener("click", () => {
    loadGame();
});

// ============================================================
// ESCOLHA DE MANAGER
// ============================================================

document.querySelectorAll(".btn-manager-preset").forEach(btn => {
    btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        startNewCareer(name);
    });
});

document.getElementById("btn-manager-create")?.addEventListener("click", () => {
    const name = prompt("Digite o nome do Manager:");
    if (!name) return;
    startNewCareer(name);
});

function startNewCareer(name) {
    window.gameState.managerName = name;
    window.gameState.teamName = "Sem equipe ainda";
    window.gameState.currentStage = 1;
    saveGame();
    showScreen("screen-manager-hub");
    renderManagerInfo();
}

// ============================================================
// LOBBY / MANAGER HUB
// ============================================================

function renderManagerInfo() {
    const nameEl = document.getElementById("manager-name");
    const teamEl = document.getElementById("manager-team");

    if (nameEl) nameEl.textContent = window.gameState.managerName;
    if (teamEl) teamEl.textContent = "Equipe: " + window.gameState.teamName;
}

document.getElementById("btn-back-menu")?.addEventListener("click", () => {
    showScreen("screen-menu");
});

// ============================================================
// CALENDÁRIO
// ============================================================

document.getElementById("btn-open-calendar")?.addEventListener("click", () => {
    buildCalendar();
    showScreen("screen-calendar");
});

function buildCalendar() {
    const container = document.getElementById("calendar-list");
    if (!container) return;
    container.innerHTML = "";

    window.calendar.forEach((gp, index) => {
        const item = document.createElement("div");
        item.className = "calendar-item";
        item.innerHTML = `
            <strong>${index + 1}. ${gp}</strong>
            <div class="calendar-status">
                ${index + 1 === window.gameState.currentStage ? "PRÓXIMA" : ""}
            </div>
        `;
        container.appendChild(item);
    });
}

document.getElementById("btn-calendar-back")?.addEventListener("click", () => {
    showScreen("screen-manager-hub");
});

// ============================================================
// CORRIDA
// ============================================================

document.getElementById("btn-open-race")?.addEventListener("click", () => {
    // Configurar GP atual
    const stage = window.gameState.currentStage - 1;
    const gpName = window.calendar[stage];

    window.gameState.currentGP = {
        name: "GP de " + gpName,
        laps: 10
    };

    showScreen("screen-race");
});

document.getElementById("btn-start-race")?.addEventListener("click", () => {
    if (window.raceSystem) {
        window.raceSystem.startNewRace();
    }
});

// ============================================================
// QUANDO TERMINA A CORRIDA → PÓDIO
// ============================================================

window.showPodiumScreen = function () {
    // Resultado armazenado
    const result = window.gameState.lastRaceResult;
    if (!result) return;

    const cars = result.cars;
    const p1 = cars[0];
    const p2 = cars[1];
    const p3 = cars[2];

    fillPodiumSlot("podioP1", p1);
    fillPodiumSlot("podioP2", p2);
    fillPodiumSlot("podioP3", p3);

    // Avança etapa
    window.gameState.currentStage++;
    saveGame();

    showScreen("screen-podio");
};

function fillPodiumSlot(id, car) {
    const el = document.getElementById(id);
    if (!el || !car) return;

    el.innerHTML = `
        <strong>${car.driverName}</strong><br>
        ${car.teamName}<br>
        ${car.position}º
    `;
}

// ============================================================
// FINANÇAS
// ============================================================

document.getElementById("btn-open-finance")?.addEventListener("click", () => {
    updateFinanceUI?.();
    showScreen("screen-finance");
});

// ============================================================
// SALVAR E CARREGAR
// ============================================================

document.getElementById("btn-save-game")?.addEventListener("click", () => {
    saveGame();
    alert("Jogo salvo com sucesso!");
});

function saveGame() {
    localStorage.setItem("F1MANAGER_SAVE", JSON.stringify(window.gameState));
}

function loadGame() {
    const data = localStorage.getItem("F1MANAGER_SAVE");
    if (!data) {
        alert("Nenhum save encontrado!");
        return;
    }
    window.gameState = JSON.parse(data);
    showScreen("screen-manager-hub");
    renderManagerInfo();
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    updateHUD();
});
