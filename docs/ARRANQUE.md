# Arranque del sistema Buena Burger

## Cada vez que quieras arrancar el bot de WhatsApp

### Terminal 1 — ngrok (túnel público)
```
cd C:\ngrok
ngrok http 3000 --domain=rebalance-shorter-islamist.ngrok-free.dev
```

### Terminal 2 — servidor Node
```
cd C:\Users\PabloCantero\Desktop\TFG\tfg-buenaburger-manage-system
node src/index.js
```

---

## Requisitos previos (solo la primera vez)
- MongoDB Atlas conectado (ya configurado en .env)
- ngrok autenticado (`ngrok config add-authtoken <tu-token>`)
- Webhook de Meta apuntando a:
  `https://rebalance-shorter-islamist.ngrok-free.dev/api/whatsapp/webhook`
- Verify token Meta: `buenaburger_whatsapp_2026`

---

## Variables de entorno clave (.env)
- `WHATSAPP_TOKEN` — token de acceso de Meta (caduca, regenerar si el bot deja de enviar mensajes)
- `ANTHROPIC_API_KEY` — clave de Claude (IA del bot)
- `WHATSAPP_PHONE_NUMBER_ID` — 1105445229325202
