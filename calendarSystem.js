/* ============================================================
   CALENDAR SYSTEM — F1 SEASON 2025
 ============================================================ */

const CalendarSystem = (() => {

    // Lista oficial dos 24 GP
    const GPs = [
        "Bahrain", "Saudi Arabia", "Australia", "Japan", "China",
        "Miami", "Emilia-Romagna", "Monaco", "Canada", "Spain",
        "Austria", "United Kingdom", "Hungary", "Belgium", "Netherlands",
        "Italy", "Azerbaijan", "Singapore", "USA", "Mexico",
        "Brazil", "Las Vegas", "Qatar", "Abu Dhabi"
    ];

    // Renderiza a lista
    function renderCalendario() {
        let box = document.getElementById("calendarioLista");
        box.innerHTML = "";

        GPs.forEach((gp, index) => {

            let etapa = index + 1;
            let classe = "gp-futuro";

            if (JOGO.etapaAtual > etapa) classe = "gp-concluido";
            if (JOGO.etapaAtual === etapa) classe = "gp-proximo";

            box.innerHTML += `
                <div class="gp-card ${classe}" onclick="CalendarSystem.selecionarGP(${etapa})">
                    <h3>${etapa}. ${gp}</h3>
                </div>
            `;
        });
    }

    // Quando o jogador clica num GP
    function selecionarGP(etapa) {
        JOGO.etapaAtual = etapa;
        document.getElementById("hud-etapa").textContent = etapa;
        MenuSystem.mostrarTela("telaCorrida");
    }

    return {
        renderCalendario,
        selecionarGP
    };

})();

/* Auto-render ao abrir o calendário */
document.addEventListener("DOMContentLoaded", () => {
    if (typeof CalendarSystem !== "undefined") {
        CalendarSystem.renderCalendario();
    }
});
