/* ══════════════════════════════════════════════
   admin.js — Panel de Administración
   Buena Burger Management System
══════════════════════════════════════════════ */

const API = '';

// ── Auth ────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('bb_token'); }

function cerrarSesion() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    window.location.href = '/index.html';
}

async function verificarAuth() {
    const token = getToken();
    if (!token) { window.location.href = '/index.html'; return; }
    const rol = localStorage.getItem('bb_rol');
    const nombre = localStorage.getItem('bb_nombre');
    if (rol !== 'ADMIN') { window.location.href = '/index.html'; return; }
    document.getElementById('adm-nombre').textContent = nombre || 'Admin';
}

// ── Toast ───────────────────────────────────────────────────────
let toastTimer;
function mostrarToast(msg, tipo = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${tipo} visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ── Navegación de tabs ──────────────────────────────────────────
function cambiarTab(tab) {
    document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-tab-${tab}`).classList.add('active');
    if (tab === 'estadisticas') cargarEstadisticas();
    if (tab === 'empleados') cargarEmpleados();
    if (tab === 'carta') cargarCarta();
    if (tab === 'pedidos') {
        const inp = document.getElementById('pedidos-fecha');
        if (!inp.value) {
            const hoy = new Date();
            const y = hoy.getFullYear();
            const m = String(hoy.getMonth() + 1).padStart(2, '0');
            const d = String(hoy.getDate()).padStart(2, '0');
            inp.value = `${y}-${m}-${d}`;
        }
        cargarPedidosAdmin();
    }
}

// ── Pedidos ──────────────────────────────────────────────────────
async function cargarPedidosAdmin() {
    const fecha = document.getElementById('pedidos-fecha').value;
    const cont = document.getElementById('lista-pedidos-admin');
    if (!fecha) { cont.innerHTML = '<p style="color:#888;padding:20px">Selecciona una fecha.</p>'; return; }
    cont.innerHTML = '<div class="loading-calendario">Cargando pedidos...</div>';
    try {
        const res = await fetch(`${API}/api/pedidos/todos?fecha=${fecha}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        const { pedidos } = data;
        if (!pedidos.length) {
            cont.innerHTML = '<p style="color:#888;padding:20px">No hay pedidos para esta fecha.</p>';
            return;
        }
        cont.innerHTML = pedidos.map(p => {
            const hora = new Date(p.fechaCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const lineas = p.lineas.map(l => `${l.cantidad}× ${l.nombreProducto || 'Producto'}`).join(', ');
            const estadoColor = p.estado === 'CANCELADO' ? '#e74c3c' : p.estado === 'CONFIRMADO' ? '#27ae60' : '#f39c12';
            return `
            <div class="pedido-admin-card">
                <div class="pedido-admin-top">
                    <div>
                        <div class="pedido-admin-num">${p.numero || p._id.slice(-6).toUpperCase()}</div>
                        <div class="pedido-admin-hora">${hora} · ${p.canal || '—'}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                        <span style="font-weight:900;font-size:1.1rem;color:#1a1a1a">${p.total?.toFixed(2)}€</span>
                        <span style="font-size:.75rem;font-weight:700;color:${estadoColor}">${p.estado}</span>
                    </div>
                </div>
                <div class="pedido-admin-cliente">👤 ${p.nombreCliente || '—'} &nbsp;·&nbsp; 📞 ${p.telefonoCliente || '—'}</div>
                <div class="pedido-admin-lineas">${lineas}</div>
            </div>`;
        }).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:20px">Error: ${err.message}</p>`;
    }
}

// ── Empleados ────────────────────────────────────────────────────
async function cargarEmpleados() {
    const cont = document.getElementById('lista-empleados');
    cont.innerHTML = '<div class="loading-calendario">Cargando...</div>';
    try {
        const res = await fetch(`${API}/api/admin/empleados`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        if (!data.empleados.length) {
            cont.innerHTML = '<p style="color:#888;padding:16px">No hay empleados activos.</p>';
            return;
        }
        cont.innerHTML = data.empleados.map(e => `
            <div class="empleado-card">
                <div class="empleado-info">
                    <span class="empleado-nombre">👤 ${e.nombre}</span>
                    <span class="empleado-email">${e.email}</span>
                </div>
                <button class="btn-baja" onclick="darDeBaja('${e._id}', '${e.nombre}')">Dar de baja</button>
            </div>
        `).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${err.message}</p>`;
    }
}

async function crearEmpleado() {
    const nombre = document.getElementById('emp-nuevo-nombre').value.trim();
    const email = document.getElementById('emp-nuevo-email').value.trim();
    const password = document.getElementById('emp-nuevo-pass').value;
    const errEl = document.getElementById('emp-form-error');
    errEl.style.display = 'none';

    if (!nombre || !email || !password) {
        errEl.textContent = 'Todos los campos son obligatorios.';
        errEl.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API}/api/admin/empleados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Empleado ${nombre} creado`, 'verde');
        document.getElementById('emp-nuevo-nombre').value = '';
        document.getElementById('emp-nuevo-email').value = '';
        document.getElementById('emp-nuevo-pass').value = '';
        cargarEmpleados();
    } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        errEl.style.display = 'block';
    }
}

