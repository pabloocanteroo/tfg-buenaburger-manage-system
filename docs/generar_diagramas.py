import subprocess, os, sys

OUT = r"C:\Users\PabloCantero\Desktop\TFG\tfg-buenaburger-manage-system\docs\diagramas_capitulo3"
os.makedirs(OUT, exist_ok=True)

diagrams = {}

# ─── 01 CAPAS ARQUITECTURA ────────────────────────────────────────────────────
diagrams["01_capas_arquitectura"] = """
flowchart TD
    subgraph PRES["🖥️  Capa de Presentación"]
        direction LR
        H["HTML"]
        C["CSS"]
        J["JavaScript vanilla"]
    end
    subgraph APP["⚙️  Capa de Aplicación"]
        direction LR
        E["Express.js"]
        R["Rutas y Controladores"]
        JWT["Middleware JWT / Rol"]
    end
    subgraph DOM["📦  Capa de Dominio"]
        direction LR
        M["Modelos Mongoose"]
        S["Servicios de negocio"]
    end
    subgraph INF["🔧  Capa de Infraestructura"]
        direction LR
        DB["MongoDB Atlas"]
        SOCK["Socket.io"]
        STR["Stripe SDK"]
        META["Meta Cloud API"]
        OAI["OpenAI API"]
        CRON["node-cron"]
        PRINT["ESC/POS TCP"]
    end
    PRES -->|"fetch / WebSocket"| APP
    APP --> DOM
    DOM <--> INF

    style PRES fill:#dbeafe,stroke:#2563eb,color:#1e40af
    style APP  fill:#dcfce7,stroke:#16a34a,color:#14532d
    style DOM  fill:#fef9c3,stroke:#ca8a04,color:#713f12
    style INF  fill:#fce7f3,stroke:#db2777,color:#831843
"""

# ─── 02 COLABORACION UC-02 ────────────────────────────────────────────────────
diagrams["02_colaboracion_uc02_pedido_web"] = """
sequenceDiagram
    actor C as Cliente
    participant VC as VistaCarta
    participant VCar as VistaCarrito
    participant VCH as VistaCheckout
    participant CTRL as RealizarPedidoWebController
    participant BP as BloqueProduccion
    participant P as Pedido
    participant SS as StripeService

    C->>VC: 1. Accede a la carta
    VC->>CTRL: 2. getProductosActivos()
    CTRL-->>VC: lista de productos
    C->>VCar: 3. Añade productos y personalizaciones
    C->>VCH: 4. Confirma carrito e introduce datos
    VCH->>CTRL: 5. realizarPedido(datos, bloqueDeseado)
    CTRL->>BP: 6. verificarDisponibilidad(fecha, hora)
    BP-->>CTRL: bloque disponible
    CTRL->>P: 7. crear(lineas, cliente, bloque)
    P-->>CTRL: pedido PENDIENTE_PAGO
    CTRL->>SS: 8. crearSesionPago(total, pedidoId)
    SS-->>CTRL: urlPago
    CTRL-->>VCH: 9. redirigir a Stripe
    SS->>CTRL: 10. webhook checkout.session.completed
    CTRL->>P: 11. estado = CONFIRMADO, ticketImpreso = false
    P-->>CTRL: ok
    CTRL-->>C: 12. Confirmación con número de pedido
"""

