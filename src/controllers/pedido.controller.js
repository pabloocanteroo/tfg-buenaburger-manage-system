const mongoose = require('mongoose');
const Pedido          = require('../models/pedido.model');
const Producto        = require('../models/producto.model');
const BloqueProduccion = require('../models/bloqueProduccion.model');
const { ClienteInvitado } = require('../models/cliente.model');
const socketService   = require('../services/socket');
const printerService  = require('../services/printer');
const { fechaToString } = require('../utils/helpers');

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Calcula cuántas hamburguesas hay en las líneas del pedido */
const contarHamburguesas = (lineas, productos) =>
    lineas.reduce((total, linea) => {
        const prod = productos.find(p => p._id.toString() === linea.producto.toString());
        if (prod && prod.categoria === 'HAMBURGUESA') total += linea.cantidad;
        return total;
    }, 0);

/** Suma el total económico de las líneas de un pedido */
const calcularTotal = (lineas) =>
    lineas.reduce((sum, l) => {
        const extrasTotal = (l.extras || []).reduce((s, e) => s + (e.precio || 0) * e.cantidad, 0);
        return sum + l.precioUnitario * l.cantidad + extrasTotal;
    }, 0);

/** Enriquece las líneas con nombre y precio desnormalizados desde el catálogo */
const desnormalizarLineas = (lineas, productos) =>
    lineas.map(l => {
        const prod = productos.find(p => p._id.toString() === l.producto.toString());
        return {
            ...l,
            nombre: l.nombre || prod?.nombre || null,
            precio: l.precio ?? prod?.precio ?? l.precioUnitario,
        };
    });

/**
 * Reserva los bloques necesarios de forma atómica.
 * Devuelve un array de { id, cantidad } con cuántas hamburguesas se añadieron a cada bloque.
 * Si algo falla ANTES de actualizar los bloques, lanza error sin efectos secundarios.
 */
/**
 * Devuelve { reservas, horaRecogida } donde horaRecogida es el Date del primer bloque.
 * Así el llamador no necesita una query extra para obtener fecha/hora del bloque inicial.
 */
const reservarBloques = async (bloqueInicialId, numHamburguesas, forzar = false) => {
    if (numHamburguesas <= 0) return { reservas: [], horaRecogida: null };

    const bloqueInicial = await BloqueProduccion.findById(bloqueInicialId);
    if (!bloqueInicial) throw new Error('Bloque no encontrado');

    const bloquesNecesarios = Math.ceil(numHamburguesas / bloqueInicial.capacidadMax);
    const fecha = bloqueInicial.fecha;

    const bloquesDelDia = await BloqueProduccion.find({ fecha, cerrado: false }).sort('horaInicio');
    const idx = bloquesDelDia.findIndex(b => b._id.toString() === bloqueInicialId.toString());
    if (idx === -1) throw new Error('Bloque no disponible');

    const seleccionados = bloquesDelDia.slice(idx, idx + bloquesNecesarios);
    if (seleccionados.length < bloquesNecesarios)
        throw new Error('No hay suficientes bloques consecutivos disponibles');

    // Si NO se fuerza, verificar con los datos leídos que hay hueco (primera línea de defensa)
    if (!forzar) {
        for (const b of seleccionados) {
            if (b.hamburgesasOcupadas >= b.capacidadMax)
                throw new Error(`El bloque de las ${b.horaInicio} está lleno`);
        }
    }

    // Distribuir hamburguesas con incrementos atómicos para evitar race conditions
    let restantes = numHamburguesas;
    const reservas = [];
    for (const b of seleccionados) {
        if (restantes <= 0) break;

        if (forzar) {
            // En modo forzado el admin puede superar la capacidad; incremento directo
            const cantidad = Math.min(restantes, b.capacidadMax);
            await BloqueProduccion.findByIdAndUpdate(b._id, { $inc: { hamburgesasOcupadas: cantidad } });
            reservas.push({ id: b._id, cantidad });
            restantes -= cantidad;
        } else {
            const espacioLibre = b.capacidadMax - b.hamburgesasOcupadas;
            const cantidad = Math.min(restantes, espacioLibre);

            // Condición atómica: solo incrementa si todavía cabe `cantidad`
            // Evita el race condition check-then-act de dos peticiones concurrentes
            const actualizado = await BloqueProduccion.findOneAndUpdate(
                { _id: b._id, hamburgesasOcupadas: { $lte: b.capacidadMax - cantidad } },
                { $inc: { hamburgesasOcupadas: cantidad } }
            );
            if (!actualizado)
                throw new Error(`El bloque de las ${b.horaInicio} ya no tiene hueco suficiente`);

            reservas.push({ id: b._id, cantidad });
            restantes -= cantidad;
        }
    }

    const horaRecogida = new Date(`${bloqueInicial.fecha}T${bloqueInicial.horaInicio}:00`);
    return { reservas, horaRecogida };
};

