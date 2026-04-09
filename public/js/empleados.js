// ══ Auth Guard ═══════════════════════════════════════════════════════════════
const token = localStorage.getItem('bb_token');
const rol = localStorage.getItem('bb_rol');
const nombre = localStorage.getItem('bb_nombre');

if (!token || rol !== 'EMPLEADO') {
    if (rol === 'ADMIN') {
        window.location.href = '/admin.html';
    } else {
        window.location.href = '/index.html';
    }
}

document.getElementById('emp-nombre').textContent = nombre || 'Empleado';
document.getElementById('emp-rol').textContent = rol || '';

// ══ Estado local ═════════════════════════════════════════════════════════════
let bloques = [];
let pedidos = [];
let bloqueSeleccionado = null;
let pedidoParaCancelar = null;

// ══ Init ═════════════════════════════════════════════════════════════════════
const selectorFecha = document.getElementById('selector-fecha');
selectorFecha.value = new Date().toISOString().split('T')[0];

cargarDatos();

// ══ Carga principal ══════════════════════════════════════════════════════════
async function cargarDatos() {
    bloqueSeleccionado = null;
    bloques = [];
    pedidos = [];
    renderBloques();
    renderPedidos();

    const fecha = selectorFecha.value;
    try {
        const res = await fetch(`/api/pedidos/todos?fecha=${fecha}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        bloques = data.bloques;
        pedidos = data.pedidos;
        renderBloques();
    } catch (err) {
        document.getElementById('lista-bloques').innerHTML =
            `<div class="loading" style="color:#e74c3c">Error: ${err.message}</div>`;
    }
}

// ══ Render Bloques ════════════════════════════════════════════════════════════
function renderBloques() {
    const cont = document.getElementById('lista-bloques');
    if (!bloques.length) {
        cont.innerHTML = '<div class="loading">No hay bloques para esta fecha</div>';
        return;
    }

    // Si TODOS los bloques están cerrados → banner de día cerrado
    const todoCerrado = bloques.every(b => b.cerrado);
    if (todoCerrado) {
        cont.innerHTML = `
            <div class="dia-cerrado-banner">
                <div class="dia-cerrado-icon">🔒</div>
                <div class="dia-cerrado-texto">Este día está cerrado</div>
                <div class="dia-cerrado-sub">El administrador ha desactivado este día de operación. No se pueden crear ni recibir pedidos.</div>
            </div>`;
        return;
    }

    cont.innerHTML = bloques.map(b => {
        const libre = b.capacidadMax - b.hamburgesasOcupadas;
        const pct = Math.min(100, Math.round((b.hamburgesasOcupadas / b.capacidadMax) * 100));
        const forzado = b.hamburgesasOcupadas > b.capacidadMax;

        let estadoClass, estadoLabel, barraClass;
        if (b.cerrado) {
            estadoClass = 'estado-lleno'; estadoLabel = '🔒 Cerrado'; barraClass = 'barra-roja';
        } else if (forzado) {
            estadoClass = 'estado-forzado'; estadoLabel = '⚡Forzado'; barraClass = 'barra-roja';
        } else if (pct >= 100) {
            estadoClass = 'estado-lleno'; estadoLabel = 'LLENO'; barraClass = 'barra-roja';
        } else if (pct >= 60) {
            estadoClass = 'estado-parcial'; estadoLabel = `${libre} libres`; barraClass = 'barra-amarilla';
        } else {
            estadoClass = 'estado-libre'; estadoLabel = `${libre} libres`; barraClass = 'barra-verde';
        }

        const numPedidos = pedidos.filter(p => p.bloques.some(bl => bl._id === b._id || bl === b._id)).length;
        const selected = bloqueSeleccionado === b._id ? ' selected' : '';
        const clickable = !b.cerrado;

        return `<div class="bloque-card${selected}${b.cerrado ? ' bloque-cerrado' : ''}" ${clickable ? `onclick="seleccionarBloque('${b._id}', '${b.horaInicio}')"` : ''}>
            <div class="bloque-card-top">
                <span class="bloque-hora">${b.horaInicio}</span>
                <span class="bloque-estado ${estadoClass}">${estadoLabel}</span>
            </div>
            <div class="bloque-barra-wrap">
                <div class="bloque-barra ${barraClass}" style="width:${Math.min(pct, 100)}%"></div>
            </div>
            <div class="bloque-counter">${b.hamburgesasOcupadas}/${b.capacidadMax} burgers · ${numPedidos} pedido${numPedidos !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');
}


// ══ Seleccionar Bloque ═══════════════════════════════════════════════════════
function seleccionarBloque(id, hora) {
    bloqueSeleccionado = id;
    renderBloques();

    const pedidosDelBloque = pedidos.filter(p =>
        p.bloques.some(bl => (bl._id || bl).toString() === id)
    );

    document.getElementById('pedidos-titulo').textContent = `Pedidos de las ${hora}`;
    document.getElementById('pedidos-subtitulo').textContent =
        `${pedidosDelBloque.length} pedido${pedidosDelBloque.length !== 1 ? 's' : ''} en este bloque`;
    document.getElementById('pedidos-count').textContent = `${pedidosDelBloque.length} pedidos`;
    document.getElementById('pedidos-actions').style.display = 'flex';

    renderPedidos(pedidosDelBloque);
}

// ══ Render Pedidos ════════════════════════════════════════════════════════════
function renderPedidos(lista = []) {
    const cont = document.getElementById('lista-pedidos');
    if (!lista.length) {
        cont.innerHTML = `<div class="empty-state">
            <div class="empty-icon">${bloqueSeleccionado ? '✅' : '📋'}</div>
            <p>${bloqueSeleccionado ? 'No hay pedidos en este bloque' : 'Selecciona un bloque horario para ver sus pedidos'}</p>
        </div>`;
        return;
    }

    cont.innerHTML = lista.map(p => {
        const hora = new Date(p.fechaCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const lineasStr = p.lineas.map(l => `${l.cantidad}× ${l.nombreProducto || 'Producto'}`).join(', ');

        return `<div class="pedido-card" onclick="abrirModal('${p._id}')">
            <div class="pedido-card-top">
                <div>
                    <div class="pedido-num">${p.numero || p._id.slice(-6).toUpperCase()}</div>
                    <div class="pedido-hora">Creado a las ${hora}</div>
                </div>
                <div class="pedido-total">${p.total?.toFixed(2)}€</div>
            </div>
            <div class="pedido-cliente">
                <span>👤 ${p.nombreCliente || '—'}</span>
                <span>📞 ${p.telefonoCliente || '—'}</span>
            </div>
            <div class="pedido-lineas">
                ${p.lineas.map(l => `<span class="linea-chip">${l.cantidad}× ${l.nombreProducto || 'Producto'}</span>`).join('')}
            </div>
        </div>`;
    }).join('');
}

// ══ Modal Detalle ═════════════════════════════════════════════════════════════
function abrirModal(pedidoId) {
    const p = pedidos.find(x => x._id === pedidoId);
    if (!p) return;
    pedidoParaCancelar = pedidoId;

    document.getElementById('modal-titulo').textContent = `Pedido ${p.numero || pedidoId.slice(-6).toUpperCase()}`;

    const hora = new Date(p.fechaCreacion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const horaBloque = p.bloques?.[0]?.horaInicio || '—';

    document.getElementById('modal-body').innerHTML = `
        <div class="modal-section">
            <h4>Cliente</h4>
            <p><strong>${p.nombreCliente || '—'}</strong> · ${p.telefonoCliente || 'Sin teléfono'}</p>
            <p style="color:#888;font-size:0.8rem;margin-top:4px">Pedido a las ${hora} · Bloque ${horaBloque}</p>
        </div>
        <div class="modal-section">
            <h4>Líneas del pedido</h4>
            ${p.lineas.map(l => `
                <div class="modal-linea">
                    <div>
                        <div class="modal-linea-nombre">${l.cantidad}× ${l.nombreProducto || 'Producto'}</div>
                        ${l.sinIngredientes?.length ? `<div class="modal-linea-mods">Sin: ${l.sinIngredientes.join(', ')}</div>` : ''}
                        ${l.extras?.length ? `<div class="modal-linea-mods">Extras: ${l.extras.map(e => e.nombreExtra || 'Extra').join(', ')}</div>` : ''}
                    </div>
                    <div class="modal-linea-precio">${(l.precioUnitario * l.cantidad).toFixed(2)}€</div>
                </div>
            `).join('')}
        </div>
        <div class="modal-section">
            <h4>Resumen</h4>
            <p>Canal: <strong>${p.canal || '—'}</strong> · Estado: <strong>${p.estado || '—'}</strong></p>
            <p style="margin-top:6px">Total: <strong style="font-size:1.1rem;color:var(--rojo)">${p.total?.toFixed(2)}€</strong></p>
        </div>
    `;

    document.getElementById('modal-pedido').style.display = 'flex';
}

function cerrarModal() {
    pedidoParaCancelar = null;
    document.getElementById('modal-pedido').style.display = 'none';
}

// ══ Modificar Pedido ══════════════════════════════════════════════════════════
function modificarPedidoEmpleado() {
    if (!pedidoParaCancelar) return;
    const p = pedidos.find(x => x._id === pedidoParaCancelar);
    if (!p) return;
    const bloqueId = p.bloques?.[0]?._id || p.bloques?.[0] || null;
    localStorage.setItem('bb_editar_pedido', JSON.stringify({
        pedidoId:        p._id,
        numero:          p.numero || p._id.slice(-6).toUpperCase(),
        nombreCliente:   p.nombreCliente || '',
        telefonoCliente: p.telefonoCliente || '',
        bloqueId:        bloqueId ? bloqueId.toString() : null,
        lineas:          p.lineas
    }));
    window.location.href = '/pos.html';
}

// ══ Cancelar Pedido ═══════════════════════════════════════════════════════════
async function cancelarPedido() {
    if (!pedidoParaCancelar) return;
    if (!confirm('¿Seguro que quieres cancelar este pedido?')) return;

    try {
        const res = await fetch(`/api/pedidos/${pedidoParaCancelar}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);

        showToast('✅ Pedido cancelado', 'success');
        cerrarModal();
        await cargarDatos();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ══ Cerrar Sesión ═════════════════════════════════════════════════════════════
function cerrarSesion() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    window.location.href = '/index.html';
}

// ══ Toast ═════════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); }, 3000);
}
