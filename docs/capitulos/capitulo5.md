# Capítulo 5 – Conclusiones, discusión de resultados, recomendaciones y futuras líneas de actuación

## 5.1 Conclusiones

Este capítulo cierra el ciclo de desarrollo del Trabajo de Fin de Grado, verificando en qué medida los resultados obtenidos dan respuesta a la hipótesis planteada en el Capítulo 1 y demostrando el cumplimiento de cada uno de los objetivos específicos.

### 5.1.1 Verificación de la hipótesis

La hipótesis de partida establecía que el desarrollo de una aplicación web de gestión integral de pedidos multicanal, con un sistema de bloques de producción de capacidad limitada y un asistente conversacional con inteligencia artificial integrado en WhatsApp Business, permitiría a Buena Burger automatizar la recepción de pedidos, reducir los errores humanos derivados de la gestión manual, optimizar los recursos humanos y mejorar la experiencia del cliente, consiguiendo una operación más eficiente y económicamente sostenible.

El sistema implementado demuestra que dicha hipótesis es válida:

- La recepción de pedidos se ha automatizado a través del portal web y el canal de WhatsApp con IA, eliminando la necesidad de que una persona gestione manualmente estas vías de entrada.
- Los errores de interpretación de comandas escritas a mano han sido eliminados, al quedar cada pedido registrado digitalmente con todas sus personalizaciones validadas por el servidor.
- El sistema de bloques de producción controla en tiempo real la capacidad de la cocina, impidiendo que se acumulen más pedidos de los que el equipo puede atender en cada franja de 5 minutos.
- El canal telefónico sigue siendo atendido por el staff, pero ahora a través del TPV, que guía al empleado en el proceso de registro y elimina posibles errores de anotación.

En consecuencia, la hipótesis se considera **verificada**, y el sistema desarrollado cumple con los objetivos para los que fue diseñado.

### 5.1.2 Cumplimiento de los objetivos específicos

Los cuatro objetivos específicos definidos en el Capítulo 1 han sido abordados en los capítulos correspondientes del trabajo. A continuación, se presenta la evidencia de cumplimiento de cada uno.

---

**OE1. Recopilar y analizar los requisitos funcionales y no funcionales del sistema de gestión de pedidos, incluyendo la interacción multicanal mediante web y WhatsApp Business, identificando el modelo del dominio del negocio, actores y casos de uso.**

*Capítulo de referencia: Capítulo 2 – Disciplina de requisitos.*

El Capítulo 2 documenta el modelo del dominio completo, con diez entidades identificadas y sus relaciones, el diagrama de contexto del sistema, seis actores (cuatro humanos y dos secundarios), dieciocho casos de uso priorizados y once requisitos suplementarios. Adicionalmente, se elaboró el glosario del dominio y la matriz de trazabilidad entre requisitos y casos de uso. Este objetivo se considera **cumplido**.

---

**OE2. Diseñar la arquitectura del sistema y el modelo de datos, las interfaces de los tres usuarios y la integración con los servicios externos.**

*Capítulo de referencia: Capítulo 3 – Análisis y Diseño.*

El Capítulo 3 recoge el diseño de la arquitectura en capas, los diagramas de clases de análisis y diseño, el modelo entidad-relación de la base de datos, los diagramas de despliegue, paquetes y componentes, y los diagramas de secuencia de los casos de uso de mayor complejidad técnica (UC-02, UC-09, UC-11, UC-14). Las interfaces de usuario fueron prototipadas para los tres perfiles de usuario antes de iniciar la implementación. Este objetivo se considera **cumplido**.

---

**OE3. Desarrollar e implementar la aplicación web y el asistente inteligente, asegurando que los pedidos quedan registrados correctamente en el sistema a través de todos los canales, y que los bloques de producción funcionan tal y como está previsto.**

*Capítulo de referencia: Capítulo 4 – Descripción de la solución.*

