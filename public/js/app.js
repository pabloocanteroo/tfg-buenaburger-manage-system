// ── Estado global ─────────────────────────────────────────────────────────────
const API = '/api';
let productos = [];
let extras = [];
let bloques = [];
let carrito = [];
let usuarioActual = null;
let tokenActual = localStorage.getItem('bb_token') || null;
let productoEditando = null;
let metodoPagoSeleccionado = null;
let bloqueSeleccionado = null;
let paginaActual = 'landing';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    verificarSesion();
    await cargarProductos();
    await cargarExtras();
    inyectarHeaders();
});

// ── SPA Navigation ────────────────────────────────────────────────────────────
const PAGES = ['landing', 'carta', 'nosotros', 'filosofia', 'funcionamiento'];

function inyectarHeaders() {
    const tpl = document.getElementById('tpl-header');
    PAGES.forEach(id => {
        if (id === 'landing') return;
        const slot = document.querySelector(`#page-${id} .page-header-slot`);
        if (slot && tpl) {
            slot.replaceWith(tpl.content.cloneNode(true));
        }
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

    // Scroll top on page change
    window.scrollTo(0, 0);
    paginaActual = pageId;

    // Highlight active nav in header
    document.querySelectorAll('.sh-link').forEach(a => {
        a.classList.toggle('active', a.getAttribute('onclick')?.includes(pageId));
    });

    actualizarBotonesAuth();
}

// ── Sesión ────────────────────────────────────────────────────────────────────
function verificarSesion() {
    const token = localStorage.getItem('bb_token');
    const rol = localStorage.getItem('bb_rol');
    
    // Check expiration if we have token
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) { cerrarSesion(); return; }
            usuarioActual = payload;
        } catch { cerrarSesion(); return; }
    } else {
        usuarioActual = null;
    }

    const text = token ? (rol === 'CLIENTE' ? 'MI PERFIL' : 'PANEL STAFF') : 'ACCEDER';
    const action = token ? irAlPanelCorrespondiente : abrirAuth;

    const btnL = document.getElementById('btn-auth-landing');
    if (btnL) {
        btnL.textContent = text;
        btnL.onclick = action;
    }

    document.querySelectorAll('.sh-action-btn').forEach(btn => {
        btn.textContent = text;
        btn.onclick = action;
    });
    
    actualizarContadorCarrito();
}

function irAlPanelCorrespondiente() {
    const rol = localStorage.getItem('bb_rol');
    if (rol === 'ADMIN') window.location.href = '/admin.html';
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

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const localToken = localStorage.getItem('bb_token');
    if (localToken) headers['Authorization'] = `Bearer ${localToken}`;
    const res = await fetch(API + endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || 'Error en el servidor');
    return data;
}

// ── Cargar productos ──────────────────────────────────────────────────────────
async function cargarProductos() {
    try {
        const data = await apiFetch('/productos');
        productos = data.productos;
        renderProductos(productos);
    } catch (e) {
        document.getElementById('productos-grid').innerHTML = `<p class="lista-loading">Error cargando carta: ${e.message}</p>`;
    }
}

async function cargarExtras() {
    try {
        const data = await apiFetch('/extras');
        extras = data.extras;
    } catch { console.warn('No se pudieron cargar extras'); }
}

function filtrarCategoria(cat, tabEl) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    const filtrados = cat === 'all' ? productos : productos.filter(p => p.categoria === cat);
    renderProductos(filtrados);
}

function emojiCategoria(cat) {
    return cat === 'HAMBURGUESA' ? '🍔' : cat === 'PATATAS' ? '🍟' : cat === 'POSTRE' ? '🍰' : '🥤';
}

