// lobby.js (ESM) — Offline AAA Lobby + Patrocínios + Staff + Manager offers
// Salva no localStorage. Não usa APIs externas.

const STORAGE_KEY = "F1M25_SAVE_V1";

const $ = (id) => document.getElementById(id);

function money(n) {
  const v = Math.round(Number(n || 0));
  // formato BR simples
  return "R$ " + v.toLocaleString("pt-BR");
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function rnd(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function nowISO(){ return new Date().toISOString(); }

function loadSave(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.warn("Falha ao ler save:", e);
    return null;
  }
}

function saveGame(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState(){
  return {
    version: 1,
    createdAt: nowISO(),
    seasonYear: 2025,
    week: 1,
    team: {
      id: "redbull",
      name: "Red Bull Racing",
      reputation: 78, // 0-100
      money: 35000000,
      costCap: 135000000,
      // base stats do carro/equipe (0-100)
      car: { aero: 82, engine: 86, chassis: 80, reliability: 78 },
      staff: {
        // slots: estrategista, engenheiro, pitcrew, aero
        strategist: null,
        engineer: null,
        pitcrew: null,
        aerochief: null,
      },
      sponsors: {
        title: null,
        primary: null,
        secondary: null,
      }
    },
    manager: {
      name: "Manager",
      role: "Chefe de Equipe",
      contractYearsLeft: 2,
      objective: "Top 3 no campeonato de construtores",
      risk: 12, // 0-100
      offers: []
    },
    offers: {
      staff: [],
      sponsors: []
    },
    nextEvent: {
      trackKey: "australia",
      name: "GP da Austrália",
      type: "Race Weekend",
      desc: "Treinos, classificação e corrida. Ajuste staff e patrocínios para melhorar performance."
    }
  };
}

/**
 * Modificadores gerados por staff/sponsors.
 * Esses valores serão consumidos por practice/qualy/race quando voltarmos às pistas.
 */
function computeModifiers(state){
  const staff = state.team.staff;
  const sponsors = state.team.sponsors;

  const base = {
    setupBonus: 0,         // ajuda no setup/treino
    paceBonus: 0,          // bônus de ritmo geral
    tireWearBonus: 0,      // reduz desgaste (positivo = melhor)
    pitTimeBonus: 0,       // reduz tempo de pit (positivo = melhor)
    reliabilityBonus: 0,   // reduz chance de falha (positivo = melhor)
    moneyPerWeek: 0,       // renda fixa semanal
    sponsorPressure: 0,    // metas mais difíceis aumentam pressão
  };

  // Staff
  for(const key of Object.keys(staff)){
    const s = staff[key];
    if(!s) continue;
    base.setupBonus += s.bonuses.setupBonus || 0;
    base.paceBonus += s.bonuses.paceBonus || 0;
    base.tireWearBonus += s.bonuses.tireWearBonus || 0;
    base.pitTimeBonus += s.bonuses.pitTimeBonus || 0;
    base.reliabilityBonus += s.bonuses.reliabilityBonus || 0;
  }

  // Sponsors
  const list = Object.values(sponsors).filter(Boolean);
  for(const sp of list){
    base.moneyPerWeek += sp.moneyPerWeek || 0;
    base.sponsorPressure += sp.pressure || 0;

    // alguns patrocinadores dão bônus técnico leve
    base.paceBonus += sp.bonuses?.paceBonus || 0;
    base.reliabilityBonus += sp.bonuses?.reliabilityBonus || 0;
  }

  // suaviza extremos
  base.setupBonus = clamp(base.setupBonus, -10, 15);
  base.paceBonus = clamp(base.paceBonus, -10, 12);
  base.tireWearBonus = clamp(base.tireWearBonus, -10, 12);
  base.pitTimeBonus = clamp(base.pitTimeBonus, -10, 18);
  base.reliabilityBonus = clamp(base.reliabilityBonus, -10, 12);
  base.moneyPerWeek = clamp(base.moneyPerWeek, 0, 4000000);

  return base;
}

function teamOverall(car){
  const o = (car.aero + car.engine + car.chassis + car.reliability) / 4;
  return Math.round(o);
}

function ensureOffers(state){
  if(state.offers.staff.length < 4) state.offers.staff = generateStaffOffers(state, 6);
  if(state.offers.sponsors.length < 4) state.offers.sponsors = generateSponsorOffers(state, 6);
  if(state.manager.offers.length < 2) state.manager.offers = generateManagerOffers(state, 3);
}

function generateStaffOffers(state, count){
  const rep = state.team.reputation;

  const roles = [
    { key:"strategist", label:"Estrategista" },
    { key:"engineer", label:"Engenheiro de Pista" },
    { key:"pitcrew", label:"Chefe de Pit Crew" },
    { key:"aerochief", label:"Chefe de Aero" },
  ];

  const firstNames = ["Alex","Bruno","Carla","Diego","Enzo","Fábio","Gabi","Hugo","Iris","João","Kai","Lia","Maya","Noah","Otávio","Pietro","Rafa","Sofia","Theo","Vitor"];
  const lastNames = ["Silva","Souza","Almeida","Costa","Pereira","Lima","Gomes","Ribeiro","Carvalho","Fernandes","Santos","Oliveira","Araújo","Barbosa","Martins","Rocha"];

  const offers = [];
  for(let i=0;i<count;i++){
    const role = pick(roles);

    // skill escala com reputação
    const skill = clamp(rnd(rep - 20, rep + 20), 20, 99);

    // bônus por função
    const bonuses = {
      setupBonus: 0,
      paceBonus: 0,
      tireWearBonus: 0,
      pitTimeBonus: 0,
      reliabilityBonus: 0
    };

    if(role.key === "strategist"){
      bonuses.paceBonus = Math.round((skill - 50) / 18);
      bonuses.tireWearBonus = Math.round((skill - 50) / 22);
    }
    if(role.key === "engineer"){
      bonuses.setupBonus = Math.round((skill - 50) / 14);
      bonuses.reliabilityBonus = Math.round((skill - 50) / 24);
    }
    if(role.key === "pitcrew"){
      bonuses.pitTimeBonus = Math.round((skill - 50) / 10);
      bonuses.reliabilityBonus = Math.round((skill - 50) / 28);
    }
    if(role.key === "aerochief"){
      bonuses.paceBonus = Math.round((skill - 50) / 20);
      bonuses.setupBonus = Math.round((skill - 50) / 20);
    }

    // salário semanal
    const salary = clamp(80000 + skill * 4000, 90000, 520000);

    offers.push({
      id: "staff_" + Math.random().toString(16).slice(2),
      roleKey: role.key,
      roleLabel: role.label,
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      skill,
      salaryPerWeek: Math.round(salary),
      bonuses,
      contractWeeks: pick([26, 39, 52]),
      createdAt: nowISO()
    });
  }

  return offers;
}

function generateSponsorOffers(state, count){
  const rep = state.team.reputation;
  const pools = [
    { name:"Apex Finance", tier:"Title", base: 750000, pressure: 18, bonuses:{ paceBonus: 1 } },
    { name:"TurboTel", tier:"Title", base: 680000, pressure: 16, bonuses:{ reliabilityBonus: 1 } },
    { name:"Nova Energy", tier:"Primary", base: 420000, pressure: 12, bonuses:{ paceBonus: 0 } },
    { name:"Skyline Logistics", tier:"Primary", base: 380000, pressure: 10, bonuses:{ reliabilityBonus: 0 } },
    { name:"Vector Wear", tier:"Secondary", base: 220000, pressure: 8, bonuses:{} },
    { name:"Helix Drinks", tier:"Secondary", base: 200000, pressure: 7, bonuses:{} },
    { name:"Orion Tech", tier:"Secondary", base: 240000, pressure: 9, bonuses:{ paceBonus: 1 } },
  ];

  const objectives = [
    { label:"Marcar 12+ pontos no próximo GP", difficulty: 12, bonus: 2500000 },
    { label:"Terminar entre os 8 primeiros no próximo GP", difficulty: 14, bonus: 2200000 },
    { label:"Fazer 1 pit stop abaixo de 2.6s", difficulty: 10, bonus: 1600000 },
    { label:"Não ter falhas mecânicas no próximo GP", difficulty: 9, bonus: 1400000 },
    { label:"Ganhar 2 posições na largada", difficulty: 11, bonus: 1800000 },
  ];

  const offers = [];
  for(let i=0;i<count;i++){
    const p = pick(pools);
    const obj = pick(objectives);

    // rep aumenta pagamento; baixa rep piora
    const repFactor = clamp((rep - 50) / 50, -0.35, 0.45);
    const moneyPerWeek = Math.round(p.base * (1 + repFactor) * (p.tier==="Title" ? 1.2 : p.tier==="Primary" ? 1.0 : 0.85));

    offers.push({
      id: "sp_" + Math.random().toString(16).slice(2),
      name: p.name,
      tier: p.tier, // Title / Primary / Secondary
      moneyPerWeek,
      pressure: p.pressure + Math.round(obj.difficulty / 3),
      objective: obj.label,
      bonus: obj.bonus,
      durationWeeks: pick([26, 39, 52]),
      bonuses: p.bonuses || {}
    });
  }
  return offers;
}

function generateManagerOffers(state, count){
  const rep = state.team.reputation;
  const teams = [
    { id:"williams", name:"Williams", repReq: 35, salary: 400000 },
    { id:"haas", name:"Haas", repReq: 30, salary: 360000 },
    { id:"alpine", name:"Alpine", repReq: 45, salary: 520000 },
    { id:"mclaren", name:"McLaren", repReq: 60, salary: 650000 },
    { id:"mercedes", name:"Mercedes", repReq: 70, salary: 780000 },
    { id:"ferrari", name:"Ferrari", repReq: 75, salary: 820000 },
  ];

  const out = [];
  for(let i=0;i<count;i++){
    const t = pick(teams);
    const eligible = rep >= t.repReq;
    out.push({
      id: "mgr_" + Math.random().toString(16).slice(2),
      teamId: t.id,
      teamName: t.name,
      salaryPerWeek: t.salary,
      contractYears: pick([1,2,3]),
      requirement: `Reputação ${t.repReq}+`,
      eligible
    });
  }
  // remove duplicados por teamId
  const seen = new Set();
  return out.filter(o => (seen.has(o.teamId) ? false : (seen.add(o.teamId), true)));
}

function setModal(modalId, open){
  const el = $(modalId);
  if(!el) return;
  el.setAttribute("aria-hidden", open ? "false" : "true");
}

function bindModalClose(modalId){
  const el = $(modalId);
  if(!el) return;
  el.addEventListener("click", (e)=>{
    const target = e.target;
    if(target && target.dataset && target.dataset.close === "1"){
      setModal(modalId, false);
    }
  });
}

function render(){
  const state = window.__STATE;
  const mods = computeModifiers(state);

  // header stats
  $("teamName").textContent = state.team.name;
  $("teamRep").textContent = `${state.team.reputation}/100`;
  $("teamMoney").textContent = money(state.team.money);
  $("teamCap").textContent = money(state.team.costCap);
  $("managerRole").textContent = state.manager.role;

  // car/stats
  $("carOverall").textContent = teamOverall(state.team.car);
  $("pitSkill").textContent = state.team.staff.pitcrew ? state.team.staff.pitcrew.skill : "—";
  $("engSkill").textContent = state.team.staff.engineer ? state.team.staff.engineer.skill : "—";
  $("stratSkill").textContent = state.team.staff.strategist ? state.team.staff.strategist.skill : "—";

  // next event
  $("nextEventName").textContent = state.nextEvent.name;
  $("nextEventType").textContent = state.nextEvent.type;
  $("nextEventDesc").textContent = state.nextEvent.desc;

  // manager
  $("mgrName").textContent = state.manager.name;
  $("mgrContract").textContent = `${state.manager.contractYearsLeft} ano(s) restante(s)`;
  $("mgrObjective").textContent = state.manager.objective;
  $("mgrRisk").textContent = `${state.manager.risk}/100`;

  // staff list
  renderStaff(state);
  renderStaffOffers(state);

  // sponsor list
  renderSponsors(state);
  renderSponsorOffers(state);

  // manager offers
  renderManagerOffers(state);

  // build info
  $("buildInfo").textContent = `Build: Lobby AAA | Mods: setup ${mods.setupBonus}, pace ${mods.paceBonus}, pit ${mods.pitTimeBonus}, rel ${mods.reliabilityBonus}, +${money(mods.moneyPerWeek)}/sem`;

  saveGame(state);
}

function renderStaff(state){
  const el = $("staffList");
  el.innerHTML = "";

  const slots = [
    { key:"strategist", label:"Estrategista" },
    { key:"engineer", label:"Engenheiro de Pista" },
    { key:"pitcrew", label:"Chefe de Pit Crew" },
    { key:"aerochief", label:"Chefe de Aero" },
  ];

  for(const slot of slots){
    const s = state.team.staff[slot.key];
    const div = document.createElement("div");
    div.className = "item";

    if(!s){
      div.innerHTML = `
        <div class="itemTop">
          <div>
            <div class="itemTitle">${slot.label}</div>
            <div class="itemSub">Vago. Contrate alguém nas ofertas abaixo.</div>
          </div>
          <div class="itemMeta">
            <span class="tag tag--warn">Sem bônus</span>
          </div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="itemTop">
          <div>
            <div class="itemTitle">${slot.label} — ${s.name}</div>
            <div class="itemSub">Skill ${s.skill} • Salário/sem: ${money(s.salaryPerWeek)} • Contrato: ${s.contractWeeks} semanas</div>
          </div>
          <div class="itemMeta">
            <span class="tag tag--good">setup ${s.bonuses.setupBonus||0}</span>
            <span class="tag tag--good">pace ${s.bonuses.paceBonus||0}</span>
            <span class="tag tag--good">pit ${s.bonuses.pitTimeBonus||0}</span>
            <span class="tag tag--good">rel ${s.bonuses.reliabilityBonus||0}</span>
          </div>
        </div>
        <div class="itemActions">
          <button class="btn btn--ghost" data-fire="${slot.key}">Demitir</button>
        </div>
      `;
    }

    el.appendChild(div);
  }

  el.querySelectorAll("[data-fire]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.fire;
      const current = state.team.staff[key];
      if(!current) return;
      // penalidade leve por demissão
      state.team.reputation = clamp(state.team.reputation - 2, 0, 100);
      state.team.staff[key] = null;
      render();
    });
  });
}

