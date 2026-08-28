// Configuración inicial del lienzo (Canvas)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Bucle principal del juego (Se ejecuta 60 veces por segundo)
function gameLoop() {
    // 1. Limpiar pantalla (Oscuridad total)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Aquí dibujaremos el texto temporal para los jueces
    ctx.fillStyle = "#00FF00";
    ctx.font = "20px Arial";
    ctx.fillText("ECHOSHIFT: Lógica Iniciada en la Web", 50, 50);

    requestAnimationFrame(gameLoop);
}

// Iniciar el juego automáticamente al cargar la página
window.onload = gameLoop;
