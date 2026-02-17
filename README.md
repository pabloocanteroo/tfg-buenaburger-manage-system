# Capítulo 1 — Introducción

## 1.1. Escenario y contextualización del problema

La industria de la restauración ha experimentado en los últimos años una transformación profunda impulsada por la digitalización de sus procesos operativos. Sin embargo, una gran parte de los pequeños negocios de hostelería en España, especialmente aquellos basados en el modelo take away, continúan gestionando sus operaciones de manera manual, lo que genera ineficiencias que afectan directamente a la rentabilidad y calidad del servicio.

Buena Burger es una hamburguesería artesanal de estilo americano ubicada en Oruña de Piélagos, Cantabria, que opera como servicio exclusivo de recogida take away los viernes, sábados y domingos de 20:30 a 23:00 horas. Desde su fundación en 2022, se ha posicionado como la primera hamburguesería de estilo smash de la región, diferenciándose por su enfoque en un producto fresco de 100% vacuno, una carta limitada y un compromiso firme con la puntualidad en la entrega de sus pedidos.

### 1.1.1. Funcionamiento operativo actual

El modelo operativo de Buena Burger se sustenta en un equipo de cuatro personas con roles claramente diferenciados: una persona encargada de la gestión de pedidos, un cocinero, un montador de hamburguesas y una persona que se encarga de entregar los pedidos en el punto de recogida.

La gestión de pedidos se realiza actualmente a través de dos canales: llamadas telefónicas y mensajes de WhatsApp, ambos son gestionados manualmente por la misma persona, la encargada de la gestión de pedidos. Una vez recibido el pedido, este se anota en comandas escritas a mano, que son trasladadas al equipo de cocina para su preparación. El negocio atiende entre 50 y 80 pedidos por noche de operación.

### 1.1.2. Problemática identificada

Esta gestión manual presenta una serie de problemas que impactan directamente en la operatividad y rentabilidad del negocio:

- **Errores en la toma de pedidos:** La anotación manual de los pedidos genera equivocaciones, ya sea por mala interpretación del cliente, errores al escribir o confusión de ingredientes y extras. Estos errores provocan la preparación incorrecta de hamburguesas, lo que se traduce en pérdida de materias primas, tiempo de producción desaprovechado y, en última instancia, insatisfacción del cliente.

- **Coste laboral innecesario:** La necesidad de mantener a una persona dedicada exclusivamente a la recepción de pedidos por teléfono y WhatsApp supone un coste salarial que podría reducirse significativamente mediante la automatización de este proceso. En un negocio que opera únicamente tres días a la semana, la optimización de cada recurso humano es especialmente crítica.

- **Ausencia de trazabilidad:** Al no existir un registro digital de los pedidos, no se dispone de un historial que permita analizar tendencias, patrones de consumo, horas de mayor demanda o rendimiento del negocio. Esto dificulta la toma de decisiones estratégicas basadas en datos.

- **Gestión de tiempos de producción:** La coordinación entre los pedidos recibidos y la capacidad productiva de la cocina se realiza de forma intuitiva, sin un sistema formal que gestione la carga de trabajo por franjas horarias. Esto puede generar cuellos de botella en las horas punta y tiempos muertos en las horas de menor actividad.

## 1.2. Estado del arte

La digitalización del sector de la hostelería en España ha avanzado de forma notable en los últimos años, aunque de manera desigual. Según un estudio de EY para la plataforma ConectadHos (Hostelería de España), la madurez digital media del sector se sitúa en 5,3 puntos sobre 10, frente a los 4,5 de 2021. Sin embargo, el subsector de restauración presenta un Índice de Madurez Digital del 38,9%, lo que evidencia un margen de mejora significativo, especialmente en los establecimientos más pequeños, donde la falta de presupuesto (35%) y la escasez de tiempo (22%) se identifican como las principales barreras para la adopción tecnológica (Ministerio de Industria y Turismo, 2024).

A continuación, se analizan las principales soluciones existentes en el mercado para la gestión digital de pedidos en negocios de restauración, categorizadas por su tipología.

### 1.2.1. Aplicaciones propias de grandes cadenas

