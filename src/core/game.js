// 1. Configuración del lienzo (Canvas)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 2. Estado del Juego y la Misión
let gameState = "PLAYING"; // PLAYING, WIN, GAME_OVER
const mission = {
    objective: "Roba el Núcleo de Datos y ve a la Zona de Extracción.",
    hasIntel: false, // ¿Ya recogió el objetivo?
    intelX: 630, intelY: 200, intelSize: 12,
    extractX: 100, extractY: 210, extractW: 40, extractH: 10
};

// 3. Estado del Jugador
const player = {
    x: 100, y: 450, size: 16, speed: 4.5, color: "#00FFCC",
    imgX: 100, imgY: 450, // Para efectos visuales suaves
    velocityY: 0, gravity: 0.5, jumpForce: -11.5, isJumping: false, groundY: 550
};

// 4. El Clon Fantasma (Tu eco del pasado)
const ghost = {
    x: -100, y: -100, size: 16, active: false,
    historyRoute: [], currentFrame: 0, color: "rgba(255, 100, 0, 0.8)"
};
let playerHistory = [];
const maxHistoryFrames = 180; 

// 5. Sistema de Eco (Ondas)
const echoes = [];
function spawnEcho(x, y, maxR = 180) {
    echoes.push({ x: x, y: y, radius: 0, maxRadius: maxR, speed: 5.5, alpha: 1.0 });
}

// 6. Mapa Invisible Avanzado (Estructura del Nivel)
const platforms = [
    // Camino de ida (Abajo hacia la derecha)
    { x: 220, y: 440, w: 140, h: 15, alpha: 0 },
    { x: 420, y: 350, w: 140, h: 15, alpha: 0 },
    { x: 600, y: 240, w: 100, h: 15, alpha: 0 }, // Aquí está el Intel
    // Camino de regreso (Arriba hacia la izquierda)
    { x: 400, y: 200, w: 120, h: 15, alpha: 0 },
    { x: 220, y: 260, w: 120, h: 15, alpha: 0 },
    { x: 80,  y: 220, w: 80,  h: 15, alpha: 0 }  // Aquí está la extracción
];

// 7. Trampas Invisibles: Láseres de Seguridad (Te matan al tocarlos)
const hazards = [
    { x1: 390, y1: 250, x2: 390, y2: 440, alpha: 0 }, // Láser vertical barrera 1
    { x1: 580, y1: 100, x2: 580, y2: 350, alpha: 0 }  // Láser vertical protegiendo el Intel
];

// Controles del Teclado
const keys = { ArrowLeft: false, ArrowRight: false, Space: false, Shift: false };
window.addEventListener("keydown", (e) => {
    if (gameState !== "PLAYING") return;
    if (e.key === "ArrowLeft") keys.ArrowLeft = true;
    if (e.key === "ArrowRight") keys.ArrowRight = true;
    if (e.key === " " || e.code === "Space") {
        if (!keys.Space) {
            keys.Space = true;
            if (!player.isJumping) {
                player.velocityY = player.jumpForce;
                player.isJumping = true;
                spawnEcho(player.x + player.size/2, player.y + player.size/2);
            }
        }
        e.preventDefault();
    }
    if (e.key === "Shift") {
        if (!keys.Shift && playerHistory.length > 20) {
            keys.Shift = true;
            triggerShiftMechanic();
        }
        e.preventDefault();
    }
});
window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") keys.ArrowLeft = false;
    if (e.key === "ArrowRight") keys.ArrowRight = false;
    if (e.key === " " || e.code === "Space") keys.Space = false;
    if (e.key === "Shift") keys.Shift = false;
});

function triggerShiftMechanic() {
    ghost.historyRoute = [...playerHistory];
    ghost.currentFrame = 0;
    ghost.active = true;

    const pastState = playerHistory[0];
    player.x = pastState.x;
    player.y = pastState.y;
    player.velocityY = 0;
    
    spawnEcho(player.x + player.size/2, player.y + player.size/2, 250); // Onda expansiva sónica masiva
    playerHistory = [];
}

// Reiniciar el nivel en caso de muerte o victoria
window.addEventListener("click", () => {
    if (gameState !== "PLAYING") {
        player.x = 100; player.y = 400; player.velocityY = 0;
        mission.hasIntel = false;
        ghost.active = false;
        playerHistory = [];
        echoes.length = 0;
        platforms.forEach(p => p.alpha = 0);
        hazards.forEach(h => h.alpha = 0);
        gameState = "PLAYING";
    }
});

