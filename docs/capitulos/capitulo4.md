# Capítulo 4 – Descripción de la solución

## 4.1 Mapa de la solución

El presente capítulo muestra la solución finalmente implementada para el sistema Buena Burger Management System, siguiendo el orden lógico definido en el diagrama de contexto del Capítulo 2 y navegando a través de los casos de uso establecidos en la disciplina de requisitos.

El sistema está compuesto por cinco interfaces diferenciadas, diseñadas para cubrir las necesidades de cada actor identificado en el análisis previo:

| Interfaz | Archivo | Actor principal |
|---|---|---|
| **Portal web del cliente** | `index.html` | ClienteRegistrado / ClienteInvitado |
| **Perfil del cliente** | `cliente.html` | ClienteRegistrado |
| **Sistema TPV (Punto de Venta)** | `pos.html` | Empleado / Administrador |
| **Panel de gestión de empleados** | `empleados.html` | Empleado / Administrador |
| **Panel de administración** | `admin.html` | Administrador |

Adicionalmente, el sistema incorpora un canal de pedidos vía WhatsApp con inteligencia artificial, gestionado íntegramente desde el backend sin interfaz visual propia, y un servicio de impresión de tickets en impresora térmica que opera de forma automática al confirmarse cada pedido.

### 4.1.1 Diagrama de navegación

> 📎 **[IMAGEN — Diagrama de navegación entre las cinco interfaces del sistema, mostrando los flujos de acceso según rol de usuario]**

El flujo de navegación establece que:

- Cualquier usuario accede al sistema a través de `index.html`, que actúa como punto de entrada universal.
- Los clientes registrados pueden acceder a su perfil en `cliente.html` tras autenticarse.
- El staff (empleados y administradores) accede al panel de gestión (`empleados.html`) o al panel de administración (`admin.html`) según su rol, protegidos por autenticación JWT.
- Desde el panel de empleados o el de administración, el staff puede navegar al TPV (`pos.html`) para registrar pedidos telefónicos.
- El sistema TPV redirige de vuelta al panel correspondiente al finalizar un pedido.

---

## 4.2 Portal web del cliente

El portal web del cliente es la interfaz principal del sistema para los usuarios externos. Está implementado como una aplicación web multipágina con navegación interna gestionada por JavaScript, sin recarga de página entre secciones. Esto proporciona una experiencia fluida comparable a una Single Page Application manteniendo la sencillez del HTML/CSS/JS vanilla.

### 4.2.1 Landing page

La pantalla de inicio es el primer punto de contacto del cliente con el sistema. Presenta la identidad visual del negocio, con acceso directo a la carta mediante el botón **PIDE AHORA** y a la zona de autenticación mediante **ACCEDER A MI CUENTA**. También incluye una barra de navegación que da acceso a las secciones informativas del negocio: Carta, Nosotros, Filosofía y Funcionamiento.

> 📎 **[IMAGEN — Landing page de Buena Burger con el logo, los dos botones de acción y la barra de navegación]**

La sección **FUNCIONAMIENTO** informa al cliente de los horarios operativos (viernes, sábados y domingos de 20:30 a 23:00), la dirección física del local y los datos de contacto. Esta sección es especialmente relevante para gestionar las expectativas del cliente antes de realizar un pedido.

### 4.2.2 Catálogo de productos — UC-01

La carta presenta todos los productos disponibles organizados por categorías: HAMBURGUESAS, PATATAS, BEBIDAS, POSTRES y SALSAS. El cliente puede filtrar la visualización por categoría mediante una barra de pestañas. Cada producto muestra su nombre, descripción de ingredientes, imagen y precio.

> 📎 **[IMAGEN — Vista de la carta con los productos organizados en cuadrícula y los filtros de categoría activos]**

Esta pantalla es accesible sin necesidad de autenticación, cumpliendo con UC-01 que establece que cualquier usuario puede consultar la carta en cualquier momento, independientemente de si el local está operativo o no.

