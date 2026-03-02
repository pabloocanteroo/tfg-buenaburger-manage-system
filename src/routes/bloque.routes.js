const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarGenerarBloques, validarQueryFecha } = require('../middleware/validation.middleware');
const { getBloques, generarBloques, cerrarBloque, cerrarDia } = require('../controllers/bloque.controller');

router.get('/', validarQueryFecha, getBloques);
router.post('/generar', protect, authorize('ADMIN'), validarGenerarBloques, generarBloques);
router.patch('/:id/cerrar', protect, authorize('ADMIN'), cerrarBloque);
router.post('/cerrar-dia', protect, authorize('ADMIN'), cerrarDia);

module.exports = router;
