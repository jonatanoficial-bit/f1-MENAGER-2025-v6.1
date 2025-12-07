// ============================================================
// F1 MANAGER 2025 - MAIN.JS
// Controle de telas, estado do jogo e save/load
// ============================================================

const SAVE_KEY = "f1_manager_2025_save";

// -----------------------------
// ESTADO GLOBAL DO JOGO
// -----------------------------
let gameState = {
    manager: null,
    team: null,
    cash: 5000000,
    currentRound: 1,
    season: 2025,
    calendar: [],
    results: [],
    createdAt: null
};

// -----------------------------
// UTILITÁRIOS DE TELA
// -----------------------------

function getTela(id) {
    return document.getElementById(id);
}

function mostrarTela(idTela) {
    const telas = document.querySelectorAll(".tela");
    telas.forEach(t => t.classList.remove("ativa"));
    const alvo = getTela(idTela);
    if (alvo) {
        alvo.classList.add("ativa");
        window.scrollTo(0, 0);
    }
}

// Atualiza barra superior (Caixa / Etapa)
function atualizarTopBar() {
    const elCaixa = document.getElementById("topCaixa");
    const elEtapa = document.getElementById("topEtapa");

    if (elCaixa) {
        elCaixa.textContent =
            "Caixa: R$ " + Number(gameState.cash || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    }

    if (elEtapa) {
        elEtapa.textContent = "Etapa: " + (gameState.currentRound || 1);
    }
}

// -----------------------------
// SAVE / LOAD
// -----------------------------

function salvarJogo() {
    try {
        const payload = {
            ...gameState,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.error("Erro ao salvar jogo:", e);
    }
}

function carregarJogo() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // validações básicas
        if (!data || !data.manager || !data.team) return null;
        gameState = data;
        return data;
    } catch (e) {
        console.error("Erro ao carregar save:", e);
        return null;
    }
}

function limparSave() {
    localStorage.removeItem(SAVE_KEY);
}

// -----------------------------
// DADOS (CALENDÁRIO FALLBACK)
// -----------------------------

// Se data.js já tiver GAME_DATA, usamos. Se não, criamos um calendário simples.
function obterCalendarioBase() {
    if (window.GAME_DATA && Array.isArray(window.GAME_DATA.calendar)) {
        return window.GAME_DATA.calendar;
    }

    // Calendário fallback (24 etapas fictícias ou ajustadas)
    return [
        { round: 1,  name: "GP do Bahrein",   country: "Bahrein" },
        { round: 2,  name: "GP da Arábia Saudita", country: "Arábia Saudita" },
        { round: 3,  name: "GP da Austrália", country: "Austrália" },
        { round: 4,  name: "GP do Japão",     country: "Japão" },
        { round: 5,  name: "GP da China",     country: "China" },
        { round: 6,  name: "GP de Miami",     country: "EUA" },
        { round: 7,  name: "GP da Emilia-Romagna", country: "Itália" },
        { round: 8,  name: "GP de Mônaco",    country: "Mônaco" },
        { round: 9,  name: "GP do Canadá",    country: "Canadá" },
        { round: 10, name: "GP da Espanha",   country: "Espanha" },
        { round: 11, name: "GP da Áustria",   country: "Áustria" },
        { round: 12, name: "GP da Inglaterra",country: "Reino Unido" },
        { round: 13, name: "GP da Hungria",   country: "Hungria" },
        { round: 14, name: "GP da Bélgica",   country: "Bélgica" },
        { round: 15, name: "GP da Holanda",   country: "Holanda" },
        { round: 16, name: "GP da Itália",    country: "Itália (Monza)" },
        { round: 17, name: "GP do Azerbaijão",country: "Azerbaijão" },
        { round: 18, name: "GP de Singapura", country: "Singapura" },
        { round: 19, name: "GP dos EUA",      country: "Austin" },
        { round: 20, name: "GP do México",    country: "México" },
        { round: 21, name: "GP de São Paulo", country: "Brasil" },
        { round: 22, name: "GP de Las Vegas", country: "EUA (Vegas)" },
        { round: 23, name: "GP do Catar",     country: "Catar" },
        { round: 24, name: "GP de Abu Dhabi", country: "Emirados Árabes" }
    ];
}

// -----------------------------
// CALENDÁRIO – UI
// -----------------------------

function montarCalendarioUI() {
    const calendarioContainer = document.getElementById("calendarioLista");
    if (!calendarioContainer) return;

    calendarioContainer.innerHTML = "";

    const cal = gameState.calendar || [];
    const rodadaAtual = gameState.currentRound || 1;

    cal.forEach(gp => {
        const card = document.createElement("div");
        card.classList.add("gp-card");

        if (gp.round < rodadaAtual) {
            card.classList.add("gp-concluido");
        } else if (gp.round === rodadaAtual) {
            card.classList.add("gp-proximo");
        } else {
            card.classList.add("gp-futuro");
        }

        card.dataset.round = gp.round;

        card.innerHTML = `
            <h3>${gp.round}. ${gp.name}</h3>
            <p style="opacity:0.7;font-size:11px;">${gp.country || ""}</p>
        `;

        card.addEventListener("click", () => {
            selecionarGP(gp.round);
        });

        calendarioContainer.appendChild(card);
    });
}

