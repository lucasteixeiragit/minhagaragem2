// ============================================================
// ARQUIVO: manutencao-utils.js (FRONTEND)
// DESCRIÇÃO: Funções utilitárias para cálculo de alertas de manutenção
// ============================================================
// Este arquivo contém:
//   - Lógica de cálculo de quando fazer próximas manutenções
//   - Sistema de alertas (ok, alerta, urgente, atrasada)
//   - Funções auxiliares para cores e textos dos status
// USADO EM:
//   - main.js → Badges de alertas na home
//   - veiculo-detalhes.js → Cards de alertas na página do veículo
// ============================================================

// ============================================================
// FUNÇÃO: calcularKmAtualEstimado(veiculo, dataReferencia)
// ============================================================
// PROPÓSITO: Estima a quilometragem atual a partir da leitura registrada e da média mensal
// PARÂMETROS:
//   - veiculo: Objeto do veículo
//   - dataReferencia: Data usada para simular avanço de tempo
// RETORNA: Número inteiro estimado de KM
// ============================================================
function calcularKmAtualEstimado(veiculo, dataReferencia = new Date()) {
    const kmAtual = parseInt(veiculo.kmAtual) || 0;
    const kmMensal = parseInt(veiculo.kmMensal) || 0;
    const dataLeitura = veiculo.dataLeitura ? new Date(veiculo.dataLeitura + 'T00:00:00') : null;

    if (!dataLeitura || !kmMensal) {
        return kmAtual;
    }

    const diferencaDias = Math.max(0, Math.floor((dataReferencia - dataLeitura) / (1000 * 60 * 60 * 24)));
    const kmDiaria = kmMensal / 30;
    const kmEstimado = kmAtual + (kmDiaria * diferencaDias);

    return Math.round(kmEstimado);
}

