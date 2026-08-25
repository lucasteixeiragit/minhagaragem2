# ============================================================
# SCRIPT: gerar-o2.ps1
# DESCRICAO: Gera os dois documentos da O2 (Lean Inception)
#            - O2_Lean_Inception.docx (entregavel completo)
#            - O2_Miro_Guide.docx (guia de transposicao para Miro)
# USO: powershell -ExecutionPolicy Bypass -File docs\gerar-o2.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$OUT_DIR = "C:\Users\lucas\Documents\GitHub\minhagaragem\docs"
$OUT_MAIN = "$OUT_DIR\O2_Lean_Inception.docx"
$OUT_MIRO = "$OUT_DIR\O2_Miro_Guide.docx"

$STYLE_TITLE     = -63
$STYLE_SUBTITLE  = -75
$STYLE_H1        = -2
$STYLE_H2        = -3
$STYLE_H3        = -4
$STYLE_NORMAL    = -1
$STYLE_BULLET    = -49
$STYLE_NUMBER    = -50
$STYLE_TABLEGRID = -155

$word = New-Object -ComObject Word.Application
$word.Visible = $false

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

function Add-Table($headers, $rows) {
    $table = $doc.Tables.Add($sel.Range, $rows.Count + 1, $headers.Count)
    $table.Borders.Enable = $true
    $table.Style = $doc.Styles.Item($STYLE_TABLEGRID)

    for ($i = 0; $i -lt $headers.Count; $i++) {
        $table.Cell(1, $i + 1).Range.Text = [string]$headers[$i]
        $table.Cell(1, $i + 1).Range.Bold = $true
    }

    for ($r = 0; $r -lt $rows.Count; $r++) {
        for ($c = 0; $c -lt $rows[$r].Count; $c++) {
            $table.Cell($r + 2, $c + 1).Range.Text = [string]$rows[$r][$c]
        }
    }
    $sel.TypeParagraph()
}

function Add-PageBreak() {
    $sel.InsertBreak([ref]7)
}

function New-Document() {
    $script:doc = $word.Documents.Add()
    $script:sel = $word.Selection
    $doc.PageSetup.LeftMargin = 72
    $doc.PageSetup.RightMargin = 72
    $doc.PageSetup.TopMargin = 72
    $doc.PageSetup.BottomMargin = 72
}

function Save-Document($path) {
    $doc.SaveAs([ref]$path, [ref]16)
    $doc.Close()
}

# ============================================================
# DOCUMENTO 1: ENTREGAVEL O2
# ============================================================
New-Document

Set-Style $STYLE_TITLE
$sel.TypeText("MINHA GARAGEM")
$sel.TypeParagraph()
Set-Style $STYLE_SUBTITLE
$sel.TypeText("Atividade Online O2 - Consolidacao das Atividades 1-4 do Lean Inception")
$sel.TypeParagraph()
Set-Style $STYLE_NORMAL
$sel.TypeText("Disciplina: Projeto - Inovacoes Tecnologicas")
$sel.TypeParagraph()
$sel.TypeText("Professor: Dr. Joao Batista Mossmann")
$sel.TypeParagraph()
$sel.TypeText("Equipe: Lucas Teixeira, Arthur Diogo Maria, Eric Arruda, Alisson Schmidt, Vithor Oliveira")
$sel.TypeParagraph()
$sel.TypeText("Data: agosto de 2026")
$sel.TypeParagraph()
$sel.TypeParagraph()

Add-Heading1("1. Visao do Produto v2")
Add-Heading2("1.1 Visao refinada")
Add-Para('Para motoristas urbanos que nao tem conhecimento tecnico sobre veiculos e dependem da memoria ou do mecanico para lembrar das revisoes, o Minha Garagem e um aplicativo web de controle de manutencao veicular que traduz o manual do fabricante em lembretes automaticos e historico organizado. Diferente de apps genericos de controle de gastos (como Drivvo e Fuelio), que exigem cadastro manual e nao orientam sobre intervalos preventivos, o Minha Garagem sugere automaticamente quando trocar oleo, filtros, pneus e outros itens com base na quilometragem e no tempo, reduzindo o risco de manutencoes corretivas inesperadas.')

