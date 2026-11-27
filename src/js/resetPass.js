// 1 - Lê o token da URL (o "ingrediente secreto" que o link do e-mail trouxe)
// 2 - Se não houver token, bloqueia a tela (não adianta tentar redefinir sem ele)
// 3 - No submit, valida a nova senha (tamanho + confirmação)
// 4 - Envia { token, novaSenha } para a API e trata a resposta

// quando a página carrega, o JS procura no HTML os elementos pelos seus id e guarda as referências em constantes.
const form = document.getElementById('resetPassForm');
const alertEl = document.getElementById('alert');
const btnResetPass = document.getElementById('btnResetPass');

// função recebe uma mensagem e um tipo (error ou success), coloca o texto no div de alerta e troca as classes CSS.
function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
}

// window.location é o objeto que representa a URL atual da página. A propriedade .search devolve só a query string (o pedaço depois do ?)
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// Valida token do link
if (!token) {
    mostrarAlerta('Link inválido. Solicite um novo link de recuperação.');
    form.style.display = 'none';
} else {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        btnResetPass.disabled = true;
        btnResetPass.textContent = 'Redefinindo...';

        const novaSenha = document.getElementById('novaSenha').value;
        const confirmar = document.getElementById('confirmarNovaSenha').value;

        // verifica tamanho da senha
        if (novaSenha.length < 8) {
            mostrarAlerta('A nova senha deve ter no mínimo 8 caracteres.');
            btnResetPass.disabled = false;
            btnResetPass.textContent = 'Redefinir senha';
            return;
        }

        // verifica se as senhas sao iguais
        if (novaSenha !== confirmar) {
            mostrarAlerta('As senhas não coincidem.');
            btnResetPass.disabled = false;
            btnResetPass.textContent = 'Redefinir senha';
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ token, novaSenha })
            });
            
            const data = await res.json();

            if (!res.ok) {
                mostrarAlerta(data.message || 'Erro ao redefinir senha.');
                btnResetPass.disabled = false;
                btnResetPass.textContent = 'Redefinir senha';
                return;
            }

            mostrarAlerta('Senha redefinida com sucesso! Redirecionando...', 'success');
            setTimeout(() => { window.location.href = '/login.html'; }, 2000);
        } catch (error) {
            mostrarAlerta('Erro de conexão. Tente novamente.');
            btnResetPass.disabled = false;
            btnResetPass.textContent = 'Redefinir senha';
        }
    });
}
