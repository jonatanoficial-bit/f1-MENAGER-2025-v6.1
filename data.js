// ============================================================
// DATA FILE FOR F1 MANAGER
// ============================================================
// This file contains all static game data:
// - Teams and drivers
// - Tracks and calendar
// - Flags and country
// - Default ratings and balance
// ============================================================

const GAME_DATA = {

    season: 2025,

    // ========================================================
    // TRACKS — FULL SEASON CALENDAR 2025 (OFFICIAL)
    // ========================================================

    tracks: [
        {
            id: "bahrain",
            name: "Bahrain Grand Prix",
            country: "Bahrain",
            flag: "assets/flags/bahrain.png",
            date: "09 MAR 2025",
            svg: "assets/tracks/bahrain.svg.svg",
            laps: 57,
            lengthKm: 5.412,
            tyreWear: "medium",
            fuelUse: "high",
            rainChance: 0.18,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 9],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "saudi",
            name: "Saudi Arabian Grand Prix",
            country: "Saudi Arabia",
            flag: "assets/flags/saudi.png",
            date: "16 MAR 2025",
            svg: "assets/tracks/saudi.svg.svg",
            laps: 50,
            lengthKm: 6.174,
            tyreWear: "low",
            fuelUse: "high",
            rainChance: 0.07,
            setupWindow: {
                frontWing: [4, 6],
                rearWing: [4, 6],
                rideHeight: [3, 5],
                suspension: [4, 5]
            }
        },
        {
            id: "australia",
            name: "Australian Grand Prix",
            country: "Australia",
            flag: "assets/flags/australia.png",
            date: "23 MAR 2025",
            svg: "assets/tracks/australia.svg.svg",
            laps: 58,
            lengthKm: 5.278,
            tyreWear: "high",
            fuelUse: "medium",
            rainChance: 0.35,
            setupWindow: {
                frontWing: [7, 9],
                rearWing: [7, 9],
                rideHeight: [5, 7],
                suspension: [5, 7]
            }
        },
