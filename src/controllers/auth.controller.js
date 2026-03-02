const jwt = require('jsonwebtoken');
const { ClienteRegistrado } = require('../models/cliente.model');
const Usuario = require('../models/usuario.model');

const generarToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/registro
exports.registrarCliente = async (req, res) => {
    try {
        const { nombre, telefono, email, password } = req.body;
        const existe = await ClienteRegistrado.findOne({ email });
        if (existe) return res.status(400).json({ ok: false, mensaje: 'El email ya está registrado' });

        const cliente = await ClienteRegistrado.create({
            nombre, telefono, email, passwordHash: password
        });

        res.status(201).json({ ok: true, token: generarToken(cliente._id), cliente: { id: cliente._id, nombre, email } });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// POST /api/auth/login
exports.loginCliente = async (req, res) => {
    try {
        const { email, password } = req.body;
        const cliente = await ClienteRegistrado.findOne({ email });
        if (!cliente || !(await cliente.compararPassword(password)))
            return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

        res.json({ ok: true, token: generarToken(cliente._id), cliente: { id: cliente._id, nombre: cliente.nombre, email } });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// POST /api/auth/login-staff
exports.loginStaff = async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ email, activo: true });
        if (!usuario || !(await usuario.compararPassword(password)))
            return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

        res.json({ ok: true, token: generarToken(usuario._id), usuario: { id: usuario._id, nombre: usuario.nombre, rol: usuario.rol } });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};
