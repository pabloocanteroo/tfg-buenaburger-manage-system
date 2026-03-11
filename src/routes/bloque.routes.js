const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarQueryFecha } = require('../middleware/validation.middleware');
const { getBloques, getDiasOperativos, cerrarBloque, cerrarDia, abrirDia } = require('../controllers/bloque.controller');

// Consulta pública: bloques de un día concreto (para el selector de hora del cliente/empleado)
router.get('/', validarQueryFecha, getBloques);

// Resumen de días operativos para el calendario del admin
router.get('/dias-operativos', protect, authorize('ADMIN'), getDiasOperativos);

// Acciones del admin sobre días y bloques individuales
router.patch('/:id/cerrar', protect, authorize('ADMIN'), cerrarBloque);
router.post('/cerrar-dia', protect, authorize('ADMIN'), cerrarDia);
router.post('/abrir-dia', protect, authorize('ADMIN'), abrirDia);

module.exports = router;
