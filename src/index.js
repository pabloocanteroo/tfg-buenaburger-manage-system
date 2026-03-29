const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const { iniciarScheduler } = require('./services/bloqueScheduler');
const socketService = require('./services/socket');

dotenv.config();
connectDB().then(() => iniciarScheduler());

const app = express();
const server = http.createServer(app);
const io = new Server(server);
socketService.init(io);

io.on('connection', (socket) => {
    // Al conectarse, informar cuántos pedidos hay en cola
    const cola = socketService.getCola();
    socket.emit('cola-pendiente', { cantidad: cola.length });
    socket.on('disconnect', () => {});
});

// ── Ficheros estáticos (frontend) ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/productos', require('./routes/producto.routes'));
app.use('/api/extras', require('./routes/extra.routes'));
app.use('/api/bloques', require('./routes/bloque.routes'));
app.use('/api/pedidos', require('./routes/pedido.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// ── Ruta raíz ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ mensaje: ' Buena Burger API funcionando' });
});

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        ok: false,
        mensaje: err.message || 'Error interno del servidor'
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
