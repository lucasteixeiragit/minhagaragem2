# ============================================================
# ARQUIVO: scripts/gerar-prompts-manuais.py
# DESCRIÇÃO: Gera documento DOCX com um prompt pronto por versão/câmbio
# ============================================================
# Lê o JSON exportado da coleção 'fabricantes' e monta um documento
# com um prompt completo por versão/câmbio, já com o catálogo embutido.
#
# USO:
#   python scripts/gerar-prompts-manuais.py <entrada.json> <saida.docx>
#
# LIGADO A:
#   - scripts/seed-fabricantes.js → origem dos dados da coleção
#   - src/js/models/Fabricante.js → estrutura marca/modelo/versao/cambio/intervalos
# ============================================================

import json
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

entrada = sys.argv[1]
saida = sys.argv[2]

with open(entrada, encoding='utf-8') as arquivo:
    fabricantes = json.load(arquivo)

# ---------- Modelo do prompt ----------
CABECALHO_PROMPT = """Você é um engenheiro automotivo especializado em manutenção preventiva, com acesso a busca na web. Sua tarefa é LOCALIZAR o manual oficial do fabricante e extrair a tabela de manutenção preventiva, citando a fonte de cada valor.

ESCOPO DESTA EXECUÇÃO
Um único veículo. Não processe outros modelos nesta resposta.

VEÍCULO
Marca: {marca}
Modelo: {modelo}
Versão: {versao}
Motor: {motor}
Câmbio: {cambio} ({marchas} marchas)
Anos-modelo: {anos}

ETAPA 1 — BUSCA (obrigatória e documentada)
Execute buscas na web para localizar o manual do proprietário ou o plano de manutenção oficial deste veículo no mercado brasileiro. Use variações como:
- "manual do proprietário {marca} {modelo} {ano_ini} pdf"
- "plano de manutenção {marca} {modelo} tabela de revisão"
- "site:<domínio oficial da marca> manual {modelo}"
- "boletim técnico {marca} {modelo} intervalo de troca"

Registre TODAS as buscas que fizer e TODAS as URLs que abrir, mesmo as que não deram resultado.

ETAPA 2 — EXTRAÇÃO
Do documento localizado, extraia a tabela de manutenção preventiva. Para cada item, copie o valor exato do manual. Se o manual apresentar a tabela em km e em meses, registre os dois. Se apresentar apenas um, registre o outro como null e explique.

ETAPA 3 — COMPARAÇÃO
Compare com o catálogo atual abaixo e classifique cada item como: confirmado, corrigido, removido (item não existe no veículo) ou nao_localizado.

CATÁLOGO ATUAL
{json_catalogo}

REGRAS DE EVIDÊNCIA
- Só use confianca "alta" se tiver aberto o documento e puder citar página ou seção.
- Só use confianca "media" se tiver documento oficial do fabricante que não seja o manual do proprietário.
- Para usar "nao_localizado", você precisa ter listado ao menos 3 buscas distintas na Etapa 1. Sem isso, a resposta é inválida.
- É proibido inventar página, seção, edição ou URL. Se não abriu o documento, diga que não abriu.
- É proibido copiar valores de outro modelo ou versão por semelhança.
- Se o manual que encontrar cobrir apenas parte dos anos informados, diga explicitamente quais anos ele cobre.

FORMATO DE SAÍDA

PARTE 1 — EVIDÊNCIA DE BUSCA
Tabela markdown:
| # | Consulta executada | URL aberta | Resultado |
|---|---|---|---|
| 1 | ... | ... | manual localizado / 404 / bloqueado / não é o modelo correto |

PARTE 2 — DOCUMENTO LOCALIZADO
- Título completo do documento
- Fabricante e ano de edição
- URL direta do PDF ou da página
- Anos-modelo cobertos pelo documento
- Trecho literal da tabela de manutenção (copie o texto, não parafraseie)

PARTE 3 — COMPARAÇÃO
Tabela markdown:
| Chave | Item | Catálogo (km/meses) | Manual (km/meses) | Classificação | Página/Seção |
|---|---|---|---|---|---|

PARTE 4 — JSON CORRIGIDO
Um objeto JSON, sem texto antes ou depois, sem bloco markdown, neste formato:

{{
  "marca": "{marca}",
  "modelo": "{modelo}",
  "versao": "{versao}",
  "motor": "{motor}",
  "cambios": [
    {{
      "tipo": "{cambio}",
      "marchas": "{marchas}",
      "intervalos": {{
        "trocaOleo": {{
          "nome": "Troca de óleo do motor",
          "intervaloKm": 10000,
          "intervaloMeses": 12,
          "descricao": "Óleo e filtro de óleo do motor",
          "fonte": "Manual do Proprietário {modelo} {ano_ini}, seção Manutenção Preventiva, p. <N>",
          "confianca": "alta"
        }}
      }}
    }}
  ],
  "documento": {{
    "titulo": "...",
    "url": "...",
    "anoEdicao": {ano_ini},
    "anosCobertos": {anos}
  }}
}}

VALIDAÇÕES ANTES DE RESPONDER
- A Parte 1 tem ao menos 3 linhas.
- Se alguma linha da Parte 3 tem confianca "alta", a Parte 2 tem URL e trecho literal.
- Todo intervaloKm e intervaloMeses é inteiro positivo ou null.
- Nenhuma chave de intervalos tem acento, espaço, hífen ou maiúscula inicial.
- Todo intervalo tem as 6 propriedades: nome, intervaloKm, intervaloMeses, descricao, fonte, confianca.
- O JSON é parseável por JSON.parse sem ajustes.
- Se você não localizou o manual, diga isso na primeira linha da resposta e entregue apenas as Partes 1 e 3, sem JSON.

Comece pela Etapa 1 e mostre as buscas antes de concluir qualquer coisa."""

