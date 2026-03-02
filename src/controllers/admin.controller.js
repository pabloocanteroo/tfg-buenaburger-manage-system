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
