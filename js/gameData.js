/* ============================================================
   F1 MANAGER 2025 — GAME DATA (OFFLINE)
   Sponsors + Staff market
   ============================================================ */

(function () {
  const Sponsors = [
    {
      id: "s_orion",
      name: "ORION ENERGY",
      tier: "MASTER",
      weeklyPay: 2800000,
      signingBonus: 4000000,
      goals: [
        { id: "g_points_50", label: "Marcar 50+ pontos na temporada", bonus: 6000000 },
        { id: "g_podium_2", label: "Conseguir 2 pódios", bonus: 8000000 },
      ],
      reputationMin: 55,
      flavor: "Aposta alto, exige resultado. Excelente para equipes competitivas.",
    },
    {
      id: "s_vortex",
      name: "VORTEX MOBILE",
      tier: "PRIME",
      weeklyPay: 1800000,
      signingBonus: 2500000,
      goals: [
        { id: "g_top10_10", label: "10 chegadas no Top 10", bonus: 4500000 },
        { id: "g_fastlap_2", label: "2 voltas mais rápidas (Top 10)", bonus: 3000000 },
      ],
      reputationMin: 48,
      flavor: "Crescimento sólido com metas acessíveis. Ideal para subir degraus.",
    },
    {
      id: "s_nova",
      name: "NOVA FINANCE",
      tier: "CORE",
      weeklyPay: 1100000,
      signingBonus: 1500000,
      goals: [
        { id: "g_points_25", label: "Marcar 25+ pontos na temporada", bonus: 2200000 },
        { id: "g_q3_6", label: "6 aparições no Q3", bonus: 2600000 },
      ],
      reputationMin: 35,
      flavor: "Contrato seguro. Dá estabilidade para investir em staff e carro.",
    },
    {
      id: "s_iron",
      name: "IRON TOOLWORKS",
      tier: "ENTRY",
      weeklyPay: 650000,
      signingBonus: 600000,
      goals: [
        { id: "g_finish_18", label: "Completar 18 corridas sem abandono", bonus: 1500000 },
      ],
      reputationMin: 0,
      flavor: "Baixa pressão. Ótimo para começo ou reconstrução.",
    },
  ];

  const StaffMarket = [
    // TECHNICAL DIRECTOR
    { id:"td_01", role:"technicalDirector", name:"Elena Marchesi", rating: 86, wageWeekly: 420000, specialty:"Desenvolvimento aero eficiente" },
    { id:"td_02", role:"technicalDirector", name:"Gustavo Tanaka", rating: 78, wageWeekly: 310000, specialty:"Confiabilidade e upgrades consistentes" },
    { id:"td_03", role:"technicalDirector", name:"Markus Stein", rating: 72, wageWeekly: 240000, specialty:"Boa base técnica para equipes médias" },

    // RACE ENGINEER
    { id:"re_01", role:"raceEngineer", name:"Sofia Almeida", rating: 84, wageWeekly: 260000, specialty:"Gestão de pneus e feedback de setup" },
    { id:"re_02", role:"raceEngineer", name:"Hugo Bianchi", rating: 76, wageWeekly: 200000, specialty:"Consistência em corrida e telemetria" },
    { id:"re_03", role:"raceEngineer", name:"Liam Carter", rating: 69, wageWeekly: 145000, specialty:"Bom custo-benefício" },

    // STRATEGIST
    { id:"st_01", role:"strategist", name:"Amira Rahman", rating: 85, wageWeekly: 250000, specialty:"Chamadas fortes em Safety Car e clima" },
    { id:"st_02", role:"strategist", name:"Bruno Vieira", rating: 77, wageWeekly: 190000, specialty:"Estratégia sólida e conservadora" },
    { id:"st_03", role:"strategist", name:"Noah Berg", rating: 70, wageWeekly: 150000, specialty:"Boa leitura de undercut/overcut" },

    // AERO LEAD
    { id:"ae_01", role:"aeroLead", name:"Chiara Rossi", rating: 83, wageWeekly: 235000, specialty:"Downforce em pistas travadas" },
    { id:"ae_02", role:"aeroLead", name:"Ravi Singh", rating: 75, wageWeekly: 185000, specialty:"Equilíbrio entre drag e grip" },
    { id:"ae_03", role:"aeroLead", name:"Diego Costa", rating: 68, wageWeekly: 130000, specialty:"Pacotes incrementais baratos" },

    // PIT CREW CHIEF
    { id:"pc_01", role:"pitCrewChief", name:"Marta Kowalski", rating: 82, wageWeekly: 210000, specialty:"Pit stops rápidos e consistentes" },
    { id:"pc_02", role:"pitCrewChief", name:"Ethan Wells", rating: 74, wageWeekly: 165000, specialty:"Baixa taxa de erro" },
    { id:"pc_03", role:"pitCrewChief", name:"Renan Silva", rating: 67, wageWeekly: 120000, specialty:"Treinamento constante do pit crew" },
  ];

  function money(n) {
    const v = Math.round(Number(n || 0));
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace("R$", "R$ ");
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  window.GameData = {
    Sponsors,
    StaffMarket,
    money,
    clamp,
  };
})();