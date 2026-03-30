const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validarCrearEmpleado } = require('../middleware/validation.middleware');
const { getEstadisticas, getEmpleados, crearEmpleado, eliminarEmpleado } = require('../controllers/admin.controller');

router.use(protect, authorize('ADMIN'));

router.get('/estadisticas', getEstadisticas);

// ── Impresora WiFi ────────────────────────────────────────────────
const printer = require('../services/printer');
const Pedido  = require('../models/pedido.model');

// GET /api/admin/impresora — config actual + estado de la cola
router.get('/impresora', (req, res) => {
    res.json({ ok: true, config: printer.getConfig(), cola: printer.getCola().length });
});

// POST /api/admin/impresora — guardar IP/puerto
router.post('/impresora', (req, res) => {
    const { ip, puerto } = req.body;
    if (!ip) return res.status(400).json({ ok: false, mensaje: 'Falta la IP de la impresora' });
    printer.configurar(ip, puerto || 9100);
    res.json({ ok: true, config: printer.getConfig() });
});

// POST /api/admin/imprimir — imprimir un pedido concreto
router.post('/imprimir', async (req, res) => {
    const { pedidoId, tipo } = req.body;   // tipo: 'ambos' | 'cliente' | 'cocina'
    if (!pedidoId) return res.status(400).json({ ok: false, mensaje: 'Falta pedidoId' });
    try {
        const pedido = await Pedido.findById(pedidoId)
            .populate('bloques', 'horaInicio fecha')
            .populate('lineas.producto', 'nombre precio')
            .lean();
        if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });

        if (!tipo || tipo === 'ambos') {
            await printer.imprimirPedido(pedido);
        } else {
            await printer.imprimirTicket(pedido, tipo);
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
});

// POST /api/admin/cola-impresion/imprimir — imprimir todos los pedidos encolados
router.post('/cola-impresion/imprimir', async (req, res) => {
    if (printer.getCola().length === 0) return res.json({ ok: true, impresos: 0, fallidos: 0 });
    try {
        const resultado = await printer.imprimirCola();
        res.json({ ok: true, ...resultado });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
});

// GET /api/admin/cola-impresion — cuántos pedidos hay en cola
router.get('/cola-impresion', (req, res) => {
    res.json({ ok: true, cantidad: printer.getCola().length });
});

// ── Empleados ────────────────────────────────────────────────────
router.get('/empleados', getEmpleados);
router.post('/empleados', validarCrearEmpleado, crearEmpleado);
router.delete('/empleados/:id', eliminarEmpleado);

router.get('/productos', require('../controllers/admin.controller').getProductosAll);
router.delete('/productos/:id', require('../controllers/admin.controller').eliminarProductoFisico);

router.get('/extras', require('../controllers/admin.controller').getExtrasAll);
router.delete('/extras/:id', require('../controllers/admin.controller').eliminarExtraFisico);

module.exports = router;
