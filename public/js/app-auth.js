// ── app-auth.js — Login, registro y modal de autenticación ───────────────────

function abrirAuth(e) {
    if (e) e.preventDefault();
    renderAuthLogin();
    abrirModal('modal-auth');
}

function renderAuthLogin() {
    document.getElementById('auth-content').innerHTML = `
        <div class="auth-tabs">
            <div class="auth-tab active" onclick="renderAuthLogin()">ENTRAR</div>
            <div class="auth-tab" onclick="renderAuthRegistro()">REGISTRARSE</div>
        </div>
        <h2 class="modal-title">Iniciar sesión</h2>
        <div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="tu@email.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="auth-pass" placeholder="••••••"></div>
        <button class="btn-siguiente" onclick="loginCliente()">ENTRAR</button>
        <p style="text-align:center;margin-top:11px;color:#888;font-size:0.88rem">¿No tienes cuenta? <a href="#" onclick="renderAuthRegistro()" style="color:var(--rojo);font-weight:700;">Regístrate gratis</a></p>
    `;
}

function renderAuthRegistro() {
    document.getElementById('auth-content').innerHTML = `
        <div class="auth-tabs">
            <div class="auth-tab" onclick="renderAuthLogin()">ENTRAR</div>
            <div class="auth-tab active" onclick="renderAuthRegistro()">REGISTRARSE</div>
        </div>
        <h2 class="modal-title">Crear cuenta</h2>
        <div class="form-group"><label>Nombre</label><input type="text" id="reg-nombre" placeholder="Tu nombre"></div>
        <div class="form-group"><label>Teléfono</label><input type="tel" id="reg-tel" placeholder="612 345 678"></div>
        <div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="tu@email.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="reg-pass" placeholder="Mínimo 6 caracteres"></div>
        <button class="btn-siguiente" onclick="registroCliente()">CREAR CUENTA</button>
    `;
}

async function loginCliente() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    try {
        let data;
        try {
            data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        } catch {
            data = await apiFetch('/auth/login-staff', { method: 'POST', body: JSON.stringify({ email, password }) });
        }
        tokenActual = data.token;
        localStorage.setItem('bb_token', tokenActual);

        if (data.usuario) {
            localStorage.setItem('bb_rol',    data.usuario.rol);
            localStorage.setItem('bb_nombre', data.usuario.nombre);
        } else {
            localStorage.setItem('bb_rol',    'CLIENTE');
            localStorage.setItem('bb_nombre', data.cliente.nombre);
        }

        verificarSesion();
        cerrarModal('modal-auth');
        const nombre = data.cliente?.nombre || data.usuario?.nombre || 'Usuario';
        const rol    = data.usuario?.rol || 'CLIENTE';

        if (rol === 'ADMIN')    { window.location.href = '/admin.html';     return; }
        if (rol === 'EMPLEADO') { window.location.href = '/empleados.html'; return; }

        mostrarToast(`✅ ¡Bienvenido, ${nombre}!`, 'success');
    } catch { mostrarToast('Credenciales incorrectas', 'error'); }
}

async function registroCliente() {
    const nombre   = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-tel').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    try {
        const data = await apiFetch('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, telefono, email, password }) });
        tokenActual = data.token;
        localStorage.setItem('bb_token',  tokenActual);
        localStorage.setItem('bb_rol',    'CLIENTE');
        localStorage.setItem('bb_nombre', data.cliente.nombre);

        verificarSesion();
        cerrarModal('modal-auth');
        window.location.href = '/cliente.html';
    } catch (e) { mostrarToast(e.message, 'error'); }
}
