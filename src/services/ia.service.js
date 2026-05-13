const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getProximasFechasValidas() {
    const diasValidos = [5, 6, 0]; // viernes, sábado, domingo
    const fechas = [];
    const hoy = new Date();
    for (let i = 0; i <= 21 && fechas.length < 6; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() + i);
        if (diasValidos.includes(d.getDay())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const nombre = d.toLocaleDateString('es-ES', { weekday: 'long' });
            fechas.push(`  - ${nombre} ${dd}/${mm}/${yyyy} → usar fecha "${yyyy}-${mm}-${dd}"`);
        }
    }
    return fechas.join('\n');
}

function buildSystemPrompt(productos, extras, bloquesDisponibles) {
    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const porCategoria = {};
    for (const p of productos) {
        if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
        porCategoria[p.categoria].push(`  - ${p.nombre}: ${p.precio.toFixed(2)}€`);
    }
    const carta = Object.entries(porCategoria)
        .map(([cat, items]) => `${cat}:\n${items.join('\n')}`)
        .join('\n\n');

    const extrasLista = extras.map(e => `  - ${e.nombre}: +${e.precio.toFixed(2)}€`).join('\n');

    const bloquesConHueco = bloquesDisponibles.filter(
        b => (b.capacidadMax - b.hamburgesasOcupadas) > 0
    );

    // Agrupar por fecha para mostrarlos ordenados
    const porFecha = {};
    for (const b of bloquesConHueco) {
        if (!porFecha[b.fecha]) porFecha[b.fecha] = [];
        porFecha[b.fecha].push(b);
    }
    const horarios = Object.keys(porFecha).length
        ? Object.entries(porFecha).map(([fecha, bloques]) => {
            const d = new Date(fecha + 'T12:00:00');
            const nombreDia = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const slots = bloques.map(b => {
                const hueco = b.capacidadMax - b.hamburgesasOcupadas;
                return `    - ${b.horaInicio} (quedan ${hueco} hamburguesa${hueco !== 1 ? 's' : ''})`;
            }).join('\n');
            return `  ${nombreDia} [${fecha}]:\n${slots}`;
        }).join('\n')
        : '  - No hay huecos disponibles próximamente.';

    return `Eres el asistente de pedidos de Buena Burger, una hamburguesería artesanal de Oruña de Piélagos (Cantabria). Atiendes por WhatsApp de forma amable, natural y concisa.

HOY ES: ${fecha}
HORARIO: Viernes, sábado y domingo de 20:30 a 23:00. Solo take away (recogida en local).
PAGO: Siempre en el local al recoger. No se acepta pago online.

=== PRÓXIMAS FECHAS EN QUE ABRIMOS ===
${getProximasFechasValidas()}
IMPORTANTE: Solo se pueden hacer pedidos para las fechas listadas arriba. Si el cliente pide para otro día, discúlpate y ofrece estas fechas. No intentes calcular días de la semana tú mismo.

=== CARTA ===
${carta}

=== EXTRAS DISPONIBLES (se pueden añadir a cualquier producto del pedido) ===
${extrasLista}

=== HORAS DE RECOGIDA DISPONIBLES ===
${horarios}

=== CÓMO DEBES ACTUAR ===
El mensaje de bienvenida ya fue enviado automáticamente por el sistema. NO vuelvas a saludar ni a presentarte. Ve directo a atender lo que pide el cliente.

Guía al cliente en estos pasos, sin saltarte ninguno:
1. Anota el pedido completo (productos, cantidades, extras o modificaciones como "sin cebolla").
2. Pregunta a qué hora quieren recoger (solo horas con hueco libre) y para qué fecha.
3. Pregunta el nombre para el pedido.
4. Confirma el resumen con el total y espera confirmación explícita ("sí", "confirmo", "perfecto"...).
5. Cuando confirmen, responde EXACTAMENTE con este formato de confirmación (sustituye los valores reales):

¡Confirmado! Muchas gracias por contar con nosotros y nos vemos a esa hora 👍🍔
*[día de la semana DD/MM], a las [HH:MM] — [Nombre del cliente]*

Y a continuación añade el bloque %%PEDIDO%%.

REGLAS IMPORTANTES:
- Máximo 3-4 frases por mensaje. Sé conciso.
- Si piden algo que no está en la carta, discúlpate y ofrece alternativas.
- No inventes precios ni productos fuera de la carta.
- Si la hora solicitada no tiene hueco, ofrece las disponibles.
- El campo "fecha" del pedido es siempre de hoy en formato YYYY-MM-DD.
- Responde siempre en español.

=== FORMATO ESPECIAL PARA CONFIRMAR EL PEDIDO ===
Solo cuando el cliente confirme el pedido, añade esto EXACTAMENTE al final de tu mensaje:

%%PEDIDO%%
{
  "nombre": "nombre del cliente",
  "lineas": [
    {
      "nombreProducto": "nombre exacto del producto tal como aparece en la carta",
      "cantidad": 1,
      "ingredientesExcluidos": [],
      "ingredientesAnadidos": [],
      "extras": ["nombre exacto del extra tal como aparece en la lista"]
    }
  ],
  "horaBloque": "HH:MM",
  "fecha": "YYYY-MM-DD"
}
%%FIN_PEDIDO%%`;
}

/**
 * Procesa un turno de conversación con Claude.
 * @param {Array<{rol: string, contenido: string}>} mensajes - Historial de la conversación
 * @param {Array} productos - Productos activos del catálogo
 * @param {Array} extras - Extras activos del catálogo
 * @param {Array} bloquesDisponibles - Bloques de hoy con sus huecos libres
 * @returns {{ texto: string, pedidoJSON: object|null }}
 */
async function procesarMensaje(mensajes, productos, extras, bloquesDisponibles) {
    const systemPrompt = buildSystemPrompt(productos, extras, bloquesDisponibles);

    // Convertir historial al formato de Anthropic.
    // Se añade cache_control al penúltimo mensaje para cachear el historial acumulado.
    const messages = mensajes.map((m, i) => {
        const esUltimo = i === mensajes.length - 1;
        const esPenultimo = i === mensajes.length - 2;

        // Solo cachear si hay suficiente historial y no es el último mensaje
        if (esPenultimo && mensajes.length >= 3) {
            return {
                role: m.rol,
                content: [{
                    type: 'text',
                    text: m.contenido,
                    cache_control: { type: 'ephemeral' }
                }]
            };
        }
        return { role: m.rol, content: m.contenido };
    });

    const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: [
            {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' }
            }
        ],
        messages
    });

    const textoCompleto = response.content.find(b => b.type === 'text')?.text || '';

    // Separar texto conversacional del bloque de pedido
    const match = textoCompleto.match(/%%PEDIDO%%([\s\S]*?)%%FIN_PEDIDO%%/);
    const texto = textoCompleto.replace(/%%PEDIDO%%[\s\S]*?%%FIN_PEDIDO%%/g, '').trim();

    let pedidoJSON = null;
    if (match) {
        try {
            pedidoJSON = JSON.parse(match[1].trim());
        } catch (e) {
            console.error('[IA] JSON de pedido inválido:', e.message);
        }
    }

    // Log de uso de tokens (útil para debugging y TFG)
    const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = response.usage;
    console.log(`[IA] tokens — input: ${input_tokens}, output: ${output_tokens}, cache_write: ${cache_creation_input_tokens || 0}, cache_read: ${cache_read_input_tokens || 0}`);

    return { texto, pedidoJSON };
}

module.exports = { procesarMensaje };
