//------------------------------------------------------
//  PARÂMETROS DA SESSÃO
//------------------------------------------------------
let sessionTime = 60 * 60; // 60 min
let speedMultiplier = 1;

//------------------------------------------------------
//  CARREGAR PARÂMETROS DA URL
//------------------------------------------------------
const url = new URL(window.location.href);
const teamKey = url.searchParams.get("userTeam") || "ferrari";
const gpName = url.searchParams.get("gp") || "GP da Austrália 2025";

//------------------------------------------------------
//  DADOS SIMPLES DE PILOTOS (AJUSTE OS SEUS DEPOIS)
//------------------------------------------------------
const TEAMS = {
    ferrari: {
        color: "#ff0000",
        p1: { name: "Piloto 1", face: "assets/faces/leclerc.png" },
        p2: { name: "Piloto 2", face: "assets/faces/sainz.png" }
    },
    sauber: {
        color: "#00d0ff",
        p1: { name: "Piloto 1", face: "assets/faces/bottas.png" },
        p2: { name: "Piloto 2", face: "assets/faces/zhou.png" }
    }
};

//------------------------------------------------------
//  ELEMENTOS DO HUD
//------------------------------------------------------
document.getElementById("trackTitle").textContent = gpName;

// aplicar faces
document.getElementById("p1Face").src = TEAMS[teamKey].p1.face;
document.getElementById("p2Face").src = TEAMS[teamKey].p2.face;

document.getElementById("p1Name").textContent = TEAMS[teamKey].p1.name;
document.getElementById("p2Name").textContent = TEAMS[teamKey].p2.name;

//------------------------------------------------------
//  CARREGAR SVG DO CIRCUITO
//------------------------------------------------------
fetch("assets/tracks/australia.svg")
    .then(res => res.text())
    .then(svgText => {
        document.getElementById("trackContainer").innerHTML = svgText;
        initPractice();
    })
    .catch(err => console.error("Erro ao carregar SVG:", err));


//------------------------------------------------------
//  SISTEMA PRINCIPAL
//------------------------------------------------------
function initPractice() {
    const svg = document.querySelector("#trackContainer svg");

    if (!svg) {
        console.error("SVG não encontrado!");
        return;
    }

    //----------------------------------------------
    // PEGAR O TRAÇADO DO MAPA
    //----------------------------------------------
    const path = svg.querySelector("path");

    if (!path) {
        console.error("Nenhum <path> encontrado no SVG!");
        return;
    }

    const totalLength = path.getTotalLength();

    //----------------------------------------------
    // CRIAR CARROS
    //----------------------------------------------
    const car1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    car1.setAttribute("r", 6);
    car1.setAttribute("fill", TEAMS[teamKey].color);
    svg.appendChild(car1);

    const car2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    car2.setAttribute("r", 6);
    car2.setAttribute("fill", TEAMS[teamKey].color);
    svg.appendChild(car2);

    // posições iniciais
    let pos1 = 0;
    let pos2 = totalLength * 0.5;

    //----------------------------------------------
    // LOOP DE ATUALIZAÇÃO
    //----------------------------------------------
    function updateCars() {
        pos1 = (pos1 + 0.4 * speedMultiplier) % totalLength;
        pos2 = (pos2 + 0.38 * speedMultiplier) % totalLength;

        const p1 = path.getPointAtLength(pos1);
        const p2 = path.getPointAtLength(pos2);

        car1.setAttribute("cx", p1.x);
        car1.setAttribute("cy", p1.y);

        car2.setAttribute("cx", p2.x);
        car2.setAttribute("cy", p2.y);

        requestAnimationFrame(updateCars);
    }

    updateCars();
}


//------------------------------------------------------
//  CONTROLES DE VELOCIDADE (1X, 2X, 4X)
//------------------------------------------------------
window.setSpeed = function (v) {
    speedMultiplier = v;
};
