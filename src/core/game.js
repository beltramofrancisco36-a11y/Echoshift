// 1. Configuración del lienzo (Canvas)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 2. Estado del Jugador
const player = {
    x: 100, y: 400, size: 16, speed: 4, color: "#00FFCC",
    velocityY: 0, gravity: 0.5, jumpForce: -11, isJumping: false, groundY: 550
};

// 3. Sistema de Registro de Tiempo (Para el Rebobinado)
let playerHistory = [];
const maxHistoryFrames = 180; // 3 segundos a 60 fotogramas por segundo

// 4. El Clon Fantasma
const ghost = {
    x: -100, y: -100, size: 16, active: false,
    historyRoute: [], currentFrame: 0, color: "rgba(235, 94, 40, 0.8)" // Naranja neón fantasmal
};

// 5. Sistema de Eco (Ondas activas)
const echoes = [];
function spawnEcho(x, y) {
    echoes.push({ x: x, y: y, radius: 0, maxRadius: 180, speed: 5, alpha: 1.0 });
}

// 6. Mapa Invisible (Obstáculos)
const platforms = [
    { x: 250, y: 430, w: 120, h: 15, alpha: 0 },
    { x: 450, y: 320, w: 150, h: 15, alpha: 0 },
    { x: 200, y: 220, w: 100, h: 15, alpha: 0 },
    { x: 600, y: 450, w: 100, h: 15, alpha: 0 }
];

// Controles (Añadimos Shift)
const keys = { ArrowLeft: false, ArrowRight: false, Space: false, Shift: false };
window.addEventListener("keydown", (e) => {
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
        if (!keys.Shift && playerHistory.length > 10) {
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

// Mecánica Estrella: Activar el Clon Temporal
function triggerShiftMechanic() {
    // 1. Clonar la ruta del pasado y activar al fantasma
    ghost.historyRoute = [...playerHistory];
    ghost.currentFrame = 0;
    ghost.active = true;

    // 2. Teletransportar al jugador real al inicio de sus últimos 3 segundos
    const pastState = playerHistory[0];
    player.x = pastState.x;
    player.y = pastState.y;
    player.velocityY = 0;
    
    // 3. Crear un eco masivo por la distorsión del tiempo
    spawnEcho(player.x + player.size/2, player.y + player.size/2);
    
    // Limpiar historial para el nuevo bucle
    playerHistory = [];
}

// 7. Lógica de Actualización
function update() {
    // Movimiento del jugador
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.size) player.x += player.speed;

    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Colisión Suelo
    if (player.y >= player.groundY - player.size) {
        if (player.velocityY > 1) spawnEcho(player.x + player.size/2, player.groundY);
        player.y = player.groundY - player.size;
        player.velocityY = 0;
        player.isJumping = false;
    }

    // Colisión con Plataformas
    platforms.forEach(plat => {
        if (player.x + player.size > plat.x && player.x < plat.x + plat.w &&
            player.y + player.size >= plat.y && player.y + player.size <= plat.y + 10 &&
            player.velocityY > 0) {
                player.y = plat.y - player.size;
                player.velocityY = 0;
                player.isJumping = false;
        }
    });

    // Guardar historial del jugador (Buffer circular)
    playerHistory.push({ x: player.x, y: player.y, jumping: player.isJumping });
    if (playerHistory.length > maxHistoryFrames) {
        playerHistory.shift();
    }

    // Lógica del Clon Fantasma (Reproduce el pasado)
    if (ghost.active) {
        if (ghost.currentFrame < ghost.historyRoute.length) {
            let frameData = ghost.historyRoute[ghost.currentFrame];
            
            // Si en ese frame del pasado el jugador saltó o pisó fuerte, el fantasma genera un eco
            if (ghost.currentFrame % 30 === 0) {
                spawnEcho(frameData.x + ghost.size/2, frameData.y + ghost.size/2);
            }

            ghost.x = frameData.x;
            ghost.y = frameData.y;
            ghost.currentFrame++;
        } else {
            ghost.active = false; // El fantasma desaparece al terminar su ruta
        }
    }

    // Actualizar ondas de eco
    for (let i = echoes.length - 1; i >= 0; i--) {
        let echo = echoes[i];
        echo.radius += echo.speed;
        echo.alpha = 1 - (echo.radius / echo.maxRadius);
        if (echo.radius >= echo.maxRadius) echoes.splice(i, 1);
    }

    // Iluminación de plataformas
    platforms.forEach(plat => {
        let maxIllumination = 0;
        echoes.forEach(echo => {
            let dx = (plat.x + plat.w/2) - echo.x;
            let dy = (plat.y + plat.h/2) - echo.y;
            let distance = Math.sqrt(dx*dx + dy*dy);
            if (Math.abs(distance - echo.radius) < 40) {
                let brightness = echo.alpha * 0.8;
                if (brightness > maxIllumination) maxIllumination = brightness;
            }
        });
        plat.alpha = Math.max(plat.alpha - 0.02, maxIllumination);
    });
}

// 8. Renderizado
function draw() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar ondas
    echoes.forEach(echo => {
        ctx.strokeStyle = `rgba(0, 255, 204, ${echo.alpha * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, echo.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Dibujar plataformas
    platforms.forEach(plat => {
        ctx.fillStyle = `rgba(255, 255, 255, ${plat.alpha})`;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = `rgba(0, 255, 204, ${plat.alpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Dibujar Suelo
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, player.groundY);
    ctx.lineTo(canvas.width, player.groundY);
    ctx.stroke();

    // Dibujar al Clon Fantasma (Si está activo)
    if (ghost.active) {
        ctx.fillStyle = ghost.color;
        ctx.fillRect(ghost.x, ghost.y, ghost.size, ghost.size);
    }

    // Dibujar al Jugador Real
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);

    // Interfaz de Usuario Profesional
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "14px Courier New";
    ctx.fillText("PROTOTIPO: ECHOSHIFT v1.0", 20, 30);
    ctx.fillText("CONTROLES: Flechas = Moverse | Espacio = Saltar | SHIFT = Rebobinar e invocar Clon", 20, 50);
    
    if (ghost.active) {
        ctx.fillStyle = "#EB5E28";
        ctx.fillText("ANOMALÍA TEMPORAL DETECTADA: CLON ACTIVO", 20, 75);
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
window.onload = gameLoop;
