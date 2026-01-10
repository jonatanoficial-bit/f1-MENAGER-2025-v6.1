/* ============================================================
   F1 MANAGER 2025 — SAVE SYSTEM (OFFLINE)
   - localStorage
   - versionado
   - merge seguro
   ============================================================ */

(function () {
  const SAVE_KEY = "F1M25_SAVE_V1";
  const SAVE_VERSION = 1;

  function nowISO() {
    return new Date().toISOString();
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    if (!target || typeof target !== "object") target = {};
    for (const k of Object.keys(source)) {
      const sv = source[k];
      const tv = target[k];
      if (Array.isArray(sv)) {
        target[k] = sv.slice();
      } else if (sv && typeof sv === "object") {
        target[k] = deepMerge(tv && typeof tv === "object" ? tv : {}, sv);
      } else {
        target[k] = sv;
      }
    }
    return target;
  }

  function defaultSave() {
    return {
      meta: {
        version: SAVE_VERSION,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      },

      profile: {
        managerName: localStorage.getItem("MANAGER_NAME") || "Seu Manager",
        managerAvatar: localStorage.getItem("MANAGER_AVATAR") || "assets/avatars/default.png",
        userTeam: (new URL(window.location.href)).searchParams.get("userTeam") || "redbull",
      },

      economy: {
        cash: 25000000, // 25 mi inicial (ajuste depois se quiser)
        reputation: 52, // 0-100
        costCapUsed: 0,
        costCapLimit: 135000000,
      },

      sponsors: {
        active: null,  // {id, name, tier, weeklyPay, goals[], signedAt}
        history: [],   // contratos antigos
        lastPayoutAt: null,
      },

      staff: {
        roster: {
          technicalDirector: null,
          raceEngineer: null,
          strategist: null,
          aeroLead: null,
          pitCrewChief: null,
        },
        teamModifiers: {
          // multiplicadores aplicáveis na simulação (practice/qualy/race)
          pace: 1.0,
          tireWear: 1.0,
          reliability: 1.0,
          pitSpeed: 1.0,
          strategy: 1.0,
        },
      },
    };
  }

  function loadRaw() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      return JSON.parse(s);
    } catch (e) {
      console.warn("[SAVE] erro ao carregar:", e);
      return null;
    }
  }

  function migrateIfNeeded(save) {
    if (!save || typeof save !== "object") return defaultSave();
    const v = save?.meta?.version || 0;

    // Futuras migrações entram aqui:
    if (v < 1) {
      const fresh = defaultSave();
      const merged = deepMerge(fresh, save);
      merged.meta.version = 1;
      merged.meta.updatedAt = nowISO();
      return merged;
    }

    // Normaliza campos ausentes
    const fresh = defaultSave();
    const merged = deepMerge(fresh, save);
    merged.meta.version = SAVE_VERSION;
    return merged;
  }

  function load() {
    const raw = loadRaw();
    const ready = migrateIfNeeded(raw);
    return ready;
  }

  function save(data) {
    try {
      data.meta = data.meta || {};
      data.meta.version = SAVE_VERSION;
      data.meta.updatedAt = nowISO();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("[SAVE] erro ao salvar:", e);
      return false;
    }
  }

  function update(mutatorFn) {
    const s = load();
    mutatorFn(s);
    return save(s);
  }

  function get(path, fallback = undefined) {
    const s = load();
    const parts = String(path).split(".");
    let cur = s;
    for (const p of parts) {
      if (!cur || typeof cur !== "object" || !(p in cur)) return fallback;
      cur = cur[p];
    }
    return cur;
  }

  function set(path, value) {
    return update((s) => {
      const parts = String(path).split(".");
      let cur = s;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
    });
  }

  function addCash(amount) {
    return update((s) => {
      s.economy.cash = Math.max(0, Math.round((s.economy.cash || 0) + amount));
    });
  }

  function spendCash(amount) {
    return update((s) => {
      s.economy.cash = Math.max(0, Math.round((s.economy.cash || 0) - amount));
    });
  }

  function computeStaffModifiers(roster) {
    // Base: 1.0; rating 0..100 melhora multiplicador
    // pace: +0.15 no máximo; tireWear: -0.12 no máximo; etc.
    function r(x) { return Math.max(0, Math.min(100, Number(x || 0))); }

    const td = roster.technicalDirector ? r(roster.technicalDirector.rating) : 0;
    const re = roster.raceEngineer ? r(roster.raceEngineer.rating) : 0;
    const st = roster.strategist ? r(roster.strategist.rating) : 0;
    const ae = roster.aeroLead ? r(roster.aeroLead.rating) : 0;
    const pc = roster.pitCrewChief ? r(roster.pitCrewChief.rating) : 0;

    // Fórmulas simples e estáveis (offline, leves)
    const pace = 1.0 + ((td * 0.0006) + (ae * 0.0007) + (re * 0.0004));         // até ~ +0.17
    const tireWear = 1.0 - ((re * 0.0008) + (td * 0.0004));                      // até ~ -0.12
    const reliability = 1.0 + ((td * 0.0006));                                   // até ~ +0.06
    const pitSpeed = 1.0 - ((pc * 0.0010));                                       // até ~ -0.10 (menor é melhor)
    const strategy = 1.0 + ((st * 0.0009));                                       // até ~ +0.09

    return {
      pace: Number(pace.toFixed(4)),
      tireWear: Number(tireWear.toFixed(4)),
      reliability: Number(reliability.toFixed(4)),
      pitSpeed: Number(pitSpeed.toFixed(4)),
      strategy: Number(strategy.toFixed(4)),
    };
  }

  // Expor no window para uso no resto do jogo
  window.SaveSystem = {
    KEY: SAVE_KEY,
    VERSION: SAVE_VERSION,
    load,
    save,
    update,
    get,
    set,
    addCash,
    spendCash,
    computeStaffModifiers,
  };
})();