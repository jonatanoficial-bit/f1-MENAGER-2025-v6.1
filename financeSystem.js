// ============================================================
// F1 MANAGER 2025 - FINANCE SYSTEM
// ============================================================

console.log("FinanceSystem carregado");

// ============================================================
// ESTADO FINANCEIRO
// ============================================================

window.FINANCE = {
    balance: 5000000, // saldo inicial
    history: []       // lista de transações
};

// ============================================================
// ADICIONAR TRANSAÇÃO
// ============================================================

function addTransaction(desc, value) {
    window.FINANCE.history.push({
        desc,
        value,
        date: new Date().toLocaleDateString("pt-BR")
    });

    window.FINANCE.balance += value;

    updateHUD();
    updateFinanceUI?.();
}

// ============================================================
// EVENTOS DE CORRIDA
// ============================================================

window.finance = {

    // Custos fixos por GP
    applyRaceCosts() {
        addTransaction("Operação da etapa", -250000);
        addTransaction("Salários base", -150000);
    },

    // Ganhos por pódio
    rewardPodium(resultado) {
        if (!resultado || !resultado.cars) return;

        const podium = resultado.cars.slice(0, 3);

        const premios = [1000000, 600000, 350000];

        podium.forEach((c, i) => {
            addTransaction(`Pódio ${i + 1}º - ${c.driverName}`, premios[i]);
        });
    },

    getBalance() {
        return window.FINANCE.balance;
    },

    getHistory() {
        return [...window.FINANCE.history].reverse();
    }
};

// ============================================================
// UPDATE DA TELA FINANCE
// ============================================================

window.updateFinanceUI = function () {

    const balanceEl = document.getElementById("financeBalance");
    const historyEl = document.getElementById("financeHistory");

    // Atualiza saldo
    if (balanceEl) {
        balanceEl.textContent = "R$ " + window.FINANCE.balance.toLocaleString("pt-BR");
    }

    // Histórico
    if (historyEl) {
        historyEl.innerHTML = "";
        FINANCE.history.slice().reverse().forEach((t) => {
            const li = document.createElement("li");
            li.innerHTML =
                `<strong>${t.desc}</strong> — ${t.date} — ` +
                `<span style="color:${t.value >= 0 ? "lightgreen" : "salmon"}">` +
                `R$ ${t.value.toLocaleString("pt-BR")}</span>`;
            historyEl.appendChild(li);
        });
    }

    drawFinanceLineChart();
    drawFinancePieChart();
};

// ============================================================
// GRÁFICO DE EVOLUÇÃO DO SALDO
// ============================================================

function drawFinanceLineChart() {
    const canvas = document.getElementById("chartFinanceLine");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e50914";
    ctx.lineWidth = 2;

    ctx.beginPath();

    let x = 0;
    const step = canvas.width / (FINANCE.history.length || 1);

    FINANCE.history.forEach((t, i) => {
        const val = t.value;
        const y = canvas.height - (val / 500000) * 60;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += step;
    });

    ctx.stroke();
}

// ============================================================
// GRÁFICO DE CATEGORIAS (PIZZA)
// ============================================================

function drawFinancePieChart() {
    const canvas = document.getElementById("chartFinancePie");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const categorias = {};

    FINANCE.history.forEach((t) => {
        const cat = t.desc.split(" ")[0] || t.desc;
        if (!categorias[cat]) categorias[cat] = 0;
        categorias[cat] += t.value;
    });

    const total = Object.values(categorias).reduce((a, b) => a + b, 0) || 1;
    let start = 0;

    Object.keys(categorias).forEach((k) => {

        const val = categorias[k];
        const slice = (val / total) * Math.PI * 2;

        const hash = Array.from(k).reduce((a, c) => a + c.charCodeAt(0), 0);
        const color = `hsl(${hash % 360}, 65%, 55%)`;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.arc(canvas.width / 2, canvas.height / 2, 65, start, start + slice);
        ctx.fill();

        start += slice;
    });
}

// ============================================================
// EXPORTAR PDF
// ============================================================

document.getElementById("btnFinanceExport")?.addEventListener("click", () => {
    const w = window.open("", "_blank");

    let html = `
        <h2>Relatório Financeiro</h2>
        <p><strong>Saldo:</strong> R$ ${FINANCE.balance.toLocaleString("pt-BR")}</p>
        <h3>Histórico</h3>
        <ul>
    `;

    FINANCE.history.slice().reverse().forEach((t) => {
        html += `<li>${t.date} — ${t.desc}: R$ ${t.value.toLocaleString("pt-BR")}</li>`;
    });

    html += `</ul>`;

    w.document.write(html);
    w.print();
});

// ============================================================
// INTEGRAÇÃO COM CORRIDA
// ============================================================

window.applyRaceFinance = function (result) {
    finance.applyRaceCosts();
    finance.rewardPodium(result);
    updateFinanceUI();
};

// ============================================================
// BOOT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    updateFinanceUI();
});
