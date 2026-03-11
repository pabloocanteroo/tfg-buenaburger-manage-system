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
    const mes = ref.getMonth();      // 0-based

    // Etiqueta del mes
    document.getElementById('mes-label').textContent =
        `${MESES_ES[mes].toUpperCase()} ${anio}`;

    // Deshabilitar botón "atrás" si es el mes actual
    document.getElementById('btn-mes-ant').disabled = mesActual <= 0;

    // Filtrar días del mes
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
    // Si avanzamos más allá de los 2 meses cargados, pedimos más al servidor
    const ref = calcularMesReferencia(mesActual);
    const mesesNecesarios = mesActual + 2;
    const ya = diasTodos.length > 0
        ? new Date(diasTodos[diasTodos.length - 1].fecha + 'T00:00:00').getMonth()
        : -1;
    const refUltimo = calcularMesReferencia(mesActual + 1);
    // Recarga dinámica si el mes mostrado supera los datos cargados
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
        // Actualizar estado local
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

// ── Init ────────────────────────────────────────────────────────
(async function init() {
    await verificarAuth();
    mesActual = 0;
    await cargarDiasOperativos();
})();
