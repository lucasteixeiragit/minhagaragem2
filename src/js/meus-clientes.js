// Meus clientes: gerencia convites, solicitações e vínculos da mecânica.
const alertEl = document.getElementById('alert');
let usuarioAtual = null;
let clientesMap = {};

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert alert-${tipo} show`;
    setTimeout(() => { alertEl.className = 'alert'; }, 4000);
}

function formatarData(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
}

// A API valida o papel e o vínculo; esta verificação apenas direciona a interface.
(async function iniciar() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        usuarioAtual = data.user;
        if (usuarioAtual.role !== 'MECANICA' && usuarioAtual.role !== 'ADMIN') {
            window.location.href = '/index.html';
            return;
        }
        await carregarVinculos();
    } catch (error) {
        window.location.href = '/login.html';
    }
})();

document.getElementById('btnLogout').addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// Localiza o cliente por e-mail e envia um convite ao endpoint protegido.
document.getElementById('formConvidar').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('emailCliente').value.trim();
    if (!email) {
        mostrarAlerta('Informe o e-mail do cliente.');
        return;
    }
    try {
        const resBusca = await fetch(`/api/user/buscar-por-email?email=${encodeURIComponent(email)}`);
        const dataBusca = await resBusca.json();
        if (!resBusca.ok) {
            mostrarAlerta(dataBusca.message || 'Cliente não encontrado.');
            return;
        }
        const cliente = dataBusca.usuario;
        const resVinculo = await fetch('/api/vinculos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: cliente.id, tipo: 'CONVITE' })
        });
        const dataVinculo = await resVinculo.json();
        if (resVinculo.ok) {
            mostrarAlerta(`Convite enviado para ${cliente.nome}!`, 'success');
            document.getElementById('formConvidar').reset();
            await carregarVinculos();
        } else {
            mostrarAlerta(dataVinculo.message || 'Erro ao enviar convite.');
        }
    } catch (error) {
        mostrarAlerta('Erro ao enviar convite.');
    }
});

// Mantém um cache local apenas para evitar requisições repetidas de nomes/e-mails.
async function buscarDadosCliente(usuarioId) {
    if (clientesMap[usuarioId]) return clientesMap[usuarioId];
    try {
        const res = await fetch(`/api/user/${usuarioId}`);
        if (!res.ok) return null;
        const data = await res.json();
        clientesMap[usuarioId] = data.usuario;
        return data.usuario;
    } catch (error) {
        return null;
    }
}

async function carregarVinculos() {
    try {
        const [resTodos, resAtivos] = await Promise.all([
            fetch('/api/vinculos'),
            fetch('/api/vinculos/meus-clientes')
        ]);
        const dataTodos = await resTodos.json();
        const dataAtivos = await resAtivos.json();
        const vinculos = dataTodos.vinculos || [];
        const solicitacoesRecebidas = vinculos.filter((v) => v.status === 'PENDENTE' && v.tipo === 'SOLICITACAO');
        const convitesEnviados = vinculos.filter((v) => v.status === 'PENDENTE' && v.tipo === 'CONVITE');
        await renderizarSolicitacoesRecebidas(solicitacoesRecebidas);
        await renderizarConvitesEnviados(convitesEnviados);
        renderizarClientesAtivos(dataAtivos.clientes || []);
    } catch (error) {
        mostrarAlerta('Erro ao carregar vínculos.');
    }
}

async function renderizarSolicitacoesRecebidas(lista) {
    const container = document.getElementById('listaSolicitacoesRecebidas');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo-vazio">Nenhuma solicitação pendente.</p>';
        return;
    }
    for (const vinculo of lista) {
        const cliente = await buscarDadosCliente(vinculo.usuarioId);
        const card = document.createElement('div');
        card.className = 'vinculo-card';
        card.innerHTML = `
            <div class="vinculo-info">
                <h3>${cliente ? cliente.nome : 'Cliente'}</h3>
                <p>${cliente ? cliente.email : ''} — solicitado em ${formatarData(vinculo.criadoEm)} <span class="status-badge ${vinculo.status}">${vinculo.status}</span></p>
            </div>
            <div class="vinculo-actions">
                <button class="btn-small success" onclick="aceitarVinculo('${vinculo._id}')">Aceitar</button>
                <button class="btn-small danger" onclick="recusarVinculo('${vinculo._id}')">Recusar</button>
            </div>`;
        container.appendChild(card);
    }
}

async function renderizarConvitesEnviados(lista) {
    const container = document.getElementById('listaConvitesEnviados');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo-vazio">Nenhum convite pendente.</p>';
        return;
    }
    for (const vinculo of lista) {
        const cliente = await buscarDadosCliente(vinculo.usuarioId);
        const card = document.createElement('div');
        card.className = 'vinculo-card';
        card.innerHTML = `
            <div class="vinculo-info">
                <h3>${cliente ? cliente.nome : 'Cliente'}</h3>
                <p>${cliente ? cliente.email : ''} — convidado em ${formatarData(vinculo.criadoEm)} <span class="status-badge ${vinculo.status}">${vinculo.status}</span></p>
            </div>
            <p style="color: oklch(0.6 0.01 280); font-size: 0.85rem;">Aguardando o cliente aceitar o convite.</p>`;
        container.appendChild(card);
    }
}

function renderizarClientesAtivos(lista) {
    const container = document.getElementById('listaClientesAtivos');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo-vazio">Você ainda não tem clientes vinculados.</p>';
        return;
    }
    lista.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'vinculo-card';
        const cliente = item.cliente || {};
        card.innerHTML = `
            <div class="vinculo-info">
                <h3>${cliente.nome || 'Cliente'}</h3>
                <p>${cliente.email || ''} — vinculado desde ${formatarData(item.criadoEm)} <span class="status-badge ${item.status}">${item.status}</span></p>
            </div>
            <div class="vinculo-actions">
                <button class="btn-small danger" onclick="desativarVinculo('${item.vinculoId}')">Desvincular</button>
            </div>`;
        container.appendChild(card);
    });
}

// Mantém as funções globais porque os cartões atuais usam onclick inline.
window.aceitarVinculo = async (vinculoId) => {
    if (!confirm('Deseja aceitar a solicitação deste cliente?')) return;
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/aceitar`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Solicitação aceita.', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao aceitar solicitação.');
    } catch (error) { mostrarAlerta('Erro ao aceitar solicitação.'); }
};

window.recusarVinculo = async (vinculoId) => {
    if (!confirm('Deseja recusar a solicitação deste cliente?')) return;
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/recusar`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Solicitação recusada.', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao recusar solicitação.');
    } catch (error) { mostrarAlerta('Erro ao recusar solicitação.'); }
};

window.desativarVinculo = async (vinculoId) => {
    if (!confirm('Deseja realmente desvincular este cliente?')) return;
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/desativar`, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Vínculo desativado.', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao desativar vínculo.');
    } catch (error) { mostrarAlerta('Erro ao desativar vínculo.'); }
};
