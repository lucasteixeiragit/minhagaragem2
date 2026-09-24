// Minhas mecânicas: gerencia solicitações, convites e vínculos do cliente.
const alertEl = document.getElementById('alert');
let usuarioAtual = null;
let mecanicasMap = {};

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
    setTimeout(() => { alertEl.className = 'alert__box'; }, 4000);
}

function formatarData(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
}

// A API é a autoridade de autenticação/autorização; esta checagem só direciona a interface.
(async function iniciar() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        usuarioAtual = data.user;
        if (usuarioAtual.role !== 'USER') {
            window.location.href = '/index.html';
            return;
        }
        await carregarMecanicasPublicas();
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

// Preenche o seletor com mecânicas públicas retornadas pelo backend.
async function carregarMecanicasPublicas() {
    try {
        const res = await fetch('/api/mechanics/public');
        const data = await res.json();
        const select = document.getElementById('selectMecanica');
        select.innerHTML = '';
        if (!res.ok || !data.mecanicas || data.mecanicas.length === 0) {
            select.innerHTML = '<option value="">Nenhuma mecânica disponível</option>';
            mecanicasMap = {};
            return;
        }
        mecanicasMap = {};
        data.mecanicas.forEach((mecanica) => { mecanicasMap[mecanica.id] = mecanica; });
        select.innerHTML = '<option value="">Selecione uma mecânica...</option>' +
            data.mecanicas.map((mecanica) => `<option value="${mecanica.id}">${mecanica.nome} (${mecanica.email})</option>`).join('');
    } catch (error) {
        mostrarAlerta('Erro ao carregar mecânicas disponíveis.');
    }
}

document.getElementById('formSolicitar').addEventListener('submit', async (event) => {
    event.preventDefault();
    const mecanicaId = document.getElementById('selectMecanica').value;
    if (!mecanicaId) {
        mostrarAlerta('Selecione uma mecânica.');
        return;
    }
    try {
        const res = await fetch('/api/vinculos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mecanicaId, tipo: 'SOLICITACAO' })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('Solicitação enviada com sucesso!', 'success');
            document.getElementById('formSolicitar').reset();
            await carregarVinculos();
        } else {
            mostrarAlerta(data.message || 'Erro ao enviar solicitação.');
        }
    } catch (error) {
        mostrarAlerta('Erro ao enviar solicitação.');
    }
});

// Separa vínculos pendentes e ativos para cada seção da página.
async function carregarVinculos() {
    try {
        const [resTodos, resAtivos] = await Promise.all([
            fetch('/api/vinculos'),
            fetch('/api/vinculos/minhas-mecanicas')
        ]);
        const dataTodos = await resTodos.json();
        const dataAtivos = await resAtivos.json();
        const vinculos = dataTodos.vinculos || [];
        renderizarConvitesRecebidos(vinculos.filter((v) => v.status === 'PENDENTE' && v.tipo === 'CONVITE'));
        renderizarSolicitacoesEnviadas(vinculos.filter((v) => v.status === 'PENDENTE' && v.tipo === 'SOLICITACAO'));
        renderizarMecanicasAtivas(dataAtivos.mecanicas || []);
    } catch (error) {
        mostrarAlerta('Erro ao carregar vínculos.');
    }
}

function nomeMecanica(mecanicaId) {
    const mecanica = mecanicasMap[mecanicaId];
    return mecanica ? `${mecanica.nome} (${mecanica.email})` : 'Mecânica';
}

function renderizarConvitesRecebidos(lista) {
    const container = document.getElementById('listaConvitesRecebidos');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo__vazio">Nenhum convite pendente.</p>';
        return;
    }
    lista.forEach((vinculo) => {
        const card = document.createElement('div');
        card.className = 'vinculo__card';
        card.innerHTML = `
            <div class="vinculo__info">
                <h3>${nomeMecanica(vinculo.mecanicaId)}</h3>
                <p>Convite recebido em ${formatarData(vinculo.criadoEm)} <span class="status__badge ${vinculo.status}">${vinculo.status}</span></p>
            </div>
            <div class="vinculo__actions">
                <button class="btn__small btn__small--success" onclick="aceitarVinculo('${vinculo._id}')">Aceitar</button>
                <button class="btn__small btn__small--danger" onclick="recusarVinculo('${vinculo._id}')">Recusar</button>
            </div>`;
        container.appendChild(card);
    });
}

function renderizarSolicitacoesEnviadas(lista) {
    const container = document.getElementById('listaSolicitacoesEnviadas');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo__vazio">Nenhuma solicitação pendente.</p>';
        return;
    }
    lista.forEach((vinculo) => {
        const card = document.createElement('div');
        card.className = 'vinculo__card';
        card.innerHTML = `
            <div class="vinculo__info">
                <h3>${nomeMecanica(vinculo.mecanicaId)}</h3>
                <p>Enviada em ${formatarData(vinculo.criadoEm)} — aguardando aceite da mecânica <span class="status__badge ${vinculo.status}">${vinculo.status}</span></p>
            </div>`;
        container.appendChild(card);
    });
}

function renderizarMecanicasAtivas(lista) {
    const container = document.getElementById('listaMecanicasAtivas');
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = '<p class="vinculo__vazio">Você ainda não tem mecânicas vinculadas.</p>';
        return;
    }
    lista.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'vinculo__card';
        const mecanica = item.mecanica || {};
        card.innerHTML = `
            <div class="vinculo__info">
                <h3>${mecanica.nome || 'Mecânica'}</h3>
                <p>${mecanica.email || ''} — vinculado desde ${formatarData(item.criadoEm)} <span class="status__badge ${item.status}">${item.status}</span></p>
            </div>
            <div class="vinculo__actions">
                <button class="btn__small btn__small--danger" onclick="desativarVinculo('${item.vinculoId}')">Desvincular</button>
            </div>`;
        container.appendChild(card);
    });
}

// Estas funções ficam globais porque os cartões existentes usam onclick inline.
window.aceitarVinculo = async (vinculoId) => {
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/aceitar`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Convite aceito!', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao aceitar convite.');
    } catch (error) { mostrarAlerta('Erro ao aceitar convite.'); }
};

window.recusarVinculo = async (vinculoId) => {
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/recusar`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Convite recusado.', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao recusar convite.');
    } catch (error) { mostrarAlerta('Erro ao recusar convite.'); }
};

window.desativarVinculo = async (vinculoId) => {
    if (!confirm('Deseja realmente desvincular esta mecânica?')) return;
    try {
        const res = await fetch(`/api/vinculos/${vinculoId}/desativar`, { method: 'PATCH' });
        const data = await res.json();
        if (res.ok) { mostrarAlerta('Vínculo desativado.', 'success'); await carregarVinculos(); }
        else mostrarAlerta(data.message || 'Erro ao desativar vínculo.');
    } catch (error) { mostrarAlerta('Erro ao desativar vínculo.'); }
};
