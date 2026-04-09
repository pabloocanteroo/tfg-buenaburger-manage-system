// ══════════════════════════════════════════════════════════════════
//  printer.js — Impresión WiFi ESC/POS vía TCP (puerto 9100)
//  El servidor se conecta directamente a la impresora en red local.
//  Funciona desde cualquier navegador (iPad Safari incluido).
// ══════════════════════════════════════════════════════════════════
const net = require('net');
const {
    PRINTER_DEFAULT_PORT,
    PRINTER_LINE_WIDTH,
    PRINTER_PAUSE_MS,
    TCP_TIMEOUT_MS,
    NOMBRE_LOCAL,
} = require('../utils/constants');

// ── Configuración (override en runtime desde admin) ─────────────
let _config = {
    ip:     process.env.PRINTER_IP || '',
    puerto: parseInt(process.env.PRINTER_PORT) || PRINTER_DEFAULT_PORT,
};

// ── Cola de pedidos pendientes (impresora offline) ───────────────
const _cola = [];   // { pedido }
let _imprimiendo = false;

// ── ESC/POS helpers ──────────────────────────────────────────────
const ESC = 0x1B, GS = 0x1D;
const ANCHO = PRINTER_LINE_WIDTH;

function b(...args) { return Buffer.from(args); }

const CMD = {
    init:        () => b(ESC, 0x40),
    alignLeft:   () => b(ESC, 0x61, 0x00),
    alignCenter: () => b(ESC, 0x61, 0x01),
    boldOn:      () => b(ESC, 0x45, 0x01),
    boldOff:     () => b(ESC, 0x45, 0x00),
    textSize:    (w, h) => b(GS, 0x21, ((w - 1) << 4) | (h - 1)),
    normalSize:  () => b(GS, 0x21, 0x00),
    feed:        (n = 1) => b(ESC, 0x64, n),
    cut:         () => b(GS, 0x56, 0x42, 0x00),
    line:        () => Buffer.from('------------------------------------------------\n', 'latin1'),
};

function txt(str) {
    // Reemplazar caracteres especiales del español por equivalentes ASCII
    const mapa = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n','Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N','¡':'!','¿':'?' };
    const limpio = str.replace(/[áéíóúüñÁÉÍÓÚÜÑ¡¿]/g, c => mapa[c] || c);
    return Buffer.from(limpio + '', 'latin1');
}

function cat(...bufs) { return Buffer.concat(bufs); }

// ── Helpers de formato ───────────────────────────────────────────
function _horaRecogida(p) {
    return p.bloques?.[0]?.horaInicio || '—';
}
function _fechaCorta(p) {
    const b = p.bloques?.[0];
    if (b?.fecha) {
        const d = new Date(b.fecha);
        return d.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
    }
    return new Date(p.fechaCreacion).toLocaleDateString('es-ES');
}
function _horaCreacion(p) {
    return new Date(p.fechaCreacion).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
}
function _numPedido(p) {
    return p.numero || p._id.toString().slice(-5).toUpperCase();
}

