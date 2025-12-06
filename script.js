/* ============================================================
   SCRIPT.JS — F1 MANAGER 2025 (versão limpa e funcional)
   ============================================================ */

/* ------------------------------------------------------------
   ALIAS DE PISTAS (para não dar erro em código antigo)
   Se em algum lugar ainda existir "PISTAS", ele vai usar
   o mesmo conteúdo do CALENDARIO.
   ------------------------------------------------------------ */
const PISTAS = (typeof CALENDARIO !== "undefined" ? CALENDARIO : []);

/* ===============================
   ESTADO GLOBAL DO JOGO
   =============================== */
window.JOGO = {
  gerente: null,
  equipeAtual: null,
  dinheiro: 5000000,
  ultimaCorrida: null,
  proximaCorrida: null,
  resultadoCorrida: [],
  temporada: 2025,
  setup: {
    asa: 0.5,
    suspensao: 0.5,
    altura: 0.5,
    diferencial: 0.5
  },
  saveKey: "F1_MANAGER_2025_SAVE"
};

console.log("script.js carregado (versão limpa)");

/* ===============================
   FUNÇÕES DE APOIO
   =============================== */

// primeira pista do calendário (ou bahrain, se der algo errado)
function getPrimeiraPistaKey() {
  if (typeof CALENDARIO !== "undefined" && CALENDARIO.length > 0) {
    return CALENDARIO[0].trackKey;
  }
  if (Array.isArray(PISTAS) && PISTAS.length > 0 && PISTAS[0].trackKey) {
    return PISTAS[0].trackKey;
  }
  return "bahrain";
}

// pilotos da equipe (usa PILOTOS do data.js)
function getPilotosDaEquipe(equipeKey) {
  if (typeof PILOTOS === "undefined") return [];
  return PILOTOS.filter(p => p.equipe === equipeKey);
}

// formata dinheiro
function formatMoney(v) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// controle de telas
function mostrarTela(idTela) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("visible"));
  const alvo = document.getElementById(idTela);
  if (alvo) alvo.classList.add("visible");
}

/* ===============================
   CAPA
   =============================== */

const btnNovo = document.getElementById("btn-novo");
const btnContinuar = document.getElementById("btn-continuar");

if (btnNovo) {
  btnNovo.onclick = () => {
    console.log("Novo jogo clicado");

    // cria gerente simples
    JOGO.gerente = { nome: "Novo Gerente", score: 50 };

    // escolhe uma equipe aleatória
    const eq = ESCUDERIAS[Math.floor(Math.random() * ESCUDERIAS.length)];
    JOGO.equipeAtual = eq;
    JOGO.dinheiro = eq.financas || 5000000;
    JOGO.proximaCorrida = getPrimeiraPistaKey();
    JOGO.ultimaCorrida = null;
    JOGO.resultadoCorrida = [];

    mostrarLobby();
  };
}

if (btnContinuar) {
  btnContinuar.onclick = () => {
    console.log("Continuar carreira clicado");
    carregarJogo();
  };
}

/* ===============================
   LOBBY
   =============================== */

function mostrarLobby() {
  if (!JOGO.equipeAtual) {
    console.warn("Sem equipe atual, voltando para capa");
    mostrarTela("tela-capa");
    return;
  }

  const logoEl = document.getElementById("lobby-logo");
  const nomeEquipeEl = document.getElementById("lobby-equipe-nome");
  const nomeGerenteEl = document.getElementById("lobby-gerente-nome");
  const dinheiroEl = document.getElementById("lobby-dinheiro");
  const avatarEl = document.getElementById("lobby-avatar");

  if (logoEl) {
    logoEl.src = "assets/logos/" + (JOGO.equipeAtual.logo || "default_team.png");
  }
  if (nomeEquipeEl) {
    nomeEquipeEl.innerText = JOGO.equipeAtual.nome || "-";
  }
  if (nomeGerenteEl) {
    nomeGerenteEl.innerText = JOGO.gerente ? JOGO.gerente.nome : "-";
  }
  if (dinheiroEl) {
    dinheiroEl.innerText = formatMoney(JOGO.dinheiro);
  }
  if (avatarEl) {
    avatarEl.src = "assets/avatars/manager_default.png";
  }

  mostrarTela("tela-lobby");
  console.log("Lobby exibido");
}