El Capítulo 4 describe la solución implementada, compuesta por cinco interfaces funcionales (portal web del cliente, perfil del cliente registrado, sistema TPV, panel de empleados y panel de administración), el canal de WhatsApp con IA y el servicio de impresión de tickets en impresora térmica. Los tres canales de pedido (web, WhatsApp y teléfono) quedan operativos y el sistema de bloques de producción asigna automáticamente la capacidad en franjas de 5 minutos. Este objetivo se considera **cumplido**.

---

**OE4. Evaluar el desempeño y la fiabilidad del sistema, midiendo la reducción de errores humanos y la mejora en la eficiencia de la gestión de pedidos, para validar el cumplimiento de los objetivos previamente planteados.**

*Capítulo de referencia: Capítulo 5 (presente capítulo).*

La validación del sistema se ha llevado a cabo de forma iterativa a través de dos vías complementarias. Por un lado, mediante Sprint Reviews periódicas con el propietario de Buena Burger, quien ha actuado como Product Owner, verificando los flujos de los casos de uso de mayor prioridad sobre datos reales. Por otro, a través del despliegue operativo de buenaburger-pos-v1, una versión funcional del TPV y la lógica de bloques de producción que ya se encuentra en funcionamiento en el local, validando en condiciones reales de servicio la fiabilidad del núcleo del sistema. La discusión de resultados de este capítulo completa la evaluación del sistema. Este objetivo se considera **cumplido**.

---

## 5.2 Discusión de resultados

### 5.2.1 El sistema de bloques de producción como diferencial

La funcionalidad más original y técnicamente exigente del sistema es el mecanismo de control de capacidad productiva por bloques temporales. Frente al resto de soluciones existentes en el mercado, ninguna de las analizadas en el estado del arte (Capítulo 1) contemplaba esta gestión de franjas de 5 minutos con un límite de hamburguesas por bloque. Este sistema ha permitido formalizar matemáticamente lo que antes era una decisión subjetiva del empleado encargado de gestionar los pedidos.

La decisión de hacer que los bloques se generen automáticamente para los próximos 60 días mediante un proceso cron de medianoche, en lugar de generarlos a demanda, simplifica los tiempos de respuesta de la API durante el servicio y evita bloqueos de escritura en la base de datos en momentos de alta concurrencia.

La opción de **forzar un bloque lleno** (UC-10), reservada exclusivamente al staff, fue una decisión de diseño deliberada para preservar la autonomía operativa del negocio. Existen situaciones excepcionales (un cliente habitual, un pedido corporativo, una decisión de última hora) en las que el propietario necesita poder actuar por encima de los límites del sistema, y suprimir esa capacidad habría generado fricción con la filosofía del negocio.

### 5.2.2 Arquitectura sin framework frontend

La decisión de implementar el frontend con HTML, CSS y JavaScript vanilla, sin ningún framework (React, Vue, Angular), fue analizada y justificada en el Capítulo 3. En la práctica, esta decisión ha tenido las siguientes implicaciones:

- **Ventaja:** Cero dependencias de terceros en el cliente, carga inicial extremadamente rápida y funcionamiento en cualquier navegador moderno sin necesidad de proceso de compilación.
- **Coste:** La gestión del estado de la interfaz (carrito, modales, navegación entre páginas) se ha tenido que implementar manualmente, lo que ha requerido mayor cantidad de código JavaScript que el equivalente en un framework con gestión de estado integrada.

Para un proyecto en producción con un único desarrollador y un equipo sin experiencia en frameworks, esta arquitectura ha resultado ser la más sostenible.

### 5.2.3 Base de datos NoSQL para pedidos personalizables

La elección de MongoDB Atlas como sistema de persistencia ha demostrado ser adecuada para el modelo de datos del proyecto. La flexibilidad del esquema documental ha simplificado el modelado de las líneas de pedido con personalizaciones variables (ingredientes excluidos, añadidos y extras), que en un modelo relacional habrían requerido varias tablas de unión adicionales.

