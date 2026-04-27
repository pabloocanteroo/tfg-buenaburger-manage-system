const Pedido   = require('../models/pedido.model');
const Usuario  = require('../models/usuario.model');
const Producto = require('../models/producto.model');
const Extra    = require('../models/extra.model');
const { fechaToString, ordenarPorCategoria } = require('../utils/helpers');

// ── GET /api/admin/estadisticas?fecha=YYYY-MM-DD ──────────────────────────────
exports.getEstadisticas = async (req, res) => {
    try {
        const fechaStr  = req.query.fecha || fechaToString();
        const inicioHoy = new Date(`${fechaStr}T00:00:00`);
        const finHoy    = new Date(`${fechaStr}T23:59:59.999`);

        // Las estadísticas se agrupan por la fecha de RECOGIDA (horaRecogida),
        // no por fechaCreacion. Un pedido hecho el lunes para el viernes cuenta
        // como actividad del viernes (cuando realmente se sirve).
        const BASE_MATCH = { estado: { $ne: 'CANCELADO' } };
        const HOY_MATCH  = { estado: { $ne: 'CANCELADO' }, horaRecogida: { $gte: inicioHoy, $lte: finHoy } };

        // Lanzar todas las agregaciones en paralelo para minimizar latencia
        const [
            [globalStats],
            canalesGlobal,
            [hoyStats],
            [hamburguesasHoyDoc],
            [canalHoyDoc],
            topProductos,
            ultimosDiasRaw,
        ] = await Promise.all([

            // 1. Totales globales
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $group: { _id: null, totalPedidos: { $sum: 1 }, ingresosTotales: { $sum: '$total' } } },
            ]),

            // 2. Pedidos por canal (global)
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $group: { _id: '$canal', count: { $sum: 1 } } },
            ]),

            // 3. Resumen del día seleccionado (pedidos + ingresos)
            Pedido.aggregate([
                { $match: HOY_MATCH },
                { $group: {
                    _id: null,
                    pedidosHoy:  { $sum: 1 },
                    ingresosHoy: { $sum: '$total' },
                }},
            ]),

            // 4. Hamburguesas vendidas del día — solo líneas con categoría HAMBURGUESA
            Pedido.aggregate([
                { $match: HOY_MATCH },
                { $unwind: '$lineas' },
                { $lookup: { from: 'productos', localField: 'lineas.producto', foreignField: '_id', as: '_prod' } },
                { $match: { '_prod.categoria': 'HAMBURGUESA' } },
                { $group: { _id: null, unidades: { $sum: '$lineas.cantidad' } } },
            ]),

            // 5. Canal más frecuente del día
            Pedido.aggregate([
                { $match: HOY_MATCH },
                { $group: { _id: '$canal', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 },
            ]),

            // 6. Top 5 productos (solo hamburguesas, que es el dato relevante)
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $unwind: '$lineas' },
                { $lookup: { from: 'productos', localField: 'lineas.producto', foreignField: '_id', as: '_prod' } },
                { $match: { '_prod.categoria': 'HAMBURGUESA' } },
                { $group: {
                    _id:      '$lineas.producto',
                    nombre:   { $first: '$lineas.nombre' },
                    nombreProd: { $first: { $arrayElemAt: ['$_prod.nombre', 0] } },
                    unidades: { $sum: '$lineas.cantidad' },
                }},
                { $addFields: { nombreFinal: { $ifNull: ['$nombre', '$nombreProd'] } } },
                { $match: { nombreFinal: { $ne: null } } },
                { $sort: { unidades: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, unidades: 1, nombre: '$nombreFinal' } },
            ]),

            // 7. Últimos 10 días con actividad (agrupados por fecha de recogida)
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $group: {
                    _id:      { $dateToString: { format: '%Y-%m-%d', date: '$horaRecogida' } },
                    pedidos:  { $sum: 1 },
                    ingresos: { $sum: '$total' },
                }},
                { $sort: { _id: -1 } },
                { $limit: 10 },
            ]),
        ]);

        const totalPedidos    = globalStats?.totalPedidos    || 0;
        const ingresosTotales = globalStats?.ingresosTotales || 0;
        const porCanal        = Object.fromEntries(canalesGlobal.map(c => [c._id, c.count]));

        res.json({
            ok: true,
            hoy: {
                pedidos:       hoyStats?.pedidosHoy  || 0,
                ingresos:      hoyStats?.ingresosHoy || 0,
                hamburguesas:  hamburguesasHoyDoc?.unidades || 0,
                canal:         canalHoyDoc?._id || '—',
            },
            global: {
                totalPedidos,
                ingresosTotales,
                mediaPedido: totalPedidos > 0 ? ingresosTotales / totalPedidos : 0,
                porCanal,
            },
            topProductos,
            ultimosDias: ultimosDiasRaw,
        });
    } catch (err) {
        console.error('[Estadísticas]', err);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// ── GET /api/admin/actividad?tipo=dia|mes|año&valor=... ───────────────────────
exports.getActividad = async (req, res) => {
    try {
        const { tipo, valor } = req.query;
        if (!tipo || !valor) return res.status(400).json({ ok: false, mensaje: 'Faltan parámetros tipo y valor' });

        const BASE_MATCH = { estado: { $ne: 'CANCELADO' } };
        let match, groupId, labelExpr, filas, sortField = '_id';

        // Todas las agrupaciones usan horaRecogida (cuándo se sirve el pedido),
        // no fechaCreacion, para que un pedido anticipado cuente en el día real.
        if (tipo === 'dia') {
            // valor = 'YYYY-MM-DD'
            const inicio = new Date(`${valor}T00:00:00`);
            const fin    = new Date(`${valor}T23:59:59.999`);
            match    = { ...BASE_MATCH, horaRecogida: { $gte: inicio, $lte: fin } };
            groupId  = { $dateToString: { format: '%Y-%m-%d', date: '$horaRecogida' } };
            labelExpr = '$_id';

        } else if (tipo === 'mes') {
            // valor = 'YYYY-MM'
            const [y, m] = valor.split('-').map(Number);
            const inicio = new Date(y, m - 1, 1);
            const fin    = new Date(y, m, 0, 23, 59, 59, 999);
            match    = { ...BASE_MATCH, horaRecogida: { $gte: inicio, $lte: fin } };
            groupId  = { $dateToString: { format: '%Y-%m-%d', date: '$horaRecogida' } };
            labelExpr = '$_id';

        } else if (tipo === 'año') {
            // valor = 'YYYY'
            const y      = parseInt(valor);
            const inicio = new Date(y, 0, 1);
            const fin    = new Date(y, 11, 31, 23, 59, 59, 999);
            match    = { ...BASE_MATCH, horaRecogida: { $gte: inicio, $lte: fin } };
            groupId  = { $dateToString: { format: '%Y-%m', date: '$horaRecogida' } };
            labelExpr = '$_id';

        } else {
            return res.status(400).json({ ok: false, mensaje: 'tipo debe ser dia, mes o año' });
        }

        filas = await Pedido.aggregate([
            { $match: match },
            { $group: {
                _id:      groupId,
                pedidos:  { $sum: 1 },
                ingresos: { $sum: '$total' },
            }},
            { $sort: { _id: 1 } },
        ]);

        const total = filas.reduce((acc, f) => ({
            pedidos:  acc.pedidos  + f.pedidos,
            ingresos: acc.ingresos + f.ingresos,
        }), { pedidos: 0, ingresos: 0 });

        res.json({ ok: true, filas, total });
    } catch (err) {
        console.error('[Actividad]', err);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// ── GET /api/admin/empleados ──────────────────────────────────────────────────
exports.getEmpleados = async (req, res) => {
    try {
        const empleados = await Usuario.find({ rol: 'EMPLEADO', activo: true }).select('-passwordHash');
        res.json({ ok: true, total: empleados.length, empleados });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── POST /api/admin/empleados ─────────────────────────────────────────────────
exports.crearEmpleado = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        const empleado = await Usuario.create({ nombre, email, passwordHash: password, rol: 'EMPLEADO' });
        res.status(201).json({ ok: true, empleado: { id: empleado._id, nombre, email, rol: 'EMPLEADO' } });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

// ── DELETE /api/admin/empleados/:id ──────────────────────────────────────────
exports.eliminarEmpleado = async (req, res) => {
    try {
        await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
        res.json({ ok: true, mensaje: 'Empleado dado de baja' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── GET /api/admin/productos ──────────────────────────────────────────────────
exports.getProductosAll = async (req, res) => {
    try {
        const productos = ordenarPorCategoria(
            await Producto.find().sort('nombre').lean()
        );
        res.json({ ok: true, total: productos.length, productos });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── GET /api/admin/extras ─────────────────────────────────────────────────────
exports.getExtrasAll = async (req, res) => {
    try {
        const extras = await Extra.find().sort('nombre');
        res.json({ ok: true, total: extras.length, extras });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── DELETE /api/admin/productos/:id ──────────────────────────────────────────
exports.eliminarProductoFisico = async (req, res) => {
    try {
        const producto = await Producto.findByIdAndDelete(req.params.id);
        if (!producto) return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        res.json({ ok: true, mensaje: 'Producto eliminado definitivamente' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// ── DELETE /api/admin/extras/:id ─────────────────────────────────────────────
exports.eliminarExtraFisico = async (req, res) => {
    try {
        const extra = await Extra.findByIdAndDelete(req.params.id);
        if (!extra) return res.status(404).json({ ok: false, mensaje: 'Extra no encontrado' });
        res.json({ ok: true, mensaje: 'Extra eliminado definitivamente' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
