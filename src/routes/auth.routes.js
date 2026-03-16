const express = require('express');
const router = express.Router();
const { validarRegistro, validarLogin } = require('../middleware/validation.middleware');
const { registrarCliente, loginCliente, loginStaff, getPerfilCliente, actualizarPerfilCliente } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/registro', validarRegistro, registrarCliente);
router.post('/login', validarLogin, loginCliente);
router.post('/login-staff', validarLogin, loginStaff);

router.get('/me', protect, authorize('CLIENTE'), getPerfilCliente);
router.put('/perfil', protect, authorize('CLIENTE'), actualizarPerfilCliente);

module.exports = router;
