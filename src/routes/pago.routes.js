const express = require('express');
const router  = express.Router();
const { crearSesion } = require('../controllers/pago.controller');

router.post('/crear-sesion', crearSesion);

module.exports = router;
