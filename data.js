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
{
            id: "china",
            name: "Chinese Grand Prix",
            country: "China",
            flag: "assets/flags/china.png",
            date: "06 APR 2025",
            svg: "assets/tracks/china.svg.svg",
            laps: 56,
            lengthKm: 5.451,
            tyreWear: "high",
            fuelUse: "medium",
            rainChance: 0.25,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "japan",
            name: "Japanese Grand Prix",
            country: "Japan",
            flag: "assets/flags/japan.png",
            date: "13 APR 2025",
            svg: "assets/tracks/japan.svg.svg",
            laps: 53,
            lengthKm: 5.807,
            tyreWear: "very_high",
            fuelUse: "high",
            rainChance: 0.42,
            setupWindow: {
                frontWing: [7, 9],
                rearWing: [7, 9],
                rideHeight: [5, 7],
                suspension: [6, 7]
            }
        },
        {
            id: "miami",
            name: "Miami Grand Prix",
            country: "USA",
            flag: "assets/flags/usa.png",
            date: "04 MAY 2025",
            svg: "assets/tracks/miami.svg.svg",
            laps: 57,
            lengthKm: 5.410,
            tyreWear: "low",
            fuelUse: "high",
            rainChance: 0.30,
            setupWindow: {
                frontWing: [4, 6],
                rearWing: [4, 6],
                rideHeight: [3, 5],
                suspension: [4, 5]
            }
        },
        {
            id: "imola",
            name: "Emilia Romagna Grand Prix",
            country: "Italy",
            flag: "assets/flags/italy.png",
            date: "18 MAY 2025",
            svg: "assets/tracks/imola.svg.svg",
            laps: 63,
            lengthKm: 4.909,
            tyreWear: "medium",
            fuelUse: "medium",
            rainChance: 0.33,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "monaco",
            name: "Monaco Grand Prix",
            country: "Monaco",
            flag: "assets/flags/monaco.png",
            date: "25 MAY 2025",
            svg: "assets/tracks/monaco.svg.svg",
            laps: 78,
            lengthKm: 3.337,
            tyreWear: "low",
            fuelUse: "low",
            rainChance: 0.36,
            setupWindow: {
                frontWing: [8, 11],
                rearWing: [9, 11],
                rideHeight: [6, 8],
                suspension: [6, 8]
            }
        },
{
            id: "canada",
            name: "Canadian Grand Prix",
            country: "Canada",
            flag: "assets/flags/canada.png",
            date: "08 JUN 2025",
            svg: "assets/tracks/canada.svg.svg",
            laps: 70,
            lengthKm: 4.361,
            tyreWear: "medium",
            fuelUse: "high",
            rainChance: 0.48,
            setupWindow: {
                frontWing: [5, 7],
                rearWing: [5, 7],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "spain",
            name: "Spanish Grand Prix",
            country: "Spain",
            flag: "assets/flags/spain.png",
            date: "22 JUN 2025",
            svg: "assets/tracks/spain.svg.svg",
            laps: 66,
            lengthKm: 4.657,
            tyreWear: "high",
            fuelUse: "medium",
            rainChance: 0.29,
            setupWindow: {
                frontWing: [7, 9],
                rearWing: [6, 9],
                rideHeight: [5, 7],
                suspension: [6, 7]
            }
        },
        {
            id: "austria",
            name: "Austrian Grand Prix",
            country: "Austria",
            flag: "assets/flags/austria.png",
            date: "29 JUN 2025",
            svg: "assets/tracks/austria.svg.svg",
            laps: 71,
            lengthKm: 4.318,
            tyreWear: "low",
            fuelUse: "low",
            rainChance: 0.23,
            setupWindow: {
                frontWing: [4, 6],
                rearWing: [4, 6],
                rideHeight: [3, 5],
                suspension: [4, 5]
            }
        },
        {
            id: "silverstone",
            name: "British Grand Prix",
            country: "United Kingdom",
            flag: "assets/flags/uk.png",
            date: "06 JUL 2025",
            svg: "assets/tracks/silverstone.svg.svg",
            laps: 52,
            lengthKm: 5.891,
            tyreWear: "medium",
            fuelUse: "high",
            rainChance: 0.51,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [5, 7],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "hungary",
            name: "Hungarian Grand Prix",
            country: "Hungary",
            flag: "assets/flags/hungary.png",
            date: "20 JUL 2025",
            svg: "assets/tracks/hungary.svg.svg",
            laps: 70,
            lengthKm: 4.381,
            tyreWear: "very_high",
            fuelUse: "medium",
            rainChance: 0.43,
            setupWindow: {
                frontWing: [8, 10],
                rearWing: [8, 10],
                rideHeight: [6, 8],
                suspension: [7, 8]
            }
        },
