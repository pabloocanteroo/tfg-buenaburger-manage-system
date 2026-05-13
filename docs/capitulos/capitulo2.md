# Capítulo 2: Disciplina de requisitos

## 2.1 Modelo del dominio

El modelo del dominio representa las entidades conceptuales del negocio, así como sus atributos y las relaciones entre ellas. No incluye ninguna decisión tecnológica ni de implementación, simplemente refleja el vocabulario y la lógica del mundo real de la hamburguesería.

### 2.1.1 Diagrama de clases del dominio

> 📎 **[IMAGEN — Diagrama de clases del dominio]**

El diagrama de clases contiene las siguientes entidades principales:

- **Cliente:** entidad abstracta que agrupa dos tipos de clientes: ClienteRegistrado y ClienteInvitado. Cualquier persona que realiza un pedido es un cliente.
- **ClienteRegistrado:** cliente con una cuenta propia en el sistema. Puede consultar historial de pedidos y rehacer pedidos anteriores.
- **ClienteInvitado:** cliente que realiza pedido sin registrarse en el sistema. Sus datos como el nombre, teléfono o email se recogen en el momento de confirmación del pedido.
- **Pedido:** entidad central del sistema. Representa una orden de compra realizada por un cliente para recoger en el local.
- **LineaPedido:** cada uno de los artículos que componen el pedido, con su cantidad, precio y personalizaciones, ya sea quitar o añadir ingredientes.
- **ExtraLínea:** ingrediente adicional asociado a una línea de pedido.
- **Producto:** artículo del catálogo: hamburguesa, patatas, bebida o postre con su precio y composición por defecto.
- **Extra:** ingrediente adicional para añadir a artículos restringidos como pueden ser patatas o hamburguesa.
- **BloqueProducción:** franja de tiempo de 5 minutos con capacidad máxima para 10 hamburguesas. Es el mecanismo que regula el ritmo de producción de la cocina.
- **Usuario:** empleado o administrador del sistema que tiene acceso al panel interno.

### 2.1.2 Diagrama de objetos

> 📎 **[IMAGEN — Diagrama de objetos: ejemplo de pedido real de María López, bloque 21:15, 1× Buena Burger con pepinillos + carne extra, 1× Buenas Fries con salsa picante, total 19,00 €]**

### 2.1.3 Glosario del dominio

A continuación, se define el vocabulario específico sobre el dominio de Buena Burger. El objetivo es establecer un lenguaje común entre el equipo de desarrollo y cliente.

| Término | Definición |
|---|---|
| **Bloque de producción** | Franja de tiempo de 5 minutos dentro del horario operativo. Cada bloque admite un máximo de 10 hamburguesas. |
| **Canal** | Vía por la que llega un pedido al sistema: WEB (plataforma online), WHATSAPP (asistente IA) o TELEFONO (POS interno). |
| **Carta** | Catálogo de productos disponibles para pedir, organizados por categoría. (Hamburguesa, patatas, postre, bebida) |
| **ClienteInvitado** | Cliente que realiza un pedido sin registrarse. Sus datos se recogen en el momento del pedido y no se conservan para futuras sesiones. |
| **ClienteRegistrado** | Cliente con cuenta en el sistema. Puede acceder a su historial y rehacer pedidos anteriores. |
| **Extra** | Ingrediente adicional que el cliente puede añadir a hamburguesas o patatas. Puede ser de pago o no. |
| **Forzar bloque** | Acción exclusiva del staff que permite crear un pedido en un bloque que ya ha alcanzado su capacidad máxima. |
| **Hora de recogida** | Hora del bloque de producción asignado al pedido. El cliente acude al local a esa hora para recoger su pedido. |
| **Ingrediente excluido** | Ingrediente que forma parte de la composición por defecto de un producto pero que el cliente ha solicitado eliminar. |
| **LineaPedido** | Cada artículo individual dentro de un pedido, con su cantidad, precio y personalizaciones. |
| **Noche operativa** | Cada viernes, sábado o domingo en que el local está abierto (20:30–23:00). |
| **PAGO_EN_LOCAL** | Método de pago en el que el cliente abona el pedido en efectivo o con tarjeta directamente en el local al recogerlo. |
| **POS** | Panel de punto de venta interno, usado por empleados y administradores para gestionar pedidos telefónicos. |
| **Rehacer pedido** | Funcionalidad exclusiva para clientes registrados que carga automáticamente en el carrito las líneas de su último pedido. |
| **Staff** | Conjunto formado por empleados y administradores del sistema. |
| **Ticket** | Documento físico impreso en la impresora térmica de cocina al confirmarse un pedido. Incluye número de pedido, hora de recogida, líneas y personalizaciones. |

