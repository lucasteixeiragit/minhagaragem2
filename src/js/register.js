// Cadastro: valida os campos para feedback imediato e delega a criação da conta à API.
// Após o cadastro, a conta fica inativa até a confirmação do código enviado por email.
const form = document.getElementById('registerForm');
const confirmForm = document.getElementById('confirmForm');
const confirmInfo = document.getElementById('confirmInfo');
const alertEl = document.getElementById('alert');
const btnRegister = document.getElementById('btnRegister');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnReenviar = document.getElementById('btnReenviar');
const btnVoltarCadastro = document.getElementById('btnVoltarCadastro');
const inputCodigo = document.getElementById('codigo');

// Email pendente de confirmação, usado no envio do código.
let emailPendente = '';

// Exibe a mensagem de erro ou sucesso na caixa de alerta da página.
function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
}

// Limpa a caixa de alerta entre uma tentativa e outra.
function limparAlerta() {
    alertEl.textContent = '';
    alertEl.className = 'alert__box alert__error';
}

// Devolve o botão de cadastro ao estado normal após uma falha.
function restaurarBotao() {
    btnRegister.disabled = false;
    btnRegister.textContent = 'Criar conta';
}

// Devolve o botão de confirmação ao estado normal após uma falha.
function restaurarBotaoConfirmar() {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar cadastro';
}

// Devolve o botão de reenvio ao estado normal após uma falha.
function restaurarBotaoReenviar() {
    btnReenviar.disabled = false;
    btnReenviar.textContent = 'Reenviar código';
}

// Troca o formulário de cadastro pelo de confirmação e guarda o e-mail pendente.
function mostrarConfirmacao(email) {
    emailPendente = email;
    confirmInfo.textContent = `Enviamos um código de 6 dígitos para ${email}. Ele expira em 15 minutos.`;
    form.style.display = 'none';
    confirmForm.style.display = '';
    inputCodigo.value = '';
    inputCodigo.focus();
}

// Volta ao formulário de cadastro, útil quando o e-mail foi digitado errado.
function voltarParaCadastro() {
    confirmForm.style.display = 'none';
    form.style.display = '';
    limparAlerta();
    restaurarBotao();
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    limparAlerta();
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

        mostrarAlerta(data.message || 'Conta criada! Confirme o código enviado para o seu e-mail.', 'success');
        restaurarBotao();
        mostrarConfirmacao(email);
        iniciarCooldown();
    } catch (error) {
        mostrarAlerta('Erro de conexão. Tente novamente.');
        restaurarBotao();
    }
});

// Envia o código digitado para a API e, no sucesso, leva o usuário ao login.
confirmForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    limparAlerta();

    const codigo = inputCodigo.value.trim();

    if (!/^\d{6}$/.test(codigo)) {
        mostrarAlerta('Digite os 6 dígitos do código.');
        return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Confirmando...';

    try {
        const res = await fetch('/api/auth/confirmar-cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailPendente, codigo })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.message || 'Código inválido ou expirado.');
            restaurarBotaoConfirmar();
            return;
        }

        mostrarAlerta('Cadastro confirmado! Redirecionando para login...', 'success');
        setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    } catch (error) {
        mostrarAlerta('Erro de conexão. Tente novamente.');
        restaurarBotaoConfirmar();
    }
});

// Cooldown de 60s no reenvio, para evitar rajadas de e-mail e de requisições.
const COOLDOWN_SEGUNDOS = 60;
let cooldownTimer = null;

function iniciarCooldown() {
    let restante = COOLDOWN_SEGUNDOS;
    btnReenviar.disabled = true;
    btnReenviar.textContent = `Reenviar em ${restante}s`;

    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        restante -= 1;
        if (restante <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            btnReenviar.disabled = false;
            btnReenviar.textContent = 'Reenviar código';
            return;
        }
        btnReenviar.textContent = `Reenviar em ${restante}s`;
    }, 1000);
}

btnReenviar.addEventListener('click', async () => {
    if (btnReenviar.disabled) return;

    limparAlerta();
    btnReenviar.disabled = true;
    btnReenviar.textContent = 'Reenviando...';

    try {
        const res = await fetch('/api/auth/reenviar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailPendente })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(data.message || 'Erro ao reenviar código.');
            restaurarBotaoReenviar();
            return;
        }

        mostrarAlerta(data.message || 'Novo código enviado.', 'success');
        inputCodigo.value = '';
        inputCodigo.focus();
        iniciarCooldown();
    } catch (error) {
        mostrarAlerta('Erro de conexão. Tente novamente.');
        restaurarBotaoReenviar();
    }
});

btnVoltarCadastro.addEventListener('click', voltarParaCadastro);
