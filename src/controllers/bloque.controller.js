const BloqueProduccion = require('../models/bloqueProduccion.model');
const { fechaToString } = require('../utils/helpers');

// GET /api/bloques?fecha=YYYY-MM-DD
exports.getBloques = async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha) return res.status(400).json({ ok: false, mensaje: 'Parámetro fecha requerido (YYYY-MM-DD)' });
        const bloques = await BloqueProduccion.find({ fecha }).sort('horaInicio');
        res.json({ ok: true, fecha, total: bloques.length, bloques });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// GET /api/bloques/dias-operativos?meses=2
// Devuelve un resumen por día de los próximos N meses (solo vie/sáb/dom)
exports.getDiasOperativos = async (req, res) => {
    try {
        const meses = Math.min(parseInt(req.query.meses) || 2, 12); // máximo 12 meses
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fin = new Date(hoy);
        fin.setDate(hoy.getDate() + meses * 30);

        const fechaInicio = fechaToString(hoy);
        const fechaFin = fechaToString(fin);

        // Obtener todos los bloques en el rango
        const bloques = await BloqueProduccion.find({
            fecha: { $gte: fechaInicio, $lte: fechaFin }
        }).select('fecha cerrado');

        // Agrupar por fecha
        const mapaFechas = {};
        for (const b of bloques) {
            if (!mapaFechas[b.fecha]) {
                mapaFechas[b.fecha] = { total: 0, cerrados: 0 };
            }
            mapaFechas[b.fecha].total++;
            if (b.cerrado) mapaFechas[b.fecha].cerrados++;
        }

        const dias = Object.entries(mapaFechas)
            .map(([fecha, info]) => ({
                fecha,
                totalBloques: info.total,
                bloquesCerrados: info.cerrados,
                diaCerrado: info.cerrados === info.total && info.total > 0
            }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        res.json({ ok: true, total: dias.length, dias });
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
        if (!fecha) return res.status(400).json({ ok: false, mensaje: 'Campo fecha requerido' });
        const resultado = await BloqueProduccion.updateMany({ fecha }, { cerrado: true });
        res.json({ ok: true, mensaje: `Todos los bloques de ${fecha} cerrados`, modificados: resultado.modifiedCount });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};

// POST /api/bloques/abrir-dia
exports.abrirDia = async (req, res) => {
    try {
        const { fecha } = req.body;
        if (!fecha) return res.status(400).json({ ok: false, mensaje: 'Campo fecha requerido' });
        const resultado = await BloqueProduccion.updateMany({ fecha }, { cerrado: false });
        res.json({ ok: true, mensaje: `Todos los bloques de ${fecha} abiertos`, modificados: resultado.modifiedCount });
    } catch (err) { res.status(500).json({ ok: false, mensaje: err.message }); }
};
