const https = require('https');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

/**
 * Envía un mensaje de texto a un número de WhatsApp via Meta Cloud API.
 * @param {string} destinatario - Número en formato internacional sin '+' (ej: 34612345678)
 * @param {string} texto - Texto del mensaje
 */
async function enviarMensaje(destinatario, texto) {
    if (!TOKEN || !PHONE_NUMBER_ID) {
        console.warn('[WhatsApp] WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados');
        return;
    }

    const body = JSON.stringify({
        messaging_product: 'whatsapp',
        to: destinatario,
        type: 'text',
        text: { body: texto }
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'graph.facebook.com',
            path: `/v21.0/${PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    console.error('[WhatsApp] Error enviando mensaje:', data);
                    reject(new Error(`Meta API ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

module.exports = { enviarMensaje };
