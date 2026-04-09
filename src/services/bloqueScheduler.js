const cron = require('node-cron');
const BloqueProduccion = require('../models/bloqueProduccion.model');
const {
    BLOQUE_HORA_INICIO,
    BLOQUE_HORA_FIN,
    BLOQUE_INTERVALO_MIN,
    BLOQUE_CAPACIDAD_MAX,
    SCHEDULER_DIAS_ADELANTE,
    DIAS_OPERATIVOS,
} = require('../utils/constants');
const { fechaToString } = require('../utils/helpers');

/**
 * Genera los bloques de 20:30 a 23:00 para una fecha dada (string 'YYYY-MM-DD').
 * Ignora silenciosamente los duplicados gracias al índice único del modelo.
 */
async function generarBloquesParaDia(fechaStr) {
    const bloques = [];
    let [h, m] = BLOQUE_HORA_INICIO.split(':').map(Number);
    const [hFin, mFin] = BLOQUE_HORA_FIN.split(':').map(Number);

    while (h * 60 + m < hFin * 60 + mFin) {
        const ini = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        m += BLOQUE_INTERVALO_MIN;
        if (m >= 60) { h++; m -= 60; }
        const fin = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        bloques.push({ fecha: fechaStr, horaInicio: ini, horaFin: fin, capacidadMax: BLOQUE_CAPACIDAD_MAX });
    }

    try {
        const res = await BloqueProduccion.insertMany(bloques, { ordered: false });
        if (res.length > 0) {
            console.log(`[Scheduler] ${res.length} bloques generados para ${fechaStr}`);
        }
    } catch (err) {
        // Error 11000 = duplicado → ya existían, no es un error real
        if (err.code !== 11000 && (!err.writeErrors || err.writeErrors.some(e => e.code !== 11000))) {
            console.error(`[Scheduler] Error generando bloques para ${fechaStr}:`, err.message);
        }
    }
}

/**
 * Recorre los próximos SCHEDULER_DIAS_ADELANTE días naturales y genera
 * bloques solo para los días operativos (vie/sáb/dom).
 */
async function generarProximosDiasOperativos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < SCHEDULER_DIAS_ADELANTE; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);

        if (DIAS_OPERATIVOS.has(fecha.getDay())) {
            await generarBloquesParaDia(fechaToString(fecha));
        }
    }
}

/**
 * Lanza la generación inicial y programa el cron diario a medianoche.
 * Llamar una sola vez desde index.js tras conectar la BD.
 */
function iniciarScheduler() {
    console.log('[Scheduler] Generando bloques de producción...');
    generarProximosDiasOperativos();

    // Cada medianoche desplaza la ventana 1 día hacia adelante
    cron.schedule('0 0 * * *', () => {
        console.log('[Scheduler] Cron nocturno — actualizando bloques...');
        generarProximosDiasOperativos();
    });
}

module.exports = { iniciarScheduler, generarProximosDiasOperativos, generarBloquesParaDia };
