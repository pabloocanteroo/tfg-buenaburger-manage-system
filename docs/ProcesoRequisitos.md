<div align=center>

|Observar||Conceptualizar||Decidir||Construir|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|[Modelo del dominio](modeloDelDominio.md)|>>|[***Requisitos***](ProcesoRequisitos.md)|>>|[Análisis](ProcesoAnalisis.md)|>>|[Diseño](ProcesoDiseño.md)|

</div>

# Proceso de Requisitos: Buena Burger

Los requisitos especifican **QUÉ debe hacer el sistema** desde la perspectiva del usuario, sin contaminación de decisiones de implementación. Transforman los conceptos del dominio en comportamientos concretos del software.

## Metodología

### Punto de partida: modelo del dominio

Los requisitos parten del modelo del dominio que identificó los conceptos del mundo real:

- Pedido, LineaPedido, Producto, BloqueProduccion, Usuario

**Pregunta central:** *¿Qué solicitudes puede realizar un actor externo al sistema utilizando estos conceptos?*

### Actores

**Técnica:** Análisis de entidades externas que interactúan con el sistema

<div align=center>

|Actor|Descripción|Justificación|
|-|-|-|
|Cliente|Persona que realiza un pedido online|Solicita consultar carta, elegir bloque, personalizar y pagar|
|Empleado|Personal del local (cocina/mostrador)|Solicita ver pedidos en tiempo real y cambiar su estado|
|Administrador|Dueño del negocio|Solicita gestionar carta, configurar bloques y ver estadísticas|
|Tiempo|Disparador temporal (cron)|Abre/cierra bloques de producción automáticamente según horario|

</div>

### Casos de Uso

**Técnica:** Análisis de objetivos que cada actor busca alcanzar

Del modelo del dominio surgen los siguientes comportamientos:

<div align=center>

|Comportamiento identificado|¿Quién lo solicita?|
|-|:-:|
|consultarCarta()|Cliente|
|realizarPedido()|Cliente|
|seleccionarBloque()|Cliente|
|personalizarProducto()|Cliente|
|pagarPedido()|Cliente|
|recibirConfirmacion()|Cliente|
|verPantallasCocina()|Empleado|
|cambiarEstadoPedido()|Empleado|
|imprimirTicket()|Empleado|
|gestionarProductos()|Administrador|
|configurarBloques()|Administrador|
|verEstadisticas()|Administrador|
|abrirCerrarBloques()|Tiempo|

</div>

### Diagrama de Casos de Uso

*(Ver diagramas.html para visualización gráfica)*

```plantuml
@startuml DiagramaCasosUso

left to right direction

actor "Cliente" as C
actor "Empleado" as E
actor "Administrador" as A
actor "Tiempo" as T

rectangle "Buena Burger System" {
  package "Pedidos" {
    usecase "Consultar Carta" as UC1
    usecase "Realizar Pedido" as UC2
    usecase "Seleccionar Bloque Horario" as UC3
    usecase "Personalizar Producto" as UC4
    usecase "Pagar Pedido" as UC5
    usecase "Recibir Confirmación Email" as UC6
  }

  package "Cocina" {
    usecase "Ver Pantalla Cocina" as UC7
    usecase "Cambiar Estado Pedido" as UC8
    usecase "Imprimir Ticket" as UC9
  }

  package "Administración" {
    usecase "Gestionar Productos (Carta)" as UC10
    usecase "Configurar Bloques" as UC11
    usecase "Ver Estadísticas" as UC12
  }
}

C --> UC1
C --> UC2
UC2 ..> UC3 : <<include>>
UC2 ..> UC4 : <<include>>
UC2 ..> UC5 : <<include>>
UC5 ..> UC6 : <<include>>

E --> UC7
E --> UC8
E --> UC9

A --> UC10
A --> UC11
A --> UC12
A --> UC7

T --> UC11 : abre/cierra bloques

@enduml
```

### Diagrama de Contexto

```plantuml
@startuml DiagramaContexto

actor "Cliente" as C
actor "Empleado" as E
actor "Administrador" as A

rectangle "Buena Burger System" as SYS

database "MongoDB Atlas" as DB
component "Stripe" as STRIPE
component "Email (SMTP)" as EMAIL
component "Impresora Térmica\n(WebSocket)" as PRINTER

C --> SYS : realiza pedido\n(email + teléfono)
E --> SYS : gestiona cocina
A --> SYS : administra

SYS --> DB : persiste datos
SYS --> STRIPE : procesa pago online
SYS --> EMAIL : envía confirmación
SYS --> PRINTER : imprime ticket

@enduml
```

### Detallar Casos de Uso

#### realizarPedido()

```plantuml
@startuml detalle_realizarPedido

title realizarPedido()

|Cliente|
start
:Consulta la carta;
:Selecciona productos;
:Personaliza ingredientes (opcional);
:Elige bloque horario disponible;
:Introduce email y teléfono;
:Elige método de pago;

if (Pago online?) then (Stripe)
  :Redirige a Stripe;
  :Confirma pago;
else (En local)
  :Marca "Pagar al llegar";
endif

|Sistema|
:Valida disponibilidad del bloque;
:Crea el Pedido;
:Actualiza hamburgesasOcupadas del Bloque;
:Envía confirmación por email;
:Notifica a cocina (WebSocket);

|Cliente|
:Recibe confirmación por email;
stop

@enduml
```

#### cambiarEstadoPedido()

```plantuml
@startuml detalle_cambiarEstado

title cambiarEstadoPedido()

|Empleado|
start
:Ve pedido en pantalla cocina;
:Pulsa botón de cambio de estado;

|Sistema|
:Valida transición de estado;
note right
  PENDIENTE → EN_PREPARACION
  EN_PREPARACION → LISTO
  LISTO → ENTREGADO
end note
:Actualiza estado en BD;
:Actualiza pantalla en tiempo real (WebSocket);
stop

@enduml
```

#### configurarBloques()

```plantuml
@startuml detalle_configurarBloques

title configurarBloques()

|Administrador|
start
:Accede al panel de administración;
:Define horario de apertura (20:30 - 23:00);
:Define intervalo de bloques (5 min);
:Define capacidad por bloque (10 hamburguesas);

|Sistema|
:Genera automáticamente los bloques del día;
note right
  20:30, 20:35, 20:40...
  hasta 23:00
  = 31 bloques × 10 = 310 hamburguesas/día
end note
:Persiste configuración;
stop

@enduml
```

### Prototipar Casos de Uso

Las pantallas clave del sistema son:

<div align=center>

|Pantalla|Caso de Uso asociado|Descripción|
|-|-|-|
|Carta Digital|consultarCarta()|Grid de productos por categoría, foto y precio. Mobile-first.|
|Selector de Bloque|seleccionarBloque()|Grid de horas (20:30 a 23:00). Bloques llenos aparecen deshabilitados.|
|Checkout|realizarPedido()|Resumen del pedido, email/teléfono, método de pago.|
|Pantalla Cocina|verPantallasCocina()|Lista de pedidos activos ordenados por hora. Modo oscuro. Actualización en tiempo real.|
|Panel Admin|configurarBloques()|Configuración de horarios y capacidades.|

</div>

Los prototipos visuales se desarrollarán en la fase de diseño.
