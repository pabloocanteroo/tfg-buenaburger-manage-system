const ConversacionWhatsapp = require('../models/conversacionWhatsapp.model');
const Producto             = require('../models/producto.model');
const Extra                = require('../models/extra.model');
const BloqueProduccion     = require('../models/bloqueProduccion.model');
const { ClienteInvitado }  = require('../models/cliente.model');
const Pedido               = require('../models/pedido.model');
const { procesarMensaje }  = require('../services/ia.service');
const { enviarMensaje }    = require('../services/whatsapp.service');
const socketService        = require('../services/socket');
const printerService       = require('../services/printer');
const { fechaToString }    = require('../utils/helpers');

// ── Verificación del webhook (GET) ────────────────────────────────────────────
exports.verificarWebhook = (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('[WhatsApp] Webhook verificado por Meta');
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
};

// ── Recepción de mensajes (POST) ──────────────────────────────────────────────
exports.recibirMensaje = async (req, res) => {
    // Meta espera siempre un 200 rápido para evitar reintentos
    res.sendStatus(200);

    try {
        const entry   = req.body?.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        const mensaje = changes?.messages?.[0];

        if (!mensaje || mensaje.type !== 'text') return;

        const telefono = mensaje.from;               // ej: "34612345678"
        const texto    = mensaje.text?.body?.trim();

        if (!texto) return;

        console.log(`[WhatsApp] Mensaje de ${telefono}: "${texto}"`);

        await procesarConversacion(telefono, texto);

    } catch (err) {
        console.error('[WhatsApp] Error procesando mensaje:', err);
    }
};

// ── Lógica principal de conversación ─────────────────────────────────────────
async function procesarConversacion(telefono, textoUsuario) {
    // Buscar o crear conversación
    let conv = await ConversacionWhatsapp.findOne({ telefono });

    if (!conv) {
        conv = new ConversacionWhatsapp({ telefono, mensajes: [], estado: 'ACTIVA' });
    } else {
        const hoy = new Date().toDateString();
        const ultimoDia = new Date(conv.ultimaActividad).toDateString();
        if (conv.necesitaReset() || hoy !== ultimoDia) {
            conv.mensajes    = [];
            conv.estado      = 'ACTIVA';
            conv.pedidoId    = null;
        }
    }

    const esNueva = conv.mensajes.length === 0;

    conv.mensajes.push({ rol: 'user', contenido: textoUsuario });
    conv.ultimaActividad = new Date();

    // Bienvenida automática en la primera interacción de un día de apertura
    if (esNueva) {
        const bienvenida =
            '¡Hola! Gracias por contactar con nosotros 😁\n\n' +
            '🤖 Estás siendo atendido por la IA de Buena Burger.\n\n' +
            'Para realizar un pedido indique:\n\n' +
            '1) Hora 🕐\n' +
            '2) Nombre 👤\n' +
            '3) Pedido 🍔\n\n' +
            'Nosotros confirmaremos a la hora indicada o en su defecto, a la más cercana disponible ⌛\n\n' +
            'Y ya está, estás a punto de disfrutar de una Buena Burger 🍔\n\n' +
            'Muchas gracias por contar con nosotros ☺️\n\n' +
            '⚠️Recomendamos no estacionar fuera del punto de recogida para evitar aglomeraciones que comprometan la seguridad vial. Disponen de un parking público a menos de 10m\n\n' +
            'HORARIO SS V-D';
        conv.mensajes.push({ rol: 'assistant', contenido: bienvenida });
        await conv.save();
        await enviarMensaje(telefono, bienvenida);
        return;
    }

    // Fechas de apertura próximas (viernes, sábado, domingo) en los siguientes 14 días
    const fechasProximas = [];
    const hoyDate = new Date();
    for (let i = 0; i <= 14; i++) {
        const d = new Date(hoyDate);
        d.setDate(hoyDate.getDate() + i);
        if ([0, 5, 6].includes(d.getDay())) {
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const dd   = String(d.getDate()).padStart(2, '0');
            fechasProximas.push(`${yyyy}-${mm}-${dd}`);
        }
    }

    // Cargar catálogo y bloques disponibles en fechas de apertura próximas
    const [productos, extras, bloquesHoy] = await Promise.all([
        Producto.find({ activo: true }).lean(),
        Extra.find({ activo: true }).lean(),
        BloqueProduccion.find({
            fecha: { $in: fechasProximas },
            cerrado: false
        }).sort({ fecha: 1, horaInicio: 1 }).lean()
    ]);

    // Llamar a la IA
    const { texto: respuestaTexto, pedidoJSON } = await procesarMensaje(
        conv.mensajes,
        productos,
        extras,
        bloquesHoy
    );

    // Si la IA devolvió un pedido estructurado, crearlo en la BD
    let mensajeAEnviar = respuestaTexto;

    if (pedidoJSON) {
        try {
            const pedidoCreado = await crearPedidoDesdeIA(pedidoJSON, telefono, productos, extras, bloquesHoy);
            conv.pedidoId = pedidoCreado._id;
            conv.estado   = 'COMPLETADA';
            console.log(`[WhatsApp] Pedido creado: ${pedidoCreado.numero}`);
        } catch (err) {
            console.error('[WhatsApp] Error creando pedido desde IA:', err.message, err.stack);

            // Si el bloque estaba lleno, avisar al cliente con las horas alternativas
            if (err.message.includes('No hay hueco suficiente')) {
                const alternativas = bloquesHoy
                    .filter(b => (b.capacidadMax - b.hamburgesasOcupadas) > 0)
                    .map(b => {
                        const d = new Date(b.fecha + 'T12:00:00');
                        const dia = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                        return `  - ${dia} a las ${b.horaInicio}`;
                    })
                    .join('\n');
                mensajeAEnviar = alternativas
                    ? `Lo sentimos, ese bloque ya se ha completado justo antes de confirmar tu pedido. Horas disponibles:\n\n${alternativas}\n\n¿Te viene bien alguna de estas?`
                    : 'Lo sentimos, ese bloque ya se ha completado y no quedan más huecos disponibles.';
            } else {
                mensajeAEnviar = 'Ha ocurrido un error al procesar tu pedido. Por favor, inténtalo de nuevo o llámanos directamente.';
            }
        }
    }

    // Guardar respuesta en el historial
    conv.mensajes.push({ rol: 'assistant', contenido: mensajeAEnviar });
    await conv.save();

    // Enviar respuesta al cliente por WhatsApp
    await enviarMensaje(telefono, mensajeAEnviar);
}