### 2.1.4 Requisitos Suplementarios

Los requisitos suplementarios son los que no se corresponden con una funcionalidad concreta, sino con las características de calidad que el sistema debe cumplir en su conjunto.

| Código | Tipo | Descripción |
|---|---|---|
| RS-01 | Rendimiento | El tiempo de respuesta de la API para operaciones de consulta no debe superar 1 segundo bajo carga normal. |
| RS-02 | Rendimiento | El sistema debe ser capaz de gestionar pedidos simultáneos sin degradación apreciable durante las noches operativas (estimado: 20–30 usuarios concurrentes). |
| RS-03 | Seguridad | Las contraseñas de usuarios y clientes se almacenan exclusivamente en forma de hash bcrypt. Nunca se persiste texto plano. |
| RS-04 | Seguridad | Todas las rutas privadas de la API requieren un token JWT válido. Los tokens expiran en 7 días. |
| RS-05 | Seguridad | El control de acceso por rol (CLIENTE / EMPLEADO / ADMIN) se verifica en el servidor en cada petición. No se confía en validaciones del lado del cliente. |
| RS-06 | Usabilidad | La interfaz del cliente debe ser completamente funcional desde un smartphone sin necesidad de instalar ninguna aplicación. |
| RS-07 | Usabilidad | La pantalla de cocina (iPad) debe actualizarse en tiempo real sin necesidad de refrescar manualmente la página. |
| RS-08 | Disponibilidad | El servicio debe estar operativo durante los periodos de actividad del negocio (viernes, sábados y domingos a partir de las 19:00). |
| RS-09 | Mantenibilidad | El código fuente se gestiona mediante Git con historial de commits descriptivo. El despliegue se realiza sobre Render. |
| RS-10 | Compatibilidad | La aplicación debe funcionar correctamente en los navegadores modernos más utilizados (Chrome, Firefox, Safari) tanto en escritorio como en móvil. |
| RS-11 | Escalabilidad | La arquitectura permite incorporar nuevos canales de pedido (p.ej. WhatsApp IA) sin modificar los modelos de datos ni la lógica central de bloques. |

---

## 2.2 Diagrama de Contexto

El diagrama de contexto define los límites del sistema, así como los actores que interactúan con él, y los sistemas externos con los que se integra o está previsto que se integre.

> 📎 **[IMAGEN — Diagrama de contexto del sistema]**

**Actores humanos:**

- **Cliente registrado:** accede a la plataforma web con una cuenta propia, puede realizar pedidos, consultar su historial y gestionar su perfil.
- **Cliente invitado:** realiza pedidos a través de la web sin necesidad de tener una cuenta.
- **Cliente WhatsApp:** realiza pedidos enviando mensajes en lenguaje natural al número de WhatsApp de la hamburguesería.
- **Empleado/Admin:** accede al POS interno para gestionar los pedidos telefónicos y al panel de administración para configurar el sistema y visualizar datos.

**Sistemas externos:**

- **MongoDB Atlas:** una base de datos en la nube donde se persiste toda la información del sistema.
- **Impresora térmica (TCP/ESC-POS):** el servidor se conecta con la impresora a través del puerto de la impresora para imprimir tickets físicos.
- **Stripe:** pasarela de pago online, que permite a los pedidos web pagar de forma anticipada.
- **WhatsApp Business API + OpenAI API:** combinación que permite al sistema recibir pedidos en lenguaje natural y procesarlos automáticamente.
- **Email SMTP:** servidor de correo para enviar notificaciones sobre confirmación del pedido, así como modificaciones y cancelaciones.

