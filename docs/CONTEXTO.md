# Contexto de la Aplicación — Buena Burger Management System

## ¿Qué es esta aplicación?

**Buena Burger Management System** es una aplicación web de gestión integral de pedidos desarrollada como Trabajo de Fin de Grado (TFG). Está diseñada específicamente para **Buena Burger**, una hamburguesería artesanal de estilo americano ubicada en **Oruña de Piélagos, Cantabria**, que opera únicamente como servicio take away los viernes, sábados y domingos de 20:30 a 23:00 h.

El negocio atiende entre **50 y 80 pedidos por noche** y hasta ahora los gestionaba manualmente (por teléfono y WhatsApp), con comandas escritas a mano. El objetivo del sistema es digitalizar y automatizar todo ese proceso.

---

## Problema que resuelve

El modelo manual actual genera:

- **Errores en los pedidos** por mala interpretación o escritura incorrecta.
- **Coste laboral innecesario** al requerir una persona dedicada exclusivamente a recibir pedidos.
- **Falta de trazabilidad**: sin historial digital, no es posible analizar tendencias ni tomar decisiones basadas en datos.
- **Gestión reactiva de la producción**: sin sistema de bloques, se producen cuellos de botella en horas punta.

---

## Quién lo usa (actores del sistema)

| Actor | Rol |
|---|---|
| **Cliente** | Realiza pedidos online (web o WhatsApp), consulta su historial y puede modificar o cancelar pedidos |
| **Empleado** | Usa un panel tipo POS para crear pedidos telefónicos de forma ágil |
| **Administrador** | Gestiona el negocio: empleados, días de operación, estadísticas y calendario de bloques |
| **Asistente IA** | Agente conversacional que atiende pedidos por WhatsApp en lenguaje natural |

---

## Funcionalidades principales

### 1. Portal web para clientes

El sistema permite realizar pedidos tanto a **usuarios registrados** como a **usuarios invitados**, sin obligar al cliente a crearse una cuenta. En ambos casos se puede elegir entre:

- **Pago online** (mediante Stripe)
- **Pago en el establecimiento** al recoger el pedido

Esto contempla las cuatro combinaciones posibles: registrado+online, registrado+en local, invitado+online, invitado+en local.

**Flujo de pedido:**
1. El cliente añade productos al carrito.
2. En el proceso de compra elige: iniciar sesión o continuar como invitado.
3. Introduce sus datos: nombre, teléfono y email.
4. Selecciona la **franja horaria** de recogida (con disponibilidad en tiempo real).
5. Elige el método de pago y confirma el pedido.

**Personalización de ingredientes:** el cliente puede tanto **añadir como quitar ingredientes** de sus hamburguesas.

**Modificación y cancelación de pedidos:**
- Solo se permite dentro de los **primeros 15 minutos** tras realizar el pedido.
- Cualquier modificación o cancelación envía automáticamente un **correo al administrador**.
- Si el cliente ya pagó y **añade** algo (p. ej. 12 € más), el administrador se pone en contacto para que abone la diferencia.
- Si el cliente ya pagó y **quita** algo (p. ej. 12 € menos), el administrador gestiona la devolución.
- Si se **cancela** un pedido ya pagado, el administrador gestiona el reembolso contactando al cliente.

### 2. Asistente de WhatsApp con IA

El flujo conversacional funciona así:

1. El cliente escribe al WhatsApp del negocio.
2. La IA responde con un saludo del tipo: *"Hola, soy la IA de Buena Burger. Para hacer tu pedido, dime tu nombre, la hora de recogida y qué quieres pedir."*
3. Con esa información, la IA verifica si hay **bloques disponibles** en la hora solicitada:
   - ✅ **Hay hueco:** la IA crea el pedido automáticamente (via API o script) y confirma al cliente por WhatsApp que su pedido está registrado.
   - ❌ **No hay hueco:** la IA informa al cliente e indica la **hora libre más cercana** disponible. Si el cliente la acepta, se crea el pedido en ese bloque.
4. Si el cliente no puede arreglarse con la IA, puede solicitar hablar con un empleado. En ese momento:
   - Se notifica al administrador mediante un **correo electrónico** indicando que un cliente necesita atención.
   - El administrador contacta al cliente para ayudarle a completar el pedido.