Add-Heading2("1.2 Changelog v1 para v2")
Add-Numbered('Campo "publico-alvo": de "Pessoas com veiculos" para "motoristas urbanos que nao tem conhecimento tecnico". Evidencia: entrevistas E1, E2 e E3 mostraram usuarios que nao entendem de mecanica e delegam decisoes ao mecanico.')
Add-Numbered('Campo "categoria": de "Sistema Web/App" para "aplicativo web de controle de manutencao veicular". Racional: definicao mais precisa da categoria do produto.')
Add-Numbered('Campo "diferencial": de "nao notifica os usuarios" para "apps genericos de controle de gastos (Drivvo, Fuelio)". Evidencia: Desk Research UseMobile (2024) mostrou que solucoes existentes sao complexas e focadas em gastos, nao em orientacao preventiva.')
Add-Numbered('Campo "beneficio": de "ajuda a prevenir manutencoes corretivas" para "sugere automaticamente quando trocar itens com base na quilometragem e no tempo". Evidencia: Webmotors (2024) - 54% dos motoristas so levam o carro a oficina ao notar ruidos ou comportamentos anormais.')
Add-PageBreak

Add-Heading1("2. Matriz E / Nao E / Faz / Nao Faz v2")
Add-Heading2("2.1 Matriz refinada")
Add-Table(
    @("E", "Nao E"),
    @(
        @("Aplicativo web de controle de manutencao veicular", "Substituto do mecanico ou profissional da area"),
        @("Organizador de historico de manutencoes e notas fiscais", "Garantidor de que o veiculo nao tera problemas"),
        @("Assistente de lembretes preventivos baseados no manual do fabricante", "Rede social ou chat entre motoristas"),
        @("Ferramenta de gestao de gastos com manutencao", "Concessionaria ou oficina mecanica")
    )
)
Add-Table(
    @("Faz", "Nao Faz"),
    @(
        @("Cadastra veiculos e registra manutencoes realizadas", "Agenda horario na oficina (fora do escopo do MVP)"),
        @("Notifica o usuario sobre proximas manutencoes preventivas", "Indica ou recomenda mecanicos especificos"),
        @("Calcula intervalos de manutencao por KM e tempo", "Processa pagamentos entre usuario e oficina"),
        @("Armazena notas fiscais e historico do veiculo", "Garante o funcionamento do veiculo"),
        @("Exibe o status de urgencia de cada manutencao", "Dispensa a opiniao de um profissional")
    )
)

Add-Heading2("2.2 Changelog v1 para v2")
Add-Numbered('Item "APP Mobile" removido do quadrante E: o MVP e web responsivo, nao app nativo (decisao tecnica da equipe).')
Add-Numbered('Item "Gratuito" removido: nao e diferencial estrategico e nao foi confirmado nas pesquisas.')
Add-Numbered('Item "Chat" movido para Nao E: nao e funcao central do produto.')
Add-Numbered('Item "Indica profissionais especificos" adicionado ao Nao Faz: Andressa (E2) mencionou confiar no mecanico de confianca, mas a equipe decidiu nao incluir indicacao de terceiros no MVP.')
Add-Numbered('Itens "Marca horario na oficina" e "gerencia pagamentos" mantidos no Nao Faz: escopo deliberadamente reduzido para o MVP.')
Add-PageBreak

Add-Heading1("3. Objetivos do Produto")
Add-Heading2("3.1 Objetivos refinados (mensuraveis)")
Add-Table(
    @("ID", "Objetivo (mensuravel)", "Evidencia na O1"),
    @(
        @("Obj-1", "Reduzir para menos de 2 minutos o tempo de registrar uma nova manutencao, para 80% dos usuarios.", "E2 (Andressa): 'Ja tentei usar um app, mas achei complicado e desisti.' UseMobile (2024): complexidade e barreira de adocao."),
        @("Obj-2", "Garantir que 90% dos lembretes de manutencao preventiva sejam enviados antes que o veiculo atinja o KM limite ou a data limite.", "Webmotors (2024): 54% agem so ao notar problema. E1 (Matheus): 'Se eu tivesse um lembrete, evitaria quebrar.'"),
        @("Obj-3", "Manter 100% das notas fiscais de manutencao anexadas e acessiveis no historico do veiculo.", "E1 (Matheus): 'Anoto num caderninho... esqueco de olhar.' E3 (Juliano): 'Tenho um caderno, mas nao sou organizado.'"),
        @("Obj-4", "Atingir taxa de retorno de 40% dos usuarios no segundo acesso, em ate 30 dias apos o cadastro.", "E2 (Andressa): 'Ja tentei usar um app, mas achei complicado e desisti.' Insight 4: complexidade e barreira real de abandono.")
    )
)
Add-Para("Foram mantidos 4 objetivos, respeitando a recomendacao de 3 a 5 objetivos e garantindo foco no MVP.")
Add-PageBreak