Las grandes cadenas de restauración han desarrollado aplicaciones propias que permiten a los clientes realizar pedidos anticipados con selección de franja horaria y punto de recogida. El caso más representativo y cercano al modelo de negocio de Buena Burger es la aplicación MyOrder de McDonald's, que permite al cliente seleccionar productos del menú, personalizar ingredientes, elegir modalidad de recogida (mostrador, coche o drive-thru) y efectuar el pago de forma anticipada. La preparación del pedido se inicia cuando el cliente confirma su llegada al establecimiento, optimizando así los tiempos de producción y eliminando las esperas.

Este modelo de pedido anticipado con gestión de tiempos de producción es, conceptualmente, el más afín a las necesidades de Buena Burger. No obstante, estas soluciones son desarrollos a medida con inversiones millonarias, equipos de desarrollo propios y están diseñadas para operar a una escala completamente diferente, siendo inviables tanto económica como operativamente para un negocio independiente.

### 1.2.2. Plataformas de agregación y delivery

Plataformas como Glovo, Uber Eats o Just Eat ofrecen a los restaurantes un canal digital de venta con logística de reparto integrada. Sin embargo, estas soluciones presentan limitaciones importantes para el caso de Buena Burger:

- **Cobertura geográfica:** Buena Burger se ubica en Oruña de Piélagos, una localidad rural de Cantabria donde estas plataformas no disponen de cobertura operativa.
- **Modelo de negocio incompatible:** Estas plataformas aplican comisiones que oscilan entre el 20% y el 35% sobre cada pedido, un margen que un negocio artesanal con carta limitada y precios ajustados no puede asumir.
- **Pérdida de control:** El restaurante pierde el control sobre la experiencia del cliente, los tiempos de entrega y la relación directa con el consumidor, aspectos fundamentales para la filosofía de Buena Burger.
- **Sin gestión de capacidad productiva:** Aunque estas plataformas ofrecen la opción de recogida en local, no incorporan ningún mecanismo de control de capacidad de producción por franjas horarias. El restaurante recibe pedidos sin límite y sin organización temporal, lo que no resuelve el problema de gestión de bloques que Buena Burger necesita.

### 1.2.3. Sistemas TPV y software de gestión para hostelería

Existen numerosas soluciones de TPV (Terminal Punto de Venta) orientadas al sector hostelero en España, entre las que destacan Ágora, Qamarero, Foodeo, Square, Hiopos o iaTPV, entre otros. Estas plataformas ofrecen funcionalidades como la gestión de comandas digitales, pantallas de cocina (KDS), integración con plataformas de delivery, control de inventario y módulos de pedidos online.

Aunque son herramientas potentes y profesionales, presentan ciertas limitaciones frente a las necesidades específicas de Buena Burger:

- **Coste recurrente:** La mayoría opera bajo modelos de suscripción mensual que, sumados al coste de hardware específico (tablets, impresoras, datáfonos), representan una inversión significativa para un negocio que opera solo tres días a la semana.
- **Generalismo:** Son soluciones genéricas diseñadas para abarcar todo tipo de restaurantes (servicio en mesa, barra, delivery, etc.), lo que introduce complejidad innecesaria para un modelo exclusivamente de take away con carta reducida.
- **Ausencia de gestión por bloques de producción:** Ninguna de las soluciones analizadas incorpora un sistema de gestión de capacidad productiva basado en franjas temporales con limitación de unidades, una funcionalidad crítica para el modelo operativo de Buena Burger.

### 1.2.4. Chatbots e inteligencia artificial en la gestión de pedidos

La integración de la API de WhatsApp Business con chatbots impulsados por inteligencia artificial representa una tendencia emergente en el sector de la restauración. Estas soluciones permiten automatizar la toma de pedidos a través de WhatsApp, mostrando menús digitales, guiando al cliente en su selección y confirmando pedidos de forma autónoma, con posibilidad de derivar a un agente humano cuando sea necesario.

Herramientas como Qamarero, OlaClick o IntelliChat ofrecen módulos de chatbot para WhatsApp, aunque su alcance se limita generalmente a flujos predefinidos con respuestas simples. La incorporación de modelos de lenguaje avanzados (como los de OpenAI) permite conversaciones más naturales y la capacidad de interpretar pedidos complejos con personalizaciones de ingredientes, aunque su implementación específica para pequeños negocios de hostelería es aún incipiente.