El catálogo se carga dinámicamente desde la API REST del backend (`GET /api/productos`), lo que garantiza que cualquier cambio en la carta realizado por el administrador se refleje de inmediato para todos los usuarios.

### 4.2.3 Personalización de productos

Al seleccionar un producto, se abre un modal de personalización que muestra los ingredientes por defecto de ese artículo. El cliente puede:

- **Excluir ingredientes** de la composición estándar (por ejemplo, pedir una hamburguesa sin pepinillos).
- **Añadir ingredientes** incluidos en la composición (por ejemplo, doble cebolla).
- **Seleccionar extras de pago** disponibles para ese tipo de producto (por ejemplo, extra de bacon o extra de queso), con su precio adicional indicado.
- **Ajustar la cantidad** de unidades antes de añadir al carrito.

> 📎 **[IMAGEN — Modal de personalización de producto con lista de ingredientes para excluir, sección de extras disponibles y selector de cantidad]**

Las bebidas no presentan opciones de personalización, conforme a la regla de negocio RN-10. Los extras solo están disponibles para hamburguesas y patatas.

### 4.2.4 Carrito y proceso de compra — UC-02

El carrito es accesible desde cualquier pantalla mediante el botón flotante del header, que muestra el número de artículos en tiempo real. Al abrirlo, el cliente ve un resumen de los productos añadidos con sus personalizaciones, cantidades y precios. Desde aquí puede eliminar artículos o vaciar el carrito por completo.

> 📎 **[IMAGEN — Modal del carrito con los artículos añadidos, sus personalizaciones en color y el total acumulado]**

Al pulsar **Hacer Pedido**, el sistema inicia el proceso de checkout en tres pasos:

**Paso 1 – Datos del cliente:**

El sistema solicita nombre, teléfono y email. Si el cliente tiene sesión iniciada, estos campos aparecen pre-rellenados con sus datos de perfil. El cliente puede también en este paso iniciar sesión o registrarse si aún no lo ha hecho, sin perder el carrito.

> 📎 **[IMAGEN — Paso 1 del checkout: formulario de datos con campos de nombre, teléfono y email, y opción de acceder a cuenta]**

**Paso 2 – Selección de fecha y hora:**

El cliente elige primero la fecha entre las próximas noches operativas disponibles (viernes, sábados y domingos), y a continuación el sistema muestra la cuadrícula de bloques horarios de 5 minutos disponibles para esa noche. Los bloques con capacidad completa aparecen marcados como LLENO y no son seleccionables. El sistema comprueba la disponibilidad en tiempo real consultando `GET /api/bloques`.

> 📎 **[IMAGEN — Paso 2 del checkout: selector de fecha con las noches operativas disponibles y cuadrícula de bloques con sus estados de ocupación]**

Si el pedido contiene más de 10 hamburguesas, el sistema busca automáticamente bloques consecutivos libres para distribuir la producción, conforme a la regla de negocio RN-03.

**Paso 3 – Método de pago:**

El cliente elige entre pago en el local al recoger el pedido o pago anticipado online a través de Stripe. Si elige Stripe, se presenta el formulario de tarjeta de la pasarela de pagos.

> 📎 **[IMAGEN — Paso 3 del checkout: botones de selección de método de pago (en local / Stripe)]**

Al confirmar, el sistema:

1. Valida que el bloque seleccionado sigue disponible (puede haber sido ocupado por otro pedido durante el proceso de checkout).
2. Crea el pedido en estado CONFIRMADO y reserva los bloques correspondientes.
3. Dispara la impresión automática del ticket en la impresora térmica del local.
4. Emite una notificación en tiempo real al panel del staff mediante Socket.IO.
5. Muestra al cliente un resumen de confirmación con el número de pedido y la hora de recogida.

En caso de que el bloque ya no esté disponible al confirmar (flujo alternativo FA-01 de UC-02), el sistema informa al cliente y le solicita que elija otra franja horaria.

### 4.2.5 Autenticación