/**
 * Deshace una reserva de bloques (rollback si el pedido no se guarda).
 */
const liberarBloques = async (reservas) => {
    for (const r of reservas) {
        await BloqueProduccion.findByIdAndUpdate(r.id, { $inc: { hamburgesasOcupadas: -r.cantidad } });
    }
};

/**
 * Popula un pedido y notifica al iPad + impresora.
 */
const notificarEImprimir = async (pedidoId) => {
    const pedidoPopulado = await Pedido.findById(pedidoId)
        .populate('bloques', 'horaInicio fecha')
        .populate('lineas.producto', 'nombre precio');
    const pedidoObj = pedidoPopulado.toObject();
    socketService.notificarNuevoPedido(pedidoObj);
    printerService.imprimirOEncolar(pedidoObj);
};

// ── POST /api/pedidos ─────────────────────────────────────────────────────────
exports.crearPedido = async (req, res) => {
    let reservas = [], horaRecogida = null;
    try {
        const { nombre, telefono, email, lineas, bloqueId, metodoPago, clienteId } = req.body;

        const productos = await Producto.find({ _id: { $in: lineas.map(l => l.producto) } });
        const numHamburguesas = contarHamburguesas(lineas, productos);

        ({ reservas, horaRecogida } = await reservarBloques(bloqueId, numHamburguesas));
        const bloquesIds = reservas.map(r => r.id);

        const lineasEnriquecidas = desnormalizarLineas(lineas, productos);
        const total = calcularTotal(lineasEnriquecidas);

        let clienteFinal = clienteId;
        if (!clienteId) {
            const invitado = await ClienteInvitado.create({ nombre, telefono, email });
            clienteFinal = invitado._id;
        }

        const estadoInicial = metodoPago === 'PAGO_EN_LOCAL' ? 'CONFIRMADO' : 'PENDIENTE_PAGO';

        const pedido = await Pedido.create({
            cliente: clienteFinal,
            nombreCliente: nombre,
            telefonoCliente: telefono,
            emailCliente: email,
            canal: 'WEB',
            metodoPago,
            bloques: bloquesIds,
            lineas: lineasEnriquecidas,
            total,
            estado: estadoInicial,
            horaRecogida,
        });

        // Solo imprimir si el pedido queda confirmado (pago en local).
        // Si es STRIPE, se imprimirá cuando Stripe confirme el pago.
        if (estadoInicial === 'CONFIRMADO') {
            await notificarEImprimir(pedido._id);
        }

        res.status(201).json({ ok: true, pedido });

    } catch (err) {
        if (reservas.length > 0) await liberarBloques(reservas);
        res.status(400).json({ ok: false, mensaje: err.message });
    }
};

// ── GET /api/pedidos/mis-pedidos ──────────────────────────────────────────────
exports.misPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find({ cliente: req.usuario._id })
            .sort('-fechaCreacion')
            .populate('bloques', 'fecha horaInicio horaFin');
        res.json({ ok: true, total: pedidos.length, pedidos });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── PUT /api/pedidos/:id ──────────────────────────────────────────────────────
exports.modificarPedido = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });

        const esStaff = ['ADMIN', 'EMPLEADO'].includes(req.rol);
        if (!esStaff && !pedido.modificable)
            return res.status(400).json({ ok: false, mensaje: 'Solo se puede modificar en los primeros 15 minutos' });

        const totalAnterior = pedido.total;
        if (req.body.lineas) pedido.lineas = req.body.lineas;
        if (req.body.total)  pedido.total  = req.body.total;
        await pedido.save();

        // TODO: enviar email al admin con la diferencia económica
        res.json({ ok: true, pedido, diferencia: +(pedido.total - totalAnterior).toFixed(2) });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

