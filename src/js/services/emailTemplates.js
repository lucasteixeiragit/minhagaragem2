// ============================================================
// ARQUIVO: services/emailTemplates.js
// DESCRIÇÃO: Monta o HTML dos e-mails transacionais com a identidade
//            visual do Minha Garagem (logo, vermelho da marca e assinatura).
// ============================================================
// POR QUE EXISTE:
//   Os e-mails de cadastro e de redefinição de senha eram enviados apenas
//   com texto puro. Este módulo centraliza o HTML para que os dois tenham
//   o mesmo acabamento e a mesma assinatura, sem duplicar marcação.
//
// COMO O HTML É FEITO:
//   Tabelas com estilos inline. Clientes de e-mail (Gmail, Outlook) ignoram
//   <style> e folhas externas, então tabela + style inline é o que sobrevive.
//
// QUEM USA:
//   - routes/auth.routes.js  -> emailCodigoConfirmacao() e emailRedefinicaoSenha()
//   - services/emailService.js -> recebe o html pronto no campo `html`
//
// SE MUDAR A MARCA:
//   Ajuste as constantes abaixo. A logo é servida pelo próprio site, então
//   precisa continuar pública em produção.
// ============================================================

// Logo servida pelo site em produção (mesma usada no favicon das páginas)
const LOGO_URL = 'https://minhagaragem.net/assets/favicons/favicon.png';
const SITE_URL = 'https://minhagaragem.net';
const EMAIL_CONTATO = 'minhagaragem@minhagaragem.net';

// Vermelho medido no arquivo da logo (#D90202)
const COR_MARCA = '#d90202';
const COR_TEXTO = '#15171c';
const COR_SUAVE = '#5a6069';
const COR_LINHA = '#e2e5ea';
const COR_FUNDO = '#f6f7f9';

// Fonte única para todo o e-mail. Arial resolve em qualquer cliente.
const FONTE = "Arial,Helvetica,sans-serif";

// ------------------------------------------------------------
// assinaturaHtml()
// Monta o rodapé de assinatura: filete vermelho, marca, descrição e contatos.
// Usado por montarEmail() em todos os e-mails deste módulo.
// ------------------------------------------------------------
function assinaturaHtml() {
    return `
      <tr>
        <td style="padding:0 32px 28px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="border-top:3px solid ${COR_MARCA};padding-top:16px;">
                <div style="font-family:${FONTE};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${COR_MARCA};line-height:1.4;">Minha Garagem</div>
                <div style="font-family:${FONTE};font-size:13px;color:${COR_SUAVE};line-height:1.5;padding-top:4px;">Hist&oacute;rico de manuten&ccedil;&atilde;o veicular</div>
                <div style="font-family:${FONTE};font-size:13px;color:${COR_SUAVE};line-height:1.6;padding-top:8px;">
                  <a href="mailto:${EMAIL_CONTATO}" style="color:${COR_MARCA};text-decoration:none;">${EMAIL_CONTATO}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${SITE_URL}" style="color:${COR_MARCA};text-decoration:none;">minhagaragem.net</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}

// ------------------------------------------------------------
// montarEmail({ titulo, corpoHtml })
// Envolve o conteúdo no layout comum: fundo cinza, cartão branco,
// cabeçalho com a logo e o rodapé de assinatura.
// Retorna uma string HTML completa, pronta para o campo `html`.
// ------------------------------------------------------------
export function montarEmail({ titulo, corpoHtml }) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${COR_FUNDO};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:${COR_FUNDO};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="border-collapse:collapse;width:100%;max-width:600px;background:#ffffff;border:1px solid ${COR_LINHA};border-radius:10px;">

          <!-- Cabeçalho: logo + nome da marca -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 12px 0 0;vertical-align:middle;">
                    <img src="${LOGO_URL}" width="40" height="40" alt="Minha Garagem" style="display:block;width:40px;height:40px;border:0;">
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:${FONTE};font-size:13px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${COR_TEXTO};line-height:1.4;">Minha Garagem</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo do e-mail -->
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              <h1 style="margin:0 0 16px 0;font-family:${FONTE};font-size:22px;line-height:1.3;color:${COR_TEXTO};font-weight:bold;">${titulo}</h1>
              ${corpoHtml}
            </td>
          </tr>

          ${assinaturaHtml()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ------------------------------------------------------------
// emailCodigoConfirmacao({ nome, codigo })
// E-mail de criação de conta (e de reenvio do código).
// O código aparece em destaque para ser lido e digitado sem erro.
// Usado por: routes/auth.routes.js em POST /register e
//            POST /reenviar-codigo.
// ------------------------------------------------------------
export function emailCodigoConfirmacao({ nome, codigo }) {
    const corpoHtml = `
      <p style="margin:0 0 16px 0;font-family:${FONTE};font-size:15px;line-height:1.6;color:${COR_TEXTO};">Ol&aacute; ${nome},</p>
      <p style="margin:0 0 20px 0;font-family:${FONTE};font-size:15px;line-height:1.6;color:${COR_SUAVE};">Use o c&oacute;digo abaixo para confirmar seu cadastro. Ele expira em 15 minutos.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="background:${COR_FUNDO};border:1px solid ${COR_LINHA};border-radius:8px;padding:20px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:0.28em;color:${COR_MARCA};line-height:1.2;">${codigo}</div>
          </td>
        </tr>
      </table>

      <p style="margin:20px 0 0 0;font-family:${FONTE};font-size:13px;line-height:1.6;color:${COR_SUAVE};">Se voc&ecirc; n&atilde;o criou esta conta, ignore este e-mail.</p>`;

    return montarEmail({ titulo: 'Confirme seu cadastro', corpoHtml });
}

// ------------------------------------------------------------
// emailRedefinicaoSenha({ nome, link })
// E-mail de recuperação de senha, com botão e link em texto.
// O link em texto existe porque alguns clientes bloqueiam o botão.
// Usado por: routes/auth.routes.js em POST /forgot-password.
// ------------------------------------------------------------
export function emailRedefinicaoSenha({ nome, link }) {
    const corpoHtml = `
      <p style="margin:0 0 16px 0;font-family:${FONTE};font-size:15px;line-height:1.6;color:${COR_TEXTO};">Ol&aacute; ${nome},</p>
      <p style="margin:0 0 24px 0;font-family:${FONTE};font-size:15px;line-height:1.6;color:${COR_SUAVE};">Recebemos um pedido de redefini&ccedil;&atilde;o de senha. O link abaixo vale por 1 hora.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="background:${COR_MARCA};border-radius:6px;">
            <a href="${link}" style="display:inline-block;padding:13px 26px;font-family:${FONTE};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Definir nova senha</a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0 0;font-family:${FONTE};font-size:13px;line-height:1.6;color:${COR_SUAVE};">Se o bot&atilde;o n&atilde;o funcionar, copie e cole este endere&ccedil;o no navegador:</p>
      <p style="margin:6px 0 0 0;font-family:${FONTE};font-size:13px;line-height:1.6;word-break:break-all;"><a href="${link}" style="color:${COR_MARCA};text-decoration:underline;">${link}</a></p>

      <p style="margin:20px 0 0 0;font-family:${FONTE};font-size:13px;line-height:1.6;color:${COR_SUAVE};">Se voc&ecirc; n&atilde;o solicitou, ignore este e-mail: sua senha continua a mesma.</p>`;

    return montarEmail({ titulo: 'Redefinição de senha', corpoHtml });
}
