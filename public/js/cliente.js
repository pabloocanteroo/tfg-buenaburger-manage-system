const API_URL = '/api';

// Utilidad local para fetchear
async function fetchAuth(endpoint, options = {}) {
    const token = localStorage.getItem('bb_token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (res.status === 401) {
        cerrarSesionLocal();
        return;
    }

    return await res.json();
}

function cerrarSesionLocal() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    window.location.href = 'index.html';
}

// ── SISTEMA DE PESTAÑAS ──────────────────────────────────────────────
function switchClienteTab(tabId, btn) {
    document.querySelectorAll('.cliente-tabs .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cliente-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.cliente-panel').forEach(p => p.style.display = 'none');
    
    btn.classList.add('active');
    const panel = document.getElementById('panel-' + tabId);
    panel.style.display = 'block';
    
    // Pequeño timeout para que se aplique el display antes del fade (si hubiera transición)
    setTimeout(() => {
        panel.classList.add('active');
    }, 10);
}

// ── TOAST ────────────────────────────────────────────────────────────
function mostrarToast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${tipo} show`;
    setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── MIS PEDIDOS ──────────────────────────────────────────────────────
async function cargarMisPedidos() {
    const container = document.getElementById('historial-lista');
    
    try {
        const data = await fetchAuth('/pedidos/mis-pedidos');
        if (!data || !data.pedidos) return;

        const pedidos = data.pedidos;
        
        if (pedidos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Aún no has hecho ningún pedido contundente.</p>';
            return;
        }

        let html = '';
        pedidos.forEach(p => {
            const fechaStr = new Date(p.fechaCreacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            const resumenLista = p.lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(', ');
            
            html += `
                <div class="mi-pedido-card">
                    <div class="mi-pedido-info">
                        <span class="mi-pedido-fecha">${fechaStr}</span>
                        <span class="mi-pedido-resumen">${resumenLista}</span>
                        <span class="mi-pedido-precio">${p.total.toFixed(2)}€</span>
                    </div>
                    <button class="mi-pedido-btn-repetir" onclick="repetirPedidoViejo('${p._id}')">
                        ↻ REPETIR AL CARRITO
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = '<p style="color:var(--rojo); padding:20px;">Error al cargar tus pedidos.</p>';
        console.error(err);
    }
}

async function repetirPedidoViejo(pedidoId) {
    try {
        const data = await fetchAuth(`/pedidos/${pedidoId}/rehacer`, { method: 'POST' });
        
        if (data && data.ok && data.lineas) {
            // Guardamos el pedido en el carrito de localStorage
            let carritoRepetido = data.lineas;
            
            carritoRepetido.forEach(linea => {
                let extraPrecio = 0;
                if(linea.extras) {
                     linea.extras.forEach(e => extraPrecio += (e.precio*e.cantidad));
                }
                linea.precioUnitarioTotal = linea.precioUnitario + (extraPrecio / linea.cantidad);
            });

            localStorage.setItem('bb_carrito', JSON.stringify(carritoRepetido));
            
            // Forzamos ir a la carta abriendo el carrito localmente en app.js
            window.location.href = 'index.html?openCart=true#page-carta';
        }
    } catch (err) {
        mostrarToast('Error al intentar rehacer el pedido', 'error');
    }
}

// ── MIS DATOS ────────────────────────────────────────────────────────
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
    
    const bodyArgs = { nombre, telefono };
    if (password && password.length >= 6) {
        bodyArgs.password = password;
    } else if (password && password.length > 0) {
        mostrarToast('La contraseña debe tener mínimo 6 caracteres', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'GUARDANDO...';

    try {
        const data = await fetchAuth('/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify(bodyArgs)
        });

        if (data && data.ok) {
            mostrarToast(data.mensaje || 'Perfil actualizado con éxito', 'success');
            // Limpiamos el campo de la pass si la cambió bien
            document.getElementById('perfil-pass').value = '';
            // Si cambió el nombre, actualizamos la memoria local
            if (data.cliente && data.cliente.nombre) {
                localStorage.setItem('bb_nombre', data.cliente.nombre);
            }
        } else {
            mostrarToast(data ? data.mensaje : 'Error interno', 'error');
        }
    } catch (err) {
        mostrarToast('Fallo al contactar el servidor', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'GUARDAR CAMBIOS';
    }
}

// ── INIT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Si no está logueado como cliente, fuera.
    if (!localStorage.getItem('bb_token') || localStorage.getItem('bb_rol') !== 'CLIENTE') {
        cerrarSesionLocal();
        return;
    }
    
    // Cargamos la data en paralelo
    cargarMisPedidos();
    cargarMisDatos();
});