function renderProductos(lista) {
    const grid = document.getElementById('productos-grid');
    if (!lista.length) { grid.innerHTML = '<p class="lista-loading">Sin productos en esta categoría</p>'; return; }
    grid.innerHTML = lista.map(p => `
        <div class="producto-linea" onclick="abrirModalProducto('${p._id}')">
            <div class="pl-info">
                <span class="pl-nombre">${p.nombre}</span>
                <span class="pl-desc">${p.descripcion}</span>
            </div>
            <span class="pl-dots"></span>
            <span class="pl-precio">${p.precio.toFixed(2)}€</span>
            <button class="pl-add" onclick="event.stopPropagation();abrirModalProducto('${p._id}')">+</button>
        </div>
    `).join('');
}

// ── Modal Producto ────────────────────────────────────────────────────────────
function abrirModalProducto(productoId) {
    const prod = productos.find(p => p._id === productoId);
    if (!prod) return;
    productoEditando = { ...prod, cantidad: 1, excluidos: [], anadidos: [], extras: [] };

    document.getElementById('modal-producto-content').innerHTML = `
        <div class="modal-producto-header">
            <div class="modal-emoji">${emojiCategoria(prod.categoria)}</div>
            <div>
                <div class="modal-nombre">${prod.nombre}</div>
                <div class="modal-precio-tag">${prod.precio.toFixed(2)}€</div>
            </div>
        </div>
        <p class="modal-desc-texto">${prod.descripcion}</p>

        ${prod.ingredientesPorDefecto?.length > 0 ? `
        <div class="opcion-grupo">
            <span class="opcion-label">❌ Quitar ingredientes</span>
            <div class="opcion-chips">
                ${prod.ingredientesPorDefecto.map(ing => `
                    <div class="chip quitar" onclick="toggleChip(this, 'excluidos', '${ing}')">${ing}</div>
                `).join('')}
            </div>
        </div>` : ''}

        ${prod.categoria !== 'BEBIDA' && prod.categoria !== 'POSTRE' ? `
        <div class="opcion-grupo">
            <span class="opcion-label">✅ Añadir salsas</span>
            <div class="opcion-chips">
                ${extras.filter(e => e.precio === 0).map(e => `
                    <div class="chip anadir" onclick="toggleChip(this, 'anadidos', '${e.nombre}')">${e.nombre}</div>
                `).join('')}
            </div>
        </div>
        <div class="opcion-grupo">
            <span class="opcion-label">⭐ Extras</span>
            <div class="extras-lista">
                ${extras.filter(e => e.precio > 0).map(e => `
                    <div class="extra-item">
                        <div class="extra-item-info">
                            <span class="extra-item-nombre">${e.nombre}</span>
                            <span class="extra-item-precio">+${e.precio.toFixed(2)}€</span>
                        </div>
                        <div class="extra-item-ctrl">
                            <button class="btn-cantidad-extra" onclick="ajustarExtra(this, '${e._id}', '${e.nombre}', ${e.precio}, -1)">−</button>
                            <span class="cantidad-extra-num" data-extra-id="${e._id}">0</span>
                            <button class="btn-cantidad-extra" onclick="ajustarExtra(this, '${e._id}', '${e.nombre}', ${e.precio}, 1)">+</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <div class="cantidad-ctrl">
            <button class="btn-cantidad" onclick="cambiarCantidad(-1)">−</button>
            <span class="cantidad-num" id="cantidad-display">1</span>
            <button class="btn-cantidad" onclick="cambiarCantidad(1)">+</button>
        </div>
        <button class="btn-anadir-carrito" onclick="anadirAlCarrito()">
            AÑADIR AL CARRITO — <span id="precio-modal">${prod.precio.toFixed(2)}€</span>
        </button>
    `;
    abrirModal('modal-producto');
}

function toggleChip(el, campo, valor) {
    el.classList.toggle('activo');
    if (el.classList.contains('activo')) productoEditando[campo].push(valor);
    else productoEditando[campo] = productoEditando[campo].filter(v => v !== valor);
    actualizarPrecioModal();
}

// Función eliminada: toggleExtraPago

function ajustarExtra(el, id, nombre, precio, delta) {
    const spanInfo = document.querySelector(`.cantidad-extra-num[data-extra-id="${id}"]`);
    let currentQty = parseInt(spanInfo.textContent) || 0;

    currentQty += delta;
    if (currentQty < 0) currentQty = 0;
    if (currentQty > 10) currentQty = 10;

    // Actualizar span visual
    spanInfo.textContent = currentQty;

    // Actualizar en el state del productoEditando
    // 1. Quitar el extra si ya existe
    productoEditando.extras = productoEditando.extras.filter(e => e.extra !== id);

    // 2. Si hay cantidad, volver a añadirlo con la nueva cantidad
    if (currentQty > 0) {
        productoEditando.extras.push({ extra: id, nombre, precio, cantidad: currentQty });
    }

    actualizarPrecioModal();
}

function cambiarCantidad(delta) {
    productoEditando.cantidad = Math.max(1, productoEditando.cantidad + delta);
    document.getElementById('cantidad-display').textContent = productoEditando.cantidad;
    actualizarPrecioModal();
}

function actualizarPrecioModal() {
    const extrasTotal = productoEditando.extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
    const total = (productoEditando.precio + extrasTotal) * productoEditando.cantidad;
    document.getElementById('precio-modal').textContent = `${total.toFixed(2)}€`;
}

function anadirAlCarrito() {
    const extrasTotal = productoEditando.extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
    const item = {
        id: Date.now(),
        productId: productoEditando._id,
        nombre: productoEditando.nombre,
        categoria: productoEditando.categoria,
        cantidad: productoEditando.cantidad,
        precioBase: productoEditando.precio,          // precio sin extras
        precioUnitario: productoEditando.precio,      // para el backend (solo base, extras van aparte)
        precioMostrar: productoEditando.precio + extrasTotal, // para mostrar en carrito
        ingredientesExcluidos: [...productoEditando.excluidos],
        ingredientesAnadidos: [...productoEditando.anadidos],
        extras: [...productoEditando.extras]
    };
    carrito.push(item);
    actualizarContadorCarrito();
    cerrarModal('modal-producto');
    mostrarToast(`✅ ${item.nombre} añadido al carrito`, 'success');
}

// ── Carrito ───────────────────────────────────────────────────────────────────
function actualizarContadorCarrito() {
    const total = carrito.reduce((s, i) => s + i.cantidad, 0);
    document.querySelectorAll('#carrito-count, #carrito-count-header').forEach(el => {
        if (el) el.textContent = total;
    });
}

function totalCarrito() {
    return carrito.reduce((s, i) => {
        const extrasTotal = i.extras.reduce((es, e) => es + e.precio * e.cantidad, 0);
        return s + (i.precioBase + extrasTotal) * i.cantidad;
    }, 0);
}

function abrirCarrito() {
    renderCarrito();
    abrirModal('modal-carrito');
}

function renderCarrito() {
    const cont = document.getElementById('carrito-items');
    const footer = document.getElementById('carrito-footer');
    if (!carrito.length) {
        cont.innerHTML = '<p class="carrito-vacio">🛒 Tu carrito está vacío</p>';
        footer.innerHTML = '';
        return;
    }
    cont.innerHTML = carrito.map(item => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <div class="carrito-item-nombre">${item.cantidad}× ${item.nombre}</div>
                ${item.ingredientesExcluidos.length ? `<div class="carrito-item-detalle">Sin: ${item.ingredientesExcluidos.join(', ')}</div>` : ''}
                ${item.extras.length ? `<div class="carrito-item-detalle">Extras: ${item.extras.map(e => e.nombre).join(', ')}</div>` : ''}
                <div class="carrito-item-precio">${((item.precioBase + item.extras.reduce((s, e) => s + e.precio * e.cantidad, 0)) * item.cantidad).toFixed(2)}€</div>
            </div>
            <button class="btn-remove" onclick="eliminarDelCarrito(${item.id})">✕</button>
        </div>
    `).join('');
    footer.innerHTML = `
        <div class="carrito-total">
            <span>Total</span><span>${totalCarrito().toFixed(2)}€</span>
        </div>
        <button class="btn-checkout" onclick="iniciarCheckout()">HACER PEDIDO →</button>
    `;
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(i => i.id !== id);
    actualizarContadorCarrito();
    renderCarrito();
}

// ── Checkout ──────────────────────────────────────────────────────────────────
async function iniciarCheckout() {
    cerrarModal('modal-carrito');
    
    // Si es cliente, intentamos recuperar sus datos completos para saltar el paso 1
    const token = localStorage.getItem('bb_token');
    const rol = localStorage.getItem('bb_rol');
    
    if (token && rol === 'CLIENTE') {
        const btn = document.querySelector('.btn-checkout');
        const textBtn = btn ? btn.textContent : '';
        if (btn) btn.textContent = 'CARGANDO...';
        
        try {
            const data = await apiFetch('/auth/me');
            if (data && data.cliente) {
                window._checkoutDatos = {
                    nombre: data.cliente.nombre || '',
                    telefono: data.cliente.telefono || '',
                    email: data.cliente.email || ''
                };
                
                // Si ya tenemos el teléfono (requisito mínimo), saltamos el Paso 1
                if (data.cliente.telefono) {
                    if (btn) btn.textContent = textBtn;
                    abrirModal('modal-checkout');
                    await renderPaso2Directo();
                    return;
                }
            }
        } catch (e) {
            console.error('Error precargando perfil:', e);
            mostrarToast('Error interno validando la cuenta: ' + e.message, 'error');
        } finally {
            if (btn) btn.textContent = textBtn;
        }
    }

    renderCheckoutPaso1();
    abrirModal('modal-checkout');
}

function renderCheckoutPaso1() {
    const dNombre = window._checkoutDatos?.nombre || usuarioActual?.nombre || '';
    const dTel = window._checkoutDatos?.telefono || '';
    const dEmail = window._checkoutDatos?.email || '';

    document.getElementById('checkout-content').innerHTML = `
        <div class="checkout-steps">
            <div class="checkout-step active">1. Datos</div>
            <div class="checkout-step">2. Hora</div>
            <div class="checkout-step">3. Pago</div>
        </div>
        ${!usuarioActual ? `
        <div style="background:#fff8e1;border-radius:10px;padding:11px 15px;margin-bottom:14px;font-size:0.88rem;color:#7c5700;">
            💡 <strong>¿Tienes cuenta?</strong> <a href="#" onclick="abrirAuth(event)" style="color:var(--rojo);font-weight:700;">Inicia sesión</a> para guardar tu historial.
        </div>` : ''}
        <div class="form-row">
            <div class="form-group">
                <label>Nombre *</label>
                <input type="text" id="co-nombre" placeholder="Tu nombre" value="${dNombre}">
            </div>
            <div class="form-group">
                <label>Teléfono *</label>
                <input type="tel" id="co-telefono" placeholder="612 345 678" value="${dTel}">
            </div>
        </div>
        <div class="form-group">
            <label>Email (para confirmación)</label>
            <input type="email" id="co-email" placeholder="tu@email.com" value="${dEmail}">
        </div>
        <div style="margin-top:10px;padding-top:14px;border-top:1px solid #f0f0f0;">
            <div style="font-weight:700;font-size:0.8rem;color:#555;letter-spacing:1px;margin-bottom:10px;text-transform:uppercase;">Resumen</div>
            ${carrito.map(i => `
                <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:3px;">
                    <span>${i.cantidad}× ${i.nombre}</span>
                    <span style="color:var(--rojo);font-weight:700;">${(i.precioUnitario * i.cantidad).toFixed(2)}€</span>
                </div>
            `).join('')}
            <div style="border-top:1px solid #e5e5e5;margin-top:7px;padding-top:7px;font-weight:900;display:flex;justify-content:space-between;">
                <span>Total</span><span style="color:var(--rojo)">${totalCarrito().toFixed(2)}€</span>
            </div>
        </div>
        <button class="btn-siguiente" onclick="checkoutPaso2()">SIGUIENTE →</button>
    `;
}

// Muestra el paso 2 desde el Paso 1 (valida el form antes de avanzar)
async function checkoutPaso2() {
    const nombre = document.getElementById('co-nombre').value.trim();
    const telefono = document.getElementById('co-telefono').value.trim();
    const email = document.getElementById('co-email').value.trim();
    if (!nombre || !telefono) { mostrarToast('Nombre y teléfono son obligatorios', 'error'); return; }
    window._checkoutDatos = { nombre, telefono, email };
    await renderPaso2Directo();
}

// Muestra el paso 2 usando los datos ya guardados (usado desde el botón Atrás del paso 3)
async function renderPaso2Directo() {
    const hoy = new Date();
    const opcionesFecha = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(hoy); d.setDate(d.getDate() + i);
        const dia = d.getDay();
        if ([0, 5, 6].includes(dia)) opcionesFecha.push(d.toISOString().slice(0, 10));
    }
    document.getElementById('checkout-content').innerHTML = `
        <div class="checkout-steps">
            <div class="checkout-step">1. Datos</div>
            <div class="checkout-step active">2. Hora</div>
            <div class="checkout-step">3. Pago</div>
        </div>
        <button class="btn-back" onclick="renderCheckoutPaso1()">← Atrás</button>
        <div class="form-group">
            <label>Fecha de recogida *</label>
            <select id="co-fecha" onchange="cargarBloquesFecha(this.value)">
                <option value="">Selecciona una fecha...</option>
                ${opcionesFecha.map(f => `<option value="${f}">${formatearFecha(f)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Hora de recogida *</label>
            <div class="bloque-grid" id="bloques-grid">
                <p style="color:#999;font-size:0.88rem;grid-column:1/-1;padding:18px 0;text-align:center;">Selecciona una fecha primero</p>
            </div>
        </div>
        <button class="btn-siguiente" onclick="checkoutPaso3()">SIGUIENTE →</button>
    `;
    bloqueSeleccionado = null;
}

function formatearFecha(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function cargarBloquesFecha(fecha) {
    bloqueSeleccionado = null;
    const grid = document.getElementById('bloques-grid');
    if (!fecha) return;
    grid.innerHTML = '<p style="color:#999;padding:18px 0;text-align:center;grid-column:1/-1">Cargando...</p>';
    try {
        const data = await apiFetch(`/bloques?fecha=${fecha}`);
        bloques = data.bloques;

        const todoCerrado = bloques.length > 0 && bloques.every(b => b.cerrado);
        if (todoCerrado) {
            grid.innerHTML = `<p style="color:var(--rojo);grid-column:1/-1;padding:18px 0;text-align:center;font-weight:700;">
                🔒 Este día está cerrado. No se admiten pedidos.
            </p>`;
            return;
        }

        const disponibles = bloques.filter(b => !b.cerrado);
        grid.innerHTML = disponibles.map(b => {
            const lleno = b.hamburgesasOcupadas >= b.capacidadMax || b.cerrado;
            return `
                <button class="bloque-btn${lleno ? '' : ''}"
                    onclick="${lleno ? '' : `seleccionarBloque('${b._id}', this)`}"
                    id="bloque-${b._id}"
                    ${lleno ? 'disabled' : ''}>
                    ${b.horaInicio}
                    ${lleno ? '<span class="bloque-lleno">LLENO</span>' : ''}
                </button>
            `;
        }).join('');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--rojo);grid-column:1/-1;padding:10px 0">Error: ${e.message}</p>`;
    }
}

function seleccionarBloque(id, el) {
    document.querySelectorAll('.bloque-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    bloqueSeleccionado = id;
}

function checkoutPaso3() {
    if (!bloqueSeleccionado) { mostrarToast('Selecciona una hora de recogida', 'error'); return; }
    document.getElementById('checkout-content').innerHTML = `
        <div class="checkout-steps">
            <div class="checkout-step">1. Datos</div>
            <div class="checkout-step">2. Hora</div>
            <div class="checkout-step active">3. Pago</div>
        </div>
        <button class="btn-back" onclick="renderPaso2Directo()">← Atrás</button>
        <p style="font-weight:700;font-size:0.8rem;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Método de pago</p>
        <div class="pago-opciones">
            <div class="pago-opt" onclick="seleccionarPago('STRIPE', this)">
                <div class="pago-opt-icon">💳</div>
                <div class="pago-opt-label">Pago online<br><span style="font-size:0.72rem;opacity:0.7">Stripe</span></div>
            </div>
            <div class="pago-opt" onclick="seleccionarPago('PAGO_EN_LOCAL', this)">
                <div class="pago-opt-icon">🏠</div>
                <div class="pago-opt-label">Pagar en local<br><span style="font-size:0.72rem;opacity:0.7">Efectivo o tarjeta</span></div>
            </div>
        </div>
        <div style="background:#f8f8f8;border-radius:11px;padding:14px;margin-bottom:14px;">
            <div style="font-weight:700;margin-bottom:7px;">Resumen</div>
            ${carrito.map(i => `<div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:3px;">
                <span>${i.cantidad}× ${i.nombre}</span><span style="color:var(--rojo);font-weight:700;">${(i.precioUnitario * i.cantidad).toFixed(2)}€</span>
            </div>`).join('')}
            <div style="border-top:1px solid #e5e5e5;margin-top:7px;padding-top:7px;font-weight:900;display:flex;justify-content:space-between;font-size:1.05rem;">
                <span>TOTAL</span><span style="color:var(--rojo)">${totalCarrito().toFixed(2)}€</span>
            </div>
        </div>
        <button class="btn-siguiente" onclick="confirmarPedido()">CONFIRMAR PEDIDO ✓</button>
    `;
    metodoPagoSeleccionado = null;
}

function seleccionarPago(metodo, el) {
    document.querySelectorAll('.pago-opt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    metodoPagoSeleccionado = metodo;
}

async function confirmarPedido() {
    if (!metodoPagoSeleccionado) { mostrarToast('Selecciona un método de pago', 'error'); return; }
    const { nombre, telefono, email } = window._checkoutDatos;

    const lineas = carrito.map(item => ({
        producto: item.productId,
        nombre: item.nombre,
        precio: item.precioBase,
        cantidad: item.cantidad,
        precioUnitario: item.precioBase,   // precio base sin extras
        ingredientesExcluidos: item.ingredientesExcluidos,
        ingredientesAnadidos: item.ingredientesAnadidos,
        extras: item.extras.map(e => ({ extra: e.extra, nombre: e.nombre, precio: e.precio, cantidad: 1 }))
    }));

    const body = { nombre, telefono, email, bloqueId: bloqueSeleccionado, metodoPago: metodoPagoSeleccionado, clienteId: usuarioActual?.id || null, lineas };

    try {
        const data = await apiFetch('/pedidos', { method: 'POST', body: JSON.stringify(body) });
        carrito = [];
        actualizarContadorCarrito();
        document.getElementById('checkout-content').innerHTML = `
            <div class="pedido-confirmado">
                <div class="check">✅</div>
                <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:var(--negro)">¡Pedido confirmado!</h2>
                <div class="pedido-numero">${data.pedido.numero}</div>
                <p class="pedido-info">
                    Hora de recogida: <strong>${bloques.find(b => b._id === bloqueSeleccionado)?.horaInicio || ''}</strong><br>
                    ${metodoPagoSeleccionado === 'PAGO_EN_LOCAL' ? '💵 Pagas en el local al recoger.' : '💳 Hemos procesado tu pago online.'}
                </p>
                <button class="btn-siguiente" style="margin-top:20px" onclick="cerrarModal('modal-checkout')">CERRAR</button>
            </div>
        `;
        mostrarToast('✅ Pedido confirmado', 'success');
    } catch (e) {
        mostrarToast(`Error: ${e.message}`, 'error');
    }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function abrirAuth(e) {
    if (e) e.preventDefault();
    renderAuthLogin();
    abrirModal('modal-auth');
}

function renderAuthLogin() {
    document.getElementById('auth-content').innerHTML = `
        <div class="auth-tabs">
            <div class="auth-tab active" onclick="renderAuthLogin()">ENTRAR</div>
            <div class="auth-tab" onclick="renderAuthRegistro()">REGISTRARSE</div>
        </div>
        <h2 class="modal-title">Iniciar sesión</h2>
        <div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="tu@email.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="auth-pass" placeholder="••••••"></div>
        <button class="btn-siguiente" onclick="loginCliente()">ENTRAR</button>
        <p style="text-align:center;margin-top:11px;color:#888;font-size:0.88rem">¿No tienes cuenta? <a href="#" onclick="renderAuthRegistro()" style="color:var(--rojo);font-weight:700;">Regístrate gratis</a></p>
    `;
}

function renderAuthRegistro() {
    document.getElementById('auth-content').innerHTML = `
        <div class="auth-tabs">
            <div class="auth-tab" onclick="renderAuthLogin()">ENTRAR</div>
            <div class="auth-tab active" onclick="renderAuthRegistro()">REGISTRARSE</div>
        </div>
        <h2 class="modal-title">Crear cuenta</h2>
        <div class="form-group"><label>Nombre</label><input type="text" id="reg-nombre" placeholder="Tu nombre"></div>
        <div class="form-group"><label>Teléfono</label><input type="tel" id="reg-tel" placeholder="612 345 678"></div>
        <div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="tu@email.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="reg-pass" placeholder="Mínimo 6 caracteres"></div>
        <button class="btn-siguiente" onclick="registroCliente()">CREAR CUENTA</button>
    `;
}



async function loginCliente() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    try {
        let data;
        try {
            data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        } catch {
            data = await apiFetch('/auth/login-staff', { method: 'POST', body: JSON.stringify({ email, password }) });
        }
        tokenActual = data.token;
        localStorage.setItem('bb_token', tokenActual);

        if (data.usuario) {
            localStorage.setItem('bb_rol', data.usuario.rol);
            localStorage.setItem('bb_nombre', data.usuario.nombre);
        } else {
            localStorage.setItem('bb_rol', 'CLIENTE');
            localStorage.setItem('bb_nombre', data.cliente.nombre);
        }

        verificarSesion();
        cerrarModal('modal-auth');
        const nombre = data.cliente?.nombre || data.usuario?.nombre || 'Usuario';
        const rol = data.usuario?.rol || 'CLIENTE';

        // Staff → cada rol a su panel
        if (rol === 'ADMIN') {
            window.location.href = '/admin.html';
            return;
        }
        if (rol === 'EMPLEADO') {
            window.location.href = '/empleados.html';
            return;
        }

        mostrarToast(`✅ ¡Bienvenido, ${nombre}!`, 'success');
    } catch { mostrarToast('Credenciales incorrectas', 'error'); }
}

async function registroCliente() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-tel').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    try {
        const data = await apiFetch('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, telefono, email, password }) });
        tokenActual = data.token;
        localStorage.setItem('bb_token', tokenActual);
        localStorage.setItem('bb_rol', 'CLIENTE');
        localStorage.setItem('bb_nombre', data.cliente.nombre);

        verificarSesion();
        cerrarModal('modal-auth');
        window.location.href = '/cliente.html';
    } catch (e) { mostrarToast(e.message, 'error'); }
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