El sistema de autenticación se presenta como un modal accesible desde el header. Ofrece dos modos: **iniciar sesión** con email y contraseña, o **registrarse** como cliente nuevo. Las contraseñas se almacenan mediante hash bcrypt (RS-03) y la sesión se gestiona con tokens JWT (RS-04).

> 📎 **[IMAGEN — Modal de autenticación con las opciones de inicio de sesión y registro de nueva cuenta]**

Un cliente no registrado puede completar un pedido sin crear cuenta, facilitando el proceso de compra. En ese caso, sus datos de contacto quedan vinculados únicamente a ese pedido.

### 4.2.6 Perfil del cliente registrado — UC-03 y UC-04

Los clientes registrados tienen acceso a una página de perfil dedicada (`cliente.html`) con dos apartados:

**Mis Pedidos:**

Muestra el historial completo de pedidos realizados, ordenado de más reciente a más antiguo. Cada entrada incluye el número de pedido, la fecha, los artículos con sus personalizaciones y el importe total. El cliente puede expandir cualquier pedido para ver el detalle completo. Si el pedido está dentro del plazo permitido (más de 15 minutos antes de la recogida), el sistema muestra el botón de modificación o cancelación, conforme a RN-04.

> 📎 **[IMAGEN — Pantalla "Mi Perfil" con el historial de pedidos, el detalle expandido de uno de ellos y el botón "Rehacer pedido"]**

Cada pedido ofrece el botón **Rehacer pedido** (UC-04), que carga automáticamente todas las líneas de ese pedido en el carrito con sus personalizaciones originales y lleva al cliente directamente al paso de selección de fecha y hora, omitiendo la navegación por la carta.

**Mis Datos:**

Permite al cliente registrado consultar y actualizar sus datos de contacto (nombre, teléfono). El email no es editable, ya que actúa como identificador único del cliente en el sistema.

### 4.2.7 Modificación y cancelación de pedidos — UC-05 y UC-06

Desde el historial de pedidos, el cliente registrado puede modificar o cancelar un pedido confirmado siempre que queden más de 15 minutos para la hora de recogida (RN-04). El sistema verifica esta condición en el servidor antes de permitir cualquier acción, sin confiar en la validación del cliente (RS-05).

En caso de modificación de un pedido ya pagado por Stripe, el sistema registra la diferencia de precio para que el administrador la gestione manualmente, conforme a RN-06. Si se cancela un pedido pagado, el administrador recibe la notificación para tramitar el reembolso (RN-07). Los bloques de producción reservados quedan liberados automáticamente.

---

## 4.3 Sistema TPV — UC-09 y UC-10

El sistema de Punto de Venta (`pos.html`) está diseñado para usarse desde el interior del local, principalmente para atender pedidos recibidos por llamada telefónica. Su diseño está optimizado para usarse en una pantalla táctil (tablet), con botones grandes y flujo de trabajo rápido.

> 📎 **[IMAGEN — Pantalla del TPV con el catálogo de productos en cuadrícula, el panel de resumen del pedido a la derecha y el selector de bloque horario]**

La interfaz se divide en dos áreas principales:

**Área izquierda – Catálogo:**

Muestra todos los productos activos organizados en una cuadrícula de botones táctiles, agrupados por categoría. Al tocar un producto se añade directamente al resumen del pedido. Los multiplicadores de cantidad (×1, ×2, ×3, ×4) permiten añadir varias unidades de una vez. La personalización de ingredientes y extras se puede ajustar en el panel de resumen.

**Área derecha – Resumen del pedido:**

Muestra el pedido en curso con todos sus artículos, cantidades y personalizaciones. El empleado introduce el nombre y teléfono del cliente, selecciona la hora de recogida y confirma el pedido. El sistema asigna automáticamente el bloque de producción y verifica la disponibilidad.

Si el bloque está lleno, el empleado puede optar por:
- Sugerir otra franja horaria al cliente.
- **Forzar el bloque** (UC-10), añadiendo el pedido a un bloque que ha superado su capacidad máxima. Esta decisión queda registrada en el sistema con el identificador del empleado que la tomó.

