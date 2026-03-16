const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    precio: { type: Number, required: true, min: 0 },
    categoria: {
        type: String,
        enum: ['HAMBURGUESA', 'PATATAS', 'BEBIDA', 'POSTRE'],
        required: true
    },
    ingredientesPorDefecto: [{ type: String, trim: true }],  // ['bacon', 'queso', 'pepinillos'...]
    imagen: { type: String, default: '' },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Producto', ProductoSchema);
