// ============================================================
// F1 MANAGER 2025 - PIT STOP SYSTEM 3.0
// ============================================================
//
// Este módulo cuida de:
//  - Agendar pit stop (manual ou IA)
//  - Entrada no pit lane
//  - Tempo parado nos boxes com erros realistas
//  - Saída do pit lane de volta pra pista
//  - Integração simples com RaceSystem (sem depender forte)
// ============================================================

console.log("PitStopSystem 3.0 carregado");

// ------------------------------------------------------------
// CONFIGURAÇÕES BÁSICAS
// ------------------------------------------------------------

const PIT_CONFIG = {
    PIT_LANE_SPEED_KMH: 80,          // velocidade limite no pit lane
    PIT_STOP_BASE_TIME: 2.4,        // tempo base parado (troca de pneus perfeita)
    PIT_STOP_ERROR_MIN: 0.3,        // erro mínimo adicional
    PIT_STOP_ERROR_MAX: 5.0,        // erro máximo adicional
    DOUBLE_STACK_PENALTY: 2.5,      // atraso extra se dois carros da mesma equipe param juntos
    ENTRY_WINDOW_METERS: 80,        // janela de entrada: se o carro estiver dentro desta distância do box
    PIT_LANE_LENGTH_METERS: 400     // comprimento "virtual" do pit lane
};

// ------------------------------------------------------------
// ESTADO INTERNO
// ------------------------------------------------------------

const PitStopState = {
    NONE: "NONE",
    QUEUED: "QUEUED",
    ENTERING: "ENTERING",
    IN_PIT_LANE: "IN_PIT_LANE",
    STOPPING: "STOPPING",
    EXITING: "EXITING",
    DONE: "DONE"
};

// pitQueue: pedidos de pit pendentes
let pitQueue = []; 
// activePitStops: status por carroId
let activePitStops = {}; 

// ------------------------------------------------------------
// FUNÇÕES DE APOIO
// ------------------------------------------------------------

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

function kmhToMs(kmh) {
    return kmh / 3.6;
}

// Retorna todos os carros da mesma equipe em pit AO MESMO TEMPO
function countTeamInPit(teamName) {
    let count = 0;
    for (const carId in activePitStops) {
        const s = activePitStops[carId];
        if (s && s.teamName === teamName && s.state !== PitStopState.DONE && s.state !== PitStopState.NONE) {
            count++;
        }
    }
    return count;
}

// ------------------------------------------------------------
// INTERFACE PRINCIPAL
// ------------------------------------------------------------

