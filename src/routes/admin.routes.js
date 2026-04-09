const express = require('express');
const router  = express.Router();
const { protect, authorize }       = require('../middleware/auth.middleware');
const { validarCrearEmpleado }     = require('../middleware/validation.middleware');
const adminController              = require('../controllers/admin.controller');
const printer                      = require('../services/printer');
const Pedido                       = require('../models/pedido.model');
const { PRINTER_DEFAULT_PORT }     = require('../utils/constants');

router.use(protect, authorize('ADMIN'));

// ── Estadísticas ──────────────────────────────────────────────────────────────
router.get('/estadisticas', adminController.getEstadisticas);

// ── Impresora WiFi ────────────────────────────────────────────────────────────

router.get('/impresora', (req, res) => {
    res.json({ ok: true, config: printer.getConfig(), cola: printer.getCola().length });
});

router.post('/impresora', (req, res) => {
    const { ip, puerto } = req.body;
    if (!ip) return res.status(400).json({ ok: false, mensaje: 'Falta la IP de la impresora' });
    printer.configurar(ip, puerto || PRINTER_DEFAULT_PORT);
    res.json({ ok: true, config: printer.getConfig() });
});

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

router.get('/cola-impresion', (req, res) => {
    res.json({ ok: true, cantidad: printer.getCola().length });
});

router.post('/cola-impresion/imprimir', async (req, res) => {
    if (printer.getCola().length === 0) return res.json({ ok: true, impresos: 0, fallidos: 0 });
    try {
        const resultado = await printer.imprimirCola();
        res.json({ ok: true, ...resultado });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
});

// ── Empleados ─────────────────────────────────────────────────────────────────
router.get('/empleados',      adminController.getEmpleados);
router.post('/empleados',     validarCrearEmpleado, adminController.crearEmpleado);
router.delete('/empleados/:id', adminController.eliminarEmpleado);

// ── Productos y extras (gestión completa solo para admin) ─────────────────────
router.get('/productos',       adminController.getProductosAll);
router.delete('/productos/:id', adminController.eliminarProductoFisico);

router.get('/extras',          adminController.getExtrasAll);
router.delete('/extras/:id',   adminController.eliminarExtraFisico);

module.exports = router;
