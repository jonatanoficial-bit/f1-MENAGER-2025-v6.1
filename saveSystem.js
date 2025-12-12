/* =========================================================
   F1 MANAGER 2025 — STAFF SYSTEM
   ✔ Impacto real em corrida, pit e oficina
   ✔ Conectado ao GAME_STATE
   ✔ Contratação / Demissão
   ✔ Custos mensais
   ========================================================= */

if (!window.GAME_STATE) {
  console.error("❌ GAME_STATE não encontrado");
}

/* =========================
   CATÁLOGO DE FUNCIONÁRIOS
   ========================= */

const STAFF_POOL = [
  { role: "mechanic", name: "Mecânico Júnior", level: 1, skill: 65, salary: 120_000 },
  { role: "mechanic", name: "Mecânico Sênior", level: 3, skill: 82, salary: 380_000 },
  { role: "mechanic", name: "Mecânico Elite", level: 5, skill: 95, salary: 850_000 },

  { role: "engineer", name: "Engenheiro Júnior", level: 1, skill: 68, salary: 180_000 },
  { role: "engineer", name: "Engenheiro de Performance", level: 3, skill: 85, salary: 520_000 },
  { role: "engineer", name: "Engenheiro Chefe", level: 5, skill: 96, salary: 1_200_000 },

  { role: "marketing", name: "Marketing Júnior", level: 1, skill: 60, salary: 140_000 },
  { role: "marketing", name: "Marketing Global", level: 4, skill: 90, salary: 700_000 }
];

/* =========================
   CONTRATAR FUNCIONÁRIO
   ========================= */

window.hireStaff = function (staffTemplate) {
  const staff = {
    id: crypto.randomUUID(),
    role: staffTemplate.role,
    name: staffTemplate.name,
    level: staffTemplate.level,
    skill: staffTemplate.skill,
    salary: staffTemplate.salary,
    morale: 80
  };

  GAME_STATE.staff.push(staff);
  GAME_STATE.team.budget -= staff.salary;

  recalcStaffModifiers();
  console.log("✅ Funcionário contratado:", staff.name);
};

/* =========================
   DEMITIR FUNCIONÁRIO
   ========================= */

window.fireStaff = function (id) {
  const idx = GAME_STATE.staff.findIndex(s => s.id === id);
  if (idx === -1) return;

  const fired = GAME_STATE.staff[idx];
  GAME_STATE.staff.splice(idx, 1);

  GAME_STATE.manager.score -= 25; // impacto de reputação
  recalcStaffModifiers();

  console.log("❌ Funcionário demitido:", fired.name);
};

/* =========================
   RECÁLCULO DE MODIFICADORES
   ========================= */

function recalcStaffModifiers() {
  const staff = GAME_STATE.staff;

  const mechanics = staff.filter(s => s.role === "mechanic");
  const engineers = staff.filter(s => s.role === "engineer");
  const marketing = staff.filter(s => s.role === "marketing");

  // ---------- PIT STOP ----------
  const mechSkillAvg = avg(mechanics.map(m => m.skill));
  const mechLevelAvg = avg(mechanics.map(m => m.level));

  GAME_STATE.modifiers.pitTime =
    -(mechSkillAvg * 0.025) - (mechLevelAvg * 0.15);
  // Ex: até -1.5s de pit

  // ---------- OFICINA / SETUP ----------
  const engSkillAvg = avg(engineers.map(e => e.skill));
  const engLevelAvg = avg(engineers.map(e => e.level));

  GAME_STATE.modifiers.setupEfficiency =
    (engSkillAvg * 0.35) + (engLevelAvg * 2.5);

  // ---------- PATROCÍNIO ----------
  const mktSkillAvg = avg(marketing.map(m => m.skill));
  const mktLevelAvg = avg(marketing.map(m => m.level));

  GAME_STATE.modifiers.sponsorBoost =
    (mktSkillAvg * 0.4) + (mktLevelAvg * 6);

  console.log("🔧 Modificadores atualizados:", GAME_STATE.modifiers);
}

/* =========================
   CUSTO MENSAL DE STAFF
   ========================= */

window.processMonthlyStaffCost = function () {
  const total = GAME_STATE.staff.reduce((s, f) => s + f.salary, 0);
  GAME_STATE.team.budget -= total;

  if (GAME_STATE.team.budget < 0) {
    GAME_STATE.manager.score -= 50;
  }
};

/* =========================
   UTIL
   ========================= */

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/* =========================
   INIT
   ========================= */

recalcStaffModifiers();
console.log("✅ staffSystem.js carregado corretamente");
