// ── app-carrito.js — Estado y renderizado del carrito ────────────────────────

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
    const cont   = document.getElementById('carrito-items');
    const footer = document.getElementById('carrito-footer');
    if (!carrito.length) {
        cont.innerHTML   = '<p class="carrito-vacio">🛒 Tu carrito está vacío</p>';
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
