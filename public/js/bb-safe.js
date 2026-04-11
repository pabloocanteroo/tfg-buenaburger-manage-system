// bb-safe.js — helpers de escapado para HTML. Se carga el PRIMERO en cada página
// antes que el resto de scripts para que `escHTML` y `escAttr` estén disponibles
// como globales (window.escHTML / window.escAttr).
//
// Motivación: el frontend construye HTML con template strings y lo inserta con
// innerHTML. Sin escapar, cualquier dato que venga del usuario (nombre del
// cliente, nombre de producto, número de pedido, etc.) puede cerrar el atributo
// o el tag y meter `<script>` o un onerror=. Además, caracteres como ' rompen
// los handlers inline `onclick="foo('${x}')"`.
//
// Uso:
//   `<div>${escHTML(producto.nombre)}</div>`                   // texto dentro de un tag
//   `<button onclick="foo('${escAttr(id)}')">...`              // valor dentro de un atributo " "
//
// Nota: `escAttr` es más estricto que `escHTML` porque dentro de un atributo
// entre comillas dobles hay que evitar también la comilla simple (que rompe
// el parámetro JS inline) y backslash.

(function () {
    const MAP_HTML = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    };

    function escHTML(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[&<>"'`]/g, c => MAP_HTML[c]);
    }

    // Para valores que se meten dentro de un atributo HTML (p.ej. onclick="...")
    // y que se van a usar como string JS: hay que neutralizar también \ y saltos.
    function escAttr(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/[&<>"'`]/g, c => MAP_HTML[c])
            .replace(/\r?\n/g, ' ');
    }

    window.escHTML = escHTML;
    window.escAttr = escAttr;
})();
