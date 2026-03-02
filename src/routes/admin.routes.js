const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarCrearEmpleado } = require('../middleware/validation.middleware');
const { getEstadisticas, getEmpleados, crearEmpleado, eliminarEmpleado } = require('../controllers/admin.controller');

router.use(protect, authorize('ADMIN'));

router.get('/estadisticas', getEstadisticas);
router.get('/empleados', getEmpleados);
router.post('/empleados', validarCrearEmpleado, crearEmpleado);
router.delete('/empleados/:id', eliminarEmpleado);

module.exports = router;