function selecionarGP(round) {
    if (!round) return;
    gameState.currentRound = round;
    atualizarTopBar();
    montarCalendarioUI();
}

// -----------------------------
// MANAGER / NOVO JOGO
// -----------------------------

function iniciarNovoJogo(managerInfo) {
    gameState = {
        manager: managerInfo,
        team: null,
        cash: 5000000,
        currentRound: 1,
        season: 2025,
        calendar: obterCalendarioBase(),
        results: [],
        createdAt: new Date().toISOString()
    };

    salvarJogo();
    atualizarTopBar();
    montarCalendarioUI();
    atualizarLobbyUI();

    mostrarTela("telaLobby");
}

// Cria manager por input de texto
function criarManagerCustom() {
    const inputNome = document.getElementById("inputNomeManager");
    let nome = inputNome ? inputNome.value.trim() : "";

    if (!nome) {
        nome = prompt("Digite o nome do Manager:") || "";
        nome = nome.trim();
    }

    if (!nome) {
        alert("Nome do manager não pode ficar vazio.");
        return;
    }

    const manager = {
        id: "custom",
        name: nome,
        reputacao: 0.5
    };

    iniciarNovoJogo(manager);
}

function escolherManagerPredefinido(id) {
    let nome = "";
    switch (id) {
        case "toto":
            nome = "Toto Wolff";
            break;
        case "horner":
            nome = "Christian Horner";
            break;
        default:
            nome = "Manager";
    }

    const manager = {
        id,
        name: nome,
        reputacao: 0.8
    };

    iniciarNovoJogo(manager);
}

// -----------------------------
// LOBBY / HUD DO GERENTE
// -----------------------------

function atualizarLobbyUI() {
    // Nome do manager / equipe, etc.
    const elResumoManager = document.getElementById("lobbyResumoManager");
    if (elResumoManager && gameState.manager) {
        elResumoManager.textContent =
            `${gameState.manager.name} – Temporada ${gameState.season}`;
    }

    const elResumoEquipe = document.getElementById("lobbyResumoEquipe");
    if (elResumoEquipe) {
        elResumoEquipe.textContent = gameState.team
            ? `Equipe atual: ${gameState.team.name || gameState.team}`
            : "Sem equipe definida (usar tela de Contratos/Equipes)";
    }

    // Atualiza calendário e top bar caso lobby seja aberto diretamente
    montarCalendarioUI();
    atualizarTopBar();
}

// -----------------------------
// CORRIDA / FIM DE SEMANA
// -----------------------------

function iniciarCorridaAtual() {
    const round = gameState.currentRound || 1;
    const gp = (gameState.calendar || []).find(g => g.round === round);

    if (!gp) {
        alert("GP não encontrado para esta etapa.");
        return;
    }

    // Troca para tela da corrida
    mostrarTela("telaCorrida");

    // Se o módulo RaceSystem existir, chamamos ele
    if (window.RaceSystem && typeof window.RaceSystem.iniciarCorrida === "function") {
        try {
            window.RaceSystem.iniciarCorrida(gameState, gp, onCorridaFinalizada);
        } catch (e) {
            console.error("Erro ao iniciar corrida:", e);
        }
    } else {
        // Placeholder simples caso RaceSystem ainda não esteja pronto
        const raceInfo = document.getElementById("raceInfoDebug");
        if (raceInfo) {
            raceInfo.textContent =
                `Corrida simulada: ${gp.name} (round ${gp.round}). ` +
                `Implemente RaceSystem.iniciarCorrida para simulação completa.`;
        }
        console.warn("RaceSystem.iniciarCorrida não encontrado.");
    }
}

// Callback quando a corrida termina
function onCorridaFinalizada(resultadoGP) {
    // resultadoGP pode conter:
    // { round, classificacaoPilotos: [...], classificacaoEquipes: [...], cashDelta }
    if (resultadoGP) {
        gameState.results = gameState.results || [];
        gameState.results.push(resultadoGP);

        if (typeof resultadoGP.cashDelta === "number") {
            gameState.cash += resultadoGP.cashDelta;
        }
    }

    // Avança etapa (se não for último GP)
    if (gameState.currentRound < (gameState.calendar || []).length) {
        gameState.currentRound += 1;
    }

    salvarJogo();
    atualizarTopBar();
    montarCalendarioUI();
    atualizarTelaPodio(resultadoGP);
}

// -----------------------------
// PÓDIO / RESULTADO
// -----------------------------

