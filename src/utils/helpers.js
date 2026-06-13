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

/**
 * Orden manual de las hamburguesas en la carta (no alfabético).
 * El resto de categorías conserva el orden por nombre que llega del .sort('nombre').
 */
const ORDEN_HAMBURGUESAS = {
    'Buena Burger': 1,
    'Bacon Burger': 2,
    'Butter Burger': 3,
    'Bestia Burger': 4,
};

const ordenarPorCategoria = (productos) =>
    productos.sort((a, b) => {
        const difCategoria = (ORDEN_CATEGORIAS[a.categoria] || 99) - (ORDEN_CATEGORIAS[b.categoria] || 99);
        if (difCategoria !== 0) return difCategoria;
        if (a.categoria === 'HAMBURGUESA') {
            return (ORDEN_HAMBURGUESAS[a.nombre] || 99) - (ORDEN_HAMBURGUESAS[b.nombre] || 99);
        }
        return 0; // mantiene el orden alfabético previo dentro de la categoría
    });

module.exports = { fechaToString, ordenarPorCategoria };
