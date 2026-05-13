# VERI*FACTU — Guía completa para hostelería y restauración

> Investigación realizada el 2026-04-14. Basada en RD 1007/2023, Orden HAC/1177/2024,
> RDL 15/2025 y documentación oficial de la AEAT.

---

## Índice

1. [Qué es VERI*FACTU](#1-qué-es-verifactu)
2. [Base legal](#2-base-legal)
3. [A quién afecta](#3-a-quién-afecta)
4. [Fechas y plazos](#4-fechas-y-plazos)
5. [Requisitos técnicos del software](#5-requisitos-técnicos-del-software-sif)
6. [Hash y cadena de registros](#6-hash-y-cadena-de-registros)
7. [Datos mínimos de cada registro de factura](#7-datos-mínimos-de-cada-registro-de-factura)
8. [Comunicación con la AEAT — QR y envío](#8-comunicación-con-la-aeat--qr-y-envío)
9. [Sanciones](#9-sanciones)
10. [Modo VERI*FACTU vs modo NO VERI*FACTU](#10-modo-verifactu-vs-modo-no-verifactu)
11. [Implicaciones específicas para hostelería](#11-implicaciones-específicas-para-hostelería)
12. [Exenciones y casos especiales](#12-exenciones-y-casos-especiales)
13. [Recursos oficiales AEAT](#13-recursos-oficiales-aeat)
14. [Resumen ejecutivo](#14-resumen-ejecutivo-para-un-bar-o-restaurante)

---

## 1. Qué es VERI*FACTU

**VERI\*FACTU** (Sistema de Emisión de Facturas Verificables) es un marco regulatorio de la Agencia Estatal de Administración Tributaria (AEAT) que establece los requisitos que deben cumplir los **Sistemas Informáticos de Facturación (SIF)** para garantizar que los registros de facturación sean íntegros, trazables, inalterables y verificables.

**No es:**
- Un nuevo tipo de factura.
- Un sistema de facturación electrónica B2B (eso es otra normativa).
- Un sistema de homologación oficial por la AEAT.

**Sí es:**
- Una regulación sobre cómo deben funcionar **internamente** los programas que emiten facturas (TPV, ERP, software de gestión...).
- Una respuesta directa al uso del llamado **"software de doble uso"** o "caja B": programas que permitían borrar o modificar ventas para defraudar a Hacienda.

El objetivo es que sea técnicamente imposible alterar, eliminar o falsificar cualquier registro de facturación sin que quede constancia.

---

## 2. Base legal

| Norma | Contenido |
|---|---|
| **Ley 11/2021, de 9 julio** — Ley Antifraude | Origen del mandato. Reforma el art. 29.2.j) de la LGT prohibiendo sistemas con doble contabilidad o alteración de registros. |
| **Ley 58/2003 (LGT), art. 29.2.j)** | Obligación de usar sistemas que garanticen integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad. |
| **Real Decreto 1007/2023, de 5 diciembre** (RRSIF) | Reglamento de Requisitos de los Sistemas Informáticos de Facturación. Publicado BOE 6/12/2023. Base reglamentaria de todo el sistema. |
| **Orden HAC/1177/2024, de 17 octubre** | Especificaciones técnicas, funcionales y de contenido: formato XML, algoritmo SHA-256, estructura del QR, web services de la AEAT. Publicada BOE 28/10/2024. |
| **Real Decreto-ley 15/2025, de 2 diciembre** | Segunda prórroga. Aplaza la obligatoriedad hasta 2027. Convalidado por el Congreso el 11/12/2025. |

---

## 3. A quién afecta

### Obligados

Todos los **empresarios y profesionales** que usen un sistema informático para emitir facturas:

- Contribuyentes del **Impuesto sobre Sociedades** (SL, SA, cualquier sociedad).
- Autónomos y profesionales con actividades económicas (**IRPF actividad económica**).
- Contribuyentes del **IRNR** con establecimiento permanente.
- Cualquier negocio de hostelería: bares, cafeterías, restaurantes, hoteles, catering, food trucks.

> **Punto clave para hostelería:** emitir habitualmente tickets (facturas simplificadas) **no excluye** de la obligación. En cuanto hay un sistema informático de por medio (TPV, software de gestión de pedidos...), aplica el RRSIF.

### Exentos

| Colectivo | Motivo |
|---|---|
| Empresas en **SII** (facturación > 6 M€/año, grupos IVA, REDEME) | Ya transmiten libros registro en tiempo real a la AEAT. |
| Actividades en **País Vasco y Navarra** | Normativa foral propia: **TicketBAI/Batuz** (Bizkaia, Gipuzkoa, Álava) y normativa foral navarra. |
| Operaciones **sin obligación de facturar** en ciertos regímenes | Solo para esas operaciones concretas. |
| **REAGP** — recibos de compensación agraria | Solo para esos documentos específicos. |
| Facturación **100% manual** (papel, sin software) | Fuera del ámbito técnico. |

> Estar exento de IVA (médicos, educación...) **NO** exime de VERI*FACTU si se emiten facturas con software.
> Estar en **módulos** tampoco exime si se usa un TPV o programa de facturación.

---

## 4. Fechas y plazos

| Fecha | Hito |
|---|---|
| 9 julio 2021 | Ley 11/2021 (Ley Antifraude) — origen legal |
| 6 diciembre 2023 | Publicación RD 1007/2023 en BOE |
| 28 octubre 2024 | Publicación Orden HAC/1177/2024 — especificaciones técnicas |
| **29 julio 2025** | **Plazo límite para fabricantes y comercializadores** de software para adaptar sus productos |
| Desde julio 2025 | Inicio del **período voluntario** para empresas y autónomos |
| 2 diciembre 2025 | RDL 15/2025 — segunda prórroga hasta 2027 |
| **1 enero 2027** | **Obligatorio para personas jurídicas** (Impuesto sobre Sociedades) |
| **1 julio 2027** | **Obligatorio para personas físicas** (autónomos, IRPF con actividad económica) |

> Los fabricantes de software ya debían tener sus programas adaptados desde el **29 de julio de 2025**. Exige a tu proveedor de TPV que acredite el cumplimiento.

---

## 5. Requisitos técnicos del software (SIF)

El RD 1007/2023 y la Orden HAC/1177/2024 establecen los principios que todo SIF debe cumplir:

### Los 6 principios de inalterabilidad

| Principio | Significado práctico |
|---|---|
| **Integridad** | Los registros no pueden alterarse. Cualquier cambio posterior genera un nuevo registro, nunca sobreescribe el original. |
| **Conservación** | Registros conservados durante el período de prescripción tributaria (4 años), con copias de seguridad cifradas y automáticas. |
| **Accesibilidad** | Datos disponibles y recuperables en cualquier momento para inspección tributaria. |
| **Legibilidad** | Registros legibles tanto por personas como por sistemas informáticos. |
| **Trazabilidad** | Histórico claro y fiable de operaciones: altas, anulaciones y rectificaciones. |
| **Inalterabilidad** | Imposibilidad técnica de cambiar, borrar o falsificar registros sin que quede constancia. |

### Requisitos funcionales concretos

- **Registro de facturación automático:** simultáneo o inmediatamente anterior a la emisión de la factura, en XML.
- **Hash SHA-256 encadenado:** cada registro incluye su huella digital vinculada al registro anterior.
- **Log inalterable de eventos:** registra inicio/cierre del sistema, accesos de usuarios, errores, actualizaciones, emisión y anulación de facturas. No puede modificarse.
- **Código QR obligatorio** en cada factura (completa y simplificada), tamaño 30×30 a 40×40 mm.
- **Imposibilidad de borrar facturas:** las anulaciones generan un registro de anulación separado; el registro original permanece.
- **Exportación de datos:** todos los registros en formato XML estándar AEAT, a demanda.
- **Capacidad de comunicación con AEAT** (si opera en modo VERI*FACTU).
- **Firma electrónica avanzada** (conforme eIDAS): obligatoria solo en modo NO VERI*FACTU.
- **Declaración Responsable del fabricante:** visible en el propio software. No hay homologación oficial por la AEAT; es una auto-certificación del productor. Si el usuario puede demostrar que usa software con declaración responsable correcta, queda eximido de responsabilidad por fallos técnicos del sistema.

---

## 6. Hash y cadena de registros

### Qué es el hash (huella digital)

El hash es el resultado de aplicar el algoritmo **SHA-256** a un conjunto específico de campos clave de la factura (definidos en la Orden HAC/1177/2024).

Propiedades:
- **Único** para cada conjunto de datos.
- Cualquier mínima alteración de los datos originales produce un hash completamente diferente.
- **Irreversible:** no se pueden obtener los datos originales a partir del hash.
- Prácticamente imposible encontrar dos conjuntos de datos distintos que produzcan el mismo hash.

> El hash **no se calcula sobre el registro XML completo**, sino solo sobre un subconjunto de campos clave definido reglamentariamente.

### El encadenamiento (similar a blockchain)

```
Factura 001  →  Hash H1 (SHA-256 de datos 001)
Factura 002  →  Hash H2 (SHA-256 de datos 002 + H1)
Factura 003  →  Hash H3 (SHA-256 de datos 003 + H2)
...
```

Si alguien modifica la factura 001, su hash cambia → H2 queda inconsistente → toda la cadena posterior queda rota y es detectable por la AEAT.

**Consecuencia práctica:** es técnicamente imposible modificar o eliminar cualquier factura pasada sin que toda la cadena posterior quede inválida.

> El hash del registro **no forma parte del código QR** de la factura (el QR tiene su propia estructura e información).

---

## 7. Datos mínimos de cada registro de factura

### Identificación del emisor y del sistema

- NIF del emisor
- Nombre/razón social del emisor
- Identificador único del SIF (Sistema Informático de Facturación)
- Versión del software
- Timestamp exacto de generación (fecha, hora, minuto, segundo con zona horaria)

### Identificación de la factura

- Número y serie de la factura
- Tipo de factura:
  - `F1` — Factura completa
  - `F2` — Factura simplificada (ticket)
  - `F3` — Factura sustitutiva
  - `R1`–`R4` — Rectificativa completa (por distintas causas legales)
  - `R5` — Rectificativa simplificada
- Fecha de expedición
- Fecha de operación (si difiere de la expedición)

### Datos del destinatario (solo facturas completas F1)

- NIF/CIF del destinatario
- Nombre/razón social
- Domicilio fiscal

### Datos económicos

- Descripción de las operaciones
- Importe total de la factura
- Base imponible desglosada por tipo de IVA
- Tipo de IVA aplicado (21%, 10%, 4%, exento...)
- Cuota de IVA
- Recargo de equivalencia (si aplica)
- Retención de IRPF (si aplica)
- Indicación de exención con referencia legal

### Datos de régimen fiscal

- Código de régimen especial (clave de régimen)
- Código de tipo de operación (S1, S2, E, N1, N2...)

### Datos de seguridad

- **Hash del registro actual** (SHA-256)
- **Hash del registro anterior** (encadenamiento)
- Firma electrónica avanzada (obligatoria en modo NO VERI*FACTU)
- Indicador de si el registro ha sido enviado a la AEAT (en modo VERI*FACTU)

### En facturas rectificativas, adicionalmente

- Referencia a la factura original (número, serie, fecha)
- Método de rectificación: Sustitución (`S`) o Diferencia (`I`)
- Si es por sustitución: importes base y cuota rectificados

---

## 8. Comunicación con la AEAT — QR y envío

### Modo VERI*FACTU (con envío a la AEAT)

- El SIF transmite **automáticamente y en tiempo real** cada registro de facturación a la Sede Electrónica de la AEAT.
- Comunicación mediante **Web Services (WSDL/HTTPS)** con autenticación por certificado electrónico.
- Formato de los registros: **XML** según esquemas de la AEAT.
- Si hay fallo de conexión: el sistema reintenta el envío después y marca el registro con incidencia. La facturación **no se detiene** por falta de conexión.
- Las facturas llevan la leyenda **"VERI\*FACTU"** visible y el QR.
- La inscripción en este modo es **tácita**: se produce al comenzar a enviar registros a la AEAT.
- Una vez en este modo, no se puede volver al modo NO VERI*FACTU hasta fin de año natural.

### Modo NO VERI*FACTU (almacenamiento local)

- Registros almacenados **localmente** con firma electrónica avanzada (eIDAS).
- Mayor exigencia técnica en seguridad y custodia.
- La AEAT puede solicitar en cualquier momento la exportación y remisión de estos registros.
- Las facturas llevan QR pero **no** la leyenda "VERI*FACTU".

### El código QR

- **Obligatorio en todas las facturas** (completas y simplificadas) emitidas por un SIF conforme.
- Tamaño: entre 30×30 y 40×40 mm, norma ISO/IEC 18004.
- Contenido: datos básicos de la factura + referencia a la AEAT.
- Permite a cualquier persona (cliente, inspector) escanear la factura y verificar sus datos básicos contra la AEAT.
- En modo VERI*FACTU: verificación en tiempo real contra los registros ya almacenados en la AEAT.
- En modo NO VERI*FACTU: verificación limitada (solo si la AEAT ha solicitado y recibido los registros).

### Aplicación gratuita de la AEAT

La AEAT ofrece una app gratuita para autónomos y microempresas con baja facturación:
- Funciona exclusivamente en modo VERI*FACTU.
- **Limitaciones importantes para hostelería:**
  - Solo emite facturas completas (no simplificadas/tickets).
  - No apta para alta rotación (bares, restaurantes con mucho volumen de tickets).
  - No admite ciertos regímenes especiales de IVA.
  - Los datos no pueden exportarse a otros sistemas.

---

## 9. Sanciones

### Para usuarios (empresas y autónomos que usan el software)

| Infracción | Sanción máxima |
|---|---|
| Uso de software sin declaración responsable del fabricante | **50.000 €** por ejercicio fiscal |
| Emisión de facturas con datos alterados o no válidos | **1.000 € por factura** |
| No conservación de registros durante el período legal (4 años) | Porcentajes sobre facturas afectadas |
| Facturas sin QR, sin leyenda o con formato incorrecto | Multas proporcionales |

### Para fabricantes y comercializadores de software

| Infracción | Sanción máxima |
|---|---|
| Comercializar software que no cumple el RRSIF | **150.000 €** |
| Comercializar software con doble contabilidad o manipulación de registros | **150.000 €** |

### Aspectos clave

- Las sanciones para usuarios entran en vigor con las fechas de obligatoriedad (2027).
- Hacienda ha anunciado un período de adaptación sin sanciones de **6 meses** tras la fecha de obligatoriedad para autónomos.
- Si el usuario demuestra que usa software con declaración responsable correcta del fabricante, **queda eximido de responsabilidad** por fallos técnicos del sistema.
- La inspección tributaria, al detectar incumplimiento, puede presumir fraude fiscal y abrir procedimientos más amplios.

---

## 10. Modo VERI*FACTU vs modo NO VERI*FACTU

| Característica | Modo VERI*FACTU | Modo NO VERI*FACTU |
|---|---|---|
| Envío de registros a AEAT | Automático, continuo, en tiempo real | No. Solo bajo requerimiento. |
| Firma electrónica de registros | No obligatoria | Obligatoria (eIDAS) |
| Leyenda en facturas | "VERI*FACTU" visible | Sin leyenda específica |
| Código QR | Obligatorio | Obligatorio |
| Custodia de registros | La AEAT los custodia | El propio negocio |
| Verificación por consumidor vía QR | Inmediata contra AEAT | Limitada |
| Carga técnica | Menor | Mayor |
| Cambio entre modos | De NO a SÍ: en cualquier momento. De SÍ a NO: solo al inicio de año natural. | — |

### Diferencia con TicketBAI / Batuz / LROE

| Sistema | Territorio | Alcance |
|---|---|---|
| **VERI*FACTU** | España (territorio común) | Regula cómo funciona internamente el SIF + opcionalmente envía registros a AEAT |
| **TicketBAI** | País Vasco (las 3 diputaciones) | Firma electrónica de cada factura + envío obligatorio a la hacienda foral |
| **Batuz / LROE** | Solo Bizkaia | TicketBAI + libros registro de ingresos, gastos e IVA (más amplio que VERI*FACTU) |
| **Normativa foral Navarra** | Navarra | Propia, compatible con TicketBAI |

---

## 11. Implicaciones específicas para hostelería

### Por qué la hostelería es sector prioritario para la AEAT

- Alto volumen de operaciones en **efectivo con consumidores finales**.
- Uso intensivo de **sistemas TPV**.
- Emisión masiva de **facturas simplificadas (tickets)**.
- Historial de fraude fiscal mediante software de supresión de ventas ("caja B").
- La AEAT considera el sector como **de alto riesgo** en materia de control fiscal.

### Qué debe hacer un bar o restaurante

#### Respecto al TPV

- El TPV debe ser un SIF conforme al RRSIF con **declaración responsable del fabricante**.
- Debe generar un registro de facturación por cada ticket emitido.
- Cada cierre de caja, anulación y descuento queda registrado de forma inalterable.
- Los TPV que solo generan tickets en papel sin registrar digitalmente la operación **ya no son conformes**.
- Los sistemas de gestión de pedidos (comandas, sala, cocina) que también gestionan la facturación entran en el ámbito del RRSIF.

#### Respecto a los tickets (facturas simplificadas F2)

- **Todos los tickets deben incluir código QR** desde la fecha de obligatoriedad.
- El ticket debe incluir la leyenda "VERI*FACTU" si el negocio opera en ese modo.
- Cada ticket genera su registro de facturación con hash, encadenado al anterior.
- Las anulaciones de tickets se registran aparte; el ticket original nunca se borra.

#### Casos especiales en hostelería

| Caso | Situación |
|---|---|
| **Bares/restaurantes en módulos** | La mayoría tributa por estimación objetiva, pero si usan TPV o software de facturación, están obligados. |
| **Hostelería en SII** (hoteles o cadenas > 6 M€) | Exentos del RRSIF; ya están en SII. |
| **Catering para empresas** | Las facturas completas F1 emitidas a otras empresas también deben cumplir todos los requisitos. |
| **Comida a domicilio / plataformas** | Si la facturación pasa por software propio, aplica el RRSIF. |
| **Excel o hojas de cálculo** | Si calculan IVA, totales o automatizan datos, ya son consideradas SIF y entran en el ámbito del reglamento. |

#### Lista de adaptaciones necesarias para hostelería

1. Verificar que el proveedor del TPV tiene **declaración responsable** emitida para la versión actual.
2. **Actualizar el TPV** a una versión conforme al RRSIF antes de las fechas límite.
3. **Configurar el modo de operación** (VERI*FACTU o NO VERI*FACTU).
4. Asegurarse de que los **tickets impresos incluyen el QR**.
5. **Formar al personal** para que no intente anular incorrectamente registros.
6. Verificar que los procedimientos de **copia de seguridad** cumplen los requisitos de conservación (4 años mínimo).

---

## 12. Exenciones y casos especiales

### Exenciones claras

| Caso | Situación |
|---|---|
| Empresas en **SII** (> 6 M€, grupos IVA, REDEME) | Exentas del RRSIF |
| Actividades en **País Vasco y Navarra** | Aplica normativa foral propia |
| Operaciones sin obligación de facturar (consumidor final que no pide factura en ciertos regímenes) | Fuera del ámbito solo para esas operaciones |
| **REAGP** — recibos de compensación agraria | Exentos solo para esos documentos |
| Facturación **100% manual** (sin software) | Fuera del ámbito técnico |

### Matices importantes

- Exento de IVA (médicos, educación...) **no exime** de VERI*FACTU si se emiten facturas con software.
- En módulos **no exime** si se usa TPV o software de facturación.
- Una empresa puede tener **varios SIF** (uno por local, uno por delegación) y cada uno opera con su propia cadena de registros.
- En un mismo sistema, **no se puede mezclar** el modo VERI*FACTU con el NO VERI*FACTU.

---

## 13. Recursos oficiales AEAT

| Recurso | URL |
|---|---|
| Portal principal VERI*FACTU | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html |
| Cuestiones generales y ámbito de aplicación | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/cuestiones-generales.html |
| FAQ Sistemas VERI*FACTU | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/sistemas-verifactu.html |
| FAQ Hash/Huella Digital | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/huella-hash.html |
| FAQ Declaración Responsable del fabricante | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/certificacion-sistemas-informaticos-declaracion-responsable.html |
| FAQ Procedimientos de Facturación | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/procedimientos-facturacion.html |
| Portal de Desarrolladores (documentación técnica y esquemas XML) | https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/ |
| Aplicación gratuita VERI*FACTU de la AEAT | https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/aplicacion-gratuita-verifactu-aeat.html |
| Nota informativa ampliación de plazos (RDL 15/2025) | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html |
| BOE — Real Decreto 1007/2023 | https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840 |
| BOE — Orden HAC/1177/2024 | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-22138 |
| Portal de pruebas para desarrolladores (preproducción) | https://preportal.aeat.es |

---

## 14. Resumen ejecutivo para un bar o restaurante

**Si tienes un bar, restaurante o cafetería en territorio común (no País Vasco ni Navarra):**

| Qué | Cuándo |
|---|---|
| Tu proveedor de TPV debe tener el software adaptado | Ya debería estarlo (plazo: 29 julio 2025) |
| Obligatorio si facturas como sociedad (SL, SA...) | **1 enero 2027** |
| Obligatorio si eres autónomo | **1 julio 2027** |
| Período de adaptación sin sanciones tras la fecha | 6 meses adicionales (anunciado por AEAT) |

**Checklist para cumplir:**

- [ ] Exige a tu proveedor de TPV la **declaración responsable** del software actualizada.
- [ ] Todos tus tickets tendrán **código QR** desde que uses el nuevo sistema.
- [ ] Decide si operas en **modo VERI*FACTU** (envío automático a AEAT, recomendado) o modo NO VERI*FACTU (almacenamiento local con firma electrónica).
- [ ] Las anulaciones de tickets quedan registradas; ya **no se puede borrar** nada.
- [ ] Implementa copias de seguridad que conserven los registros **al menos 4 años**.
- [ ] Si facturas como sociedad o tienes un software de gestión de pedidos que genera facturas, **empezar la adaptación ya** (no esperar a 2027).
- [ ] Si tu facturación supera los **6 millones €/año**, probablemente ya estás en SII y no necesitas VERI*FACTU.

**Sanciones máximas a tener en cuenta:**
- Usar software no conforme: hasta **50.000 €/año**
- Factura con datos incorrectos: hasta **1.000 € por factura**

---

*Fuentes: RD 1007/2023, Orden HAC/1177/2024, RDL 15/2025, documentación oficial AEAT, BOE.*