No obstante, esta flexibilidad tiene un coste: la ausencia de joins nativos hace que algunas consultas de estadísticas requieran pipelines de agregación complejos (`$group`, `$unwind`, `$lookup`) que son más difíciles de leer y mantener que sus equivalentes SQL.

### 5.2.4 Encapsulación del proveedor de IA

El asistente conversacional de WhatsApp se apoya en el SDK de Anthropic (`@anthropic-ai/sdk`, modelo Claude), elegido por su capacidad para gestionar contextos de conversación largos con mayor coherencia. Una decisión de diseño clave fue **encapsular toda la lógica de IA en un servicio independiente** (`ia.service.js`), de modo que el proveedor concreto queda aislado del resto de la aplicación: los controladores no conocen detalles del modelo, solo invocan el servicio. Esto mantiene estables los contratos de la API y permitiría sustituir el proveedor de IA en el futuro sin impacto en la arquitectura. Este episodio ilustra el valor de diseñar con separación de responsabilidades desde el inicio.

### 5.2.5 Consideraciones sobre la validación y las decisiones de implementación

La validación del sistema no se ha limitado a pruebas manuales sobre entorno de desarrollo. El núcleo funcional del sistema —el TPV y la lógica de bloques de producción— ha sido extraído en buenaburger-pos-v1, una versión operativa que lleva en uso en el local durante el período de desarrollo de este TFG, gestionando pedidos reales en cada noche de servicio. Esto ha permitido detectar y corregir comportamientos no previstos en el análisis inicial bajo condiciones reales de carga y uso.

La principal limitación que persiste en esta primera iteración es la ausencia de una suite de pruebas automatizadas (unitarias, de integración o end-to-end). Aunque la validación con el propietario y el uso en producción de buenaburger-pos-v1 han aportado una base sólida de confianza en el sistema, la cobertura de tests automatizados facilitaría la detección temprana de regresiones en futuras iteraciones y reduciría el coste de mantenimiento a largo plazo.

---

## 5.3 Recomendaciones

A partir de la experiencia acumulada durante el desarrollo del sistema y de las consideraciones identificadas, se formulan las siguientes recomendaciones para quien continúe con el desarrollo o el mantenimiento del sistema:

**R1. Añadir pruebas automatizadas:**

Se recomienda implementar al menos pruebas de integración para los endpoints críticos de la API: creación de pedidos, reserva de bloques, forzado de bloques y cancelaciones. El framework Jest, ya presente en el ecosistema Node.js, junto con Supertest para las pruebas de la API REST, sería una elección adecuada. Las pruebas automatizadas son especialmente importantes para garantizar que futuras modificaciones —incluyendo la adaptación a VERI*FACTU— no introduzcan regresiones en la lógica de bloques.

**R2. Completar el despliegue del sistema completo en producción:**

El sistema está preparado para desplegarse en Render (backend y frontend estático) con MongoDB Atlas como base de datos en la nube. La infraestructura física necesaria —la Raspberry Pi Zero 2W y la impresora térmica— ya está operativa en el local a través de buenaburger-pos-v1. La migración consiste en sustituir el agente de impresión actual por el del sistema completo y apuntar las variables de entorno al nuevo servidor. Se recomienda realizar esta transición durante una noche no operativa y validarla con al menos un servicio completo antes de retirar el sistema anterior.

---

## 5.4 Futuras líneas de actuación

El sistema desarrollado constituye una primera iteración funcional del Buena Burger Management System. La metodología ágil empleada durante el desarrollo (Scrum adaptado a un único desarrollador) ha permitido gestionar el proceso de forma estructurada y con criterio de priorización, lo que facilita que futuras iteraciones puedan abordar nuevas funcionalidades de forma ordenada.

Las futuras líneas de actuación se organizan por prioridad e impacto estimado:

### 5.4.1 Adaptación al reglamento VERI*FACTU (prioridad alta)

