// ── Reglas de negocio ─────────────────────────────────────────────────────────

/** Ventana (minutos) durante la cual un cliente puede modificar o cancelar su pedido */
const MODIFICATION_WINDOW_MINUTES = 15;

// ── Bloques de producción ─────────────────────────────────────────────────────

const BLOQUE_HORA_INICIO      = '20:30';
const BLOQUE_HORA_FIN         = '23:00';
const BLOQUE_INTERVALO_MIN    = 5;
const BLOQUE_CAPACIDAD_MAX    = 10;   // hamburguesas máximas por bloque
const SCHEDULER_DIAS_ADELANTE = 60;

/** Días operativos: domingo=0, viernes=5, sábado=6 */
const DIAS_OPERATIVOS = new Set([0, 5, 6]);

// ── Impresora ESC/POS ─────────────────────────────────────────────────────────

const PRINTER_DEFAULT_PORT = 9100;
const PRINTER_LINE_WIDTH   = 48;    // caracteres por línea en fuente normal (papel 80mm)
const PRINTER_PAUSE_MS     = 600;   // pausa entre tickets para que la cortadora procese el corte
const TCP_TIMEOUT_MS       = 5000;  // timeout de conexión TCP a la impresora

// ── Local ─────────────────────────────────────────────────────────────────────

/** Dirección del local, sobreescribible via .env para facilitar el despliegue */
const NOMBRE_LOCAL = process.env.NOMBRE_LOCAL || 'Oruna de Pielagos';

module.exports = {
    MODIFICATION_WINDOW_MINUTES,
    BLOQUE_HORA_INICIO,
    BLOQUE_HORA_FIN,
    BLOQUE_INTERVALO_MIN,
    BLOQUE_CAPACIDAD_MAX,
    SCHEDULER_DIAS_ADELANTE,
    DIAS_OPERATIVOS,
    PRINTER_DEFAULT_PORT,
    PRINTER_LINE_WIDTH,
    PRINTER_PAUSE_MS,
    TCP_TIMEOUT_MS,
    NOMBRE_LOCAL,
};
