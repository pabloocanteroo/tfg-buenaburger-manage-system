/* ══════════════════════════════════════════════════════════════════
   print.js — Buena Burger
   Impresión WiFi: el servidor envía los bytes ESC/POS por TCP.
   El navegador (iPad Safari incluido) solo hace fetch() al backend.
   Socket.io se usa únicamente para la alerta sonora en pantalla.
══════════════════════════════════════════════════════════════════ */

// ── Estado global de impresión ──────────────────────────────────
const BB_PRINT = {
    socket: null,   // referencia al socket (para que admin.js pueda escuchar)
};

// ── Sonido de alerta (funciona en Safari/iOS) ───────────────────
function reproducirAlerta() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.35].forEach(delay => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.25);
        });
    } catch (e) {
        console.warn('Audio no disponible:', e);
    }
}

// ── Actualizar indicador visual ─────────────────────────────────
function actualizarEstadoImpresora(conectada, ip) {
    const el = document.getElementById('printer-status');
    if (!el) return;
    if (conectada) {
        el.textContent = `🟢 Impresora ${ip}`;
        el.style.color = '#27ae60';
    } else {
        el.textContent = '🔴 Sin impresora';
        el.style.color = '#e74c3c';
    }
}

// ── Cargar config al iniciar ────────────────────────────────────
async function cargarConfigImpresora() {
    try {
        const token = localStorage.getItem('bb_token');
        if (!token) return;
        const res  = await fetch('/api/admin/impresora', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.ok && data.config.ip) {
            actualizarEstadoImpresora(true, data.config.ip);
            actualizarBotónCola(data.cola || 0);
        }
    } catch (_) { /* silencioso */ }
}

// ── Reimprimir ticket desde admin ───────────────────────────────
async function reimprimirTicket(pedidoId, tipo) {
    const token = localStorage.getItem('bb_token');
    try {
        const res = await fetch('/api/admin/imprimir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ pedidoId, tipo }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        if (typeof mostrarToast === 'function') mostrarToast('Ticket enviado a la impresora', 'verde');
    } catch (err) {
        alert('Error al imprimir: ' + err.message);
    }
}

// ── Modal de configuración de IP ────────────────────────────────
function abrirModalImpresora() {
    document.getElementById('modal-impresora').style.display = 'flex';
    const token = localStorage.getItem('bb_token');
    fetch('/api/admin/impresora', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                document.getElementById('input-printer-ip').value     = data.config.ip     || '';
                document.getElementById('input-printer-puerto').value = data.config.puerto || 9100;
            }
        })
        .catch(() => {});
}

function cerrarModalImpresora() {
    document.getElementById('modal-impresora').style.display = 'none';
}

async function guardarConfigImpresora() {
    const ip     = document.getElementById('input-printer-ip').value.trim();
    const puerto = document.getElementById('input-printer-puerto').value.trim() || 9100;
    const token  = localStorage.getItem('bb_token');

    if (!ip) { alert('Introduce la IP de la impresora'); return; }

    try {
        const res  = await fetch('/api/admin/impresora', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ip, puerto }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        actualizarEstadoImpresora(true, ip);
        cerrarModalImpresora();
        if (typeof mostrarToast === 'function') mostrarToast(`Impresora configurada: ${ip}`, 'verde');
    } catch (err) {
        alert('Error guardando configuración: ' + err.message);
    }
}

// ── Socket.io: alerta sonora al llegar un nuevo pedido ──────────
(function iniciarSocket() {
    if (typeof io === 'undefined') {
        console.error('Socket.io no cargado. Incluye el script antes de print.js');
        return;
    }
    // Se pasa el JWT en el handshake: el servidor lo valida y, si corresponde
    // a staff (ADMIN/EMPLEADO), une el socket al room 'staff', que es al que
    // se emiten los eventos sensibles como `nuevo-pedido`.
    const token = localStorage.getItem('bb_token');
    const socket = io({ auth: { token } });
    BB_PRINT.socket = socket;

    socket.on('nuevo-pedido', () => {
        reproducirAlerta();
    });

    socket.on('cola-pendiente', ({ cantidad }) => {
        if (typeof actualizarBotónCola === 'function') actualizarBotónCola(cantidad);
    });
})();

// Cargar config al arrancar (solo si hay token, es decir admin/pos)
document.addEventListener('DOMContentLoaded', cargarConfigImpresora);
