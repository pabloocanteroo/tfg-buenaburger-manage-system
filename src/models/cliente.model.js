const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Esquema base (abstract) ───────────────────────────────────────────────────
const clienteOptions = { discriminatorKey: 'tipo', timestamps: true };

const ClienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true }
}, clienteOptions);

const Cliente = mongoose.model('Cliente', ClienteSchema);

// ── ClienteRegistrado ─────────────────────────────────────────────────────────
const ClienteRegistradoSchema = new mongoose.Schema({
    passwordHash: { type: String, required: true }
});

ClienteRegistradoSchema.methods.compararPassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

ClienteRegistradoSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) return;
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const ClienteRegistrado = Cliente.discriminator('ClienteRegistrado', ClienteRegistradoSchema);

// ── ClienteInvitado ───────────────────────────────────────────────────────────
// Sin atributos extra — hereda nombre, telefono, email de Cliente
const ClienteInvitado = Cliente.discriminator('ClienteInvitado', new mongoose.Schema({}));

module.exports = { Cliente, ClienteRegistrado, ClienteInvitado };
