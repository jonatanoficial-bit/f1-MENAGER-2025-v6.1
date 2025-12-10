// ============================================
// OFICINA – SETUP
// ============================================

let setupState = {
  team: null,
  frontWing: 5,
  rearWing: 5,
  tyrePress: 21,
  rideHeight: 5,
  susp: 5
};

window.addEventListener("DOMContentLoaded", initOficina);

function initOficina(){

  // CARREGAR TIME
  setupState.team =
    localStorage.getItem("f1m2025_user_team") || "ferrari";

  // TÍTULO E LOGO
  document.getElementById("oficina-team-name").textContent =
    setupState.team.toUpperCase();

  document.getElementById("oficina-team-logo").src =
    `assets/logos/${setupState.team}.png`;

  // CARREGAR SETUP SALVO
  loadSavedSetup();

  // ATRIBUIR VALORES VISUAIS
  bindSliders();

  // BOTÕES
  document.getElementById("back-lobby-btn").onclick = ()=>{
    window.location.href="lobby.html";
  };

  document.getElementById("save-setup-btn").onclick = ()=>{
    saveSetupToStorage();
    alert("Ajustes salvos com sucesso!");
  };

  // CALCULO INICIAL
  updateSummary();
}

// ============================================
// CARREGAR SETUP DO TREINO OU ANTERIOR
// ============================================

function loadSavedSetup(){
  try{
    let saved = localStorage.getItem("f1m2025_car_setup");
    if(saved){
      let data = JSON.parse(saved);
      setupState = {...setupState, ...data};
    }
  }catch(e){}
}

// ============================================
// SLIDERS
// ============================================

function bindSliders(){

  const sliders = [
    ["frontWing","setup-frontwing", "val-frontwing"],
    ["rearWing","setup-rearwing", "val-rearwing"],
    ["tyrePress","setup-tyrepress", "val-tyrepress"],
    ["rideHeight","setup-rideheight", "val-rideheight"],
    ["susp","setup-susp", "val-susp"]
  ];

  sliders.forEach(([key, inputId, valueId])=>{
    const el = document.getElementById(inputId);
    const val = document.getElementById(valueId);

    el.value = setupState[key];
    val.textContent = el.value;

    el.oninput = ()=>{
      setupState[key] = parseFloat(el.value);
      val.textContent = el.value;
      updateSummary();
    };
  });
}

// ============================================
// RESUMO
// ============================================

function updateSummary(){

  // Valores simulados para feedback visual
  let speed = 300 + setupState.frontWing*1.5 - setupState.rearWing*0.5;
  let tyre = 20 + (setupState.tyrePress - 21) * 4;
  let corner = (setupState.rearWing + setupState.susp) * 4;

  document.getElementById("sum-speed").textContent =
    Math.round(speed) + " km/h";

  document.getElementById("sum-tyre").textContent =
    Math.round(tyre) + "% desgaste";

  document.getElementById("sum-corner").textContent =
    Math.round(corner) + "%";
}

// ============================================
// SALVAR
// ============================================

function saveSetupToStorage(){
  try{
    localStorage.setItem("f1m2025_car_setup", JSON.stringify(setupState));
  }catch(e){
    console.warn("Erro ao salvar setup:", e);
  }
}
