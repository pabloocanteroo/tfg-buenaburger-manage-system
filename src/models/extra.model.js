const mongoose = require('mongoose');

const ExtraSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },        // 0 = gratuito
    cantidadMaxima: { type: Number, default: 10 },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Extra', ExtraSchema);
