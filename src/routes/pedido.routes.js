const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarCrearPedidoTelefonico } = require('../middleware/validation.middleware');
const { modificarPedido, cancelarPedido, crearPedidoTelefonico, getTodosPedidos, getPedidoPorId } = require('../controllers/pedido.controller');

router.post('/telefonico', protect, authorize('ADMIN', 'EMPLEADO'), validarCrearPedidoTelefonico, crearPedidoTelefonico);
router.get('/todos', protect, authorize('ADMIN', 'EMPLEADO'), getTodosPedidos);
router.get('/:id', protect, authorize('ADMIN', 'EMPLEADO'), getPedidoPorId);
router.put('/:id', protect, authorize('ADMIN', 'EMPLEADO'), modificarPedido);
router.delete('/:id', protect, authorize('ADMIN', 'EMPLEADO'), cancelarPedido);

module.exports = router;
