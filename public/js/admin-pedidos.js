// ── admin-pedidos.js — Vista de pedidos por bloques (admin) ──────────────────

let _pedidosCache   = [];
let _bloquesAdm     = [];
let _bloqueSelAdm   = null;
let _pedidoModalAdm = null;

// ── Carga principal ────────────────────────────────────────────────────────────
async function cargarPedidosAdmin() {
    const fecha = document.getElementById('pedidos-fecha').value;
    if (!fecha) return;

    // Reset estado
    _bloqueSelAdm = null;
    _bloquesAdm   = [];
    _pedidosCache = [];
    renderBloquesAdmin();
    renderPedidosAdmin([]);

    const countBadge = document.getElementById('padm-pedidos-count');
    if (countBadge) countBadge.style.display = 'none';

    try {
        const res  = await fetch(`${API}/api/pedidos/todos?fecha=${fecha}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);

        _bloquesAdm   = data.bloques;
        _pedidosCache = data.pedidos;
        renderBloquesAdmin();
    } catch (err) {
        document.getElementById('padm-lista-bloques').innerHTML =
            `<div class="padm-error">❌ Error: ${escHTML(err.message)}</div>`;
    }
}

// ── Render Bloques ─────────────────────────────────────────────────────────────
function renderBloquesAdmin() {
    const cont = document.getElementById('padm-lista-bloques');
    if (!cont) return;

    if (!_bloquesAdm.length) {
        cont.innerHTML = `<div class="padm-empty"><div class="padm-empty-icon">📅</div><p>Sin bloques para esta fecha</p></div>`;
        return;
    }

    const todoCerrado = _bloquesAdm.every(b => b.cerrado);
    if (todoCerrado) {
        cont.innerHTML = `
            <div class="padm-dia-cerrado">
                <span style="font-size:2rem">🔒</span>
                <strong>Día cerrado</strong>
                <p>Este día está desactivado en el calendario</p>
            </div>`;
        return;
    }

    cont.innerHTML = _bloquesAdm.map(b => {
        const libre   = b.capacidadMax - b.hamburgesasOcupadas;
        const pct     = b.capacidadMax > 0
            ? Math.min(100, Math.round((b.hamburgesasOcupadas / b.capacidadMax) * 100))
            : 0;
        const forzado = b.hamburgesasOcupadas > b.capacidadMax;

        let estadoClass, estadoLabel, barraClass;
        if (b.cerrado) {
            estadoClass = 'padm-bl-cerrado'; estadoLabel = '🔒 Cerrado';    barraClass = 'padm-barra-roja';
        } else if (forzado) {
            estadoClass = 'padm-bl-forzado'; estadoLabel = '⚡ Forzado';   barraClass = 'padm-barra-roja';
        } else if (pct >= 100) {
            estadoClass = 'padm-bl-lleno';   estadoLabel = 'LLENO';        barraClass = 'padm-barra-roja';
        } else if (pct >= 60) {
            estadoClass = 'padm-bl-parcial'; estadoLabel = `${libre} libres`; barraClass = 'padm-barra-amarilla';
        } else {
            estadoClass = 'padm-bl-libre';   estadoLabel = `${libre} libres`; barraClass = 'padm-barra-verde';
        }

        const numPedidos = _pedidosCache.filter(p =>
            p.bloques.some(bl => (bl._id || bl).toString() === b._id.toString())
        ).length;

        const sel      = _bloqueSelAdm === b._id ? ' selected' : '';
        const cerrado  = b.cerrado;

        return `<div class="padm-bloque-card${sel}${cerrado ? ' padm-bloque-cerrado' : ''}"
                    ${!cerrado ? `onclick="seleccionarBloqueAdmin('${escAttr(b._id)}','${escAttr(b.horaInicio)}')"` : ''}>
            <div class="padm-bloque-top">
                <span class="padm-bloque-hora">${escHTML(b.horaInicio)}</span>
                <span class="padm-bloque-estado ${estadoClass}">${escHTML(estadoLabel)}</span>
            </div>
            <div class="padm-barra-wrap">
                <div class="padm-barra ${barraClass}" style="width:${Math.min(pct, 100)}%"></div>
            </div>
            <div class="padm-bloque-counter">
                ${b.hamburgesasOcupadas}/${b.capacidadMax} burgers
                <span class="padm-bloque-badge">${numPedidos}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Seleccionar Bloque ─────────────────────────────────────────────────────────
function seleccionarBloqueAdmin(id, hora) {
    _bloqueSelAdm = id;
    renderBloquesAdmin();

    const lista = _pedidosCache.filter(p =>
        p.bloques.some(bl => (bl._id || bl).toString() === id)
    );

    const titulo  = document.getElementById('padm-pedidos-titulo');
    const sub     = document.getElementById('padm-pedidos-sub');
    const badge   = document.getElementById('padm-pedidos-count');

    if (titulo) titulo.textContent = `Pedidos de las ${hora}`;
    if (sub)    sub.textContent    = `${lista.length} pedido${lista.length !== 1 ? 's' : ''} en este bloque`;
    if (badge) {
        badge.textContent    = `${lista.length} pedidos`;
        badge.style.display  = 'inline-flex';
    }

    renderPedidosAdmin(lista);
}

// ── Render Pedidos ─────────────────────────────────────────────────────────────
function renderPedidosAdmin(lista = []) {
    const cont = document.getElementById('padm-lista-pedidos');
    if (!cont) return;

    if (!lista.length) {
        cont.innerHTML = `<div class="padm-empty">
            <div class="padm-empty-icon">${_bloqueSelAdm ? '✅' : '📋'}</div>
            <p>${_bloqueSelAdm ? 'No hay pedidos en este bloque' : 'Selecciona un bloque horario para ver sus pedidos'}</p>
        </div>`;
        return;
    }

    cont.innerHTML = lista.map(p => {
        const hora  = new Date(p.fechaCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const canal = p.canal || '—';
        const canalColor = canal === 'TELEFONO' ? '#1976D2'
                         : canal === 'WEB'      ? '#2E7D32'
                         : canal === 'WHATSAPP' ? '#25D366'
                         : '#888';
        const canalLabel = canal === 'TELEFONO' ? '📞 Teléfono'
                         : canal === 'WEB'      ? '🌐 Web'
                         : canal === 'WHATSAPP' ? '💬 WhatsApp'
                         : `📍 ${canal}`;

        const lineas    = p.lineas.map(l =>
            `${l.cantidad}× ${escHTML(l.producto?.nombre || l.nombre || '?')}`
        ).join(' · ');

        const cancelado = p.estado === 'CANCELADO';

        return `<div class="padm-pedido-card${cancelado ? ' padm-cancelado' : ''}"
                    onclick="abrirModalAdmin('${escAttr(p._id)}')">
            <div class="padm-pedido-top">
                <div>
                    <div class="padm-pedido-num">${escHTML(p.numero || p._id.slice(-6).toUpperCase())}</div>
                    <div class="padm-pedido-hora">Creado: ${hora}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <div class="padm-pedido-total">${p.total?.toFixed(2)}€</div>
                    <span style="font-size:.7rem;font-weight:700;color:${canalColor};background:#f5f5f5;padding:2px 8px;border-radius:10px">${escHTML(canalLabel)}</span>
                </div>
            </div>
            <div class="padm-pedido-cliente">
                <span>👤 ${escHTML(p.nombreCliente || 'Sin nombre')}</span>
                <span>📞 ${escHTML(p.telefonoCliente || 'Sin teléfono')}</span>
            </div>
            <div class="padm-pedido-lineas">${lineas}</div>
        </div>`;
    }).join('');
}

// ── Modal Detalle ──────────────────────────────────────────────────────────────
function abrirModalAdmin(pedidoId) {
    const p = _pedidosCache.find(x => x._id === pedidoId);
    if (!p) return;
    _pedidoModalAdm = pedidoId;

    const cancelado   = p.estado === 'CANCELADO';
    const horaBloque  = p.bloques?.[0]?.horaInicio || '—';
    const fechaBloque = p.bloques?.[0]?.fecha
        ? new Date(p.bloques[0].fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : (p.horaRecogida ? new Date(p.horaRecogida).toLocaleDateString('es-ES') : '—');

    const horaCreacion = new Date(p.fechaCreacion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const estadoColor  = cancelado ? '#e74c3c' : p.estado === 'CONFIRMADO' ? '#27ae60' : '#f39c12';

    document.getElementById('padm-modal-titulo').textContent =
        `Pedido ${p.numero || pedidoId.slice(-6).toUpperCase()}`;

    document.getElementById('padm-modal-body').innerHTML = `
        <div class="padm-modal-recogida">
            <div class="padm-modal-recogida-label">📅 RECOGIDA</div>
            <div class="padm-modal-recogida-valor">${escHTML(fechaBloque)} a las ${escHTML(horaBloque)}</div>
        </div>

        <div class="padm-modal-seccion">
            <div class="padm-modal-sec-titulo">CLIENTE</div>
            <p><strong>${escHTML(p.nombreCliente || 'Sin nombre')}</strong> · ${escHTML(p.telefonoCliente || 'Sin teléfono')}</p>
            <p style="color:#999;font-size:.78rem;margin-top:4px">Pedido creado: ${horaCreacion}</p>
        </div>

        <div class="padm-modal-seccion">
            <div class="padm-modal-sec-titulo">LÍNEAS DEL PEDIDO</div>
            ${p.lineas.map(l => {
                const nombre  = l.producto?.nombre || l.nombre || 'Producto';
                const sinIngr = l.ingredientesExcluidos || [];
                const addIngr = l.ingredientesAnadidos  || [];
                const extras  = l.extras || [];
                return `<div class="padm-modal-linea">
                    <div>
                        <div class="padm-modal-linea-nombre">${l.cantidad}× ${escHTML(nombre)}</div>
                        ${sinIngr.length ? `<div class="padm-modal-linea-mod mod-sin">Sin: ${escHTML(sinIngr.join(', '))}</div>` : ''}
                        ${addIngr.length ? `<div class="padm-modal-linea-mod mod-add">+ ${escHTML(addIngr.join(', '))}</div>` : ''}
                        ${extras.length  ? `<div class="padm-modal-linea-mod mod-ext">Extras: ${escHTML(extras.map(e => `${e.cantidad}× ${e.nombre || 'Extra'}`).join(', '))}</div>` : ''}
                    </div>
                    <div class="padm-modal-linea-precio">${(l.precioUnitario * l.cantidad).toFixed(2)}€</div>
                </div>`;
            }).join('')}
        </div>

        <div class="padm-modal-resumen">
            <div>
                Canal: <strong>${escHTML(p.canal || '—')}</strong>
                &nbsp;·&nbsp;
                <span style="font-weight:700;color:${estadoColor}">${escHTML(p.estado || '—')}</span>
            </div>
            <div class="padm-modal-total">${p.total?.toFixed(2)}€</div>
        </div>`;

    const idAttr  = escAttr(p._id);
    const numAttr = escAttr(p.numero || p._id.slice(-6).toUpperCase());

    document.getElementById('padm-modal-footer').innerHTML = `
        <button class="btn-reimprimir" onclick="reimprimirTicket('${idAttr}','cliente')">🖨 Cliente</button>
        <button class="btn-reimprimir" onclick="reimprimirTicket('${idAttr}','cocina')">🖨 Cocina</button>
        ${!cancelado ? `
            <button class="btn-modificar-pedido" onclick="cerrarModalAdmin();_modificarDesdeModal('${idAttr}')">✏️ Modificar</button>
            <button class="btn-eliminar-pedido"  onclick="cerrarModalAdmin();eliminarPedidoAdmin('${idAttr}','${numAttr}')">🗑 Cancelar pedido</button>
        ` : ''}
        <button class="btn-refresh" style="margin-left:auto" onclick="cerrarModalAdmin()">Cerrar</button>`;

    document.getElementById('padm-modal-overlay').style.display = 'flex';
}

function cerrarModalAdmin() {
    _pedidoModalAdm = null;
    document.getElementById('padm-modal-overlay').style.display = 'none';
}

function _modificarDesdeModal(pedidoId) {
    const p = _pedidosCache.find(x => x._id === pedidoId);
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

// Mantener compatibilidad con código anterior que usa índice
function modificarPedidoAdmin(idx) {
    _modificarDesdeModal(_pedidosCache[idx]?._id);
}

async function eliminarPedidoAdmin(id, numero) {
    if (!confirm(`¿Cancelar el pedido ${numero}?\nSe liberarán los bloques reservados.`)) return;
    const bloqueAnterior = _bloqueSelAdm;
    try {
        const res  = await fetch(`${API}/api/pedidos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`Pedido ${numero} cancelado`, 'verde');
        await cargarPedidosAdmin();
        // Reseleccionar el mismo bloque tras recargar
        if (bloqueAnterior) {
            const b = _bloquesAdm.find(x => x._id === bloqueAnterior);
            if (b) seleccionarBloqueAdmin(bloqueAnterior, b.horaInicio);
        }
    } catch (err) {
        mostrarToast(`Error: ${err.message}`, 'rojo');
    }
}
