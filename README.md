# TFG - Pablo Cantero

Sistema web de gestión integral de pedidos *take away* para **Buena Burger**, una hamburguesería artesanal de Oruña de Piélagos (Cantabria) que opera viernes, sábado y domingo. El sistema digitaliza la toma de pedidos por tres canales (web, WhatsApp con IA y teléfono/POS) y organiza la producción de cocina mediante un sistema de bloques horarios. Desarrollado con Node.js + Express, MongoDB Atlas, Socket.io, Stripe, Meta Cloud API y Claude (Anthropic).

## Índice general

### Capítulo 1 - Introducción y contexto
- [Capítulo 1 — Introducción, motivación y objetivos](docs/capitulos/capitulo1.md)
- [Contexto de la aplicación](docs/CONTEXTO.md)
- [Carta del negocio](docs/carta.md)

### Capítulo 2 - Análisis y requisitos
- [Capítulo 2 — Análisis y requisitos](docs/capitulos/capitulo2.md)
- [Modelo del dominio](docs/modeloDelDominio.md)
- [Proceso de requisitos](docs/ProcesoRequisitos.md)
- [Diagrama de clases del dominio](docs/diagramas/capitulo2/01-dominio.html)
- [Diagrama de contexto](docs/diagramas/capitulo2/02-contexto.html)
- [Diagrama de casos de uso](docs/diagramas/capitulo2/03-casos-uso.html)
- [Diagrama de estados del pedido](docs/diagramas/capitulo2/12-estados.html)
- [Diagrama de objetos](docs/diagramas/capitulo2/11-objetos.html)
- [Secuencia — Pedido web](docs/diagramas/capitulo2/04-pedido-web.html)
- [Secuencia — Pedido por WhatsApp](docs/diagramas/capitulo2/05-pedido-whatsapp.html)
- [Secuencia — Pedido telefónico](docs/diagramas/capitulo2/08-telefonico.html)
- [Secuencia — Modificar pedido](docs/diagramas/capitulo2/06-modificar.html)
- [Secuencia — Cancelar pedido](docs/diagramas/capitulo2/07-cancelar.html)
- [Secuencia — Imprimir ticket](docs/diagramas/capitulo2/09-ticket.html)
- [Secuencia — Reserva de bloques](docs/diagramas/capitulo2/10-bloques.html)

### Capítulo 3 - Diseño del sistema
- [Capítulo 3 — Diseño del sistema](docs/capitulos/capitulo3.docx)
- [Arquitectura en capas](docs/diagramas/capitulo3/01_capas_arquitectura.png)
- [Diagrama de componentes](docs/diagramas/capitulo3/08_componentes_arquitectura.png)
- [Diagrama de despliegue](docs/diagramas/capitulo3/09_despliegue_sistema.png)
- [Clases de análisis (MVC)](docs/diagramas/capitulo3/06_clases_analisis_mvc.png)
- [Paquetes de análisis](docs/diagramas/capitulo3/07_paquetes_analisis.png)
- [Clases de diseño](docs/diagramas/capitulo3/11_clases_diseno.png)
- [Modelo de datos (ERD)](docs/diagramas/capitulo3/10_modelo_datos_erd.png)
- [Colaboración — Pedido web](docs/diagramas/capitulo3/02_colaboracion_uc02_pedido_web.png)
- [Colaboración — Pedido telefónico](docs/diagramas/capitulo3/03_colaboracion_uc09_pedido_telefonico.png)
- [Colaboración — Imprimir ticket](docs/diagramas/capitulo3/04_colaboracion_uc11_imprimir_ticket.png)
- [Colaboración — Reserva de bloques](docs/diagramas/capitulo3/05_colaboracion_uc14_bloques_produccion.png)
- [Secuencia — Pago con Stripe](docs/diagramas/capitulo3/12_secuencia_stripe.png)
- [Secuencia — Asistente WhatsApp (IA)](docs/diagramas/capitulo3/13_secuencia_whatsapp.png)
- [Solución de impresión](docs/diagramas/capitulo3/14_solucion_impresion.png)
- [Prototipos de interfaz](docs/diagramas/capitulo3/15_interfaces_usuario.png)
- [Prototipo — Carta y carrito](docs/diagramas/capitulo3/15_ui_carta_carrito.png)

### Capítulo 4 - Implementación y solución propuesta
- [Capítulo 4 — Implementación](docs/capitulos/capitulo4.md)
- [Diagrama de navegación](docs/diagramas/capitulo4/01_diagrama_navegacion.png)
- [Solución de impresión (servidor → agente Raspberry Pi → impresora)](docs/diagramas/capitulo4/02_solucion_impresion.png)
- [Secuencia — Pedido web (detallada)](docs/diagramas/capitulo4/03_secuencia_pedido_web.png)
- [Cumplimiento VERI*FACTU](docs/VERIFACTU.md)
- [Guía de arranque](docs/ARRANQUE.md)
- [Guía de despliegue](docs/DEPLOY.md)

### Capítulo 5 - Evaluación y conclusiones
- [Capítulo 5 — Evaluación y conclusiones](docs/capitulos/capitulo5.md)

## Partes más importantes

- [Modelo del dominio](docs/modeloDelDominio.md) — punto de partida del análisis: entidades, relaciones y reglas de negocio.
- [Sistema de bloques de producción](docs/diagramas/capitulo3/05_colaboracion_uc14_bloques_produccion.png) — funcionalidad diferencial: franjas de 5 min con capacidad de 10 hamburguesas.
- [Asistente de WhatsApp con IA (Claude)](docs/diagramas/capitulo3/13_secuencia_whatsapp.png) — toma de pedidos en lenguaje natural y comprobación de disponibilidad.
- [Arquitectura en capas](docs/diagramas/capitulo3/01_capas_arquitectura.png) — separación presentación / API / servicios / datos.
- [Clases de análisis (MVC)](docs/diagramas/capitulo3/06_clases_analisis_mvc.png) — vista, controlador (un caso de uso) y modelo derivado del dominio.
- [Modelo de datos (ERD)](docs/diagramas/capitulo3/10_modelo_datos_erd.png) — colecciones MongoDB y subdocumentos del pedido.
- [Diagrama de despliegue](docs/diagramas/capitulo3/09_despliegue_sistema.png) — Render + MongoDB Atlas + Raspberry Pi de impresión.
- [Solución de impresión](docs/diagramas/capitulo4/02_solucion_impresion.png) — agente en Raspberry Pi que imprime ESC/POS desde la red local.
- [Secuencia del pedido web](docs/diagramas/capitulo4/03_secuencia_pedido_web.png) — validación de precios en servidor, reserva de bloques y notificación a cocina.
- [Secuencia del pago con Stripe](docs/diagramas/capitulo3/12_secuencia_stripe.png) — confirmación segura mediante webhook firmado.
- [Diagrama de casos de uso](docs/diagramas/capitulo2/03-casos-uso.html) — actores y casos de uso del sistema.
- [Diagrama de estados del pedido](docs/diagramas/capitulo2/12-estados.html) — transiciones provocadas por los casos de uso.

## Ejecución

```bash
npm install
npm start                   # http://localhost:3000
node src/seed.js --force    # datos iniciales (admin + carta de ejemplo)
```

Variables de entorno en `.env` (ver `.env.example`): `MONGODB_URI`, `JWT_SECRET`, `STRIPE_*`, `WHATSAPP_*`, `ANTHROPIC_API_KEY`.
