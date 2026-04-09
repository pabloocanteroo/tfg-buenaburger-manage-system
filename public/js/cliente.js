const API_URL = '/api';

// ── API helper ────────────────────────────────────────────────────────────────
async function fetchAuth(endpoint, options = {}) {
    const token = localStorage.getItem('bb_token');
    if (!token) { window.location.href = 'index.html'; return; }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (res.status === 401) { cerrarSesionLocal(); return; }
    return await res.json();
}

function cerrarSesionLocal() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    window.location.href = 'index.html';
}

// ── Modales ───────────────────────────────────────────────────────────────────
function abrirModalCliente(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function cerrarModalCliente(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function mostrarToast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${tipo} show`;
    setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Pestañas ──────────────────────────────────────────────────────────────────
function switchClienteTab(tabId, btn) {
    document.querySelectorAll('.cliente-tabs .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cliente-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    btn.classList.add('active');
    const panel = document.getElementById('panel-' + tabId);
    panel.style.display = 'block';
    setTimeout(() => panel.classList.add('active'), 10);
}

// ── Helpers de estado ─────────────────────────────────────────────────────────
function estadoBadge(estado) {
    const map = {
        'PENDIENTE_PAGO': { label: 'Pago pendiente', color: '#f59e0b' },
        'CONFIRMADO':     { label: 'Confirmado',     color: '#22c55e' },
        'EN_PREPARACION': { label: 'En preparación', color: '#f97316' },
        'LISTO':          { label: '¡Listo!',        color: '#16a34a' },
        'ENTREGADO':      { label: 'Entregado',      color: '#6b7280' },
        'CANCELADO':      { label: 'Cancelado',      color: '#ef4444' }
    };
    const { label, color } = map[estado] || { label: estado, color: '#888' };
    return `<span style="background:${color};color:#fff;font-size:0.72rem;font-weight:700;
        letter-spacing:0.5px;padding:3px 10px;border-radius:20px;text-transform:uppercase;
        white-space:nowrap;">${label}</span>`;
}

// Devuelve true si el pedido puede modificarse (virtual del servidor o cálculo local)
function esPedidoModificable(p) {
    // Usar el virtual si viene en el JSON
    if (typeof p.modificable === 'boolean') return p.modificable;
    // Fallback: calcular en cliente (< 15 min desde creación y no cancelado)
    if (['CANCELADO', 'ENTREGADO'].includes(p.estado)) return false;
    const minutos = (Date.now() - new Date(p.fechaCreacion).getTime()) / 60000;
    return minutos < 15;
}

function esPedidoCancelable(p) {
    if (typeof p.cancelable === 'boolean') return p.cancelable;
    if (['CANCELADO', 'ENTREGADO'].includes(p.estado)) return false;
    const minutos = (Date.now() - new Date(p.fechaCreacion).getTime()) / 60000;
    return minutos < 15;
}

// ── MIS PEDIDOS ───────────────────────────────────────────────────────────────
async function cargarMisPedidos() {
    const container = document.getElementById('historial-lista');

    try {
        const data = await fetchAuth('/pedidos/mis-pedidos');
        if (!data || !data.pedidos) return;

        const pedidos = data.pedidos;
        _historialPedidos = pedidos; // cache para abrirModalModificar

        if (pedidos.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Aún no has hecho ningún pedido contundente.</p>';
            return;
        }

        let html = '';
        pedidos.forEach((p, idx) => {
            const fechaStr = new Date(p.fechaCreacion).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const resumenLista = p.lineas.map(l => `${l.cantidad}× ${l.nombre}`).join(', ');
            const modificable = esPedidoModificable(p);
            const cancelable = esPedidoCancelable(p);

            html += `
                <div class="mi-pedido-card" id="pedido-card-${p._id}">
                    <div class="mi-pedido-header">
                        <span class="mi-pedido-fecha">${fechaStr}</span>
                        ${estadoBadge(p.estado)}
                    </div>
                    <div class="mi-pedido-info">
                        <span class="mi-pedido-resumen">${resumenLista}</span>
                        <span class="mi-pedido-precio">${p.total.toFixed(2)}€</span>
                    </div>
                    <div class="mi-pedido-acciones">
                        <button class="mi-pedido-btn-repetir" onclick="repetirPedidoViejo('${p._id}')">
                            ↻ REPETIR
                        </button>
                        ${modificable ? `
                        <button class="mi-pedido-btn-modificar" onclick="abrirModalModificar('${p._id}', ${idx})">
                            ✏️ MODIFICAR
                        </button>` : ''}
                        ${cancelable ? `
                        <button class="mi-pedido-btn-cancelar" onclick="cancelarMiPedido('${p._id}')">
                            ✕ CANCELAR
                        </button>` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = '<p style="color:var(--rojo);padding:20px;">Error al cargar tus pedidos.</p>';
        console.error(err);
    }
}

// ── UC-04: Rehacer pedido ─────────────────────────────────────────────────────
async function repetirPedidoViejo(pedidoId) {
    try {
        const data = await fetchAuth(`/pedidos/${pedidoId}/rehacer`, { method: 'POST' });

        if (data && data.ok && data.lineas) {
            const carritoRepetido = data.lineas.map(linea => {
                const extraPrecio = (linea.extras || []).reduce((s, e) => s + (e.precio || 0) * e.cantidad, 0);
                return { ...linea, precioUnitarioTotal: (linea.precioUnitario || 0) + extraPrecio / Math.max(linea.cantidad, 1) };
            });
            localStorage.setItem('bb_carrito', JSON.stringify(carritoRepetido));
            window.location.href = 'index.html?openCart=true#page-carta';
        }
    } catch {
        mostrarToast('Error al rehacer el pedido', 'error');
    }
}

// ── UC-06: Cancelar pedido (cliente) ──────────────────────────────────────────
async function cancelarMiPedido(pedidoId) {
    if (!confirm('¿Seguro que quieres cancelar este pedido?')) return;

    try {
        const data = await fetchAuth(`/pedidos/${pedidoId}`, { method: 'DELETE' });

        if (data && data.ok) {
            mostrarToast('Pedido cancelado correctamente', 'success');
            cargarMisPedidos(); // recargar el historial
        } else {
            mostrarToast(data?.mensaje || 'No se pudo cancelar el pedido', 'error');
        }
    } catch {
        mostrarToast('Error al contactar el servidor', 'error');
    }
}

// ── UC-05: Modificar pedido (cliente) ─────────────────────────────────────────

// Estado temporal de la modificación en curso
let _pedidoModificarId = null;
let _lineasModificar = [];
let _historialPedidos = []; // cache para evitar encoding de JSON en onclick

function abrirModalModificar(pedidoId, idxPedido) {
    _pedidoModificarId = pedidoId;
    const pedido = _historialPedidos[idxPedido];
    if (!pedido) return;
    _lineasModificar = JSON.parse(JSON.stringify(pedido.lineas)); // deep copy

    renderLineasModificar();
    abrirModalCliente('modal-modificar');
}

function renderLineasModificar() {
    const lineas = _lineasModificar;

    if (lineas.length === 0) {
        document.getElementById('modal-modificar-content').innerHTML = `
            <p style="color:#666;text-align:center;padding:20px;">
                No quedan líneas en el pedido.<br>
                Si quieres eliminarlo, usa el botón <strong>CANCELAR PEDIDO</strong>.
            </p>
            <button class="btn-siguiente" style="width:100%;background:#888;" onclick="cerrarModalCliente('modal-modificar')">CERRAR</button>
        `;
        return;
    }

    const total = lineas.reduce((s, l) => {
        const extras = (l.extras || []).reduce((es, e) => es + (e.precio || 0) * e.cantidad, 0);
        return s + (l.precioUnitario * l.cantidad) + extras;
    }, 0);

    let html = '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">';
    lineas.forEach((l, idx) => {
        const extras = (l.extras || []).reduce((s, e) => s + (e.precio || 0) * e.cantidad, 0);
        const precioLinea = ((l.precioUnitario || 0) + extras) * l.cantidad;

        html += `
            <div style="display:flex;align-items:center;gap:10px;background:#f8f8f8;
                border-radius:10px;padding:10px 12px;" id="mod-linea-${idx}">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;white-space:nowrap;
                        overflow:hidden;text-overflow:ellipsis;">${l.nombre}</div>
                    ${l.ingredientesExcluidos?.length
                        ? `<div style="font-size:0.75rem;color:#888;">Sin: ${l.ingredientesExcluidos.join(', ')}</div>` : ''}
                    ${l.ingredientesAnadidos?.length
                        ? `<div style="font-size:0.75rem;color:#888;">Con: ${l.ingredientesAnadidos.join(', ')}</div>` : ''}
                    ${l.extras?.length
                        ? `<div style="font-size:0.75rem;color:#888;">Extras: ${l.extras.map(e => e.nombre).join(', ')}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <button class="btn-cantidad" onclick="cambiarCantidadModificar(${idx}, -1)"
                        style="width:28px;height:28px;font-size:1rem;">−</button>
                    <span style="min-width:20px;text-align:center;font-weight:700;">${l.cantidad}</span>
                    <button class="btn-cantidad" onclick="cambiarCantidadModificar(${idx}, 1)"
                        style="width:28px;height:28px;font-size:1rem;">+</button>
                    <span style="font-size:0.85rem;font-weight:700;color:var(--rojo);
                        min-width:48px;text-align:right;">${precioLinea.toFixed(2)}€</span>
                    <button class="btn-remove" onclick="eliminarLineaModificar(${idx})"
                        style="width:24px;height:24px;font-size:0.75rem;">✕</button>
                </div>
            </div>
        `;
    });

    html += `</div>
        <div style="display:flex;justify-content:space-between;font-family:var(--font-cond);
            font-size:1.3rem;font-weight:900;border-top:2px solid #eee;padding-top:12px;margin-bottom:16px;">
            <span>TOTAL</span>
            <span id="modificar-total-display" style="color:var(--rojo);">${total.toFixed(2)}€</span>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="cerrarModalCliente('modal-modificar')"
                style="flex:1;padding:13px;border:2px solid #ddd;background:#fff;
                font-family:var(--font-cond);font-size:1rem;font-weight:700;
                border-radius:8px;cursor:pointer;letter-spacing:1px;">
                CANCELAR
            </button>
            <button class="btn-siguiente" onclick="guardarModificacion()" style="flex:2;">
                GUARDAR CAMBIOS ✓
            </button>
        </div>`;

    document.getElementById('modal-modificar-content').innerHTML = html;
}

function cambiarCantidadModificar(idx, delta) {
    const linea = _lineasModificar[idx];
    const nuevaCantidad = linea.cantidad + delta;
    if (nuevaCantidad < 1) return; // mínimo 1; para eliminar usar el botón ✕
    linea.cantidad = nuevaCantidad;
    renderLineasModificar();
}

function eliminarLineaModificar(idx) {
    _lineasModificar.splice(idx, 1);
    renderLineasModificar();
}

async function guardarModificacion() {
    if (_lineasModificar.length === 0) {
        mostrarToast('El pedido no puede quedar vacío. Usa Cancelar Pedido si quieres anularlo.', 'error');
        return;
    }

    const nuevoTotal = _lineasModificar.reduce((s, l) => {
        const extras = (l.extras || []).reduce((es, e) => es + (e.precio || 0) * e.cantidad, 0);
        return s + (l.precioUnitario * l.cantidad) + extras;
    }, 0);

    try {
        const data = await fetchAuth(`/pedidos/${_pedidoModificarId}`, {
            method: 'PUT',
            body: JSON.stringify({ lineas: _lineasModificar, total: +nuevoTotal.toFixed(2) })
        });

        if (data && data.ok) {
            cerrarModalCliente('modal-modificar');
            const diferencia = data.diferencia || 0;
            if (diferencia > 0) {
                mostrarToast(`Pedido actualizado. Diferencia a pagar en local: +${diferencia.toFixed(2)}€`, 'success');
            } else if (diferencia < 0) {
                mostrarToast(`Pedido actualizado. Se te devolverá: ${Math.abs(diferencia).toFixed(2)}€`, 'success');
            } else {
                mostrarToast('Pedido modificado correctamente', 'success');
            }
            cargarMisPedidos();
        } else {
            mostrarToast(data?.mensaje || 'No se pudo modificar el pedido', 'error');
        }
    } catch {
        mostrarToast('Error al contactar el servidor', 'error');
    }
}

// ── MIS DATOS ─────────────────────────────────────────────────────────────────
async function cargarMisDatos() {
    try {
        const data = await fetchAuth('/auth/me');
        if (data && data.cliente) {
            document.getElementById('perfil-email').value = data.cliente.email || '';
            document.getElementById('perfil-nombre').value = data.cliente.nombre || '';
            document.getElementById('perfil-tel').value = data.cliente.telefono || '';
        }
    } catch (err) {
        console.error('Error al cargar datos del perfil', err);
    }
}

async function guardarPerfil(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const nombre = document.getElementById('perfil-nombre').value;
    const telefono = document.getElementById('perfil-tel').value;
    const password = document.getElementById('perfil-pass').value;

    const body = { nombre, telefono };
    if (password && password.length >= 6) {
        body.password = password;
    } else if (password && password.length > 0) {
        mostrarToast('La contraseña debe tener mínimo 6 caracteres', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'GUARDANDO...';

    try {
        const data = await fetchAuth('/auth/perfil', { method: 'PUT', body: JSON.stringify(body) });
        if (data && data.ok) {
            mostrarToast(data.mensaje || 'Perfil actualizado', 'success');
            document.getElementById('perfil-pass').value = '';
            if (data.cliente?.nombre) localStorage.setItem('bb_nombre', data.cliente.nombre);
        } else {
            mostrarToast(data ? data.mensaje : 'Error interno', 'error');
        }
    } catch {
        mostrarToast('Fallo al contactar el servidor', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'GUARDAR CAMBIOS';
    }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('bb_token') || localStorage.getItem('bb_rol') !== 'CLIENTE') {
        cerrarSesionLocal();
        return;
    }
    cargarMisPedidos();
    cargarMisDatos();
});