El pedido creado desde el TPV tiene siempre canal TELEFONO y método de pago PAGO_EN_LOCAL, conforme a la regla de negocio RN-08.

---

## 4.4 Panel de gestión de empleados

El panel de empleados (`empleados.html`) es la interfaz de seguimiento operativo para el staff durante las noches de servicio. Accesible tanto para empleados como para administradores, está diseñado para funcionar en una tablet fija en el local.

> 📎 **[IMAGEN — Panel de empleados con la columna de bloques horarios a la izquierda (con indicadores de ocupación en verde, amarillo y rojo) y la lista de pedidos del bloque seleccionado a la derecha]**

La pantalla está dividida en dos columnas:

**Columna izquierda – Bloques del día:**

Muestra todos los bloques de producción de la fecha seleccionada (por defecto, el día actual). Cada bloque presenta:
- La hora de inicio del bloque.
- Una barra de ocupación con código de colores: verde cuando hay capacidad disponible, amarillo cuando está a más del 60 % de ocupación y rojo cuando está lleno o forzado.
- El número de hamburguesas ocupadas sobre el máximo y el número de pedidos asignados.

Los bloques marcados como cerrados por el administrador se muestran con un candado y no son seleccionables. Si el día completo está cerrado, se muestra un banner de aviso.

**Columna derecha – Pedidos del bloque:**

Al seleccionar un bloque horario, la columna derecha muestra las tarjetas de todos los pedidos asignados a ese bloque. Cada tarjeta incluye el número de pedido, el nombre y teléfono del cliente, el canal de origen (WEB, TELÉFONO, WHATSAPP) con código de color, el total económico y el detalle de cada línea con sus personalizaciones.

Al tocar una tarjeta, se abre un modal con el detalle completo del pedido, donde el empleado puede:
- Ver toda la información del pedido ampliada.
- **Modificar el pedido**: redirige al TPV cargando el pedido para su edición.
- **Cancelar el pedido**: elimina el pedido y libera los bloques asociados.

Cuando un nuevo pedido llega al sistema, el backend emite el evento `nuevo-pedido` a través de Socket.IO al room `staff`. De este modo, el panel recibe la notificación en tiempo real sin necesidad de actualizar manualmente la página, manteniendo la información siempre actualizada durante el servicio.

---

## 4.5 Panel de administración

El panel de administración (`admin.html`) es la interfaz de control completo del negocio, exclusiva para usuarios con rol ADMIN. Se organiza en cinco pestañas accesibles desde una barra lateral de navegación.

### 4.5.1 Gestión de pedidos

La pestaña **Pedidos** muestra todos los pedidos de la jornada seleccionada, con la posibilidad de filtrarlos por estado y canal. El administrador puede ver el detalle de cada pedido, reimprimir el ticket y gestionar cancelaciones o modificaciones desde aquí, con las mismas capacidades que el panel de empleados pero con una vista más completa que incluye los pedidos de todos los bloques al mismo tiempo.

Desde el header del panel de administración, el administrador puede configurar la conexión con la impresora térmica, introduciendo la dirección IP y el puerto del dispositivo. El estado de la conexión se muestra en tiempo real mediante un indicador de color.

> 📎 **[IMAGEN — Pestaña de pedidos del panel de administración con la lista completa de pedidos del día, filtros por estado y el modal de detalle de un pedido]**

### 4.5.2 Estadísticas

La pestaña **Estadísticas** presenta un dashboard con los datos de rendimiento del negocio: ingresos totales por período, número de pedidos, productos más vendidos por categoría y distribución de pedidos por franja horaria. Esta información permite al propietario del negocio identificar tendencias y tomar decisiones operativas basadas en datos, como ajustar la capacidad productiva en los bloques de mayor demanda.

> 📎 **[IMAGEN — Pestaña de estadísticas con gráficos de ingresos, tabla de productos más vendidos y distribución horaria de pedidos]**

