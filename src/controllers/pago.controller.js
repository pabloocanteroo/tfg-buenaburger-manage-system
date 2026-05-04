const Stripe = require('stripe');
const Pedido = require('../models/pedido.model');
const socketService = require('../services/socket');
const printerService = require('../services/printer');

const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY no configurada');
    return Stripe(process.env.STRIPE_SECRET_KEY);
};

const notificar = async (pedidoId) => {
    const pedido = await Pedido.findById(pedidoId)
        .populate('bloques', 'horaInicio fecha')
        .populate('lineas.producto', 'nombre precio');
    if (!pedido) return;
    const obj = pedido.toObject();
    socketService.notificarNuevoPedido(obj);
    printerService.imprimirOEncolar(obj);
};

// POST /api/pagos/crear-sesion
exports.crearSesion = async (req, res) => {
    try {
        const stripe = getStripe();
        const { pedidoId } = req.body;
        if (!pedidoId) return res.status(400).json({ ok: false, mensaje: 'pedidoId requerido' });

        const pedido = await Pedido.findById(pedidoId);
        if (!pedido) return res.status(404).json({ ok: false, mensaje: 'Pedido no encontrado' });
        if (pedido.estado !== 'PENDIENTE_PAGO') {
            return res.status(400).json({ ok: false, mensaje: 'Este pedido no está pendiente de pago' });
        }

        const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        const descripcion = pedido.lineas.map(l => `${l.cantidad}× ${l.nombre}`).join(', ');

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Pedido Buena Burger',
                        description: descripcion,
                    },
                    unit_amount: Math.round(pedido.total * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: pedido.emailCliente || undefined,
            success_url: `${appUrl}/?pago=ok&pedido=${encodeURIComponent(pedido.numero)}`,
            cancel_url:  `${appUrl}/?pago=cancelado`,
            metadata: { pedidoId: pedido._id.toString() },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
        });

        pedido.stripeSessionId = session.id;
        await pedido.save();

        res.json({ ok: true, url: session.url });
    } catch (err) {
        console.error('[Stripe] crearSesion:', err.message);
        res.status(500).json({ ok: false, mensaje: 'Error al conectar con el sistema de pago' });
    }
};

// POST /api/pagos/webhook  (body: raw, verificado con firma Stripe)
exports.webhook = async (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('[Stripe] STRIPE_WEBHOOK_SECRET no configurado');
        return res.status(500).send('Webhook secret no configurado');
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('[Stripe] Firma inválida:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const pedidoId = session.metadata?.pedidoId;
        if (pedidoId) {
            try {
                const pedido = await Pedido.findById(pedidoId);
                if (pedido && pedido.estado === 'PENDIENTE_PAGO') {
                    pedido.estado      = 'CONFIRMADO';
                    pedido.stripePagado = true;
                    await pedido.save();
                    await notificar(pedidoId);
                    console.log(`[Stripe] Pedido ${pedido.numero} confirmado por pago online`);
                }
            } catch (err) {
                console.error('[Stripe] Error procesando pago:', err.message);
            }
        }
    }

    res.json({ received: true });
};
