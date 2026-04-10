// ── app.js — Inicialización de la SPA ────────────────────────────────────────
// Este fichero ha sido dividido en módulos. Ver index.html para el orden de carga:
//   app-core.js      → estado global, sesión, navegación, modales, toast
//   app-carta.js     → carga de productos, extras y modal de producto
//   app-carrito.js   → gestión del carrito
//   app-checkout.js  → flujo de checkout en 3 pasos
//   app-auth.js      → login y registro de clientes
//   app.js           → este fichero: arranque tras cargar todos los módulos

document.addEventListener('DOMContentLoaded', async () => {
    verificarSesion();
    await cargarProductos();
    await cargarExtras();
    inyectarHeaders();

    const carritoGuardado = localStorage.getItem('bb_carrito');
    const params = new URLSearchParams(window.location.search);

    // UC-04: Restaurar carrito si venimos de "Rehacer pedido"
    if (carritoGuardado && params.get('openCart') === 'true') {
        try {
            const lineas = JSON.parse(carritoGuardado);
            carrito = _lineasACarrito(lineas);
            localStorage.removeItem('bb_carrito');
            actualizarContadorCarrito();
            navegarA('carta');
            setTimeout(() => abrirCarrito(), 200);
        } catch (e) {
            console.error('Error restaurando carrito:', e);
            localStorage.removeItem('bb_carrito');
        }
    }

    // UC-05: Modo edición — venimos de cliente.js → abrirModalModificar
    if (carritoGuardado && params.get('modo') === 'editar') {
        const editando = JSON.parse(localStorage.getItem('bb_editando') || 'null');
        if (editando) {
            try {
                const lineas = JSON.parse(carritoGuardado);
                carrito = _lineasACarrito(lineas);
                localStorage.removeItem('bb_carrito');
                actualizarContadorCarrito();
                navegarA('carta');
                _mostrarBannerEdicion(editando);
            } catch (e) {
                console.error('Error restaurando carrito en modo edición:', e);
                localStorage.removeItem('bb_carrito');
                localStorage.removeItem('bb_editando');
            }
        }
    }
});

/** Convierte líneas de pedido (formato BD) a ítems del carrito (formato frontend) */
function _lineasACarrito(lineas) {
    return lineas.map((l, i) => ({
        id:                    Date.now() + i,
        productId:             l.producto || l.productId,
        nombre:                l.nombre,
        categoria:             l.categoria || '',
        cantidad:              l.cantidad,
        precioBase:            l.precioUnitario || l.precio || 0,
        precioUnitario:        l.precioUnitario || l.precio || 0,
        precioMostrar:         l.precioUnitario || l.precio || 0,
        ingredientesExcluidos: l.ingredientesExcluidos || [],
        ingredientesAnadidos:  l.ingredientesAnadidos  || [],
        extras:                l.extras || [],
    }));
}

/** Muestra la barra fija que avisa de que se está editando un pedido */
function _mostrarBannerEdicion(editando) {
    const banner = document.createElement('div');
    banner.id = 'banner-edicion';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: #1a1a1a; color: #fff; padding: 10px 16px;
        display: flex; align-items: center; justify-content: space-between;
        font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem;
        font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    banner.innerHTML = `
        <span>EDITANDO PEDIDO <span style="color:#e63c2f;">${editando.numero}</span>
            &nbsp;—&nbsp; modifica el carrito y pulsa GUARDAR CAMBIOS</span>
        <button onclick="_cancelarEdicion()" style="
            background: transparent; border: 1px solid #555; color: #aaa;
            padding: 4px 12px; border-radius: 6px; cursor: pointer;
            font-family: inherit; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px;">
            CANCELAR
        </button>
    `;
    document.body.prepend(banner);
    // Margen fijo para que el banner no tape el contenido (altura conocida del banner)
    document.body.style.marginTop = '44px';
}

/** Cancela el modo edición y vuelve al historial del cliente */
function _cancelarEdicion() {
    localStorage.removeItem('bb_editando');
    window.location.href = 'cliente.html';
}
