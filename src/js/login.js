// Login: envia as credenciais para a API e direciona o usuário conforme o papel retornado.
function redirecionarPorRole(role) {
    if (role === 'ADMIN') window.location.href = '/admin.html';
    else if (role === 'MECANICA') window.location.href = '/mechanic.html';
    else window.location.href = '/index.html';
}

// Se já existir uma sessão, não exibe novamente a tela de login.
(async function verificarSessao() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            redirecionarPorRole(data.user.role);
        }
    } catch (error) {
        // Sem sessão: o formulário continua disponível.
    }
})();

const form = document.getElementById('loginForm');
const alertEl = document.getElementById('alert');
const btnLogin = document.getElementById('btnLogin');

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.message || 'Erro ao fazer login.');
            btnLogin.disabled = false;
            btnLogin.textContent = 'Entrar';
            return;
        }

        mostrarAlerta('Login realizado! Redirecionando...', 'success');
        setTimeout(() => redirecionarPorRole(data.user.role), 800);
    } catch (error) {
        mostrarAlerta('Erro de conexão. Tente novamente.');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});
