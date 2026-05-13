# Buena Burger POS v1 — Guía de despliegue (local, mini PC)

Primera entrega al cliente: solo **POS, panel admin y panel empleados**. Sin parte pública (web de pedidos). Funciona 100% en red local del local — sin Render, sin dominio, sin abrir puertos en el router.

## 1. Hardware

| Elemento | Modelo sugerido | Precio aprox. |
|---|---|---|
| Mini PC (servidor) | Beelink / genérico N100, 8GB RAM, 256GB SSD | 150€ |
| Tablet (cliente POS) | Android 10", cualquier marca | 120€ |
| Impresora WiFi ESC/POS | Epson TM-m30III o equivalente (TCP puerto 9100) | 180€ |
| SAI pequeño | Salicru SPS 650 o similar | 50€ |
| Router/switch | El que ya tenga el local | — |

## 2. Preparar la red local

1. Entra al router y **reserva IPs fijas por MAC**:
   - Mini PC → `192.168.1.50`
   - Impresora → `192.168.1.51`
2. Comprueba conectividad entre ambos (ping desde mini PC a impresora).

## 3. Instalar el servidor (mini PC, Ubuntu Server 22.04)

```bash
# Actualizar
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Copiar proyecto (desde USB o git)
sudo adduser --system --group buenaburger
sudo mkdir -p /opt/buenaburger
sudo chown buenaburger:buenaburger /opt/buenaburger
# (copiar el contenido de esta carpeta a /opt/buenaburger)
cd /opt/buenaburger
sudo -u buenaburger npm install
```

## 4. Variables de entorno (`.env`)

Copia `.env.example` a `.env` y ajusta:

```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/buenaburger
PORT=3000
NODE_ENV=production

# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64 bytes hex aleatorios>
JWT_EXPIRES_IN=7d

# LAN: vacío acepta todo. Para endurecer: http://192.168.1.50:3000
ALLOWED_ORIGINS=

# Impresora WiFi local
PRINTER_IP=192.168.1.51
PRINTER_PORT=9100

# Usuario admin que se crea al hacer seed
SEED_ADMIN_EMAIL=admin@buenaburger.es
SEED_ADMIN_PASSWORD=<password fuerte>
```

## 5. Poblar base de datos (solo primera vez)

```bash
cd /opt/buenaburger
sudo -u buenaburger node src/seed.js --force
```

Crea carta inicial + usuario admin. Después, el cliente puede editar todo desde el panel admin.

## 6. Servicio systemd (arranque automático)

`/etc/systemd/system/buenaburger.service`:

```ini
[Unit]
Description=Buena Burger POS
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=buenaburger
WorkingDirectory=/opt/buenaburger
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/buenaburger/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable buenaburger
sudo systemctl start buenaburger
sudo systemctl status buenaburger     # verificar
sudo journalctl -u buenaburger -f     # ver logs
```

## 7. Configurar la tablet

1. Conectar a la misma WiFi que el mini PC.
2. Abrir Chrome en: `http://192.168.1.50:3000/admin.html` o `http://192.168.1.50:3000/pos.html`.
3. Login con las credenciales SEED_ADMIN.
4. Menú Chrome → "Añadir a pantalla de inicio" → queda como app.
5. Opcional: modo kiosk (Fully Kiosk Browser) para que no se pueda salir.

## 8. Rutas disponibles

| URL | Para quién |
|---|---|
| `http://192.168.1.50:3000/admin.html` | Admin (estadísticas, carta, empleados, calendario) |
| `http://192.168.1.50:3000/pos.html`   | POS: crear pedidos rápidos |
| `http://192.168.1.50:3000/empleados.html` | Cocina: ver pedidos por bloque, marcar listo |

La ruta raíz (`/`) redirige automáticamente a `admin.html`.

## 9. Acceso remoto del desarrollador (opcional)

Para actualizar/depurar sin ir al local: instalar [Tailscale](https://tailscale.com) gratis en el mini PC. Te da SSH directo sobre VPN sin abrir puertos.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

## 10. Backups MongoDB Atlas

Si se usa Atlas: el plan M0 gratis tiene backups automáticos semanales. Para extra seguridad, cron diario en el mini PC:

```bash
sudo -u buenaburger crontab -e
```

```cron
0 4 * * * mongodump --uri="$MONGODB_URI" --archive=/opt/buenaburger/backups/bb-$(date +\%Y\%m\%d).gz --gzip
```

## 11. Checklist de puesta en marcha

- [ ] Mini PC con Ubuntu y Node 20 instalados
- [ ] IPs fijas asignadas en router
- [ ] `.env` configurado con JWT_SECRET nuevo y MONGODB_URI válido
- [ ] `npm install` ejecutado sin errores
- [ ] `node src/seed.js --force` ejecutado (primera vez)
- [ ] Servicio systemd activo y reiniciándose solo
- [ ] Impresora imprime ticket de prueba desde el panel admin
- [ ] Tablet accede a `/admin.html` y hace login
- [ ] Prueba end-to-end: crear pedido desde POS → imprime ticket cocina + cliente
- [ ] SAI conectado (protección cortes de luz)
- [ ] Tailscale instalado para acceso remoto