### 4.5.3 Gestión de carta y extras — UC-12 y UC-13

La pestaña **Carta** permite al administrador gestionar el catálogo de productos. Puede crear, editar y activar o desactivar cualquier producto. Cada producto incluye nombre, descripción, precio, categoría, ingredientes por defecto e imagen. Un producto desactivado deja de mostrarse a los clientes en el portal web sin necesidad de eliminarlo del sistema.

Dentro de esta misma sección se gestionan los extras disponibles, con su nombre, precio y la cantidad máxima por línea de pedido. Los extras son transversales a todos los productos que los admiten.

> 📎 **[IMAGEN — Pestaña de carta del panel de administración con la lista de productos, sus estados y el formulario de edición de un producto]**

### 4.5.4 Gestión de empleados — UC-16

La pestaña **Empleados** permite al administrador dar de alta y de baja a los miembros del staff. Al crear un empleado, el sistema genera sus credenciales de acceso (email y contraseña temporal). El rol asignado (EMPLEADO o ADMIN) determina a qué paneles tiene acceso.

### 4.5.5 Calendario de bloques de producción — UC-14

La pestaña **Calendario** muestra el calendario de bloques de producción de los próximos días. El scheduler del servidor genera automáticamente los bloques de las próximas semanas cada medianoche. El administrador puede:

- Cerrar un día completo de operación (por vacaciones o incidencias), lo que marca todos sus bloques como no disponibles de forma masiva.
- Cerrar o reabrir bloques individuales cuando la situación lo requiera.
- Visualizar la ocupación de cada bloque en una vista de calendario.

> 📎 **[IMAGEN — Pestaña de calendario del panel de administración con la vista mensual de bloques, su ocupación y las opciones de cierre de día]**

Los cambios realizados sobre el calendario se reflejan de forma inmediata en el portal web del cliente, que no mostrará como disponibles los bloques marcados como cerrados.

---

## 4.6 Sistema de impresión de tickets — UC-11

La impresión automática de tickets es una de las funcionalidades técnicas más relevantes del sistema, ya que cierra el bucle entre la recepción digital del pedido y la ejecución física en cocina.

### 4.6.1 Formato del ticket

El sistema genera dos variantes del ticket ESC/POS:

- **Ticket de cocina**: con letra de mayor tamaño para facilitar la lectura en el ambiente del local. Incluye el nombre del cliente, la fecha y hora de recogida, todas las líneas del pedido con cantidades y personalizaciones en detalle, y el total. Su objetivo es que el cocinero pueda leer la comanda con claridad.
- **Ticket de cliente**: con formato más compacto, incluye la misma información más el desglose de precios por línea, el método de pago y un mensaje de confirmación.

### 4.6.2 Modos de impresión

La arquitectura de impresión contempla dos modos de funcionamiento, determinados por la variable de entorno `PRINTER_MODE`:

**Modo TCP (desarrollo local):**

El servidor conecta directamente a la impresora mediante una conexión TCP al puerto 9100, enviando los comandos ESC/POS. Este modo se usa cuando el servidor y la impresora están en la misma red local.

**Modo Socket (despliegue en Render + Raspberry Pi):**

Cuando el servidor está desplegado en la nube (Render), la impresora está en la red local del restaurante y no es alcanzable directamente. Para resolver este problema, se desarrolló un **agente de impresión** diseñado para ejecutarse en una Raspberry Pi Zero 2W ubicada en el local. El agente establece una conexión persistente mediante Socket.IO con el servidor en la nube. Cuando llega un pedido, el servidor envía el ticket codificado en base64 al agente a través del evento `imprimir-ticket`. El agente lo decodifica y lo envía a la impresora mediante TCP local.

> 📎 **[IMAGEN — Diagrama de la solución de impresión: servidor en Render → Socket.IO → agente Pi → TCP → impresora térmica]**

### 4.6.3 Gestión de fallos

