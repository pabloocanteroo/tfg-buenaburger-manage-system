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

// GET /api/auth/me
exports.getPerfilCliente = async (req, res) => {
    try {
        const cliente = await ClienteRegistrado.findById(req.usuario._id).select('-passwordHash');
        if (!cliente) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
        res.json({ ok: true, cliente });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// PUT /api/auth/perfil
exports.actualizarPerfilCliente = async (req, res) => {
    try {
        const { nombre, telefono, password } = req.body;
        const cliente = await ClienteRegistrado.findById(req.usuario._id);
        if (!cliente) return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });

        if (nombre) cliente.nombre = nombre;
        if (telefono) cliente.telefono = telefono;
        if (password) {
            cliente.passwordHash = password; // El pre('save') del modelo ya encripta automáticamente si detecta un hash en un doc instanciado (a menos que no funcione igual para updates manuales)
            // Para asegurar el hash manual si el pre no salta
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            cliente.passwordHash = await bcrypt.hash(password, salt);
        }

        await cliente.save();
        
        res.json({ ok: true, mensaje: 'Perfil actualizado con éxito', cliente: { nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email }});
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};
