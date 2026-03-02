const express = require('express');
const router = express.Router();
const { validarRegistro, validarLogin } = require('../middleware/validation.middleware');
const { registrarCliente, loginCliente, loginStaff } = require('../controllers/auth.controller');

router.post('/registro', validarRegistro, registrarCliente);
router.post('/login', validarLogin, loginCliente);
router.post('/login-staff', validarLogin, loginStaff);

module.exports = router;