# ─── 03 COLABORACION UC-09 ────────────────────────────────────────────────────
diagrams["03_colaboracion_uc09_pedido_telefonico"] = """
sequenceDiagram
    actor E as Empleado
    participant VP as VistaPOS
    participant CTRL as PedidoTelefonicoController
    participant BP as BloqueProduccion
    participant P as Pedido

    E->>VP: 1. Introduce datos del cliente y productos
    VP->>CTRL: 2. crearPedidoTelefonico(datos, bloqueId)
    CTRL->>BP: 3. verificarDisponibilidad(bloqueId)
    alt Bloque disponible
        BP-->>CTRL: capacidad OK
        CTRL->>P: 4. crear(canal=TELEFONO, metodoPago=PAGO_EN_LOCAL)
        P-->>CTRL: pedido CONFIRMADO
    else Bloque lleno + empleado fuerza
        BP-->>CTRL: capacidad excedida
        E->>VP: 5. Activa "Forzar bloque"
        VP->>CTRL: 6. crearPedidoForzado(datos, bloqueId)
        CTRL->>P: 7. crear omitiendo validación de capacidad
        P-->>CTRL: pedido CONFIRMADO
    end
    CTRL-->>VP: 8. Mostrar número de pedido al empleado
"""

# ─── 04 COLABORACION UC-11 ────────────────────────────────────────────────────
diagrams["04_colaboracion_uc11_imprimir_ticket"] = """
sequenceDiagram
    participant CTRL as ImprimirTicketController
    participant P as Pedido
    participant SS as SocketService
    participant PS as PrinterService
    participant COC as PantallaCocina

    Note over CTRL: Pedido pasa a CONFIRMADO
    CTRL->>P: 1. findById(pedidoId).populate(lineas)
    P-->>CTRL: documento completo con extras y horaRecogida
    CTRL->>SS: 2. emit("nuevo-pedido", room="staff", datosPedido)
    SS->>COC: 3. evento WebSocket → actualizar lista + alerta sonora
    CTRL->>PS: 4. imprimir(pedido)
    alt Impresora disponible
        PS-->>CTRL: ok
        CTRL->>P: 5. ticketImpreso = true
    else Impresora no disponible
        PS-->>CTRL: error TCP
        Note over CTRL,P: ticketImpreso queda en false
    end
    Note over COC: Al reconectarse, solicita pedidos con ticketImpreso=false
    COC->>CTRL: 6. getPendientesImpresion()
    CTRL->>PS: 7. imprimir cada pendiente en orden
"""

# ─── 05 COLABORACION UC-14 ────────────────────────────────────────────────────
diagrams["05_colaboracion_uc14_bloques_produccion"] = """
sequenceDiagram
    participant SCH as BloqueScheduler
    participant BP as BloqueProduccion
    participant CTRL as GestionarBloqueController
    actor A as Administrador

    Note over SCH: Al arrancar el servidor
    SCH->>SCH: 1. calcularDiasOperativos(hoy, hoy+60d)
    Note right of SCH: Filtra viernes, sábados y domingos
    loop Por cada día operativo
        SCH->>BP: 2. insertMany(30 bloques de 5 min, 20:30→23:00, capacidadMax=10)
        Note right of BP: Índice único {fecha,horaInicio}<br/>ignora duplicados silenciosamente
    end
    BP-->>SCH: ok

    Note over SCH: Cada medianoche (cron job)
    SCH->>SCH: 3. desplazar ventana un día hacia adelante
    SCH->>BP: 4. insertMany(bloques nuevo día)

    A->>CTRL: 5. cerrarBloque(bloqueId)
    CTRL->>BP: 6. update({_id}, {cerrado: true})
    BP-->>CTRL: ok
    CTRL-->>A: Bloque cerrado — no visible para clientes
"""

