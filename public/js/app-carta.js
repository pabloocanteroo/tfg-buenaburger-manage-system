// ── app-carta.js — Carga de productos, modal de producto y carrito ────────────

async function cargarProductos() {
    try {
        const data = await apiFetch('/productos');
        productos = data.productos;
        renderProductos(productos);
    } catch (e) {
        document.getElementById('productos-grid').innerHTML =
            `<p class="lista-loading">Error cargando carta: ${e.message}</p>`;
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
        <div class="producto-linea" onclick="abrirModalProducto('${escAttr(p._id)}')">
            <div class="pl-info">
                <span class="pl-nombre">${escHTML(p.nombre)}</span>
                <span class="pl-desc">${escHTML(p.descripcion)}</span>
            </div>
            <span class="pl-dots"></span>
            <span class="pl-precio">${p.precio.toFixed(2)}€</span>
            <button class="pl-add" onclick="event.stopPropagation();abrirModalProducto('${escAttr(p._id)}')">+</button>
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
                <div class="modal-nombre">${escHTML(prod.nombre)}</div>
                <div class="modal-precio-tag">${prod.precio.toFixed(2)}€</div>
            </div>
        </div>
        <p class="modal-desc-texto">${escHTML(prod.descripcion)}</p>

        ${prod.ingredientesPorDefecto?.length > 0 ? `
        <div class="opcion-grupo">
            <span class="opcion-label">❌ Quitar ingredientes</span>
            <div class="opcion-chips">
                ${prod.ingredientesPorDefecto.map(ing => `
                    <div class="chip quitar" onclick="toggleChip(this, 'excluidos', '${escAttr(ing)}')">${escHTML(ing)}</div>
                `).join('')}
            </div>
        </div>` : ''}

        ${prod.categoria !== 'BEBIDA' && prod.categoria !== 'POSTRE' ? `
        <div class="opcion-grupo">
            <span class="opcion-label">✅ Añadir salsas</span>
            <div class="opcion-chips">
                ${extras.filter(e => e.precio === 0).map(e => `
                    <div class="chip anadir" onclick="toggleChip(this, 'anadidos', '${escAttr(e.nombre)}')">${escHTML(e.nombre)}</div>
                `).join('')}
            </div>
        </div>
        <div class="opcion-grupo">
            <span class="opcion-label">⭐ Extras</span>
            <div class="extras-lista">
                ${extras.filter(e => e.precio > 0).map(e => `
                    <div class="extra-item">
                        <div class="extra-item-info">
                            <span class="extra-item-nombre">${escHTML(e.nombre)}</span>
                            <span class="extra-item-precio">+${e.precio.toFixed(2)}€</span>
                        </div>
                        <div class="extra-item-ctrl">
                            <button class="btn-cantidad-extra" onclick="ajustarExtra(this, '${escAttr(e._id)}', '${escAttr(e.nombre)}', ${e.precio}, -1)">−</button>
                            <span class="cantidad-extra-num" data-extra-id="${escAttr(e._id)}">0</span>
                            <button class="btn-cantidad-extra" onclick="ajustarExtra(this, '${escAttr(e._id)}', '${escAttr(e.nombre)}', ${e.precio}, 1)">+</button>
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

function ajustarExtra(el, id, nombre, precio, delta) {
    const spanInfo = document.querySelector(`.cantidad-extra-num[data-extra-id="${id}"]`);
    let qty = Math.min(10, Math.max(0, (parseInt(spanInfo.textContent) || 0) + delta));
    spanInfo.textContent = qty;
    productoEditando.extras = productoEditando.extras.filter(e => e.extra !== id);
    if (qty > 0) productoEditando.extras.push({ extra: id, nombre, precio, cantidad: qty });
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
        id:                    Date.now(),
        productId:             productoEditando._id,
        nombre:                productoEditando.nombre,
        categoria:             productoEditando.categoria,
        cantidad:              productoEditando.cantidad,
        precioBase:            productoEditando.precio,
        precioUnitario:        productoEditando.precio,
        precioMostrar:         productoEditando.precio + extrasTotal,
        ingredientesExcluidos: [...productoEditando.excluidos],
        ingredientesAnadidos:  [...productoEditando.anadidos],
        extras:                [...productoEditando.extras],
    };
    carrito.push(item);
    actualizarContadorCarrito();
    cerrarModal('modal-producto');
    mostrarToast(`✅ ${item.nombre} añadido al carrito`, 'success');
}
