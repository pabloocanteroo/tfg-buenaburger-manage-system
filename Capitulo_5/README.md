# Capítulo 5 — Conclusiones y líneas futuras

[◄ Volver al README principal](../README.md) · [Memoria completa del capítulo](../docs/capitulos/capitulo5.md)

> **Disciplina:** evaluación y cierre. Verifica la hipótesis y el cumplimiento de los objetivos.
> **Qué se muestra aquí:** que el sistema resuelve el problema real, qué decisiones de diseño se sostienen, y hacia dónde sigue.

---

## 1. Verificación de la hipótesis

La hipótesis se considera **verificada**:

- La recepción de pedidos se **automatiza** vía web y WhatsApp con IA, eliminando la persona dedicada.
- Los **errores** de comandas a mano desaparecen: cada pedido queda registrado y validado por el servidor.
- El sistema de **bloques** controla la capacidad de cocina en tiempo real, evitando saturación.
- El canal telefónico se mantiene, pero guiado por el TPV, sin errores de anotación.

## 2. Cumplimiento de los objetivos específicos

| Objetivo | Evidencia | Estado |
|---|---|:--:|
| **OE1** Requisitos, dominio, actores, casos de uso | [Capítulo 2](../Capitulo_2/README.md): 10 entidades, contexto, 18 UC, 11 RS, glosario, trazabilidad | ✅ |
| **OE2** Arquitectura, datos, interfaces, integraciones | [Capítulo 3](../Capitulo_3/README.md): capas, MVC, ERD, despliegue, secuencias | ✅ |
| **OE3** Web + asistente IA + bloques | [Capítulo 4](../Capitulo_4/README.md): 5 vistas, 3 canales, impresión, bloques | ✅ |
| **OE4** Evaluación y validación | Sprint Reviews con el cliente + `buenaburger-pos-v1` en uso real | ✅ |

### Validación: una parte del sistema ya está en producción

La validación del sistema se apoyó en dos vías complementarias:

1. **Sprint Reviews con el propietario** de Buena Burger como *Product Owner*, verificando sobre datos reales los flujos de los casos de uso de mayor prioridad en cada incremento.
2. **Despliegue real de `buenaburger-pos-v1`** —el núcleo de TPV y lógica de bloques de producción—, que **lleva en uso en el local gestionando los pedidos de cada noche de servicio**. Esta es la evidencia de validación más sólida: ha permitido detectar y corregir, bajo carga y uso reales, comportamientos no previstos en el análisis inicial.

> **Matiz importante.** Lo que está en producción es **solo el núcleo** (POS + bloques de producción + impresión), **no** el portal web público ni el asistente de WhatsApp con IA. El sistema completo aún no se ha desplegado por **motivos legales** —RGPD y la adaptación pendiente a **VERI\*FACTU**—, que es precisamente la [primera línea de trabajo futuro](#511-adaptación-al-reglamento-verifactu-prioridad-alta).

Esta validación en producción es la respuesta a la ausencia de una suite de pruebas automatizadas: el núcleo crítico se ha probado en condiciones reales de servicio, no solo en entorno de desarrollo.

## 3. Discusión de resultados

- **Bloques de producción como diferencial:** formaliza matemáticamente lo que antes era intuición del empleado. Generación automática por cron (60 días) en lugar de a demanda → mejor respuesta y menos contención de escritura.
- **Frontend sin framework:** cero dependencias y carga inmediata, a cambio de gestionar el estado manualmente. Sostenible para un equipo sin experiencia en frameworks.
- **NoSQL para pedidos personalizables:** el esquema documental simplifica las líneas con personalizaciones variables; coste: agregaciones complejas para estadísticas.
- **Encapsulación del proveedor de IA:** toda la lógica en `ia.service.js`; el proveedor puede sustituirse sin tocar la arquitectura.

> **Limitación reconocida:** ausencia de una suite de pruebas automatizadas. La validación se apoyó en Sprint Reviews y en el uso real de `buenaburger-pos-v1`.

## 4. Recomendaciones

- **R1.** Añadir pruebas de integración (Jest + Supertest) para pedidos, reserva/forzado de bloques y cancelaciones.
- **R2.** Completar el despliegue del sistema completo en Render, sustituyendo el agente actual del POS en producción.

## 5. Futuras líneas de actuación

### 5.1.1 Adaptación al reglamento VERI\*FACTU (prioridad alta)

Obligatorio para software de facturación (RD 1007/2023, Orden HAC/1177/2024; plazos prorrogados a 2027). Requiere numeración inalterable, hash SHA-256 encadenado, imposibilidad de borrado, QR en cada ticket y comunicación con la AEAT. Análisis completo en [`docs/VERIFACTU.md`](../docs/VERIFACTU.md).

| Línea | Prioridad |
|---|:--:|
| Adaptación VERI\*FACTU | Alta |
| Notificaciones push / SMS | Media |
| App móvil nativa | Media |
| Fidelización | Baja |
| Integración con inventario | Baja |
| Analítica y predicción de demanda | Baja |

---

[◄ Capítulo 4](../Capitulo_4/README.md) · [README principal](../README.md)
