const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    rol: {
        type: String,
        enum: ['EMPLEADO', 'ADMIN'],
        default: 'EMPLEADO'
    },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

UsuarioSchema.methods.compararPassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

UsuarioSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) return;
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
