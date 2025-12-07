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
{
            id: "spa",
            name: "Belgian Grand Prix",
            country: "Belgium",
            flag: "assets/flags/belgium.png",
            date: "27 JUL 2025",
            svg: "assets/tracks/spa.svg.svg",
            laps: 44,
            lengthKm: 7.004,
            tyreWear: "very_high",
            fuelUse: "high",
            rainChance: 0.65,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [4, 6],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "zandvoort",
            name: "Dutch Grand Prix",
            country: "Netherlands",
            flag: "assets/flags/netherlands.png",
            date: "31 AUG 2025",
            svg: "assets/tracks/zandvoort.svg.svg",
            laps: 72,
            lengthKm: 4.259,
            tyreWear: "high",
            fuelUse: "medium",
            rainChance: 0.38,
            setupWindow: {
                frontWing: [7, 9],
                rearWing: [7, 9],
                rideHeight: [5, 7],
                suspension: [6, 7]
            }
        },
        {
            id: "monza",
            name: "Italian Grand Prix",
            country: "Italy",
            flag: "assets/flags/italy.png",
            date: "07 SEP 2025",
            svg: "assets/tracks/monza.svg.svg",
            laps: 53,
            lengthKm: 5.793,
            tyreWear: "low",
            fuelUse: "low",
            rainChance: 0.27,
            setupWindow: {
                frontWing: [4, 6],
                rearWing: [3, 5],
                rideHeight: [3, 5],
                suspension: [4, 5]
            }
        },
        {
            id: "baku",
            name: "Azerbaijan Grand Prix",
            country: "Azerbaijan",
            flag: "assets/flags/azerbaijan.png",
            date: "21 SEP 2025",
            svg: "assets/tracks/baku.svg.svg",
            laps: 51,
            lengthKm: 6.003,
            tyreWear: "medium",
            fuelUse: "high",
            rainChance: 0.22,
            setupWindow: {
                frontWing: [5, 7],
                rearWing: [4, 6],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "singapore",
            name: "Singapore Grand Prix",
            country: "Singapore",
            flag: "assets/flags/singapore.png",
            date: "05 OCT 2025",
            svg: "assets/tracks/singapore.svg.svg",
            laps: 62,
            lengthKm: 4.928,
            tyreWear: "high",
            fuelUse: "high",
            rainChance: 0.60,
            setupWindow: {
                frontWing: [8, 10],
                rearWing: [8, 10],
                rideHeight: [6, 8],
                suspension: [7, 8]
            }
        },
{
            id: "cota",
            name: "United States Grand Prix",
            country: "USA",
            flag: "assets/flags/usa.png",
            date: "19 OCT 2025",
            svg: "assets/tracks/cota.svg.svg",
            laps: 56,
            lengthKm: 5.513,
            tyreWear: "medium",
            fuelUse: "high",
            rainChance: 0.22,
            setupWindow: {
                frontWing: [5, 7],
                rearWing: [5, 7],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "mexico",
            name: "Mexico City Grand Prix",
            country: "Mexico",
            flag: "assets/flags/mexico.png",
            date: "26 OCT 2025",
            svg: "assets/tracks/mexico.svg.svg",
            laps: 71,
            lengthKm: 4.304,
            tyreWear: "high",
            fuelUse: "medium",
            rainChance: 0.28,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [5, 7],
                suspension: [5, 7]
            }
        },
        {
            id: "brazil",
            name: "São Paulo Grand Prix",
            country: "Brazil",
            flag: "assets/flags/brazil.png",
            date: "09 NOV 2025",
            svg: "assets/tracks/brazil.svg.svg",
            laps: 71,
            lengthKm: 4.309,
            tyreWear: "high",
            fuelUse: "high",
            rainChance: 0.47,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [5, 7],
                suspension: [5, 7]
            }
        },
        {
            id: "qatar",
            name: "Qatar Grand Prix",
            country: "Qatar",
            flag: "assets/flags/qatar.png",
            date: "23 NOV 2025",
            svg: "assets/tracks/qatar.svg.svg",
            laps: 57,
            lengthKm: 5.380,
            tyreWear: "medium",
            fuelUse: "medium",
            rainChance: 0.08,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        },
        {
            id: "lasvegas",
            name: "Las Vegas Grand Prix",
            country: "USA",
            flag: "assets/flags/usa.png",
            date: "29 NOV 2025",
            svg: "assets/tracks/lasvegas.svg.svg",
            laps: 50,
            lengthKm: 6.120,
            tyreWear: "low",
            fuelUse: "high",
            rainChance: 0.10,
            setupWindow: {
                frontWing: [4, 6],
                rearWing: [4, 6],
                rideHeight: [3, 5],
                suspension: [4, 5]
            }
        },
        {
            id: "abudhabi",
            name: "Abu Dhabi Grand Prix",
            country: "United Arab Emirates",
            flag: "assets/flags/uae.png",
            date: "07 DEC 2025",
            svg: "assets/tracks/abudhabi.svg.svg",
            laps: 58,
            lengthKm: 5.281,
            tyreWear: "medium",
            fuelUse: "medium",
            rainChance: 0.05,
            setupWindow: {
                frontWing: [6, 8],
                rearWing: [6, 8],
                rideHeight: [4, 6],
                suspension: [5, 6]
            }
        }
    ], // end of tracks array