// ── Crear pedido a partir del JSON generado por la IA ─────────────────────────
async function crearPedidoDesdeIA(pedidoJSON, telefono, productos, extras, bloquesHoy) {
    const { nombre, lineas, horaBloque, fecha } = pedidoJSON;

    // Encontrar el bloque que corresponde a la hora solicitada
    const bloque = bloquesHoy.find(b => b.horaInicio === horaBloque && b.fecha === fecha);
    if (!bloque) throw new Error(`Bloque no encontrado para ${horaBloque} del ${fecha}`);

    // Resolver nombres de producto a IDs y precios reales del servidor
    const lineasValidadas = lineas.map((l, i) => {
        const prod = productos.find(p =>
            p.nombre.toLowerCase() === l.nombreProducto.toLowerCase()
        );
        if (!prod) throw new Error(`Producto no encontrado: "${l.nombreProducto}"`);

        const extrasValidados = (l.extras || []).map(nombreExtra => {
            const extra = extras.find(e =>
                e.nombre.toLowerCase() === nombreExtra.toLowerCase()
            );
            if (!extra) throw new Error(`Extra no encontrado: "${nombreExtra}"`);
            return { extra: extra._id, nombre: extra.nombre, precio: extra.precio, cantidad: 1 };
        });

        return {
            producto:              prod._id,
            nombre:                prod.nombre,
            precio:                prod.precio,
            precioUnitario:        prod.precio,
            cantidad:              l.cantidad || 1,
            ingredientesExcluidos: l.ingredientesExcluidos || [],
            ingredientesAnadidos:  l.ingredientesAnadidos  || [],
            extras:                extrasValidados,
        };
    });

    // Calcular total
    const total = lineasValidadas.reduce((sum, l) => {
        const extrasTotal = l.extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
        return sum + l.precioUnitario * l.cantidad + extrasTotal;
    }, 0);

    // Contar hamburguesas para reservar bloque
    const numHamburguesas = lineasValidadas.reduce((n, l) => {
        const prod = productos.find(p => p._id.toString() === l.producto.toString());
        return prod?.categoria === 'HAMBURGUESA' ? n + l.cantidad : n;
    }, 0);

    // Incrementar huecos del bloque (simplificado: sin lógica de bloques múltiples)
    if (numHamburguesas > 0) {
        const espacioLibre = bloque.capacidadMax - bloque.hamburgesasOcupadas;
        if (espacioLibre < numHamburguesas) {
            throw new Error(`No hay hueco suficiente en el bloque de las ${horaBloque}`);
        }
        await BloqueProduccion.findByIdAndUpdate(bloque._id, {
            $inc: { hamburgesasOcupadas: numHamburguesas }
        });
    }

    // Crear cliente invitado con el teléfono real de WhatsApp
    // El email es obligatorio en el schema base; usamos un placeholder derivado del teléfono
    const cliente = await ClienteInvitado.create({ nombre, telefono, email: `${telefono}@whatsapp.local` });

    const horaRecogida = new Date(`${fecha}T${horaBloque}:00`);

    const pedido = await Pedido.create({
        cliente:          cliente._id,
        nombreCliente:    nombre,
        telefonoCliente:  telefono,
        canal:            'WHATSAPP',
        metodoPago:       'PAGO_EN_LOCAL',
        bloques:          [bloque._id],
        cantidadPorBloque: [numHamburguesas],
        lineas:           lineasValidadas,
        total:            +total.toFixed(2),
        estado:           'CONFIRMADO',
        horaRecogida,
    });

    // Notificar cocina e imprimir ticket (igual que los pedidos web)
    const pedidoPopulado = await Pedido.findById(pedido._id)
        .populate('bloques', 'horaInicio fecha')
        .populate('lineas.producto', 'nombre precio');
    const pedidoObj = pedidoPopulado.toObject();
    socketService.notificarNuevoPedido(pedidoObj);
    printerService.imprimirOEncolar(pedidoObj);

    return pedido;
}