# ─── 06 CLASES ANALISIS MVC ───────────────────────────────────────────────────
diagrams["06_clases_analisis_mvc"] = """
classDiagram
    namespace Modelo {
        class Cliente {
            +nombre: String
            +telefono: String
            +email: String
        }
        class ClienteRegistrado {
            +passwordHash: String
        }
        class ClienteInvitado
        class Pedido {
            +numero: String
            +canal: enum
            +estado: enum
            +metodoPago: enum
            +total: Number
        }
        class LineaPedido {
            +nombre: String
            +cantidad: Number
            +precioUnitario: Number
        }
        class ExtraLinea {
            +nombre: String
            +cantidad: Number
            +precio: Number
        }
        class Producto {
            +nombre: String
            +precio: Number
            +categoria: enum
            +activo: Boolean
        }
        class Extra {
            +nombre: String
            +precio: Number
            +cantidadMaxima: Number
        }
        class BloqueProduccion {
            +fecha: String
            +horaInicio: String
            +capacidadMax: Number
            +hamburgesasOcupadas: Number
            +cerrado: Boolean
        }
        class Usuario {
            +nombre: String
            +rol: enum
            +activo: Boolean
        }
    }
    namespace Vista {
        class VistaCarta
        class VistaCarrito
        class VistaCheckout
        class VistaPerfil
        class VistaPOS
        class VistaAdministracion
        class VistaCocina
        class VistaWhatsApp
    }
    namespace Controlador {
        class RealizarPedidoWebController
        class PedidoTelefonicoController
        class PedidoWhatsAppController
        class ModificarPedidoController
        class CancelarPedidoController
        class ImprimirTicketController
        class GestionarBloqueController
        class GestionarCartaController
        class EstadisticasController
        class GestionarEmpleadosController
    }
    Cliente <|-- ClienteRegistrado
    Cliente <|-- ClienteInvitado
    Pedido "1" *-- "1..*" LineaPedido
    LineaPedido "1" *-- "0..*" ExtraLinea
    LineaPedido --> Producto
    ExtraLinea --> Extra
    Pedido --> BloqueProduccion
    Cliente "0..1" --> "0..*" Pedido
"""

# ─── 07 PAQUETES ANALISIS ─────────────────────────────────────────────────────
diagrams["07_paquetes_analisis"] = """
flowchart TD
    subgraph PC["📦 presentacion.cliente"]
        VCA["VistaCarta"]
        VCAR["VistaCarrito"]
        VCH["VistaCheckout"]
        VPE["VistaPerfil"]
    end
    subgraph PS["📦 presentacion.staff"]
        VP["VistaPOS"]
        VA["VistaAdministracion"]
        VCO["VistaCocina"]
    end
    subgraph PW["📦 presentacion.whatsapp"]
        VW["VistaWhatsApp"]
    end
    subgraph AP["📦 aplicacion"]
        CTRL1["RealizarPedidoWebController"]
        CTRL2["PedidoTelefonicoController"]
        CTRL3["ImprimirTicketController"]
        CTRL4["GestionarBloqueController"]
        CTRL5["... +11 controladores"]
    end
    subgraph DOM["📦 dominio"]
        CL["Cliente / ClienteRegistrado / ClienteInvitado"]
        PE["Pedido / LineaPedido / ExtraLinea"]
        PR["Producto / Extra"]
        BL["BloqueProduccion"]
        US["Usuario"]
    end
    subgraph INF["📦 infraestructura"]
        SCH["BloqueScheduler"]
        PRINT["PrinterService"]
        SOCK["SocketService"]
        STR["StripeService"]
        WA["WhatsAppService"]
        EM["EmailService"]
    end

    PC --> AP
    PS --> AP
    PW --> AP
    AP --> DOM
    INF --> DOM

    style PC  fill:#dbeafe,stroke:#3b82f6
    style PS  fill:#dbeafe,stroke:#3b82f6
    style PW  fill:#dbeafe,stroke:#3b82f6
    style AP  fill:#dcfce7,stroke:#22c55e
    style DOM fill:#fef9c3,stroke:#eab308
    style INF fill:#fce7f3,stroke:#ec4899
"""