function renderStaffOffers(state){
  const el = $("staffOffers");
  el.innerHTML = "";

  if(!state.offers.staff.length){
    el.innerHTML = `<div class="item"><div class="itemTitle">Sem ofertas no momento</div></div>`;
    return;
  }

  for(const offer of state.offers.staff){
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">${offer.roleLabel} — ${offer.name}</div>
          <div class="itemSub">Skill ${offer.skill} • Salário/sem: ${money(offer.salaryPerWeek)} • Contrato: ${offer.contractWeeks} semanas</div>
        </div>
        <div class="itemMeta">
          <span class="tag tag--good">setup ${offer.bonuses.setupBonus||0}</span>
          <span class="tag tag--good">pace ${offer.bonuses.paceBonus||0}</span>
          <span class="tag tag--good">pit ${offer.bonuses.pitTimeBonus||0}</span>
          <span class="tag tag--good">rel ${offer.bonuses.reliabilityBonus||0}</span>
        </div>
      </div>
      <div class="itemActions">
        <button class="btn btn--primary" data-hire="${offer.id}">Contratar</button>
      </div>
    `;
    el.appendChild(div);
  }

  el.querySelectorAll("[data-hire]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.hire;
      const offer = state.offers.staff.find(o => o.id === id);
      if(!offer) return;

      // custo inicial (adiantamento 2 semanas)
      const upfront = offer.salaryPerWeek * 2;
      if(state.team.money < upfront){
        alert("Dinheiro insuficiente para contratação (adiantamento 2 semanas).");
        return;
      }

      state.team.money -= upfront;

      // coloca no slot
      state.team.staff[offer.roleKey] = {
        name: offer.name,
        skill: offer.skill,
        salaryPerWeek: offer.salaryPerWeek,
        contractWeeks: offer.contractWeeks,
        bonuses: offer.bonuses
      };

      // reputação sobe
      state.team.reputation = clamp(state.team.reputation + 1, 0, 100);

      // remove oferta (e gera nova depois)
      state.offers.staff = state.offers.staff.filter(o => o.id !== id);
      if(state.offers.staff.length < 4) state.offers.staff = state.offers.staff.concat(generateStaffOffers(state, 3));

      render();
    });
  });
}

function renderSponsors(state){
  const el = $("sponsorList");
  el.innerHTML = "";

  const slots = [
    { key:"title", label:"Patrocínio Master (Title)" },
    { key:"primary", label:"Patrocínio Principal (Primary)" },
    { key:"secondary", label:"Patrocínio Secundário (Secondary)" },
  ];

  for(const slot of slots){
    const sp = state.team.sponsors[slot.key];
    const div = document.createElement("div");
    div.className = "item";

    if(!sp){
      div.innerHTML = `
        <div class="itemTop">
          <div>
            <div class="itemTitle">${slot.label}</div>
            <div class="itemSub">Vago. Aceite uma oferta abaixo.</div>
          </div>
          <div class="itemMeta">
            <span class="tag tag--warn">Sem renda</span>
          </div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="itemTop">
          <div>
            <div class="itemTitle">${slot.label} — ${sp.name}</div>
            <div class="itemSub">Renda/sem: ${money(sp.moneyPerWeek)} • Duração: ${sp.durationWeeks} semanas</div>
          </div>
          <div class="itemMeta">
            <span class="tag tag--good">Bônus: ${money(sp.bonus)}</span>
            <span class="tag ${sp.pressure>=18 ? "tag--bad" : sp.pressure>=12 ? "tag--warn" : "tag--good"}">Pressão ${sp.pressure}</span>
          </div>
        </div>
        <div class="itemSub"><b>Objetivo:</b> ${sp.objective}</div>
        <div class="itemActions">
          <button class="btn btn--ghost" data-drop="${slot.key}">Encerrar</button>
        </div>
      `;
    }

    el.appendChild(div);
  }

  el.querySelectorAll("[data-drop]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const slotKey = btn.dataset.drop;
      if(!state.team.sponsors[slotKey]) return;
      // encerrar patrocinador reduz reputação
      state.team.reputation = clamp(state.team.reputation - 3, 0, 100);
      state.team.sponsors[slotKey] = null;
      render();
    });
  });
}

function renderSponsorOffers(state){
  const el = $("sponsorOffers");
  el.innerHTML = "";

  if(!state.offers.sponsors.length){
    el.innerHTML = `<div class="item"><div class="itemTitle">Sem ofertas no momento</div></div>`;
    return;
  }

  for(const sp of state.offers.sponsors){
    const div = document.createElement("div");
    div.className = "item";

    const slot = sp.tier === "Title" ? "title" : sp.tier === "Primary" ? "primary" : "secondary";
    const occupied = !!state.team.sponsors[slot];

    div.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">${sp.tier} — ${sp.name}</div>
          <div class="itemSub">Renda/sem: ${money(sp.moneyPerWeek)} • Duração: ${sp.durationWeeks} semanas</div>
        </div>
        <div class="itemMeta">
          <span class="tag tag--good">Bônus: ${money(sp.bonus)}</span>
          <span class="tag ${sp.pressure>=18 ? "tag--bad" : sp.pressure>=12 ? "tag--warn" : "tag--good"}">Pressão ${sp.pressure}</span>
        </div>
      </div>
      <div class="itemSub"><b>Objetivo:</b> ${sp.objective}</div>
      <div class="itemActions">
        <button class="btn ${occupied ? "btn--secondary" : "btn--primary"}" data-acceptsp="${sp.id}">
          ${occupied ? "Substituir" : "Aceitar"}
        </button>
      </div>
    `;
    el.appendChild(div);
  }

  el.querySelectorAll("[data-acceptsp]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.acceptsp;
      const offer = state.offers.sponsors.find(o => o.id === id);
      if(!offer) return;

      const slot = offer.tier === "Title" ? "title" : offer.tier === "Primary" ? "primary" : "secondary";

      // aceitar dá dinheiro inicial (2 semanas)
      const upfront = offer.moneyPerWeek * 2;
      state.team.money += upfront;

      state.team.sponsors[slot] = offer;

      // reputação sobe, mas pressão aumenta risco do manager
      state.team.reputation = clamp(state.team.reputation + 2, 0, 100);
      state.manager.risk = clamp(state.manager.risk + Math.round(offer.pressure / 6), 0, 100);

      state.offers.sponsors = state.offers.sponsors.filter(o => o.id !== id);
      if(state.offers.sponsors.length < 4) state.offers.sponsors = state.offers.sponsors.concat(generateSponsorOffers(state, 3));

      render();
    });
  });
}