---

## 2.3 Actores del sistema

A continuación, se describen los distintos actores identificados en el sistema, así como el tipo de interacción que mantienen con el sistema.

| Actor | Tipo | Descripción |
|---|---|---|
| **ClienteRegistrado** | Principal | Cliente con cuenta en el sistema. Puede realizar pedidos, ver historial, rehacer pedidos, modificar y cancelar dentro del plazo. |
| **ClienteInvitado** | Principal | Cliente sin cuenta. Puede realizar pedidos proporcionando sus datos en el momento. No tiene historial ni puede modificar. |
| **Cliente WhatsApp** | Principal (planificado) | Realiza pedidos mediante mensajes de texto al número de WhatsApp del negocio. El sistema los interpreta mediante IA. |
| **Empleado** | Principal | Gestiona pedidos desde el POS interno. Puede crear pedidos telefónicos, ver bloques e imprimir tickets. |
| **Administrador** | Principal (hereda de Empleado) | Tiene acceso total al sistema: gestiona la carta, los extras, los bloques, los empleados y las estadísticas. |
| **Scheduler (Cron)** | Secundario | Proceso automático del servidor que genera los bloques de producción cada medianoche para los próximos 60 días. |

---

## 2.4 Casos de uso

### 2.4.1 Diagramas de casos de uso

> 📎 **[IMAGEN — Diagrama de casos de uso del sistema completo]**

### 2.4.2 Priorización de Casos de Uso

| Código | Caso de Uso | Actor | Prioridad |
|---|---|---|---|
| UC-01 | Consultar Carta | ClienteRegistrado / ClienteInvitado | Media |
| UC-02 | Realizar Pedido Web | ClienteRegistrado / ClienteInvitado | Alta |
| UC-03 | Ver Historial de Pedidos | ClienteRegistrado | Media |
| UC-04 | Rehacer Último Pedido | ClienteRegistrado | Media |
| UC-05 | Modificar Pedido a través del sistema | ClienteRegistrado | Media |
| UC-06 | Cancelar Pedido a través del sistema | ClienteRegistrado | Media |
| UC-07 | Realizar Pedido WhatsApp | ClienteInvitado | Alta |
| UC-08 | Escalar a Empleado | — | Baja |
| UC-09 | Crear Pedido Telefónico | Admin / Empleado | Alta |
| UC-10 | Forzar Bloque Lleno | Admin / Empleado | Baja |
| UC-11 | Imprimir Ticket | — | Alta |
| UC-12 | Gestionar Carta | Administrador | Media |
| UC-13 | Gestionar Extras | Administrador | Media |
| UC-14 | Configurar Bloques | Administrador | Alta |
| UC-15 | Ver Estadísticas | Administrador | Media |
| UC-16 | Gestionar Empleados | Administrador | Media |
| UC-17 | Cerrar Día de Operación | Administrador | Media |
| UC-18 | Gestionar Diferencia Económica | Administrador | Baja |

### 2.4.3 Detalle de Casos de Uso

A continuación, se procede a detallar los casos de uso de alta prioridad y los que requieren una mayor complejidad técnica.

---

#### UC-01: Consultar Carta

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado / ClienteInvitado |
| **Descripción** | La carta siempre está accesible. No hace falta tener una cuenta, ni que el local esté abierto. Cualquiera puede entrar y consultarla. |
| **Precondiciones** | Ninguna |
| **Postcondiciones** | El usuario ve los productos organizados por categoría. También puede filtrarlos por categoría. |

**Flujo principal:**

1. El usuario entra en la web.
2. La carta aparece sola simplemente pinchando en carta. Los productos salen todos ordenados y se puede filtrar según su tipo. Pueden ser hamburguesas, patatas, bebidas y postres.
3. Cada producto muestra sus ingredientes, así como su precio.
4. Si se desea pedir algo pinchando en el producto se añade al carrito.

---