# ─── 08 COMPONENTES ARQUITECTURA ─────────────────────────────────────────────
diagrams["08_componentes_arquitectura"] = """
flowchart LR
    subgraph CLIENT["🌐 Cliente (Navegador)"]
        FE["Frontend multipágina\nHTML / CSS / JS vanilla\nindex · pos · admin · empleados"]
    end
    subgraph SERVER["☁️ Servidor Node.js + Express — Render"]
        API["API REST\n/api/auth\n/api/productos\n/api/extras\n/api/bloques\n/api/pedidos\n/api/admin"]
        WS["WebSocket\nSocket.io"]
        WEBHOOK["Webhook\nPOST /api/pedidos/stripe/webhook\nPOST /api/whatsapp/webhook"]
        SCHED["BloqueScheduler\nnode-cron"]
    end
    subgraph EXT["🔗 Servicios Externos"]
        MONGO["MongoDB Atlas"]
        STRIPE["Stripe API"]
        META["Meta Cloud API\nWhatsApp Business"]
        OPENAI["OpenAI API"]
        SMTP["SMTP Mail"]
    end
    subgraph LOCAL["🏠 Red Local del Restaurante"]
        IPAD["iPad Cocina\n(cocina.html)"]
        PRINTER["Impresora Térmica\nESC/POS"]
    end

    CLIENT <-->|"HTTPS fetch"| API
    CLIENT <-->|"WebSocket"| WS
    API --> MONGO
    API --> STRIPE
    API --> META
    API --> OPENAI
    API --> SMTP
    STRIPE -->|webhook| WEBHOOK
    META -->|webhook| WEBHOOK
    WS <-->|"WebSocket"| IPAD
    IPAD -->|"window.print()"| PRINTER
    SCHED --> MONGO

    style CLIENT fill:#dbeafe,stroke:#3b82f6
    style SERVER fill:#dcfce7,stroke:#16a34a
    style EXT    fill:#fce7f3,stroke:#db2777
    style LOCAL  fill:#fef9c3,stroke:#ca8a04
"""

# ─── 09 DESPLIEGUE ────────────────────────────────────────────────────────────
diagrams["09_despliegue_sistema"] = """
flowchart TD
    subgraph MOVIL["📱 Dispositivo Cliente\n(móvil / escritorio)"]
        NAV["Navegador Web\nChrome / Safari / Firefox"]
    end
    subgraph RENDER["☁️ Render — Nube"]
        subgraph NODE["Node.js Runtime"]
            EXP["Express Server\n:10000"]
            SIO["Socket.io Server"]
            CRON["node-cron"]
        end
    end
    subgraph ATLAS["☁️ MongoDB Atlas"]
        DB[("Base de datos\nBuenaBurger")]
    end
    subgraph STRIPE_EXT["💳 Stripe"]
        STRIPE_API["Stripe Checkout API\nStripe Webhooks"]
    end
    subgraph META_EXT["💬 Meta Cloud"]
        WA_API["WhatsApp Business API"]
    end
    subgraph OPENAI_EXT["🤖 OpenAI"]
        GPT["GPT-4o API"]
    end
    subgraph LOCAL["🏠 Local del Restaurante"]
        IPAD2["iPad — empleados.html"]
        IMPR["Impresora Térmica\nESC/POS"]
    end

    NAV <-->|"HTTPS"| EXP
    NAV <-->|"WSS"| SIO
    EXP <-->|"Mongoose TCP"| DB
    CRON -->|"insertMany"| DB
    EXP <-->|"HTTPS"| STRIPE_API
    STRIPE_API -->|"webhook HTTPS"| EXP
    EXP <-->|"HTTPS"| WA_API
    WA_API -->|"webhook HTTPS"| EXP
    EXP -->|"HTTPS"| GPT
    SIO <-->|"WSS"| IPAD2
    IPAD2 -->|"USB/BT print"| IMPR

    style MOVIL      fill:#dbeafe,stroke:#3b82f6
    style RENDER     fill:#dcfce7,stroke:#16a34a
    style ATLAS      fill:#fef9c3,stroke:#ca8a04
    style STRIPE_EXT fill:#f3e8ff,stroke:#9333ea
    style META_EXT   fill:#fce7f3,stroke:#db2777
    style OPENAI_EXT fill:#ffedd5,stroke:#ea580c
    style LOCAL      fill:#e0f2fe,stroke:#0284c7
"""