window.pitStopSystem = {

    //---------------------------------------------------------
    // Reset geral antes de nova corrida
    //---------------------------------------------------------
    resetForNewRace() {
        pitQueue = [];
        activePitStops = {};
    },

    //---------------------------------------------------------
    // Pedir pit para um carro (usado por IA ou jogador)
    // carRef: objeto do carro (de raceSystem)
    // tyreCompound: string (ex: "SOFT", "MEDIUM", "HARD", "INTER", "WET")
    // reason: texto ("Estratégia", "Pneu gasto", etc.)
    //---------------------------------------------------------
    requestPitStop(carRef, tyreCompound = "MEDIUM", reason = "Estratégia") {
        if (!carRef || carRef.id == null) return;

        // Já está com pit ativo?
        const current = activePitStops[carRef.id];
        if (current && current.state !== PitStopState.NONE && current.state !== PitStopState.DONE) {
            return;
        }

        const order = {
            carId: carRef.id,
            targetCompound: tyreCompound,
            reason,
            teamName: carRef.teamName || "Equipe",
        };

        pitQueue.push(order);

        // Marca no carro para feedback visual
        carRef.pitRequested = true;
        carRef.targetTyreCompound = tyreCompound;
        carRef.pitReason = reason;

        // Opcional: log de rádio
        console.log(`[PIT RADIO] ${carRef.driverName || "Piloto"} vai parar para ${tyreCompound}. Motivo: ${reason}`);
    },

    //---------------------------------------------------------
    // Cancelar pit (ex: estratégia mudou)
    //---------------------------------------------------------
    cancelPitStop(carRef) {
        if (!carRef || carRef.id == null) return;

        carRef.pitRequested = false;
        carRef.targetTyreCompound = null;
        carRef.pitReason = null;

        pitQueue = pitQueue.filter(p => p.carId !== carRef.id);

        if (activePitStops[carRef.id]) {
            // se já estava em processo de pit, não temos muito o que fazer
            // (na vida real também não cancelaria se já entrou no pit)
            console.log(`[PIT] Cancelamento solicitado tarde demais para carro ${carRef.id}`);
        } else {
            console.log(`[PIT] Pit cancelado para carro ${carRef.id}`);
        }
    },

    //---------------------------------------------------------
    // Deve ser chamado pelo loop da corrida a cada frame
    // dt: deltaTime em segundos
    // cars: array de carros controlados pelo RaceSystem
    // raceContext: objeto com infos, ex:
    //   { trackLength: 5000, distanceFinishLine: ..., isSafetyCar: false }
    //---------------------------------------------------------
    update(dt, cars, raceContext = {}) {
        if (!Array.isArray(cars)) return;

        // 1) verificar quem entra no pit (entrada do pit lane)
        cars.forEach(car => {
            this._checkPitEntry(car, raceContext);
        });

        // 2) atualizar status dos carros já no processo de pit
        for (const carId in activePitStops) {
            const pit = activePitStops[carId];
            if (!pit) continue;

            this._updateSinglePit(dt, pit, cars, raceContext);
        }
    },

    //---------------------------------------------------------
    // Verifica se carro deve entrar no pit lane
    //---------------------------------------------------------
    _checkPitEntry(car, raceContext) {
        if (!car || car.id == null) return;

        const orderIndex = pitQueue.findIndex(p => p.carId === car.id);
        if (orderIndex === -1) return; // nenhum pit pedido

        const trackLength = raceContext.trackLength || 5000;
        const distToFinish = trackLength - (car.distanceOnLap || 0); // distância até linha de chegada

        // Consideramos a entrada do pit próximo da linha de chegada
        if (distToFinish <= PIT_CONFIG.ENTRY_WINDOW_METERS) {
            // Remover da fila de espera
            const order = pitQueue.splice(orderIndex, 1)[0];

            // Inicializar estado de pit
            activePitStops[car.id] = {
                carId: car.id,
                driverName: car.driverName || `Carro ${car.id}`,
                teamName: car.teamName || "Equipe",
                targetCompound: order.targetCompound || "MEDIUM",
                state: PitStopState.ENTERING,
                timer: 0,
                totalPitTime: 0,
                laneProgress: 0, // 0 → inicio do pit lane, 1 → saida
                reason: order.reason,
                hasStopped: false
            };

            // Forçar carro a ir para pit lane
            car.inPitLane = true;
            car.pitState = PitStopState.ENTERING;

            // Reduz velocidade ao limite
            car.speed = kmhToMs(PIT_CONFIG.PIT_LANE_SPEED_KMH);

            // LOG
            console.log(`[PIT ENTER] ${car.driverName || "Piloto"} entrando no pit lane (${order.reason})`);
        }
    },

    //---------------------------------------------------------
    // Atualiza o processo de pit para apenas um carro
    //---------------------------------------------------------
    _updateSinglePit(dt, pit, cars, raceContext) {
        const car = cars.find(c => c.id === pit.carId);
        if (!car) {
            pit.state = PitStopState.DONE;
            return;
        }

        switch (pit.state) {
            case PitStopState.ENTERING:
                this._updateEntering(dt, pit, car);
                break;

            case PitStopState.IN_PIT_LANE:
                this._updateInPitLane(dt, pit, car);
                break;

            case PitStopState.STOPPING:
                this._updateStopping(dt, pit, car, cars);
                break;

            case PitStopState.EXITING:
                this._updateExiting(dt, pit, car, raceContext);
                break;

            case PitStopState.DONE:
            case PitStopState.NONE:
            default:
                break;
        }
    },

    //---------------------------------------------------------
    // Fase de ENTRADA: carro reduz para velocidade de pit lane
    //---------------------------------------------------------
    _updateEntering(dt, pit, car) {
        // Pode ter uma pequena animação, mas aqui só transicionamos
        pit.timer += dt;

        // Suaviza a entrada: 1s para "mudar de pista"
        if (pit.timer >= 1.0) {
            pit.state = PitStopState.IN_PIT_LANE;
            pit.timer = 0;
            car.pitState = PitStopState.IN_PIT_LANE;
            car.inPitLane = true;
            car.speed = kmhToMs(PIT_CONFIG.PIT_LANE_SPEED_KMH);

            console.log(`[PIT LANE] ${car.driverName || "Piloto"} agora está no pit lane`);
        }
    },

    //---------------------------------------------------------
    // Fase de PIT LANE: carro se move até o box
    //---------------------------------------------------------
    _updateInPitLane(dt, pit, car) {
        const v = kmhToMs(PIT_CONFIG.PIT_LANE_SPEED_KMH);
        const laneDistance = PIT_CONFIG.PIT_LANE_LENGTH_METERS;

        // Progresso simples 0→1
        const deltaProgress = (v * dt) / laneDistance;
        pit.laneProgress += deltaProgress;

        // move o carro visualmente se necessário (se raceSystem usar positionX/Y para o pit)
        // aqui apenas mantemos a informação lógica

        if (pit.laneProgress >= 0.4 && !pit.hasStopped) {
            // ponto onde o carro para no box
            pit.state = PitStopState.STOPPING;
            pit.timer = 0;
            car.speed = 0;
            car.pitState = PitStopState.STOPPING;
            console.log(`[PIT STOP] ${car.driverName || "Piloto"} parando no box`);
        } else if (pit.laneProgress >= 1.0 && pit.hasStopped) {
            // caso extremo de já ter passado todo pit lane
            pit.state = PitStopState.EXITING;
            pit.timer = 0;
            car.pitState = PitStopState.EXITING;
        }
    },

    //---------------------------------------------------------
    // Fase de PARADA NO BOX
    //---------------------------------------------------------
    _updateStopping(dt, pit, car, cars) {
        // define tempo total da parada na primeira chamada
        if (!pit.hasStopped) {
            pit.hasStopped = true;
            pit.timer = 0;

            // tempo base + erro
            let total = PIT_CONFIG.PIT_STOP_BASE_TIME;
            const error = randomRange(PIT_CONFIG.PIT_STOP_ERROR_MIN, PIT_CONFIG.PIT_STOP_ERROR_MAX);

            // double-stack: se outro carro da mesma equipe estiver EM PIT ao mesmo tempo
            const sameTeamCount = countTeamInPit(pit.teamName);
            if (sameTeamCount > 1) {
                total += PIT_CONFIG.DOUBLE_STACK_PENALTY;
                console.log(`[PIT] Double-stack para equipe ${pit.teamName}, +${PIT_CONFIG.DOUBLE_STACK_PENALTY.toFixed(1)}s`);
            }

            total += error;
            pit.totalPitTime = total;

            // aplicar troca de pneus e reset de desgaste
            if (car.tyre) {
                car.tyre.compound = pit.targetCompound || car.tyre.compound;
                car.tyre.wear = 0;
                car.tyre.temperature = "OK";
            } else {
                // se não existir objeto tyre, inicializa algo simples
                car.tyre = {
                    compound: pit.targetCompound || "MEDIUM",
                    wear: 0,
                    temperature: "OK"
                };
            }

            // mark no HUD: exibir alguma mensagem se raceSystem usar
            car.lastPitStopLap = car.completedLaps || 0;
            car.pitCount = (car.pitCount || 0) + 1;
        }

        pit.timer += dt;

        if (pit.timer >= pit.totalPitTime) {
            // terminou a parada, começa a sair
            pit.state = PitStopState.EXITING;
            pit.timer = 0;
            car.pitState = PitStopState.EXITING;

            console.log(`[PIT OUT] ${car.driverName || "Piloto"} concluiu pit em ${pit.totalPitTime.toFixed(2)}s`);
        }
    },

    //---------------------------------------------------------
    // Fase de SAÍDA DO PIT: voltar à pista principal
    //---------------------------------------------------------
    _updateExiting(dt, pit, car, raceContext) {
        // pequena transição de 1 segundo até voltar à pista
        pit.timer += dt;

        if (pit.timer >= 1.0) {
            // volta para pista
            car.inPitLane = false;
            car.pitState = PitStopState.DONE;
            car.pitRequested = false;
            car.targetTyreCompound = null;
            car.pitReason = null;

            // devolve velocidade normal (raceSystem depois ajusta)
            car.speed = car.baseSpeed || car.speed || kmhToMs(200);

            pit.state = PitStopState.DONE;

            console.log(`[PIT EXIT] ${car.driverName || "Piloto"} saiu do pit lane`);

            // opcional: informar raceSystem que houve pit concluído
            if (window.raceSystem && typeof window.raceSystem.onCarPitExit === "function") {
                window.raceSystem.onCarPitExit(car, pit);
            }
        }
    },

    //---------------------------------------------------------
    // Info pública para HUD
    //---------------------------------------------------------

    isCarInPit(carId) {
        const pit = activePitStops[carId];
        if (!pit) return false;
        return pit.state !== PitStopState.NONE &&
               pit.state !== PitStopState.DONE &&
               pit.state != null;
    },

    getPitInfo(carId) {
        return activePitStops[carId] || null;
    },

    getQueue() {
        return pitQueue.slice();
    }
};

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // garante estado limpo em toda nova corrida
    window.pitStopSystem.resetForNewRace();
});
