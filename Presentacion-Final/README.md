<a id="indice"></a>

<div align="center">

# Buena Burger Management System

### Sistema web de gestión integral de pedidos *take away* con bloques de producción y asistente de IA

**Trabajo Fin de Grado en Ingeniería Informática**
Pablo Cantero · Universidad Europea del Atlántico · 2026

</div>

---

<div align="center">

## Índice

| | |
|:--|:--|
| **[Parte 1 — Problema y propuesta](#parte-1)** | **[Parte 2 — Modelo y casos de uso](#parte-2)** |
| **[Parte 3 — Diseño: MVC y arquitectura](#parte-3)** | **[Parte 4 — Interfaces del sistema](#parte-4)** |
| **[Parte 5 — Resultados y cierre](#parte-5)** | |

</div>

---

<a id="parte-1"></a>

# Parte 1 · Problema y propuesta

## El problema

**El negocio:**

- Hamburguesería artesanal *smash* en Oruña de Piélagos (Cantabria).
- Solo *take away*: viernes, sábado y domingo, de 20:30 a 23:00.
- 50–80 pedidos por noche, con un equipo de 4 personas.
- Gestión **manual**: una persona dedicada a teléfono/WhatsApp + comandas a mano.

**Problemas que genera:**

- **Errores en la toma de pedidos** → producto mal preparado, pérdida de materia prima y de cliente.
- **Coste laboral** de una persona dedicada solo a recibir pedidos.
- **Sin trazabilidad** → no hay historial digital ni datos para decidir.
- **Cuellos de botella en producción** → sin control de capacidad por franjas, los picos saturan la cocina y rompen la puntualidad.

## Propuesta de solución

Una aplicación web de **gestión integral de pedidos multicanal** con cinco piezas:

1. **Web de pedidos** anticipados con selección de hora y pago (Stripe o en local).
2. **Asistente de WhatsApp con IA** (Claude) que interpreta lenguaje natural y crea pedidos.
3. **TPV** para pedidos telefónicos y presenciales.
4. **Sistema de bloques de producción** (5 min, 10 hamburguesas/bloque) — el núcleo diferencial.
5. **Panel de administración** con estadísticas, carta, empleados y calendario.

<div align="right"><sub><a href="#indice">↑ Volver al índice</a></sub></div>

---

<a id="parte-2"></a>

# Parte 2 · Modelo y casos de uso

## Modelo del dominio

<div align="center">

<img src="img/modelo_dominio.png" alt="Modelo del dominio" width="520">

</div>

## Diagrama de contexto

<div align="center">

<img src="img/diagrama_contexto.png" alt="Diagrama de contexto">

</div>

## Casos de uso por actor

### ClienteRegistrado

<div align="center">

<img src="img/uc_cliente_registrado.png" alt="Casos de uso — ClienteRegistrado">

</div>

### ClienteInvitado

<div align="center">

<img src="img/uc_cliente_invitado.png" alt="Casos de uso — ClienteInvitado">

</div>

### Empleado

<div align="center">

<img src="img/uc_empleado.png" alt="Casos de uso — Empleado">

</div>

### Administrador

<div align="center">

<img src="img/uc_administrador.png" alt="Casos de uso — Administrador" width="480">

</div>

### Cliente WhatsApp

<div align="center">

<img src="img/uc_cliente_whatsapp.png" alt="Casos de uso — Cliente WhatsApp">

</div>

<div align="right"><sub><a href="#indice">↑ Volver al índice</a></sub></div>

---

<a id="parte-3"></a>

# Parte 3 · Diseño: MVC y arquitectura

## Modelo–Vista–Controlador

<div align="center">

<img src="img/mvc.png" alt="Clases de análisis MVC">

</div>

## Arquitectura

<div align="center">

<img src="img/arquitectura.png" alt="Arquitectura en capas">

</div>

<div align="right"><sub><a href="#indice">↑ Volver al índice</a></sub></div>

---

<a id="parte-4"></a>

# Parte 4 · Interfaces del sistema

### Prototipos de interfaz — los tres perfiles de usuario

<div align="center">

<img src="img/prototipos_3_perfiles.png" alt="Prototipos de interfaz de los tres perfiles">

</div>

<div align="right"><sub><a href="#indice">↑ Volver al índice</a></sub></div>

---

<a id="parte-5"></a>

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

<div align="right"><sub><a href="#indice">↑ Volver al índice</a></sub></div>

---

<div align="center">

### Ha sido un placer. Muchas gracias al tribunal por su atención.

</div>
