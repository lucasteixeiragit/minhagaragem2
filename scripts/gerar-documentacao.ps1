# ============================================================
# SCRIPT: gerar-documentacao.ps1
# DESCRICAO: Gera a documentacao completa do projeto em .docx
#            usando automacao do Microsoft Word (COM).
# USO: powershell -ExecutionPolicy Bypass -File scripts\gerar-documentacao.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# Caminho de saida
$OUTPUT = "C:\Users\lucas\Documents\GitHub\minhagaragem\Documentacao_Projeto.docx"

# ============================================================
# INICIA O WORD
# ============================================================
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()

# ============================================================
# FUNCOES AUXILIARES
# ============================================================
$sel = $word.Selection

# Codigos dos estilos embutidos do Word (WdBuiltinStyle)
$STYLE_TITLE    = -63
$STYLE_SUBTITLE = -75
$STYLE_H1       = -2
$STYLE_H2       = -3
$STYLE_H3       = -4
$STYLE_NORMAL   = -1
$STYLE_BULLET   = -49
$STYLE_NUMBER   = -50

function Set-Style($code) {
    $sel.Style = $doc.Styles.Item($code)
}

function Add-Heading1($text) {
    Set-Style $STYLE_H1
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Heading2($text) {
    Set-Style $STYLE_H2
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Heading3($text) {
    Set-Style $STYLE_H3
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Para($text) {
    Set-Style $STYLE_NORMAL
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Bullet($text) {
    Set-Style $STYLE_BULLET
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Numbered($text) {
    Set-Style $STYLE_NUMBER
    $sel.TypeText($text)
    $sel.TypeParagraph()
}

function Add-Code($text) {
    Set-Style "Normal"
    $sel.Font.Name = "Consolas"
    $sel.Font.Size = 9
    $sel.ParagraphFormat.LeftIndent = $word.CentimetersToPoints(0.8)
    $sel.ParagraphFormat.Shading.BackgroundPatternColor = 15921906
    $lines = $text -split "`n"
    foreach ($line in $lines) {
        $sel.TypeText($line)
        $sel.TypeParagraph()
    }
    $sel.Font.Name = "Calibri"
    $sel.Font.Size = 11
    $sel.ParagraphFormat.LeftIndent = 0
    $sel.ParagraphFormat.Shading.BackgroundPatternColor = 16777215
    Set-Style $STYLE_NORMAL
}

function Add-Table($headers, $rows) {
    $table = $doc.Tables.Add($sel.Range, $rows.Count + 1, $headers.Count)
    $table.Borders.Enable = $true
    $table.Style = $doc.Styles.Item(-155) # wdStyleTableGrid
    # Cabeçalho
    for ($i = 0; $i -lt $headers.Count; $i++) {
        $table.Cell(1, $i + 1).Range.Text = $headers[$i]
        $table.Cell(1, $i + 1).Range.Bold = $true
        $table.Cell(1, $i + 1).Shading.BackgroundPatternColor = 15132390
    }
    # Linhas
    for ($r = 0; $r -lt $rows.Count; $r++) {
        for ($c = 0; $c -lt $headers.Count; $c++) {
            $table.Cell($r + 2, $c + 1).Range.Text = $rows[$r][$c]
        }
    }
    # Move o cursor para depois da tabela
    $sel.EndKey(6) | Out-Null
    $sel.TypeParagraph()
}

# ============================================================
# CAPA
# ============================================================
Set-Style $STYLE_TITLE
$sel.TypeText("Minha Garagem - Documentacao Tecnica")
$sel.TypeParagraph()
Set-Style $STYLE_SUBTITLE
$sel.TypeText("Sincronizacao do Projeto e Banco de Dados entre PC, GitHub e Servidor Oracle")
$sel.TypeParagraph()
$sel.TypeParagraph()
Set-Style $STYLE_NORMAL
$sel.TypeText("Data de geracao: " + (Get-Date -Format "dd/MM/yyyy"))
$sel.TypeParagraph()
$sel.TypeText("Autor: Lucas Teixeira Carvalho")
$sel.TypeParagraph()
$sel.TypeParagraph()
$sel.InsertBreak(7) # PageBreak

# ============================================================
# SUMARIO
# ============================================================
Add-Heading1 "Sumario"
Add-Para "1. Visao Geral"
Add-Para "2. Arquitetura do Fluxo"
Add-Para "3. Componentes Envolvidos"
Add-Para "4. Como Funciona o Deploy Automatico (PC -> GitHub -> Servidor)"
Add-Para "5. Como Funciona a Sincronizacao do Banco de Dados (Servidor -> PC)"
Add-Para "6. Guia de Uso - Passo a Passo"
Add-Para "7. Solucao de Problemas"
Add-Para "8. Seguranca"
Add-Para "9. Referencia Rapida de Comandos"
$sel.InsertBreak(7)

# ============================================================
# 1. VISÃO GERAL
# ============================================================
Add-Heading1 "1. Visao Geral"
Add-Para "Este documento descreve como o projeto Minha Garagem esta configurado para funcionar em tres ambientes: o seu computador local (desenvolvimento), o GitHub (repositorio central) e o servidor Oracle (producao). O objetivo e que voce consiga alterar o codigo no seu PC, enviar para o GitHub e ter o servidor atualizado automaticamente, alem de manter o banco de dados local sincronizado com o do servidor para desenvolvimento."
Add-Para "O sistema e uma aplicacao web Node.js + Express com banco de dados MongoDB. O site em producao esta disponivel em https://minhagaragem.duckdns.org."

Add-Heading2 "1.1 O que este documento cobre"
Add-Bullet "Como o codigo flui do seu PC para o servidor automaticamente (deploy)."
Add-Bullet "Como sincronizar o banco de dados do servidor para o seu PC."
Add-Bullet "Passo a passo para realizar cada operacao."
Add-Bullet "Como resolver problemas comuns."
Add-Bullet "Boas praticas de seguranca."

# ============================================================
# 2. ARQUITETURA
# ============================================================
Add-Heading1 "2. Arquitetura do Fluxo"
Add-Para "O projeto usa dois fluxos principais, em direcoes opostas:"

Add-Heading2 "2.1 Fluxo de Codigo (Deploy): PC -> GitHub -> Servidor"
Add-Para "Quando voce altera o codigo no PC e faz push para o GitHub, um processo automatico (GitHub Actions) copia os arquivos para o servidor e reinicia o aplicativo. Nao e necessario acessar o servidor manualmente."
Add-Code @"
[Seu PC]  --git push-->  [GitHub]  --GitHub Actions (rsync/SSH)-->  [Servidor Oracle]
   pasta: minhagaragem      repo: minhagaragem2                        /home/ubuntu/minhagaragem
"@

Add-Heading2 "2.2 Fluxo de Dados (Banco): Servidor -> PC"
Add-Para "O banco de dados de producao fica no servidor. Para desenvolver com os mesmos dados, voce copia (sincroniza) o banco do servidor para o seu PC. Isso e feito com um script."
Add-Code @"
[Servidor Oracle]  --mongodump-->  [arquivo]  --scp-->  [Seu PC]  --mongorestore-->  [MongoDB local]
   banco: minhagaragem                                                          banco: minhagaragem
"@

Add-Heading2 "2.3 Resumo dos ambientes"
Add-Table @("Ambiente", "Onde fica", "Pasta/Repo", "Uso") @(
    @("Producao", "Servidor Oracle (134.65.22.225)", "/home/ubuntu/minhagaragem", "Site ao vivo"),
    @("Central", "GitHub", "lucasteixeiragit/minhagaragem2", "Versao oficial do codigo"),
    @("Desenvolvimento", "Seu PC", "C:\Users\lucas\Documents\GitHub\minhagaragem", "Editar e testar")
)

# ============================================================
# 3. COMPONENTES
# ============================================================
Add-Heading1 "3. Componentes Envolvidos"

Add-Heading2 "3.1 No seu PC"
Add-Bullet "Pasta do projeto: C:\Users\lucas\Documents\GitHub\minhagaragem"
Add-Bullet "Node.js e npm instalados."
Add-Bullet "MongoDB local (servico MongoDB, porta 27017)."
Add-Bullet "MongoDB Database Tools (mongodump/mongorestore) em C:\Program Files\MongoDB\Tools\100\bin"
Add-Bullet "Chave SSH: C:\Users\lucas\.ssh\id_rsa"
Add-Bullet "Configuracao SSH: C:\Users\lucas\.ssh\config (alias 'oracle')"

Add-Heading2 "3.2 No GitHub"
Add-Bullet "Repositorio: lucasteixeiragit/minhagaragem2 (privado)."
Add-Bullet "Workflow de deploy: .github/workflows/deploy.yml"
Add-Bullet "Secrets (variaveis secretas): SERVER_HOST, SERVER_USER, SERVER_SSH_KEY"

Add-Heading2 "3.3 No servidor Oracle"
Add-Bullet "Pasta do projeto: /home/ubuntu/minhagaragem"
Add-Bullet "Servico systemd: minhagaragem (roda na porta 3000)."
Add-Bullet "MongoDB com banco 'minhagaragem'."
Add-Bullet "Ferramentas: mongodump, mongorestore, rsync."

Add-Heading2 "3.4 Arquivo .env (configuracao)"
Add-Para "O arquivo .env contem as variaveis de ambiente. Ele NAO e versionado no git (esta no .gitignore). Existe uma copia no PC e outra no servidor."
Add-Table @("Variavel", "Descricao") @(
    @("MONGODB_URI", "Endereco do banco MongoDB"),
    @("SESSION_SECRET", "Segredo das sessoes (nao compartilhar)"),
    @("NODEDE_ENV", "Ambiente (production/development)"),
    @("PORT", "Porta do servidor (3000)")
)

# ============================================================
# 4. DEPLOY AUTOMATICO
# ============================================================
Add-Heading1 "4. Como Funciona o Deploy Automatico"

Add-Heading2 "4.1 O que dispara o deploy"
Add-Para "O deploy acontece automaticamente toda vez que voce faz push de um commit para a branch 'main' do GitHub. Nao precisa fazer mais nada."

Add-Heading2 "4.2 O que o workflow faz"
Add-Para "O arquivo .github/workflows/deploy.yml define o processo. Ele tem dois passos:"
Add-Numbered "Sincronizar arquivos: usa rsync via SSH para copiar os arquivos do repositorio para /home/ubuntu/minhagaragem no servidor. Exclui node_modules, .env, .git e .abacusai (esses nao sao copiados)."
Add-Numbered "Instalar e reiniciar: roda 'npm install --omit=dev' e reinicia o servico 'minhagaragem' com 'sudo systemctl restart minhagaragem'."

Add-Heading2 "4.3 Onde ficam as credenciais do servidor"
Add-Para "O workflow nao contem o IP, usuario ou chave do servidor. Esses valores ficam nos Secrets do GitHub (Settings -> Secrets and variables -> Actions):"
Add-Table @("Secret", "Valor") @(
    @("SERVER_HOST", "134.65.22.225"),
    @("SERVER_USER", "ubuntu"),
    @("SERVER_SSH_KEY", "Conteudo do arquivo id_rsa")
)

Add-Heading2 "4.4 O que NAO e sincronizado no deploy"
Add-Bullet "node_modules (dependencias sao reinstaladas no servidor)."
Add-Bullet ".env (cada ambiente tem o seu)."
Add-Bullet ".git (o servidor nao rastreia git)."
Add-Bullet ".abacusai (configuracao local)."

# ============================================================
# 5. SINCRONIZACAO DO BANCO
# ============================================================
Add-Heading1 "5. Como Funciona a Sincronizacao do Banco de Dados"

Add-Heading2 "5.1 Conceito"
Add-Para "O banco de producao fica no servidor. Para desenvolver com os mesmos dados, voce copia o banco do servidor para o seu PC. Isso e uma copia pontual (snapshot): os dados locais passam a ser identicos aos do servidor no momento da copia."

Add-Heading2 "5.2 O script sync-banco.ps1"
Add-Para "O arquivo scripts/sync-banco.ps1 automatiza todo o processo em 4 passos:"
Add-Numbered "Dump no servidor: roda 'mongodump' no servidor, gerando uma copia do banco em /home/ubuntu/dump_sync."
Add-Numbered "Transferencia: usa 'scp' (via SSH) para copiar o dump do servidor para o seu PC."
Add-Numbered "Restore local: usa 'mongorestore --drop' para substituir o banco local pelos dados do servidor."
Add-Numbered "Limpeza: remove os arquivos temporarios nos dois lados."

Add-Heading2 "5.3 Importante sobre o --drop"
Add-Para "O script usa a opcao --drop, ou seja, ele APAGA o banco local e o substitui pelos dados do servidor. Qualquer alteracao que voce tenha feito no banco local sera perdida. Use apenas quando quiser que o banco local fique igual ao do servidor."

Add-Heading2 "5.4 Configuracoes do script"
Add-Para "No topo do script ha variaveis que podem ser ajustadas:"
Add-Table @("Variavel", "Valor padrao", "Descricao") @(
    @("SSH_HOST", "oracle", "Alias do servidor no ~/.ssh/config"),
    @("DB_NAME", "minhagaragem", "Nome do banco"),
    @("REMOTE_DIR", "/home/ubuntu/dump_sync", "Pasta temporaria no servidor"),
    @("LOCAL_DIR", "%TEMP%\dump_sync", "Pasta temporaria no PC"),
    @("MONGORESTORE", "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe", "Caminho da ferramenta")
)

# ============================================================
# 6. GUIA DE USO
# ============================================================
Add-Heading1 "6. Guia de Uso - Passo a Passo"

Add-Heading2 "6.1 Rodar o sistema localmente"
Add-Numbered "Abra o terminal na pasta do projeto: cd C:\Users\lucas\Documents\GitHub\minhagaragem"
Add-Numbered "Rode: npm run dev"
Add-Numbered "Acesse http://localhost:3000 no navegador."
Add-Para "O comando npm run dev usa o nodemon, que reinicia o servidor automaticamente a cada alteracao no codigo."

Add-Heading2 "6.2 Enviar alteracoes para o GitHub e o servidor (deploy)"
Add-Numbered "Edite os arquivos na pasta minhagaragem."
Add-Numbered "No terminal, rode: git add -A"
Add-Numbered "Rode: git commit -m ""descricao da alteracao"""
Add-Numbered "Rode: git push origin main"
Add-Numbered "Aguarde cerca de 1 minuto. O GitHub Actions sincroniza no servidor e reinicia o app."
Add-Numbered "Confira em https://minhagaragem.duckdns.org"
Add-Para "IMPORTANTE: edite SEMPRE na pasta minhagaragem. A pasta minhagaragem2 e uma copia antiga e nao deve ser usada."

Add-Heading2 "6.3 Sincronizar o banco do servidor para o PC"
Add-Numbered "No terminal, na pasta do projeto, rode: powershell -ExecutionPolicy Bypass -File scripts\sync-banco.ps1"
Add-Numbered "Aguarde a conclusao (o script mostra cada passo)."
Add-Numbered "O banco local agora tem os mesmos dados do servidor."

Add-Heading2 "6.4 Rodar os testes"
Add-Numbered "No terminal, na pasta do projeto, rode: npm test"
Add-Para "Recomenda-se rodar os testes antes de dar push, para evitar que erros cheguem ao servidor."

# ============================================================
# 7. SOLUCAO DE PROBLEMAS
# ============================================================
Add-Heading1 "7. Solucao de Problemas"

Add-Heading2 "7.1 O servico caiu no servidor apos o deploy"
Add-Para "Verifique os logs do servico:"
Add-Code "ssh oracle ""journalctl -u minhagaragem --no-pager -n 50"""
Add-Para "Se houver erro de sintaxe em algum arquivo, corrija no PC, rode os testes, e faca push novamente."

Add-Heading2 "7.2 O npm run dev nao funciona"
Add-Para "Geralmente e o nodemon faltando. Rode: npm install"
Add-Para "Se o erro persistir, verifique se o MongoDB local esta rodando (servico 'MongoDB')."

Add-Heading2 "7.3 O deploy falha no GitHub Actions"
Add-Para "Verifique a aba 'Actions' do repositorio no GitHub. Causas comuns:"
Add-Bullet "Secrets nao configurados (SERVER_HOST, SERVER_USER, SERVER_SSH_KEY)."
Add-Bullet "Chave SSH invalida ou expirada."
Add-Bullet "Servidor inacessivel."

Add-Heading2 "7.4 O banco local nao atualiza"
Add-Para "Rode o script de sincronizacao novamente. Se falhar, verifique:"
Add-Bullet "A conexao SSH com o servidor (ssh oracle)."
Add-Bullet "Se o MongoDB local esta rodando."
Add-Bullet "Se o MongoDB Database Tools esta instalado."

Add-Heading2 "7.5 Erro de sintaxe em arquivo JS"
Add-Para "Antes de dar push, valide a sintaxe: node --check caminho\do\arquivo.js"
Add-Para "E rode os testes: npm test"

# ============================================================
# 8. SEGURANCA
# ============================================================
Add-Heading1 "8. Seguranca"

Add-Heading2 "8.1 O que NAO deve ir para o GitHub"
Add-Bullet ".env (contem SESSION_SECRET e credenciais)."
Add-Bullet "Chave SSH (id_rsa)."
Add-Bullet "Arquivo ~/.ssh/config (contem o IP do servidor)."
Add-Para "O .gitignore ja protege o .env e o node_modules. Nao adicione esses arquivos ao git manualmente."

Add-Heading2 "8.2 O script sync-banco.ps1 e seguro"
Add-Para "O script usa apenas o alias 'oracle' e nao contem IP, chave ou senha. As informacoes sensiveis ficam no ~/.ssh/config e na chave id_rsa, que nao sao versionados. O repositorio e privado, o que reduz ainda mais o risco."

Add-Heading2 "8.3 Boas praticas"
Add-Bullet "Mantenha o repositorio privado."
Add-Bullet "Nunca cole a chave SSH ou o SESSION_SECRET em arquivos versionados."
Add-Bullet "Se a chave SSH for exposta, gere uma nova e atualize o secret SERVER_SSH_KEY no GitHub."

# ============================================================
# 9. REFERENCIA RAPIDA
# ============================================================
Add-Heading1 "9. Referencia Rapida de Comandos"
Add-Table @("Comando", "O que faz") @(
    @("npm run dev", "Roda o servidor localmente (com nodemon)"),
    @("npm test", "Roda os testes do projeto"),
    @("git add -A", "Prepara todas as alteracoes para commit"),
    @("git commit -m ""msg""", "Cria o commit"),
    @("git push origin main", "Envia para o GitHub e dispara o deploy"),
    @("powershell -ExecutionPolicy Bypass -File scripts\sync-banco.ps1", "Sincroniza o banco do servidor para o PC"),
    @("ssh oracle", "Abre terminal no servidor"),
    @("ssh oracle ""systemctl status minhagaragem""", "Verifica o status do servico no servidor"),
    @("ssh oracle ""journalctl -u minhagaragem -n 50""", "Ve os logs do servico")
)

Add-Para ""
Add-Para "Fim da documentacao."

# ============================================================
# SALVA E FECHA
# ============================================================
$doc.SaveAs([ref]$OUTPUT, [ref]16) # 16 = wdFormatDocumentDefault (.docx)
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "Documentacao gerada em: $OUTPUT" -ForegroundColor Green