**Tecnología:** Meta Cloud API (WhatsApp Business oficial) + OpenAI API para interpretación en lenguaje natural.

### 3. Sistema de bloques de producción ⚙️ *(funcionalidad diferencial)*
- La producción se organiza en **bloques de 5 minutos**, con un máximo de **10 hamburguesas** por bloque.
- El sistema asigna pedidos automáticamente al bloque correspondiente.
- Los pedidos grandes (>10 unidades) se distribuyen en bloques consecutivos.
- Los bloques se liberan automáticamente si se cancela un pedido.

### 4. Panel de administración
- Calendario de bloques con ocupación en tiempo real.
- Gestión de empleados (alta/baja).
- Cierre de días de operación.
- Estadísticas: ingresos, productos más vendidos, horas de mayor demanda.

### 5. Panel de empleados (POS)
- Interfaz tipo **punto de venta de restaurante** (estilo iPad/tablet), optimizada para apuntar pedidos telefónicos de forma rápida y ágil.
- Permite crear pedidos con nombre del cliente, productos y hora de recogida.
- Opción de **forzar el pedido** en un bloque lleno cuando sea necesario (decisión manual del empleado).

### 6. Impresión de tickets
- Impresión automática en impresora térmica del local mediante **WebSocket**.
- El ticket indica el estado de pago del pedido.

---

## Modelo del Dominio

### Entidades

#### Jerarquía de personas que realizan pedidos

```
abstract Cliente (nombre, telefono, email)
    ├── ClienteRegistrado → tiene cuenta: passwordHash + rehacerUltimoPedido()
    └── ClienteInvitado   → sin cuenta, solo los datos del pedido
```

- **`ClienteRegistrado`** puede ver su historial de pedidos y rehacer el último (añade el contenido al carrito; solo falta elegir hora y día).
- **`ClienteInvitado`** no tiene cuenta. Sus datos de contacto viajan directamente en el pedido.
- Ambos heredan nombre, teléfono y email de `Cliente`.

> `Usuario` (empleado/admin del sistema interno) es un concepto **separado e independiente** de `Cliente`. Un cliente web y un empleado son contextos completamente distintos con permisos y accesos diferentes.

---

#### `Pedido`
Representa cada pedido hecho al negocio. Atributos clave:
- `canal` → WEB / WHATSAPP / TELEFONO
- `estado` → PENDIENTE_PAGO → CONFIRMADO → EN_PREPARACION → LISTO → ENTREGADO / CANCELADO
- `metodoPago` → STRIPE / PAGO_EN_LOCAL
- `total`, `fechaCreacion`
- `modificable()` / `cancelable()` → comprueban si han pasado menos de 15 min desde la creación

#### `BloqueProduccion`
Intervalo de 5 minutos en el que la cocina puede preparar un máximo de **10 hamburguesas**. Atributos: `fecha`, `horaInicio`, `horaFin`, `capacidadMax`. Métodos: `hamburgesasOcupadas()` y `disponible()`.

> **Un pedido puede ocupar varios bloques consecutivos.** 15 hamburguesas → 2 bloques. 30 hamburguesas → 3 bloques.

#### `LineaPedido`
Cada línea del pedido (ej. "2 Buena Burger sin pepinillos"). Tiene `cantidad`, `precioUnitario`, lista de `ingredientesExcluidos` y lista de `ingredientesAnadidos`.

> `LineaPedido` ≠ `Producto`. `Producto` es el catálogo fijo definido por el admin. `LineaPedido` captura la personalización concreta que pidió este cliente en este pedido.

#### `Producto`
Ítem de la carta. Tiene nombre, precio, `categoria` (HAMBURGUESA / PATATAS / BEBIDA), lista de ingredientes por defecto, imagen y `activo`. Las hamburguesas y patatas admiten personalización de ingredientes y extras. Las bebidas no.

#### `Extra`
Ingrediente adicional con precio propio (ej. "extra bacon, 2€") o gratuito (ej. "salsa picante, 0€"). Solo aplicable a hamburguesas y patatas. Los extras gratuitos tienen `precio = 0`. Tiene nombre, precio y cantidad máxima por línea.

#### `ExtraLinea`
Tabla intermedia entre `LineaPedido` y `Extra`. Registra qué extra concreto se añadió a una línea del pedido y en qué cantidad. Ejemplo: "esta LineaPedido lleva 1 extra bacon y 2 extra queso".

