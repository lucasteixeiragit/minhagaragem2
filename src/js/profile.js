// Perfil: carrega os dados do usuário e envia alterações para a API.
const alertEl = document.getElementById('alert');

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
    setTimeout(() => { alertEl.className = 'alert__box'; }, 4000);
}

function formatarData(iso) {
    if (!iso) return '-';
    const data = new Date(iso);
    return data.toLocaleDateString('pt-BR');
}

// A sessão e o papel do usuário são sempre confirmados pelo backend.
(async function carregarPerfil() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        const usuario = data.user;

        document.getElementById('nomeUsuario').textContent = usuario.nome;
        document.getElementById('emailUsuario').textContent = usuario.email;
        document.getElementById('roleUsuario').textContent = usuario.role;
        document.getElementById('roleUsuario').className = `role__badge ${usuario.role}`;
        document.getElementById('criadoEm').textContent = formatarData(usuario.createdAt);
        document.getElementById('novoNome').value = usuario.nome;

        // O menu de vínculos varia apenas na apresentação; a autorização fica na API.
        const linkVinculos = document.getElementById('linkVinculos');
        if (usuario.role === 'USER') {
            linkVinculos.textContent = 'Minhas Mecânicas';
            linkVinculos.href = 'minhas-mecanicas.html';
            linkVinculos.style.display = '';
        } else if (usuario.role === 'MECANICA') {
            linkVinculos.textContent = 'Meus Clientes';
            linkVinculos.href = 'meus-clientes.html';
            linkVinculos.style.display = '';
        }
    } catch (error) {
        window.location.href = '/login.html';
    }
})();

// Encerra a sessão no servidor antes de voltar para a tela de login.
document.getElementById('btnLogout').addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

document.getElementById('formNome').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = document.getElementById('novoNome').value.trim();
    if (nome.length < 2) {
        mostrarAlerta('Informe um nome válido.');
        return;
    }

    const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome })
    });
    const data = await res.json();
    if (res.ok) {
        mostrarAlerta('Nome atualizado!', 'success');
        document.getElementById('nomeUsuario').textContent = nome;
    } else {
        mostrarAlerta(data.message || 'Erro ao atualizar nome.');
    }
});

document.getElementById('formSenha').addEventListener('submit', async (event) => {
    event.preventDefault();
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmar = document.getElementById('confirmarNovaSenha').value;

    if (novaSenha.length < 8) {
        mostrarAlerta('A nova senha deve ter no mínimo 8 caracteres.');
        return;
    }
    if (novaSenha !== confirmar) {
        mostrarAlerta('As senhas não coincidem.');
        return;
    }

    const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha })
    });
    const data = await res.json();
    if (res.ok) {
        mostrarAlerta('Senha alterada com sucesso!', 'success');
        document.getElementById('formSenha').reset();
    } else {
        mostrarAlerta(data.message || 'Erro ao alterar senha.');
    }
});