// ============================================================
// FUNÇÃO: calcularProximasManutencoes(veiculo, dataReferencia)
// ============================================================
// PROPÓSITO: Calcula quando fazer cada manutenção preventiva
// PARÂMETROS:
//   - veiculo: Objeto completo do veículo (deve ter intervalosManutencoesPreventivas e kmAtual)
//   - dataReferencia: Data usada para simular avanço de tempo
// RETORNA: Array de objetos com informações de cada manutenção
// LÓGICA:
//   1. Para cada intervalo de manutenção preventiva:
//      a. Busca a última vez que foi feita (se houver)
//      b. Calcula quando fazer a próxima (última KM + intervalo)
//      c. Calcula KM restantes (próxima - atual)
//      d. Define status (ok, alerta, urgente, atrasada)
//   2. Ordena por urgência (atrasadas primeiro)
// ============================================================
function calcularProximasManutencoes(veiculo, dataReferencia = new Date()) {
    // Validação 1: Verifica se o veículo tem intervalos de manutenção configurados
    // Se não tiver, não há nada para calcular
    if (!veiculo.intervalosManutencoesPreventivas || Object.keys(veiculo.intervalosManutencoesPreventivas).length === 0) {
        return [];
    }

    // Estima a quilometragem atual com base na leitura registrada e na média mensal
    const kmAtual = calcularKmAtualEstimado(veiculo, dataReferencia);
    
    // Array que armazenará as informações de cada manutenção
    const proximasManutencoes = [];

    // Itera sobre cada intervalo de manutenção preventiva
    // Object.entries converte { trocaOleo: {...}, filtroAr: {...} } em [[trocaOleo, {...}], [filtroAr, {...}]]
    Object.entries(veiculo.intervalosManutencoesPreventivas).forEach(([key, manutencao]) => {
        // Busca a última vez que esta manutenção foi feita
        // Retorna null se nunca foi feita
        const ultimaManutencao = encontrarUltimaManutencaoTipo(veiculo, manutencao.nome);
        
        let kmProximaManutencao; // Quando fazer a próxima (em KM)
        let kmDesdeUltima;       // Quanto já rodou desde a última
        
        // CASO 1: Já foi feita antes
        if (ultimaManutencao) {
            const kmUltima = parseInt(ultimaManutencao.km) || 0;
            
            // Calcula quantos KM já rodou desde a última
            kmDesdeUltima = kmAtual - kmUltima;
            
            // Próxima manutenção = KM da última + intervalo
            // Ex: Última troca de óleo em 40.000 km, intervalo 10.000 → próxima em 50.000 km
            kmProximaManutencao = kmUltima + manutencao.intervaloKm;
        } 
        // CASO 2: Nunca foi feita
        else {
            // Se nunca foi feita, considera que já rodou o kmAtual desde a "última"
            kmDesdeUltima = kmAtual;
            
            // Próxima manutenção = KM atual + intervalo
            // Ex: Carro com 50.000 km nunca teve troca de óleo, intervalo 10.000 → próxima em 60.000 km
            kmProximaManutencao = kmAtual + manutencao.intervaloKm;
        }

        // Calcula quantos KM faltam para a próxima manutenção
        // Ex: Próxima em 50.000, atual 48.000 → faltam 2.000 km
        // Se negativo, está ATRASADA (ex: próxima em 50.000, atual 52.000 → -2.000 km)
        const kmRestantes = kmProximaManutencao - kmAtual;
        
        // Calcula percentual de progresso até a próxima manutenção
        // Ex: Intervalo 10.000, faltam 2.000 → 80% completo
        const percentualCompleto = ((manutencao.intervaloKm - kmRestantes) / manutencao.intervaloKm) * 100;
        
        // Inicializa status e urgência
        let status = 'ok';    // Status visual (ok, alerta, urgente, atrasada)
        let urgencia = 0;     // Número para ordenação (maior = mais urgente)
        
        // Define status baseado nos KM restantes
        if (kmRestantes <= 0) {
            // Já passou do KM → ATRASADA
            status = 'atrasada';
            urgencia = 3; // Maior urgência
        } else if (kmRestantes <= 500) {
            // Faltam menos de 500 km → URGENTE
            status = 'urgente';
            urgencia = 2;
        } else if (kmRestantes <= 1000) {
            // Faltam menos de 1000 km → ALERTA
            status = 'alerta';
            urgencia = 1;
        }
        // Se faltam mais de 1000 km, fica como 'ok' (urgencia 0)

        // Adiciona as informações calculadas ao array
        proximasManutencoes.push({
            key,                  // ID da manutenção (ex: "trocaOleo")
            nome: manutencao.nome,
            descricao: manutencao.descricao,
            intervaloKm: manutencao.intervaloKm,
            intervaloMeses: manutencao.intervaloMeses,
            kmProximaManutencao,  // Quando fazer (em KM)
            kmRestantes,          // Quanto falta (pode ser negativo)
            kmDesdeUltima,        // Quanto já rodou desde a última
            // Garante que percentual fica entre 0 e 100
            percentualCompleto: Math.min(100, Math.max(0, percentualCompleto)),
            status,               // 'ok', 'alerta', 'urgente', 'atrasada'
            urgencia,             // 0, 1, 2, 3 (para ordenação)
            ultimaManutencao      // Objeto da última manutenção (ou null)
        });
    });

    // Ordena por urgência (atrasadas primeiro) e depois por KM restantes (menor primeiro)
    // Exemplo de ordenação:
    //   1. Atrasadas (urgencia 3)
    //   2. Urgentes (urgencia 2)
    //   3. Alertas (urgencia 1)
    //   4. Ok (urgencia 0)
    // Se tiverem mesma urgência, ordena por kmRestantes (menor = mais urgente)
    proximasManutencoes.sort((a, b) => b.urgencia - a.urgencia || a.kmRestantes - b.kmRestantes);

    return proximasManutencoes;
}

