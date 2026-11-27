# ============================================================
# ARQUIVO: scripts/gerar-planilha-fabricantes.py
# DESCRIÇÃO: Gera planilha XLSX do catálogo de fabricantes
# ============================================================
# Lê o JSON exportado da coleção 'fabricantes' e monta uma planilha
# para conferência manual contra o manual do fabricante.
#
# USO:
#   python scripts/gerar-planilha-fabricantes.py <entrada.json> <saida.xlsx>
#
# LIGADO A:
#   - scripts/seed-fabricantes.js → origem dos dados da coleção
#   - src/js/models/Fabricante.js → estrutura marca/modelo/versao/cambio/intervalos
# ============================================================

import json
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

entrada = sys.argv[1]
saida = sys.argv[2]

with open(entrada, encoding='utf-8') as arquivo:
    fabricantes = json.load(arquivo)

wb = Workbook()

# ---------- Estilos ----------
CABECALHO_FUNDO = PatternFill('solid', fgColor='1F3864')
CABECALHO_FONTE = Font(bold=True, color='FFFFFF', size=11)
BORDA = Border(*[Side(style='thin', color='BFBFBF')] * 4)
CENTRO = Alignment(horizontal='center', vertical='center')
ESQUERDA = Alignment(horizontal='left', vertical='center', wrap_text=True)

# ---------- Aba 1: Intervalos (uma linha por intervalo) ----------
ws = wb.active
ws.title = 'Intervalos'

colunas = [
    ('Marca', 14), ('Modelo', 16), ('Versao', 22), ('Motor', 22), ('Potencia', 12),
    ('Anos', 26), ('Cambio', 14), ('Marchas', 10),
    ('Chave', 22), ('Manutencao', 34), ('Intervalo KM', 13), ('Intervalo Meses', 15),
    ('Descricao', 42), ('Fonte', 46), ('Confianca', 12),
]

ws.append([c[0] for c in colunas])
for indice, (_, largura) in enumerate(colunas, start=1):
    ws.column_dimensions[get_column_letter(indice)].width = largura
    celula = ws.cell(row=1, column=indice)
    celula.fill = CABECALHO_FUNDO
    celula.font = CABECALHO_FONTE
    celula.alignment = CENTRO
    celula.border = BORDA

linhas = 0
for marca in fabricantes:
    for modelo in marca.get('modelos', []):
        for versao in modelo.get('versoes', []):
            anos = ', '.join(str(a) for a in versao.get('anos', []))
            for cambio in versao.get('cambios', []):
                for chave, item in cambio.get('intervalos', {}).items():
                    ws.append([
                        marca.get('marca', ''),
                        modelo.get('nome', ''),
                        versao.get('nome', ''),
                        versao.get('motor', ''),
                        versao.get('potencia', ''),
                        anos,
                        cambio.get('tipo', ''),
                        cambio.get('marchas', ''),
                        chave,
                        item.get('nome', ''),
                        item.get('intervaloKm', ''),
                        item.get('intervaloMeses', ''),
                        item.get('descricao', ''),
                        item.get('fonte', ''),
                        item.get('confianca', ''),
                    ])
                    linhas += 1

for linha in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=len(colunas)):
    for celula in linha:
        celula.border = BORDA
        celula.alignment = ESQUERDA
    linha[10].alignment = CENTRO
    linha[11].alignment = CENTRO
    linha[14].alignment = CENTRO

ws.freeze_panes = 'A2'
ws.auto_filter.ref = f'A1:{get_column_letter(len(colunas))}{ws.max_row}'

# ---------- Aba 2: Resumo por versao ----------
ws2 = wb.create_sheet('Resumo')
colunas2 = [
    ('Marca', 14), ('Modelo', 16), ('Versao', 22), ('Motor', 22), ('Potencia', 12),
    ('Anos', 26), ('Cambio', 14), ('Marchas', 10), ('Qtd Intervalos', 15),
]
ws2.append([c[0] for c in colunas2])
for indice, (_, largura) in enumerate(colunas2, start=1):
    ws2.column_dimensions[get_column_letter(indice)].width = largura
    celula = ws2.cell(row=1, column=indice)
    celula.fill = CABECALHO_FUNDO
    celula.font = CABECALHO_FONTE
    celula.alignment = CENTRO
    celula.border = BORDA

for marca in fabricantes:
    for modelo in marca.get('modelos', []):
        for versao in modelo.get('versoes', []):
            anos = ', '.join(str(a) for a in versao.get('anos', []))
            for cambio in versao.get('cambios', []):
                ws2.append([
                    marca.get('marca', ''),
                    modelo.get('nome', ''),
                    versao.get('nome', ''),
                    versao.get('motor', ''),
                    versao.get('potencia', ''),
                    anos,
                    cambio.get('tipo', ''),
                    cambio.get('marchas', ''),
                    len(cambio.get('intervalos', {})),
                ])

for linha in ws2.iter_rows(min_row=2, max_row=ws2.max_row, max_col=len(colunas2)):
    for celula in linha:
        celula.border = BORDA
        celula.alignment = ESQUERDA
    linha[8].alignment = CENTRO

ws2.freeze_panes = 'A2'
ws2.auto_filter.ref = f'A1:{get_column_letter(len(colunas2))}{ws2.max_row}'

# ---------- Aba 3: Notas ----------
ws3 = wb.create_sheet('Notas')
ws3.column_dimensions['A'].width = 110
notas = [
    ('Como usar esta planilha', True),
    ('', False),
    ('A aba "Intervalos" tem uma linha por intervalo de manutencao, com marca, modelo, versao, cambio e os valores.', False),
    ('A aba "Resumo" lista cada versao/cambio com a quantidade de intervalos cadastrados.', False),
    ('Use os filtros do cabecalho para isolar uma marca ou modelo e conferir contra o manual.', False),
    ('', False),
    ('Procedencia dos dados', True),
    ('', False),
    ('Todos os intervalos foram gravados com confianca "baixa" e fonte declarando estimativa de mercado.', False),
    ('Nenhum valor foi conferido contra manual oficial de fabricante.', False),
    ('Ao validar um intervalo no manual, atualize na planilha e depois no banco:', False),
    ('  - fonte: referencia do manual (ex: "Manual do Proprietario Onix 2020, p. 214")', False),
    ('  - confianca: "alta"', False),
    ('', False),
    ('Totais', True),
    ('', False),
    (f'Marcas: {len(fabricantes)}', False),
    (f'Linhas de intervalo: {linhas}', False),
]
for indice, (texto, negrito) in enumerate(notas, start=1):
    celula = ws3.cell(row=indice, column=1, value=texto)
    celula.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
    if negrito:
        celula.font = Font(bold=True, size=12, color='1F3864')

wb.save(saida)
print(f'Planilha gerada: {saida}')
print(f'Marcas: {len(fabricantes)} | linhas de intervalo: {linhas}')
