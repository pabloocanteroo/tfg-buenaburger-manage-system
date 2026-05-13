const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/database');
const { iniciarScheduler } = require('./services/bloqueScheduler');
const socketService  = require('./services/socket');
const printerService = require('./services/printer');

dotenv.config();
connectDB().then(() => iniciarScheduler());

const app = express();
const server = http.createServer(app);

// ── Cabeceras de seguridad HTTP ───────────────────────────────────────────────
// X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy...
// CSP queda desactivada de momento para no romper Google Fonts / inline scripts del frontend;
// cuando se migre el XSS a addEventListener se puede afinar una CSP completa.
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
// En desarrollo acepta cualquier origen; en producción usa ALLOWED_ORIGINS del .env
const corsOptions = process.env.ALLOWED_ORIGINS
    ? { origin: process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()), credentials: true }
    : {};
app.use(cors(corsOptions));

const io = new Server(server, { cors: corsOptions });
socketService.init(io);
printerService.setIo(io);

// ── Autenticación Socket.io ───────────────────────────────────────────────────
io.use((socket, next) => {
    // Agente de impresión (Raspberry Pi): autentica con AGENT_SECRET
    const agentSecret = socket.handshake.auth?.agentSecret;
    if (agentSecret && process.env.AGENT_SECRET && agentSecret === process.env.AGENT_SECRET) {
        socket.esAgente = true;
        return next();
    }

    // Staff y clientes: autenticación JWT (anónimo permitido para páginas públicas)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.usuario = payload;
        } catch {
            // Token inválido — se conecta como anónimo
        }
    }
    next();
});

io.on('connection', (socket) => {
    if (socket.esAgente) {
        socket.join('printer-agent');
        console.log('[Socket] Agente de impresión conectado');
        printerService.onAgenteConectado(socket);
        socket.on('disconnect', () => console.log('[Socket] Agente de impresión desconectado'));
        return;
    }

    if (socket.usuario?.rol === 'ADMIN' || socket.usuario?.rol === 'EMPLEADO') {
        socket.join('staff');
        socket.emit('cola-pendiente', { cantidad: printerService.getCola().length });
    }
});

// ── Ficheros estáticos (frontend) ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Webhook Stripe (raw body — debe ir ANTES de express.json()) ───────────────
const pagoController = require('./controllers/pago.controller');
app.post('/api/pagos/webhook', express.raw({ type: 'application/json' }), pagoController.webhook);

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/productos', require('./routes/producto.routes'));
app.use('/api/extras', require('./routes/extra.routes'));
app.use('/api/bloques', require('./routes/bloque.routes'));
app.use('/api/pedidos', require('./routes/pedido.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/pagos', require('./routes/pago.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp.routes'));

// ── Ruta raíz ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// ── Manejo de errores global ──────────────────────────────────────────────────
// En producción no se expone el mensaje interno para no filtrar información sensible.
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err.stack);
    const esProduccion = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        ok: false,
        mensaje: esProduccion ? 'Error interno del servidor' : (err.message || 'Error interno del servidor')
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
