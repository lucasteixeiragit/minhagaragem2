// ============================================================
// ARQUIVO: middleware/plano.js
// DESCRIÇÃO: Porteiro dos recursos pagos (plano PRO)
// ============================================================
// CONCEITO: o "direito" (se o usuário pagou) vive no banco, no documento
// do usuário. O "porteiro" (quem barra) vive aqui, no servidor.
// O frontend apenas mostra o aviso; quem impede o acesso é este arquivo.
//
// CAMPOS LIDOS: req.user.plano e req.user.planoExpiraEm, preenchidos por
// requireAuth (middleware/auth.js) a partir de Usuario.sanitizar().
//
// USADO POR:
//   - routes/vehicle.routes.js  → limite de 1 veículo no plano FREE
//   - routes/maintenance.routes.js → anexo de nota fiscal só no PRO
// ============================================================

// Preço e duração ficam aqui para não haver número solto no código.
// PRECO_CENTAVOS aceita override por variável de ambiente para permitir
// testar o fluxo completo com valor baixo sem alterar o código. Em
// produção a variável não existe e vale o padrão de R$ 20,00.
// LIDO POR: routes/pagamento.routes.js (criação do link e conferência do
// valor no webhook) e GET /api/pagamento/status (exibição no perfil).
export const PRECO_CENTAVOS = Number(process.env.PRECO_CENTAVOS) || 2000; // R$ 20,00
export const DIAS_ASSINATURA = 30;
export const DIAS_TRIAL = 7;
export const LIMITE_VEICULOS_FREE = 1;

// ============================================================
// FUNÇÃO: planoAtivo(usuario)
// PROPÓSITO: Diz se o usuário tem PRO válido agora
// REGRA: precisa ser PRO e ter planoExpiraEm no futuro. Um PRO vencido
// volta a ser tratado como FREE, sem precisar de rotina de expiração.
// ============================================================
export function planoAtivo(usuario) {
    if (!usuario || usuario.plano !== 'PRO') return false;
    if (!usuario.planoExpiraEm) return false;
    return new Date(usuario.planoExpiraEm).getTime() > Date.now();
}

// ============================================================
// MIDDLEWARE: exigirPlanoPro
// PROPÓSITO: Barra a rota inteira quando o plano não basta
// RESPOSTA DE BLOQUEIO: 403 com codigo 'LIMITE_PLANO', para o frontend
// abrir a tela de assinatura em vez de mostrar erro genérico.
// ============================================================
export function exigirPlanoPro(req, res, next) {
    if (planoAtivo(req.user)) return next();

    return res.status(403).json({
        success: false,
        codigo: 'LIMITE_PLANO',
        message: 'Este recurso faz parte do plano Pro.',
        plano: 'FREE'
    });
}

// ============================================================
// MIDDLEWARE: limitarVeiculos
// PROPÓSITO: Aplica o limite de veículos do plano gratuito
// REGRA: FREE pode ter LIMITE_VEICULOS_FREE; PRO não tem limite.
// Só conta para role USER; ADMIN e MECANICA não são donos de garagem.
// ============================================================
export async function limitarVeiculos(req, res, next) {
    if (req.user.role !== 'USER') return next();
    if (planoAtivo(req.user)) return next();

    try {
        // Import tardio evita ciclo entre middleware e model
        const { default: Veiculo } = await import('../models/Veiculo.js');
        const total = await Veiculo.contarDoProprietario(req.user._id);

        if (total >= LIMITE_VEICULOS_FREE) {
            return res.status(403).json({
                success: false,
                codigo: 'LIMITE_PLANO',
                message: `O plano gratuito permite ${LIMITE_VEICULOS_FREE} veículo. Assine o Pro para adicionar mais.`,
                plano: 'FREE',
                limite: LIMITE_VEICULOS_FREE,
                total
            });
        }

        return next();
    } catch (error) {
        console.error('Erro ao verificar limite de veículos:', error);
        return res.status(500).json({ success: false, message: 'Erro ao verificar o plano.' });
    }
}

// ============================================================
// FUNÇÃO: podeAnexarNotaFiscal(usuario)
// PROPÓSITO: Diz se o anexo de nota fiscal é permitido
// USADO POR: routes/maintenance.routes.js, que remove o anexo quando
// falso em vez de rejeitar a manutenção inteira.
// ============================================================
export function podeAnexarNotaFiscal(usuario) {
    return planoAtivo(usuario);
}
