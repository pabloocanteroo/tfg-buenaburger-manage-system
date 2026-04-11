const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const { ClienteRegistrado } = require('../models/cliente.model');

/**
 * Resuelve el documento del usuario/cliente a partir del payload del JWT.
 * Si el token incluye `tipo` (tokens nuevos) consulta solo la colección correcta.
 * Para tokens legacy sin `tipo`, intenta primero Usuario y cae a ClienteRegistrado.
 * Devuelve `{ doc, rol }` o `null` si no existe o está inactivo.
 */
const resolverPrincipal = async (decoded) => {
    if (decoded.tipo === 'usuario') {
        const usuario = await Usuario.findById(decoded.id).select('-passwordHash');
        if (!usuario || !usuario.activo) return null;
        return { doc: usuario, rol: usuario.rol };
    }
    if (decoded.tipo === 'cliente') {
        const cliente = await ClienteRegistrado.findById(decoded.id).select('-passwordHash');
        if (!cliente) return null;
        return { doc: cliente, rol: 'CLIENTE' };
    }
    // Legacy fallback: tokens emitidos antes de añadir `tipo` al payload
    const usuario = await Usuario.findById(decoded.id).select('-passwordHash');
    if (usuario) {
        if (!usuario.activo) return null;
        return { doc: usuario, rol: usuario.rol };
    }
    const cliente = await ClienteRegistrado.findById(decoded.id).select('-passwordHash');
    if (cliente) return { doc: cliente, rol: 'CLIENTE' };
    return null;
};

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
        const principal = await resolverPrincipal(decoded);
        if (!principal) {
            return res.status(401).json({ ok: false, mensaje: 'No autorizado — usuario no encontrado o desactivado' });
        }
        req.usuario = principal.doc;
        req.rol = principal.rol;
        return next();
    } catch (err) {
        return res.status(401).json({ ok: false, mensaje: 'No autorizado — token inválido' });
    }
};

/**
 * Variante de `protect` que NO exige token. Si llega uno válido puebla
 * `req.usuario` y `req.rol`; si no, deja la petición continuar como anónima.
 * Útil en rutas públicas donde el servidor quiere preferir la identidad
 * autenticada si existe (p.ej. crearPedido para asociar al cliente logueado
 * sin fiarse de `req.body.clienteId`).
 */
const protectOptional = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const principal = await resolverPrincipal(decoded);
        if (principal) {
            req.usuario = principal.doc;
            req.rol = principal.rol;
        }
    } catch {
        // Token inválido: seguimos como anónimo
    }
    return next();
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

module.exports = { protect, protectOptional, authorize };
