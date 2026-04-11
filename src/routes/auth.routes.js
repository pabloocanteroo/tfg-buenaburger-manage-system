const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { validarRegistro, validarLogin } = require('../middleware/validation.middleware');
const { registrarCliente, loginCliente, loginStaff, getPerfilCliente, actualizarPerfilCliente } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// ── Rate limiter para endpoints sensibles de auth ────────────────────────────
// Limita a 10 intentos cada 15 min por IP. Aplica a login, login-staff y registro
// para cortar fuerza bruta y creación masiva de cuentas.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { ok: false, mensaje: 'Demasiados intentos. Espera 15 minutos antes de reintentar.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/registro',    authLimiter, validarRegistro, registrarCliente);
router.post('/login',       authLimiter, validarLogin,    loginCliente);
router.post('/login-staff', authLimiter, validarLogin,    loginStaff);

router.get('/me', protect, authorize('CLIENTE'), getPerfilCliente);
router.put('/perfil', protect, authorize('CLIENTE'), actualizarPerfilCliente);

module.exports = router;
