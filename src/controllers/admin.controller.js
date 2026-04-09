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

        const BASE_MATCH = { estado: { $ne: 'CANCELADO' } };
        const HOY_MATCH  = { estado: { $ne: 'CANCELADO' }, fechaCreacion: { $gte: inicioHoy, $lte: finHoy } };

        // Lanzar todas las agregaciones en paralelo para minimizar latencia
        const [
            [globalStats],
            canalesGlobal,
            [hoyStats],
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

            // 3. Resumen del día seleccionado
            Pedido.aggregate([
                { $match: HOY_MATCH },
                { $group: {
                    _id: null,
                    pedidosHoy:  { $sum: 1 },
                    ingresosHoy: { $sum: '$total' },
                    // $sum sobre un campo de array: el $sum interior suma la array por documento
                    unidadesHoy: { $sum: { $sum: '$lineas.cantidad' } },
                }},
            ]),

            // 4. Canal más frecuente del día
            Pedido.aggregate([
                { $match: HOY_MATCH },
                { $group: { _id: '$canal', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 },
            ]),

            // 5. Top 5 productos (usa el nombre desnormalizado del ticket)
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $unwind: '$lineas' },
                { $group: {
                    _id:      '$lineas.producto',
                    nombre:   { $first: '$lineas.nombre' },
                    unidades: { $sum: '$lineas.cantidad' },
                }},
                { $sort: { unidades: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, nombre: { $ifNull: ['$nombre', 'Desconocido'] }, unidades: 1 } },
            ]),

            // 6. Últimos 10 días con actividad (orden cronológico)
            Pedido.aggregate([
                { $match: BASE_MATCH },
                { $group: {
                    _id:      { $dateToString: { format: '%Y-%m-%d', date: '$fechaCreacion' } },
                    pedidos:  { $sum: 1 },
                    ingresos: { $sum: '$total' },
                }},
                { $sort: { _id: -1 } },
                { $limit: 10 },
                { $sort: { _id:  1 } },   // reordenar cronológicamente los 10 obtenidos
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
                hamburguesas:  hoyStats?.unidadesHoy || 0,
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
