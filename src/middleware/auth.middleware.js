const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const { ClienteRegistrado } = require('../models/cliente.model');

/**
 * Middleware que verifica el JWT en el header Authorization.
 * Funciona tanto para clientes registrados como para usuarios (staff).
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, mensaje: 'No autorizado — token requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar primero en usuarios (staff), luego en clientes
        let usuario = await Usuario.findById(decoded.id).select('-passwordHash');
        if (usuario) {
            if (!usuario.activo) {
                return res.status(401).json({ ok: false, mensaje: 'Cuenta desactivada — contacta con el administrador' });
            }
            req.usuario = usuario;
            req.rol = usuario.rol;
            return next();
        }

        let cliente = await ClienteRegistrado.findById(decoded.id).select('-passwordHash');
        if (cliente) {
            req.usuario = cliente;
            req.rol = 'CLIENTE';
            return next();
        }

        return res.status(401).json({ ok: false, mensaje: 'No autorizado — usuario no encontrado' });

    } catch (err) {
        return res.status(401).json({ ok: false, mensaje: 'No autorizado — token inválido' });
    }
};

/**
 * Middleware que restringe el acceso a uno o varios roles.
 * Uso: authorize('ADMIN') o authorize('ADMIN', 'EMPLEADO')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.rol)) {
            return res.status(403).json({
                ok: false,
                mensaje: `Acceso denegado — se requiere rol: ${roles.join(' o ')}`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