async function darDeBaja(id, nombre) {
    if (!confirm(`¿Dar de baja a ${nombre}? Perderá el acceso al sistema.`)) return;
    try {
        const res = await fetch(`${API}/api/admin/empleados/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ ${nombre} dado de baja`, 'verde');
        cargarEmpleados();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}


// ── Calendario ──────────────────────────────────────────────────
let diasTodos = [];   // todos los días del API
let mesActual;        // índice 0-based del mes mostrado (0 = mes actual)

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function cargarDiasOperativos() {
    try {
        const res = await fetch(`${API}/api/bloques/dias-operativos?meses=2`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        diasTodos = data.dias;
        renderizarMes();
    } catch (err) {
        document.getElementById('grid-calendario').innerHTML =
            `<p style="color:red;padding:20px">Error cargando el calendario: ${err.message}</p>`;
    }
}

function calcularMesReferencia(offset) {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
}

function renderizarMes() {
    const ref = calcularMesReferencia(mesActual);
    const anio = ref.getFullYear();
    const mes = ref.getMonth();

    document.getElementById('mes-label').textContent =
        `${MESES_ES[mes].toUpperCase()} ${anio}`;

    document.getElementById('btn-mes-ant').disabled = mesActual <= 0;

    const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    const diasMes = diasTodos.filter(d => d.fecha.startsWith(prefijo));

    const grid = document.getElementById('grid-calendario');

    if (diasMes.length === 0) {
        grid.innerHTML = '<p style="color:#888;padding:20px">No hay días operativos este mes, o los bloques aún no se han generado.</p>';
        return;
    }

    grid.innerHTML = diasMes.map(dia => {
        const fechaObj = new Date(dia.fecha + 'T00:00:00');
        const nombreDia = DIAS_ES[fechaObj.getDay()];
        const fechaFormato = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const cerrado = dia.diaCerrado;

        return `
        <div class="dia-card ${cerrado ? 'cerrado' : 'abierto'}">
            <div>
                <div class="dia-fecha">${fechaFormato.toUpperCase()}</div>
                <div class="dia-diaSemana">${nombreDia}</div>
            </div>
            <span class="dia-badge ${cerrado ? 'cerrado' : 'abierto'}">
                ${cerrado ? '🔴 Cerrado' : '🟢 Abierto'}
            </span>
            <div class="dia-info">
                ${dia.totalBloques} bloques · ${dia.bloquesCerrados} cerrados
            </div>
            <button
                class="btn-toggle ${cerrado ? 'abrir' : 'cerrar'}"
                onclick="${cerrado ? 'abrirDia' : 'cerrarDia'}('${dia.fecha}')">
                ${cerrado ? '✅ Reabrir día' : '🚫 Cerrar día'}
            </button>
        </div>`;
    }).join('');
}

function cambiarMes(delta) {
    mesActual = Math.max(0, mesActual + delta);
    const ref = calcularMesReferencia(mesActual);
    const mesesNecesarios = mesActual + 2;
    const ya = diasTodos.length > 0
        ? new Date(diasTodos[diasTodos.length - 1].fecha + 'T00:00:00').getMonth()
        : -1;
    const refUltimo = calcularMesReferencia(mesActual + 1);
    const ultimaFecha = diasTodos.length > 0 ? new Date(diasTodos[diasTodos.length - 1].fecha + 'T00:00:00') : new Date(0);
    const primerDiaMes = new Date(ref.getFullYear(), ref.getMonth(), 1);
    if (primerDiaMes >= ultimaFecha) {
        cargarDiasOperativosMeses(mesesNecesarios + 1);
    } else {
        renderizarMes();
    }
}

async function cargarDiasOperativosMeses(meses) {
    try {
        const res = await fetch(`${API}/api/bloques/dias-operativos?meses=${meses}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        diasTodos = data.dias;
        renderizarMes();
    } catch (err) {
        mostrarToast('Error actualizando el calendario', 'rojo');
    }
}

async function cerrarDia(fecha) {
    try {
        const res = await fetch(`${API}/api/bloques/cerrar-dia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ fecha })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Día ${fecha} cerrado`, 'verde');
        diasTodos = diasTodos.map(d => d.fecha === fecha
            ? { ...d, bloquesCerrados: d.totalBloques, diaCerrado: true }
            : d);
        renderizarMes();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

async function abrirDia(fecha) {
    try {
        const res = await fetch(`${API}/api/bloques/abrir-dia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ fecha })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Día ${fecha} abierto`, 'verde');
        diasTodos = diasTodos.map(d => d.fecha === fecha
            ? { ...d, bloquesCerrados: 0, diaCerrado: false }
            : d);
        renderizarMes();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

// ── Estadísticas ─────────────────────────────────────────────────
async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API}/api/admin/estadisticas`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        document.getElementById('stat-pedidos').textContent = data.totalPedidos ?? '—';
        document.getElementById('stat-ingresos').textContent =
            data.ingresosPagados != null ? `${data.ingresosPagados.toFixed(2)} €` : '—';
    } catch (err) {
        document.getElementById('stat-pedidos').textContent = '—';
        document.getElementById('stat-ingresos').textContent = '—';
    }
}