# ─── 10 MODELO DATOS ERD ─────────────────────────────────────────────────────
diagrams["10_modelo_datos_erd"] = """
erDiagram
    clientes {
        ObjectId _id PK
        String nombre
        String telefono
        String email
        String tipo "ClienteRegistrado | ClienteInvitado"
        String passwordHash "solo ClienteRegistrado"
    }
    usuarios {
        ObjectId _id PK
        String nombre
        String email
        String passwordHash
        String rol "EMPLEADO | ADMIN"
        Boolean activo
    }
    productos {
        ObjectId _id PK
        String nombre
        Number precio
        String categoria "HAMBURGUESA|PATATAS|BEBIDA|POSTRE|SALSA"
        Array ingredientesPorDefecto
        String imagen
        Boolean activo
    }
    extras {
        ObjectId _id PK
        String nombre
        Number precio
        Number cantidadMaxima
        Boolean activo
    }
    bloqueproducions {
        ObjectId _id PK
        String fecha "YYYY-MM-DD"
        String horaInicio "HH:MM"
        String horaFin "HH:MM"
        Number capacidadMax
        Number hamburgesasOcupadas
        Boolean cerrado
    }
    pedidos {
        ObjectId _id PK
        String numero "BB-YYYYMMDD-NNNN"
        ObjectId cliente FK
        String nombreCliente
        String canal "WEB|WHATSAPP|TELEFONO"
        String estado "PENDIENTE_PAGO|CONFIRMADO|EN_PREPARACION|LISTO|ENTREGADO|CANCELADO"
        String metodoPago "STRIPE|PAGO_EN_LOCAL"
        Number total
        Boolean ticketImpreso
        Date horaRecogida
    }
    lineas_pedido {
        ObjectId pedido FK
        ObjectId producto FK
        String nombre "desnormalizado"
        Number precioUnitario "desnormalizado"
        Number cantidad
        Array ingredientesExcluidos
        Array ingredientesAnadidos
    }
    extras_linea {
        ObjectId lineaPedido FK
        ObjectId extra FK
        String nombre "desnormalizado"
        Number precio "desnormalizado"
        Number cantidad
    }

    clientes    ||--o{ pedidos         : "realiza"
    pedidos     ||--|{ lineas_pedido   : "contiene"
    lineas_pedido }o--|| productos     : "referencia"
    lineas_pedido ||--o{ extras_linea  : "lleva"
    extras_linea  }o--|| extras        : "referencia"
    pedidos      }o--|{ bloqueproducions : "reserva"
"""

# ─── 11 CLASES DISEÑO ─────────────────────────────────────────────────────────
diagrams["11_clases_diseno"] = """
classDiagram
    class ClienteModel {
        +nombre: String
        +telefono: String
        +email: String
        +tipo: String
        +createdAt: Date
    }
    class PedidoModel {
        +numero: String
        +canal: String
        +estado: String
        +metodoPago: String
        +total: Number
        +ticketImpreso: Boolean
        +horaRecogida: Date
        +modificable() Boolean
        +cancelable() Boolean
    }
    class ProductoModel {
        +nombre: String
        +precio: Number
        +categoria: String
        +activo: Boolean
    }
    class BloqueProduccionModel {
        +fecha: String
        +horaInicio: String
        +capacidadMax: Number
        +hamburgesasOcupadas: Number
        +cerrado: Boolean
        +disponible() Boolean
    }
    class SocketService {
        -io: Server
        +init(io: Server)
        +getIo() Server
        +emitNuevoPedido(pedido)
    }
    class PrinterService {
        +imprimir(pedido: Pedido)
        -construirESCPOS(pedido) Buffer
        -enviarTCP(ip, puerto, data)
    }
    class BloqueScheduler {
        +iniciar()
        -generarBloques(desde, hasta)
        -esDiaOperativo(fecha) Boolean
    }
    class StripeService {
        +crearSesion(pedido) String
        +verificarWebhook(payload, sig) Event
    }
    PedidoModel --> BloqueProduccionModel : reserva
    PedidoModel --> ClienteModel : pertenece
    SocketService ..> PedidoModel : emite evento
    PrinterService ..> PedidoModel : imprime
    BloqueScheduler ..> BloqueProduccionModel : genera
    StripeService ..> PedidoModel : confirma pago
"""

