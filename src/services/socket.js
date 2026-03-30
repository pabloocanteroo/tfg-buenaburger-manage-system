// Módulo singleton para Socket.io.
// Solo gestiona notificaciones al iPad (alerta sonora + badge).
// La cola y la impresión WiFi se gestionan en printer.js.

let _io = null;

exports.init  = (io) => { _io = io; };
exports.getIo = ()   => _io;

/** Emite evento de nuevo pedido al iPad para activar alerta sonora y actualizar UI */
exports.notificarNuevoPedido = (pedido) => {
    if (_io) _io.emit('nuevo-pedido', { pedidoId: pedido._id });
};
