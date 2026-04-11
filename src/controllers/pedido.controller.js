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

    // Si NO se fuerza, verificar que la suma de huecos de los bloques seleccionados alcanza
    // para todas las hamburguesas. El chequeo por bloque individual no vale: un pedido grande
    // reparte entre bloques consecutivos, y un bloque parcialmente ocupado puede dejar menos
    // hueco del necesario aunque ningún bloque esté "lleno" por sí solo.
    if (!forzar) {
        const huecoTotal = seleccionados.reduce(
            (acc, b) => acc + Math.max(0, b.capacidadMax - b.hamburgesasOcupadas), 0
        );
        if (huecoTotal < numHamburguesas) {
            throw new Error(
                `Para esa hora solo hay ${huecoTotal} hueco(s) consecutivo(s) y el pedido necesita ${numHamburguesas}`
            );
        }
    }

    // Distribuir hamburguesas con incrementos atómicos para evitar race conditions.
    // Si algo falla a mitad del bucle, liberar lo ya reservado antes de propagar el error.
    let restantes = numHamburguesas;
    const reservas = [];
    try {
        for (const b of seleccionados) {
            if (restantes <= 0) break;

            if (forzar) {
                // En modo forzado el admin puede superar la capacidad; incremento directo
                const cantidad = Math.min(restantes, b.capacidadMax);
                await BloqueProduccion.findByIdAndUpdate(b._id, { $inc: { hamburgesasOcupadas: cantidad } });
                reservas.push({ id: b._id, cantidad });
                restantes -= cantidad;
            } else {
                const espacioLibre = Math.max(0, b.capacidadMax - b.hamburgesasOcupadas);
                if (espacioLibre <= 0) continue; // bloque sin hueco: sigue al siguiente consecutivo
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

        // Red de seguridad: si el bucle termina sin cubrir todas las hamburguesas, NO guardar
        // un pedido inconsistente. Lanzar error para que el llamador ofrezca otra hora.
        if (restantes > 0 && !forzar) {
            throw new Error(
                `No caben todas las hamburguesas en los bloques consecutivos desde esa hora (faltan ${restantes})`
            );
        }
    } catch (err) {
        if (reservas.length > 0) await liberarBloques(reservas);
        throw err;
    }

    const horaRecogida = new Date(`${bloqueInicial.fecha}T${bloqueInicial.horaInicio}:00`);
    return { reservas, horaRecogida };
};

/**
 * Devuelve los bloques del día que son válidos como punto de inicio para un pedido
 * de `numHamburguesas` hamburguesas. Debe coincidir EXACTAMENTE con la lógica de
 * `reservarBloques`: se reservan `ceil(n / capacidadMax)` bloques consecutivos a
 * partir del inicial y la suma de huecos libres de esos bloques debe alcanzar para
 * todas las hamburguesas. No vale acumular huecos sobre más bloques de los que la
 * reserva va a consumir realmente, porque eso mentiría al cliente.
 */
const bloquesValidosComoInicio = (bloquesDelDia, numHamburguesas) => {
    if (numHamburguesas <= 0) return [];
    return bloquesDelDia.filter((bloqueInicio, i) => {
        const bloquesNecesarios = Math.ceil(numHamburguesas / bloqueInicio.capacidadMax);
        const seleccionados = bloquesDelDia.slice(i, i + bloquesNecesarios);
        if (seleccionados.length < bloquesNecesarios) return false;
        const huecoTotal = seleccionados.reduce(
            (acc, b) => acc + Math.max(0, b.capacidadMax - b.hamburgesasOcupadas), 0
        );
        return huecoTotal >= numHamburguesas;
    });
};

/**
 * Deshace una reserva de bloques (rollback si el pedido no se guarda).
 */
const liberarBloques = async (reservas) => {
    for (const r of reservas) {
        if (!r.cantidad) continue;
        await BloqueProduccion.findByIdAndUpdate(r.id, { $inc: { hamburgesasOcupadas: -r.cantidad } });
    }
};

/**
 * Devuelve el reparto real de hamburguesas por bloque de un pedido en formato
 * `[{ id, cantidad }]` (el mismo formato que consume `liberarBloques`).
 *
 * Si el pedido tiene el array paralelo `cantidadPorBloque` (pedidos nuevos) se
 * usa tal cual. Para pedidos legacy sin ese campo se cae al reparto uniforme
 * (mismo comportamiento que tenía el código anterior).
 */
const reservasDePedido = (pedido, totalHamburguesas) => {
    const ids = pedido.bloques;
    if (!ids || ids.length === 0) return [];
    const cantidades = pedido.cantidadPorBloque;
    if (Array.isArray(cantidades) && cantidades.length === ids.length) {
        return ids.map((id, i) => ({ id, cantidad: cantidades[i] || 0 }));
    }
    // Legacy: reparto uniforme (heurística histórica)
    const numBloques = ids.length;
    const porBloque  = Math.floor(totalHamburguesas / numBloques);
    const resto      = totalHamburguesas % numBloques;
    return ids.map((id, i) => ({ id, cantidad: porBloque + (i === 0 ? resto : 0) }));
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
        const bloquesIds       = reservas.map(r => r.id);
        const cantidadPorBloque = reservas.map(r => r.cantidad);

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
            cantidadPorBloque,
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
            return res.status(400).json({ ok: false, mensaje: 'El pedido ya no se puede modificar (faltan menos de 15 minutos para la recogida)' });

        const totalAnterior = pedido.total;
        const lineasAnteriores = pedido.lineas;

        if (req.body.lineas) pedido.lineas = req.body.lineas;
        if (req.body.total)  pedido.total  = req.body.total;

        // Ajustar hamburguesas ocupadas en los bloques si cambió la cantidad
        if (req.body.lineas && pedido.bloques.length > 0) {
            const todosProductos = await Producto.find({
                _id: { $in: [
                    ...lineasAnteriores.map(l => l.producto),
                    ...req.body.lineas.map(l => l.producto)
                ]}
            });

            const hamburguesasAntes   = contarHamburguesas(lineasAnteriores, todosProductos);
            const hamburguesasDespues = contarHamburguesas(req.body.lineas, todosProductos);
            const diferenciaBurgers   = hamburguesasDespues - hamburguesasAntes;

            if (diferenciaBurgers !== 0) {
                // El cliente eligió un bloque alternativo — liberar el actual y reservar el nuevo
                if (!esStaff && req.body.nuevoBloqueId) {
                    await liberarBloques(reservasDePedido(pedido, hamburguesasAntes));

                    const { reservas: nuevasReservas, horaRecogida: nuevaHora } =
                        await reservarBloques(req.body.nuevoBloqueId, hamburguesasDespues);

                    pedido.bloques            = nuevasReservas.map(r => r.id);
                    pedido.cantidadPorBloque  = nuevasReservas.map(r => r.cantidad);
                    pedido.horaRecogida       = nuevaHora;
                    await pedido.save();
                    return res.json({ ok: true, pedido, diferencia: +(pedido.total - totalAnterior).toFixed(2) });
                }

                // Añade hamburguesas y no es staff: intentar mantener el mismo bloque de inicio
                if (diferenciaBurgers > 0 && !esStaff) {
                    const bloquesDelPedido = await BloqueProduccion.find({ _id: { $in: pedido.bloques } }).sort('horaInicio');
                    const fecha            = bloquesDelPedido[0]?.fecha;
                    const primerBloqueId   = bloquesDelPedido[0]?._id;

                    // Cantidades reales que ocupa este pedido en cada bloque — usa el array
                    // persistido `cantidadPorBloque`, o cae al reparto uniforme si es un pedido legacy.
                    const reservasActuales = reservasDePedido(pedido, hamburguesasAntes);
                    const liberacionPorBloque = new Map(
                        reservasActuales.map(r => [r.id.toString(), r.cantidad])
                    );

                    // Vista ajustada del día: los bloques de este pedido con sus huecos reales tras liberar
                    const bloquesDelDia = fecha
                        ? (await BloqueProduccion.find({ fecha, cerrado: false }).sort('horaInicio').lean())
                            .map(b => {
                                const liberar = liberacionPorBloque.get(b._id.toString()) || 0;
                                return liberar > 0
                                    ? { ...b, hamburgesasOcupadas: b.hamburgesasOcupadas - liberar }
                                    : b;
                            })
                        : [];

                    const iniciovalido = bloquesValidosComoInicio(bloquesDelDia, hamburguesasDespues);
                    const cabeEnMismaHora = iniciovalido.some(b => b._id.toString() === primerBloqueId.toString());

                    if (cabeEnMismaHora) {
                        // Cabe en la misma hora + consecutivos: liberar y re-reservar desde el mismo inicio
                        await liberarBloques(reservasActuales);
                        const { reservas: nuevasReservas, horaRecogida: nuevaHora } =
                            await reservarBloques(primerBloqueId, hamburguesasDespues);
                        pedido.bloques           = nuevasReservas.map(r => r.id);
                        pedido.cantidadPorBloque = nuevasReservas.map(r => r.cantidad);
                        pedido.horaRecogida      = nuevaHora;
                        await pedido.save();
                        return res.json({ ok: true, pedido, diferencia: +(pedido.total - totalAnterior).toFixed(2) });
                    }

                    // No cabe en la misma hora → ofrecer alternativas
                    return res.status(409).json({
                        ok: false,
                        sinHueco: true,
                        hamburguesasNecesarias: hamburguesasDespues,
                        bloquesDisponibles: iniciovalido,
                        mensaje: 'Para la hora que tienes reservada no tenemos tanto hueco como para incluir todas las hamburguesas. Prueba con otra hora:'
                    });
                }

                // Quita hamburguesas o es staff: ajuste directo con $inc sobre los bloques actuales
                const numBloques = pedido.bloques.length;
                const porBloque  = Math.floor(Math.abs(diferenciaBurgers) / numBloques);
                const resto      = Math.abs(diferenciaBurgers) % numBloques;
                const signo      = diferenciaBurgers > 0 ? 1 : -1;

                // Asegurar cantidadPorBloque inicializado para pedidos legacy
                if (!pedido.cantidadPorBloque || pedido.cantidadPorBloque.length !== numBloques) {
                    pedido.cantidadPorBloque = reservasDePedido(pedido, hamburguesasAntes).map(r => r.cantidad);
                }

                for (let i = 0; i < numBloques; i++) {
                    const delta = (porBloque + (i === 0 ? resto : 0)) * signo;
                    if (delta !== 0) {
                        await BloqueProduccion.findByIdAndUpdate(pedido.bloques[i], {
                            $inc: { hamburgesasOcupadas: delta }
                        });
                        // Mantener consistente la cantidad persistida del pedido
                        pedido.cantidadPorBloque[i] = Math.max(0, (pedido.cantidadPorBloque[i] || 0) + delta);
                    }
                }
            }
        }

        await pedido.save();

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
            return res.status(400).json({ ok: false, mensaje: 'El pedido ya no se puede cancelar (faltan menos de 15 minutos para la recogida)' });

        // Liberar usando el reparto real persistido en `cantidadPorBloque`. Para
        // pedidos legacy sin ese array, `reservasDePedido` cae al reparto uniforme.
        if (pedido.bloques.length > 0) {
            const productos = await Producto.find({ _id: { $in: pedido.lineas.map(l => l.producto) } });
            const numHamburguesas = contarHamburguesas(pedido.lineas, productos);
            await liberarBloques(reservasDePedido(pedido, numHamburguesas));
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
        const bloquesIds        = reservas.map(r => r.id);
        const cantidadPorBloque = reservas.map(r => r.cantidad);

        const lineasEnriquecidas = desnormalizarLineas(lineas, productos);
        const total = calcularTotal(lineasEnriquecidas);

        const pedido = await Pedido.create({
            nombreCliente:    nombre,
            telefonoCliente:  telefono,
            canal:            'TELEFONO',
            metodoPago:       'PAGO_EN_LOCAL',
            bloques:          bloquesIds,
            cantidadPorBloque,
            lineas:           lineasEnriquecidas,
            total,
            estado:           'CONFIRMADO',
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
