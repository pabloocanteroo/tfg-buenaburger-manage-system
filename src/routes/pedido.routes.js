const express = require('express');
const router = express.Router();
const { protect, protectOptional, authorize } = require('../middleware/auth.middleware');
const { validarCrearPedido, validarCrearPedidoTelefonico } = require('../middleware/validation.middleware');
const { crearPedido, misPedidos, modificarPedido, cancelarPedido, rehacerPedido, crearPedidoTelefonico, getTodosPedidos, getPedidoPorId } = require('../controllers/pedido.controller');

router.post('/telefonico', protect, authorize('ADMIN', 'EMPLEADO'), validarCrearPedidoTelefonico, crearPedidoTelefonico);
router.get('/todos', protect, authorize('ADMIN', 'EMPLEADO'), getTodosPedidos);
router.get('/mis-pedidos', protect, authorize('CLIENTE'), misPedidos);

// POST público: los clientes registrados pueden mandar su JWT y el pedido se
// asocia a su id (ignorando cualquier `clienteId` del body). Sin token, se
// crea un ClienteInvitado como hasta ahora.
router.post('/', protectOptional, validarCrearPedido, crearPedido);
router.get('/:id', protect, authorize('ADMIN', 'EMPLEADO'), getPedidoPorId);
router.put('/:id', protect, authorize('CLIENTE', 'ADMIN', 'EMPLEADO'), modificarPedido);
router.delete('/:id', protect, cancelarPedido);
router.post('/:id/rehacer', protect, authorize('CLIENTE'), rehacerPedido);

module.exports = router;
