const mongoose = require('mongoose');
const { MODIFICATION_WINDOW_MINUTES } = require('../utils/constants');

// ── ExtraLinea (subdocumento) ─────────────────────────────────────────────────
const ExtraLineaSchema = new mongoose.Schema({
    extra: { type: mongoose.Schema.Types.ObjectId, ref: 'Extra', required: true },
    nombre: { type: String },     // desnormalizado para el ticket
    precio: { type: Number },     // desnormalizado para el ticket
    cantidad: { type: Number, required: true, min: 1 }
}, { _id: false });

// ── LineaPedido (subdocumento) ────────────────────────────────────────────────
const LineaPedidoSchema = new mongoose.Schema({
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    nombre: { type: String },     // desnormalizado para el ticket
    precio: { type: Number },     // desnormalizado para el ticket
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true },
    ingredientesExcluidos: [{ type: String, trim: true }],   // ['pepinillos', 'cebolla']
    ingredientesAnadidos: [{ type: String, trim: true }],    // ['doble lechuga']
    extras: [ExtraLineaSchema]
}, { _id: false });

// ── Pedido ────────────────────────────────────────────────────────────────────
const PedidoSchema = new mongoose.Schema({
    numero: { type: String, unique: true },   // generado automáticamente

    // Quién pide
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },  // null si invitado
    nombreCliente: { type: String, required: true, trim: true },
    telefonoCliente: { type: String, required: true, trim: true },
    emailCliente: { type: String, trim: true, lowercase: true },

    canal: {
        type: String,
        enum: ['WEB', 'WHATSAPP', 'TELEFONO'],
        required: true
    },

    estado: {
        type: String,
        enum: ['PENDIENTE_PAGO', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],
        default: 'PENDIENTE_PAGO'
    },

    metodoPago: {
        type: String,
        enum: ['STRIPE', 'PAGO_EN_LOCAL'],
        required: true
    },

    // Bloques reservados (puede ser 1 o varios si hay muchas hamburguesas)
    bloques: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BloqueProduccion' }],

    lineas: [LineaPedidoSchema],

    total: { type: Number, required: true, min: 0 },

    // Stripe
    stripeSessionId: { type: String, default: null },
    stripePagado: { type: Boolean, default: false },

    // Control de tiempo para modificaciones/cancelaciones
    fechaCreacion: { type: Date, default: Date.now },
    fechaConfirmacion: { type: Date, default: null },

    // Hora de recogida desnormalizada (del primer bloque reservado) — usada para la ventana de modificación
    horaRecogida: { type: Date, default: null }

}, { timestamps: true, toJSON: { virtuals: true } });

// ── Auto-generar número de pedido ─────────────────────────────────────────────
PedidoSchema.pre('save', async function () {
    if (!this.numero) {
        const { fechaToString } = require('../utils/helpers');
        const fecha = fechaToString().replace(/-/g, '');
        const count = await mongoose.model('Pedido').countDocuments();
        this.numero = `BB-${fecha}-${String(count + 1).padStart(4, '0')}`;
    }
});

// ── Virtuals ──────────────────────────────────────────────────────────────────
// Un pedido es modificable/cancelable mientras falten más de 15 min para la hora de recogida
PedidoSchema.virtual('modificable').get(function () {
    if (!this.horaRecogida) return false;
    const minutosRestantes = (this.horaRecogida.getTime() - Date.now()) / 60000;
    return minutosRestantes > MODIFICATION_WINDOW_MINUTES && this.estado !== 'CANCELADO';
});

PedidoSchema.virtual('cancelable').get(function () {
    if (!this.horaRecogida) return false;
    const minutosRestantes = (this.horaRecogida.getTime() - Date.now()) / 60000;
    return minutosRestantes > MODIFICATION_WINDOW_MINUTES && this.estado !== 'CANCELADO';
});

// ── Índices ───────────────────────────────────────────────────────────────────
PedidoSchema.index({ cliente: 1 });              // misPedidos: filtro por cliente
PedidoSchema.index({ estado: 1 });              // filtros por estado en admin/estadísticas
PedidoSchema.index({ fechaCreacion: -1 });      // ordenación y filtro por fecha
PedidoSchema.index({ bloques: 1 });             // getTodosPedidos: $in sobre bloques

module.exports = mongoose.model('Pedido', PedidoSchema);