Add-Heading1("4. Personas")
Add-Heading2("4.1 Persona 1 - Matheus (primaria)")
Add-Para("Perfil: Matheus, 28 anos, trabalha com entregas e usa o carro diariamente para o trabalho. Nao tem conhecimento tecnico sobre mecanica.")
Add-Heading3("Objetivos")
Add-Bullet("Evitar quebras inesperadas que prejudiquem seu trabalho.")
Add-Bullet("Ter um controle simples que nao exija que ele consulte um caderno.")
Add-Bullet("Saber quando trocar oleo, correia e outros itens sem depender so do mecanico.")
Add-Heading3("Frustracoes")
Add-Bullet('"Eu so levo o carro no mecanico quando ele comeca a fazer barulho ou quando o oleo acende a luz." (E1)')
Add-Bullet('"Uma vez esqueci de trocar a correia e o carro quebrou no meio da estrada. Foi um prejuizo grande." (E1)')
Add-Bullet('"Anoto num caderninho quando troco o oleo, mas esqueco de olhar. O caderno fica no porta-luvas e eu nunca abro." (E1)')
Add-Heading3("Citacao")
Add-Para('"Se eu tivesse um lembrete, evitaria quebrar. O barato que eu nao gastei na revisao, paguei caro depois." (E1)')
Add-Heading3("Cenario de uso")
Add-Para("E segunda-feira de manha e Matheus acabou de chegar em casa apos uma noite de entregas. Ao estacionar, o celular vibra com uma notificacao do Minha Garagem: 'Troca de oleo do motor prevista para os proximos 15 dias ou 1.200 km'. Ele abre o app, ve que a ultima troca foi registrada ha 8 meses e que o sistema ja calculou o intervalo com base na quilometragem que ele digitou na semana passada. Em poucos toques, ele marca a troca como agendada. Sem precisar abrir o caderno nem ligar para o mecanico, ele se sente tranquilo porque sabe que nao vai esquecer de novo.")

Add-PageBreak

Add-Heading2("4.2 Persona 2 - Andressa (primaria)")
Add-Para("Perfil: Andressa, 41 anos, usa o carro para levar os filhos a escola e para o trabalho. Dirige ha mais de 10 anos, mas nao entende de mecanica.")
Add-Heading3("Objetivos")
Add-Bullet("Ter seguranca de que o carro esta em dia para proteger a familia.")
Add-Bullet("Saber se esta pagando preco justo nas manutencoes.")
Add-Bullet("Ter um historico organizado para consultar quando precisar.")
Add-Heading3("Frustracoes")
Add-Bullet('"Dependo do mecanico me avisar. Ele e de confianca, entao eu sigo o que ele fala." (E2)')
Add-Bullet('"Ja adiei a troca de pneus porque achei que dava para esperar. Na chuva, o carro derrapou e levei um susto." (E2)')
Add-Bullet('"Ja tentei usar um app, mas achei complicado e desisti." (E2)')
Add-Heading3("Citacao")
Add-Para('"Um controle organizado me daria mais seguranca e evitaria sustos, principalmente com crianca no carro." (E2)')
Add-Heading3("Cenario de uso")
Add-Para("E sexta-feira a tarde e Andressa esta no estacionamento do trabalho, esperando o filho sair da escola. Ela abre o Minha Garagem no celular e ve um alerta laranja: 'Atencao: troca de pneus prevista para os proximos 30 dias'. O app mostra a foto da nota fiscal da ultima troca, a quilometragem e uma estimativa de quantos dias faltam no ritmo dela. Ela se sente aliviada porque tem tempo de programar a troca no fim de semana seguinte, sem depender de lembrar sozinha. Ela compartilha o historico com o marido pelo WhatsApp antes de ligar o carro.")

Add-PageBreak

Add-Heading1("5. Distribuicao do trabalho em equipe")
Add-Table(
    @("Momento", "Atividade", "Duracao", "Responsaveis"),
    @(
        @("1", "Reuniao inicial: releitura dos artefatos P2 + revisao das entrevistas e Desk Research", "45 min", "Toda a equipe"),
        @("2", "Tarefa 1 (Visao) + Tarefa 2 (Matriz)", "60 min", "Lucas, Arthur, Eric"),
        @("3", "Tarefa 3 (Objetivos)", "45 min", "Alisson, Vithor"),
        @("4", "Tarefa 4 (Personas) + cenarios narrativos", "60 min", "Toda a equipe"),
        @("5", "Lista de verificacao + atualizacao no Miro", "30 min", "Toda a equipe")
    )
)
Add-PageBreak

