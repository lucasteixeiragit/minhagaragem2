// Cadastro: valida os campos para feedback imediato e delega a criação da conta à API.
const form = document.getElementById('registerForm');
const alertEl = document.getElementById('alert');
const btnRegister = document.getElementById('btnRegister');

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert alert-${tipo} show`;
}

function restaurarBotao() {
    btnRegister.disabled = false;
    btnRegister.textContent = 'Criar conta';
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    btnRegister.disabled = true;
    btnRegister.textContent = 'Criando conta...';

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    // Estas validações melhoram a experiência, mas o backend continua sendo a autoridade.
    if (nome.length < 2) {
        mostrarAlerta('Informe um nome válido (mínimo 2 caracteres).');
        restaurarBotao();
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarAlerta('Informe um e-mail válido.');
        restaurarBotao();
        return;
    }
    if (senha.length < 8) {
        mostrarAlerta('A senha deve ter no mínimo 8 caracteres.');
        restaurarBotao();
        return;
    }
    if (senha !== confirmarSenha) {
        mostrarAlerta('As senhas não coincidem.');
        restaurarBotao();
        return;
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.message || 'Erro ao criar conta.');
            restaurarBotao();
            return;
        }

        mostrarAlerta('Conta criada! Redirecionando para login...', 'success');
        setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    } catch (error) {
        mostrarAlerta('Erro de conexão. Tente novamente.');
        restaurarBotao();
    }
});
