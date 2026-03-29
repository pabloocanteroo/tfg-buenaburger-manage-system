/* ══════════════════════════════════════════════════════════════════
   print.js — Sistema de impresión Buena Burger
   Socket.io + Web Bluetooth + ESC/POS
   Incluir en pos.html y admin.html ANTES de los scripts de página.
══════════════════════════════════════════════════════════════════ */

// ── Estado global de impresión ──────────────────────────────────
const BB_PRINT = {
    device: null,          // BluetoothDevice conectado
    characteristic: null,  // GATT characteristic de escritura
    cola: [],              // Cola FIFO de trabajos pendientes
    imprimiendo: false,    // Mutex: evita solapamiento
};

// ── UUIDs estándar ESC/POS (compatibles con la mayoría de impresoras BT) ──
const PRINTER_SERVICE_UUID      = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID         = '00002af1-0000-1000-8000-00805f9b34fb';

// ── Sonido de alerta ────────────────────────────────────────────
function reproducirAlerta() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Dos pitidos cortos
        [0, 0.35].forEach(delay => {
            const osc = ctx.createOscillator();
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

// ── ESC/POS helpers ─────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

function bytes(...args) { return new Uint8Array(args); }

const CMD = {
    init:          () => bytes(ESC, 0x40),
    alignLeft:     () => bytes(ESC, 0x61, 0x00),
    alignCenter:   () => bytes(ESC, 0x61, 0x01),
    boldOn:        () => bytes(ESC, 0x45, 0x01),
    boldOff:       () => bytes(ESC, 0x45, 0x00),
    // size: widthMult 1-8, heightMult 1-8
    textSize:      (w, h) => bytes(GS, 0x21, ((w - 1) << 4) | (h - 1)),
    normalSize:    () => bytes(GS, 0x21, 0x00),
    feed:          (n = 1) => { const a = [ESC, 0x64, n]; return new Uint8Array(a); },
    cut:           () => bytes(GS, 0x56, 0x42, 0x00), // corte parcial con avance
    line:          () => encodeText('------------------------------------------------\n'),
};

// Ancho de papel: 80mm = 48 caracteres en fuente normal
const ANCHO = 48;

function encodeText(text) {
    return new TextEncoder().encode(text);
}

function concat(...arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) { out.set(a, offset); offset += a.length; }
    return out;
}

// ── Formatear hora de recogida ──────────────────────────────────
function horaRecogida(pedido) {
    if (pedido.bloques && pedido.bloques.length > 0) {
        const b = pedido.bloques[0];
        return b.horaInicio || '—';
    }
    return '—';
}

function fechaCorta(pedido) {
    if (pedido.bloques && pedido.bloques.length > 0) {
        const b = pedido.bloques[0];
        if (b.fecha) {
            const d = new Date(b.fecha);
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    }
    return new Date(pedido.fechaCreacion).toLocaleDateString('es-ES');
}

function horaCreacion(pedido) {
    return new Date(pedido.fechaCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function numeroPedido(pedido) {
    return pedido.numero || pedido._id.slice(-5).toUpperCase();
}

// ── Generar ticket CLIENTE ──────────────────────────────────────
function generarTicketCliente(pedido) {
    const lineas = pedido.lineas || [];
    const nombre = pedido.nombreCliente || 'Cliente';
    const num = numeroPedido(pedido);

    let buf = concat(
        CMD.init(),
        CMD.alignCenter(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        encodeText('BUENA BURGER\n'),
        CMD.normalSize(),
        CMD.boldOff(),
        encodeText('Oruña de Piélagos\n'),
        CMD.feed(1),
        CMD.line(),
        CMD.alignLeft(),
        CMD.boldOn(),
        encodeText(`Pedido: BB-${num}\n`),
        CMD.boldOff(),
        encodeText(`Nombre: ${nombre}\n`),
        encodeText(`Fecha:  ${fechaCorta(pedido)}\n`),
        encodeText(`Recog.: ${horaRecogida(pedido)}\n`),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd = l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto';
        const precio = `${((l.precioUnitario || 0) * l.cantidad).toFixed(2)}EUR`;
        const izq = `${l.cantidad}x ${nomProd}`;
        const lineTxt = izq.padEnd(ANCHO - precio.length) + precio + '\n';
        buf = concat(buf, CMD.boldOn(), encodeText(lineTxt), CMD.boldOff());

        if (l.excluidos && l.excluidos.length > 0)
            buf = concat(buf, encodeText(`   SIN: ${l.excluidos.join(', ')}\n`));
        if (l.anadidos && l.anadidos.length > 0)
            buf = concat(buf, encodeText(`   + ${l.anadidos.join(', ')}\n`));
        if (l.extras && l.extras.length > 0) {
            for (const e of l.extras) {
                const eP = `${(e.precio * e.cantidad).toFixed(2)}EUR`;
                const eL = `   + ${e.cantidad}x ${e.nombre}`;
                buf = concat(buf, encodeText(eL.padEnd(ANCHO - eP.length) + eP + '\n'));
            }
        }
    }

    buf = concat(
        buf,
        CMD.line(),
        CMD.boldOn(),
        CMD.textSize(1, 2),
        encodeText(`TOTAL: ${(pedido.total || 0).toFixed(2)} EUR\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        encodeText(`Pago: ${pedido.metodoPago === 'PAGO_EN_LOCAL' ? 'Efectivo/Tarjeta en local' : pedido.metodoPago || '—'}\n`),
        CMD.feed(1),
        CMD.alignCenter(),
        encodeText('Gracias por tu pedido!\n'),
        encodeText('Te avisamos cuando este listo\n'),
        CMD.feed(3),
        CMD.cut(),
    );

    return buf;
}

// ── Generar ticket COCINA ───────────────────────────────────────
function generarTicketCocina(pedido) {
    const lineas = pedido.lineas || [];
    const nombre = (pedido.nombreCliente || 'CLIENTE').toUpperCase();
    const num = numeroPedido(pedido);
    const hora = horaRecogida(pedido);

    let buf = concat(
        CMD.init(),
        CMD.alignCenter(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        encodeText(`BB-${num}\n`),
        CMD.normalSize(),
        CMD.textSize(1, 2),
        encodeText(`RECOG: ${hora}\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        CMD.line(),
        CMD.alignLeft(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        encodeText(`${nombre}\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd = (l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto').toUpperCase();
        buf = concat(
            buf,
            CMD.boldOn(),
            CMD.textSize(1, 2),
            encodeText(`${l.cantidad}x ${nomProd}\n`),
            CMD.normalSize(),
            CMD.boldOff(),
        );

        if (l.excluidos && l.excluidos.length > 0)
            buf = concat(buf, encodeText(`  SIN: ${l.excluidos.join(', ')}\n`));
        if (l.anadidos && l.anadidos.length > 0)
            buf = concat(buf, encodeText(`  + ${l.anadidos.join(', ')}\n`));
        if (l.extras && l.extras.length > 0) {
            for (const e of l.extras)
                buf = concat(buf, encodeText(`  ${e.cantidad}x ${e.nombre}\n`));
        }
    }

    buf = concat(
        buf,
        CMD.line(),
        CMD.alignCenter(),
        encodeText(`${horaCreacion(pedido)} | ${pedido.canal || 'TELEFONO'}\n`),
        CMD.feed(3),
        CMD.cut(),
    );

    return buf;
}

// ── Enviar bytes a la impresora en chunks (BT limita a ~512 bytes) ──
async function enviarBytesImpresora(data) {
    if (!BB_PRINT.characteristic) throw new Error('Impresora no conectada');
    const CHUNK = 512;
    for (let i = 0; i < data.length; i += CHUNK) {
        await BB_PRINT.characteristic.writeValueWithoutResponse(data.slice(i, i + CHUNK));
    }
}

// ── Procesar la cola FIFO ───────────────────────────────────────
async function procesarCola() {
    if (BB_PRINT.imprimiendo || BB_PRINT.cola.length === 0) return;
    if (!BB_PRINT.characteristic) {
        console.warn('Cola con trabajos pero impresora no conectada. Esperando...');
        return;
    }
    BB_PRINT.imprimiendo = true;
    const trabajo = BB_PRINT.cola.shift();
    try {
        // 1. Ticket cocina
        await enviarBytesImpresora(generarTicketCocina(trabajo));
        // Pausa entre tickets para que la impresora procese el corte
        await new Promise(r => setTimeout(r, 800));
        // 2. Ticket cliente
        await enviarBytesImpresora(generarTicketCliente(trabajo));
    } catch (err) {
        console.error('Error imprimiendo:', err);
        // Reintentar: volver a poner al frente de la cola
        BB_PRINT.cola.unshift(trabajo);
    } finally {
        BB_PRINT.imprimiendo = false;
        if (BB_PRINT.cola.length > 0) procesarCola();
    }
}

// ── API pública: añadir pedido a la cola ────────────────────────
function encolarImpresion(pedido) {
    BB_PRINT.cola.push(pedido);
    procesarCola();
}

// ── Conectar impresora Bluetooth ────────────────────────────────
async function conectarImpresora() {
    if (!navigator.bluetooth) {
        alert('Este navegador no soporta Web Bluetooth.\nUsa Chrome o Edge en Android/Windows.');
        return;
    }
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [PRINTER_SERVICE_UUID] }],
            // Si la impresora no aparece con el filtro de servicio, usar:
            // acceptAllDevices: true,
            // optionalServices: [PRINTER_SERVICE_UUID]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
        const char = await service.getCharacteristic(PRINTER_CHAR_UUID);

        BB_PRINT.device = device;
        BB_PRINT.characteristic = char;

        device.addEventListener('gattserverdisconnected', () => {
            BB_PRINT.device = null;
            BB_PRINT.characteristic = null;
            actualizarEstadoImpresora(false);
            console.warn('Impresora desconectada');
        });

        actualizarEstadoImpresora(true);
        // Procesar trabajos pendientes que llegaron antes de conectar
        procesarCola();
    } catch (err) {
        console.error('Error conectando impresora:', err);
        alert('No se pudo conectar la impresora:\n' + err.message);
    }
}

// ── Actualizar indicador visual de estado ───────────────────────
function actualizarEstadoImpresora(conectada) {
    const el = document.getElementById('printer-status');
    if (!el) return;
    el.textContent = conectada ? '🟢 Impresora conectada' : '🔴 Impresora desconectada';
    el.style.color = conectada ? '#27ae60' : '#e74c3c';
}

// ── Reimprimir pedido (llamado desde admin) ──────────────────────
async function reimprimirTicket(pedidoId, tipo) {
    if (!BB_PRINT.characteristic) { alert('Conecta la impresora primero'); return; }
    try {
        const res = await fetch(`/api/pedidos/${pedidoId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('bb_token')}` }
        });
        const data = await res.json();
        if (!data.ok) { alert('No se encontró el pedido'); return; }
        const pedido = data.pedido;
        if (tipo === 'cliente') await enviarBytesImpresora(generarTicketCliente(pedido));
        else await enviarBytesImpresora(generarTicketCocina(pedido));
    } catch (err) {
        alert('Error al reimprimir: ' + err.message);
    }
}

// ── Socket.io: escuchar eventos del servidor ────────────────────
// La instancia se expone en BB_PRINT.socket para que otros módulos puedan escuchar eventos.
(function iniciarSocket() {
    if (typeof io === 'undefined') {
        console.error('Socket.io no cargado. Incluye el script antes de print.js');
        return;
    }
    const socket = io();
    BB_PRINT.socket = socket;

    socket.on('imprimir-pedido', (pedido) => {
        reproducirAlerta();
        encolarImpresion(pedido);
    });
})();
