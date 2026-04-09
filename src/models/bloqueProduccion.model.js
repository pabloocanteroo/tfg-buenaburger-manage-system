const mongoose = require('mongoose');
const { BLOQUE_CAPACIDAD_MAX } = require('../utils/constants');

const BloqueProduccionSchema = new mongoose.Schema({
    fecha: { type: String, required: true },          // 'YYYY-MM-DD'
    horaInicio: { type: String, required: true },     // 'HH:MM'
    horaFin: { type: String, required: true },        // 'HH:MM'
    capacidadMax: { type: Number, default: BLOQUE_CAPACIDAD_MAX },
    hamburgesasOcupadas: { type: Number, default: 0 },
    cerrado: { type: Boolean, default: false }         // cierre manual por admin
}, { timestamps: true });

// Virtuals
BloqueProduccionSchema.virtual('disponible').get(function () {
    return !this.cerrado && this.hamburgesasOcupadas < this.capacidadMax;
});

BloqueProduccionSchema.virtual('huecosLibres').get(function () {
    return Math.max(0, this.capacidadMax - this.hamburgesasOcupadas);
});

// Índice compuesto para evitar bloques duplicados
BloqueProduccionSchema.index({ fecha: 1, horaInicio: 1 }, { unique: true });

module.exports = mongoose.model('BloqueProduccion', BloqueProduccionSchema);
