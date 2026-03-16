const Pedido = require('../models/pedido.model');
const Usuario = require('../models/usuario.model');

exports.getEstadisticas = async (req, res) => {
    try {
        const totalPedidos = await Pedido.countDocuments({ estado: { $ne: 'CANCELADO' } });
        const ingresosPagados = await Pedido.aggregate([
            { $match: { stripePagado: true } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        res.json({ ok: true, totalPedidos, ingresosPagados: ingresosPagados[0]?.total || 0 });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
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
