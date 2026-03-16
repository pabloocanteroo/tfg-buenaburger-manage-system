const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware que verifica el resultado de las validaciones y corta la cadena si hay errores.
 */
const validar = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Datos inválidos',
            errores: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
        });
    }
    next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
const validarRegistro = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio'),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validar
];

const validarLogin = [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    validar
];

// ── Producto ──────────────────────────────────────────────────────────────────
const validarProducto = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
    body('categoria')
        .isIn(['HAMBURGUESA', 'PATATAS', 'BEBIDA', 'POSTRE'])
        .withMessage('Categoría inválida. Valores: HAMBURGUESA, PATATAS, BEBIDA, POSTRE'),
    validar
];

// ── Extra ─────────────────────────────────────────────────────────────────────
const validarExtra = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número >= 0'),
    validar
];


const validarQueryFecha = [
    query('fecha')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fecha inválido. Usa YYYY-MM-DD'),
    validar
];

// ── Pedido ────────────────────────────────────────────────────────────────────
const validarCrearPedido = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio'),
    body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('bloqueId').notEmpty().withMessage('Debes seleccionar un bloque horario'),
    body('metodoPago')
        .isIn(['STRIPE', 'PAGO_EN_LOCAL'])
        .withMessage('Método de pago inválido. Valores: STRIPE, PAGO_EN_LOCAL'),
    body('lineas').isArray({ min: 1 }).withMessage('El pedido debe tener al menos una línea'),
    body('lineas.*.producto').notEmpty().withMessage('Cada línea debe tener un producto'),
    body('lineas.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
    body('lineas.*.precioUnitario').isFloat({ min: 0 }).withMessage('El precio unitario debe ser positivo'),
    validar
];

const validarCrearPedidoTelefonico = [
    body('nombre').trim().notEmpty().withMessage('El nombre del cliente es obligatorio'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio'),
    body('bloqueId').notEmpty().withMessage('Debes seleccionar un bloque horario'),
    body('lineas').isArray({ min: 1 }).withMessage('El pedido debe tener al menos una línea'),
    body('lineas.*.producto').notEmpty().withMessage('Cada línea debe tener un producto'),
    body('lineas.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1'),
    body('lineas.*.precioUnitario').isFloat({ min: 0 }).withMessage('El precio unitario debe ser positivo'),
    validar
];

// ── Empleados ─────────────────────────────────────────────────────────────────
const validarCrearEmpleado = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validar
];

module.exports = {
    validar,
    validarRegistro,
    validarLogin,
    validarProducto,
    validarExtra,
    validarQueryFecha,
    validarCrearPedido,
    validarCrearPedidoTelefonico,
    validarCrearEmpleado
};
