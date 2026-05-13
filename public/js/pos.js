// ══ Variables de Estado ════════════════════════════════════════════════════
let productos = [];
let extras = [];
let bloques = [];
let _pedidosPorBloque = {};
let ticket = [];
let currentCategory = 'HAMBURGUESA';
let currentMultiplier = 1;
let itemEditandoIndex = -1;
let splitCantidad = 1; // Cuántas unidades personalizar en el modal

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
    inicializarSelectorFecha();
    await Promise.all([
        cargarProductos(),
        cargarExtras(),
        cargarBloques()
    ]);

    // 3. Setup Listeners
    setupMultipliers();
    setupCategoryTabs();
    if (productos.length > 0) renderGrid();

    // 4. Inicializar layout móvil si corresponde
    initMobileTabs();

    // 5. Modo edición: restaurar pedido si viene del admin
    const editRaw = localStorage.getItem('bb_editar_pedido');
    if (editRaw) {
        try {
            const edit = JSON.parse(editRaw);
            cargarModoEdicion(edit);
        } catch (e) {
            localStorage.removeItem('bb_editar_pedido');
        }
    }
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

function volverAlPanel() {
    const rol = localStorage.getItem('bb_rol');
    window.location.href = rol === 'ADMIN' ? '/admin.html' : '/empleados.html';
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

function inicializarSelectorFecha() {
    const select = document.getElementById('pos-fecha-selector');
    const hoy = new Date();
    const opciones = [];

    for (let i = 0; i < 8; i++) {
        const d = new Date(hoy);
        d.setDate(d.getDate() + i);
        if ([0, 5, 6].includes(d.getDay())) { // dom, vie, sab
            const iso = d.toISOString().slice(0, 10);
            const label = i === 0
                ? `HOY — ${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`
                : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
            opciones.push({ iso, label });
        }
    }

    if (opciones.length === 0) {
        // No hay días operativos en los próximos 7 días (no es vi/sa/do)
        select.innerHTML = '<option value="">Sin días disponibles esta semana</option>';
        return;
    }

    select.innerHTML = opciones.map(o => `<option value="${o.iso}">${o.label}</option>`).join('');
    select.value = opciones[0].iso;
}

async function cargarBloques(fecha) {
    try {
        const fechaConsulta = fecha || document.getElementById('pos-fecha-selector')?.value || (() => {
            const hoy = new Date();
            return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
        })();
        const token = localStorage.getItem('bb_token');
        const [resBloques, resPedidos] = await Promise.all([
            fetch(`/api/bloques?fecha=${fechaConsulta}`),
            fetch(`/api/pedidos/todos?fecha=${fechaConsulta}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);
        const dataBloques = await resBloques.json();
        bloques = dataBloques.bloques || [];

        // Construir mapa bloqueId → nº de pedidos para mostrarlo en los botones
        _pedidosPorBloque = {};
        if (resPedidos.ok) {
            const dataPedidos = await resPedidos.json();
            for (const p of (dataPedidos.pedidos || [])) {
                for (const bl of (p.bloques || [])) {
                    const id = (bl._id || bl).toString();
                    _pedidosPorBloque[id] = (_pedidosPorBloque[id] || 0) + 1;
                }
            }
        }
        renderBloques();
    } catch (e) { console.error("Error cargando bloques", e); }
}

function cambiarFecha(fecha) {
    bloqueSeleccionado = null;
    cargarBloques(fecha);
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
    document.querySelector('.btn-multi[data-val="1"]')?.classList.add('active');
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
        cont.innerHTML = '<div style="color:#999; text-align:center; padding:20px; grid-column:1/-1;">No hay productos en esta categoría</div>';
        return;
    }

    cont.innerHTML = filtrados.map(p => `
        <div class="item-btn cat-${escAttr(p.categoria)}" onclick="addToTicket('${escAttr(p._id)}')">
            <span class="item-btn-nombre">${escHTML(p.nombre)}</span>
            <span class="item-btn-precio">${p.precio.toFixed(2)}€</span>
        </div>
    `).join('');
}

// ══ Lógica de Ticket (Carrito) ════════════════════════════════════════════
function addToTicket(prodId) {
    const prod = productos.find(p => p._id === prodId);
    if (!prod) return;

    // Solo apilar con una línea sin personalización del mismo producto (y no gratis)
    const existente = ticket.find(it =>
        it.producto._id === prodId &&
        it.excluidos.length === 0 &&
        it.anadidos.length === 0 &&
        it.extras.length === 0 &&
        !it.gratis
    );

    if (existente) {
        existente.cantidad += currentMultiplier;
        existente.precioTotalItem = (existente.precioBase + existente.precioExtraUnitario) * existente.cantidad;
    } else {
        // Nueva línea
        ticket.push({
            _id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            producto: prod,
            cantidad: currentMultiplier,
            excluidos: [],
            anadidos: [],
            extras: [],
            gratis: false,
            precioBase: prod.precio,
            precioExtraUnitario: 0,
            precioTotalItem: prod.precio * currentMultiplier
        });
    }

    resetMulti();
    renderTicket();
}


function removeFromTicket(itemIndex, event) {
    event.stopPropagation(); // Evitar abrir modal
    ticket.splice(itemIndex, 1);
    renderTicket();
}

function toggleGratis(index, event) {
    event.stopPropagation();
    ticket[index].gratis = !ticket[index].gratis;
    renderTicket();
}

function renderTicket() {
    const cont = document.getElementById('ticket-items');
    if (ticket.length === 0) {
        cont.innerHTML = '<div class="ticket-empty">Vacio</div>';
        document.getElementById('ticket-total').textContent = '0.00€';
        sincronizarTotalMovil(0, 0);
        return;
    }

    let totalGlobal = 0;

    // Pre-calcular descuento 3x2 salsas para distribuirlo en la propia línea
    const totalSalsasUnidades = ticket
        .filter(it => it.producto.categoria === 'SALSA' && !it.gratis)
        .reduce((t, it) => t + it.cantidad, 0);
    const salsasGratis = Math.floor(totalSalsasUnidades / 3);
    const precioSalsa = ticket.find(it => it.producto.categoria === 'SALSA')?.precioBase || 0;
    const descuentoSalsas = salsasGratis * precioSalsa;

    cont.innerHTML = ticket.map((item, index) => {
        // Recalcular precio por si hubo extras
        if (item.gratis) {
            item.precioExtraUnitario = 0;
            item.precioTotalItem = 0;
        } else {
            const costoExtras = item.extras.reduce((acc, e) => acc + ((e.gratis ? 0 : e.precio) * e.cantidad), 0);
            item.precioExtraUnitario = costoExtras;
            item.precioTotalItem = (item.precioBase + costoExtras) * item.cantidad;
        }
        totalGlobal += item.precioTotalItem;

        // Texto mods — los elementos ya pueden contener texto libre del admin (extras, ingredientes);
        // se escapan al componer y se unen con <br> literal (no se escapan ese separador).
        let modsTxt = [];
        item.excluidos.forEach(ing => modsTxt.push(`SIN: ${escHTML(ing)}`));
        item.anadidos.forEach(ing => modsTxt.push(`+ ${escHTML(ing)}`));
        item.extras.forEach(e => modsTxt.push(escHTML(`${e.cantidad}x ${e.nombre}`) + (e.gratis ? ' 🎁' : '')));

        // Precio a mostrar en la línea: gratis → 0.00€, salsa con 3x2 → precio con descuento proporcional
        let precioLinea = item.precioTotalItem;
        let promoTag = '';
        if (!item.gratis && item.producto.categoria === 'SALSA' && descuentoSalsas > 0 && totalSalsasUnidades > 0) {
            const descuentoLinea = (item.cantidad / totalSalsasUnidades) * descuentoSalsas;
            precioLinea = Math.max(0, item.precioTotalItem - descuentoLinea);
            promoTag = `<span style="color:#2ecc71;font-size:0.75rem;margin-left:3px">🏷️3x2</span>`;
        }

        const precioDisplay = item.gratis
            ? `<span style="color:#2ecc71;font-weight:900">🎁 0.00€</span>`
            : `${precioLinea.toFixed(2)}€${promoTag}`;
        const colorGratis = item.gratis ? '#27ae60' : '#444';
        return `
            <div class="t-item" onclick="abrirModalPersonalizacion(${index})">
                <div class="t-item-info">
                    <span class="t-item-qty">${item.cantidad}x</span>
                    <span class="t-item-name">${escHTML(['HAMBURGUESA','PATATAS'].includes(item.producto.categoria) ? item.producto.nombre.toUpperCase() : item.producto.nombre)}</span>
                    <div class="t-item-mods">${modsTxt.join('<br>')}</div>
                </div>
                <div class="t-item-price">${precioDisplay}</div>
                <button style="padding:2px 7px;font-size:.85rem;align-self:flex-start;background:${colorGratis};border:none;border-radius:4px;color:#fff;cursor:pointer;margin-right:2px" onclick="toggleGratis(${index}, event)" title="Marcar como gratis">🎁</button>
                <button class="btn-rojo" style="padding:2px 8px; font-size:1.2rem; align-self:flex-start" onclick="removeFromTicket(${index}, event)">✕</button>
            </div>
        `;
    }).join('');

    if (descuentoSalsas > 0) {
        totalGlobal -= descuentoSalsas;
    }

    document.getElementById('ticket-total').textContent = totalGlobal.toFixed(2) + '€';
    const totalItems = ticket.reduce((s, i) => s + i.cantidad, 0);
    sincronizarTotalMovil(totalGlobal, totalItems);
}

// ══ Bloques Horarios ══════════════════════════════════════════════════════
let bloqueSeleccionado = null;
function renderBloques() {
    const cont = document.getElementById('ticket-bloques');
    if (!bloques.length) { cont.innerHTML = '<p style="color:#888;padding:14px;grid-column:1/-1;text-align:center">No hay bloques para este día.</p>'; return; }

    const now = new Date();
    const hoyIso = now.toISOString().slice(0, 10);
    const horaActualStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const fechaSeleccionada = document.getElementById('pos-fecha-selector')?.value || hoyIso;
    const esHoy = fechaSeleccionada === hoyIso;

    cont.innerHTML = bloques.map(b => {
        const esPasado = esHoy && b.horaInicio < horaActualStr;
        const huecosLibres = b.capacidadMax - b.hamburgesasOcupadas;
        const estaLleno = huecosLibres <= 0;
        const estaForzado = huecosLibres < 0;
        let c = 'btn-bloque';
        if (estaLleno) c += ' bloque-red';
        if (bloqueSeleccionado === b._id) c += ' selected';

        const numPedidos = _pedidosPorBloque[b._id] || 0;
        const pedTag = numPedidos > 0
            ? `<span style="font-size:0.7rem;opacity:0.75">(${numPedidos} ped.)</span>` : '';

        let estadoLabel;
        if (estaForzado) {
            estadoLabel = `<span style="font-size:0.78rem; font-weight:900;">⚡FORZADO</span> ${pedTag}`;
        } else if (estaLleno) {
            estadoLabel = `<span style="font-size:0.85rem; font-weight:900;">LLENO</span> ${pedTag}`;
        } else {
            estadoLabel = `<span style="font-size:0.85rem;">${huecosLibres} libres</span> ${pedTag}`;
        }

        return `<button class="${c}" ${esPasado ? 'disabled style="opacity:0.3"' : ''} onclick="seleccionarBloque('${escAttr(b._id)}')">
            ${escHTML(b.horaInicio)}<br>${estadoLabel}
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

    document.getElementById('modal-p-titulo').textContent =
        `${prod.nombre}${item.cantidad > 1 ? ` (${item.cantidad}×)` : ''}`;

    // ── Stepper de split ───────────────────────────────────────────────────
    const splitWrap = document.getElementById('modal-split-wrap');
    if (item.cantidad > 1) {
        splitCantidad = 1;
        document.getElementById('modal-split-qty').textContent = splitCantidad;
        document.getElementById('modal-split-info').textContent = `de ${item.cantidad} unidades`;
        splitWrap.style.display = 'block';
    } else {
        splitCantidad = 1;
        splitWrap.style.display = 'none';
    }

    // ── Render Quitar ingredientes ──────────────────────────────────────────
    const cQuitar = document.getElementById('chips-quitar');
    if (!prod.ingredientesPorDefecto || prod.ingredientesPorDefecto.length === 0) {
        document.getElementById('pm-sec-quitar').style.display = 'none';
    } else {
        document.getElementById('pm-sec-quitar').style.display = '';
        cQuitar.innerHTML = prod.ingredientesPorDefecto.map((ing, i) => {
            const excluido = item.excluidos.includes(ing);
            return `<div class="pm-chip${excluido ? ' excluido' : ''}" data-idx="${i}">${escHTML(ing)}</div>`;
        }).join('');

        cQuitar.querySelectorAll('.pm-chip').forEach(el => {
            const ing = prod.ingredientesPorDefecto[+el.dataset.idx];
            el.addEventListener('click', () => {
                if (itemEditandoIndex === -1) return;
                const itm = ticket[itemEditandoIndex];
                el.classList.toggle('excluido');
                if (el.classList.contains('excluido')) itm.excluidos.push(ing);
                else itm.excluidos = itm.excluidos.filter(x => x !== ing);
                actualizarResumenModal();
            });
        });
    }

    // ── Render Salsas gratis y Extras de pago ──────────────────────────────
    const cExtras = document.getElementById('grid-extras');
    const secExtras = document.getElementById('pm-sec-extras');

    if (prod.categoria === 'BEBIDA' || prod.categoria === 'POSTRE' || prod.categoria === 'SALSA' || !extras.length) {
        secExtras.style.display = 'none';
    } else {
        secExtras.style.display = '';
        const salsas = extras.filter(e => e.precio === 0);
        const pagados = extras.filter(e => e.precio > 0);

        let html = '';

        if (salsas.length) {
            html += `<div class="pm-salsas">` +
                salsas.map((e, i) => {
                    const act = item.anadidos.includes(e.nombre) ? ' activo' : '';
                    return `<div class="pm-salsa${act}" data-salsa-id="${escAttr(e._id)}">
                        <span>${escHTML(e.nombre)}</span>
                        <span class="pm-salsa-gratis">Gratis</span>
                    </div>`;
                }).join('') +
            `</div>`;
        }

        if (pagados.length) {
            html += pagados.map(e => {
                const objExtra = item.extras.find(ex => ex.extra === e._id);
                const qty = objExtra ? objExtra.cantidad : 0;
                const estaGratis = objExtra ? !!objExtra.gratis : false;
                const precioTxt = estaGratis
                    ? `<span style="color:#2ecc71">🎁 0.00€</span>`
                    : `+${e.precio.toFixed(2)}€`;
                const colorGratisBtn = estaGratis ? '#27ae60' : '#444';
                const disabledGratis = qty === 0 ? 'style="opacity:0.3;pointer-events:none"' : '';
                return `<div class="pm-extra-row${qty > 0 ? ' activo' : ''}" data-extra-id="${escAttr(e._id)}">
                    <div class="pm-extra-info">
                        <div class="pm-extra-nombre">${escHTML(e.nombre)}</div>
                        <div class="pm-extra-precio">${precioTxt}</div>
                    </div>
                    <div class="pm-extra-stepper">
                        <button class="pm-extra-qty-btn pm-menos"${qty === 0 ? ' disabled' : ''}>−</button>
                        <span class="pm-extra-qty">${qty}</span>
                        <button class="pm-extra-qty-btn pm-mas">+</button>
                        <button class="pm-extra-gratis" style="padding:1px 6px;font-size:.8rem;background:${colorGratisBtn};border:none;border-radius:4px;color:#fff;cursor:pointer;margin-left:4px" ${disabledGratis} title="Extra gratis">🎁</button>
                    </div>
                </div>`;
            }).join('');
        }

        cExtras.innerHTML = html;

        // Eventos: salsas toggle
        cExtras.querySelectorAll('.pm-salsa').forEach(el => {
            const extObj = salsas.find(e => e._id === el.dataset.salsaId);
            if (!extObj) return;
            el.addEventListener('click', () => {
                if (itemEditandoIndex === -1) return;
                const itm = ticket[itemEditandoIndex];
                el.classList.toggle('activo');
                if (el.classList.contains('activo')) itm.anadidos.push(extObj.nombre);
                else itm.anadidos = itm.anadidos.filter(x => x !== extObj.nombre);
                actualizarResumenModal();
            });
        });

        // Eventos: extras de pago +/- y toggle gratis
        cExtras.querySelectorAll('.pm-extra-row').forEach(el => {
            const extObj = pagados.find(e => e._id === el.dataset.extraId);
            if (!extObj) return;
            const qtyEl    = el.querySelector('.pm-extra-qty');
            const menosBtn = el.querySelector('.pm-menos');
            const masBtn   = el.querySelector('.pm-mas');
            const gratisBtn = el.querySelector('.pm-extra-gratis');
            const precioEl  = el.querySelector('.pm-extra-precio');

            const ajustar = (delta) => {
                if (itemEditandoIndex === -1) return;
                const itm = ticket[itemEditandoIndex];
                let obj = itm.extras.find(e => e.extra === extObj._id);
                if (!obj) {
                    if (delta < 0) return;
                    obj = { extra: extObj._id, nombre: extObj.nombre, precio: extObj.precio, cantidad: 0, gratis: false };
                    itm.extras.push(obj);
                }
                obj.cantidad = Math.max(0, Math.min(10, obj.cantidad + delta));
                qtyEl.textContent = obj.cantidad;
                menosBtn.disabled = obj.cantidad === 0;
                if (obj.cantidad > 0) {
                    el.classList.add('activo');
                    if (gratisBtn) { gratisBtn.style.opacity = '1'; gratisBtn.style.pointerEvents = 'auto'; }
                } else {
                    el.classList.remove('activo');
                    if (gratisBtn) { gratisBtn.style.opacity = '0.3'; gratisBtn.style.pointerEvents = 'none'; }
                }
                itm.extras = itm.extras.filter(e => e.cantidad > 0);
                actualizarResumenModal();
            };

            menosBtn.addEventListener('click', () => ajustar(-1));
            masBtn.addEventListener('click',   () => ajustar(1));

            if (gratisBtn) {
                gratisBtn.addEventListener('click', () => {
                    if (itemEditandoIndex === -1) return;
                    const itm = ticket[itemEditandoIndex];
                    const obj = itm.extras.find(e => e.extra === extObj._id);
                    if (!obj || obj.cantidad === 0) return;
                    obj.gratis = !obj.gratis;
                    gratisBtn.style.background = obj.gratis ? '#27ae60' : '#444';
                    if (precioEl) {
                        precioEl.innerHTML = obj.gratis
                            ? '<span style="color:#2ecc71">🎁 0.00€</span>'
                            : `+${extObj.precio.toFixed(2)}€`;
                    }
                    actualizarResumenModal();
                });
            }
        });
    }

    actualizarResumenModal();
    document.getElementById('modal-personalizacion').style.display = 'flex';
}

function actualizarResumenModal() {
    const el = document.getElementById('pm-resumen');
    if (!el || itemEditandoIndex === -1) return;
    const itm = ticket[itemEditandoIndex];
    const partes = [];
    if (itm.excluidos.length)
        partes.push(`<strong>Sin:</strong> ${itm.excluidos.map(escHTML).join(', ')}`);
    if (itm.anadidos.length)
        partes.push(`<strong>+</strong> ${itm.anadidos.map(escHTML).join(', ')}`);
    if (itm.extras.length)
        partes.push(itm.extras.map(e => `<strong>${e.cantidad}× ${escHTML(e.nombre)}${e.gratis ? ' 🎁' : ''}</strong>`).join(', '));
    el.innerHTML = partes.join(' &nbsp;·&nbsp; ');
}


function ajustarSplit(delta) {
    if (itemEditandoIndex === -1) return;
    const max = ticket[itemEditandoIndex].cantidad;
    splitCantidad = Math.max(1, Math.min(max, splitCantidad + delta));
    document.getElementById('modal-split-qty').textContent = splitCantidad;
    document.getElementById('modal-split-info').textContent = `de ${max} unidades`;
}

function cerrarModalesPOS(guardar = false) {
    if (guardar && itemEditandoIndex !== -1) {
        const item = ticket[itemEditandoIndex];
        // Split: si personalizamos solo N de M unidades, creamos una línea nueva
        if (item.cantidad > 1 && splitCantidad < item.cantidad) {
            const restantes = item.cantidad - splitCantidad;
            // Reducir la línea original
            item.cantidad = restantes;
            item.precioTotalItem = (item.precioBase + item.precioExtraUnitario) * restantes;
            // Clonar con las personalizaciones aplicadas en el modal en nueva línea
            const nuevaLinea = {
                _id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                producto: item.producto,
                cantidad: splitCantidad,
                excluidos: [...item.excluidos],
                anadidos: [...item.anadidos],
                extras: item.extras.map(e => ({ ...e })),
                precioBase: item.precioBase,
                precioExtraUnitario: item.precioExtraUnitario,
                precioTotalItem: (item.precioBase + item.precioExtraUnitario) * splitCantidad
            };
            // La línea original queda limpia (sin las personalizaciones del modal)
            item.excluidos = [];
            item.anadidos = [];
            item.extras = [];
            ticket.splice(itemEditandoIndex + 1, 0, nuevaLinea);
        }
    }
    document.getElementById('modal-personalizacion').style.display = 'none';
    itemEditandoIndex = -1;
    splitCantidad = 1;
    fusionarDuplicados();
    renderTicket();
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

// Fusiona líneas del ticket que tienen el mismo producto y las mismas modificaciones
function fusionarDuplicados() {
    const clave = it =>
        `${it.producto._id}|${[...it.excluidos].sort().join(',')}|${[...it.anadidos].sort().join(',')}|` +
        it.extras.map(e => `${e.extra}:${e.cantidad}`).sort().join(',') + `|${!!it.gratis}`;

    const resultado = [];
    for (const it of ticket) {
        const k = clave(it);
        const existente = resultado.find(r => clave(r) === k);
        if (existente) {
            existente.cantidad += it.cantidad;
            existente.precioTotalItem = (existente.precioBase + existente.precioExtraUnitario) * existente.cantidad;
        } else {
            resultado.push(it);
        }
    }
    ticket.length = 0;
    ticket.push(...resultado);
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
        ingredientesExcluidos: t.excluidos,
        ingredientesAnadidos: t.anadidos,
        precioUnitario: t.precioBase,
        extras: t.extras.map(e => ({ extra: e.extra, cantidad: e.cantidad, gratis: e.gratis || false })),
        gratis: t.gratis || false
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

        // Si estamos en modo edición, cancelar el pedido original
        const editRaw = localStorage.getItem('bb_editar_pedido');
        if (editRaw) {
            const edit = JSON.parse(editRaw);
            await fetch(`/api/pedidos/${edit.pedidoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('bb_token')}` }
            });
            localStorage.removeItem('bb_editar_pedido');
            showPosToast(`✅ Pedido actualizado con éxito`);
            setTimeout(() => { window.location.href = '/admin.html'; }, 1200);
            return;
        }

        showPosToast(`✅ Pedido ${data.pedido._id.slice(-5).toUpperCase()} creado con éxito!`);

        // Reset ticket
        ticket = [];
        document.getElementById('cliente-nombre').value = '';
        document.getElementById('cliente-telefono').value = '';
        document.getElementById('check-forzar').checked = false;
        const mN = document.getElementById('m-cliente-nombre');
        const mT = document.getElementById('m-cliente-telefono');
        const mF = document.getElementById('m-check-forzar');
        if (mN) mN.value = '';
        if (mT) mT.value = '';
        if (mF) mF.checked = false;
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

// ══ Modo Edición ══════════════════════════════════════════════════════════════
function cargarModoEdicion(edit) {
    // Mostrar banner
    document.getElementById('banner-edicion').style.display = 'block';
    document.getElementById('banner-num').textContent = edit.numero;

    // Cambiar texto del botón
    const btn = document.getElementById('btn-cobrar');
    if (btn) { btn.textContent = 'ACTUALIZAR PEDIDO'; btn.style.background = '#e67e22'; }

    // Pre-rellenar nombre y teléfono (desktop + móvil)
    const inpNombre = document.getElementById('cliente-nombre');
    const inpTel    = document.getElementById('cliente-telefono');
    if (inpNombre) inpNombre.value = edit.nombreCliente || '';
    if (inpTel)    inpTel.value    = edit.telefonoCliente || '';
    const mN = document.getElementById('m-cliente-nombre');
    const mT = document.getElementById('m-cliente-telefono');
    if (mN) mN.value = edit.nombreCliente || '';
    if (mT) mT.value = edit.telefonoCliente || '';

    // Restaurar ticket desde las lineas guardadas
    ticket = [];
    for (const linea of (edit.lineas || [])) {
        const prodRef = linea.producto;
        const prodId = (prodRef && typeof prodRef === 'object')
            ? (prodRef._id?.toString() || String(prodRef._id))
            : (prodRef?.toString() || String(prodRef));
        const prod = productos.find(p => p._id === prodId || p._id.toString() === prodId);
        if (!prod) continue;

        const extrasLinea = (linea.extras || []).map(e => {
            const extBase = extras.find(ex => ex._id === (e.extra?.toString?.() || e.extra));
            return {
                extra:    e.extra?.toString?.() || e.extra,
                nombre:   e.nombre || extBase?.nombre || '',
                precio:   e.precio ?? extBase?.precio ?? 0,
                cantidad: e.cantidad
            };
        }).filter(e => e.cantidad > 0);

        const precioExtras = extrasLinea.reduce((s, e) => s + e.precio * e.cantidad, 0);

        ticket.push({
            _id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            producto:          prod,
            cantidad:          linea.cantidad,
            excluidos:         linea.ingredientesExcluidos || linea.excluidos || [],
            anadidos:          linea.ingredientesAnadidos  || linea.anadidos  || [],
            extras:            extrasLinea,
            precioBase:        linea.precioUnitario ?? prod.precio,
            precioExtraUnitario: precioExtras,
            precioTotalItem:   ((linea.precioUnitario ?? prod.precio) + precioExtras) * linea.cantidad
        });
    }
    renderTicket();

    // Pre-seleccionar bloque si existe en la lista de hoy
    if (edit.bloqueId) {
        const b = bloques.find(b => b._id === edit.bloqueId || b._id.toString() === edit.bloqueId);
        if (b) { bloqueSeleccionado = b._id; renderBloques(); }
    }
}

function cancelarEdicion() {
    localStorage.removeItem('bb_editar_pedido');
    window.location.href = '/admin.html';
}

// ══ Mobile — Pestañas ═════════════════════════════════════════════════════════
function isMobile() { return window.innerWidth <= 640; }

function initMobileTabs() {
    if (!isMobile()) return;
    switchTab('carta');
}

function switchTab(tab) {
    document.querySelector('.pos-main')?.classList.remove('mobile-active');
    document.querySelector('.pos-bloques-col')?.classList.remove('mobile-active');
    document.querySelector('.pos-sidebar')?.classList.remove('mobile-active');
    document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));

    if (tab === 'carta') {
        document.querySelector('.pos-main')?.classList.add('mobile-active');
        document.getElementById('tab-carta')?.classList.add('active');
    } else if (tab === 'horario') {
        document.querySelector('.pos-bloques-col')?.classList.add('mobile-active');
        document.getElementById('tab-horario')?.classList.add('active');
    } else if (tab === 'pedido') {
        document.querySelector('.pos-sidebar')?.classList.add('mobile-active');
        document.getElementById('tab-pedido')?.classList.add('active');
    }
}

function sincronizarTotalMovil(total, numItems) {
    const mTotal = document.getElementById('m-ticket-total');
    if (mTotal) mTotal.textContent = total.toFixed(2) + '€';

    const badge = document.getElementById('tab-items-count');
    if (!badge) return;
    if (numItems > 0) {
        badge.textContent = numItems;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function cobrarPedidoMobile() {
    const mN = document.getElementById('m-cliente-nombre');
    const mT = document.getElementById('m-cliente-telefono');
    const mF = document.getElementById('m-check-forzar');
    if (mN) document.getElementById('cliente-nombre').value = mN.value;
    if (mT) document.getElementById('cliente-telefono').value = mT.value;
    if (mF) document.getElementById('check-forzar').checked = mF.checked;
    cobrarPedido();
}

// Restaurar layout desktop si el usuario rota la pantalla
window.addEventListener('resize', () => {
    if (!isMobile()) {
        document.querySelector('.pos-main')?.classList.remove('mobile-active');
        document.querySelector('.pos-bloques-col')?.classList.remove('mobile-active');
        document.querySelector('.pos-sidebar')?.classList.remove('mobile-active');
    } else {
        const hayActiva = document.querySelector('.mobile-active');
        if (!hayActiva) switchTab('carta');
    }
});
