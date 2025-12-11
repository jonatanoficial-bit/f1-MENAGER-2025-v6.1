// ===============================================
//  F1 MANAGER 2025 - PRACTICE (SVG VERSION)
// ===============================================

// =====================
// 1. LER PARÂMETROS
// =====================
const urlParams = new URLSearchParams(window.location.search);
const TRACK_KEY = urlParams.get("track") || "australia";
const TEAM_KEY = urlParams.get("userTeam") || "ferrari";

// =====================
// 2. DADOS DAS EQUIPES
// =====================
const TEAMS = {
    ferrari: { color: "#ff2a2a", name: "Ferrari" },
    mercedes: { color: "#00e5ff", name: "Mercedes" },
    redbull: { color: "#ffb300", name: "Red Bull" },
    mclaren: { color: "#ff8c00", name: "McLaren" },
    sauber: { color: "#d0d0ff", name: "Sauber" },
};

// =====================
// 3. PISTAS (SVG)
// =====================
const TRACKS = {
    australia: {
        name: "Albert Park – Melbourne",
        svg: "assets/tracks/australia.svg"
    }
};

// =====================
// 4. PREENCHER NOME
// =====================
document.getElementById("trackName").innerText = TRACKS[TRACK_KEY].name;

// =====================
// 5. CARREGAR SVG
// =====================
async function loadTrackSVG() {
    try {
        const response = await fetch(TRACKS[TRACK_KEY].svg);
        const svgText = await response.text();

        const container = document.getElementById("track-container");
        container.innerHTML = svgText;

        initPractice();
    } catch (err) {
        console.error("Erro ao carregar SVG:", err);
    }
}

loadTrackSVG();

// =====================
// 6. PILOTOS DA EQUIPE
// =====================
const myDrivers = [
    {
        id: 1,
        name: "Piloto 1",
        face: "assets/faces/default.png",
        pos: 0
    },
    {
        id: 2,
        name: "Piloto 2",
        face: "assets/faces/default.png",
        pos: 0
    }
];

// Aplicar fotos
document.getElementById("p1face").src = myDrivers[0].face;
document.getElementById("p2face").src = myDrivers[1].face;

// =====================
// 7. SISTEMA DE MOVIMENTO
// =====================
let pathPoints = [];
let carDots = {};
let speedMultiplier = 1;

// Extrair pontos da pista
function readSVGPoints() {
    const svg = document.querySelector("#track-container svg");
    const pts = [...svg.querySelectorAll("circle.track-point")];

    pathPoints = pts.map(p => ({
        x: parseFloat(p.getAttribute("cx")),
        y: parseFloat(p.getAttribute("cy"))
    }));
}

// Criar bolinhas dos carros
function createCars() {
    const svg = document.querySelector("#track-container svg");
    const teamColor = TEAMS[TEAM_KEY].color;

    myDrivers.forEach(driver => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
        dot.setAttribute("r", 8);
        dot.setAttribute("fill", teamColor);
        dot.setAttribute("class","car-dot");
        svg.appendChild(dot);
        carDots[driver.id] = dot;
    });
}

// Atualizar movimento
function updateCarPositions() {
    myDrivers.forEach(d => {
        d.pos = (d.pos + 0.1 * speedMultiplier) % pathPoints.length;
        const idx = Math.floor(d.pos);

        const p = pathPoints[idx];
        carDots[d.id].setAttribute("cx", p.x);
        carDots[d.id].setAttribute("cy", p.y);
    });
}

// Loop principal
function loop() {
    updateCarPositions();
    requestAnimationFrame(loop);
}

// =====================
// 8. INICIALIZAR
// =====================
function initPractice() {
    readSVGPoints();
    createCars();
    loop();
}

// =====================
// 9. CONTROLES
// =====================
function setSpeed(v) {
    speedMultiplier = v;
}

function pitStop(id) {
    alert("Pit stop do piloto " + id);
}

function setMode(id, mode) {
    alert("Modo do piloto " + id + " = " + mode);
}
