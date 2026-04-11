// ── app-checkout.js — Flujo de checkout en 3 pasos ───────────────────────────

async function iniciarCheckout() {
    cerrarModal('modal-carrito');

    // UC-05: Modo edición — saltamos el flujo normal y vamos directo a confirmar cambios
    const editando = JSON.parse(localStorage.getItem('bb_editando') || 'null');
    if (editando) {
        abrirModal('modal-checkout');
        renderCheckoutEditar(editando);
        return;
    }

    const token = localStorage.getItem('bb_token');
    const rol   = localStorage.getItem('bb_rol');

    if (token && rol === 'CLIENTE') {
        const btn     = document.querySelector('.btn-checkout');
        const textBtn = btn ? btn.textContent : '';
        if (btn) btn.textContent = 'CARGANDO...';
        try {
            const data = await apiFetch('/auth/me');
            if (data && data.cliente) {
                window._checkoutDatos = {
                    nombre:   data.cliente.nombre   || '',
                    telefono: data.cliente.telefono || '',
                    email:    data.cliente.email    || '',
                };
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

// ── Checkout en modo edición ──────────────────────────────────────────────────

function renderCheckoutEditar(editando) {
    const resumen = carrito.map(i => `
        <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:3px;">
            <span>${i.cantidad}× ${escHTML(i.nombre)}
                ${i.ingredientesExcluidos?.length ? `<span style="color:#888;font-size:0.78rem;"> (sin ${escHTML(i.ingredientesExcluidos.join(', '))})</span>` : ''}
                ${i.ingredientesAnadidos?.length ? `<span style="color:#888;font-size:0.78rem;"> (con ${escHTML(i.ingredientesAnadidos.join(', '))})</span>` : ''}
            </span>
            <span style="color:var(--rojo);font-weight:700;">${(i.precioUnitario * i.cantidad).toFixed(2)}€</span>
        </div>
    `).join('');

    document.getElementById('checkout-content').innerHTML = `
        <div style="background:#1a1a1a;color:#fff;border-radius:10px;padding:11px 15px;
            margin-bottom:16px;font-family:'Barlow Condensed',sans-serif;font-size:0.95rem;font-weight:700;">
            EDITANDO <span style="color:#e63c2f;">${escHTML(editando.numero)}</span>
        </div>
        <div style="background:#f8f8f8;border-radius:11px;padding:14px;margin-bottom:16px;">
            <div style="font-weight:700;font-size:0.8rem;color:#555;letter-spacing:1px;
                text-transform:uppercase;margin-bottom:10px;">Nuevo contenido del pedido</div>
            ${resumen}
            <div style="border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px;font-weight:900;
                display:flex;justify-content:space-between;font-size:1.05rem;">
                <span>TOTAL</span>
                <span style="color:var(--rojo)">${totalCarrito().toFixed(2)}€</span>
            </div>
        </div>
        <p style="font-size:0.82rem;color:#888;margin-bottom:14px;line-height:1.4;">
            La hora de recogida no cambia. Si el nuevo total es mayor, pagarás la diferencia en el local.
        </p>
        <div style="display:flex;gap:10px;">
            <button onclick="cerrarModal('modal-checkout')"
                style="flex:1;padding:13px;border:2px solid #ddd;background:#fff;
                font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;
                border-radius:8px;cursor:pointer;letter-spacing:1px;">
                VOLVER
            </button>
            <button class="btn-siguiente" onclick="guardarModificacionDesdeCheckout()" style="flex:2;">
                GUARDAR CAMBIOS ✓
            </button>
        </div>
    `;
}

function _lineasDesdeCarrito() {
    return carrito.map(item => ({
        producto:              item.productId,
        nombre:                item.nombre,
        precio:                item.precioBase,
        cantidad:              item.cantidad,
        precioUnitario:        item.precioBase,
        ingredientesExcluidos: item.ingredientesExcluidos || [],
        ingredientesAnadidos:  item.ingredientesAnadidos  || [],
        extras: (item.extras || []).map(e => ({ extra: e.extra, nombre: e.nombre, precio: e.precio, cantidad: 1 }))
    }));
}

async function _enviarModificacion(editando, body) {
    const token = localStorage.getItem('bb_token');
    const res = await fetch(`${API}/pedidos/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    return { res, data: await res.json() };
}

async function guardarModificacionDesdeCheckout(nuevoBloqueId = null) {
    const editando = JSON.parse(localStorage.getItem('bb_editando') || 'null');
    if (!editando) return;

    if (carrito.length === 0) {
        mostrarToast('El pedido no puede quedar vacío. Usa Cancelar Pedido si quieres anularlo.', 'error');
        return;
    }

    const btn = document.querySelector('#checkout-content .btn-siguiente');
    if (btn) { btn.disabled = true; btn.textContent = 'GUARDANDO...'; }

    const body = {
        lineas: _lineasDesdeCarrito(),
        total:  +totalCarrito().toFixed(2),
        ...(nuevoBloqueId ? { nuevoBloqueId } : {})
    };

    try {
        const { res, data } = await _enviarModificacion(editando, body);

        // Sin hueco en el bloque actual — mostrar selector de bloques alternativos
        if (res.status === 409 && data.sinHueco) {
            if (btn) { btn.disabled = false; btn.textContent = 'GUARDAR CAMBIOS ✓'; }
            renderSelectorBloquesModificacion(editando, data);
            return;
        }

        if (!res.ok) {
            mostrarToast(data.mensaje || 'No se pudo modificar el pedido', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'GUARDAR CAMBIOS ✓'; }
            return;
        }

        // Éxito
        localStorage.removeItem('bb_editando');
        carrito = [];
        actualizarContadorCarrito();
        cerrarModal('modal-checkout');

        const diferencia = data.diferencia || 0;
        const msg = diferencia > 0
            ? `Pedido actualizado. Diferencia a pagar en local: +${diferencia.toFixed(2)}€`
            : diferencia < 0
                ? `Pedido actualizado. Se te devolverá: ${Math.abs(diferencia).toFixed(2)}€`
                : 'Pedido modificado correctamente';
        mostrarToast(msg, 'success');
        setTimeout(() => window.location.href = 'cliente.html', 1200);

    } catch (e) {
        mostrarToast(`Error de red: ${e.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'GUARDAR CAMBIOS ✓'; }
    }
}

function renderSelectorBloquesModificacion(editando, { mensaje, bloquesDisponibles }) {
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);

    // Filtrar bloques pasados
    const bloquesValidos = bloquesDisponibles.filter(b => b.horaInicio > horaActual);

    const selectOpciones = bloquesValidos.length === 0
        ? `<option value="">No hay horas disponibles este día</option>`
        : [`<option value="">-- Elige una hora --</option>`,
           ...bloquesValidos.map(b => {
               const libres = b.capacidadMax - b.hamburgesasOcupadas;
               return `<option value="${escAttr(b._id)}">${escHTML(b.horaInicio)} · ${libres} hueco${libres !== 1 ? 's' : ''} libre${libres !== 1 ? 's' : ''}</option>`;
           })
          ].join('');

    document.getElementById('checkout-content').innerHTML = `
        <div style="background:#1a1a1a;color:#fff;border-radius:10px;padding:11px 15px;
            margin-bottom:14px;font-family:'Barlow Condensed',sans-serif;font-size:0.95rem;font-weight:700;">
            EDITANDO <span style="color:#e63c2f;">${escHTML(editando.numero)}</span>
        </div>
        <p style="font-size:0.88rem;color:#333;line-height:1.5;margin-bottom:14px;">${escHTML(mensaje)}</p>
        <div class="form-group" style="margin-bottom:16px;">
            <label style="font-size:0.8rem;font-weight:700;color:#555;letter-spacing:1px;
                text-transform:uppercase;display:block;margin-bottom:6px;">Nueva hora de recogida</label>
            <select id="select-bloque-alternativo"
                onchange="window._bloqueAlternativoSeleccionado = this.value; document.getElementById('btn-confirmar-bloque').disabled = !this.value; document.getElementById('btn-confirmar-bloque').style.opacity = this.value ? '1' : '0.5';"
                style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;
                font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;
                background:#fff;cursor:pointer;">
                ${selectOpciones}
            </select>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="renderCheckoutEditar(JSON.parse(localStorage.getItem('bb_editando')))"
                style="flex:1;padding:13px;border:2px solid #ddd;background:#fff;
                font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;
                border-radius:8px;cursor:pointer;letter-spacing:1px;">
                ← VOLVER
            </button>
            <button class="btn-siguiente" id="btn-confirmar-bloque"
                onclick="guardarModificacionDesdeCheckout(window._bloqueAlternativoSeleccionado)"
                disabled style="flex:2;opacity:0.5;">
                CONFIRMAR NUEVA HORA ✓
            </button>
        </div>
    `;
    window._bloqueAlternativoSeleccionado = null;
}

function renderCheckoutPaso1() {
    const dNombre = window._checkoutDatos?.nombre   || usuarioActual?.nombre || '';
    const dTel    = window._checkoutDatos?.telefono || '';
    const dEmail  = window._checkoutDatos?.email    || '';

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
                <input type="text" id="co-nombre" placeholder="Tu nombre" value="${escAttr(dNombre)}">
            </div>
            <div class="form-group">
                <label>Teléfono *</label>
                <input type="tel" id="co-telefono" placeholder="612 345 678" value="${escAttr(dTel)}">
            </div>
        </div>
        <div class="form-group">
            <label>Email (para confirmación)</label>
            <input type="email" id="co-email" placeholder="tu@email.com" value="${escAttr(dEmail)}">
        </div>
        <div style="margin-top:10px;padding-top:14px;border-top:1px solid #f0f0f0;">
            <div style="font-weight:700;font-size:0.8rem;color:#555;letter-spacing:1px;margin-bottom:10px;text-transform:uppercase;">Resumen</div>
            ${carrito.map(i => `
                <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:3px;">
                    <span>${i.cantidad}× ${escHTML(i.nombre)}</span>
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

async function checkoutPaso2() {
    const nombre   = document.getElementById('co-nombre').value.trim();
    const telefono = document.getElementById('co-telefono').value.trim();
    const email    = document.getElementById('co-email').value.trim();
    if (!nombre || !telefono) { mostrarToast('Nombre y teléfono son obligatorios', 'error'); return; }
    window._checkoutDatos = { nombre, telefono, email };
    await renderPaso2Directo();
}

async function renderPaso2Directo() {
    const hoy          = new Date();
    const opcionesFecha = [];
    for (let i = 0; i < 8; i++) {
        const d = new Date(hoy); d.setDate(d.getDate() + i);
        if ([0, 5, 6].includes(d.getDay())) opcionesFecha.push(d.toISOString().slice(0, 10));
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
                ${opcionesFecha.map(f => `<option value="${escAttr(f)}">${escHTML(formatearFecha(f))}</option>`).join('')}
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

        grid.innerHTML = bloques.filter(b => !b.cerrado).map(b => {
            const lleno = b.hamburgesasOcupadas >= b.capacidadMax || b.cerrado;
            return `
                <button class="bloque-btn"
                    onclick="${lleno ? '' : `seleccionarBloque('${escAttr(b._id)}', this)`}"
                    id="bloque-${escAttr(b._id)}"
                    ${lleno ? 'disabled' : ''}>
                    ${escHTML(b.horaInicio)}
                    ${lleno ? '<span class="bloque-lleno">LLENO</span>' : ''}
                </button>
            `;
        }).join('');
    } catch (e) {
        grid.innerHTML = `<p style="color:var(--rojo);grid-column:1/-1;padding:10px 0">Error: ${escHTML(e.message)}</p>`;
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
                <span>${i.cantidad}× ${escHTML(i.nombre)}</span><span style="color:var(--rojo);font-weight:700;">${(i.precioUnitario * i.cantidad).toFixed(2)}€</span>
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
        producto:              item.productId,
        nombre:                item.nombre,
        precio:                item.precioBase,
        cantidad:              item.cantidad,
        precioUnitario:        item.precioBase,
        ingredientesExcluidos: item.ingredientesExcluidos,
        ingredientesAnadidos:  item.ingredientesAnadidos,
        extras: item.extras.map(e => ({ extra: e.extra, nombre: e.nombre, precio: e.precio, cantidad: 1 }))
    }));

    // El backend ignora `clienteId` del body por seguridad y toma el cliente del JWT si existe.
    // `apiFetch` envía Authorization automáticamente si hay token en localStorage.
    const body = { nombre, telefono, email, bloqueId: bloqueSeleccionado, metodoPago: metodoPagoSeleccionado, lineas };

    try {
        const data = await apiFetch('/pedidos', { method: 'POST', body: JSON.stringify(body) });
        carrito = [];
        actualizarContadorCarrito();
        document.getElementById('checkout-content').innerHTML = `
            <div class="pedido-confirmado">
                <div class="check">✅</div>
                <h2 style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:var(--negro)">¡Pedido confirmado!</h2>
                <div class="pedido-numero">${escHTML(data.pedido.numero)}</div>
                <p class="pedido-info">
                    Hora de recogida: <strong>${escHTML(bloques.find(b => b._id === bloqueSeleccionado)?.horaInicio || '')}</strong><br>
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