/* botão "Voltar à Capa" (só no lobby) */
const btnVoltarCapa = document.getElementById("btn-voltar-capa");
if (btnVoltarCapa) {
  btnVoltarCapa.onclick = () => {
    mostrarTela("tela-capa");
  };
}

/* botões "Voltar ao Lobby" nas outras telas */
document.querySelectorAll(".btn-voltar-lobby").forEach(btn => {
  btn.onclick = () => {
    mostrarLobby();
  };
});

/* ===============================
   TREINO
   =============================== */

const btnTreino = document.getElementById("btn-treino");
if (btnTreino) {
  btnTreino.onclick = () => {
    mostrarTela("tela-treino");
    simularTreino();
  };
}

function simularTreino() {
  const out = document.getElementById("treino-feedback");
  if (!out) return;

  const s = JOGO.setup;
  const feedback = [];

  if (s.asa > 0.7) feedback.push("Boa aderência nas curvas, mas perdendo velocidade nas retas.");
  if (s.asa < 0.3) feedback.push("Excelente velocidade em reta, mas escorregando nas curvas rápidas.");

  if (s.suspensao > 0.7) feedback.push("Carro responde bem, porém os pneus se desgastam mais rápido.");
  if (s.suspensao < 0.3) feedback.push("Confortável, porém lento na troca de direção.");

  if (s.altura < 0.3) feedback.push("Downforce alto, cuidado com desgaste de pneus em curvas.");
  if (s.altura > 0.7) feedback.push("Pouca aerodinâmica, perdendo performance geral.");

  if (s.diferencial > 0.7) feedback.push("Boa tração na saída de curva, mas o carro fica mais arisco no limite.");
  if (s.diferencial < 0.3) feedback.push("Tração segura, porém sai das curvas com menos agressividade.");

  if (feedback.length === 0) {
    feedback.push("Setup bem equilibrado para essa pista.");
  }

  out.innerHTML = feedback.map(f => "<p>• " + f + "</p>").join("");
}

/* ===============================
   OFICINA / SETUP
   =============================== */

const btnOficina = document.getElementById("btn-oficina");
if (btnOficina) {
  btnOficina.onclick = () => {
    mostrarTela("tela-oficina");

    const s = JOGO.setup;
    const asa = document.getElementById("slider-asa");
    const susp = document.getElementById("slider-susp");
    const alt = document.getElementById("slider-altura");
    const dif = document.getElementById("slider-dif");

    if (asa) asa.value = s.asa * 100;
    if (susp) susp.value = s.suspensao * 100;
    if (alt) alt.value = s.altura * 100;
    if (dif) dif.value = s.diferencial * 100;
  };
}

const btnSalvarSetup = document.getElementById("btn-salvar-setup");
if (btnSalvarSetup) {
  btnSalvarSetup.onclick = () => {
    const asa = document.getElementById("slider-asa");
    const susp = document.getElementById("slider-susp");
    const alt = document.getElementById("slider-altura");
    const dif = document.getElementById("slider-dif");

    if (asa) JOGO.setup.asa = asa.value / 100;
    if (susp) JOGO.setup.suspensao = susp.value / 100;
    if (alt) JOGO.setup.altura = alt.value / 100;
    if (dif) JOGO.setup.diferencial = dif.value / 100;

    mostrarLobby();
  };
}

/* ===============================
   CLASSIFICAÇÃO
   =============================== */

const btnClassificacao = document.getElementById("btn-classificacao");
if (btnClassificacao) {
  btnClassificacao.onclick = () => {
    iniciarQualificacao();
  };
}

function iniciarQualificacao() {
  mostrarTela("tela-classificacao");
  simularQualificacao();
}

