// data.js
// ===============================
// TODOS OS DADOS DO JOGO
// ===============================

// Configuração geral do jogo
const GAME_CONFIG = {
    initialCash: 5000000,
    currencySymbol: "R$",
    seasonYear: 2025,
    maxStaffSlots: 10,
    maxSponsorsSlots: 5
};

// -------------------------------
// LISTA DE PAÍSES (PARA MANAGER CRIADO)
// -------------------------------
const COUNTRIES = [
    "Brasil",
    "Argentina",
    "Estados Unidos",
    "Canadá",
    "México",
    "Reino Unido",
    "Alemanha",
    "França",
    "Itália",
    "Espanha",
    "Portugal",
    "Holanda",
    "Bélgica",
    "Suíça",
    "Áustria",
    "Hungria",
    "Polônia",
    "Dinamarca",
    "Suécia",
    "Noruega",
    "Finlândia",
    "Japão",
    "China",
    "Coreia do Sul",
    "Austrália",
    "Nova Zelândia",
    "África do Sul",
    "Emirados Árabes Unidos",
    "Arábia Saudita",
    "Catar",
    "Singapura"
];

// -------------------------------
// EQUIPES 2025 (FICCIONAL / BASE REAL)
// -------------------------------

const TEAMS_2025 = [
    {
        id: "mercedes",
        name: "Mercedes-AMG Petronas",
        country: "Alemanha",
        base: "Brackley, Reino Unido",
        logo: "assets/logos/mercedes.png",
        carImage: "assets/cars/mercedes_car.png",
        mainColor: "#00D2BE"
    },
    {
        id: "red_bull",
        name: "Oracle Red Bull Racing",
        country: "Áustria",
        base: "Milton Keynes, Reino Unido",
        logo: "assets/logos/redbull.png",
        carImage: "assets/cars/redbull_car.png",
        mainColor: "#1E41FF"
    },
    {
        id: "ferrari",
        name: "Scuderia Ferrari",
        country: "Itália",
        base: "Maranello, Itália",
        logo: "assets/logos/ferrari.png",
        carImage: "assets/cars/ferrari_car.png",
        mainColor: "#DC0000"
    },
    {
        id: "mclaren",
        name: "McLaren F1 Team",
        country: "Reino Unido",
        base: "Woking, Reino Unido",
        logo: "assets/logos/mclaren.png",
        carImage: "assets/cars/mclaren_car.png",
        mainColor: "#FF8700"
    },
    {
        id: "aston_martin",
        name: "Aston Martin Aramco",
        country: "Reino Unido",
        base: "Silverstone, Reino Unido",
        logo: "assets/logos/astonmartin.png",
        carImage: "assets/cars/astonmartin_car.png",
        mainColor: "#006F62"
    },
    {
        id: "alpine",
        name: "BWT Alpine F1 Team",
        country: "França",
        base: "Enstone, Reino Unido",
        logo: "assets/logos/alpine.png",
        carImage: "assets/cars/alpine_car.png",
        mainColor: "#2293D1"
    },
    {
        id: "williams",
        name: "Williams Racing",
        country: "Reino Unido",
        base: "Grove, Reino Unido",
        logo: "assets/logos/williams.png",
        carImage: "assets/cars/williams_car.png",
        mainColor: "#005AFF"
    },
    {
        id: "rb",
        name: "RB F1 Team",
        country: "Itália",
        base: "Faenza, Itália",
        logo: "assets/logos/rb.png",
        carImage: "assets/cars/rb_car.png",
        mainColor: "#2B4562"
    },
    {
        id: "sauber",
        name: "Stake F1 Team Sauber",
        country: "Suíça",
        base: "Hinwil, Suíça",
        logo: "assets/logos/sauber.png",
        carImage: "assets/cars/sauber_car.png",
        mainColor: "#00E701"
    },
    {
        id: "haas",
        name: "MoneyGram Haas F1 Team",
        country: "Estados Unidos",
        base: "Kannapolis, EUA",
        logo: "assets/logos/haas.png",
        carImage: "assets/cars/haas_car.png",
        mainColor: "#B6BABD"
    }
];