#### UC-02: Realizar Pedido Web

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado / ClienteInvitado |
| **Descripción** | El cliente elige lo que quiere, lo personaliza, escoge una hora y confirma. |
| **Precondiciones** | Que haya bloques generados para la fecha que el cliente desea, así como un hueco disponible. |
| **Postcondiciones** | Pedido en estado confirmado. Los bloques pierden disponibilidad. Ticket impreso en cocina. |

**Flujo principal:**

1. El cliente toca un producto en la carta.
2. Se abre un modal con los ingredientes que lleva ese producto por defecto.
3. El cliente puede elegir quitar ingredientes o añadirlos.
4. Elige la cantidad y lo añade al carrito. Repite esto con los artículos que desee.
5. Abre el carrito y pulsa Hacer Pedido.
6. Le pide nombre, teléfono y email. Si ya ha iniciado sesión previamente estos datos vienen rellenos.
7. Elige la fecha entre las noches operativas disponibles más próximas.
8. Aparecen los bloques horarios libres para ese día.
9. El cliente selecciona el que desee.
10. El sistema comprueba por detrás que el bloque sigue disponible, así como si hay capacidad para las hamburguesas del pedido.
11. Si hay más de diez hamburguesas en el pedido, se buscan bloques consecutivos libres para repartir automáticamente.
12. Toca elegir cómo pagar. Las formas de pago son o en el local o a través de Stripe.
13. Se crea el pedido, y se reservan los bloques y el ticket sale en la impresora de la cocina.
14. Al cliente le llega una notificación por correo con el resumen del pedido y la hora a la que debe ir a recogerlo.

**Flujos alternativos:**

- *FA-01:* Puede ocurrir que entre que el cliente elige la franja y confirma el pedido, otro pedido ocupe el bloque. Si esto ocurre el sistema le avisa al cliente y le solicita que elija otra hora.
- *FA-02:* Si el volumen del pedido necesita varios bloques seguidos y no los hay, se le informa. Puede reducir la cantidad o elegir otro horario.

---

#### UC-03: Ver historial de pedidos

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado |
| **Descripción** | El cliente puede ver todos los pedidos que ha hecho hasta el momento. Fechas, productos, total. Desde ahí puede repetir cualquier pedido. |
| **Precondiciones** | Tiene sesión iniciada y ha hecho al menos 1 pedido antes. |
| **Postcondiciones** | Ve un historial completo. Si pulsa rehacer, el carrito se carga solo y va directo a elegir día y hora. |

**Flujo principal:**

1. El cliente entra en su perfil.
2. Aparece la lista de los pedidos, ordenados de más reciente a más antiguo.
3. Cada entrada muestra el número de pedido, la fecha, artículos del pedido y cuánto pagó.
4. Puede expandir cualquiera para ver el detalle completo.
5. Si quiere repetir algún pedido tan solo debe pulsar en rehacer y el sistema cargará esas líneas en el carrito llevándole directamente a la selección de fecha y hora.

**Flujos alternativos:**

- *FA-01:* Si todavía no ha hecho ningún pedido, aparece un mensaje indicándoselo.

---

#### UC-04: Rehacer pedido

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado |
| **Descripción** | Desde el historial de pedidos, el cliente carga en el carrito las líneas de un pedido anterior y se le redirige automáticamente a elegir día y hora sin pasar por la carta de nuevo. |
| **Precondiciones** | Tiene sesión iniciada y ha hecho al menos 1 pedido antes. |
| **Postcondiciones** | El carrito tiene las mismas líneas y personalizaciones que el pedido elegido. El sistema lleva al cliente al paso de selección de bloque. |

**Flujo principal:**

1. El cliente va a su historial y localiza el pedido que quiere repetir.
2. Pulsa rehacer.
3. El sistema carga en el carrito todos los productos tal cual estaban en el pedido anterior, es decir: cantidades, ingredientes excluidos e ingredientes añadidos.
4. Le lleva directo al paso de elegir fecha y hora, sin pasar por la carta.
5. A partir de ahí, el flujo es el mismo que UC-02 desde el paso siete.

---