// ── Carta (Productos y Extras) ──────────────────────────────────
async function cargarCarta() {
    cargarProductosAdmin();
    cargarExtrasAdmin();
}

async function cargarProductosAdmin() {
    const cont = document.getElementById('lista-productos-admin');
    cont.innerHTML = '<div class="loading-calendario">Cargando productos...</div>';
    try {
        const res = await fetch(`${API}/api/admin/productos`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        
        if (!data.productos.length) {
            cont.innerHTML = '<p style="color:#888;padding:16px">No hay productos disponibles.</p>';
            return;
        }

        cont.innerHTML = data.productos.map(p => `
            <div class="carta-item ${!p.activo ? 'inactivo' : ''}">
                <div class="carta-item-info">
                    <div class="carta-item-nombre">
                        ${p.nombre}
                        <span class="badge-estado ${p.activo ? 'activo' : 'inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="carta-item-precio">${p.precio.toFixed(2)} €</div>
                    <div class="carta-item-detalles">
                        ${p.categoria} | Ingredientes: ${p.ingredientesPorDefecto?.join(', ') || 'Ninguno'}
                    </div>
                </div>
                <div class="carta-item-acciones">
                    <button class="btn-editar" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Editar</button>
                    ${p.activo ? `<button class="btn-baja" onclick="eliminarProducto('${p._id}', '${p.nombre}')">Desactivar</button>` : ''}
                    <button class="btn-baja" style="background-color: var(--rojo); color: white;" onclick="eliminarProductoDefinitivo('${p._id}', '${p.nombre}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${err.message}</p>`;
    }
}

async function cargarExtrasAdmin() {
    const cont = document.getElementById('lista-extras-admin');
    cont.innerHTML = '<div class="loading-calendario">Cargando extras...</div>';
    try {
        const res = await fetch(`${API}/api/admin/extras`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        
        if (!data.extras.length) {
            cont.innerHTML = '<p style="color:#888;padding:16px">No hay extras disponibles.</p>';
            return;
        }

        cont.innerHTML = data.extras.map(e => `
            <div class="carta-item ${!e.activo ? 'inactivo' : ''}">
                <div class="carta-item-info">
                    <div class="carta-item-nombre">
                        ${e.nombre}
                        <span class="badge-estado ${e.activo ? 'activo' : 'inactivo'}">${e.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="carta-item-precio">+${e.precio.toFixed(2)} €</div>
                    <div class="carta-item-detalles">Máximo permitido: ${e.cantidadMaxima}</div>
                </div>
                 <div class="carta-item-acciones">
                    <button class="btn-editar" onclick='editarExtra(${JSON.stringify(e).replace(/'/g, "&#39;")})'>Editar</button>
                    ${e.activo ? `<button class="btn-baja" onclick="eliminarExtra('${e._id}', '${e.nombre}')">Desactivar</button>` : ''}
                    <button class="btn-baja" style="background-color: var(--rojo); color: white;" onclick="eliminarExtraDefinitivo('${e._id}', '${e.nombre}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${err.message}</p>`;
    }
}

// ── Modales Productos ──
function abrirModalProducto() {
    document.getElementById('modal-producto-titulo').textContent = 'Nuevo Producto';
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-desc').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-cat').value = 'HAMBURGUESA';
    document.getElementById('prod-ingredientes').value = '';
    document.getElementById('prod-activo').checked = true;
    document.getElementById('prod-form-error').style.display = 'none';
    document.getElementById('modal-producto').style.display = 'flex';
}

function editarProducto(prod) {
    document.getElementById('modal-producto-titulo').textContent = 'Editar Producto';
    document.getElementById('prod-id').value = prod._id;
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-desc').value = prod.descripcion || '';
    document.getElementById('prod-precio').value = prod.precio;
    document.getElementById('prod-cat').value = prod.categoria;
    document.getElementById('prod-ingredientes').value = prod.ingredientesPorDefecto ? prod.ingredientesPorDefecto.join(', ') : '';
    document.getElementById('prod-activo').checked = prod.activo;
    document.getElementById('prod-form-error').style.display = 'none';
    document.getElementById('modal-producto').style.display = 'flex';
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').style.display = 'none';
}

async function guardarProducto() {
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const descripcion = document.getElementById('prod-desc').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-cat').value;
    const ingStr = document.getElementById('prod-ingredientes').value;
    const activo = document.getElementById('prod-activo').checked;
    
    const ingredientesPorDefecto = ingStr ? ingStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const errEl = document.getElementById('prod-form-error');
    errEl.style.display = 'none';

    if (!nombre || isNaN(precio) || !categoria) {
        errEl.textContent = 'Nombre, precio y categoría son obligatorios.';
        errEl.style.display = 'block';
        return;
    }

    const payload = { nombre, descripcion, precio, categoria, ingredientesPorDefecto, activo };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API}/api/productos/${id}` : `${API}/api/productos`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        
        mostrarToast(`✅ Producto guardado`, 'verde');
        cerrarModalProducto();
        cargarProductosAdmin();
    } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        errEl.style.display = 'block';
    }
}

async function eliminarProducto(id, nombre) {
    if (!confirm(`¿Desactivar el producto ${nombre}? Dejará de aparecer en la carta.`)) return;
    try {
        const res = await fetch(`${API}/api/productos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Producto desactivado`, 'verde');
        cargarProductosAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

async function eliminarProductoDefinitivo(id, nombre) {
    if (!confirm(`⚠️ ALERTA: ¿Eliminar DEFINITIVAMENTE el producto ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
        const res = await fetch(`${API}/api/admin/productos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Producto eliminado para siempre`, 'verde');
        cargarProductosAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

// ── Modales Extras ──
function abrirModalExtra() {
    document.getElementById('modal-extra-titulo').textContent = 'Nuevo Extra';
    document.getElementById('extra-id').value = '';
    document.getElementById('extra-nombre').value = '';
    document.getElementById('extra-precio').value = '';
    document.getElementById('extra-max').value = '10';
    document.getElementById('extra-activo').checked = true;
    document.getElementById('extra-form-error').style.display = 'none';
    document.getElementById('modal-extra').style.display = 'flex';
}

function editarExtra(extra) {
    document.getElementById('modal-extra-titulo').textContent = 'Editar Extra';
    document.getElementById('extra-id').value = extra._id;
    document.getElementById('extra-nombre').value = extra.nombre;
    document.getElementById('extra-precio').value = extra.precio;
    document.getElementById('extra-max').value = extra.cantidadMaxima || 10;
    document.getElementById('extra-activo').checked = extra.activo;
    document.getElementById('extra-form-error').style.display = 'none';
    document.getElementById('modal-extra').style.display = 'flex';
}

function cerrarModalExtra() {
    document.getElementById('modal-extra').style.display = 'none';
}

async function guardarExtra() {
    const id = document.getElementById('extra-id').value;
    const nombre = document.getElementById('extra-nombre').value.trim();
    const precio = parseFloat(document.getElementById('extra-precio').value);
    const cantidadMaxima = parseInt(document.getElementById('extra-max').value);
    const activo = document.getElementById('extra-activo').checked;
    
    const errEl = document.getElementById('extra-form-error');
    errEl.style.display = 'none';

    if (!nombre || isNaN(precio) || isNaN(cantidadMaxima)) {
        errEl.textContent = 'Nombre, precio y cantidad máxima son obligatorios.';
        errEl.style.display = 'block';
        return;
    }

    const payload = { nombre, precio, cantidadMaxima, activo };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API}/api/extras/${id}` : `${API}/api/extras`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        
        mostrarToast(`✅ Extra guardado`, 'verde');
        cerrarModalExtra();
        cargarExtrasAdmin();
    } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        errEl.style.display = 'block';
    }
}

async function eliminarExtra(id, nombre) {
    if (!confirm(`¿Desactivar el extra ${nombre}?`)) return;
    try {
        const res = await fetch(`${API}/api/extras/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Extra desactivado`, 'verde');
        cargarExtrasAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

async function eliminarExtraDefinitivo(id, nombre) {
    if (!confirm(`⚠️ ALERTA: ¿Eliminar DEFINITIVAMENTE el extra ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
        const res = await fetch(`${API}/api/admin/extras/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Extra eliminado para siempre`, 'verde');
        cargarExtrasAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

// ── Init ────────────────────────────────────────────────────────
(async function init() {
    await verificarAuth();
    mesActual = 0;
    await cargarDiasOperativos();
})();
