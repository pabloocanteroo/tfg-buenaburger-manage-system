// Módulo singleton para Socket.io.
// Solo gestiona notificaciones al iPad (alerta sonora + badge).
// La cola y la impresión WiFi se gestionan en printer.js.

let _io = null;

exports.init  = (io) => { _io = io; };
exports.getIo = ()   => _io;

/**
 * Emite evento de nuevo pedido al room `staff` (ADMIN y EMPLEADO autenticados
 * vía JWT en el handshake del socket). No se hace broadcast general porque
 * cualquier visitante anónimo de la web pública estaría conectado al namespace
 * y podría escuchar los eventos con dos líneas en la consola del navegador.
 */
exports.notificarNuevoPedido = (pedido) => {
    if (_io) _io.to('staff').emit('nuevo-pedido', { pedidoId: pedido._id });
};
