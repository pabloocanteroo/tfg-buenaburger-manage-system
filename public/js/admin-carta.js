// ── admin-carta.js — CRUD de productos y extras ───────────────────────────────

// ── Ingredientes desde extras ─────────────────────────────────────────────────

async function renderIngredientesChecks(seleccionados = []) {
    const cont = document.getElementById('prod-ingredientes-checks');
    cont.innerHTML = '<span style="color:#aaa;font-size:.85rem;">Cargando...</span>';

    try {
        const res = await fetch(`${API}/api/admin/extras`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        const extras = (data.extras || []).filter(e => e.activo);

        if (!extras.length) {
            cont.innerHTML = '<span style="color:#aaa;font-size:.85rem;">No hay extras creados todavía.</span>';
            return;
        }

        const selSet = new Set(seleccionados.map(s => s.toLowerCase()));

        cont.innerHTML = extras.map(e => `
            <label class="ingrediente-check-label">
                <input type="checkbox" name="ing-check" value="${escAttr(e.nombre)}"
                    ${selSet.has(e.nombre.toLowerCase()) ? 'checked' : ''}
                    onchange="sincronizarIngredientesHidden()">
                ${escHTML(e.nombre)}
            </label>
        `).join('');

        sincronizarIngredientesHidden();
    } catch {
        cont.innerHTML = '<span style="color:red;font-size:.85rem;">Error al cargar extras.</span>';
    }
}

function sincronizarIngredientesHidden() {
    const checks = document.querySelectorAll('#prod-ingredientes-checks input[name="ing-check"]:checked');
    document.getElementById('prod-ingredientes').value = [...checks].map(c => c.value).join(',');
}

function cargarCarta() {
    cargarProductosAdmin();
    cargarExtrasAdmin();
}

// ── Productos ─────────────────────────────────────────────────────────────────

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
        cont.innerHTML = data.productos.map(p => {
            // editarProducto() recibe el objeto completo serializado dentro de un atributo
            // onclick='...'. Se escapan <, >, ", & y ' del JSON para que ni el nombre ni la
            // descripción puedan cerrar el atributo o inyectar otro tag.
            const pJson = JSON.stringify(p)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            return `
            <div class="carta-item ${!p.activo ? 'inactivo' : ''}">
                <div class="carta-item-info">
                    <div class="carta-item-nombre">
                        ${escHTML(p.nombre)}
                        <span class="badge-estado ${p.activo ? 'activo' : 'inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="carta-item-precio">${p.precio.toFixed(2)} €</div>
                    <div class="carta-item-detalles">
                        ${escHTML(p.categoria)} | Ingredientes: ${escHTML(p.ingredientesPorDefecto?.join(', ') || 'Ninguno')}
                    </div>
                </div>
                <div class="carta-item-acciones">
                    <button class="btn-editar" onclick='editarProducto(${pJson})'>Editar</button>
                    ${p.activo ? `<button class="btn-baja" onclick="eliminarProducto('${escAttr(p._id)}', '${escAttr(p.nombre)}')">Desactivar</button>` : ''}
                    <button class="btn-baja" style="background-color:var(--rojo);color:white" onclick="eliminarProductoDefinitivo('${escAttr(p._id)}', '${escAttr(p.nombre)}')">Eliminar</button>
                </div>
            </div>
        `;}).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${escHTML(err.message)}</p>`;
    }
}

function abrirModalProducto() {
    document.getElementById('modal-producto-titulo').textContent = 'Nuevo Producto';
    document.getElementById('prod-id').value       = '';
    document.getElementById('prod-nombre').value   = '';
    document.getElementById('prod-desc').value     = '';
    document.getElementById('prod-precio').value   = '';
    document.getElementById('prod-cat').value      = 'HAMBURGUESA';
    document.getElementById('prod-activo').checked = true;
    document.getElementById('prod-form-error').style.display = 'none';
    document.getElementById('modal-producto').style.display = 'flex';
    renderIngredientesChecks([]);
}

function editarProducto(prod) {
    document.getElementById('modal-producto-titulo').textContent = 'Editar Producto';
    document.getElementById('prod-id').value       = prod._id;
    document.getElementById('prod-nombre').value   = prod.nombre;
    document.getElementById('prod-desc').value     = prod.descripcion || '';
    document.getElementById('prod-precio').value   = prod.precio;
    document.getElementById('prod-cat').value      = prod.categoria;
    document.getElementById('prod-activo').checked = prod.activo;
    document.getElementById('prod-form-error').style.display = 'none';
    document.getElementById('modal-producto').style.display = 'flex';
    renderIngredientesChecks(prod.ingredientesPorDefecto || []);
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').style.display = 'none';
}

async function guardarProducto() {
    const id          = document.getElementById('prod-id').value;
    const nombre      = document.getElementById('prod-nombre').value.trim();
    const descripcion = document.getElementById('prod-desc').value.trim();
    const precio      = parseFloat(document.getElementById('prod-precio').value);
    const categoria   = document.getElementById('prod-cat').value;
    const ingStr      = document.getElementById('prod-ingredientes').value;
    const activo      = document.getElementById('prod-activo').checked;
    const ingredientesPorDefecto = ingStr ? ingStr.split(',').map(s => s.trim()).filter(s => s) : [];
    const errEl = document.getElementById('prod-form-error');
    errEl.style.display = 'none';

    if (!nombre || isNaN(precio) || !categoria) {
        errEl.textContent = 'Nombre, precio y categoría son obligatorios.';
        errEl.style.display = 'block';
        return;
    }

    const payload = { nombre, descripcion, precio, categoria, ingredientesPorDefecto, activo };
    const method  = id ? 'PUT'  : 'POST';
    const url     = id ? `${API}/api/productos/${id}` : `${API}/api/productos`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast('✅ Producto guardado', 'verde');
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
        mostrarToast('✅ Producto desactivado', 'verde');
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
        mostrarToast('✅ Producto eliminado para siempre', 'verde');
        cargarProductosAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

// ── Extras ────────────────────────────────────────────────────────────────────

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
        cont.innerHTML = data.extras.map(e => {
            const eJson = JSON.stringify(e)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            return `
            <div class="carta-item ${!e.activo ? 'inactivo' : ''}">
                <div class="carta-item-info">
                    <div class="carta-item-nombre">
                        ${escHTML(e.nombre)}
                        <span class="badge-estado ${e.activo ? 'activo' : 'inactivo'}">${e.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="carta-item-precio">+${e.precio.toFixed(2)} €</div>
                    <div class="carta-item-detalles">Máximo permitido: ${e.cantidadMaxima}</div>
                </div>
                <div class="carta-item-acciones">
                    <button class="btn-editar" onclick='editarExtra(${eJson})'>Editar</button>
                    ${e.activo ? `<button class="btn-baja" onclick="eliminarExtra('${escAttr(e._id)}', '${escAttr(e.nombre)}')">Desactivar</button>` : ''}
                    <button class="btn-baja" style="background-color:var(--rojo);color:white" onclick="eliminarExtraDefinitivo('${escAttr(e._id)}', '${escAttr(e.nombre)}')">Eliminar</button>
                </div>
            </div>
        `;}).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${escHTML(err.message)}</p>`;
    }
}