// 8. Lógica del Juego
function update() {
    if (gameState !== "PLAYING") return;

    // Movimiento
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.size) player.x += player.speed;

    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Interpolación visual para el jugador (Suavizado de cámara interna)
    player.imgX += (player.x - player.imgX) * 0.4;
    player.imgY += (player.y - player.imgY) * 0.4;

    // Colisión Suelo
    if (player.y >= player.groundY - player.size) {
        if (player.velocityY > 1.5) spawnEcho(player.x + player.size/2, player.groundY);
        player.y = player.groundY - player.size;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Colisión Plataformas
    platforms.forEach(plat => {
        if (player.x + player.size > plat.x && player.x < plat.x + plat.w &&
            player.y + player.size >= plat.y && player.y + player.size <= plat.y + 8 &&
            player.velocityY > 0) {
                player.y = plat.y - player.size;
                player.velocityY = 0;
                player.isJumping = false;
        }
    });

    // Misión: Recoger el Intel (Núcleo)
    if (!mission.hasIntel) {
        let dx = (player.x + player.size/2) - mission.intelX;
        let dy = (player.y + player.size/2) - mission.intelY;
        if (Math.sqrt(dx*dx + dy*dy) < player.size + mission.intelSize) {
            mission.hasIntel = true;
            spawnEcho(mission.intelX, mission.intelY, 300); // Destello sónico al robarlo
        }
    }

    // Misión: Llegar a Extracción (Solo si ya tiene el Intel)
    if (mission.hasIntel && 
        player.x + player.size > mission.extractX && player.x < mission.extractX + mission.extractW &&
        player.y + player.size >= mission.extractY && player.y <= mission.extractY + mission.extractH) {
            gameState = "WIN";
    }

    // Guardar historial del jugador
    playerHistory.push({ x: player.x, y: player.y });
    if (playerHistory.length > maxHistoryFrames) playerHistory.shift();

    // Lógica del Clon Fantasma (Copia tus pasos y genera ecos autónomos)
    if (ghost.active) {
        if (ghost.currentFrame < ghost.historyRoute.length) {
            let frameData = ghost.historyRoute[ghost.currentFrame];
            if (ghost.currentFrame % 25 === 0) {
                spawnEcho(frameData.x + ghost.size/2, frameData.y + ghost.size/2, 130);
            }
            ghost.x = frameData.x;
            ghost.y = frameData.y;
            ghost.currentFrame++;
        } else {
            ghost.active = false;
        }
    }

    // Colisión Letal con Láseres de Seguridad (Muerte instantánea)
    hazards.forEach(laser => {
        // Validación de colisión caja contra línea vertical
        if (player.x + player.size >= laser.x1 - 2 && player.x <= laser.x1 + 2 &&
            player.y + player.size >= Math.min(laser.y1, laser.y2) && player.y <= Math.max(laser.y1, laser.y2)) {
                gameState = "GAME_OVER";
                spawnEcho(player.x, player.y, 400); // Explosión visual
        }
    });

    // Ondas de eco
    for (let i = echoes.length - 1; i >= 0; i--) {
        let echo = echoes[i];
        echo.radius += echo.speed;
        echo.alpha = 1 - (echo.radius / echo.maxRadius);
        if (echo.radius >= echo.maxRadius) echoes.splice(i, 1);
    }

    // Iluminación matemática de Entidades (Plataformas y Láseres)
    platforms.forEach(plat => {
        let maxIllumination = 0;
        echoes.forEach(echo => {
            let dx = (plat.x + plat.w/2) - echo.x;
            let dy = (plat.y + plat.h/2) - echo.y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            if (Math.abs(distance - echo.radius) < 50) {
                let brightness = echo.alpha * 0.9;
                if (brightness > maxIllumination) maxIllumination = brightness;
            }
        });
        plat.alpha = Math.max(plat.alpha - 0.02, maxIllumination);
    });

    hazards.forEach(laser => {
        let maxIllumination = 0;
        echoes.forEach(echo => {
            // Distancia al centro del láser
            let midY = (laser.y1 + laser.y2) / 2;
            let dx = laser.x1 - echo.x;
            let dy = midY - echo.y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            if (Math.abs(distance - echo.radius) < 60) {
                let brightness = echo.alpha * 1.0;
                if (brightness > maxIllumination) maxIllumination = brightness;
            }
        });
        laser.alpha = Math.max(laser.alpha - 0.03, maxIllumination);
    });
}

// 9. Gráficos y Renderizado Estético (Cyberpunk Minimalista)
function draw() {
    // Fondo Oscuro
    ctx.fillStyle = "#020204";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rejilla de fondo sutil para dar profundidad espacial
    ctx.strokeStyle = "#080812";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let j=0; j<canvas.height; j+=40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }

    // Dibujar ondas de sonido
    echoes.forEach(echo => {
        ctx.strokeStyle = `rgba(0, 255, 204, ${echo.alpha * 0.25})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(echo.x, echo.y, echo.radius, 0, Math.PI * 2); ctx.stroke();
    });

    // Dibujar Plataformas Reveladas
    platforms.forEach(plat => {
        ctx.fillStyle = `rgba(30, 41, 59, ${plat.alpha * 0.8})`;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = `rgba(0, 255, 204, ${plat.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Dibujar Láseres de Seguridad (Rojo Neón Amenazante si se iluminan)
    hazards.forEach(laser => {
        ctx.strokeStyle = `rgba(255, 50, 50, ${laser.alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = "red";
        ctx.shadowBlur = laser.alpha * 10;
