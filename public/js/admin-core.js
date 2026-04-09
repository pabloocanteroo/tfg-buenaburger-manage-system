// ── admin-core.js — Utilidades, auth y navegación de tabs ────────────────────
// Cargado primero. Define las funciones base de las que dependen el resto de
// módulos admin (getToken, mostrarToast, cambiarTab, etc.)

const API = '';

// ── Cola de impresión ─────────────────────────────────────────────────────────
function actualizarBotónCola(cantidad) {
    const count = document.getElementById('cola-count');
    if (count) count.textContent = cantidad;
    const btn = document.getElementById('btn-cola');
    if (btn) btn.style.opacity = cantidad > 0 ? '1' : '0.55';
}

async function imprimirCola() {
    try {
        const res = await fetch(`${API}/api/admin/cola-impresion/imprimir`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        const msg = data.impresos > 0
            ? `✅ ${data.impresos} pedido(s) impresos${data.fallidos > 0 ? ` (${data.fallidos} fallaron)` : ''}`
            : 'No había pedidos en cola';
        mostrarToast(msg, 'verde');
        actualizarBotónCola(data.fallidos || 0);
    } catch (err) {
        mostrarToast(`Error: ${err.message}`, 'rojo');
    }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
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
    const rol    = localStorage.getItem('bb_rol');
    const nombre = localStorage.getItem('bb_nombre');
    if (rol !== 'ADMIN') { window.location.href = '/index.html'; return; }
    document.getElementById('adm-nombre').textContent = nombre || 'Admin';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function mostrarToast(msg, tipo = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${tipo} visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ── Navegación de tabs ────────────────────────────────────────────────────────
function cambiarTab(tab) {
    document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-tab-${tab}`).classList.add('active');
    if (tab === 'estadisticas') cargarEstadisticas();
    if (tab === 'empleados')    cargarEmpleados();
    if (tab === 'carta')        cargarCarta();
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

// ── Init ──────────────────────────────────────────────────────────────────────
// Se usa DOMContentLoaded (en lugar de IIFE) para asegurar que todos los módulos
// admin-*.js se han cargado y sus funciones están disponibles.
document.addEventListener('DOMContentLoaded', async () => {
    await verificarAuth();
    mesActual = 0;
    await cargarDiasOperativos();
});
