const Pedido = require('../models/pedido.model');
const Usuario = require('../models/usuario.model');

exports.getEstadisticas = async (req, res) => {
    try {
        const Producto = require('../models/producto.model');
        const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const fechaStr = req.query.fecha || toStr(new Date());
        const inicioHoy = new Date(`${fechaStr}T00:00:00`);
        const finHoy   = new Date(`${fechaStr}T23:59:59.999`);

        // Traer todos los pedidos no cancelados (para procesarlos en JS)
        const todos = await Pedido.find({ estado: { $ne: 'CANCELADO' } }).lean();

        // ── Resumen global ─────────────────────────────────────────
        const totalPedidos    = todos.length;
        const ingresosTotales = todos.reduce((s, p) => s + (p.total || 0), 0);
        const mediaPedido     = totalPedidos > 0 ? ingresosTotales / totalPedidos : 0;

        // Pedidos por canal global
        const porCanal = {};
        todos.forEach(p => { porCanal[p.canal] = (porCanal[p.canal] || 0) + 1; });

        // ── Resumen del día seleccionado ───────────────────────────
        const deldía = todos.filter(p => {
            const fc = new Date(p.fechaCreacion);
            return fc >= inicioHoy && fc <= finHoy;
        });
        const pedidosHoy     = deldía.length;
        const ingresosHoy    = deldía.reduce((s, p) => s + (p.total || 0), 0);
        const unidadesHoy    = deldía.reduce((s, p) =>
            s + (p.lineas || []).reduce((ls, l) => ls + (l.cantidad || 0), 0), 0);
        const canalesHoy     = {};
        deldía.forEach(p => { canalesHoy[p.canal] = (canalesHoy[p.canal] || 0) + 1; });
        const canalHoy       = Object.entries(canalesHoy).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        // ── Top 5 productos ────────────────────────────────────────
        const contProd = {};
        todos.forEach(p => (p.lineas || []).forEach(l => {
            const id = l.producto?.toString();
            if (id) contProd[id] = (contProd[id] || 0) + (l.cantidad || 0);
        }));
        const topIds = Object.entries(contProd).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const productosDocs = await Producto.find({ _id: { $in: topIds.map(([id]) => id) } }).lean();
        const topProductos = topIds.map(([id, unidades]) => {
            const prod = productosDocs.find(p => p._id.toString() === id);
            return { nombre: prod?.nombre || 'Desconocido', unidades };
        });

        // ── Últimos 10 días con actividad ──────────────────────────
        const diasMap = {};
        todos.forEach(p => {
            const d = new Date(p.fechaCreacion);
            const key = toStr(d);
            if (!diasMap[key]) diasMap[key] = { pedidos: 0, ingresos: 0 };
            diasMap[key].pedidos++;
            diasMap[key].ingresos += p.total || 0;
        });
        const ultimosDias = Object.entries(diasMap)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 10)
            .reverse()
            .map(([_id, v]) => ({ _id, ...v }));

        res.json({
            ok: true,
            hoy: { pedidos: pedidosHoy, ingresos: ingresosHoy, hamburguesas: unidadesHoy, canal: canalHoy },
            global: { totalPedidos, ingresosTotales, mediaPedido, porCanal },
            topProductos,
            ultimosDias
        });
    } catch (err) {
        console.error('[Estadísticas]', err);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

exports.getEmpleados = async (req, res) => {
    try {
        const empleados = await Usuario.find({ rol: 'EMPLEADO', activo: true }).select('-passwordHash');
        res.json({ ok: true, total: empleados.length, empleados });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.crearEmpleado = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        const empleado = await Usuario.create({ nombre, email, passwordHash: password, rol: 'EMPLEADO' });
        res.status(201).json({ ok: true, empleado: { id: empleado._id, nombre, email, rol: 'EMPLEADO' } });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

exports.eliminarEmpleado = async (req, res) => {
    try {
        await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
        res.json({ ok: true, mensaje: 'Empleado dado de baja' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

const Producto = require('../models/producto.model');
const Extra = require('../models/extra.model');

exports.getProductosAll = async (req, res) => {
    try {
        let productos = await Producto.find().sort('nombre').lean();
        
        // Orden personalizado por categoría
        const ordenCategorias = { 'HAMBURGUESA': 1, 'PATATAS': 2, 'POSTRE': 3, 'BEBIDA': 4 };
        productos.sort((a, b) => {
            const ordenA = ordenCategorias[a.categoria] || 99;
            const ordenB = ordenCategorias[b.categoria] || 99;
            return ordenA - ordenB;
        });

        res.json({ ok: true, total: productos.length, productos });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.getExtrasAll = async (req, res) => {
    try {
        const extras = await Extra.find().sort('nombre');
        res.json({ ok: true, total: extras.length, extras });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.eliminarProductoFisico = async (req, res) => {
    try {
        const producto = await Producto.findByIdAndDelete(req.params.id);
        if (!producto) return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        res.json({ ok: true, mensaje: 'Producto eliminado definitivamente' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.eliminarExtraFisico = async (req, res) => {
    try {
        const extra = await Extra.findByIdAndDelete(req.params.id);
        if (!extra) return res.status(404).json({ ok: false, mensaje: 'Extra no encontrado' });
        res.json({ ok: true, mensaje: 'Extra eliminado definitivamente' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
