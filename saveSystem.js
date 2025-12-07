/* ======================================================
   saveSystem.js — SALVAMENTO COMPLETO DE CARREIRA
   ====================================================== */

const SaveSystem = (() => {

    const CHAVE = "F1_MANAGER_2025_SAVE";

    // ================================
    // SALVAR
    // ================================
    function salvarJogo() {
        try {
            const dados = JSON.stringify(JOGO);
            localStorage.setItem(CHAVE, dados);

            console.info("[SAVE] Jogo salvo com sucesso.");
            mostrarMsg("💾 Jogo salvo!");

        } catch (err) {
            console.error("[SAVE] Erro ao salvar:", err);
            mostrarMsg("❌ Erro ao salvar!");
        }
    }

    // ================================
    // CARREGAR
    // ================================
    function carregarJogo() {
        try {
            const dados = localStorage.getItem(CHAVE);
            if (!dados) {
                console.warn("[SAVE] Nenhum save encontrado.");
                mostrarMsg("⚠️ Nenhum jogo salvo encontrado");
                return false;
            }

            const obj = JSON.parse(dados);

            // aplica no objeto global
            Object.assign(JOGO, obj);

            console.info("[SAVE] Save carregado.");
            mostrarMsg("📂 Jogo carregado!");

            return true;

        } catch (err) {
            console.error("[SAVE] Erro ao carregar:", err);
            mostrarMsg("❌ Erro ao carregar!");
            return false;
        }
    }

    // ================================
    // AUTO-SAVE
    // ================================
    function autoSalvar() {
        // salva de 30 em 30 segundos
        setInterval(() => {
            salvarJogo();
        }, 30000);
    }

    // ================================
    // EXCLUIR
    // ================================
    function excluirSave() {
        localStorage.removeItem(CHAVE);
        mostrarMsg("🗑️ Save excluído");

        // reset opcional
        // location.reload();
    }

    // ================================
    // UI HELPERS
    // ================================
    function mostrarMsg(txt) {
        let el = document.getElementById("msgSave");
        if (!el) return;
        el.innerHTML = txt;

        el.style.opacity = 1;
        setTimeout(() => {
            el.style.opacity = 0;
        }, 2000);
    }

    // ================================
    // API EXPOSTA
    // ================================
    return {
        salvarJogo,
        carregarJogo,
        excluirSave,
        autoSalvar
    };

})();

/* Auto-inicializar se JOGO existe */
document.addEventListener("DOMContentLoaded", () => {
    if (typeof JOGO !== "undefined") {
        SaveSystem.autoSalvar();
    }
});
