const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarCrearPedido, validarCrearPedidoTelefonico } = require('../middleware/validation.middleware');
const { crearPedido, misPedidos, modificarPedido, cancelarPedido, rehacerPedido, crearPedidoTelefonico } = require('../controllers/pedido.controller');

router.post('/', validarCrearPedido, crearPedido);
router.get('/mis-pedidos', protect, authorize('CLIENTE'), misPedidos);
router.put('/:id', protect, authorize('CLIENTE'), modificarPedido);
router.delete('/:id', protect, cancelarPedido);
router.post('/:id/rehacer', protect, authorize('CLIENTE'), rehacerPedido);
router.post('/telefonico', protect, authorize('ADMIN', 'EMPLEADO'), validarCrearPedidoTelefonico, crearPedidoTelefonico);

module.exports = router;
