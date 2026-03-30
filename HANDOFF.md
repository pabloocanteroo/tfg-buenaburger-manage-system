# Buena Burger — Estado del proyecto y tareas pendientes

## Qué es esto
Sistema de gestión para una hamburguesería take away real (Buena Burger, Oruña de Piélagos).
Arranca en producción la semana que viene.
Stack: Node.js + Express + MongoDB Atlas + Socket.io + frontend vanilla JS/HTML/CSS.

---

## Estructura del proyecto

```
src/
  controllers/   → admin, auth, bloque, extra, pedido, producto
  routes/        → rutas REST por entidad
  services/
    socket.js    → singleton Socket.io (solo notificaciones, NO impresión)
    printer.js   → impresión WiFi ESC/POS vía TCP (puerto 9100)
    bloqueScheduler.js
  models/        → Pedido, Producto, Extra, BloqueProduccion, Cliente, Usuario
  index.js       → entrada, Express + Socket.io
public/
  admin.html     → panel administrador
  pos.html       → TPV empleados
  empleados.html
  cliente.html   → pedidos online clientes
  index.html     → login
  js/
    print.js     → lógica impresión frontend (fetch al backend, alerta sonora, modal IP)
    admin.js
    pos.js
  css/
```

---

## Decisiones de arquitectura tomadas

### Impresión de tickets
- Impresora: térmica 80mm ESC/POS con conexión LAN (TCP puerto 9100)
- El servidor Node.js se conecta directamente a la impresora por TCP y envía bytes ESC/POS
- El navegador (iPad Safari) solo hace fetch() — funciona en cualquier browser
- Si la impresora está offline, los pedidos se encolan en memoria (`printer.getCola()`)
- Desde admin → "🖨 Impresora" se configura la IP y se puede imprimir la cola manualmente
- Al llegar un pedido confirmado: servidor imprime automáticamente + emite socket `nuevo-pedido` para alerta sonora en iPad

### Endpoints de impresión
- `GET  /api/admin/impresora`              → config actual (IP/puerto) + tamaño cola
- `POST /api/admin/impresora`              → guardar IP/puerto `{ ip, puerto }`
- `POST /api/admin/imprimir`               → imprimir pedido `{ pedidoId, tipo: 'ambos'|'cliente'|'cocina' }`
- `POST /api/admin/cola-impresion/imprimir`→ imprimir todos los pedidos encolados
- `GET  /api/admin/cola-impresion`         → cuántos pedidos hay en cola

### Socket.io
- Solo se usa para notificaciones: evento `nuevo-pedido` → alerta sonora en iPad
- La cola de impresión ya NO va por socket (va por printer.js en el servidor)

---

## Despliegue previsto

### Servidor → Render (plan gratuito)
- El plan gratuito se duerme tras 15 min sin actividad
- Solución: el agente local (Raspberry Pi) manda un ping keepalive cada 10 min
- Variables de entorno necesarias en Render:
  - `MONGODB_URI` (ya en .env)
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `PRINTER_IP` → dejar vacío en Render (la impresión la hace el agente local)
  - `PRINTER_PORT=9100`

### Red del local
- Hay un router con internet pero está lejos y la señal no llega bien
- Solución acordada: comprar un repetidor WiFi (~20-30€, TP-Link o Tenda doble banda)
- Con el repetidor: tablet (iPad), impresora y Raspberry Pi todos en el mismo WiFi

### Agente de impresión local → Raspberry Pi Zero 2W (~18€)
- **Pendiente de implementar**
- La Pi se conecta al WiFi del local
- Conecta a Render por Socket.io
- Escucha el evento `nuevo-pedido`, llama a la API de Render para obtener el pedido, y lo imprime por TCP a la impresora local
- También hace keepalive a Render cada 10 min para evitar que se duerma
- Arranca automáticamente al encender (systemd service)

---

## Tareas pendientes

### Prioritario (antes de arrancar)
- [ ] Subir el proyecto a Render y configurar variables de entorno
- [ ] Probar que todo funciona en producción (pedidos, auth, bloques, carta)
- [ ] Comprar repetidor WiFi para el local
- [ ] Comprar Raspberry Pi Zero 2W

### Agente de impresión (cuando llegue la Pi)
- [ ] Crear script `agente-impresion/index.js` que:
  - Conecte a Render por Socket.io
  - Escuche `nuevo-pedido`
  - Obtenga el pedido de la API y lo imande a la impresora por TCP
  - Haga keepalive cada 10 min a Render
- [ ] Configurar como servicio systemd en la Pi (arranque automático)
- [ ] Flashear Pi con Raspberry Pi Imager configurando el WiFi del local

### Ya implementado y funcionando
- [x] Sistema completo de pedidos (web + TPV + telefónico)
- [x] Panel admin (calendario, pedidos, empleados, carta, estadísticas)
- [x] Impresión WiFi ESC/POS desde el servidor (printer.js)
- [x] Cola de pedidos pendientes cuando impresora offline
- [x] Reimprimir tickets desde admin (cliente/cocina)
- [x] Modificar/cancelar pedidos desde admin
- [x] Alerta sonora en iPad al llegar pedido nuevo (Socket.io)
- [x] Autobloques vie/sáb/dom
- [x] Gestión de extras
- [x] Pedidos de clientes registrados e invitados

---

## Variables de entorno (.env)
```
MONGODB_URI=mongodb+srv://...
PORT=3000
JWT_SECRET=buenaburger_secret_cambiame_en_produccion
JWT_EXPIRES_IN=7d
PRINTER_IP=        ← IP de la impresora en red local (vacío en Render, lo usa la Pi)
PRINTER_PORT=9100
```
