// ══ Variables de Estado ════════════════════════════════════════════════════
let productos = [];
let extras = [];
let bloques = [];
let ticket = [];
let currentCategory = 'HAMBURGUESA';
let currentMultiplier = 1;
let itemEditandoIndex = -1;

// ══ Inicialización ═════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación (Requerido: rol EMPLEADO o ADMIN)
    const token = localStorage.getItem('bb_token');
    const rol = localStorage.getItem('bb_rol');
    const nombre = localStorage.getItem('bb_nombre');

    if (!token || !['ADMIN', 'EMPLEADO'].includes(rol)) {
        alert("Acceso denegado. Redirigiendo a inicio.");
        window.location.href = '/';
        return;
    }

    document.getElementById('pos-empleado-nombre').textContent = `Agente: ${nombre || 'Staff'}`;
    actualizarReloj();
    setInterval(actualizarReloj, 1000);

    // 2. Cargar datos
    await Promise.all([
        cargarProductos(),
        cargarExtras(),
        cargarBloques()
    ]);

    // 3. Setup Listeners
    setupMultipliers();
    setupCategoryTabs();
    if (productos.length > 0) renderGrid();
});

// ══ UI Helpers ═════════════════════════════════════════════════════════════
function actualizarReloj() {
    const now = new Date();
    document.getElementById('pos-hora-actual').textContent = now.toLocaleTimeString('es-ES');
}

function showPosToast(msg, type = 'success') {
    const t = document.getElementById('pos-toast');
    t.textContent = msg;
    t.className = `pos-toast show ${type}`;
    setTimeout(() => { t.className = 'pos-toast'; }, 3000);
}

function cerrarSesionPOS() {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_rol');
    localStorage.removeItem('bb_nombre');
    window.location.href = '/';
}

// ══ Carga de Datos ═════════════════════════════════════════════════════════
async function cargarProductos() {
    try {
        const res = await fetch('/api/productos');
        const data = await res.json();
        productos = data.productos || [];
    } catch (e) { console.error("Error cargando productos", e); }
}

async function cargarExtras() {
    try {
        const res = await fetch('/api/extras');
        const data = await res.json();
        extras = (data.extras || []).filter(e => e.activo !== false);
    } catch (e) { console.error("Error cargando extras", e); }
}