// ── DELETE /api/pedidos/:id ───────────────────────────────────────────────────
exports.cancelarPedido = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });

        const esStaff = ['ADMIN', 'EMPLEADO'].includes(req.rol);
        if (!esStaff && !pedido.cancelable)
            return res.status(400).json({ ok: false, mensaje: 'Solo se puede cancelar en los primeros 15 minutos' });

        // Calcular hamburguesas del pedido para liberarlas correctamente
        const productos = await Producto.find({ _id: { $in: pedido.lineas.map(l => l.producto) } });
        const numHamburguesas = contarHamburguesas(pedido.lineas, productos);

        // Distribuir la liberación de manera uniforme entre los bloques reservados
        if (pedido.bloques.length > 0) {
            const porBloque = Math.floor(numHamburguesas / pedido.bloques.length);
            const resto     = numHamburguesas % pedido.bloques.length;
            for (let i = 0; i < pedido.bloques.length; i++) {
                const cantidad = porBloque + (i === 0 ? resto : 0);
                await BloqueProduccion.findByIdAndUpdate(pedido.bloques[i], {
                    $inc: { hamburgesasOcupadas: -cantidad },
                });
            }
        }

        pedido.estado = 'CANCELADO';
        await pedido.save();

        // TODO: enviar email al admin
        res.json({ ok: true, mensaje: 'Pedido cancelado', pedido });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

// ── POST /api/pedidos/:id/rehacer ─────────────────────────────────────────────
exports.rehacerPedido = async (req, res) => {
    try {
        const pedidoOriginal = await Pedido.findById(req.params.id);
        if (!pedidoOriginal) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });
        res.json({ ok: true, lineas: pedidoOriginal.lineas, total: pedidoOriginal.total });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── POST /api/pedidos/telefonico ──────────────────────────────────────────────
exports.crearPedidoTelefonico = async (req, res) => {
    let reservas = [], horaRecogida = null;
    try {
        const { nombre, telefono, lineas, bloqueId, forzarBloque: forzar = false } = req.body;

        const productos = await Producto.find({ _id: { $in: lineas.map(l => l.producto) } });
        const numHamburguesas = contarHamburguesas(lineas, productos);

        ({ reservas, horaRecogida } = await reservarBloques(bloqueId, numHamburguesas, forzar));
        const bloquesIds = reservas.map(r => r.id);

        const lineasEnriquecidas = desnormalizarLineas(lineas, productos);
        const total = calcularTotal(lineasEnriquecidas);

        const pedido = await Pedido.create({
            nombreCliente:   nombre,
            telefonoCliente: telefono,
            canal:           'TELEFONO',
            metodoPago:      'PAGO_EN_LOCAL',
            bloques:         bloquesIds,
            lineas:          lineasEnriquecidas,
            total,
            estado:          'CONFIRMADO',
            horaRecogida,
        });

        await notificarEImprimir(pedido._id);

        res.status(201).json({ ok: true, pedido });

    } catch (err) {
        if (reservas.length > 0) await liberarBloques(reservas);
        res.status(400).json({ ok: false, mensaje: err.message });
    }
};

// ── GET /api/pedidos/:id ──────────────────────────────────────────────────────
exports.getPedidoPorId = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id)
            .populate('bloques', 'fecha horaInicio horaFin');
        if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });
        res.json({ ok: true, pedido });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── GET /api/pedidos/todos?fecha= ─────────────────────────────────────────────
exports.getTodosPedidos = async (req, res) => {
    try {
        const fecha = req.query.fecha || fechaToString();
        const bloques = await BloqueProduccion.find({ fecha }).sort('horaInicio');
        const bloqueIds = bloques.map(b => b._id);

        const pedidos = await Pedido.find({
            bloques: { $in: bloqueIds },
            estado:  { $ne: 'CANCELADO' },
        })
            .sort('fechaCreacion')
            .populate('bloques', 'horaInicio horaFin capacidadMax hamburgesasOcupadas')
            .populate('lineas.producto', 'nombre precio categoria')
            .lean();

        res.json({ ok: true, bloques, pedidos });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};