#### UC-05: Modificar Pedido

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado / Staff |
| **Descripción** | Se modifican las líneas de un pedido ya confirmado. La condición para poder modificar el pedido es que queden más de 15 minutos para la hora de recogida del pedido. El cliente registrado lo hace desde su perfil. El cliente no registrado tiene que llamar al local y es el staff quien lo modifica. |
| **Precondiciones** | Que el pedido exista y esté confirmado. Que queden más de 15 minutos para que se entregue su pedido. |
| **Postcondiciones** | Las líneas quedan actualizadas. Los bloques se recalculan si cambia el número de hamburguesas. Si hay diferencia de precio, el admin recibe aviso. |

**Flujo principal (cliente registrado):**

1. El cliente entra a su perfil y localiza el pedido que quiere modificar.
2. El sistema comprueba que quedan más de 15 minutos para la hora de recogida. Si esto es así, muestra la opción de modificar.
3. El cliente hace los cambios sobre las líneas del pedido.
4. El sistema recalcula el total y ajusta los bloques si el número de hamburguesas ha cambiado.
5. En caso de que el pedido esté pagado de forma anticipada mediante Stripe, y el precio del pedido cambie, se notificará al administrador para que resuelva la diferencia.

**Flujo alternativo (cliente no registrado llama al local):**

1. El cliente llama a la hamburguesería para decirles que desea modificar el pedido.
2. El empleado accede a su panel, localiza el pedido y comprueba que quedan más de 15 minutos para la hora de recogida.
3. Si hay tiempo suficiente, el empleado realiza los cambios necesarios.
4. El sistema automáticamente reajusta el total, y los bloques si el número de hamburguesas ha cambiado.
5. Si hay cambio de precio, el sistema notifica al administrador para que lo gestione.

**Flujos alternativos:**

- *FA-01:* Si quedan menos de 15 minutos para que sea la hora de recogida del pedido, el sistema no permite modificarlo.

---

#### UC-06: Cancelar Pedido

| Campo | Descripción |
|---|---|
| **Actor** | ClienteRegistrado / Staff |
| **Descripción** | Se cancela un pedido que ya está confirmado. La condición para poder cancelar el pedido es que queden más de 15 minutos para la hora de recogida del pedido. El cliente registrado lo hace desde su perfil. El cliente no registrado tiene que llamar al local y es el staff quien lo cancele. |
| **Precondiciones** | Que el pedido exista y esté confirmado. Que queden más de 15 minutos para que se entregue su pedido. |
| **Postcondiciones** | Pedido en cancelado. Bloques liberados. Si había pago por Stripe, el administrador gestiona el reembolso. |

**Flujo principal (cliente registrado):**

1. El cliente entra en su perfil y localiza el pedido que quiere cancelar.
2. El sistema comprueba que quedan más de 15 minutos para la hora de recogida. Si es así, muestra la opción de cancelar.
3. El pedido pasa a cancelado y los bloques que tenía reservados quedan libres.
4. Si el pago fue por Stripe, se avisa al administrador para que tramite la devolución.

**Flujo alternativo (cliente no registrado):**

1. El cliente llama a la hamburguesería pidiendo cancelar su pedido.
2. El empleado accede a su panel, localiza el pedido y comprueba que quedan más de 15 minutos para la hora de recogida.
3. Si hay tiempo suficiente, el empleado cancela el pedido desde el panel del staff.
4. Los bloques quedan libres. Si había pago por Stripe, se notifica al administrador para gestionar la devolución.

**Flujos alternativos:**

- *FA-01:* Si quedan menos de 15 minutos para la hora de recogida, el sistema no permite la cancelación independientemente de quién lo intente.

---

#### UC-07: Realizar Pedido WhatsApp

| Campo | Descripción |
|---|---|
| **Actor principal** | Cliente WhatsApp |
| **Descripción** | El cliente escribe al WhatsApp del negocio en lenguaje normal. La IA interpreta el mensaje, comprueba si hay hueco a la hora que pide en el sistema y registra el pedido. El pago siempre es en local. |
| **Precondiciones** | WhatsApp Business API y OpenAI API activas y configuradas. Bloques disponibles para la hora pedida. |
| **Postcondiciones** | Pedido registrado con canal WHATSAPP y pago en local. Ticket impreso en cocina. |