Add-Heading1("6. Lista de verificacao antes de enviar")
Add-Numbered("A Visao v2 segue o formato completo ('Para... que... o... e... que... Diferente de... o nosso produto...').")
Add-Numbered("A Visao v2 contem ao menos uma citacao de entrevista no changelog.")
Add-Numbered("A Visao esta identificada como Visao v2 no board do Miro.")
Add-Numbered("Todos os quatro quadrantes da matriz tem ao menos 3 itens.")
Add-Numbered('Os quadrantes "Nao E" e "Nao Faz" referenciam expectativas reais dos entrevistados, com identificacao (En).')
Add-Numbered("A matriz tem changelog de alteracoes em relacao a versao P2.")
Add-Numbered("Ha entre 3 e 5 objetivos, cada um mensuravel (contem metrica observavel: tempo, porcentagem, frequencia, numero de passos).")
Add-Numbered("Cada objetivo tem evidencia explicita da O1 (citacao ou padrao identificado nas entrevistas).")
Add-Numbered("Ha ao menos 2 personas completas, cada uma com todos os campos obrigatorios preenchidos.")
Add-Numbered("Cada persona tem cenario de uso narrativo (paragrafo corrido de 5-8 frases, nao lista).")
Add-Numbered("Os quatro artefatos contam a mesma historia: o usuario das Personas justifica a Visao; os Objetivos resolvem as dores das Personas; a matriz E/Nao E e coerente com a Visao.")
Add-Numbered("Todos os frames estao atualizados no board do Miro antes do inicio da aula P3_LI.")
Add-PageBreak

Add-Heading1("7. Referencias")
Add-Para("Caroli, P. (2018). Lean Inception: Como alinhar pessoas e construir o produto certo. Editora Caroli, Sao Paulo.")
Add-Para("Costa Valentim, N. M., Silva, W., and Conte, T. (2017). The students' perspectives on applying design thinking for the design of mobile applications. In 2017 IEEE/ACM 39th International Conference on Software Engineering: Software Engineering Education and Training Track (ICSE-SEET), pages 77-86.")
Add-Para("Ferreira, V. G. and Canedo, E. D. (2020). A design sprint based model for user experience concern in project-based learning software development. In 2020 IEEE Frontiers in Education Conference (FIE), pages 1-9.")
Add-Para("Schon, E.-M., Thomaschewski, J., and Escalona, M. J. (2020). Lean user research for agile organizations. IEEE Access, 8:129763-129773.")

Save-Document $OUT_MAIN
Write-Host "Documento principal gerado: $OUT_MAIN" -ForegroundColor Green

# ============================================================
# DOCUMENTO 2: GUIA DE TRANSPOCICAO PARA O MIRO
# ============================================================
New-Document

Set-Style $STYLE_TITLE
$sel.TypeText("GUIA DE TRANSPOCICAO PARA O MIRO")
$sel.TypeParagraph()
Set-Style $STYLE_SUBTITLE
$sel.TypeText("Atividade Online O2 - Minha Garagem")
$sel.TypeParagraph()
Set-Style $STYLE_NORMAL
$sel.TypeText("Instrucoes para organizar os 4 artefatos no board do Miro antes da aula P3_LI.")
$sel.TypeParagraph()
$sel.TypeText("Este documento e separado do entregavel principal e deve ser usado como checklist de montagem no Miro.")
$sel.TypeParagraph()
$sel.TypeParagraph()

Add-Heading1("Estrutura geral do board")
Add-Para("Crie um frame principal chamado 'O2 - Lean Inception v2' e, dentro dele, 4 subframes organizados da esquerda para a direita:")
Add-Numbered("Frame 1: Visao do Produto v2")
Add-Numbered("Frame 2: Matriz E / Nao E / Faz / Nao Faz v2")
Add-Numbered("Frame 3: Objetivos do Produto")
Add-Numbered("Frame 4: Personas")
Add-Para("Sugestao de cor de fundo dos frames: cinza escuro (#161616) com bordas vermelhas (#E63946) para manter a identidade visual do projeto Minha Garagem.")

Add-PageBreak

Add-Heading1("Frame 1: Visao do Produto v2")
Add-Heading2("Elementos a incluir")
Add-Bullet("1 sticky note grande (titulo): 'VISAO DO PRODUTO v2'")
Add-Bullet("1 sticky note de destaque (amarelo ou vermelho) com a frase da Visao completa.")
Add-Bullet("1 sticky note ou secao de 'Changelog v1 para v2' com os 4 itens de alteracao.")
Add-Bullet("1 sticky note de evidencia destacando as citacoes: E1, E2, E3, Webmotors (2024) e UseMobile (2024).")
Add-Heading2("Dica de organizacao")
Add-Para("Deixe a frase da Visao no centro, com o changelog abaixo e as evidencias ao lado. Use setas para conectar cada alteracao do changelog a fonte de evidencia correspondente.")

