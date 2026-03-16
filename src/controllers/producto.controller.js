const Producto = require('../models/producto.model');

exports.getProductos = async (req, res) => {
    try {
        const { categoria } = req.query;
        const filtro = { activo: true };
        if (categoria) filtro.categoria = categoria.toUpperCase();
        
        let productos = await Producto.find(filtro).sort('nombre').lean(); // Orden alfabético secundario y devolver objetos planos
        
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

exports.getProducto = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (!producto) return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        res.json({ ok: true, producto });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.crearProducto = async (req, res) => {
    try {
        const producto = await Producto.create(req.body);
        res.status(201).json({ ok: true, producto });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

exports.actualizarProducto = async (req, res) => {
    try {
        const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!producto) return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        res.json({ ok: true, producto });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

exports.eliminarProducto = async (req, res) => {
    try {
        await Producto.findByIdAndUpdate(req.params.id, { activo: false });
        res.json({ ok: true, mensaje: 'Producto desactivado' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