function atualizarTelaPodio(resultadoGP) {
    mostrarTela("telaPodio");

    const elTitulo = document.getElementById("podioTitulo");
    const podium1 = document.getElementById("podioP1");
    const podium2 = document.getElementById("podioP2");
    const podium3 = document.getElementById("podioP3");

    if (elTitulo) {
        const round = resultadoGP?.round || gameState.currentRound - 1;
        const gp = (gameState.calendar || []).find(g => g.round === round);
        elTitulo.textContent = gp ? `Pódio – ${gp.name}` : "Pódio da Corrida";
    }

    const classificacao = resultadoGP?.classificacaoPilotos || [];
    const p1 = classificacao[0] || null;
    const p2 = classificacao[1] || null;
    const p3 = classificacao[2] || null;

    if (podium1) {
        podium1.innerHTML = p1
            ? `<h4>${p1.nome}</h4><span>${p1.equipe || ""}</span>`
            : `<h4>—</h4><span></span>`;
    }
    if (podium2) {
        podium2.innerHTML = p2
            ? `<h4>${p2.nome}</h4><span>${p2.equipe || ""}</span>`
            : `<h4>—</h4><span></span>`;
    }
    if (podium3) {
        podium3.innerHTML = p3
            ? `<h4>${p3.nome}</h4><span>${p3.equipe || ""}</span>`
            : `<h4>—</h4><span></span>`;
    }
}

// -----------------------------
// INICIALIZAÇÃO E EVENTOS
// -----------------------------

function registrarEventos() {
    // BOTÕES MENU PRINCIPAL
    const btnNovoJogo = document.getElementById("btnNovoJogo");
    const btnContinuar = document.getElementById("btnContinuar");

    if (btnNovoJogo) {
        btnNovoJogo.addEventListener("click", () => {
            limparSave();
            mostrarTela("telaEscolhaManager");
        });
    }

    if (btnContinuar) {
        btnContinuar.addEventListener("click", () => {
            const save = carregarJogo();
            if (!save) {
                alert("Nenhum jogo salvo encontrado. Inicie um novo jogo.");
                mostrarTela("telaEscolhaManager");
                return;
            }
            atualizarTopBar();
            montarCalendarioUI();
            atualizarLobbyUI();
            mostrarTela("telaLobby");
        });
    }

    // ESCOLHA DE MANAGER
    const btnCriarManager = document.getElementById("btnCriarManager");
    const btnToto = document.getElementById("btnTotoWolff");
    const btnHorner = document.getElementById("btnChristianHorner");

    if (btnCriarManager) {
        btnCriarManager.addEventListener("click", criarManagerCustom);
    }
    if (btnToto) {
        btnToto.addEventListener("click", () => escolherManagerPredefinido("toto"));
    }
    if (btnHorner) {
        btnHorner.addEventListener("click", () =>
            escolherManagerPredefinido("horner")
        );
    }

    // BOTÕES DO LOBBY
    const btnIrCalendario = document.getElementById("btnIrCalendario");
    if (btnIrCalendario) {
        btnIrCalendario.addEventListener("click", () => {
            montarCalendarioUI();
            mostrarTela("telaCalendario");
        });
    }

    const btnVoltarLobbyDoCalendario =
        document.getElementById("btnVoltarLobbyCalendario");
    if (btnVoltarLobbyDoCalendario) {
        btnVoltarLobbyDoCalendario.addEventListener("click", () => {
            mostrarTela("telaLobby");
        });
    }

    // BOTÃO INICIAR CORRIDA (pode estar no lobby ou no calendário)
    const btnIniciarCorrida = document.getElementById("btnIniciarCorrida");
    if (btnIniciarCorrida) {
        btnIniciarCorrida.addEventListener("click", iniciarCorridaAtual);
    }

    // BOTÃO VOLTAR AO LOBBY A PARTIR DO PÓDIO
    const btnVoltarLobbyPodio = document.getElementById("btnVoltarLobbyPodio");
    if (btnVoltarLobbyPodio) {
        btnVoltarLobbyPodio.addEventListener("click", () => {
            atualizarLobbyUI();
            mostrarTela("telaLobby");
        });
    }
}

// Inicializa aplicação
document.addEventListener("DOMContentLoaded", () => {
    // Se existir save, tenta carregar automaticamente
    const save = carregarJogo();
    if (save) {
        // Garante calendário populado
        if (!Array.isArray(gameState.calendar) || gameState.calendar.length === 0) {
            gameState.calendar = obterCalendarioBase();
        }
        atualizarTopBar();
        montarCalendarioUI();
        atualizarLobbyUI();
        mostrarTela("telaLobby");
    } else {
        // Sem save: começa pelo menu principal
        gameState.calendar = obterCalendarioBase();
        atualizarTopBar();
        montarCalendarioUI();
        mostrarTela("telaMenu");
    }

    registrarEventos();
});