### 1.2.5. Síntesis del análisis

La siguiente tabla resume el grado de adecuación de cada tipo de solución frente a las necesidades identificadas en Buena Burger:

| Necesidad | Apps de cadenas | Plataformas delivery | TPV hostelería | Chatbots IA |
|---|:---:|:---:|:---:|:---:|
| Pedido anticipado con hora | ✅ | ❌ | ⚠️ Parcial | ⚠️ Parcial |
| Gestión por bloques de producción | ✅ Interno | ❌ | ❌ | ❌ |
| Cobertura en zona rural | ✅ | ❌ | ✅ | ✅ |
| Coste accesible | ❌ | ❌ | ⚠️ Variable | ⚠️ Variable |
| Personalización de ingredientes | ✅ | ✅ | ✅ | ⚠️ Parcial |
| Multicanal (web + WhatsApp) | ❌ | ❌ | ⚠️ Parcial | ⚠️ Solo WhatsApp |
| Integración de pagos | ✅ | ✅ | ✅ | ❌ |
| Impresión automática de tickets | ✅ Interno | ❌ | ✅ | ❌ |

Como se observa, ninguna de las soluciones existentes cubre de forma integral todas las necesidades operativas de Buena Burger, especialmente la gestión de capacidad productiva por bloques temporales y la combinación de canales web y WhatsApp con IA en una solución unificada y económicamente viable para un pequeño negocio independiente.

## 1.3. Justificación de la propuesta

Del análisis realizado en el apartado anterior se desprende que, si bien existen soluciones tecnológicas maduras para la gestión de pedidos en restauración, ninguna de ellas se ajusta de forma integral a las necesidades específicas de Buena Burger. Las razones principales son:

1. **Las aplicaciones de grandes cadenas** (como MyOrder de McDonald's) ofrecen el modelo funcional más próximo al deseado —pedido anticipado, selección de hora, pago integrado y gestión de producción—, pero su desarrollo y mantenimiento requieren inversiones inasumibles para un negocio independiente. Además, se trata de soluciones cerradas y propietarias, no disponibles ni adaptables para terceros.

2. **Las plataformas de delivery** no operan en la zona geográfica del negocio y, aun si lo hicieran, sus comisiones y su enfoque en el reparto a domicilio sin control de capacidad productiva las hacen inadecuadas.

3. **Los sistemas TPV comerciales** aportan funcionalidades valiosas para la gestión interna (comandas, cocina, cobros), pero son soluciones generalistas con costes recurrentes que no contemplan la gestión de bloques de producción con capacidad limitada, ni la integración de un canal conversacional con inteligencia artificial.

4. **Las soluciones de chatbot para WhatsApp** son prometedoras, pero se encuentran en estado incipiente para el segmento de la pequeña hostelería y carecen de integración con módulos de pago y gestión de capacidad productiva.

En este contexto, se identifica la necesidad de desarrollar una **solución a medida** que combine las mejores prácticas observadas en el estado del arte —interfaz de pedido anticipado, gestión de bloques de producción, integración de pagos y automatización del canal de WhatsApp—, adaptándolas a la escala, presupuesto y particularidades operativas de un negocio independiente como Buena Burger.

Adicionalmente, este desarrollo permite al negocio **eliminar la dependencia de una persona dedicada exclusivamente a la gestión telefónica de pedidos**, reasignando ese recurso humano a tareas de mayor valor productivo, con el consecuente ahorro en costes laborales.

## 1.4. Propuesta de solución

Se propone el diseño y desarrollo de una **aplicación web de gestión integral de pedidos multicanal** para Buena Burger, denominada **Buena Burger Management System**. Esta aplicación cubrirá el ciclo completo del pedido, desde su recepción hasta su entrega, incorporando las siguientes capacidades fundamentales:

### 1.4.1. Gestión de pedidos vía web

Un portal web accesible desde cualquier dispositivo que permita a los clientes:

- Registrarse e iniciar sesión de forma segura.
- Consultar la carta con los productos, precios y opciones de personalización de ingredientes.
- Seleccionar una fecha y franja horaria de recogida, visualizando la disponibilidad en tiempo real.
- Confirmar y pagar su pedido de forma anticipada.
- Consultar su historial de pedidos y modificar o cancelar pedidos dentro del plazo permitido.

### 1.4.2. Gestión de pedidos vía WhatsApp con inteligencia artificial

Un asistente conversacional integrado con la API oficial de WhatsApp Business que, mediante un modelo de lenguaje de OpenAI, sea capaz de:

- Recibir pedidos en lenguaje natural, interpretando productos, personalizaciones e ingredientes.
- Consultar la disponibilidad de bloques de producción y sugerir alternativas en caso de falta de hueco.
- Confirmar pedidos automáticamente cuando haya disponibilidad.
- Derivar la conversación a un empleado humano si el cliente lo solicita.

### 1.4.3. Sistema de bloques de producción

Un algoritmo de asignación de capacidad que gestione la producción en bloques de 5 minutos, con un máximo de 10 hamburguesas por bloque. Este sistema:

- Controlará la ocupación de cada bloque en tiempo real.
- Asignará automáticamente los pedidos al bloque correspondiente según la hora solicitada.
- Distribuirá pedidos grandes (más de 10 hamburguesas) en bloques consecutivos.
- Liberará automáticamente los bloques en caso de cancelación o modificación.

### 1.4.4. Panel de administración y estadísticas

Un panel de control para el administrador del negocio que ofrezca:

- Visualización del calendario de bloques con su ocupación.
- Gestión de empleados (alta y baja).
- Cierre de días de operación.
- Estadísticas de ingresos, productos más vendidos, extras más utilizados y horas de mayor demanda.

### 1.4.5. Panel de empleados

Una interfaz rápida tipo punto de venta (POS) para que el personal del local pueda:

- Crear pedidos telefónicos de forma ágil (nombre, pedido y hora).
- Forzar pedidos en bloques llenos cuando sea necesario.

### 1.4.6. Integración de pagos y tickets

- Pasarela de pago mediante Stripe, con liberación automática del bloque si el pago falla.
- Impresión automática de tickets en impresora térmica mediante WebSocket al navegador del local, indicando el estado de pago del pedido.

## 1.5. Hipótesis y objetivos

### 1.5.1. Hipótesis

El desarrollo e implementación de una aplicación web de gestión integral de pedidos multicanal, con un sistema de bloques de producción con capacidad limitada y un asistente conversacional con inteligencia artificial integrado en WhatsApp, permitirá a Buena Burger automatizar la recepción y organización de pedidos, reducir los errores derivados de la gestión manual, optimizar la asignación de recursos humanos y mejorar la experiencia del cliente, resultando en una operación más eficiente y económicamente sostenible.

### 1.5.2. Objetivo general

Diseñar, desarrollar e implementar una aplicación web de gestión de pedidos multicanal para la hamburguesería Buena Burger, que integre un sistema de gestión de capacidad productiva por bloques temporales, una pasarela de pago online y un asistente conversacional con inteligencia artificial a través de WhatsApp, con el fin de digitalizar y optimizar el proceso completo de recepción, producción y entrega de pedidos.

### 1.5.3. Objetivos específicos

Los objetivos específicos del presente trabajo se estructuran en correspondencia directa con los capítulos del documento:

| Objetivo específico | Capítulo |
|---|---|
| **OE1.** Recopilar y analizar los requisitos funcionales y no funcionales del sistema de gestión de pedidos, incluyendo la interacción multicanal mediante web y WhatsApp, identificando actores, casos de uso y reglas de negocio. | Capítulo 2 |
| **OE2.** Diseñar la arquitectura del sistema y el modelo de datos, definiendo la estructura de la aplicación, el esquema de base de datos, las interfaces de usuario y la integración con los servicios externos (Stripe, WhatsApp Business API, OpenAI). | Capítulo 3 |
| **OE3.** Desarrollar e implementar la aplicación web y el asistente inteligente, asegurando que los pedidos realizados tanto a través de la web como de WhatsApp se registren automáticamente en el sistema y se gestionen correctamente mediante el algoritmo de bloques de producción. | Capítulo 4 |
| **OE4.** Evaluar el desempeño y la fiabilidad del sistema, midiendo la reducción de errores humanos y la mejora en la eficiencia de la gestión de pedidos, para validar el cumplimiento de los objetivos planteados. | Capítulo 5 |

## 1.6. Metodología

### 1.6.1. Metodología de desarrollo

Para el desarrollo de este proyecto se adopta una **metodología ágil basada en Scrum**, adaptada a las particularidades de un proyecto individual de trabajo de fin de grado. Esta elección se justifica por las siguientes razones:

- **Desarrollo iterativo e incremental:** Permite construir el sistema de forma progresiva, entregando funcionalidad en cada iteración y obteniendo retroalimentación temprana del cliente real (Buena Burger).
- **Adaptabilidad:** Al tratarse de un proyecto con un cliente real, los requisitos pueden evolucionar durante el desarrollo. Scrum facilita la incorporación de cambios sin comprometer la planificación global.
- **Trazabilidad:** Cada sprint produce artefactos documentados (backlog, tareas completadas, incremento funcional) que quedan registrados en el repositorio, facilitando la auditoría del proceso.

La adaptación de Scrum para un único desarrollador implica las siguientes simplificaciones:

| Elemento Scrum | Adaptación |
|---|---|
| Product Owner | El propietario de Buena Burger, quien valida los incrementos |
| Scrum Master | El propio alumno, gestionando el proceso |
| Equipo de desarrollo | El propio alumno |
| Sprint | Iteraciones de 2 semanas |
| Sprint Review | Demostración al cliente y/o director del TFG |
| Sprint Retrospective | Reflexión personal documentada en el repositorio |
| Product Backlog | Lista priorizada de funcionalidades en el repositorio |

### 1.6.2. Planificación temporal

El desarrollo del proyecto se organiza en las siguientes fases, alineadas con el calendario de entregas del TFG:

| Fase | Período | Entregable | Sprint(s) |
|---|---|---|---|
| **Fase 1** — Requisitos | Marzo - Abril | Capítulo 2: Modelo del dominio, actores, casos de uso, prototipos | Sprint 1-2 |
| **Fase 2** — Análisis y Diseño | Abril - Mayo | Capítulo 3: Arquitectura, clases de diseño, DER, diagramas | Sprint 3-4 |
| **Fase 3** — Implementación | Marzo - Mayo | Capítulo 4: Desarrollo del MVP funcional (en paralelo con Fases 1 y 2) | Sprint 1-6 |
| **Fase 4** — Evaluación y cierre | Mayo | Capítulo 5: Pruebas, conclusiones, futuras líneas | Sprint 6-7 |

> **Nota:** La implementación se desarrolla de forma continua y paralela a las fases de requisitos y diseño, aprovechando la naturaleza iterativa de la metodología ágil. Cada sprint produce un incremento funcional del sistema.

### 1.6.3. Stack tecnológico

La selección de tecnologías responde a criterios de adecuación al proyecto, madurez, coste y facilidad de despliegue:

| Componente | Tecnología | Justificación |
|---|---|---|
| Backend | Node.js + Express | Entorno asíncrono ideal para gestión de pedidos en tiempo real, amplia comunidad y documentación |
| Base de datos | MongoDB Atlas | Base de datos documental flexible, ideal para esquemas de pedidos con personalizaciones variables, con servicio cloud gratuito |
| Frontend | HTML + CSS + JavaScript | Sin dependencia de frameworks, máximo control y rendimiento, accesible desde cualquier dispositivo |
| Autenticación | JWT (JSON Web Tokens) | Estándar de autenticación stateless, seguro y ligero |
| Pagos | Stripe | Pasarela de pagos líder con excelente documentación y modo de pruebas gratuito |
| WhatsApp | Meta Cloud API | API oficial de WhatsApp Business para comunicación automatizada |
| Inteligencia artificial | OpenAI API | Modelos de lenguaje para interpretación de pedidos en lenguaje natural |
| Impresión | WebSocket | Comunicación en tiempo real para impresión automática de tickets en el navegador del local |
| Control de versiones | Git + GitHub | Trazabilidad total del proceso de desarrollo |

---