El Buena Burger Management System gestiona la confirmación de pedidos y genera los tickets de cocina y cliente impresos mediante comandos ESC/POS. Con la entrada en vigor del Reglamento de Requisitos de los Sistemas Informáticos de Facturación (Real Decreto 1007/2023) y las especificaciones técnicas establecidas en la Orden HAC/1177/2024, cualquier software que emita facturas simplificadas —incluidos los tickets de un negocio de hostelería— estará obligado a cumplir los requisitos del sistema VERI*FACTU antes del 1 de enero de 2027 para personas jurídicas y del 1 de julio de 2027 para personas físicas, según la segunda prórroga aprobada mediante el Real Decreto-ley 15/2025.

La adaptación técnica requiere cambios profundos en la arquitectura actual del sistema:

- Implementar un modelo de registro de facturación con numeración correlativa inalterable en la base de datos.
- Generar un hash SHA-256 encadenado para cada registro de facturación, vinculando cada ticket al anterior, de forma que cualquier alteración retrospectiva de un registro invalide toda la cadena posterior.
- Imposibilitar el borrado de registros: toda anulación debe generar un registro de anulación separado, nunca sobrescribir ni eliminar el original.
- Incluir un código QR en cada ticket impreso, con los datos mínimos de la factura simplificada establecidos por la Orden HAC/1177/2024.
- Implementar la comunicación con los Web Services de la AEAT para el envío de registros en modo VERI*FACTU, si el negocio opta por dicho modo de operación.
- Emitir la declaración responsable del fabricante del software, exigible a todo productor de un Sistema Informático de Facturación (SIF) conforme al reglamento.

La complejidad de estos requisitos técnicos, sumada a la necesidad de asesoramiento jurídico-tributario especializado para garantizar el cumplimiento íntegro del reglamento, hacen de esta línea de actuación una de las más exigentes del sistema. Se estima que requeriría la participación de más de un desarrollador para poder completarla dentro de los plazos legales establecidos.

### 5.4.2 Notificaciones push y SMS (prioridad media)

Actualmente el cliente recibe confirmación del pedido únicamente por WhatsApp (si usó ese canal) o por la pantalla de confirmación en el navegador (si usó la web). Implementar notificaciones push mediante la API de notificaciones del navegador, o SMS mediante un servicio como Twilio, mejoraría la experiencia del cliente al mantenerle informado del estado de su pedido en todo momento, sin que tenga que permanecer con la pantalla abierta.

### 5.4.3 Aplicación móvil nativa (prioridad media)

El portal web del cliente está optimizado para móvil y funciona correctamente en navegadores de smartphone. Sin embargo, una aplicación nativa (desarrollada con React Native o similar) permitiría aprovechar capacidades del dispositivo no disponibles desde el navegador: notificaciones push nativas, acceso al historial de pedidos sin conexión o la integración con Apple Pay y Google Pay. Esta extensión requeriría un esfuerzo de desarrollo significativo pero elevaría considerablemente la experiencia del usuario.

### 5.4.4 Sistema de fidelización (prioridad baja)

La base de datos ya almacena el historial completo de pedidos de cada cliente registrado. Esta información podría aprovecharse para implementar un programa de fidelización: puntos acumulados por pedido, descuentos automáticos a partir de un número de pedidos o bonificaciones para clientes frecuentes. Este tipo de funcionalidad añadiría valor diferencial respecto a los sistemas de pedido online genéricos.

### 5.4.5 Integración con sistemas de inventario (prioridad baja)

En la actualidad el sistema gestiona la capacidad productiva en términos de unidades de hamburguesas, pero no tiene acceso al stock de materias primas. En el futuro, podría integrarse con un sistema de gestión de inventario que, por ejemplo, desactive automáticamente un producto de la carta cuando el stock del ingrediente principal esté agotado.

### 5.4.6 Analítica avanzada y predicción de demanda (prioridad baja)

Con el tiempo, la base de datos acumulará un historial suficientemente amplio de pedidos como para poder extraer patrones de demanda. Una extensión natural sería incorporar modelos de predicción sencillos que ayuden al propietario a anticipar la demanda de cada noche operativa, ajustar la compra de ingredientes y planificar la plantilla necesaria. Esta línea de actuación conecta con las competencias de análisis de datos del grado en Ingeniería Informática y podría ser el punto de partida de un TFG de máster.