#### `Usuario`
Personal interno (empleado o admin). Atributos: nombre, email, passwordHash, `rol` (EMPLEADO / ADMIN). Tiene acceso al POS y al panel de administración.

---

### Relaciones

| Relación | Tipo | Lectura |
|---|---|---|
| `Cliente → Pedido` | Asociación 0..1 → * | Un cliente puede tener muchos pedidos; un pedido puede no tener cliente (invitado) |
| `Pedido → BloqueProduccion` | Asociación * → 1..* | Un pedido puede ocupar uno o varios bloques consecutivos |
| `Pedido *→ LineaPedido` | **Composición** 1 → 1..* | Un pedido tiene al menos una línea; las líneas no existen sin pedido |
| `LineaPedido → Producto` | Asociación * → 1 | Muchas líneas pueden referenciar el mismo producto de carta |
| `LineaPedido *→ ExtraLinea` | **Composición** 1 → * | Una línea puede tener cero o más extras añadidos |
| `ExtraLinea → Extra` | Asociación * → 1 | Referencia al catálogo de extras |
| `Usuario → Pedido` | Asociación 1 → * | Un empleado/admin gestiona muchos pedidos |

---

### Reglas de negocio

| Regla | Descripción |
|---|---|
| **RN-01** | Un `BloqueProduccion` admite máximo 10 hamburguesas (patatas y bebidas no cuentan para el cupo) |
| **RN-02** | Bloques de 5 min entre 20:30 y 23:00, viernes, sábados y domingos |
| **RN-03** | Un pedido con más de 10 hamburguesas ocupa bloques consecutivos automáticamente |
| **RN-04** | Modificación y cancelación solo durante los primeros **15 minutos** desde la creación del pedido |
| **RN-05** | Cualquier modificación o cancelación envía correo automático al administrador |
| **RN-06** | Si se modifica un pedido ya pagado: el admin gestiona cobro o devolución de la diferencia |
| **RN-07** | Si se cancela un pedido ya pagado con Stripe: el admin gestiona el reembolso y contacta al cliente |
| **RN-08** | WhatsApp y Teléfono: siempre pago en local (nunca Stripe) |
| **RN-09** | Solo empleados y admin pueden forzar un bloque lleno |
| **RN-10** | Extras solo aplicables a hamburguesas y patatas; las bebidas no tienen extras |
| **RN-11** | Al confirmar cualquier pedido → ticket impreso automáticamente en cocina vía WebSocket |
| **RN-12** | `rehacerUltimoPedido()` solo disponible para `ClienteRegistrado`; añade contenido al carrito (hora y día se eligen de nuevo) |

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Base de datos | MongoDB Atlas (NoSQL) |
| Frontend | HTML + CSS + JavaScript vanilla |
| Autenticación | JWT |
| Pagos | Stripe |
| WhatsApp | Meta Cloud API |
| IA | OpenAI API |
| Impresión en tiempo real | WebSocket |
| Control de versiones | Git + GitHub |

---

## Arquitectura general

La aplicación sigue una arquitectura **cliente-servidor** con una API REST en el backend (Node.js/Express) y un frontend multipágina en HTML/CSS/JS vanilla. La base de datos es **MongoDB Atlas** (documental, NoSQL), elegida por su flexibilidad para modelar pedidos con personalizaciones variables.

Los servicios externos (Stripe, Meta Cloud API, OpenAI) se integran en el backend. La impresión de tickets usa WebSocket para comunicación en tiempo real con el navegador del local.

---

## Metodología de desarrollo

El proyecto sigue una **metodología ágil basada en Scrum**, adaptada a un único desarrollador. Los sprints tienen duración de **2 semanas**. El propietario de Buena Burger actúa como Product Owner, validando incrementos funcionales en cada Sprint Review.

### Fases del proyecto

| Fase | Período | Entregable |
|---|---|---|
| Requisitos | Marzo – Abril | Modelo del dominio, casos de uso, prototipos |
| Análisis y Diseño | Abril – Mayo | Arquitectura, diagramas, DER |
| Implementación | Marzo – Mayo | MVP funcional (en paralelo) |
| Evaluación | Mayo | Pruebas, conclusiones |