**Flujo principal:**

1. El cliente escribe al número del negocio. *"Quiero dos Buena Burger con extra de queso para las 21:30"*
2. La integración con OpenAI lee el mensaje y extrae productos, cantidades, personalizaciones, hora y día.
3. Se comprueba en el sistema si ese bloque tiene disponibilidad.
4. Si hay hueco, el pedido se confirma y el sistema responde al cliente con su número de pedido y la hora de recogida.
5. En cocina se imprime el ticket, igual que con cualquier otro canal.

**Flujos alternativos:**

- *FA-01:* El sistema responde al cliente sugiriendo otras franjas cercanas si es que el bloque no tiene hueco.
- *FA-02:* La IA pide al cliente que complete o aclare la información antes de seguir si es que el mensaje no está claro.
- *FA-03:* Si la conversación se complica o el cliente lo solicita, un empleado toma el control del chat.

---

#### UC-09: Crear Pedido Telefónico

| Campo | Descripción |
|---|---|
| **Actor principal** | Empleado / Administrador |
| **Descripción** | El empleado recibe una llamada y lo registra en el POS interno. |
| **Precondiciones** | El empleado tiene sesión con rol de empleado o administrador. Hay huecos disponibles en los bloques. |
| **Postcondiciones** | Pedido registrado con canal teléfono y pago en local. Ticket impreso en cocina. |

**Flujo principal:**

1. El empleado abre el POS interno.
2. Introduce el nombre y teléfono del cliente.
3. Selecciona los productos y añade las personalizaciones que le dice el cliente.
4. Elige la hora de recogida.
5. El sistema comprueba si el bloque tiene hueco.
6. Se crea el pedido y el ticket sale en cocina.
7. El empleado le confirma al cliente el número de pedido y la hora.

**Flujos alternativos:**

- *FA-01:* Si el bloque está lleno pero la situación lo justifica, el empleado puede forzar el bloque y así asignar el periodo a un bloque que ya esté completo.
- *FA-02:* Si el bloque está lleno, pero no se desea forzar se busca con el cliente otra franja horaria que le venga bien.

---

#### UC-11: Imprimir ticket

| Campo | Descripción |
|---|---|
| **Actor principal** | Sistema (automático) |
| **Actores secundarios** | Impresora Térmica, Pantalla Cocina (iPad) |
| **Descripción** | Cuando un pedido pasa a CONFIRMADO, el sistema imprime el ticket en cocina y avisa al iPad. Nadie tiene que hacer nada. |
| **Precondiciones** | El pedido está confirmado. La impresora tiene IP y puerto configurados. |
| **Postcondiciones** | Ticket impreso. iPad notificado con alerta sonora y visual. |

**Flujo principal:**

1. El sistema detecta que un pedido acaba de confirmarse.
2. Prepara el contenido del ticket: número de pedido, hora de recogida, nombre del cliente y todas las líneas con sus respectivas personalizaciones y extras.
3. Abre conexión TCP al puerto 9100 de la impresora wifi y manda los comandos ESC/POS.
4. La impresora imprime el ticket.
5. Al mismo tiempo, lanza el evento `nuevo-pedido` por Socket.IO al iPad de cocina.
6. El iPad suena y actualiza la lista de pedidos en pantalla.

**Flujos alternativos:**

- *FA-01:* Si la impresora está apagada o sin red el pedido se mete en una cola. Desde el panel de administración se puede reimprimir cuando la impresora vuelva a estar disponible.

---

#### UC-14: Configurar Bloques de Producción

| Campo | Descripción |
|---|---|
| **Actor principal** | Administrador |
| **Actores secundarios** | Scheduler |
| **Descripción** | El sistema genera automáticamente los bloques de producción de los próximos 60 días. El administrador puede cerrar los que necesite. |
| **Precondiciones** | El servidor está corriendo. |
| **Postcondiciones** | Bloques disponibles en base de datos. Cualquier cambio del admin se refleja al momento para los clientes. |

