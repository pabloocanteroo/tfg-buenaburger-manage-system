// ── admin-estadisticas.js — Panel de estadísticas ────────────────────────────

async function cargarEstadisticas() {
    const inputFecha = document.getElementById('stat-fecha');
    if (!inputFecha.value) {
        const hoy = new Date();
        inputFecha.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    }
    const fecha = inputFecha.value;

    try {
        const res = await fetch(`${API}/api/admin/estadisticas?fecha=${fecha}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);

        const { hoy, global: g, topProductos, ultimosDias } = data;

        // ── Título dinámico del día ───────────────────────────────────────────
        const hoyReal = new Date();
        const hoyStr  = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
        const fechaLabel = fecha === hoyStr
            ? 'HOY'
            : new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
        document.getElementById('stat-titulo-dia').textContent = fechaLabel;

        // ── Día ───────────────────────────────────────────────────────────────
        document.getElementById('stat-hoy-pedidos').textContent      = hoy.pedidos;
        document.getElementById('stat-hoy-ingresos').textContent     = `${hoy.ingresos.toFixed(2)} €`;
        document.getElementById('stat-hoy-hamburguesas').textContent = hoy.hamburguesas;
        document.getElementById('stat-hoy-canal').textContent        = hoy.canal;

        // ── Global ────────────────────────────────────────────────────────────
        document.getElementById('stat-total-pedidos').textContent  = g.totalPedidos;
        document.getElementById('stat-total-ingresos').textContent = `${g.ingresosTotales.toFixed(2)} €`;
        document.getElementById('stat-media-pedido').textContent   = `${g.mediaPedido.toFixed(2)} €`;

        // ── Canales ───────────────────────────────────────────────────────────
        const canalesIconos = { TELEFONO: '📞', WEB: '🌐', WHATSAPP: '💬' };
        const totalCanal = Object.values(g.porCanal).reduce((s, v) => s + v, 0) || 1;
        document.getElementById('stat-canales').innerHTML = Object.entries(g.porCanal)
            .sort((a, b) => b[1] - a[1])
            .map(([canal, count]) => {
                const pct = Math.round((count / totalCanal) * 100);
                return `<div class="canal-row">
                    <span class="canal-nombre">${canalesIconos[canal] || '—'} ${canal}</span>
                    <div class="canal-barra-wrap">
                        <div class="canal-barra" style="width:${pct}%"></div>
                    </div>
                    <span class="canal-count">${count} (${pct}%)</span>
                </div>`;
            }).join('') || '<p style="color:#888;font-size:.85rem">Sin datos</p>';

        // ── Top productos ─────────────────────────────────────────────────────
        const maxUnidades = topProductos[0]?.unidades || 1;
        document.getElementById('stat-top-productos').innerHTML = topProductos.length
            ? topProductos.map((p, i) => {
                const pct = Math.round((p.unidades / maxUnidades) * 100);
                return `<div class="top-prod-row">
                    <span class="top-prod-pos">${i + 1}</span>
                    <span class="top-prod-nombre">${p.nombre}</span>
                    <div class="canal-barra-wrap">
                        <div class="canal-barra" style="width:${pct}%;background:#e74c3c"></div>
                    </div>
                    <span class="canal-count">${p.unidades} ud.</span>
                </div>`;
            }).join('')
            : '<p style="color:#888;font-size:.85rem">Sin datos</p>';

        // ── Últimos días ──────────────────────────────────────────────────────
        document.getElementById('stat-tabla-body').innerHTML = ultimosDias.length
            ? ultimosDias.map(d => {
                const fechaFormato = new Date(d._id + 'T12:00:00')
                    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                return `<tr>
                    <td>${fechaFormato}</td>
                    <td style="text-align:center">${d.pedidos}</td>
                    <td style="text-align:right;font-weight:700">${d.ingresos.toFixed(2)} €</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="3" style="color:#888;text-align:center;padding:16px">Sin actividad reciente</td></tr>';

    } catch (err) {
        console.error('Error cargando estadísticas:', err);
    }
}
