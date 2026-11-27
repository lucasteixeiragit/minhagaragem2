// Administração: controla as abas e solicita dados/ações administrativas à API.
const alertEl = document.getElementById('alert');

function mostrarAlerta(mensagem, tipo = 'error') {
    alertEl.textContent = mensagem;
    alertEl.className = `alert__box alert__${tipo} alert__box--show`;
    setTimeout(() => { alertEl.className = 'alert__box'; }, 4000);
}

function formatarData(iso) {
    if (!iso) return '-';
    const data = new Date(iso);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// A API repete esta autorização; esta checagem evita exibir a tela para usuários comuns.
(async function verificarAdmin() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();
        if (data.user.role !== 'ADMIN') {
            window.location.href = '/index.html';
            return;
        }
        carregarUsuarios();
        carregarVeiculos();
        carregarAtendimentos();
        carregarLogs();
        carregarSelects();
    } catch (error) {
        window.location.href = '/login.html';
    }
})();

document.getElementById('btnLogout').addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// Alterna somente a apresentação dos painéis; as operações continuam na API.
document.querySelectorAll('.admin__tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin__tab').forEach((item) => item.classList.remove('admin__tab--active'));
        document.querySelectorAll('.admin__panel').forEach((panel) => panel.classList.remove('admin__panel--active'));
        tab.classList.add('admin__tab--active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('admin__panel--active');
    });
});

// Usuários: consulta, cria, altera papel/status e exclui através de endpoints protegidos.
async function carregarUsuarios() {
    try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        const tbody = document.getElementById('tbodyUsuarios');
        tbody.innerHTML = '';

        data.usuarios.forEach((usuario) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td><span class="role__badge ${usuario.role}">${usuario.role}</span></td>
                <td>${usuario.ativo ? '<span style="color: oklch(0.75 0.12 150);">Ativo</span>' : '<span style="color: oklch(0.75 0.15 25);">Bloqueado</span>'}</td>
                <td>
                    <select class="btn__small" onchange="alterarRole('${usuario._id}', this.value)">
                        <option value="USER" ${usuario.role === 'USER' ? 'selected' : ''}>USER</option>
                        <option value="MECANICA" ${usuario.role === 'MECANICA' ? 'selected' : ''}>MECANICA</option>
                        <option value="ADMIN" ${usuario.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                    </select>
                    <button class="btn__small ${usuario.ativo ? 'btn__small--danger' : 'btn__small--success'}" onclick="alterarStatus('${usuario._id}', ${!usuario.ativo})">
                        ${usuario.ativo ? 'Bloquear' : 'Ativar'}
                    </button>
                    <button class="btn__small btn__small--danger" onclick="excluirUsuario('${usuario._id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar usuários.');
    }
}

window.alterarRole = async (id, role) => {
    const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (res.ok) { mostrarAlerta('Role atualizada!', 'success'); carregarUsuarios(); }
    else mostrarAlerta(data.message || 'Erro ao alterar role.');
};

window.alterarStatus = async (id, ativo) => {
    const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo })
    });
    const data = await res.json();
    if (res.ok) { mostrarAlerta('Status atualizado!', 'success'); carregarUsuarios(); }
    else mostrarAlerta(data.message || 'Erro ao alterar status.');
};

window.excluirUsuario = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { mostrarAlerta('Usuário excluído!', 'success'); carregarUsuarios(); }
    else mostrarAlerta(data.message || 'Erro ao excluir usuário.');
};

document.getElementById('formCriarUsuario').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = document.getElementById('novoNome').value.trim();
    const email = document.getElementById('novoEmail').value.trim();
    const senha = document.getElementById('novaSenha').value;
    const role = document.getElementById('novaRole').value;

    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, role })
    });
    const data = await res.json();
    if (res.ok) {
        mostrarAlerta('Usuário criado!', 'success');
        event.target.reset();
        carregarUsuarios();
        carregarSelects();
    } else {
        mostrarAlerta(data.message || 'Erro ao criar usuário.');
    }
});

