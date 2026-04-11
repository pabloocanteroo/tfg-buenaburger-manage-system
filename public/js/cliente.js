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
    if (typeof p.modificable === 'boolean') return p.modificable;
    if (['CANCELADO', 'ENTREGADO'].includes(p.estado)) return false;
    const minutos = minutosParaRecogidaFrontend(p);
    return minutos > 15;
}

function esPedidoCancelable(p) {
    if (typeof p.cancelable === 'boolean') return p.cancelable;
    if (['CANCELADO', 'ENTREGADO'].includes(p.estado)) return false;
    const minutos = minutosParaRecogidaFrontend(p);
    return minutos > 15;
}

function minutosParaRecogidaFrontend(p) {
    if (p.horaRecogida) {
        return (new Date(p.horaRecogida).getTime() - Date.now()) / 60000;
    }
    // Fallback: usar el primer bloque populado si viene en el JSON
    const bloque = p.bloques?.[0];
    if (bloque && bloque.fecha && bloque.horaInicio) {
        return (new Date(`${bloque.fecha}T${bloque.horaInicio}:00`).getTime() - Date.now()) / 60000;
    }
    return Infinity;
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
            // Fecha y hora en que se hizo el pedido
            const fechaPedido = new Date(p.fechaCreacion);
            const fechaPedidoStr = fechaPedido.toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const horaPedidoStr = fechaPedido.toLocaleTimeString('es-ES', {
                hour: '2-digit', minute: '2-digit'
            });

            // Fecha y hora de recogida (del primer bloque populado)
            let recogidaStr = null;
            const bloque = p.bloques?.[0];
            if (bloque && bloque.fecha && bloque.horaInicio) {
                const fechaRecogida = new Date(`${bloque.fecha}T${bloque.horaInicio}:00`);
                recogidaStr = fechaRecogida.toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short'
                }) + ' · ' + bloque.horaInicio + 'h';
            } else if (p.horaRecogida) {
                const fechaRecogida = new Date(p.horaRecogida);
                recogidaStr = fechaRecogida.toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short'
                }) + ' · ' + fechaRecogida.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + 'h';
            }

            const resumenLista = p.lineas.map(l => `${l.cantidad}× ${l.nombre}`).join(', ');
            const modificable = esPedidoModificable(p);
            const cancelable = esPedidoCancelable(p);

            html += `
                <div class="mi-pedido-card" id="pedido-card-${p._id}">
                    <div class="mi-pedido-header">
                        <span class="mi-pedido-fecha">${fechaPedidoStr} · ${horaPedidoStr}h</span>
                        ${estadoBadge(p.estado)}
                    </div>
                    ${recogidaStr ? `
                    <div style="font-size:0.78rem;font-weight:700;color:#e63c2f;
                        letter-spacing:0.3px;margin-bottom:6px;">
                        RECOGIDA: ${recogidaStr.toUpperCase()}
                    </div>` : ''}
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

let _historialPedidos = []; // cache para evitar encoding de JSON en onclick

function abrirModalModificar(pedidoId, idxPedido) {
    const pedido = _historialPedidos[idxPedido];
    if (!pedido) return;

    // Guardar estado de edición en localStorage
    localStorage.setItem('bb_editando', JSON.stringify({ id: pedidoId, numero: pedido.numero }));

    // Cargar las líneas actuales del pedido en el carrito
    localStorage.setItem('bb_carrito', JSON.stringify(pedido.lineas));

    // Redirigir a la carta en modo edición
    window.location.href = 'index.html?modo=editar';
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
