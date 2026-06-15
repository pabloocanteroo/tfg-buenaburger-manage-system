<div align="center">

# Buena Burger Management System

### Sistema web de gestión integral de pedidos *take away* con bloques de producción y asistente de IA

Trabajo Fin de Grado en Ingeniería Informática<br>
**Pablo Cantero · Universidad Europea del Atlántico · 2026**

[![Capítulo 1](https://img.shields.io/badge/Cap._1-Introducción-333333?style=for-the-badge)](Capitulo_1/README.md)
[![Capítulo 2](https://img.shields.io/badge/Cap._2-Requisitos-146B8C?style=for-the-badge)](Capitulo_2/README.md)
[![Capítulo 3](https://img.shields.io/badge/Cap._3-Diseño-8B1E3F?style=for-the-badge)](Capitulo_3/README.md)
[![Capítulo 4](https://img.shields.io/badge/Cap._4-Implementación-287A4D?style=for-the-badge)](Capitulo_4/README.md)
[![Capítulo 5](https://img.shields.io/badge/Cap._5-Evaluación-6C3483?style=for-the-badge)](Capitulo_5/README.md)

</div>

---

## Sobre este repositorio

Este repositorio **no documenta solo un producto, documenta el proceso de ingeniería de software** que llevó a él. Está organizado para recorrer ese proceso de principio a fin —del **modelo del dominio** al **código**— de forma que cada decisión quede trazada hasta el artefacto que la justifica.

> **Cómo usar este repositorio en la defensa.** La exposición se hace **de memoria**, explicando el análisis. El repositorio se usa para **mostrar los diagramas y las tablas** que respaldan cada afirmación, no para leer de él. La sección [Ruta de defensa](#ruta-de-defensa-el-hilo-conductor) indica, para cada artefacto, **en qué capítulo y archivo está**.

**El sistema.** Buena Burger digitaliza la toma y gestión de pedidos *take away* de una hamburguesería artesanal de Oruña de Piélagos (Cantabria) que opera viernes, sábado y domingo. Combina una web pública de pedidos, un asistente de WhatsApp con IA (Claude/Anthropic), un TPV, un panel de administración, una API Node.js/Express, persistencia MongoDB Atlas y notificación en tiempo real a cocina. La decisión central del sistema separa la conversación de la integridad:

> La IA y la web **ayudan a recoger** el pedido; el servidor **valida** los precios, **comprueba** la capacidad y **reserva** los bloques de producción.

---

## Ruta de defensa: el hilo conductor

El proceso de ingeniería se recorre en este orden. Cada fila enlaza al lugar exacto del repositorio donde vive el artefacto.

| # | Artefacto del proceso | Dónde está | Forma |
|:-:|---|---|---|
| 1 | **Modelo del dominio** — punto de partida | [Cap. 2 · §1](Capitulo_2/README.md#1-modelo-del-dominio) | Diagrama de clases del dominio + glosario |
| 2 | **Requisitos** — funcionales y no funcionales | [Cap. 2 · §2](Capitulo_2/README.md#2-requisitos) | Casos de uso priorizados + requisitos suplementarios |
| 3 | **Diagrama de contexto** — todo el sistema | [Cap. 2 · §3](Capitulo_2/README.md#3-diagrama-de-contexto) | Contexto + diagrama de estados del pedido |
| 4 | **Casos de uso** — objetivos por actor | [Cap. 2 · §4](Capitulo_2/README.md#4-casos-de-uso) | Diagrama de casos de uso + detalle en texto |
| 5 | **Diagramas de secuencia/colaboración** por UC | [Cap. 3 · §2](Capitulo_3/README.md#2-realización-de-casos-de-uso-colaboración) | UC-02, UC-09, UC-11, UC-14 |
| 6 | **Modelo MVC (análisis)** | [Cap. 3 · §1](Capitulo_3/README.md#1-clases-de-análisis-mvc) | Clases de análisis vista / controlador / modelo |
| 7 | **Prototipos de vistas** | [Cap. 2 · §5](Capitulo_2/README.md#5-prototipos-de-vistas) | Prototipos por caso de uso |
| 8 | **Diagrama de arquitectura** | [Cap. 3 · §3](Capitulo_3/README.md#3-arquitectura) | Capas + componentes + despliegue |
| 9 | **Modelo de datos** | [Cap. 3 · §4](Capitulo_3/README.md#4-modelo-de-datos) | Diagrama entidad-relación (ERD) |
| 10 | **Vistas y módulos de código** | [Cap. 4](Capitulo_4/README.md) · [Organización del código](#cómo-está-organizado-el-código) | Navegación + mapeo MVC → carpetas |

---

## Índice por capítulos

| Capítulo | Disciplina | Contenido principal |
|---|---|---|
| [**Capítulo 1 — Introducción**](Capitulo_1/README.md) | Contexto y objetivos | Problema, estado del arte, propuesta, objetivos, stack |
| [**Capítulo 2 — Requisitos**](Capitulo_2/README.md) | Análisis del problema | Dominio, requisitos, contexto, casos de uso, prototipos |
| [**Capítulo 3 — Diseño**](Capitulo_3/README.md) | Análisis y diseño | MVC, colaboración, arquitectura, datos, clases de diseño |
| [**Capítulo 4 — Implementación**](Capitulo_4/README.md) | Construcción | Interfaces, navegación, impresión, WhatsApp IA, código |
| [**Capítulo 5 — Evaluación**](Capitulo_5/README.md) | Cierre | Hipótesis, objetivos, discusión, líneas futuras |

La memoria académica completa está en [`docs/capitulos/`](docs/capitulos). Cada capítulo de este repositorio enlaza a su sección correspondiente de la memoria.

---

## Cómo está organizado el código

El sistema sigue el patrón **Modelo–Vista–Controlador** sobre una arquitectura **cliente-servidor con API REST**. La correspondencia entre el patrón y las carpetas del repositorio es directa:

| Capa MVC | Responsabilidad | Dónde está en el código |
|---|---|---|
| **Vista** | Presentar e invocar. Renderiza la interfaz y lanza peticiones a la API. | [`public/`](public) — `index.html`, `cliente.html`, `pos.html`, `empleados.html`, `admin.html` (HTML/CSS/JS vanilla) |
| **Controlador** | Orquestar los casos de uso. Recibe la petición, aplica las reglas de negocio y responde. | [`src/controllers/`](src/controllers) + [`src/routes/`](src/routes) (API REST) |
| **Modelo** | Representar los conceptos del dominio y persistirlos. **Deriva del modelo del dominio.** | [`src/models/`](src/models) — `pedido`, `cliente`, `producto`, `extra`, `bloque`, `usuario` (Mongoose) |
| *Servicios* | Lógica transversal: bloques, impresión ESC/POS, tiempo real, IA. | [`src/services/`](src/services) — `bloqueScheduler`, `printer`, `socket`, `ia.service`, WhatsApp |
| *Middleware* | Autenticación JWT, autorización por rol y validación de entrada. | [`src/middleware/`](src/middleware) |

```text
tfg-buenaburger-manage-system/
├── Capitulo_1/ … Capitulo_5/   Guía de defensa por capítulo (este repositorio)
├── src/
│   ├── config/        Conexión a MongoDB Atlas
│   ├── models/        Modelos Mongoose  ← derivan del modelo del dominio
│   ├── controllers/   Casos de uso (pedidos, pagos, WhatsApp, admin)
│   ├── routes/        API REST
│   ├── middleware/    Autenticación JWT y validación
│   ├── services/      Bloques, impresión ESC/POS, Socket.io, IA y WhatsApp
│   ├── utils/         Constantes y helpers
│   ├── seed.js        Datos iniciales
│   └── index.js       Servidor Express + Socket.io
├── public/            Vistas: web pública, perfil, TPV y paneles
├── agente-impresion/  Agente de impresión para Raspberry Pi
├── docs/              Memoria, capítulos, diagramas y guías
└── README.md
```

---

## Arquitectura

<div align="center">

[![Arquitectura en capas](docs/diagramas/capitulo3/01_capas_arquitectura.png)](docs/diagramas/capitulo3/01_capas_arquitectura.png)

</div>

> **Arquitectura de producción.** En explotación el sistema funciona desplegado en **Render**, con **MongoDB Atlas** y un **agente en Raspberry Pi** que imprime en la red local del negocio. Es la configuración actual y la prevista a futuro.
>
> **Demostración ante el tribunal.** La defensa se ejecuta **en local sobre un único equipo** (sin Render y sin Raspberry Pi). Es el mismo código; solo cambia dónde se ejecuta y el transporte de impresión.

| Área | Tecnología |
|---|---|
| Frontend (Vista) | HTML, CSS y JavaScript vanilla |
| Backend (Controlador/Servicios) | Node.js, Express 4 |
| Persistencia (Modelo) | MongoDB Atlas, Mongoose |
| Tiempo real | Socket.io |
| Seguridad | JWT, bcrypt, Helmet, CORS, express-rate-limit, express-validator |
| Pagos | Stripe |
| IA y mensajería | Claude (Anthropic) + Meta Cloud API (WhatsApp) |
| Impresión | ESC/POS por TCP + agente en Raspberry Pi |

---

## Ejecución en local (demostración ante el tribunal)

Forma de arrancar el sistema **en un solo equipo**. **No requiere Render ni la Raspberry Pi.**

```bash
git clone <url-del-repositorio>
cd tfg-buenaburger-manage-system
npm install
npm start                   # http://localhost:3000
node src/seed.js --force    # datos iniciales (admin + carta de ejemplo)
```

| Servicio | Dirección |
|---|---|
| Web pública / API | `http://localhost:3000` |
| Panel de administración | `http://localhost:3000/admin.html` |
| Panel de empleados (POS) | `http://localhost:3000/empleados.html` |

Variables de entorno en `.env` (ver [`.env.example`](.env.example)): `MONGODB_URI`, `JWT_SECRET`, `STRIPE_*`, `WHATSAPP_*`, `ANTHROPIC_API_KEY`.

**Impresión en la demo.** En local, con `PRINTER_MODE=tcp` el propio servidor imprime directo sobre la impresora de la red. Si no hay impresora, el pedido se crea y se notifica a cocina igualmente; la impresión se omite o queda en cola. El procedimiento de producción (Render + Raspberry Pi, `PRINTER_MODE=socket`) está en las guías de [arranque](docs/ARRANQUE.md) y [despliegue](docs/DEPLOY.md).

---

<div align="center">

**[Capítulo 1](Capitulo_1/README.md) · [Capítulo 2](Capitulo_2/README.md) · [Capítulo 3](Capitulo_3/README.md) · [Capítulo 4](Capitulo_4/README.md) · [Capítulo 5](Capitulo_5/README.md)**

</div>
