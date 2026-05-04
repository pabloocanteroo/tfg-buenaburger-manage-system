// ── app-core.js — Estado global, sesión, navegación y utilidades ──────────────
// Cargado primero. Define el estado compartido y las funciones base de las que
// dependen el resto de módulos app-*.js

// ── Estado global ─────────────────────────────────────────────────────────────
const API = '/api';
let productos = [];
let extras    = [];
let bloques   = [];
let carrito   = [];
let usuarioActual          = null;
let tokenActual            = localStorage.getItem('bb_token') || null;
let productoEditando       = null;
let metodoPagoSeleccionado = null;
let bloqueSeleccionado     = null;
let paginaActual           = 'landing';

// ── SPA Navigation ────────────────────────────────────────────────────────────
const PAGES = ['landing', 'carta', 'nosotros', 'filosofia', 'funcionamiento'];

function inyectarHeaders() {
    const tpl = document.getElementById('tpl-header');
    PAGES.forEach(id => {
        if (id === 'landing') return;
        const slot = document.querySelector(`#page-${id} .page-header-slot`);
        if (slot && tpl) slot.replaceWith(tpl.content.cloneNode(true));
    });
}

function navegarA(pageId) {
    if (!PAGES.includes(pageId)) return;
    PAGES.forEach(id => {
        const el = document.getElementById(`page-${id}`);
        if (el) {
            el.classList.toggle('page-active', id === pageId);
            el.style.display = id === pageId ? 'flex' : 'none';
        }
    });
    const footer = document.getElementById('footer');
    if (footer) footer.style.display = pageId !== 'landing' ? 'block' : 'none';
    window.scrollTo(0, 0);
    paginaActual = pageId;
    document.querySelectorAll('.sh-link').forEach(a => {
        a.classList.toggle('active', a.getAttribute('onclick')?.includes(pageId));
    });
    actualizarBotonesAuth();
}

// ── Sesión ────────────────────────────────────────────────────────────────────
function verificarSesion() {
    const token = localStorage.getItem('bb_token');
    const rol   = localStorage.getItem('bb_rol');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) { cerrarSesion(); return; }
            usuarioActual = payload;
        } catch { cerrarSesion(); return; }
    } else {
        usuarioActual = null;
    }

    const text   = token ? (rol === 'CLIENTE' ? 'MI PERFIL' : 'PANEL STAFF') : 'ACCEDER A MI CUENTA';
    const action = token ? irAlPanelCorrespondiente : abrirAuth;

    const btnL = document.getElementById('btn-auth-landing');
    if (btnL) { btnL.textContent = text; btnL.onclick = action; }

    document.querySelectorAll('.sh-action-btn').forEach(btn => {
        btn.textContent = text;
        btn.onclick = action;
    });

    actualizarContadorCarrito();
}

function actualizarBotonesAuth() {
    // Refresca los botones de cabecera según el estado de sesión actual
    const token = localStorage.getItem('bb_token');
    const rol   = localStorage.getItem('bb_rol');
    const text   = token ? (rol === 'CLIENTE' ? 'MI PERFIL' : 'PANEL STAFF') : 'ACCEDER A MI CUENTA';
    const action = token ? irAlPanelCorrespondiente : abrirAuth;
    document.querySelectorAll('.sh-action-btn').forEach(btn => {
        btn.textContent = text;
        btn.onclick = action;
    });
}

function irAlPanelCorrespondiente() {
    const rol = localStorage.getItem('bb_rol');
    if (rol === 'ADMIN')    window.location.href = '/admin.html';
    else if (rol === 'EMPLEADO') window.location.href = '/empleados.html';
    else window.location.href = '/cliente.html';
}

function cerrarSesion() {
    tokenActual = null; usuarioActual = null;
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    verificarSesion();
    mostrarToast('Sesión cerrada', 'success');
}

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const headers     = { 'Content-Type': 'application/json', ...options.headers };
    const localToken  = localStorage.getItem('bb_token');
    if (localToken) headers['Authorization'] = `Bearer ${localToken}`;
    const res  = await fetch(API + endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || 'Error en el servidor');
    return data;
}

// ── Modales ───────────────────────────────────────────────────────────────────
function abrirModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}
function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function mostrarToast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${tipo} show`;
    setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Retorno desde Stripe ──────────────────────────────────────────────────────
function checkearRetornoStripe() {
    const params = new URLSearchParams(window.location.search);
    const pago   = params.get('pago');
    if (!pago) return;

    // Limpiar params de la URL sin recargar
    history.replaceState(null, '', window.location.pathname);

    if (pago === 'ok') {
        const numero = params.get('pedido') || '';
        setTimeout(() => {
            mostrarToast(`✅ Pago recibido${numero ? ' — ' + numero : ''}. ¡Tu pedido está confirmado!`, 'success');
        }, 400);
    } else if (pago === 'cancelado') {
        setTimeout(() => {
            mostrarToast('Pago cancelado. Puedes volver a intentarlo o pagar en el local.', 'error');
        }, 400);
    }
}

document.addEventListener('DOMContentLoaded', checkearRetornoStripe);
