// Módulo singleton para compartir la instancia de Socket.io
// Gestiona también la cola de pedidos pendientes de imprimir.

let _io = null;
const _cola = [];   // pedidos pendientes mientras no hay tablet conectada

exports.init = (io) => { _io = io; };
exports.getIo = () => _io;

// Devuelve cuántos pedidos hay en cola (para el badge del botón en admin)
exports.getCola = () => _cola;

// Añade un pedido a la cola sin emitir (se llama desde el controller)
exports.encolarPedido = (pedido) => { _cola.push(pedido); };

// Vacía la cola y devuelve los pedidos que había
exports.vaciarCola = () => _cola.splice(0, _cola.length);

// Emite un pedido: si hay tablets conectadas lo manda directo,
// si no lo encola para cuando alguien se conecte.
exports.emitirOEncolar = (pedido) => {
    const sockets = _io ? [..._io.sockets.sockets.values()] : [];
    if (sockets.length > 0) {
        _io.emit('imprimir-pedido', pedido);
    } else {
        _cola.push(pedido);
    }
};