function renderManagerOffers(state){
  const el = $("managerOffers");
  el.innerHTML = "";

  if(!state.manager.offers.length){
    el.innerHTML = `<div class="item"><div class="itemTitle">Nenhuma oferta no momento</div></div>`;
    return;
  }

  for(const o of state.manager.offers){
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="itemTop">
        <div>
          <div class="itemTitle">${o.teamName}</div>
          <div class="itemSub">Salário/sem: ${money(o.salaryPerWeek)} • Contrato: ${o.contractYears} ano(s)</div>
        </div>
        <div class="itemMeta">
          <span class="tag ${o.eligible ? "tag--good" : "tag--bad"}">${o.eligible ? "Elegível" : "Bloqueado"}</span>
          <span class="tag">${o.requirement}</span>
        </div>
      </div>
      <div class="itemActions">
        <button class="btn ${o.eligible ? "btn--primary" : "btn--ghost"}" data-acceptmgr="${o.id}" ${o.eligible ? "" : "disabled"}>
          Aceitar oferta
        </button>
      </div>
    `;

    el.appendChild(div);
  }

  el.querySelectorAll("[data-acceptmgr]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.acceptmgr;
      const offer = state.manager.offers.find(x => x.id === id);
      if(!offer || !offer.eligible) return;

      // troca de equipe (simplificado)
      state.team.id = offer.teamId;
      state.team.name = offer.teamName;
      state.manager.contractYearsLeft = offer.contractYears;
      state.manager.risk = 10;

      // mudar reputação base conforme equipe (fictício)
      const mapRep = {
        williams: 40, haas: 35, alpine: 50,
        mclaren: 62, mercedes: 74, ferrari: 76
      };
      state.team.reputation = mapRep[offer.teamId] ?? 50;

      // dinheiro base
      state.team.money = 18000000 + state.team.reputation * 250000;

      // limpa staff e sponsors (decisão de design)
      state.team.staff = { strategist:null, engineer:null, pitcrew:null, aerochief:null };
      state.team.sponsors = { title:null, primary:null, secondary:null };

      // gera ofertas novas
      state.offers.staff = generateStaffOffers(state, 6);
      state.offers.sponsors = generateSponsorOffers(state, 6);
      state.manager.offers = generateManagerOffers(state, 3);

      render();
    });
  });
}

function simulateWeek(state){
  const mods = computeModifiers(state);

  state.week += 1;

  // Renda semanal de patrocínios
  state.team.money += mods.moneyPerWeek;

  // Pagar salários dos funcionários
  const staff = Object.values(state.team.staff).filter(Boolean);
  let payroll = 0;
  for(const s of staff){
    payroll += s.salaryPerWeek || 0;
    s.contractWeeks = Math.max(0, (s.contractWeeks || 0) - 1);
  }
  state.team.money = Math.max(0, state.team.money - payroll);

  // Contratos expiram
  for(const key of Object.keys(state.team.staff)){
    const s = state.team.staff[key];
    if(s && s.contractWeeks <= 0){
      state.team.staff[key] = null;
      state.team.reputation = clamp(state.team.reputation - 1, 0, 100);
    }
  }

  // Risco do manager flutua com pressão dos sponsors
  state.manager.risk = clamp(state.manager.risk + Math.round(mods.sponsorPressure / 8) - 1, 0, 100);

  // Se risco alto, gerar notícia via ofertas
  if(state.manager.risk >= 85){
    state.manager.role = "Em risco";
  } else {
    state.manager.role = "Chefe de Equipe";
  }

  // Chance de nova oferta de manager (se rep boa)
  if(state.team.reputation >= 55 && Math.random() < 0.35){
    state.manager.offers = generateManagerOffers(state, 3);
  }

  // Regerar ofertas de staff/sponsors às vezes
  if(Math.random() < 0.5) state.offers.staff = generateStaffOffers(state, 6);
  if(Math.random() < 0.45) state.offers.sponsors = generateSponsorOffers(state, 6);

  // Se risco 100, "demissão" (simplificado)
  if(state.manager.risk >= 100){
    // queda de equipe para uma menor
    state.team.id = "williams";
    state.team.name = "Williams";
    state.team.reputation = 40;
    state.team.money = 16000000;
    state.manager.risk = 25;
    state.manager.contractYearsLeft = 1;
    state.manager.objective = "Marcar pontos com consistência";
    state.team.staff = { strategist:null, engineer:null, pitcrew:null, aerochief:null };
    state.team.sponsors = { title:null, primary:null, secondary:null };
  }

  render();
}

function openSessionPage(page, sessionType){
  // Ajuste aqui se seus arquivos tiverem outros nomes/caminhos:
  // practice.html, qualifying.html, race.html

  const state = window.__STATE;
  const trackKey = state.nextEvent.trackKey || "australia";

  // Passa dados de modificadores via query params (consumiremos depois nas pistas)
  const mods = computeModifiers(state);

  const url = new URL(page, window.location.href);
  url.searchParams.set("track", trackKey);
  url.searchParams.set("session", sessionType);

  // team & mods
  url.searchParams.set("team", state.team.id);
  url.searchParams.set("rep", String(state.team.reputation));
  url.searchParams.set("money", String(state.team.money));

  url.searchParams.set("m_setup", String(mods.setupBonus));
  url.searchParams.set("m_pace", String(mods.paceBonus));
  url.searchParams.set("m_tire", String(mods.tireWearBonus));
  url.searchParams.set("m_pit", String(mods.pitTimeBonus));
  url.searchParams.set("m_rel", String(mods.reliabilityBonus));

  window.location.href = url.toString();
}

function boot(){
  // carregar ou criar save
  let state = loadSave();
  if(!state){
    state = defaultState();
    saveGame(state);
  }

  window.__STATE = state;

  // gerar ofertas se faltando
  ensureOffers(state);

  // binds
  $("btnHelp").addEventListener("click", ()=> setModal("helpModal", true));
  $("btnReset").addEventListener("click", ()=>{
    if(!confirm("Resetar a carreira? Isso apaga o save local.")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.__STATE = defaultState();
    render();
  });

  // main buttons
  $("btnContinue").addEventListener("click", ()=> {
    // continuar carreira = abrir treino livre por padrão
    openSessionPage("./practice.html", "practice");
  });

  $("btnPractice").addEventListener("click", ()=> openSessionPage("./practice.html", "practice"));
  $("btnQualy").addEventListener("click", ()=> openSessionPage("./qualifying.html", "qualifying"));
  $("btnRace").addEventListener("click", ()=> openSessionPage("./race.html", "race"));

  $("btnQuickRace").addEventListener("click", ()=> setModal("quickRaceModal", true));

  // quick race modal
  $("qrPractice").addEventListener("click", ()=>{
    const track = ($("qrTrack").value || "australia").trim().toLowerCase();
    const url = new URL("./practice.html", window.location.href);
    url.searchParams.set("track", track);
    url.searchParams.set("quick", "1");
    window.location.href = url.toString();
  });

  $("qrQualy").addEventListener("click", ()=>{
    const track = ($("qrTrack").value || "australia").trim().toLowerCase();
    const url = new URL("./qualifying.html", window.location.href);
    url.searchParams.set("track", track);
    url.searchParams.set("quick", "1");
    window.location.href = url.toString();
  });

  $("qrRace").addEventListener("click", ()=>{
    const track = ($("qrTrack").value || "australia").trim().toLowerCase();
    const url = new URL("./race.html", window.location.href);
    url.searchParams.set("track", track);
    url.searchParams.set("quick", "1");
    window.location.href = url.toString();
  });

  // offers refresh
  $("btnRefreshStaff").addEventListener("click", ()=>{
    state.offers.staff = generateStaffOffers(state, 6);
    render();
  });

  $("btnRefreshSponsors").addEventListener("click", ()=>{
    state.offers.sponsors = generateSponsorOffers(state, 6);
    render();
  });

  $("btnRefreshManagerOffers").addEventListener("click", ()=>{
    state.manager.offers = generateManagerOffers(state, 3);
    render();
  });

  $("btnSimulateWeek").addEventListener("click", ()=> simulateWeek(state));

  // modal close
  bindModalClose("quickRaceModal");
  bindModalClose("helpModal");

  // init manager name from URL if present
  const url = new URL(window.location.href);
  const fromName = url.searchParams.get("managerName");
  if(fromName && fromName.trim().length >= 2){
    state.manager.name = fromName.trim().slice(0, 24);
  }
  const fromTeam = url.searchParams.get("userTeam");
  if(fromTeam && fromTeam.trim()){
    state.team.id = fromTeam.trim().toLowerCase();
  }

  render();
}

boot();