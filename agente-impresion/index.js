// ══════════════════════════════════════════════════════════════════
//  agente-impresion/index.js
//  Ejecutar en la Raspberry Pi Zero 2W del local.
//
//  Se conecta al servidor en Render via Socket.io, escucha el evento
//  'imprimir-ticket' y envía los bytes ESC/POS a la impresora WiFi
//  por TCP (red local).
//
//  Variables de entorno (.env):
//    SERVER_URL   — https://buenaburger-pos.onrender.com
//    AGENT_SECRET — mismo valor que AGENT_SECRET en el servidor
//    PRINTER_IP   — IP local de la impresora (ej. 192.168.1.100)
//    PRINTER_PORT — Puerto TCP (por defecto 9100)
// ══════════════════════════════════════════════════════════════════

require('dotenv').config();
const net    = require('net');
const { io } = require('socket.io-client');

const SERVER_URL    = process.env.SERVER_URL;
const AGENT_SECRET  = process.env.AGENT_SECRET;
const PRINTER_IP    = process.env.PRINTER_IP;
const PRINTER_PORT  = parseInt(process.env.PRINTER_PORT) || 9100;
const TCP_TIMEOUT   = 8000;

if (!SERVER_URL || !AGENT_SECRET || !PRINTER_IP) {
    console.error('[Agente] Faltan variables de entorno: SERVER_URL, AGENT_SECRET, PRINTER_IP');
    process.exit(1);
}

// ── Imprimir por TCP ─────────────────────────────────────────────
function imprimirTCP(bytes) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(TCP_TIMEOUT);
        socket.connect(PRINTER_PORT, PRINTER_IP, () => {
            socket.write(bytes, () => {
                socket.destroy();
                resolve();
            });
        });
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout conectando a impresora'));
        });
        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });
    });
}

// ── Conexión Socket.io ───────────────────────────────────────────
const socket = io(SERVER_URL, {
    auth: { agentSecret: AGENT_SECRET },
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000,
    timeout: 10000,
});

socket.on('connect', () => {
    console.log(`[Agente] Conectado a ${SERVER_URL} (id: ${socket.id})`);
});

socket.on('disconnect', (reason) => {
    console.warn('[Agente] Desconectado:', reason);
});

socket.on('connect_error', (err) => {
    console.error('[Agente] Error de conexión:', err.message);
});

socket.on('imprimir-ticket', async ({ bytes }) => {
    if (!bytes) {
        console.warn('[Agente] Evento sin bytes, ignorando');
        return;
    }
    try {
        const buf = Buffer.from(bytes, 'base64');
        await imprimirTCP(buf);
        console.log(`[Agente] Ticket impreso (${buf.length} bytes)`);
    } catch (err) {
        console.error('[Agente] Error al imprimir:', err.message);
    }
});

// ── Keepalive: log cada 10 minutos ──────────────────────────────
setInterval(() => {
    const estado = socket.connected ? 'conectado' : 'desconectado';
    console.log(`[Agente] Estado: ${estado} | ${new Date().toLocaleTimeString('es-ES')}`);
}, 10 * 60 * 1000);

console.log(`[Agente] Iniciando → servidor: ${SERVER_URL} | impresora: ${PRINTER_IP}:${PRINTER_PORT}`);