// ============================================================
// FUNÇÃO: encontrarUltimaManutencaoTipo(veiculo, tipoManutencao)
// ============================================================
// PROPÓSITO: Busca a última vez que uma manutenção específica foi feita
// PARÂMETROS:
//   - veiculo: Objeto do veículo (deve ter array 'manutencoes')
//   - tipoManutencao: Nome da manutenção (ex: "Troca de Óleo")
// RETORNA: Objeto da última manutenção deste tipo ou null se nunca foi feita
// LÓGICA DE MATCHING:
//   - Faz busca PARCIAL e CASE-INSENSITIVE
//   - "Troca de Óleo" encontra "TROCA DE OLEO"
//   - "Óleo" encontra "Troca de Óleo do Motor"
//   - Garante flexibilidade (usuário pode ter digitado diferente)
// ============================================================
function encontrarUltimaManutencaoTipo(veiculo, tipoManutencao) {
    // Validação: Verifica se há manutenções registradas
    if (!veiculo.manutencoes || veiculo.manutencoes.length === 0) {
        return null;
    }

    // Filtra manutenções que correspondem ao tipo buscado
    // Usa includes() para busca PARCIAL (não precisa ser exato)
    // toLowerCase() para ignorar maiúsculas/minúsculas
    const manutencoesDoTipo = veiculo.manutencoes.filter(m => 
        m.tipo && tipoManutencao && 
        (m.tipo.toLowerCase().includes(tipoManutencao.toLowerCase()) || 
         tipoManutencao.toLowerCase().includes(m.tipo.toLowerCase()))
    );

    // Se não encontrou nenhuma, retorna null
    if (manutencoesDoTipo.length === 0) {
        return null;
    }

    // Ordena por KM (maior KM = mais recente)
    // Assume que KM sempre cresce (não diminui)
    manutencoesDoTipo.sort((a, b) => {
        const kmA = parseInt(a.km) || 0;
        const kmB = parseInt(b.km) || 0;
        return kmB - kmA; // Ordem DECRESCENTE (maior primeiro)
    });

    // Retorna a primeira (que tem maior KM = mais recente)
    return manutencoesDoTipo[0];
}

// ============================================================
// FUNÇÃO: getStatusColor(status)
// ============================================================
// PROPÓSITO: Retorna a cor OKLCH correspondente ao status
// PARÂMETRO: status → 'ok', 'alerta', 'urgente', 'atrasada'
// RETORNA: String OKLCH (formato de cor moderno e perceptualmente uniforme)
// USADO EM: Badges, barras de progresso, cards de alerta
// CORES:
//   - atrasada: Vermelho escuro (tom 25, alta saturação)
//   - urgente: Laranja (tom 25, média saturação)
//   - alerta: Amarelo (tom 80, média saturação)
//   - ok: Verde escuro (tom 160, baixa saturação)
// ============================================================
function getStatusColor(status) {
    switch(status) {
        case 'atrasada':
            return 'oklch(0.55 0.15 25)'; // Vermelho escuro
        case 'urgente':
            return 'oklch(0.62 0.22 25)'; // Laranja
        case 'alerta':
            return 'oklch(0.65 0.20 80)'; // Amarelo
        default:
            return 'oklch(0.45 0.05 160)'; // Verde escuro
    }
}

// ============================================================
// FUNÇÃO: getStatusText(status)
// ============================================================
// PROPÓSITO: Retorna o texto descritivo do status
// PARÂMETRO: status → 'ok', 'alerta', 'urgente', 'atrasada'
// RETORNA: String em MAIÚSCULAS para exibição em badges
// USADO EM: Badges de status nos cards de alerta
// ============================================================
function getStatusText(status) {
    switch(status) {
        case 'atrasada':
            return 'ATRASADA';
        case 'urgente':
            return 'URGENTE';
        case 'alerta':
            return 'EM BREVE';
        default:
            return 'OK';
    }
}

// ============================================================
// EXPORTAÇÕES (ES6 Modules)
// ============================================================
// Exporta as 3 funções públicas do módulo
// USADO EM:
//   - main.js → calcularProximasManutencoes, getStatusColor
//   - veiculo-detalhes.js → Todas as 3 funções
// ============================================================
export { calcularKmAtualEstimado, calcularProximasManutencoes, getStatusColor, getStatusText };
