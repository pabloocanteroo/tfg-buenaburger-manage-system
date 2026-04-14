// ── app-carrito.js — Estado y renderizado del carrito ────────────────────────

function actualizarContadorCarrito() {
    const total = totalCarrito();
    document.querySelectorAll('#carrito-count, #carrito-count-header').forEach(el => {
        if (el) el.textContent = total > 0 ? `${total.toFixed(2)}€` : '0';
    });
}

function totalCarrito() {
    const subtotal = carrito.reduce((s, i) => {
        const extrasTotal = i.extras.reduce((es, e) => es + e.precio * e.cantidad, 0);
        return s + (i.precioBase + extrasTotal) * i.cantidad;
    }, 0);
    return subtotal - descuentoSalsas3x2();
}

function descuentoSalsas3x2() {
    const totalSalsas = carrito
        .filter(i => i.categoria === 'SALSA')
        .reduce((t, i) => t + i.cantidad, 0);
    const gratis = Math.floor(totalSalsas / 3);
    if (gratis === 0) return 0;
    const precioSalsa = carrito.find(i => i.categoria === 'SALSA')?.precioBase || 1;
    return gratis * precioSalsa;
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
                <div class="carrito-item-nombre">${item.cantidad}× ${escHTML(item.nombre)}</div>
                ${item.ingredientesExcluidos.length ? `<div class="carrito-item-detalle">Sin: ${escHTML(item.ingredientesExcluidos.join(', '))}</div>` : ''}
                ${item.extras.length ? `<div class="carrito-item-detalle">Extras: ${escHTML(item.extras.map(e => e.nombre).join(', '))}</div>` : ''}
                <div class="carrito-item-precio">${((item.precioBase + item.extras.reduce((s, e) => s + e.precio * e.cantidad, 0)) * item.cantidad).toFixed(2)}€</div>
            </div>
            <button class="btn-remove" onclick="eliminarDelCarrito(${item.id})">✕</button>
        </div>
    `).join('');
    const descuento = descuentoSalsas3x2();
    footer.innerHTML = `
        ${descuento > 0 ? `<div class="carrito-descuento">🏷️ Promo 3x2 salsas<span>-${descuento.toFixed(2)}€</span></div>` : ''}
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
