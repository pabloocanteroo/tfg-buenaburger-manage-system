<div align=center>

|Observar||Conceptualizar||Decidir||Construir|
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|[***Modelo del dominio***](modeloDelDominio.md)|>>|[Requisitos](ProcesoRequisitos.md)|>>|[Análisis](ProcesoAnalisis.md)|>>|[Diseño](ProcesoDiseño.md)|

</div>

# Modelo del Dominio

El **modelo del dominio** captura los **conceptos puros del negocio**, sin contaminación tecnológica. Identifica entidades, relaciones, vocabulario y reglas de Buena Burger.

## Metodología seguida

### 1. Comprensión del dominio: inmersión en Buena Burger

**Actividades realizadas:**
- Entrevista con el propietario sobre el flujo real de pedidos
- Observación del proceso actual (WhatsApp manual + comandas escritas)
- Identificación del vocabulario natural del negocio

**Pregunta clave:** *¿Qué conceptos usa naturalmente alguien cuando explica cómo funciona Buena Burger?*

**Primeras observaciones:**

> "Los clientes **piden** una **hamburguesa** para recoger a las 21:15"
> "Solo podemos hacer 10 **hamburguesas** cada 5 minutos"
> "El pedido llega por **WhatsApp** y lo apuntamos a mano"
> "Cuando el **pedido** está listo, llamamos al cliente"
> "El cliente puede pedir **sin cebolla** o con **extra de bacon**"
> "Si cancela con menos de 15 minutos, ya no se puede"

### 2. Identificación inicial de conceptos (brainstorming)

**Técnica:** Identificación de sustantivos en descripciones del negocio

<div align=center>

|Sustantivos identificados|Fuente|
|-|-|
|Pedido|"El **pedido** llega por WhatsApp"|
|Hamburguesa|"Solo podemos hacer 10 **hamburguesas** cada 5 minutos"|
|Producto|"Los **productos** de la carta: hamburguesas, patatas, bebidas"|
|Ingrediente|"Sin cebolla, con **extra de bacon**"|
|Extra|"**Extra** de bacon (2€), **extra** de queso (1€)"|
|Bloque|"Cada **bloque** de 5 minutos tiene capacidad para 10 hamburguesas"|
|Cliente|"El **cliente** llama para pedir"|
|Empleado|"El **empleado** apunta el pedido"|
|Ticket|"Imprimimos el **ticket** para cocina"|
|Estado|"El pedido está **en preparación**"|
|Canal|"Pedido por **web**, **WhatsApp** o **teléfono**"|
|Cuenta|"El cliente tiene **cuenta** para ver su historial"|
|Historial|"El cliente puede ver sus **pedidos anteriores**"|

</div>

### 3. Primera depuración: consolidación de sinónimos

<div align=center>

|Conceptos similares|Decisión|Justificación|
|-|-|-|
|Hamburguesa vs Producto|→ **Producto** (con categoría)|Hay hamburguesas, patatas y bebidas; necesitamos generalizar|
|Bloque vs Franja horaria|→ **BloqueProduccion**|Refleja que limita la *producción* de cocina|
|Ingrediente vs Extra|→ **Separados**|Son conceptos distintos: ingrediente es lo que lleva por defecto; extra es lo que se añade con precio|
|Empleado + Admin|→ **Usuario con rol**|Un único concepto con atributo `rol` (EMPLEADO / ADMIN)|
|Ticket|→ **Excluir**|Es una representación del Pedido, no una entidad propia|

</div>

### 4. Análisis de responsabilidades: verbos

<div align=center>

|Concepto|Verbos asociados|¿Es entidad del dominio?|
|-|-|:-:|
|Pedido|Crearse, confirmarse, cancelarse, entregarse|Sí|
|Producto|Listarse, tener precio, pertenecer a categoría|Sí|
|Extra|Añadirse a un artículo, tener precio, tener límite|Sí|
|BloqueProduccion|Abrirse, llenarse, bloquearse cuando llega al límite|Sí|
|ArticuloPedido|Contener un producto, tener cantidad, tener personalizaciones|Sí|
|Cliente|Registrarse, pedir, ver historial, cancelar|Sí (requiere cuenta)|
|Usuario|Gestionar pedidos, forzar bloques, administrar carta|Sí|
|Ticket|Imprimirse|No — es una vista del Pedido|

</div>

### 5. Identificación de relaciones naturales

- "Un **pedido** contiene varios **artículos**"
- "Cada **artículo** refiere a un **producto**"
- "Un **artículo** puede tener **extras** añadidos"
- "Un **pedido** ocupa un **bloque de producción**"
- "Un **bloque** tiene capacidad máxima de 10 **hamburguesas**"
- "Un **cliente** puede tener **historial** de pedidos y rehacer el último"
- "Un **pedido** puede cancelarse hasta 15 minutos antes del bloque"

### 6. Decisiones críticas de modelado

#### ¿"Cliente" como entidad separada de "Usuario"?

**Análisis:**
- El cliente web necesita cuenta (email + contraseña) para ver historial
- Los pedidos por WhatsApp y teléfono no tienen cuenta asociada

> **Decisión: separar** — `Cliente` (cuenta web con historial) y `Usuario` (empleado/admin del sistema interno) son conceptos distintos con responsabilidades diferentes

#### ¿"Extra" como entidad o como texto libre?

**Análisis:**
- En la web: el cliente elige extras de una lista con precio definido
- En WhatsApp: la IA interpreta el texto y lo mapea a los mismos extras

> **Decisión: entidad** — `Extra` tiene nombre, precio y límite de cantidad. La IA lo mapea al mismo catálogo

#### ¿"ArticuloPedido" o "LineaPedido"?

> **Decisión: ArticuloPedido** — Terminología más natural para el negocio