// -------------------------------
// PILOTOS 2025 (EXEMPLO FICTÍCIO)
// -------------------------------
const DRIVERS_2025 = [
    { id: "hamilton",  name: "Lewis Hamilton",   teamId: "ferrari",      number: 44, country: "Reino Unido",   rating: 95, face: "assets/faces/hamilton.png" },
    { id: "leclerc",  name: "Charles Leclerc",  teamId: "ferrari",      number: 16, country: "Mônaco",        rating: 93, face: "assets/faces/leclerc.png" },

    { id: "verstappen", name: "Max Verstappen", teamId: "red_bull",     number: 1,  country: "Holanda",       rating: 98, face: "assets/faces/verstappen.png" },
    { id: "perez",      name: "Sergio Pérez",   teamId: "red_bull",     number: 11, country: "México",        rating: 89, face: "assets/faces/perez.png" },

    { id: "russell",  name: "George Russell",   teamId: "mercedes",     number: 63, country: "Reino Unido",   rating: 91, face: "assets/faces/russell.png" },
    { id: "antonelli",name: "Andrea Kimi Antonelli", teamId: "mercedes",number: 12, country: "Itália",        rating: 85, face: "assets/faces/antonelli.png" },

    { id: "norris",   name: "Lando Norris",     teamId: "mclaren",      number: 4,  country: "Reino Unido",   rating: 94, face: "assets/faces/norris.png" },
    { id: "piastri",  name: "Oscar Piastri",    teamId: "mclaren",      number: 81, country: "Austrália",     rating: 90, face: "assets/faces/piastri.png" },

    { id: "alonso",   name: "Fernando Alonso",  teamId: "aston_martin", number: 14, country: "Espanha",       rating: 92, face: "assets/faces/alonso.png" },
    { id: "stroll",   name: "Lance Stroll",     teamId: "aston_martin", number: 18, country: "Canadá",        rating: 84, face: "assets/faces/stroll.png" },

    { id: "ocon",     name: "Esteban Ocon",     teamId: "alpine",       number: 31, country: "França",        rating: 87, face: "assets/faces/ocon.png" },
    { id: "gasly",    name: "Pierre Gasly",     teamId: "alpine",       number: 10, country: "França",        rating: 87, face: "assets/faces/gasly.png" },

    { id: "albon",    name: "Alexander Albon",  teamId: "williams",     number: 23, country: "Tailândia",     rating: 88, face: "assets/faces/albon.png" },
    { id: "sargeant", name: "Logan Sargeant",   teamId: "williams",     number: 2,  country: "Estados Unidos",rating: 78, face: "assets/faces/sargeant.png" },

    { id: "tsunoda",  name: "Yuki Tsunoda",     teamId: "rb",           number: 22, country: "Japão",         rating: 86, face: "assets/faces/tsunoda.png" },
    { id: "lawson",   name: "Liam Lawson",      teamId: "rb",           number: 30, country: "Nova Zelândia", rating: 83, face: "assets/faces/lawson.png" },

    { id: "bottas",   name: "Valtteri Bottas",  teamId: "sauber",       number: 77, country: "Finlândia",     rating: 86, face: "assets/faces/bottas.png" },
    { id: "zhou",     name: "Guanyu Zhou",      teamId: "sauber",       number: 24, country: "China",         rating: 82, face: "assets/faces/zhou.png" },

    { id: "hulkenberg", name: "Nico Hülkenberg",teamId: "haas",         number: 27, country: "Alemanha",      rating: 85, face: "assets/faces/hulkenberg.png" },
    { id: "magnussen", name: "Kevin Magnussen", teamId: "haas",         number: 20, country: "Dinamarca",     rating: 84, face: "assets/faces/magnussen.png" }
];

// -------------------------------
// MANAGERS REAIS 2025
// (TELA "USAR MANAGER REAL")
// -------------------------------