# ─── 12 SECUENCIA STRIPE ─────────────────────────────────────────────────────
diagrams["12_secuencia_stripe"] = """
sequenceDiagram
    actor C as Cliente
    participant FE as Frontend
    participant BE as Backend Node.js
    participant ST as Stripe API
    participant DB as MongoDB

    C->>FE: 1. Confirma pedido con pago Stripe
    FE->>BE: 2. POST /api/pedidos {canal:WEB, metodoPago:STRIPE}
    BE->>DB: 3. Crear pedido (estado: PENDIENTE_PAGO)
    DB-->>BE: pedidoId
    BE->>ST: 4. stripe.checkout.sessions.create(lineItems, metadata:{pedidoId})
    ST-->>BE: {id, url}
    BE-->>FE: 5. {urlPago}
    FE->>C: 6. Redirige a página de pago Stripe
    C->>ST: 7. Introduce datos de tarjeta y paga
    ST-->>C: 8. Redirige a /success?pedidoId=...
    ST->>BE: 9. POST /api/pedidos/stripe/webhook (checkout.session.completed)
    Note over BE: Verifica firma con STRIPE_WEBHOOK_SECRET
    BE->>DB: 10. update pedido → estado: CONFIRMADO, stripePagado: true
    BE->>BE: 11. emitir Socket.io "nuevo-pedido" + imprimir ticket
    BE-->>ST: 200 OK
    FE->>BE: 12. GET /api/pedidos/:id (página success)
    BE-->>FE: datos del pedido confirmado
    FE->>C: 13. Pantalla de confirmación con número de pedido
"""

# ─── 13 SECUENCIA WHATSAPP ────────────────────────────────────────────────────
diagrams["13_secuencia_whatsapp"] = """
sequenceDiagram
    actor C as Cliente WhatsApp
    participant META as Meta Cloud API
    participant BE as Backend Node.js
    participant OAI as OpenAI API
    participant DB as MongoDB
    actor ADM as Administrador

    C->>META: 1. Envía mensaje de WhatsApp
    META->>BE: 2. POST /api/whatsapp/webhook {from, message}
    BE->>DB: 3. Recuperar historial de conversación (by phone)
    DB-->>BE: mensajes anteriores
    BE->>OAI: 4. chat.completions.create(systemPrompt+carta+historial+mensaje)
    Note right of OAI: systemPrompt incluye carta actual,<br/>reglas de bloques e instrucciones
    OAI-->>BE: 5. {respuesta, acción?}
    alt Acción: crear pedido
        BE->>DB: 6. Crear pedido (canal: WHATSAPP)
        DB-->>BE: pedido creado
        BE->>META: 7. Confirmar pedido al cliente
    else Acción: consultar disponibilidad
        BE->>DB: 6. Consultar bloques disponibles
        DB-->>BE: bloques
        BE->>META: 7. Informar franjas horarias disponibles
    else Escalar a humano
        BE->>ADM: 6. Email con historial y teléfono del cliente
        BE->>META: 7. Avisar al cliente que un agente le contactará
    else Respuesta conversacional
        BE->>META: 6. Enviar respuesta al cliente
    end
    META-->>C: Mensaje de respuesta
    BE->>DB: 8. Guardar turno en historial
"""