Add-PageBreak

Add-Heading1("Frame 2: Matriz E / Nao E / Faz / Nao Faz v2")
Add-Heading2("Elementos a incluir")
Add-Bullet("Titulo: 'MATRIZ E / NAO E / FAZ / NAO FAZ v2'")
Add-Bullet("4 quadrantes organizados como uma tabela 2x2:")
Add-Bullet("Quadrante superior esquerdo: E (4 itens)")
Add-Bullet("Quadrante superior direito: Nao E (4 itens)")
Add-Bullet("Quadrante inferior esquerdo: Faz (5 itens)")
Add-Bullet("Quadrante inferior direito: Nao Faz (5 itens)")
Add-Bullet("Sticky note separado abaixo da matriz: 'Changelog v1 para v2' com 5 itens.")
Add-Heading2("Dica de organizacao")
Add-Para("Use cores diferentes para cada quadrante (ex: E = verde claro, Nao E = vermelho claro, Faz = azul claro, Nao Faz = laranja). Mantenha o mesmo tamanho de sticky notes para cada quadrante. Inclua uma legenda explicando que 'E' responde 'Que tipo de produto e este?' e 'Faz' responde 'O que o produto consegue fazer?'")

Add-PageBreak

Add-Heading1("Frame 3: Objetivos do Produto")
Add-Heading2("Elementos a incluir")
Add-Bullet("Titulo: 'OBJETIVOS DO PRODUTO'")
Add-Bullet("4 cards retangulares, um para cada objetivo (Obj-1 a Obj-4).")
Add-Bullet("Cada card deve conter: ID, objetivo mensuravel, metrica e evidencia da O1.")
Add-Bullet("1 sticky note de destaque com a frase: 'Todos os objetivos sao mensuraveis e ancorados em evidencias da O1.'")
Add-Heading2("Modelo de card para cada objetivo")
Add-Para("Obj-1")
Add-Para("Reduzir para menos de 2 minutos o tempo de registrar uma nova manutencao, para 80% dos usuarios.")
Add-Para("Evidencia: E2 (Andressa) + UseMobile (2024)")
Add-Heading2("Dica de organizacao")
Add-Para("Alinhe os 4 cards horizontalmente. Abaixo de cada card, coloque um pequeno sticky note com a citacao ou dado da pesquisa que justifica o objetivo.")

Add-PageBreak

Add-Heading1("Frame 4: Personas")
Add-Heading2("Elementos a incluir")
Add-Bullet("Titulo: 'PERSONAS'")
Add-Bullet("2 cards grandes (um para cada persona): Matheus e Andressa.")
Add-Bullet("Cada card deve conter os campos: Perfil, Objetivos, Frustracoes, Citacao e Cenario de uso.")
Add-Bullet("Use icones ou fotos genericas para representar cada persona.")
Add-Heading2("Modelo de card para cada persona")
Add-Para("MATHEUS - 28 anos, entregador")
Add-Para("Perfil: ...")
Add-Para("Objetivos: ...")
Add-Para("Frustracoes: ...")
Add-Para("Citacao: ...")
Add-Para("Cenario de uso: ...")
Add-Heading2("Dica de organizacao")
Add-Para("Coloque as duas personas lado a lado. Use uma cor para cada uma (ex: Matheus = azul, Andressa = verde). Destaque a citacao em um sticky note de cor diferente para chamar atencao. O cenario de uso deve ocupar um espaco maior, pois e narrativo.")

Add-PageBreak

Add-Heading1("Checklist final de montagem no Miro")
Add-Numbered("Criar o frame principal 'O2 - Lean Inception v2'.")
Add-Numbered("Criar os 4 subframes com os titulos corretos.")
Add-Numbered("Inserir a Visao como frase completa no Frame 1.")
Add-Numbered("Inserir a matriz 2x2 no Frame 2, com 4 itens em cada quadrante.")
Add-Numbered("Inserir 4 cards de objetivos no Frame 3, todos mensuraveis.")
Add-Numbered("Inserir 2 cards de personas no Frame 4, com cenarios narrativos.")
Add-Numbered("Adicionar changelogs e evidencias da O1 em todos os frames aplicaveis.")
Add-Numbered("Revisar coerencia interna entre os 4 artefatos.")
Add-Numbered("Compartilhar o link do board com todos os integrantes e com o professor.")

Save-Document $OUT_MIRO
Write-Host "Guia Miro gerado: $OUT_MIRO" -ForegroundColor Green

$word.Quit()
Write-Host "Concluido." -ForegroundColor Green
