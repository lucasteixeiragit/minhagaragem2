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
        // O elemento pode não existir no HTML (link comentado em profile.html).
        // SEM A GUARDA: getElementById devolve null, o acesso a .textContent
        // lança TypeError, o catch abaixo manda para /login.html e o login,
        // vendo a sessão válida, redireciona para /index.html — o sintoma
        // "Perfil volta para a página inicial".
        const linkVinculos = document.getElementById('linkVinculos');
        if (linkVinculos) {
            if (usuario.role === 'USER') {
                linkVinculos.textContent = 'Minhas Mecânicas';
                linkVinculos.href = 'minhas-mecanicas.html';
                linkVinculos.style.display = '';
            } else if (usuario.role === 'MECANICA') {
                linkVinculos.textContent = 'Meus Clientes';
                linkVinculos.href = 'meus-clientes.html';
                linkVinculos.style.display = '';
            }
        }
    } catch (error) {
        window.location.href = '/login.html';
    }
})();

// ============================================================
// SEÇÃO: Meu Plano
// PROPÓSITO: mostra plano, vencimento, teste e histórico de
// pagamentos no perfil.
// FONTE: GET /api/pagamento/status, a mesma rota usada por
// src/assinatura.html e por js/plano.js (gate de recursos pagos).
// ============================================================
function formatarMoeda(centavos) {
    if (centavos === null || centavos === undefined) return '-';
    return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Traduz o status gravado em Assinatura para o rótulo e a cor da tabela.
function rotuloStatus(status) {
    const chave = String(status || '').toLowerCase();
    if (['pago', 'paid', 'approved', 'aprovado', 'settled'].includes(chave)) {
        return { texto: 'Pago', classe: 'plano__status--pago' };
    }
    if (['pendente', 'pending', 'aguardando'].includes(chave)) {
        return { texto: 'Pendente', classe: 'plano__status--pendente' };
    }
    return { texto: status || '-', classe: 'plano__status--outro' };
}

function renderizarHistorico(historico) {
    const alvo = document.getElementById('planoHistorico');
    if (!alvo) return;

    if (!historico || historico.length === 0) {
        alvo.innerHTML = '<p class="plano__vazio">Nenhum pagamento registrado ainda.</p>';
        return;
    }

    const linhas = historico.map(item => {
        const rotulo = rotuloStatus(item.status);
        return `<tr>
            <td>${formatarData(item.criadoEm)}</td>
            <td>${formatarMoeda(item.valorCentavos)}</td>
            <td><span class="plano__status ${rotulo.classe}">${rotulo.texto}</span></td>
            <td>${item.pagoEm ? formatarData(item.pagoEm) : '-'}</td>
        </tr>`;
    }).join('');

    alvo.innerHTML = `<table class="plano__tabela">
        <thead>
            <tr><th>Data</th><th>Valor</th><th>Status</th><th>Pago em</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
    </table>`;
}

(async function carregarPlano() {
    try {
        const res = await fetch('/api/pagamento/status');
        if (!res.ok) return;

        const dados = await res.json();
        const ehPro = dados.plano === 'PRO';

        const selo = document.getElementById('planoSelo');
        selo.textContent = ehPro ? 'PRO' : 'FREE';
        selo.className = ehPro ? 'plano__selo' : 'plano__selo plano__selo--free';

        document.getElementById('planoSituacao').textContent = ehPro
            ? 'Assinatura ativa'
            : 'Sem assinatura ativa';

        document.getElementById('planoVencimento').textContent = ehPro && dados.planoExpiraEm
            ? `Vence em ${formatarData(dados.planoExpiraEm)}`
            : 'Assine para liberar todos os recursos';

        document.getElementById('planoNome').textContent = ehPro ? 'Pro' : 'Gratuito';
        document.getElementById('planoVenceEm').textContent = dados.planoExpiraEm
            ? formatarData(dados.planoExpiraEm)
            : '-';
        document.getElementById('planoTrial').textContent = dados.trialUsado
            ? 'Já utilizado'
            : `Disponível (${dados.diasTrial} dias)`;
        document.getElementById('planoPreco').textContent =
            `${formatarMoeda(dados.precoCentavos)} / ${dados.diasAssinatura} dias`;

        // O rótulo do botão muda conforme o estado, mas o destino é sempre a
        // tela de assinatura, que decide entre trial, checkout e "já ativo".
        const acao = document.getElementById('planoAcao');
        acao.textContent = ehPro ? 'Renovar assinatura' : 'Assinar o Pro';
        acao.href = './assinatura.html';

        renderizarHistorico(dados.historico);
    } catch (error) {
        const alvo = document.getElementById('planoHistorico');
        if (alvo) alvo.innerHTML = '<p class="plano__vazio">Não foi possível carregar o plano.</p>';
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
