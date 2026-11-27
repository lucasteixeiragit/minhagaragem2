"""Gera opcoes de layout PNG para o badge 'Tipo de conta' (USER)."""
from PIL import Image, ImageDraw, ImageFont
import os
import math

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# Paleta do site (aproximacao)
BG          = hex_to_rgb('#111111')
CARD        = hex_to_rgb('#161616')
CARD_INNER  = hex_to_rgb('#202020')
BORDER      = hex_to_rgb('#303030')
RED         = hex_to_rgb('#E63946')
LABEL       = hex_to_rgb('#888888')
TEXT        = hex_to_rgb('#FFFFFF')

font_title = None
font_label = None
font_value = None
font_badge = None
font_small = None

def load_fonts():
    global font_title, font_label, font_value, font_badge, font_small
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/BebasNeue-Regular.ttf", 44)
    except Exception:
        try:
            font_title = ImageFont.truetype("C:/Windows/Fonts/Impact.ttf", 44)
        except Exception:
            font_title = ImageFont.load_default()
    try:
        font_label = ImageFont.truetype("C:/Windows/Fonts/Inter-Regular.ttf", 18)
        font_value = ImageFont.truetype("C:/Windows/Fonts/Inter-Bold.ttf", 26)
        font_badge = ImageFont.truetype("C:/Windows/Fonts/Inter-Bold.ttf", 22)
        font_small = ImageFont.truetype("C:/Windows/Fonts/Inter-Regular.ttf", 15)
    except Exception:
        try:
            font_label = ImageFont.truetype("C:/Windows/Fonts/Arial.ttf", 18)
            font_value = ImageFont.truetype("C:/Windows/Fonts/Arialbd.ttf", 26)
            font_badge = ImageFont.truetype("C:/Windows/Fonts/Arialbd.ttf", 22)
            font_small = ImageFont.truetype("C:/Windows/Fonts/Arial.ttf", 15)
        except Exception:
            font_label = ImageFont.load_default()
            font_value = ImageFont.load_default()
            font_badge = ImageFont.load_default()
            font_small = ImageFont.load_default()

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def draw_card(draw, x, y, w, h, title):
    rounded_rect(draw, (x, y, x+w, y+h), 18, CARD, outline=BORDER, width=1)
    # Box vermelho fino atras do titulo para dar destaque estilo site
    bbox = draw.textbbox((0, 0), title, font=font_title)
    title_w = bbox[2] - bbox[0]
    draw.text((x+24, y+22), title, fill=RED, font=font_title)

def draw_info_item(draw, x, y, w, h, label, value, badge_drawer=None):
    rounded_rect(draw, (x, y, x+w, y+h), 10, CARD_INNER, outline=BORDER, width=1)
    draw.text((x+16, y+12), label.upper(), fill=LABEL, font=font_label)
    if badge_drawer:
        badge_drawer(draw, x+16, y+42)
    else:
        draw.text((x+16, y+44), value, fill=TEXT, font=font_value)

def draw_base(name, badge_drawer):
    W, H = 800, 560
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Header
    rounded_rect(draw, (20, 20, W-20, 86), 12, CARD, outline=BORDER, width=1)
    draw.text((36, 34), "MINHA GARAGEM", fill=RED, font=font_title)
    draw.text((440, 42), "Garagem    + Adicionar Veiculo    Termos    Perfil    Sair", fill=LABEL, font=font_label)

    # Card perfil
    draw_card(draw, 20, 118, W-40, 280, "MEU PERFIL")
    draw_info_item(draw, 48, 185, 356, 82, "NOME", "Lucas")
    draw_info_item(draw, 396, 185, 356, 82, "E-MAIL", "teste@teste.com")
    draw_info_item(draw, 48, 280, 356, 82, "TIPO DE CONTA", "USER", badge_drawer=badge_drawer)
    draw_info_item(draw, 396, 280, 356, 82, "MEMBRO DESDE", "19/08/2026")

    # Rotulo opcao
    draw.text((40, 520), name, fill=LABEL, font=font_small)

    return img