const REAL_MANAGERS_2025 = [
    {
        id: "toto_wolff",
        name: "Toto Wolff",
        teamId: "mercedes",
        country: "Áustria",
        avatar: "assets/managers_real/toto_wolff.png"
    },
    {
        id: "christian_horner",
        name: "Christian Horner",
        teamId: "red_bull",
        country: "Reino Unido",
        avatar: "assets/managers_real/christian_horner.png"
    },
    {
        id: "fred_vasseur",
        name: "Frédéric Vasseur",
        teamId: "ferrari",
        country: "França",
        avatar: "assets/managers_real/fred_vasseur.png"
    },
    {
        id: "zak_brown",
        name: "Zak Brown",
        teamId: "mclaren",
        country: "Estados Unidos",
        avatar: "assets/managers_real/zak_brown.png"
    },
    {
        id: "mike_krack",
        name: "Mike Krack",
        teamId: "aston_martin",
        country: "Luxemburgo",
        avatar: "assets/managers_real/mike_krack.png"
    },
    {
        id: "otmar_szafnauer",
        name: "Otmar Szafnauer",
        teamId: "alpine",
        country: "Romênia",
        avatar: "assets/managers_real/otmar_szafnauer.png"
    },
    {
        id: "james_vowles",
        name: "James Vowles",
        teamId: "williams",
        country: "Reino Unido",
        avatar: "assets/managers_real/james_vowles.png"
    },
    {
        id: "laurent_mekies",
        name: "Laurent Mekies",
        teamId: "rb",
        country: "França",
        avatar: "assets/managers_real/laurent_mekies.png"
    },
    {
        id: "alessandro_alunni_bravi",
        name: "Alessandro Alunni Bravi",
        teamId: "sauber",
        country: "Itália",
        avatar: "assets/managers_real/alunni_bravi.png"
    },
    {
        id: "ayao_komatsu",
        name: "Ayao Komatsu",
        teamId: "haas",
        country: "Japão",
        avatar: "assets/managers_real/ayao_komatsu.png"
    }
];

// -------------------------------
// PISTAS / CALENDÁRIO 2025
// -------------------------------

const TRACKS_2025 = [
    { id: 1,  name: "Bahrein",          country: "Bahrein",          laps: 57,  image: "assets/tracks/bahrein.png" },
    { id: 2,  name: "Arábia Saudita",   country: "Arábia Saudita",   laps: 50,  image: "assets/tracks/saudi.png" },
    { id: 3,  name: "Austrália",        country: "Austrália",        laps: 58,  image: "assets/tracks/australia.png" },
    { id: 4,  name: "Japão",            country: "Japão",            laps: 53,  image: "assets/tracks/japan.png" },
    { id: 5,  name: "China",            country: "China",            laps: 56,  image: "assets/tracks/china.png" },
    { id: 6,  name: "Miami",            country: "Estados Unidos",   laps: 57,  image: "assets/tracks/miami.png" },
    { id: 7,  name: "Imola",            country: "Itália",           laps: 63,  image: "assets/tracks/imola.png" },
    { id: 8,  name: "Mônaco",           country: "Mônaco",           laps: 78,  image: "assets/tracks/monaco.png" },
    { id: 9,  name: "Canadá",           country: "Canadá",           laps: 70,  image: "assets/tracks/canada.png" },
    { id: 10, name: "Espanha",          country: "Espanha",          laps: 66,  image: "assets/tracks/spain.png" },
    { id: 11, name: "Áustria",          country: "Áustria",          laps: 71,  image: "assets/tracks/austria.png" },
    { id: 12, name: "Inglaterra",       country: "Reino Unido",      laps: 52,  image: "assets/tracks/uk.png" },
    { id: 13, name: "Hungria",          country: "Hungria",          laps: 70,  image: "assets/tracks/hungary.png" },
    { id: 14, name: "Bélgica",          country: "Bélgica",          laps: 44,  image: "assets/tracks/belgium.png" },
    { id: 15, name: "Holanda",          country: "Holanda",          laps: 72,  image: "assets/tracks/netherlands.png" },
    { id: 16, name: "Itália (Monza)",   country: "Itália",           laps: 53,  image: "assets/tracks/monza.png" },
    { id: 17, name: "Singapura",        country: "Singapura",        laps: 61,  image: "assets/tracks/singapore.png" },
    { id: 18, name: "Catar",            country: "Catar",            laps: 57,  image: "assets/tracks/qatar.png" },
    { id: 19, name: "Estados Unidos (COTA)", country: "Estados Unidos", laps: 56, image: "assets/tracks/cota.png" },
    { id: 20, name: "México",           country: "México",           laps: 71,  image: "assets/tracks/mexico.png" },
    { id: 21, name: "Abu Dhabi",        country: "Emirados Árabes",  laps: 58,  image: "assets/tracks/abudhabi.png" }
];

// -------------------------------
// EXPORT GLOBAL (se necessário)
// -------------------------------
window.GAME_CONFIG = GAME_CONFIG;
window.COUNTRIES = COUNTRIES;
window.TEAMS_2025 = TEAMS_2025;
window.DRIVERS_2025 = DRIVERS_2025;
window.REAL_MANAGERS_2025 = REAL_MANAGERS_2025;
window.TRACKS_2025 = TRACKS_2025;