#### ¿Cómo modelar la cancelación?

> **Regla de negocio:** Un pedido solo puede cancelarse si faltan más de 15 minutos para el inicio de su BloqueProduccion. Si el pago fue por Stripe, el reembolso se notifica por email (reintegro manual por Bizum).

### 7. Refinamiento de relaciones

<div align=center>

|Relación|Tipo|Justificación|
|-|-|-|
|Pedido - ArticuloPedido|Composición 1:1..*|Un pedido tiene al menos un artículo; los artículos no existen sin pedido|
|ArticuloPedido - Producto|Asociación *:1|Muchos artículos pueden referenciar el mismo producto|
|ArticuloPedido - Extra|Asociación *:*|Un artículo puede tener varios extras; un extra puede estar en varios artículos|
|Pedido - BloqueProduccion|Asociación *:1|Muchos pedidos pueden reservar el mismo bloque|
|Cliente - Pedido|Asociación 1:*|Un cliente registrado puede tener muchos pedidos|
|Usuario - Pedido|Asociación 1:*|Un empleado/admin puede gestionar muchos pedidos|

</div>

### 8. Modelo del dominio resultante

*(Ver diagramas.html para visualización gráfica)*

```plantuml
@startuml ModeloDominio

class Cliente {
  nombre: String
  email: String
  passwordHash: String
  telefono: String
}

class BloqueProduccion {
  horaInicio: Time
  horaFin: Time
  capacidadMax: Integer = 10
  hamburgesasOcupadas(): Integer
  disponible(): Boolean
}

class Pedido {
  numero: String
  canal: CanalPedido
  estado: EstadoPedido
  nombreCliente: String
  telefonoCliente: String
  emailCliente: String
  metodoPago: MetodoPago
  total: Decimal
  fechaCreacion: DateTime
  cancelable(): Boolean
}

class ArticuloPedido {
  cantidad: Integer
  precioUnitario: Decimal
  ingredientesExcluidos: String[]
}

class ArticuloPedidoExtra {
  cantidad: Integer
}

class Producto {
  nombre: String
  descripcion: String
  precio: Decimal
  categoria: CategoriaProducto
  ingredientesPorDefecto: String[]
  imagen: String
  activo: Boolean
}

class Extra {
  nombre: String
  precio: Decimal
  cantidadMaxima: Integer = 10
  activo: Boolean
}

class Usuario {
  nombre: String
  email: String
  passwordHash: String
  rol: RolUsuario
}

enum CanalPedido { WEB / WHATSAPP / TELEFONO }
enum EstadoPedido { PENDIENTE_PAGO / CONFIRMADO / EN_PREPARACION / LISTO / ENTREGADO / CANCELADO }
enum MetodoPago { STRIPE / TARJETA_LOCAL / EFECTIVO }
enum CategoriaProducto { HAMBURGUESA / PATATAS / BEBIDA }
enum RolUsuario { EMPLEADO / ADMIN }

Cliente "0..1" --> "*" Pedido : tiene historial de
BloqueProduccion "1" <-- "*" Pedido : reserva_en
Pedido "1" *-- "1..*" ArticuloPedido : contiene
ArticuloPedido "*" --> "1" Producto : refiere_a
ArticuloPedido "1" *-- "*" ArticuloPedidoExtra : incluye
ArticuloPedidoExtra "*" --> "1" Extra : refiere_a
Usuario "1" --> "*" Pedido : gestiona

@enduml
```

## Evolución del modelo

### Versión 0: Lista plana
```
Pedido, Hamburguesa, Producto, Ingrediente, Extra, Bloque,
Cliente, Empleado, Ticket, Estado, Pago, Canal...
```

### Versión 1: Primeras relaciones
```
Pedido contiene → ArticuloPedido
ArticuloPedido refiere → Producto
Pedido reserva → BloqueProduccion
```

### Versión 2: Refinamiento
- Se añade **Extra** como entidad (tiene precio y límite)
- Se añade **Cliente** separado de **Usuario** (cuenta web con historial)
- Se elimina **Ticket** (es una vista del Pedido)
- Se añade **ArticuloPedidoExtra** para la relación muchos-a-muchos con cantidad

### Versión 3: Modelo final
- Regla de negocio documentada: cancelación hasta 15 min antes del bloque
- WhatsApp y Teléfono: siempre pago en local
- Solo hamburguesas cuentan para el cupo del bloque
- Extra solo aplicable a hamburguesas y patatas (no bebidas)

## Conceptos considerados y descartados

<div align=center>

|Concepto|Motivo de descarte|
|-|-|
|Ticket|Es una representación del Pedido, no tiene vida propia|
|Ingrediente (entidad)|La exclusión se modela como lista de strings en ArticuloPedido|
|Turno|Absorbido por BloqueProduccion|

</div>

## Reglas de negocio clave

<div align=center>

|Regla|Descripción|
|-|-|
|RN-01|Un BloqueProduccion admite máximo 10 hamburguesas (no patatas ni bebidas)|
|RN-02|Los bloques se generan automáticamente de 20:30 a 23:00 cada 5 min (viernes, sábados y domingos)|
|RN-03|Un pedido solo puede cancelarse si faltan más de 15 minutos para el inicio del bloque|
|RN-04|Los pedidos por WhatsApp y Teléfono siempre pagan en local (nunca Stripe)|
|RN-05|Solo empleados y admin pueden forzar un bloque lleno|
|RN-06|Los extras solo son aplicables a hamburguesas y patatas, no a bebidas|
|RN-07|Si un pedido pagado con Stripe se cancela, el reembolso se notifica por email (Bizum manual)|
|RN-08|Al confirmar cualquier pedido, se imprime automáticamente un ticket en cocina|

</div>