// ── Generar ticket CLIENTE ───────────────────────────────────────
function generarTicketCliente(pedido) {
    const lineas = pedido.lineas || [];
    const nombre = pedido.nombreCliente || 'Cliente';
    const num    = _numPedido(pedido);

    let buf = cat(
        CMD.init(),
        CMD.alignCenter(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        txt('BUENA BURGER\n'),
        CMD.normalSize(),
        CMD.boldOff(),
        txt(`${NOMBRE_LOCAL}\n`),
        CMD.feed(1),
        CMD.line(),
        CMD.alignLeft(),
        CMD.boldOn(),
        txt(`Pedido: BB-${num}\n`),
        CMD.boldOff(),
        txt(`Nombre: ${nombre}\n`),
        txt(`Fecha:  ${_fechaCorta(pedido)}\n`),
        txt(`Recog.: ${_horaRecogida(pedido)}\n`),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd = l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto';
        const precio  = `${((l.precioUnitario || 0) * l.cantidad).toFixed(2)}EUR`;
        const izq     = `${l.cantidad}x ${nomProd}`;
        const lineTxt = izq.padEnd(ANCHO - precio.length) + precio + '\n';
        buf = cat(buf, CMD.boldOn(), txt(lineTxt), CMD.boldOff());

        if (l.excluidos?.length) buf = cat(buf, txt(`   SIN: ${l.excluidos.join(', ')}\n`));
        if (l.anadidos?.length)  buf = cat(buf, txt(`   + ${l.anadidos.join(', ')}\n`));
        if (l.extras?.length) {
            for (const e of l.extras) {
                const eP = `${(e.precio * e.cantidad).toFixed(2)}EUR`;
                const eL = `   + ${e.cantidad}x ${e.nombre}`;
                buf = cat(buf, txt(eL.padEnd(ANCHO - eP.length) + eP + '\n'));
            }
        }
    }

    return cat(
        buf,
        CMD.line(),
        CMD.boldOn(),
        CMD.textSize(1, 2),
        txt(`TOTAL: ${(pedido.total || 0).toFixed(2)} EUR\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        txt(`Pago: ${pedido.metodoPago === 'PAGO_EN_LOCAL' ? 'Efectivo/Tarjeta en local' : pedido.metodoPago || '—'}\n`),
        CMD.feed(1),
        CMD.alignCenter(),
        txt('Gracias por tu pedido!\n'),
        txt('Te avisamos cuando este listo\n'),
        CMD.feed(3),
        CMD.cut(),
    );
}

// ── Generar ticket COCINA ────────────────────────────────────────
function generarTicketCocina(pedido) {
    const lineas = pedido.lineas || [];
    const nombre = (pedido.nombreCliente || 'CLIENTE').toUpperCase();
    const num    = _numPedido(pedido);
    const hora   = _horaRecogida(pedido);

    let buf = cat(
        CMD.init(),
        CMD.alignCenter(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        txt(`BB-${num}\n`),
        CMD.normalSize(),
        CMD.textSize(1, 2),
        txt(`RECOG: ${hora}\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        CMD.line(),
        CMD.alignLeft(),
        CMD.boldOn(),
        CMD.textSize(2, 2),
        txt(`${nombre}\n`),
        CMD.normalSize(),
        CMD.boldOff(),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd = (l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto').toUpperCase();
        buf = cat(
            buf,
            CMD.boldOn(),
            CMD.textSize(1, 2),
            txt(`${l.cantidad}x ${nomProd}\n`),
            CMD.normalSize(),
            CMD.boldOff(),
        );
        if (l.excluidos?.length) buf = cat(buf, txt(`  SIN: ${l.excluidos.join(', ')}\n`));
        if (l.anadidos?.length)  buf = cat(buf, txt(`  + ${l.anadidos.join(', ')}\n`));
        if (l.extras?.length) {
            for (const e of l.extras)
                buf = cat(buf, txt(`  ${e.cantidad}x ${e.nombre}\n`));
        }
    }

    return cat(
        buf,
        CMD.line(),
        CMD.alignCenter(),
        txt(`${_horaCreacion(pedido)} | ${pedido.canal || 'TELEFONO'}\n`),
        CMD.feed(3),
        CMD.cut(),
    );
}

// ── Enviar bytes por TCP ─────────────────────────────────────────
function enviarTCP(bytes) {
    return new Promise((resolve, reject) => {
        if (!_config.ip) return reject(new Error('IP de impresora no configurada'));

        const socket = new net.Socket();
        socket.setTimeout(TCP_TIMEOUT_MS);
        socket.connect(_config.puerto, _config.ip, () => {
            socket.write(bytes, () => {
                socket.destroy();
                resolve();
            });
        });
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout conectando a la impresora')); });
        socket.on('error', (err) => { socket.destroy(); reject(err); });
    });
}

// ── API pública ──────────────────────────────────────────────────

/** Imprime ambos tickets (cocina + cliente) para un pedido */
exports.imprimirPedido = async (pedido) => {
    await enviarTCP(generarTicketCocina(pedido));
    await new Promise(r => setTimeout(r, PRINTER_PAUSE_MS));
    await enviarTCP(generarTicketCliente(pedido));
};

/** Imprime un solo ticket: 'cliente' | 'cocina' */
exports.imprimirTicket = async (pedido, tipo) => {
    const bytes = tipo === 'cocina' ? generarTicketCocina(pedido) : generarTicketCliente(pedido);
    await enviarTCP(bytes);
};

/** Intenta imprimir; si falla, encola para reintento manual */
exports.imprimirOEncolar = async (pedido) => {
    try {
        await exports.imprimirPedido(pedido);
    } catch (err) {
        console.warn('[Impresora] Sin conexión, pedido encolado:', err.message);
        _cola.push(pedido);
    }
};

/** Imprime todos los pedidos en cola y los elimina */
exports.imprimirCola = async () => {
    const pendientes = _cola.splice(0, _cola.length);
    const errores = [];
    for (const pedido of pendientes) {
        try {
            await exports.imprimirPedido(pedido);
            await new Promise(r => setTimeout(r, 400));
        } catch (err) {
            errores.push(pedido); // devolver a la cola si falla
        }
    }
    _cola.push(...errores);
    return { impresos: pendientes.length - errores.length, fallidos: errores.length };
};

exports.getCola   = ()          => _cola;
exports.getConfig = ()          => ({ ..._config });
exports.configurar = (ip, puerto) => {
    _config.ip     = ip;
    _config.puerto = parseInt(puerto) || PRINTER_DEFAULT_PORT;
};
