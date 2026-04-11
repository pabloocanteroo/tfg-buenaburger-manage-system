// ── admin-empleados.js — Gestión de empleados ─────────────────────────────────

async function cargarEmpleados() {
    const cont = document.getElementById('lista-empleados');
    cont.innerHTML = '<div class="loading-calendario">Cargando...</div>';
    try {
        const res = await fetch(`${API}/api/admin/empleados`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        if (!data.empleados.length) {
            cont.innerHTML = '<p style="color:#888;padding:16px">No hay empleados activos.</p>';
            return;
        }
        cont.innerHTML = data.empleados.map(e => `
            <div class="empleado-card">
                <div class="empleado-info">
                    <span class="empleado-nombre">👤 ${escHTML(e.nombre)}</span>
                    <span class="empleado-email">${escHTML(e.email)}</span>
                </div>
                <button class="btn-baja" onclick="darDeBaja('${escAttr(e._id)}', '${escAttr(e.nombre)}')">Dar de baja</button>
            </div>
        `).join('');
    } catch (err) {
        cont.innerHTML = `<p style="color:red;padding:16px">Error: ${escHTML(err.message)}</p>`;
    }
}

async function crearEmpleado() {
    const nombre   = document.getElementById('emp-nuevo-nombre').value.trim();
    const email    = document.getElementById('emp-nuevo-email').value.trim();
    const password = document.getElementById('emp-nuevo-pass').value;
    const errEl    = document.getElementById('emp-form-error');
    errEl.style.display = 'none';

    if (!nombre || !email || !password) {
        errEl.textContent = 'Todos los campos son obligatorios.';
        errEl.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API}/api/admin/empleados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ Empleado ${nombre} creado`, 'verde');
        document.getElementById('emp-nuevo-nombre').value = '';
        document.getElementById('emp-nuevo-email').value  = '';
        document.getElementById('emp-nuevo-pass').value   = '';
        cargarEmpleados();
    } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        errEl.style.display = 'block';
    }
}

async function darDeBaja(id, nombre) {
    if (!confirm(`¿Dar de baja a ${nombre}? Perderá el acceso al sistema.`)) return;
    try {
        const res = await fetch(`${API}/api/admin/empleados/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.mensaje);
        mostrarToast(`✅ ${nombre} dado de baja`, 'verde');
        cargarEmpleados();
    } catch (err) { mostrarToast(`Error: ${err.message}`, 'rojo'); }
}
