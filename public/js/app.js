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

    // UC-04: Restaurar carrito si venimos de "Rehacer pedido" (cliente.js → repetirPedidoViejo)
    const carritoGuardado = localStorage.getItem('bb_carrito');
    const params = new URLSearchParams(window.location.search);
    if (carritoGuardado && params.get('openCart') === 'true') {
        try {
            const lineas = JSON.parse(carritoGuardado);
            carrito = lineas.map((l, i) => ({
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
            localStorage.removeItem('bb_carrito');
            actualizarContadorCarrito();
            navegarA('carta');
            setTimeout(() => abrirCarrito(), 200);
        } catch (e) {
            console.error('Error restaurando carrito:', e);
            localStorage.removeItem('bb_carrito');
        }
    }
});