---

## 5.5 Valoración personal

El desarrollo de Buena Burger Management System ha supuesto afrontar un reto real con un cliente real, lo que ha marcado una diferencia sustancial respecto a los proyectos académicos habituales. El propietario de la hamburguesería ha participado activamente en cada Sprint Review, validando funcionalidades, proponiendo cambios y cuestionando decisiones de diseño que sobre el papel parecían razonables pero que en la práctica del negocio no tenían sentido.

Esta experiencia ha puesto de manifiesto la importancia de mantener una comunicación constante con el cliente durante todo el proceso de desarrollo. En varias ocasiones, requisitos que parecían claros en el análisis inicial resultaron tener matices relevantes cuando se presentó el prototipo funcional: la forma en que el propietario quería visualizar los bloques de producción, la necesidad de poder forzar un bloque lleno sin restricciones, o la importancia de que el ticket de cocina fuera legible a distancia, son ejemplos de ajustes que solo fue posible detectar con el sistema funcionando.

Desde el punto de vista técnico, el proyecto ha permitido integrar de forma coherente tecnologías y conceptos aprendidos a lo largo del grado: arquitectura cliente-servidor, API REST, bases de datos NoSQL, autenticación JWT, comunicación en tiempo real con WebSockets, pasarelas de pago e inteligencia artificial conversacional. La complejidad de orquestar todos estos componentes en un sistema único y funcional ha sido el mayor desafío del trabajo, y también su mayor aprendizaje.

En definitiva, Buena Burger Management System es un producto funcional que resuelve un problema real identificado en un negocio real, diseñado con los criterios metodológicos del proceso de ingeniería del software: disciplina de requisitos, análisis, diseño e implementación. Su puesta en producción completa constituirá el siguiente hito del proyecto.

---

## Referencias bibliográficas

### Artículos académicos

Oghenekaro, L. U., & Okafor, J. C. (2023). Web-based integrated restaurant management system. *International Journal of Applied Information Systems (IJAIS)*, 12(40).

Piyatissa, W. B. A. C. (2021). *Web based Restaurant management system* (Doctoral dissertation).

Chakraborty, S. (2023). *An Undergraduate Internship/Project on Restaurant Management System*. Independent University, Bangladesh.

Romero-Charneco, M., Casado-Molina, A. M., Alarcón-Urbistondo, P., & Cabrera Sánchez, J. P. (2025). Customer intentions toward the adoption of WhatsApp chatbots for restaurant recommendations. *Journal of Hospitality and Tourism Technology*, 16(4), 784-816.

Ali, M. J., Vyshnavi, M. R. V., Kumar, K. V. H., Vishnubhatla, S., & Rajagopal, S. M. (2024, octubre). Seamless service evolution: Enhancing customer satisfaction using AWS-driven AI chatbots for restaurant ordering. En *2024 4th International Conference on Sustainable Expert Systems (ICSES)* (pp. 1312-1318). IEEE.

Kim, H., Jung, S., & Ryu, G. (2020). A study on the restaurant recommendation service app based on AI chatbot using personalization information. *International Journal of Advanced Culture Technology*, 8(4), 263-270.

Leung, X. Y., & Wen, H. (2021). How emotions affect restaurant digital ordering experiences: a comparison of three ordering methods. *Journal of Hospitality and Tourism Technology*, 12(3), 439-453.

Jaiswal, A. S., Kulkarni, C. R., Patil, Y., Ponde, S., & Vaidya, R. B. (2023). Smart food ordering system for restaurants. *International Journal of Innovative Science and Research Technology*, 8(10), 12-25.

Joshi, R., Adsure, T., Dhakane, A., Karanjkar, S., & Kamble, A. (2025, mayo). DigiDine: Digital Menu Card and Restaurant Ordering System. En *International Conference on Innovations and Advances in Cognitive Systems* (pp. 237-249). Springer Nature Switzerland.

