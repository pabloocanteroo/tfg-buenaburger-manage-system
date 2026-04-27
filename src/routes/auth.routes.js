const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { validarLogin } = require('../middleware/validation.middleware');
const { loginStaff } = require('../controllers/auth.controller');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { ok: false, mensaje: 'Demasiados intentos. Espera 15 minutos antes de reintentar.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login-staff', authLimiter, validarLogin, loginStaff);

module.exports = router;