# ==============================
# OPCAO 1: Placa automotiva (Mercosul)
# ==============================
def badge_placa(draw, x, y):
    w, h = 130, 34
    rounded_rect(draw, (x, y, x+w, y+h), 6, hex_to_rgb('#2A2A2A'), outline=RED, width=2)
    # Faixa vermelha no topo
    draw.rectangle((x+3, y+3, x+w-3, y+8), fill=RED)
    # Parafusos estilizados
    draw.ellipse((x+7, y+12, x+12, y+17), fill=LABEL)
    draw.ellipse((x+w-12, y+12, x+w-7, y+17), fill=LABEL)
    bbox = draw.textbbox((0,0), "USER", font=font_badge)
    tw = bbox[2]-bbox[0]
    draw.text((x + (w-tw)//2, y+10), "USER", fill=TEXT, font=font_badge)

# ==============================
# OPCAO 2: Chave de ignicao
# ==============================
def badge_chave(draw, x, y):
    # Anel
    draw.ellipse((x+2, y+4, x+26, y+28), outline=RED, width=3)
    # Corpo arredondado
    draw.rounded_rectangle((x+22, y+9, x+135, y+23), radius=5, fill=hex_to_rgb('#2A2A2A'), outline=RED, width=1)
    # Dente serrilhado
    for i in range(4):
        px = x + 105 + i*7
        draw.polygon([(px, y+9), (px+5, y+9), (px+5, y+16), (px, y+16)], fill=RED)
    draw.text((x+38, y+9), "USER", fill=TEXT, font=font_badge)

# ==============================
# OPCAO 3: Tag de combustivel / pit stop
# ==============================
def badge_combustivel(draw, x, y):
    w, h = 130, 34
    rounded_rect(draw, (x, y, x+w, y+h), 8, hex_to_rgb('#2A2A2A'), outline=RED, width=2)
    # Bomba circular
    draw.ellipse((x+6, y+5, x+28, y+27), fill=RED)
    # Bico
    draw.polygon([(x+25, y+10), (x+38, y+14), (x+25, y+18)], fill=RED)
    draw.text((x+44, y+8), "USER", fill=TEXT, font=font_badge)

# ==============================
# OPCAO 4: Emblema escudo / hexagono
# ==============================
def badge_emblema(draw, x, y):
    cx, cy = x+22, y+17
    r = 19
    points = []
    for i in range(6):
        ang = -90 + i * 60
        px = cx + r * math.cos(math.radians(ang))
        py = cy + r * math.sin(math.radians(ang))
        points.append((px, py))
    draw.polygon(points, fill=hex_to_rgb('#2A2A2A'), outline=RED)
    # Grade interna
    draw.line((cx-8, cy-5, cx+8, cy-5), fill=RED, width=1)
    draw.line((cx-8, cy+5, cx+8, cy+5), fill=RED, width=1)
    draw.text((x+50, y+8), "USER", fill=TEXT, font=font_badge)

def main():
    load_fonts()
    layouts = [
        ("opcao_1_placa.png", badge_placa, "Opcao 1 - Placa automotiva (estilo Mercosul)"),
        ("opcao_2_chave.png", badge_chave, "Opcao 2 - Chave de ignicao (chaveiro)"),
        ("opcao_3_combustivel.png", badge_combustivel, "Opcao 3 - Tag de combustivel / pit stop"),
        ("opcao_4_emblema.png", badge_emblema, "Opcao 4 - Emblema escudo / grade"),
    ]
    for filename, drawer, label in layouts:
        img = draw_base(label, drawer)
        path = os.path.join(OUT_DIR, filename)
        img.save(path, "PNG")
        print(f"Gerado: {path}")

if __name__ == "__main__":
    main()