Patil, L. N., Agrawal, V. K., Dhande, K. K., Khatavkar, S. D., Mande, G. D., Patil, V. S., & Ratnaparkhi, S. S. (2025). Evaluation of a robotic restaurant management system with UI design, voice assistant, and machine learning integration. *Sigma: Journal of Engineering & Natural Sciences*, 43(3).

### Normativa y legislación

España. (2021). *Ley 11/2021, de 9 de julio, de medidas de prevención y lucha contra el fraude fiscal, de transición al referéndum de la responsabilidad penal de las personas jurídicas, y de fomento del mecenazgo cultural y científico y de la actividad económica*. Boletín Oficial del Estado, núm. 164, de 10 de julio de 2021. https://www.boe.es/buscar/act.php?id=BOE-A-2021-11473

España. (2023). *Real Decreto 1007/2023, de 5 de diciembre, por el que se aprueba el Reglamento que establece los requisitos que deben adoptar los sistemas y programas informáticos o electrónicos que soporten los procesos de facturación de empresarios y profesionales, y la estandarización de formatos de los registros de facturación*. Boletín Oficial del Estado, núm. 291, de 6 de diciembre de 2023. https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840

España. (2024). *Orden HAC/1177/2024, de 17 de octubre, por la que se desarrollan las especificaciones técnicas, funcionales y de contenido referidas en el artículo 12 y en la disposición adicional única del Real Decreto 1007/2023*. Boletín Oficial del Estado, núm. 262, de 28 de octubre de 2024. https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-22138

España. (2025). *Real Decreto-ley 15/2025, de 2 de diciembre, de adopción de medidas urgentes en materia de sistemas informáticos de facturación y de otras medidas tributarias urgentes*. Boletín Oficial del Estado, núm. 292, de 3 de diciembre de 2025.

### Documentación oficial de organismos públicos

Agencia Estatal de Administración Tributaria. (s. f.). *Sistemas Informáticos de Facturación VERI*FACTU*. Sede Electrónica de la AEAT. https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html

Agencia Estatal de Administración Tributaria. (s. f.). *Portal de desarrolladores: Sistemas Informáticos de Facturación y Sistemas VERI*FACTU*. https://www.agenciatributaria.es/AEAT.desarrolladores

### Documentación de tecnologías utilizadas

Anthropic. (s. f.). *Claude API documentation*. https://docs.anthropic.com

Express.js. (s. f.). *Express web framework documentation*. https://expressjs.com

GitHub. (s. f.). *GitHub documentation and collaboration platform*. https://github.com

Meta Platforms, Inc. (s. f.). *WhatsApp Business Platform documentation*. https://developers.facebook.com/docs/whatsapp

MongoDB Inc. (s. f.). *MongoDB Atlas documentation*. https://www.mongodb.com

Raspberry Pi Foundation. (s. f.). *Raspberry Pi Zero 2W product page*. https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/

Socket.IO. (s. f.). *Socket.IO documentation*. https://socket.io/docs

Stripe Inc. (s. f.). *Stripe payments API documentation*. https://stripe.com/docs

### Plataformas y sistemas de pedidos online

Glovo. (s. f.). *Glovo partner platform*. https://glovoapp.com

Just Eat Takeaway. (s. f.). *Just Eat partner platform*. https://www.just-eat.es

Uber Technologies Inc. (s. f.). *Uber Eats restaurant platform*. https://www.ubereats.com

OlaClick. (s. f.). *OlaClick digital ordering platform for restaurants*. https://olaclick.com

### Aplicaciones de cadenas de restauración

Burger King Corporation. (s. f.). *Burger King mobile application*. https://www.burgerking.es

McDonald's Corporation. (s. f.). *McDonald's mobile ordering system*. https://www.mcdonalds.com

Taco Bell Corp. (s. f.). *Taco Bell mobile ordering application*. https://www.tacobell.com

Telepizza. (s. f.). *Telepizza online ordering platform*. https://www.telepizza.es
