// ── admin-calendario.js — Gestión del calendario de días operativos ───────────

let diasTodos = [];   // todos los días devueltos por la API
let mesActual;        // offset 0-based desde el mes actual (0 = mes actual)

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function calcularMesReferencia(offset) {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
}

async function cargarDiasOperativos() {
    try {
        const res = await fetch(`${API}/api/bloques/dias-operativos?meses=2`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        diasTodos = data.dias;
        renderizarMes();
    } catch (err) {
        document.getElementById('grid-calendario').innerHTML =
            `<p style="color:red;padding:20px">Error cargando el calendario: ${err.message}</p>`;
    }
}

async function cargarDiasOperativosMeses(meses) {
    try {
        const res = await fetch(`${API}/api/bloques/dias-operativos?meses=${meses}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        diasTodos = data.dias;
        renderizarMes();
    } catch (err) {
        mostrarToast('Error actualizando el calendario', 'rojo');
    }
}

function renderizarMes() {
    const ref  = calcularMesReferencia(mesActual);
    const anio = ref.getFullYear();
    const mes  = ref.getMonth();

    document.getElementById('mes-label').textContent =
        `${MESES_ES[mes].toUpperCase()} ${anio}`;
    document.getElementById('btn-mes-ant').disabled = mesActual <= 0;

    const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}`;
    const diasMes = diasTodos.filter(d => d.fecha.startsWith(prefijo));
    const grid    = document.getElementById('grid-calendario');

    if (diasMes.length === 0) {
        grid.innerHTML = '<p style="color:#888;padding:20px">No hay días operativos este mes, o los bloques aún no se han generado.</p>';
        return;
    }

    grid.innerHTML = diasMes.map(dia => {
        const fechaObj    = new Date(dia.fecha + 'T00:00:00');
        const nombreDia   = DIAS_ES[fechaObj.getDay()];
        const fechaFormato = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const cerrado     = dia.diaCerrado;
        return `
        <div class="dia-card ${cerrado ? 'cerrado' : 'abierto'}">
            <div>
                <div class="dia-fecha">${fechaFormato.toUpperCase()}</div>
                <div class="dia-diaSemana">${nombreDia}</div>
            </div>
            <span class="dia-badge ${cerrado ? 'cerrado' : 'abierto'}">
                ${cerrado ? '🔴 Cerrado' : '🟢 Abierto'}
            </span>
            <div class="dia-info">
                ${dia.totalBloques} bloques · ${dia.bloquesCerrados} cerrados
            </div>
            <button
                class="btn-toggle ${cerrado ? 'abrir' : 'cerrar'}"
                onclick="${cerrado ? 'abrirDia' : 'cerrarDia'}('${dia.fecha}')">
                ${cerrado ? '✅ Reabrir día' : '🚫 Cerrar día'}
            </button>
        </div>`;
    }).join('');
}

function cambiarMes(delta) {
    mesActual = Math.max(0, mesActual + delta);
    const ref         = calcularMesReferencia(mesActual);
    const ultimaFecha = diasTodos.length > 0
        ? new Date(diasTodos[diasTodos.length - 1].fecha + 'T00:00:00')
        : new Date(0);
    const primerDiaMes = new Date(ref.getFullYear(), ref.getMonth(), 1);
    if (primerDiaMes >= ultimaFecha) {
        cargarDiasOperativosMeses(mesActual + 2);
    } else {
        renderizarMes();
    }
}

async function cerrarDia(fecha) {
    try {
        const res = await fetch(`${API}/api/bloques/cerrar-dia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ fecha })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Día ${fecha} cerrado`, 'verde');
        diasTodos = diasTodos.map(d => d.fecha === fecha
            ? { ...d, bloquesCerrados: d.totalBloques, diaCerrado: true }
            : d);
        renderizarMes();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}

async function abrirDia(fecha) {
    try {
        const res = await fetch(`${API}/api/bloques/abrir-dia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ fecha })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Día ${fecha} abierto`, 'verde');
        diasTodos = diasTodos.map(d => d.fecha === fecha
            ? { ...d, bloquesCerrados: 0, diaCerrado: false }
            : d);
        renderizarMes();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}
