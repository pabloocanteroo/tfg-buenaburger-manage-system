const mongoose = require('mongoose');

const MensajeSchema = new mongoose.Schema({
    rol: { type: String, enum: ['user', 'assistant'], required: true },
    contenido: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ConversacionWhatsappSchema = new mongoose.Schema({
    telefono: { type: String, required: true, unique: true, trim: true },
    estado: {
        type: String,
        enum: ['ACTIVA', 'COMPLETADA', 'ABANDONADA'],
        default: 'ACTIVA'
    },
    mensajes: [MensajeSchema],
    pedidoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', default: null },
    ultimaActividad: { type: Date, default: Date.now }
}, { timestamps: true });

// Resetear si lleva más de 4 horas inactiva o ya estaba completada/abandonada
ConversacionWhatsappSchema.methods.necesitaReset = function () {
    const horasInactivo = (Date.now() - this.ultimaActividad.getTime()) / 3600000;
    return this.estado !== 'ACTIVA' || horasInactivo > 4;
};

module.exports = mongoose.model('ConversacionWhatsapp', ConversacionWhatsappSchema);