# ---------- Coleta as versões/câmbios ----------
itens = []
for marca in fabricantes:
    for modelo in marca.get('modelos', []):
        for versao in modelo.get('versoes', []):
            for cambio in versao.get('cambios', []):
                itens.append({
                    'marca': marca.get('marca', ''),
                    'modelo': modelo.get('nome', ''),
                    'versao': versao.get('nome', ''),
                    'motor': versao.get('motor', ''),
                    'anos': versao.get('anos', []),
                    'cambio': cambio.get('tipo', ''),
                    'marchas': cambio.get('marchas', ''),
                    'intervalos': cambio.get('intervalos', {}),
                })

itens.sort(key=lambda x: (x['marca'], x['modelo'], x['versao']))

# ---------- Documento ----------
doc = Document()
estilo = doc.styles['Normal']
estilo.font.name = 'Calibri'
estilo.font.size = Pt(10)

for secao in doc.sections:
    secao.top_margin = Cm(2)
    secao.bottom_margin = Cm(2)
    secao.left_margin = Cm(2)
    secao.right_margin = Cm(2)


def sombrear(paragrafo, cor):
    elemento = OxmlElement('w:shd')
    elemento.set(qn('w:val'), 'clear')
    elemento.set(qn('w:fill'), cor)
    paragrafo._p.get_or_add_pPr().append(elemento)


# ---------- Capa ----------
titulo = doc.add_paragraph()
titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = titulo.add_run('Prompts de conferência de manuais')
run.bold = True
run.font.size = Pt(22)
run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

subtitulo = doc.add_paragraph()
subtitulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitulo.add_run(f'{len(itens)} prompts prontos para colar no Gemini')
run.font.size = Pt(13)
run.font.color.rgb = RGBColor(0x59, 0x59, 0x59)

doc.add_paragraph()

