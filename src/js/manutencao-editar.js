// ============================================================
// ARQUIVO: manutencao-editar.js (FRONTEND)
// DESCRIÇÃO: Formulário de edição de uma manutenção existente
// ============================================================
// PÁGINA HTML: manutencao-editar.html
// RESPONSABILIDADES:
//   - Carregar a manutenção existente e preencher o formulário
//   - Permitir alterar data, KM, tipo, custo, descrição e nota fiscal
//   - Enviar as alterações via PUT para a API
//   - Redirecionar de volta para veiculo-detalhes.html
// ============================================================

// ============================================================
// CAPTURA DOS PARÂMETROS DA URL
// ============================================================
// URL esperada: manutencao-editar.html?veiculoId=123&manutencaoId=456
const urlParams = new URLSearchParams(window.location.search);
const veiculoId = urlParams.get('veiculoId');
const manutencaoId = urlParams.get('manutencaoId');

// Validação: se faltar algum parâmetro, volta para a home
if (!veiculoId || !manutencaoId) {
    window.location.href = './index.html';
}

// ============================================================
// REFERÊNCIAS AO DOM
// ============================================================
const form = document.getElementById('formEditarManutencao');
const btnUpload = document.getElementById('btnUpload');
const inputFile = document.getElementById('notaFiscal');
const fileName = document.getElementById('fileName');
const btnRemoverNota = document.getElementById('btnRemoverNota');

// Guarda a nota fiscal atual (para saber se foi alterada/removida)
let notaFiscalAtual = null;
let notaFiscalNomeAtual = null;
let notaFiscalRemovida = false;

// ============================================================
// FUNÇÕES DE ACESSO À API
// ============================================================

// Busca o veículo e localiza a manutenção pelo id
async function carregarManutencao() {
    try {
        const res = await fetch(`/api/vehicles/${veiculoId}`);
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            alert('Não foi possível carregar a manutenção.');
            window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
            return;
        }
        const data = await res.json();
        const veiculo = data.veiculo;
        const manutencao = (veiculo.manutencoes || []).find(m => m.id === manutencaoId);

        if (!manutencao) {
            alert('Manutenção não encontrada.');
            window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
            return;
        }

        preencherFormulario(manutencao);
    } catch (e) {
        console.error('Erro ao carregar manutenção:', e);
        alert('Erro de conexão ao carregar manutenção.');
        window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
    }
}

// Envia as alterações via PUT
async function atualizarManutencao(dados) {
    const res = await fetch(`/api/vehicles/${veiculoId}/maintenance/${manutencaoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    return res;
}

// ============================================================
// PREENCHIMENTO DO FORMULÁRIO
// ============================================================
function preencherFormulario(manutencao) {
    document.getElementById('data').value = manutencao.data || '';
    document.getElementById('km').value = manutencao.km || '';
    document.getElementById('tipo').value = manutencao.tipo || '';
    document.getElementById('custo').value = manutencao.custo || '';
    document.getElementById('descricao').value = manutencao.descricao || '';

    notaFiscalAtual = manutencao.notaFiscal || null;
    notaFiscalNomeAtual = manutencao.notaFiscalNome || null;

    if (notaFiscalNomeAtual) {
        fileName.textContent = `Nota atual: ${notaFiscalNomeAtual}`;
        btnRemoverNota.style.display = '';
    }
}

// ============================================================
// BOTÕES DE NAVEGAÇÃO (Voltar e Cancelar)
// ============================================================
function voltar() {
    window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
}

document.getElementById('btnVoltar').addEventListener('click', voltar);
document.getElementById('btnCancelar').addEventListener('click', voltar);

// ============================================================
// UPLOAD DE NOTA FISCAL
// ============================================================
btnUpload.addEventListener('click', () => {
    inputFile.click();
});

inputFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5 MB.');
            inputFile.value = '';
            fileName.textContent = notaFiscalNomeAtual ? `Nota atual: ${notaFiscalNomeAtual}` : '';
            return;
        }
        fileName.textContent = file.name;
        btnRemoverNota.style.display = 'none';
    } else {
        fileName.textContent = notaFiscalNomeAtual ? `Nota atual: ${notaFiscalNomeAtual}` : '';
    }
});

// Remove a nota fiscal atual
btnRemoverNota.addEventListener('click', () => {
    notaFiscalRemovida = true;
    notaFiscalAtual = null;
    notaFiscalNomeAtual = null;
    inputFile.value = '';
    fileName.textContent = 'Nota fiscal removida.';
    btnRemoverNota.style.display = 'none';
});

// ============================================================
// FUNÇÃO AUXILIAR: fileToBase64(file)
// ============================================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============================================================
// FORMULÁRIO - SUBMISSÃO
// ============================================================
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const file = inputFile.files[0];
    let notaFiscalBase64 = null;
    let notaFiscalNome = null;

    if (file) {
        notaFiscalBase64 = await fileToBase64(file);
        notaFiscalNome = file.name;
    } else if (notaFiscalRemovida) {
        // Nota removida: envia null para limpar
        notaFiscalBase64 = null;
        notaFiscalNome = null;
    } else {
        // Mantém a nota atual
        notaFiscalBase64 = notaFiscalAtual;
        notaFiscalNome = notaFiscalNomeAtual;
    }

    const dadosAtualizados = {
        data: document.getElementById('data').value,
        km: document.getElementById('km').value,
        tipo: document.getElementById('tipo').value,
        custo: document.getElementById('custo').value,
        descricao: document.getElementById('descricao').value.trim(),
        notaFiscal: notaFiscalBase64,
        notaFiscalNome: notaFiscalNome
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
        const res = await atualizarManutencao(dadosAtualizados);
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Erro ao atualizar manutenção.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar alterações';
            return;
        }

        window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
    } catch (e) {
        console.error('Erro ao atualizar manutenção:', e);
        alert('Erro de conexão ao atualizar manutenção.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar alterações';
    }
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================
carregarManutencao();