# ─── 14 SOLUCION IMPRESION ────────────────────────────────────────────────────
diagrams["14_solucion_impresion"] = """
flowchart LR
    subgraph NUBE["☁️ Servidor en Render (Nube)"]
        CTRL["ImprimirTicketController"]
        SOCK["Socket.io\nemit nuevo-pedido"]
        DB[("MongoDB\nticketImpreso: false")]
    end
    subgraph LOCAL["🏠 Red Local del Restaurante"]
        IPAD["iPad Cocina\ncocina.html"]
        PRINT["Impresora\nUSB / Bluetooth"]
    end

    CTRL -->|"1. evento WebSocket"| SOCK
    SOCK -->|"2. WSS nuevo-pedido"| IPAD
    IPAD -->|"3. window.print()"| PRINT

    CTRL -->|"ticketImpreso=false si falla"| DB
    IPAD -->|"4. Al reconectar:\nGET pedidos pendientes"| CTRL
    CTRL -->|"5. Reenvía eventos pendientes"| SOCK

    style NUBE  fill:#dcfce7,stroke:#16a34a
    style LOCAL fill:#fef9c3,stroke:#ca8a04
"""

# ─── 15 INTERFACES UI ─────────────────────────────────────────────────────────
diagrams["15_interfaces_usuario"] = """
flowchart TD
    subgraph PUB["🌐 Interfaz Pública — index.html"]
        CARTA["Carta\nProductos por categoría\n+ filtros rápidos"]
        MODAL["Modal personalización\nQuitar/añadir ingredientes\nSeleccionar extras"]
        CH1["Checkout Paso 1\nNombre · Teléfono · Email\nInvitado o cuenta"]
        CH2["Checkout Paso 2\nSelección fecha y bloque horario\nDisponibilidad en tiempo real"]
        CH3["Checkout Paso 3\nMétodo de pago\nStripe o Pago en local"]
        CONF["Confirmación\nNúmero de pedido + hora recogida"]
        PERFIL["Mi Perfil\nHistorial de pedidos\nBotón Repetir al carrito"]
    end
    subgraph STAFF["👷 Interfaz Staff"]
        POS["pos.html — POS\nProductos de selección rápida\nResumen pedido · Forzar bloque"]
        ADM["admin.html — Administración\nPedidos · Bloques · Carta\nExtras · Empleados · Estadísticas"]
        EMP["empleados.html\nGestión de cuentas de empleados"]
    end
    subgraph COC["🍳 Pantalla Cocina"]
        KIT["cocina.html\nLista pedidos en tiempo real\nHora recogida · Artículos · Extras\nBotón reimprimir ticket"]
    end

    CARTA --> MODAL --> CH1 --> CH2 --> CH3 --> CONF
    CONF -.->|cliente registrado| PERFIL

    style PUB   fill:#dbeafe,stroke:#3b82f6
    style STAFF fill:#dcfce7,stroke:#16a34a
    style COC   fill:#fef9c3,stroke:#ca8a04
"""

# ─── RENDER ───────────────────────────────────────────────────────────────────
import tempfile, shutil

tmp = tempfile.mkdtemp()
errors = []

for name, content in diagrams.items():
    mmd_path = os.path.join(tmp, f"{name}.mmd")
    out_path = os.path.join(OUT, f"{name}.png")

    with open(mmd_path, "w", encoding="utf-8") as f:
        f.write(content.strip())

    result = subprocess.run(
        f'npx mmdc -i "{mmd_path}" -o "{out_path}" -b white -w 1400 --scale 2',
        capture_output=True, text=True, timeout=60, shell=True
    )

    if result.returncode != 0:
        errors.append(f"FAIL {name}: {result.stderr[:200]}")
        print(f"FAIL {name}")
        print(result.stderr[:300])
    else:
        size = os.path.getsize(out_path)
        print(f"OK {name} ({size//1024} KB)")

shutil.rmtree(tmp)

print("\n" + ("-"*50))
if errors:
    print("ERRORES:")
    for e in errors:
        print(e)
else:
    print("Todos los diagramas generados correctamente.")
print(f"📁 Carpeta: {OUT}")
