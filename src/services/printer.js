// ══════════════════════════════════════════════════════════════════
//  printer.js — Impresión ESC/POS
//
//  PRINTER_MODE=socket (Render + Pi):
//    El servidor emite 'imprimir-ticket' al agente Pi via Socket.io.
//    El agente hace el TCP a la impresora desde la red local.
//
//  PRINTER_MODE=tcp (desarrollo local / red única):
//    El servidor conecta directamente por TCP a la impresora.
// ══════════════════════════════════════════════════════════════════
const net = require('net');
const {
    PRINTER_DEFAULT_PORT,
    PRINTER_LINE_WIDTH,
    PRINTER_PAUSE_MS,
    TCP_TIMEOUT_MS,
    NOMBRE_LOCAL,
} = require('../utils/constants');

// ── Modo de transporte ───────────────────────────────────────────
const _modoSocket = process.env.PRINTER_MODE === 'socket';
let _io = null;

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
        CMD.boldOff(),
        txt(`Nombre: ${nombre}\n`),
        txt(`Fecha:  ${_fechaCorta(pedido)}\n`),
        txt(`Recog.: ${_horaRecogida(pedido)}\n`),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd      = l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto';
        const extrasPorUnd = (l.extras || []).reduce((s, e) => s + (e.precio || 0) * e.cantidad, 0);
        const precioLinea  = ((l.precioUnitario || 0) + extrasPorUnd) * l.cantidad;
        const precio       = `${precioLinea.toFixed(2)}EUR`;
        const izq          = `${l.cantidad}x ${nomProd}`;
        const lineTxt      = izq.padEnd(ANCHO - precio.length) + precio + '\n';
        buf = cat(buf, CMD.boldOn(), txt(lineTxt), CMD.boldOff());

        if (l.ingredientesExcluidos?.length) buf = cat(buf, txt(`   -${l.ingredientesExcluidos.join(', ')}\n`));
        if (l.ingredientesAnadidos?.length)  buf = cat(buf, txt(`   + ${l.ingredientesAnadidos.join(', ')}\n`));
        if (l.extras?.length) {
            for (const e of l.extras) {
                const cantTotal = e.cantidad * l.cantidad;
                const eP = `${(e.precio * cantTotal).toFixed(2)}EUR`;
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
        txt('gracias por contar con nosotros.\n'),
        txt('Te avisamos cuando este listo\n'),
        CMD.feed(3),
        CMD.cut(),
    );
}

// ── Generar ticket COCINA ────────────────────────────────────────
function generarTicketCocina(pedido) {
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
        txt(`Nombre: ${nombre}\n`),
        txt(`Fecha:  ${_fechaCorta(pedido)}\n`),
        txt(`Recog.: ${_horaRecogida(pedido)}\n`),
        CMD.line(),
    );

    for (const l of lineas) {
        const nomProd      = l.producto?.nombre || l.nombreProducto || l.nombre || 'Producto';
        const extrasPorUnd = (l.extras || []).reduce((s, e) => s + (e.precio || 0) * e.cantidad, 0);
        const precioLinea  = ((l.precioUnitario || 0) + extrasPorUnd) * l.cantidad;
        const precio       = `${precioLinea.toFixed(2)}EUR`;

        // Producto + precio en la misma línea, todo en letra grande
        const cabecera = `${l.cantidad}x ${nomProd}`;
        const lineaTxt = cabecera.padEnd(ANCHO - precio.length) + precio + '\n';
        buf = cat(
            buf,
            CMD.boldOn(),
            CMD.textSize(1, 2),
            txt(lineaTxt),
            CMD.normalSize(),
            CMD.boldOff(),
        );

        // Modificaciones en letra grande también
        if (l.ingredientesExcluidos?.length) buf = cat(buf,
            CMD.textSize(1, 2),
            txt(`  -${l.ingredientesExcluidos.join(', ')}\n`),
            CMD.normalSize(),
        );
        if (l.ingredientesAnadidos?.length) buf = cat(buf,
            CMD.textSize(1, 2),
            txt(`  + ${l.ingredientesAnadidos.join(', ')}\n`),
            CMD.normalSize(),
        );

        if (l.extras?.length) {
            for (const e of l.extras) {
                const cantTotal = e.cantidad * l.cantidad;
                const eP        = `${(e.precio * cantTotal).toFixed(2)}EUR`;
                const eLinea    = `  + ${e.cantidad}x ${e.nombre}`;
                buf = cat(buf,
                    CMD.textSize(1, 2),
                    txt(eLinea.padEnd(ANCHO - eP.length) + eP + '\n'),
                    CMD.normalSize(),
                );
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
        txt('gracias por contar con nosotros.\n'),
        txt('Nos vemos pronto!\n'),
        CMD.feed(3),
        CMD.cut(),
    );
}

// ── Enviar bytes por TCP (modo desarrollo / red local) ───────────
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

// ── Enviar bytes al agente Pi via Socket.io ──────────────────────
async function enviarSocket(bytes) {
    if (!_io) throw new Error('Socket.io no inicializado');
    const agentes = await _io.in('printer-agent').fetchSockets();
    if (!agentes.length) throw new Error('Agente de impresión no conectado');
    _io.to('printer-agent').emit('imprimir-ticket', { bytes: bytes.toString('base64') });
}

// ── Transporte unificado ─────────────────────────────────────────
function _enviar(bytes) {
    return _modoSocket ? enviarSocket(bytes) : enviarTCP(bytes);
}

// ── API pública ──────────────────────────────────────────────────

/** Registra la instancia de Socket.io (llamar desde index.js) */
exports.setIo = (io) => { _io = io; };

/** Imprime solo el ticket de cocina para un pedido */
exports.imprimirPedido = async (pedido) => {
    await _enviar(generarTicketCocina(pedido));
};

/** Imprime un solo ticket: 'cliente' | 'cocina' */
exports.imprimirTicket = async (pedido, tipo) => {
    const bytes = tipo === 'cocina' ? generarTicketCocina(pedido) : generarTicketCliente(pedido);
    await _enviar(bytes);
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
            errores.push(pedido);
        }
    }
    _cola.push(...errores);
    return { impresos: pendientes.length - errores.length, fallidos: errores.length };
};

/** Vuelca la cola al agente recién conectado */
exports.onAgenteConectado = async (socket) => {
    const pendientes = _cola.splice(0);
    for (const pedido of pendientes) {
        try {
            socket.emit('imprimir-ticket', { bytes: generarTicketCocina(pedido).toString('base64') });
        } catch {
            _cola.push(pedido);
        }
    }
};

exports.getCola   = ()          => _cola;
exports.getConfig = ()          => ({ ..._config });
exports.configurar = (ip, puerto) => {
    _config.ip     = ip;
    _config.puerto = parseInt(puerto) || PRINTER_DEFAULT_PORT;
};