function abrirModalExtra() {
    document.getElementById('modal-extra-titulo').textContent = 'Nuevo Extra';
    document.getElementById('extra-id').value     = '';
    document.getElementById('extra-nombre').value = '';
    document.getElementById('extra-precio').value = '';
    document.getElementById('extra-max').value    = '10';
    document.getElementById('extra-activo').checked = true;
    document.getElementById('extra-form-error').style.display = 'none';
    document.getElementById('modal-extra').style.display      = 'flex';
}

function editarExtra(extra) {
    document.getElementById('modal-extra-titulo').textContent = 'Editar Extra';
    document.getElementById('extra-id').value     = extra._id;
    document.getElementById('extra-nombre').value = extra.nombre;
    document.getElementById('extra-precio').value = extra.precio;
    document.getElementById('extra-max').value    = extra.cantidadMaxima || 10;
    document.getElementById('extra-activo').checked = extra.activo;
    document.getElementById('extra-form-error').style.display = 'none';
    document.getElementById('modal-extra').style.display      = 'flex';
}

function cerrarModalExtra() {
    document.getElementById('modal-extra').style.display = 'none';
}

async function guardarExtra() {
    const id             = document.getElementById('extra-id').value;
    const nombre         = document.getElementById('extra-nombre').value.trim();
    const precio         = parseFloat(document.getElementById('extra-precio').value);
    const cantidadMaxima = parseInt(document.getElementById('extra-max').value);
    const activo         = document.getElementById('extra-activo').checked;
    const errEl          = document.getElementById('extra-form-error');
    errEl.style.display  = 'none';

    if (!nombre || isNaN(precio) || isNaN(cantidadMaxima)) {
        errEl.textContent = 'Nombre, precio y cantidad máxima son obligatorios.';
        errEl.style.display = 'block';
        return;
    }

    const payload = { nombre, precio, cantidadMaxima, activo };
    const method  = id ? 'PUT'  : 'POST';
    const url     = id ? `${API}/api/extras/${id}` : `${API}/api/extras`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast('✅ Extra guardado', 'verde');
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
        mostrarToast('✅ Extra desactivado', 'verde');
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
        mostrarToast('✅ Extra eliminado para siempre', 'verde');
        cargarExtrasAdmin();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}
