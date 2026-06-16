<div align="right"><a href="README.md">← Índice</a></div>

# Parte 5 · Resultados y cierre

## Alcance del trabajo

| Dentro del alcance | Fuera del alcance |
|---|---|
| Web de pedidos con personalización, hora y pago | *Delivery* y servicio en mesa |
| Asistente de WhatsApp con IA (Claude) | Modelo multi-restaurante (SaaS) |
| TPV para pedidos telefónicos y presenciales | Suite de pruebas automatizadas |
| **Bloques de producción** — el núcleo diferencial | Cumplimiento VERI\*FACTU |
| Panel de administración y estadísticas | App móvil nativa e inventario |
| Impresión automática de tickets | |

> **Alcance de despliegue:** el núcleo (TPV + bloques + impresión) ya está **en producción real** en el local; el portal web y el asistente de WhatsApp están desarrollados y validados, **pendientes de publicar** por motivos legales (RGPD y VERI\*FACTU).

## Validación — una parte del sistema ya está en producción

**La propuesta de solución se valida en la práctica:**

- Recepción de pedidos **automatizada** vía web y WhatsApp con IA.
- **Cero errores** de comandas a mano: cada pedido queda registrado y validado por el servidor.
- Los **bloques** controlan la capacidad de cocina en tiempo real.
- El canal **telefónico** se mantiene, pero guiado por el TPV.

**Cómo se validó — dos vías:**

- **Sprint Reviews** con el propietario (*Product Owner*), sobre datos reales, en cada incremento.
- **Despliegue real de `buenaburger-pos-v1`** (núcleo TPV + bloques): **en uso en el local cada noche de servicio**. Es la evidencia más sólida: ha permitido detectar y corregir, bajo carga real, comportamientos no previstos en el análisis.

> La validación en producción es la respuesta a la ausencia de una suite de pruebas automatizadas: el núcleo crítico se ha probado en condiciones reales, no solo en desarrollo.

## Discusión de resultados

- **Bloques de producción (el diferencial)** → formalizan matemáticamente lo que antes era intuición del empleado; generación automática por cron (60 días) → mejor respuesta y menos contención.
- **Frontend sin framework** → cero dependencias y carga inmediata, a cambio de gestionar el estado a mano. Sostenible para el equipo.
- **NoSQL para pedidos personalizables** → simplifica las líneas con personalizaciones variables; coste: agregaciones complejas para estadísticas.
- **Encapsulación de la IA** → toda la lógica en `ia.service.js`; el proveedor se puede sustituir sin tocar la arquitectura.

## Futuras líneas de actuación

- **VERI\*FACTU (prioridad alta)** → obligatorio para software de facturación (RD 1007/2023; plazos a 2027). Requiere numeración inalterable, hash SHA-256 encadenado, imposibilidad de borrado, QR en cada ticket y comunicación con la AEAT.

| Línea | Prioridad |
|---|:--:|
| Adaptación VERI\*FACTU | Alta |
| Notificaciones push / SMS | Media |
| App móvil nativa | Media |
| Fidelización | Baja |
| Integración con inventario | Baja |
| Analítica y predicción de demanda | Baja |

---

<div align="center">

### Ha sido un placer. Muchas gracias al tribunal por su atención.

[← Parte 4](parte4.md) · [Índice](README.md)

</div>
