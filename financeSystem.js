// =======================================
// F1 MANAGER 2025 - FINANCE SYSTEM
// =======================================

console.log("financeSystem.js carregado");

window.FINANCE = {
  history: [], // lista de transações
  balance: 5000000 // inicial R$ 5.000.000,00
};

// ------------------------------
// TRANSACÕES
// ------------------------------

function addTransaction(desc, value) {
  window.FINANCE.history.push({
    desc,
    value,
    date: new Date().toLocaleDateString("pt-BR")
  });

  window.FINANCE.balance += value;

  if (typeof window.updateFinanceUI === "function") {
    window.updateFinanceUI();
  }
}

// ------------------------------
// FUNÇÕES PÚBLICAS
// ------------------------------

window.finance = {
  // custo de operação por etapa
  applyRaceCosts() {
    addTransaction("Operação da etapa", -250000);
    addTransaction("Salários base", -150000);
  },

  // ganho por resultado do pódio
  rewardPodium(resultado) {
    if (!resultado || !resultado.podium) return;

    const podium = resultado.podium;

    const premios = [1000000, 600000, 350000];

    podium.forEach((nome, index) => {
      const premio = premios[index];
      addTransaction(`Pódio - ${index + 1}º (${nome})`, premio);
    });
  },

  // resumo
  getBalance() {
    return window.FINANCE.balance;
  },

  getHistory() {
    return window.FINANCE.history.slice().reverse();
  }
};

// ------------------------------
// UI ATUALIZAÇÃO
// ------------------------------

window.updateFinanceUI = function () {
  const elBalance = document.getElementById("financeBalance");
  const elHistory = document.getElementById("financeHistory");

  if (!elBalance || !elHistory) return;

  elBalance.innerText =
    "R$ " +
    window.FINANCE.balance.toLocaleString("pt-BR");

  elHistory.innerHTML = "";

  window.FINANCE.history.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<strong>${t.desc}</strong> — ${t.date} — ` +
      `<span style="color:${t.value >= 0 ? "lightgreen" : "salmon"}">` +
      `R$ ${t.value.toLocaleString("pt-BR")}</span>`;
    elHistory.appendChild(li);
  });
};
