const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarProducto } = require('../middleware/validation.middleware');
const { getProductos, getProducto, crearProducto, actualizarProducto, eliminarProducto } = require('../controllers/producto.controller');

router.get('/', getProductos);
router.get('/:id', getProducto);
router.post('/', protect, authorize('ADMIN'), validarProducto, crearProducto);
router.put('/:id', protect, authorize('ADMIN'), validarProducto, actualizarProducto);
router.delete('/:id', protect, authorize('ADMIN'), eliminarProducto);

module.exports = router;