**Flujo principal (generación automática):**

1. Al arrancar el servidor y cada medianoche, el scheduler genera los bloques.
2. Revisa los próximos 60 días y se queda solo con viernes, sábados y domingos.
3. Para cada noche operativa genera 30 bloques de 5 minutos entre las 20:30 y las 23:00, con un máximo de 10 hamburguesas por bloque.
4. Se guardan en MongoDB Atlas. El índice único por fecha y hora de inicio evita duplicados aunque el proceso se ejecute varias veces.

**Flujo alternativo (el administrador cierra algún bloque):**

1. El administrador entra en el panel de administración.
2. Puede cerrar un bloque en concreto ya sea por vacaciones o por algún problema en la cocina. Esto incluye tanto días como bloques.
3. Esos bloques pasan a cerrado.
4. Los clientes los ven como no disponibles al intentar reservar.
5. El administrador puede reabrir cualquier bloque o día cuando quiera.

---

### 2.4.4 Matriz de trazabilidad RS – UC

| Requisito | UC-01 | UC-02 | UC-03 | UC-04 | UC-05 | UC-06 | UC-07 | UC-09 | UC-11 | UC-14 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| RS-01 Rendimiento API | X | X | X | X | X | X | X | X | | |
| RS-02 Concurrencia | | X | | | | | X | X | X | |
| RS-03 Passwords bcrypt | | X | | | | | | X | | |
| RS-04 JWT tokens | | X | X | X | X | X | | X | | X |
| RS-05 Control de acceso por rol | | X | X | | X | X | | X | | X |
| RS-06 Interfaz móvil | X | X | X | X | X | X | | | | |
| RS-07 Pantalla cocina tiempo real | | | | | | | | | X | |
| RS-08 Disponibilidad noches operativas | X | X | | | | | X | X | X | X |
| RS-09 Git y despliegue Render | X | X | X | X | X | X | X | X | X | X |
| RS-10 Compatibilidad navegadores | X | X | X | X | X | X | | | | |
| RS-11 Escalabilidad nuevos canales | | X | | | | | X | X | X | X |

---

### 2.4.5 Prototipos de los Casos de Uso

Los prototipos tratan de mostrar la apariencia y el comportamiento esperado de las interfaces de usuario para cada caso de uso relevante.

#### P-01: Realizar Pedido Web — UC-02

**1. Landing**

> 📎 **[IMAGEN — Pantalla de inicio (landing page) de Buena Burger]**

**2. Pantalla de la carta**

> 📎 **[IMAGEN — Vista de la carta con productos organizados por categoría]**

**3. Modal de personalización**

> 📎 **[IMAGEN — Modal de personalización de producto con ingredientes y extras]**

**4. Pinchar en el carrito**

> 📎 **[IMAGEN — Resumen del carrito con el botón "Hacer Pedido"]**

**5. Rellenar datos**

> 📎 **[IMAGEN — Paso 1 del checkout: formulario de datos del cliente]**

**6. Elegir día**

> 📎 **[IMAGEN — Paso 2 del checkout: selector de fecha entre noches operativas]**

**7. Elegir hora**

> 📎 **[IMAGEN — Paso 2 del checkout: cuadrícula de bloques horarios disponibles]**

**8. Elegir forma de pago**

> 📎 **[IMAGEN — Paso 3 del checkout: opciones de pago (en local / Stripe)]**

---

#### P-02: Crear pedido telefónico — UC-09

**1. Pantalla POS**

> 📎 **[IMAGEN — Pantalla del sistema TPV interno con productos, selector de bloques y resumen del pedido]**

---

#### P-03: Lista de pedidos — UC-11

**1. Lista de pedidos en pantalla de administrador**

> 📎 **[IMAGEN — Panel de administración mostrando la lista de pedidos del día con sus estados]**

---

#### P-04: Historial pedidos — UC-03 / UC-04

**1. Pantalla de cliente**

> 📎 **[IMAGEN — Pantalla "Mi Perfil" del cliente con el historial de pedidos y el botón "Repetir al carrito"]**
