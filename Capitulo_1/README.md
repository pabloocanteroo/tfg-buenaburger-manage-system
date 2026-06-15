# Capítulo 1 — Introducción, motivación y objetivos

[◄ Volver al README principal](../README.md) · [Memoria completa del capítulo](../docs/capitulos/capitulo1.md) · [Contexto ampliado](../docs/CONTEXTO.md)

> **Disciplina:** contextualización del problema y definición de objetivos.
> **Qué se muestra aquí:** por qué este sistema existe, qué hueco real cubre que ninguna solución del mercado cubría, y qué se propuso construir.

---

## 1. El problema

Buena Burger es una hamburguesería artesanal *smash* de Oruña de Piélagos (Cantabria). Opera **solo en *take away*, viernes, sábado y domingo de 20:30 a 23:00**, atendiendo **50–80 pedidos por noche** con un equipo de 4 personas. La gestión es **manual**: una persona dedicada en exclusiva a teléfono y WhatsApp, y comandas escritas a mano.

Cuatro problemas derivan de ese modelo:

- **Errores en la toma de pedidos** → producto mal preparado, pérdida de materia prima y de cliente.
- **Coste laboral** de una persona dedicada solo a recibir pedidos (en una operación de 7,5 h/semana).
- **Sin trazabilidad**: no hay historial digital, ni datos para decidir.
- **Cuellos de botella en producción**: sin control de capacidad por franjas, los picos saturan la cocina y rompen la puntualidad —el valor central del negocio.

---

## 2. Estado del arte — tabla de síntesis

El análisis de las soluciones existentes demuestra que **ninguna cubre la gestión de capacidad por bloques de producción**, que es precisamente lo que Buena Burger necesita.

| Necesidad | Apps de cadenas | Plataformas delivery | TPV hostelería | Chatbots IA |
|---|:---:|:---:|:---:|:---:|
| Pedido anticipado con hora | ✅ | ❌ | ⚠️ | ⚠️ |
| **Gestión por bloques de producción** | ❌ | ❌ | ❌ | ❌ |
| Cobertura en zona rural | ✅ | ❌ | ✅ | ✅ |
| Coste accesible | ❌ | ❌ | ❌ | ✅ |
| Personalización del cliente | ✅ | ✅ | ✅ | ⚠️ |
| Multicanal (Web + WhatsApp) | ❌ | ❌ | ⚠️ | ⚠️ |
| Integración de pagos | ✅ | ✅ | ✅ | ❌ |
| Impresión automática de tickets | ✅ | ❌ | ✅ | ❌ |

> **Clave:** la columna que ninguna solución marca (bloques de producción) es el diferencial del proyecto. Todo lo demás existe en el mercado; esto no.

Detalle por categoría (McDonald's MyOrder, Glovo/Uber Eats/Just Eat, Ágora/Qamarero, chatbots OlaClick…) en la [memoria §1.2](../docs/capitulos/capitulo1.md#12-estado-del-arte).

---

## 3. Propuesta de solución

Una aplicación web de **gestión integral de pedidos multicanal** con cinco piezas:

1. **Web de pedidos** anticipados con selección de hora y pago (Stripe o en local).
2. **Asistente de WhatsApp con IA** (Claude) que interpreta lenguaje natural y crea pedidos.
3. **TPV** para pedidos telefónicos y presenciales.
4. **Sistema de bloques de producción** (5 min, 10 hamburguesas/bloque) — el núcleo diferencial.
5. **Panel de administración** con estadísticas, carta, empleados y calendario.

---

## 4. Hipótesis y objetivos

**Hipótesis:** un sistema multicanal con bloques de producción de capacidad limitada y un asistente IA en WhatsApp permite **automatizar** la recepción de pedidos, **reducir errores**, **optimizar recursos** y **mejorar la experiencia**, logrando una operación más eficiente y sostenible.

Cada objetivo específico se corresponde con un capítulo del trabajo —y con una carpeta de este repositorio:

| Objetivo específico | Capítulo |
|---|---|
| **OE1.** Analizar requisitos (FR y NFR), modelo del dominio, actores y casos de uso. | [Capítulo 2](../Capitulo_2/README.md) |
| **OE2.** Diseñar arquitectura, modelo de datos, interfaces e integraciones externas. | [Capítulo 3](../Capitulo_3/README.md) |
| **OE3.** Desarrollar la web y el asistente IA; verificar registro de pedidos y bloques. | [Capítulo 4](../Capitulo_4/README.md) |
| **OE4.** Evaluar desempeño y fiabilidad; validar el cumplimiento de objetivos. | [Capítulo 5](../Capitulo_5/README.md) |

---

## 5. Stack tecnológico y su justificación

| Componente | Tecnología | Por qué |
|---|---|---|
| Backend | Node.js + Express | Gestión en tiempo real, ecosistema maduro. Competencia de Programación Web. |
| Base de datos | MongoDB Atlas | Esquema flexible para pedidos con personalizaciones variables; cloud gratuito. |
| Frontend | HTML + CSS + JS vanilla | Sin framework, accesible desde cualquier dispositivo, carga inmediata. |
| Autenticación | JWT | Estándar *stateless*, seguro y ligero. |
| Pagos | Stripe | Pasarela con modo de pruebas y buena documentación. |
| Mensajería | Meta Cloud API | API oficial de WhatsApp Business. |
| IA | Anthropic API (Claude) | Interpretación de pedidos en lenguaje natural. |
| Impresión | WebSocket + ESC/POS | Impresión automática en tiempo real al confirmar el pedido. |
| Versionado | Git + GitHub | Trazabilidad completa del proceso. |

> **Metodología:** Scrum adaptado a un desarrollador, sprints de 2 semanas, con el propietario de Buena Burger como *Product Owner* validando cada incremento.

---

[◄ README principal](../README.md) · [Capítulo 2 — Requisitos ►](../Capitulo_2/README.md)