async function cargarBloques() {
    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/bloques?fecha=${date}`);
        const data = await res.json();
        bloques = data.bloques || [];
        renderBloques();
    } catch (e) { console.error("Error cargando bloques", e); }
}

// ══ Componentes Interactivos ══════════════════════════════════════════════
function setupMultipliers() {
    const btns = document.querySelectorAll('.btn-multi:not(.btn-reset-multi)');
    btns.forEach(b => {
        b.addEventListener('click', (e) => {
            btns.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentMultiplier = parseInt(e.target.dataset.val);
        });
    });
}

function resetMulti() {
    document.querySelectorAll('.btn-multi').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-multi[data-val="1"]').classList.add('active');
    currentMultiplier = 1;
}

function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(t => {
        t.addEventListener('click', (e) => {
            tabs.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.cat;
            renderGrid();
        });
    });
}

// ══ Render Grid Principal ═════════════════════════════════════════════════
function renderGrid() {
    const cont = document.getElementById('pos-grid');
    const filtrados = productos.filter(p => p.activo !== false);

    if (filtrados.length === 0) {
        cont.innerHTML = '<div style="color:#999; text-align:center; padding:20px; grid-column:1/-1;">No hay productos</div>';
        return;
    }

    cont.innerHTML = filtrados.map(p => `
        <div class="item-btn cat-${p.categoria}" onclick="addToTicket('${p._id}')">
            <span class="item-btn-nombre">${p.nombre}</span>
            <span class="item-btn-precio">${p.precio.toFixed(2)}€</span>
        </div>
    `).join('');
}

// ══ Lógica de Ticket (Carrito) ════════════════════════════════════════════
function addToTicket(prodId) {
    const prod = productos.find(p => p._id === prodId);
    if (!prod) return;

    const item = {
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        producto: prod,
        cantidad: currentMultiplier,
        excluidos: [],
        anadidos: [],
        extras: [],
        precioBase: prod.precio,
        precioExtraUnitario: 0,
        precioTotalItem: prod.precio * currentMultiplier
    };

    ticket.push(item);
    resetMulti(); // Después de añadir, el multiplicador siempre vuelve a 1
    renderTicket();
}

function removeFromTicket(itemIndex, event) {
    event.stopPropagation(); // Evitar abrir modal
    ticket.splice(itemIndex, 1);
    renderTicket();
}

function renderTicket() {
    const cont = document.getElementById('ticket-items');
    if (ticket.length === 0) {
        cont.innerHTML = '<div class="ticket-empty">Vacio</div>';
        document.getElementById('ticket-total').textContent = '0.00€';
        return;
    }

    let totalGlobal = 0;

    cont.innerHTML = ticket.map((item, index) => {
        // Recalcular precio por si hubo extras
        const costoExtras = item.extras.reduce((acc, e) => acc + (e.precio * e.cantidad), 0);
        item.precioExtraUnitario = costoExtras;
        item.precioTotalItem = (item.precioBase + costoExtras) * item.cantidad;
        totalGlobal += item.precioTotalItem;

        // Texto mods
        let modsTxt = [];
        if (item.excluidos.length) modsTxt.push(`SIN: ${item.excluidos.join(', ')}`);
        if (item.anadidos.length) modsTxt.push(`+ ${item.anadidos.join(', ')}`);
        if (item.extras.length) modsTxt.push(item.extras.map(e => `${e.cantidad}x ${e.nombre}`).join(' | '));

        return `
            <div class="t-item" onclick="abrirModalPersonalizacion(${index})">
                <div class="t-item-info">
                    <span class="t-item-qty">${item.cantidad}x</span>
                    <span class="t-item-name">${item.producto.nombre}</span>
                    <div class="t-item-mods">${modsTxt.join('<br>')}</div>
                </div>
                <div class="t-item-price">${item.precioTotalItem.toFixed(2)}€</div>
                <button class="btn-rojo" style="padding:2px 8px; font-size:1.2rem; align-self:flex-start" onclick="removeFromTicket(${index}, event)">✕</button>
            </div>
        `;
    }).join('');

    document.getElementById('ticket-total').textContent = totalGlobal.toFixed(2) + '€';
}

// ══ Bloques Horarios ══════════════════════════════════════════════════════
let bloqueSeleccionado = null;
function renderBloques() {
    const cont = document.getElementById('ticket-bloques');
    if (!bloques.length) { cont.innerHTML = '<p>No hay bloques creados hoy.</p>'; return; }

    const now = new Date();
    const horaActualStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    cont.innerHTML = bloques.map(b => {
        const esPasado = b.horaInicio < horaActualStr;
        const huecosLibres = b.capacidadMax - b.hamburgesasOcupadas;
        const estaLleno = huecosLibres <= 0;
        const estaForzado = huecosLibres < 0;
        let c = 'btn-bloque';
        if (estaLleno) c += ' bloque-red';
        if (bloqueSeleccionado === b._id) c += ' selected';

        let estadoLabel;
        if (estaForzado) {
            estadoLabel = `<span style="font-size:0.78rem; font-weight:900;">⚡FORZADO</span>`;
        } else if (estaLleno) {
            estadoLabel = `<span style="font-size:0.85rem; font-weight:900;">LLENO</span>`;
        } else {
            estadoLabel = `<span style="font-size:0.85rem;">${huecosLibres} libres</span>`;
        }

        return `<button class="${c}" ${esPasado ? 'disabled style="opacity:0.3"' : ''} onclick="seleccionarBloque('${b._id}')">
            ${b.horaInicio}<br>${estadoLabel}
        </button>`;
    }).join('');
}

function seleccionarBloque(id) {
    bloqueSeleccionado = id;
    renderBloques();
}

// ══ Modal Personalización Rápida ══════════════════════════════════════════
function abrirModalPersonalizacion(index) {
    itemEditandoIndex = index;
    const item = ticket[index];
    const prod = item.producto;

    document.getElementById('modal-p-titulo').textContent = `Pers: ${prod.nombre} (${item.cantidad}x)`;

    // Render Quitar
    const cQuitar = document.getElementById('chips-quitar');
    if (!prod.ingredientesPorDefecto || prod.ingredientesPorDefecto.length === 0) {
        cQuitar.innerHTML = '<i>- No modificable -</i>';
    } else {
        cQuitar.innerHTML = prod.ingredientesPorDefecto.map(ing => {
            const act = item.excluidos.includes(ing) ? 'active' : '';
            return `<div class="chip-t ${act}" onclick="toggleMod('quitar', '${ing}', this)">${ing}</div>`;
        }).join('');
    }

    // Render Extras de Pago y Salsas
    const cExtras = document.getElementById('grid-extras');
    if (prod.categoria === 'BEBIDA') {
        cExtras.innerHTML = '<i>- No aplicable -</i>';
    } else {
        cExtras.innerHTML = extras.map(e => {
            const objExtra = item.extras.find(ex => ex.extra === e._id);
            const isGratis = e.precio === 0;
            // Para salsas gratis usamos la logica de 'anadidos', para pago usamos 'extras' con array de objetos
            if (isGratis) {
                const act = item.anadidos.includes(e.nombre) ? 'active' : '';
                return `<div class="extra-t ${act}" onclick="toggleMod('anadir', '${e.nombre}', this, '${e._id}')">
                            <span>Salsa: <b>${e.nombre}</b></span>
                            <span>Gratis</span>
                        </div>`;
            } else {
                const qty = objExtra ? objExtra.cantidad : 0;
                const act = qty > 0 ? 'active' : '';
                return `<div class="extra-t ${act}">
                            <span>${e.nombre}</span>
                            <span>+${e.precio.toFixed(2)}€</span>
                            <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:5px;">
                                <button class="btn-rojo" style="padding:2px 10px; border-radius:50%" onclick="adjustModalExtra('${e._id}', '${e.nombre}', ${e.precio}, -1)">-</button>
                                <span style="font-weight:900" id="m-ext-qty-${e._id}">${qty}</span>
                                <button class="btn-rojo" style="padding:2px 10px; border-radius:50%" onclick="adjustModalExtra('${e._id}', '${e.nombre}', ${e.precio}, 1)">+</button>
                            </div>
                        </div>`;
            }
        }).join('');
    }

    document.getElementById('modal-personalizacion').style.display = 'flex';
}

function cerrarModalesPOS() {
    document.getElementById('modal-personalizacion').style.display = 'none';
    itemEditandoIndex = -1;
    renderTicket(); // Por si modificaron algo
}

function toggleMod(tipo, valor, el, idExtraContext) {
    if (itemEditandoIndex === -1) return;
    const item = ticket[itemEditandoIndex];
    el.classList.toggle('active');

    if (tipo === 'quitar') {
        if (el.classList.contains('active')) item.excluidos.push(valor);
        else item.excluidos = item.excluidos.filter(x => x !== valor);
    } else if (tipo === 'anadir') {
        if (el.classList.contains('active')) item.anadidos.push(valor);
        else item.anadidos = item.anadidos.filter(x => x !== valor);
    }
}

function adjustModalExtra(idExtra, nombre, precio, delta) {
    if (itemEditandoIndex === -1) return;
    const item = ticket[itemEditandoIndex];
    let obj = item.extras.find(e => e.extra === idExtra);

    if (!obj) {
        if (delta < 0) return;
        obj = { extra: idExtra, nombre, precio, cantidad: 0 };
        item.extras.push(obj);
    }

    obj.cantidad += delta;
    if (obj.cantidad < 0) obj.cantidad = 0;
    if (obj.cantidad > 10) obj.cantidad = 10;

    document.getElementById(`m-ext-qty-${idExtra}`).textContent = obj.cantidad;

    // Activar/desactivar visualmente el padre si qty > 0
    const parent = document.getElementById(`m-ext-qty-${idExtra}`).closest('.extra-t');
    if (obj.cantidad > 0) parent.classList.add('active');
    else parent.classList.remove('active');

    // Limpiar 0s
    item.extras = item.extras.filter(e => e.cantidad > 0);
}

document.getElementById('btn-guardar-personalizacion').addEventListener('click', cerrarModalesPOS);

// ══ Enviar Pedido Telefónico/Físico ═══════════════════════════════════════
async function cobrarPedido() {
    if (ticket.length === 0) return showPosToast('El ticket está vacío.', 'error');
    if (!bloqueSeleccionado) return showPosToast('Selecciona un bloque.', 'error');

    const nombre = document.getElementById('cliente-nombre').value.trim() || 'Cliente Físico';
    const telefono = document.getElementById('cliente-telefono').value.trim() || 'Desconocido';
    const forzar = document.getElementById('check-forzar').checked;

    const btn = document.getElementById('btn-cobrar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    // Preparar Lineas
    const lineas = ticket.map(t => ({
        producto: t.producto._id,
        cantidad: t.cantidad,
        excluidos: t.excluidos,
        anadidos: t.anadidos,
        precioUnitario: t.precioBase, // Backend sumará extras
        extras: t.extras.map(e => ({ extra: e.extra, cantidad: e.cantidad }))
    }));

    try {
        const payload = {
            nombre,
            telefono,
            lineas,
            bloqueId: bloqueSeleccionado,
            metodoPago: 'EFECTIVO/TARJETA_FISICA',
            forzarBloque: forzar,
            notas: "Pedido creado vía POS"
        };

        const res = await fetch('/api/pedidos/telefonico', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('bb_token')}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            btn.disabled = false;
            btn.textContent = 'ENVIAR PEDIDO';
            let errorMsg = data.mensaje || data.message || 'Error desconocido del servidor';
            if (data.errores && data.errores.length) {
                errorMsg = data.errores.map(e => e.mensaje).join(', ');
            }
            return showPosToast('Error: ' + errorMsg, 'error');
        }

        showPosToast(`✅ Pedido ${data.pedido._id.slice(-5).toUpperCase()} creado con éxito!`);

        // Reset ticket
        ticket = [];
        document.getElementById('cliente-nombre').value = '';
        document.getElementById('cliente-telefono').value = '';
        document.getElementById('check-forzar').checked = false;
        bloqueSeleccionado = null;
        renderTicket();
        cargarBloques(); // refrescar

        btn.disabled = false;
        btn.textContent = 'ENVIAR PEDIDO';

    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = 'ENVIAR PEDIDO';
        showPosToast('Error de red al procesar.', 'error');
    }
}
