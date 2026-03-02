const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarExtra } = require('../middleware/validation.middleware');
const { getExtras, crearExtra, actualizarExtra, eliminarExtra } = require('../controllers/extra.controller');

router.get('/', getExtras);
router.post('/', protect, authorize('ADMIN'), validarExtra, crearExtra);
router.put('/:id', protect, authorize('ADMIN'), validarExtra, actualizarExtra);
router.delete('/:id', protect, authorize('ADMIN'), eliminarExtra);

module.exports = router;