Si la impresora no está disponible en el momento de recibir el pedido (apagada o sin red), el sistema encola el ticket. Cuando el agente vuelve a conectarse, el servidor descarga automáticamente la cola pendiente. Adicionalmente, el administrador puede forzar la reimpresión de cualquier ticket desde el panel de administración.

---

## 4.7 Asistente conversacional WhatsApp — UC-07

El canal de WhatsApp permite a los clientes realizar pedidos mediante mensajes de texto en lenguaje natural, sin necesidad de acceder al portal web. La integración está construida sobre la **API oficial de WhatsApp Business de Meta** para la recepción y envío de mensajes, y el **SDK de Anthropic** (modelo Claude) para la interpretación del lenguaje natural.

### 4.7.1 Flujo conversacional

El asistente actúa como intermediario entre el cliente y el sistema de gestión de pedidos:

1. El cliente envía un mensaje al número de WhatsApp del negocio con su intención de pedir, por ejemplo: *"Quiero dos Buena Burger sin pepinillos para las 21:30 del sábado"*.
2. El backend recibe el mensaje a través del webhook de la API de WhatsApp Business.
3. Se construye un prompt de sistema que incluye el catálogo de productos y extras actualizado, los bloques de producción disponibles y las instrucciones de comportamiento del asistente.
4. La IA (Claude) analiza el mensaje y extrae: productos, cantidades, personalizaciones, fecha y hora deseada.
5. El sistema verifica en la base de datos si el bloque solicitado tiene capacidad disponible.
6. Si hay hueco, el pedido se crea en el sistema con canal WHATSAPP y el asistente confirma al cliente por WhatsApp con el número de pedido y la hora de recogida. Se imprime el ticket automáticamente.
7. Si no hay hueco, el asistente informa al cliente e indica las franjas horarias disponibles más cercanas, permitiendo al cliente elegir una alternativa.

> 📎 **[IMAGEN — Ejemplo de conversación con el asistente WhatsApp: solicitud del cliente, respuesta de la IA con confirmación del pedido y número asignado]**

El método de pago para los pedidos de WhatsApp es siempre pago en local (RN-08), ya que el canal conversacional no integra pasarela de pagos.

### 4.7.2 Escalado a empleado humano

Si la conversación se complica o el cliente lo solicita explícitamente, el asistente puede escalar la conversación (UC-08). En ese caso, la IA informa al cliente de que un empleado se pondrá en contacto, y el sistema registra la solicitud para que el staff la atienda manualmente a través del panel.

---

## 4.8 Integración técnica de los componentes

El siguiente diagrama resume la interacción entre todos los elementos del sistema durante el flujo más representativo: la creación de un pedido web con pago online.

> 📎 **[IMAGEN — Diagrama de secuencia de creación de pedido web: cliente → API REST → MongoDB Atlas → Stripe → Socket.IO (staff) → agente Pi → impresora térmica]**

Los servicios externos integrados en la solución final son:

| Servicio | Uso | Modo de integración |
|---|---|---|
| **MongoDB Atlas** | Persistencia de datos | Driver mongoose (conexión TCP) |
| **Stripe** | Pagos online | SDK oficial stripe; webhooks para confirmación |
| **Meta WhatsApp Business API** | Canal de mensajería | Webhook HTTPS entrante + HTTP saliente |
| **Anthropic API (Claude)** | Interpretación de lenguaje natural | SDK `@anthropic-ai/sdk` |
| **Socket.IO** | Notificaciones tiempo real + impresión remota | WebSocket sobre HTTP |
| **Impresora térmica ESC/POS** | Impresión física de tickets | TCP puerto 9100 |

> **Nota sobre la IA:** durante el diseño del sistema (Capítulo 3) se contempló el uso de la API de OpenAI. En la fase de implementación se optó finalmente por el SDK de Anthropic (`@anthropic-ai/sdk`), ya que ofrecía mayor flexibilidad en el control del contexto de la conversación y una integración más directa con los requisitos de construcción del prompt del sistema para el agente conversacional.