instrucoes = [
    ('Como usar', True),
    ('', False),
    (f'Este documento tem {len(itens)} prompts, um por versão/câmbio. Cada um é autossuficiente: já traz os dados do veículo e o catálogo atual embutido.', False),
    ('', False),
    ('1. Abra uma conversa nova no Gemini para cada prompt. Não reaproveite a mesma conversa entre veículos.', False),
    ('2. Localize o prompt pelo número no índice abaixo.', False),
    ('3. Selecione o bloco inteiro, do início ("Você é um engenheiro automotivo...") até a última linha ("...antes de concluir qualquer coisa.").', False),
    ('4. Cole no Gemini e envie.', False),
    ('5. Guarde a resposta. A Parte 4 de cada resposta é o JSON que será importado no banco.', False),
    ('', False),
    ('Atenção ao copiar', True),
    ('', False),
    ('O bloco do prompt está em fonte monoespaçada justamente para preservar aspas retas e chaves. Ao colar no Word antes de copiar, desative a autocorreção de aspas, ou copie direto deste documento.', False),
    ('', False),
    ('O que fazer com as respostas', True),
    ('', False),
    ('Se a Parte 1 vier com menos de 3 buscas, ou se todas as URLs estiverem como "não abriu", descarte a resposta e não importe.', False),
    ('Se o Gemini disser que não localizou o manual, a resposta correta é apenas as Partes 1 e 3, sem JSON.', False),
    ('', False),
    ('Procedência atual do catálogo', True),
    ('', False),
    ('Todos os intervalos no banco estão com confianca "baixa" e fonte declarando estimativa de mercado. Nenhum foi conferido contra manual oficial. Estes prompts existem para corrigir isso.', False),
]
for texto, negrito in instrucoes:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(texto)
    if negrito:
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

# ---------- Índice ----------
doc.add_page_break()
p = doc.add_paragraph()
run = p.add_run('Índice')
run.bold = True
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

tabela = doc.add_table(rows=1, cols=6)
tabela.style = 'Table Grid'
tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
cabecalhos = ['#', 'Marca', 'Modelo', 'Versão', 'Câmbio', 'Intervalos']
larguras = [Cm(1.2), Cm(2.6), Cm(2.8), Cm(4.4), Cm(2.6), Cm(2.0)]

for indice, texto in enumerate(cabecalhos):
    celula = tabela.rows[0].cells[indice]
    celula.text = ''
    paragrafo = celula.paragraphs[0]
    run = paragrafo.add_run(texto)
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    sombrear(paragrafo, '1F3864')
    celula.width = larguras[indice]

for numero, item in enumerate(itens, start=1):
    linha = tabela.add_row()
    valores = [
        f'{numero:02d}',
        item['marca'],
        item['modelo'],
        item['versao'],
        item['cambio'],
        str(len(item['intervalos'])),
    ]
    for indice, valor in enumerate(valores):
        celula = linha.cells[indice]
        celula.text = ''
        paragrafo = celula.paragraphs[0]
        run = paragrafo.add_run(valor)
        run.font.size = Pt(9)
        celula.width = larguras[indice]

# ---------- Prompts ----------
for numero, item in enumerate(itens, start=1):
    doc.add_page_break()

    anos = item['anos']
    ano_ini = anos[0] if anos else ''
    anos_texto = ', '.join(str(a) for a in anos)

    cabecalho = doc.add_paragraph()
    run = cabecalho.add_run(f'Prompt {numero:02d} — {item["marca"]} {item["modelo"]} {item["versao"]} ({item["cambio"]})')
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

    meta = doc.add_paragraph()
    run = meta.add_run(f'Motor {item["motor"]} | Câmbio {item["cambio"]} {item["marchas"]} marchas | Anos {ano_ini}–{anos[-1] if anos else ""} | {len(item["intervalos"])} intervalos no catálogo')
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x59, 0x59, 0x59)

    aviso = doc.add_paragraph()
    run = aviso.add_run('Copie o bloco abaixo inteiro e cole em uma conversa nova do Gemini.')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)

    json_catalogo = json.dumps(item['intervalos'], ensure_ascii=False, indent=2)

    prompt = CABECALHO_PROMPT.format(
        marca=item['marca'],
        modelo=item['modelo'],
        versao=item['versao'],
        motor=item['motor'],
        cambio=item['cambio'],
        marchas=item['marchas'],
        anos=anos_texto,
        ano_ini=ano_ini,
        json_catalogo=json_catalogo,
    )

    for linha_texto in prompt.split('\n'):
        paragrafo = doc.add_paragraph()
        paragrafo.paragraph_format.space_after = Pt(0)
        paragrafo.paragraph_format.space_before = Pt(0)
        run = paragrafo.add_run(linha_texto)
        run.font.name = 'Consolas'
        run.font.size = Pt(8)
        run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Consolas')

doc.save(saida)
print(f'Documento gerado: {saida}')
print(f'Prompts: {len(itens)}')