// Veículos: lista os registros para consulta administrativa.
async function carregarVeiculos() {
    try {
        const res = await fetch('/api/admin/vehicles');
        if (!res.ok) throw new Error('Falha');
        const data = await res.json();
        const tbody = document.getElementById('tbodyVeiculos');
        tbody.innerHTML = '';

        data.veiculos.forEach((veiculo) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${veiculo.apelido || '-'}</td>
                <td>${veiculo.marca || ''} ${veiculo.modelo || ''} ${veiculo.versao || ''}</td>
                <td>${veiculo.placa || '-'}</td>
                <td>${veiculo.kmAtual || 0} km</td>
                <td>${veiculo.ownerId || 'Sem proprietário'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar veículos.');
    }
}

// Preenche os selects usados na criação de atendimentos.
async function carregarSelects() {
    try {
        const resUsers = await fetch('/api/admin/users');
        const dataUsers = await resUsers.json();
        const selectMec = document.getElementById('selectMecanica');
        selectMec.innerHTML = '<option value="">Selecione...</option>';
        dataUsers.usuarios.filter((usuario) => usuario.role === 'MECANICA').forEach((usuario) => {
            const option = document.createElement('option');
            option.value = usuario._id;
            option.textContent = usuario.nome;
            selectMec.appendChild(option);
        });

        const resVeh = await fetch('/api/admin/vehicles');
        const dataVeh = await resVeh.json();
        const selectVeh = document.getElementById('selectVeiculo');
        selectVeh.innerHTML = '<option value="">Selecione...</option>';
        dataVeh.veiculos.forEach((veiculo) => {
            const option = document.createElement('option');
            option.value = veiculo._id;
            option.textContent = `${veiculo.apelido || 'Veículo'} (${veiculo.marca || ''} ${veiculo.modelo || ''})`;
            selectVeh.appendChild(option);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar opções.');
    }
}

// Atendimentos: cria e atualiza o estado dos serviços administrativos.
async function carregarAtendimentos() {
    try {
        const res = await fetch('/api/admin/appointments');
        if (!res.ok) throw new Error('Falha');
        const data = await res.json();
        const tbody = document.getElementById('tbodyAtendimentos');
        tbody.innerHTML = '';

        data.atendimentos.forEach((atendimento) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${atendimento.mechanicId || '-'}</td>
                <td>${atendimento.vehicleId || '-'}</td>
                <td><span class="role__badge ${atendimento.status === 'aberto' ? 'USER' : atendimento.status === 'concluido' ? 'MECANICA' : 'ADMIN'}">${atendimento.status}</span></td>
                <td>
                    <button class="btn__small btn__small--success" onclick="alterarStatusAtendimento('${atendimento._id}', 'concluido')">Concluir</button>
                    <button class="btn__small btn__small--danger" onclick="alterarStatusAtendimento('${atendimento._id}', 'cancelado')">Cancelar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar atendimentos.');
    }
}

window.alterarStatusAtendimento = async (id, status) => {
    const res = await fetch(`/api/admin/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) { mostrarAlerta('Atendimento atualizado!', 'success'); carregarAtendimentos(); }
    else mostrarAlerta(data.message || 'Erro ao atualizar atendimento.');
};

document.getElementById('formAtendimento').addEventListener('submit', async (event) => {
    event.preventDefault();
    const mechanicId = document.getElementById('selectMecanica').value;
    const vehicleId = document.getElementById('selectVeiculo').value;

    if (!mechanicId || !vehicleId) {
        mostrarAlerta('Selecione mecânica e veículo.');
        return;
    }

    const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId, vehicleId })
    });
    const data = await res.json();
    if (res.ok) { mostrarAlerta('Atendimento criado!', 'success'); carregarAtendimentos(); }
    else mostrarAlerta(data.message || 'Erro ao criar atendimento.');
});

// Logs: exibe auditoria já registrada pelo backend.
async function carregarLogs() {
    try {
        const res = await fetch('/api/admin/audit-logs?limit=50');
        if (!res.ok) throw new Error('Falha');
        const data = await res.json();
        const tbody = document.getElementById('tbodyLogs');
        tbody.innerHTML = '';

        data.logs.forEach((log) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarData(log.timestamp)}</td>
                <td>${log.action}</td>
                <td>${log.resource} ${log.resourceId ? '(' + log.resourceId + ')' : ''}</td>
                <td>${log.ip || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        mostrarAlerta('Erro ao carregar logs.');
    }
}
