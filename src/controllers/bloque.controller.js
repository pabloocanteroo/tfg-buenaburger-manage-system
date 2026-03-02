const BloqueProduccion = require('../models/bloqueProduccion.model');

// GET /api/bloques?fecha=YYYY-MM-DD
exports.getBloques = async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) return res.status(400).json({ ok: false, mensaje: 'Parámetro fecha requerido (YYYY-MM-DD)' });
        const bloques = await BloqueProduccion.find({ fecha }).sort('horaInicio');
        res.json({ ok: true, fecha, total: bloques.length, bloques });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// POST /api/bloques/generar  — genera bloques de un día (admin)
exports.generarBloques = async (req, res) => {
    try {
        const { fecha, horaInicio = '20:30', horaFin = '23:00', intervaloMin = 5, capacidadMax = 10 } = req.body;
        if (!fecha) return res.status(400).json({ ok: false, mensaje: 'Campo fecha requerido' });

        const bloques = [];
        let [h, m] = horaInicio.split(':').map(Number);
        const [hFin, mFin] = horaFin.split(':').map(Number);

        while (h * 60 + m < hFin * 60 + mFin) {
            const ini = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            m += intervaloMin;
            if (m >= 60) { h++; m -= 60; }
            const fin = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            bloques.push({ fecha, horaInicio: ini, horaFin: fin, capacidadMax });
        }

        // insertMany con ordered:false para saltar duplicados
        const resultado = await BloqueProduccion.insertMany(bloques, { ordered: false }).catch(e => e);
        res.status(201).json({ ok: true, mensaje: `Bloques generados para ${fecha}`, total: bloques.length });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// PATCH /api/bloques/:id/cerrar
exports.cerrarBloque = async (req, res) => {
    try {
        const bloque = await BloqueProduccion.findByIdAndUpdate(req.params.id, { cerrado: true }, { new: true });
        if (!bloque) return res.status(404).json({ ok: false, mensaje: 'Bloque no encontrado' });
        res.json({ ok: true, mensaje: 'Bloque cerrado', bloque });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// POST /api/bloques/cerrar-dia
exports.cerrarDia = async (req, res) => {
    try {
        const { fecha } = req.body;
        await BloqueProduccion.updateMany({ fecha, cerrado: false }, { cerrado: true });
        res.json({ ok: true, mensaje: `Todos los bloques de ${fecha} cerrados` });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
