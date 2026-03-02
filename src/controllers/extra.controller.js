const Extra = require('../models/extra.model');

exports.getExtras = async (req, res) => {
    try {
        const extras = await Extra.find({ activo: true }).sort('nombre');
        res.json({ ok: true, total: extras.length, extras });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

exports.crearExtra = async (req, res) => {
    try {
        const extra = await Extra.create(req.body);
        res.status(201).json({ ok: true, extra });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

exports.actualizarExtra = async (req, res) => {
    try {
        const extra = await Extra.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!extra) return res.status(404).json({ ok: false, mensaje: 'Extra no encontrado' });
        res.json({ ok: true, extra });
    } catch (err) { res.status(400).json({ ok: false, mensaje: err.message }); }
};

exports.eliminarExtra = async (req, res) => {
    try {
        await Extra.findByIdAndUpdate(req.params.id, { activo: false });
        res.json({ ok: true, mensaje: 'Extra desactivado' });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
