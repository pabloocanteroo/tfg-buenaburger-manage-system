// ── Utilidades compartidas ────────────────────────────────────────────────────

/**
 * Convierte un objeto Date a string YYYY-MM-DD usando la hora local.
 * Centraliza el patrón que antes estaba duplicado en 3 controllers.
 */
const fechaToString = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Ordena un array de productos por categoría según el orden del menú.
 * Centraliza el patrón que antes estaba duplicado en producto.controller y admin.controller.
 */
const ORDEN_CATEGORIAS = { HAMBURGUESA: 1, PATATAS: 2, POSTRE: 3, BEBIDA: 4 };

const ordenarPorCategoria = (productos) =>
    productos.sort(
        (a, b) => (ORDEN_CATEGORIAS[a.categoria] || 99) - (ORDEN_CATEGORIAS[b.categoria] || 99)
    );

module.exports = { fechaToString, ordenarPorCategoria };