function simularQualificacao() {
  const out = document.getElementById("classificacao-result");
  if (!out) return;

  const pilotos = getPilotosDaEquipe(JOGO.equipeAtual.key);
  if (!pilotos.length) {
    out.innerHTML = "<p>Nenhum piloto associado à equipe.</p>";
    return;
  }

  const baseTempo = 90 - (JOGO.setup.asa - 0.5) * 4;

  const resultados = pilotos.map(p => {
    const variacao = Math.random() * 2.5;
    const tempo = baseTempo + variacao - (p.rating - 80) * 0.05;
    return { piloto: p, tempo };
  }).sort((a, b) => a.tempo - b.tempo);

  out.innerHTML = "<h3>Classificação final:</h3>";
  resultados.forEach((r, idx) => {
    out.innerHTML += `<p>${idx + 1}. ${r.piloto.nome} — ${r.tempo.toFixed(3)}s</p>`;
  });

  const btnIrCorrida = document.getElementById("btn-ir-corrida");
  if (btnIrCorrida) {
    btnIrCorrida.onclick = () => {
      iniciarCorrida();
    };
  }
}

/* ===============================
   CORRIDA
   =============================== */

function iniciarCorrida() {
  if (!JOGO.proximaCorrida) {
    JOGO.proximaCorrida = getPrimeiraPistaKey();
  }

  mostrarTela("tela-corrida");

  const pilotos = getPilotosDaEquipe(JOGO.equipeAtual.key);
  const listaDrivers = pilotos.map(p => ({
    nome: p.nome,
    equipe: p.equipe,
    rating: p.rating,
    pais: p.pais,
    avatar: p.avatar
  }));

  if (typeof startRace2D === "function") {
    startRace2D(JOGO.proximaCorrida, listaDrivers, 10);
  } else {
    console.warn("startRace2D não encontrado.");
  }
}

/* ===============================
   PÓDIO
   =============================== */

window.irParaPodio = function () {
  mostrarTela("tela-podio");
  renderPodio();
};

function renderPodio() {
  const container = document.getElementById("podio-top3");
  if (!container) return;

  container.innerHTML = "";

  if (!JOGO.resultadoCorrida || !JOGO.resultadoCorrida.length) {
    container.innerHTML = "<p>Nenhum resultado disponível.</p>";
    return;
  }

  const top3 = JOGO.resultadoCorrida.slice(0, 3);

  top3.forEach((res, idx) => {
    const p = res.piloto;
    const equipe = ESCUDERIAS.find(e => e.key === p.equipe);
    const bandeira = BANDEIRAS.find(b => b.codigo === p.pais);

    const card = document.createElement("div");
    card.className = "podio-card";

    card.innerHTML = `
      <h3>${idx + 1}º Lugar</h3>
      <div class="podio-imagens">
        <img src="assets/faces/${p.avatar}" class="podio-avatar" alt="Piloto">
        ${bandeira ? `<img src="assets/flags/${bandeira.arquivo}" class="podio-flag" alt="${bandeira.nome}">` : ""}
        ${equipe ? `<img src="assets/logos/${equipe.logo}" class="podio-logo" alt="${equipe.nome}">` : ""}
      </div>
      <p class="podio-piloto">${p.nome}</p>
      <p class="podio-equipe">${equipe ? equipe.nome : ""}</p>
    `;
    container.appendChild(card);
  });
}

/* ===============================
   SALVAR / CARREGAR
   =============================== */

const btnSalvar = document.getElementById("btn-salvar");
if (btnSalvar) {
  btnSalvar.onclick = () => {
    salvarJogo();
  };
}

function salvarJogo() {
  try {
    localStorage.setItem(JOGO.saveKey, JSON.stringify(JOGO));
    alert("Carreira salva com sucesso!");
  } catch (e) {
    console.error(e);
    alert("Não foi possível salvar o jogo.");
  }
}

function carregarJogo() {
  try {
    const raw = localStorage.getItem(JOGO.saveKey);
    if (!raw) {
      alert("Nenhum save encontrado.");
      return;
    }
    const data = JSON.parse(raw);
    Object.assign(JOGO, data);
    mostrarLobby();
  } catch (e) {
    console.error(e);
    alert("Erro ao carregar save.");
  }
}
