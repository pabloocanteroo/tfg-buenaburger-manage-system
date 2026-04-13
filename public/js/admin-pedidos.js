// ── admin-pedidos.js — Gestión de pedidos en el panel admin ──────────────────

let _pedidosCache = [];

async function cargarPedidosAdmin() {
    const fecha = document.getElementById('pedidos-fecha').value;
    const cont  = document.getElementById('lista-pedidos-admin');
    if (!fecha) { cont.innerHTML = '<p style="color:#888;padding:20px">Selecciona una fecha.</p>'; return; }
    cont.innerHTML = '<div class="loading-calendario">Cargando pedidos...</div>';
    try {
        const res = await fetch(`${API}/api/pedidos/todos?fecha=${fecha}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        const { pedidos } = data;
        _pedidosCache = pedidos;
        if (!pedidos.length) {
            cont.innerHTML = '<p style="color:#888;padding:20px">No hay pedidos para esta fecha.</p>';
            return;
        }
        cont.innerHTML = pedidos.map((p, idx) => {
            const horaCreacion = new Date(p.fechaCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const primerBloque = p.bloques?.[0];
            const horaRecogida = primerBloque?.horaInicio || (p.horaRecogida ? new Date(p.horaRecogida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—');
            const fechaRecogidaRaw = primerBloque?.fecha || p.horaRecogida;
            const fechaRecogida = fechaRecogidaRaw
                ? new Date(fechaRecogidaRaw).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';
            // Nombres de producto vienen del catálogo, pero los puede editar el admin → escapar igualmente.
            const lineas      = p.lineas.map(l => `${l.cantidad}× ${escHTML(l.producto?.nombre || l.nombre || '?')}`).join(', ');
            const estadoColor = p.estado === 'CANCELADO' ? '#e74c3c' : p.estado === 'CONFIRMADO' ? '#27ae60' : '#f39c12';
            const cancelado   = p.estado === 'CANCELADO';
            // numero es BB-YYYYMMDD-NNNN (seguro) pero lo escapamos por si en el futuro cambia el formato.
            const numeroPedido = escHTML(p.numero || p._id.slice(-6).toUpperCase());
            const numeroAttr   = escAttr(p.numero || p._id.slice(-6).toUpperCase());
            return `
            <div class="pedido-admin-card ${cancelado ? 'pedido-cancelado' : ''}">
                <div class="pedido-admin-top">
                    <div>
                        <div class="pedido-admin-num">${numeroPedido}</div>
                        <div class="pedido-admin-hora">Creado: ${horaCreacion} · ${escHTML(p.canal || '—')}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                        <span style="font-weight:900;font-size:1.1rem;color:#1a1a1a">${p.total?.toFixed(2)}€</span>
                        <span style="font-size:.75rem;font-weight:700;color:${estadoColor}">${escHTML(p.estado)}</span>
                    </div>
                </div>
                <div class="pedido-admin-recogida" style="background:#FFEBEE;border-left:3px solid #E32A2A;padding:8px 12px;margin:8px 0;border-radius:4px;font-weight:700;color:#B71C1C">
                    📅 RECOGIDA: ${escHTML(fechaRecogida)} a las ${escHTML(horaRecogida)}
                </div>
                <div class="pedido-admin-cliente">👤 ${escHTML(p.nombreCliente || '—')} &nbsp;·&nbsp; 📞 ${escHTML(p.telefonoCliente || '—')}</div>
                <div class="pedido-admin-lineas">${lineas}</div>
                <div class="pedido-admin-acciones">
                    <button class="btn-reimprimir" onclick="reimprimirTicket('${escAttr(p._id)}', 'cliente')" title="Reimprimir ticket cliente">🖨 Cliente</button>
                    <button class="btn-reimprimir" onclick="reimprimirTicket('${escAttr(p._id)}', 'cocina')"  title="Reimprimir ticket cocina">🖨 Cocina</button>
                    ${!cancelado ? `
                    <button class="btn-modificar-pedido" onclick="modificarPedidoAdmin(${idx})">✏️ Modificar</button>
                    <button class="btn-eliminar-pedido"  onclick="eliminarPedidoAdmin('${escAttr(p._id)}', '${numeroAttr}')">🗑 Eliminar</button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:20px">Error: ${escHTML(err.message)}</p>`;
    }
}

function modificarPedidoAdmin(idx) {
    const p = _pedidosCache[idx];
    if (!p) return;
    const bloqueId = p.bloques?.[0]?._id || p.bloques?.[0] || null;
    localStorage.setItem('bb_editar_pedido', JSON.stringify({
        pedidoId:        p._id,
        numero:          p.numero || p._id.slice(-6).toUpperCase(),
        nombreCliente:   p.nombreCliente   || '',
        telefonoCliente: p.telefonoCliente || '',
        bloqueId:        bloqueId ? bloqueId.toString() : null,
        lineas:          p.lineas
    }));
    window.location.href = '/pos.html';
}

async function eliminarPedidoAdmin(id, numero) {
    if (!confirm(`¿Cancelar el pedido ${numero}?\nSe liberarán los bloques reservados.`)) return;
    try {
        const res = await fetch(`${API}/api/pedidos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`Pedido ${numero} cancelado`, 'verde');
        cargarPedidosAdmin();
    } catch (err) {
        mostrarToast(`Error: ${err.message}`, 'rojo');
    }
}
