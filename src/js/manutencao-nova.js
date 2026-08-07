// ============================================================
// ARQUIVO: manutencao-nova.js (FRONTEND)
// DESCRIÇÃO: Formulário de registro de nova manutenção
// ============================================================
// PÁGINA HTML: manutencao-nova.html
// RESPONSABILIDADES:
//   - Coletar dados da manutenção (data, KM, tipo, custo, descrição)
//   - Fazer upload de nota fiscal (converte para Base64)
//   - Validar tamanho do arquivo (máx 5 MB)
//   - Salvar manutenção no localStorage
//   - Redirecionar de volta para veiculo-detalhes.html
// ============================================================

// Chave do localStorage onde os veículos são armazenados
const STORAGE_KEY = "minhaGaragem.veiculos";

// ============================================================
// FUNÇÕES DE ACESSO AO LOCALSTORAGE
// ============================================================

// Recupera todos os veículos do localStorage
function getVeiculos() {
    const dados = localStorage.getItem(STORAGE_KEY);
    // Se existir dados, parseia JSON; senão retorna array vazio
    return dados ? JSON.parse(dados) : [];
}

// Salva array de veículos no localStorage
function salvarVeiculos(veiculos) {
    // Converte objeto JavaScript para string JSON
    localStorage.setItem(STORAGE_KEY, JSON.stringify(veiculos));
}

// ============================================================
// CAPTURA DO ID DO VEÍCULO DA URL
// ============================================================
// URL esperada: manutencao-nova.html?veiculoId=123456789

// Cria objeto para manipular query string da URL
const urlParams = new URLSearchParams(window.location.search);

// Extrai o parâmetro 'veiculoId' da URL
const veiculoId = urlParams.get('veiculoId');

// Validação: Se não houver veiculoId, redireciona para home
// Isso previne erro caso usuário acesse a página diretamente
if (!veiculoId) {
    window.location.href = './index.html';
}

// ============================================================
// BOTÕES DE NAVEGAÇÃO (Voltar e Cancelar)
// ============================================================

// Botão "Voltar" (no header da página)
document.getElementById('btnVoltar').addEventListener('click', () => {
    // Retorna para a página de detalhes do veículo
    window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
});

// Botão "Cancelar" (no formulário)
document.getElementById('btnCancelar').addEventListener('click', () => {
    // Mesmo comportamento do botão Voltar
    window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
});

// ============================================================
// UPLOAD DE NOTA FISCAL
// ============================================================

// Referências aos elementos do DOM
const btnUpload = document.getElementById('btnUpload');     // Botão visível "Anexar arquivo"
const inputFile = document.getElementById('notaFiscal');    // Input file (invisível)
const fileName = document.getElementById('fileName');       // Span que exibe nome do arquivo

// Quando clicar no botão visível, aciona o input file invisível
btnUpload.addEventListener('click', () => {
    inputFile.click(); // Abre o seletor de arquivos do sistema operacional
});

// Quando um arquivo for selecionado
inputFile.addEventListener('change', (e) => {
    // Pega o primeiro arquivo selecionado (input só permite 1)
    const file = e.target.files[0];
    
    if (file) {
        // VALIDAÇÃO: Tamanho máximo de 5 MB
        // 5 * 1024 * 1024 = 5.242.880 bytes
        if (file.size > 5 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 5 MB.');
            // Limpa a seleção de arquivo
            inputFile.value = '';
            fileName.textContent = '';
            return;
        }
        
        // Exibe o nome do arquivo selecionado
        fileName.textContent = file.name;
    } else {
        // Se nenhum arquivo foi selecionado, limpa o texto
        fileName.textContent = '';
    }
});

// ============================================================
// FORMULÁRIO - SUBMISSÃO
// ============================================================

// Referência ao formulário
const form = document.getElementById('formNovaManutencao');

// Evento disparado quando o formulário é submetido
form.addEventListener('submit', async (event) => {
    // Previne comportamento padrão (recarregar página)
    event.preventDefault();

    // Pega o arquivo de nota fiscal (se houver)
    const file = inputFile.files[0];
    let notaFiscalBase64 = null;

    // Se arquivo foi selecionado, converte para Base64
    if (file) {
        // Aguarda conversão assíncrona (usa FileReader API)
        notaFiscalBase64 = await fileToBase64(file);
        // Resultado: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }

    // Cria objeto com dados da manutenção
    const novaManutencao = {
        id: Date.now(),  // ID único baseado em timestamp
        data: document.getElementById('data').value,           // Data ISO (YYYY-MM-DD)
        km: document.getElementById('km').value,               // KM da manutenção
        tipo: document.getElementById('tipo').value,           // Tipo (ex: "Troca de Óleo")
        custo: document.getElementById('custo').value,         // Valor gasto
        descricao: document.getElementById('descricao').value.trim(),  // Descrição opcional
        notaFiscal: notaFiscalBase64,    // String Base64 da imagem (ou null)
        notaFiscalNome: file ? file.name : null  // Nome do arquivo original
    };

    // Busca todos os veículos do localStorage
    const veiculos = getVeiculos();
    
    // Encontra o veículo específico pelo ID
    // String() garante comparação de tipos (ID pode ser number ou string)
    const veiculo = veiculos.find(v => String(v.id) === String(veiculoId));

    // Validação: Se veículo não foi encontrado (não deveria acontecer)
    if (!veiculo) {
        alert('Veículo não encontrado!');
        return;
    }

    // Se o veículo ainda não tem array de manutenções, cria um
    if (!veiculo.manutencoes) {
        veiculo.manutencoes = [];
    }

    // Adiciona a nova manutenção ao array
    veiculo.manutencoes.push(novaManutencao);
    
    // Salva os veículos atualizados no localStorage
    salvarVeiculos(veiculos);

    // Redireciona para a página de detalhes do veículo
    // O usuário verá a manutenção recém-adicionada na lista
    window.location.href = `./veiculo-detalhes.html?id=${veiculoId}`;
});

// ============================================================
// FUNÇÃO AUXILIAR: fileToBase64(file)
// ============================================================
// PROPÓSITO: Converte arquivo para string Base64
// PARÂMETRO: file → Objeto File do input type="file"
// RETORNA: Promise que resolve com string Base64
// FORMATO: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
// POR QUÊ BASE64: Permite armazenar imagem como string no localStorage
// ============================================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        // FileReader é API nativa do navegador para ler arquivos
        const reader = new FileReader();
        
        // readAsDataURL converte arquivo para Base64 (formato Data URL)
        reader.readAsDataURL(file);
        
        // Quando leitura completar com sucesso
        reader.onload = () => resolve(reader.result);
        
        // Se houver erro na leitura
        reader.onerror = error => reject(error);
    });
}

// ============================================================
// INICIALIZAÇÃO: Define data padrão como hoje
// ============================================================

// Pega data atual no formato ISO (YYYY-MM-DD)
// new Date() → objeto Date
// .toISOString() → "2026-08-05T12:34:56.789Z"
// .split('T')[0] → "2026-08-05"
const hoje = new Date().toISOString().split('T')[0];

// Define como valor padrão do campo data
// Usuário pode alterar se quiser registrar manutenção de data passada
document.getElementById('data').value = hoje;
