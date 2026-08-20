import os
import re
from PIL import Image, ImageDraw, ImageFont

# Directory paths
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
public_og_dir = os.path.join(base_dir, "public", "og")
blog_dir = os.path.join(base_dir, "src", "content", "blog")
cases_dir = os.path.join(base_dir, "src", "content", "cases")

os.makedirs(public_og_dir, exist_ok=True)

# Select best font available on system
def get_fonts():
    font_paths = [
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\calibrib.ttf",
    ]
    reg_font_paths = [
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\calibri.ttf",
    ]
    mono_font_paths = [
        "C:\\Windows\\Fonts\\consola.ttf",
        "C:\\Windows\\Fonts\\cour.ttf",
    ]
    
    title_font_path = next((p for p in font_paths if os.path.exists(p)), None)
    body_font_path = next((p for p in reg_font_paths if os.path.exists(p)), None)
    mono_font_path = next((p for p in mono_font_paths if os.path.exists(p)), None)
    
    return title_font_path, body_font_path, mono_font_path

title_font_path, body_font_path, mono_font_path = get_fonts()

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        bbox = draw.textbbox((0, 0), " ".join(current_line), font=font)
        w = bbox[2] - bbox[0]
        if w > max_width:
            if len(current_line) > 1:
                current_line.pop()
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(" ".join(current_line))
                current_line = []
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def generate_card(filename, category_badge, title, subtitle_tags, is_case=False):
    width = 1200
    height = 630
    
    # Create gradient background
    img = Image.new("RGBA", (width, height), (10, 15, 29, 255)) # #0A0F1D
    draw = ImageDraw.Draw(img)
    
    # Draw background accents
    # Top-right glowing radial effect simulation
    for r in range(400, 0, -10):
        alpha = int(25 * (1 - r / 400))
        color = (0, 210, 255, alpha) if not is_case else (16, 185, 129, alpha)
        draw.ellipse([900 - r, 100 - r, 900 + r, 100 + r], fill=color)
        
    # Technical decorative grid lines
    line_color = (255, 255, 255, 10)
    for x in range(80, width, 120):
        draw.line([(x, 0), (x, height)], fill=line_color, width=1)
    for y in range(60, height, 90):
        draw.line([(0, y), (width, y)], fill=line_color, width=1)
        
    # Dark overlay on left to ensure maximum text contrast
    for x in range(0, 900):
        alpha = int(180 * (1 - x / 900))
        draw.line([(x, 0), (x, height)], fill=(10, 15, 29, alpha), width=1)

    # Accent left border stripe
    stripe_color = (0, 210, 255, 255) if not is_case else (16, 185, 129, 255)
    draw.rectangle([0, 0, 12, height], fill=stripe_color)
    
    # Fonts
    badge_font = ImageFont.truetype(title_font_path, 20) if title_font_path else ImageFont.load_default()
    title_font = ImageFont.truetype(title_font_path, 48) if title_font_path else ImageFont.load_default()
    tag_font = ImageFont.truetype(body_font_path, 22) if body_font_path else ImageFont.load_default()
    footer_brand_font = ImageFont.truetype(title_font_path, 24) if title_font_path else ImageFont.load_default()
    footer_sub_font = ImageFont.truetype(body_font_path, 18) if body_font_path else ImageFont.load_default()

    margin_x = 80
    current_y = 70
    
    # Category badge pill
    badge_text = category_badge.upper()
    badge_bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    bw = badge_bbox[2] - badge_bbox[0]
    bh = badge_bbox[3] - badge_bbox[1]
    
    pill_bg = (0, 210, 255, 35) if not is_case else (16, 185, 129, 35)
    pill_border = (0, 210, 255, 180) if not is_case else (16, 185, 129, 180)
    pill_text_color = (0, 240, 255, 255) if not is_case else (52, 211, 153, 255)
    
    draw.rounded_rectangle([margin_x, current_y, margin_x + bw + 32, current_y + bh + 16], radius=6, fill=pill_bg, outline=pill_border, width=1)
    draw.text((margin_x + 16, current_y + 7), badge_text, font=badge_font, fill=pill_text_color)
    
    current_y += bh + 45
    
    # Title
    max_title_w = 960
    title_lines = wrap_text(title, title_font, max_title_w, draw)
    for line in title_lines[:3]: # Max 3 lines
        draw.text((margin_x, current_y), line, font=title_font, fill=(255, 255, 255, 255))
        current_y += 62
        
    current_y += 15
    
    # Subtitle / Tags
    if subtitle_tags:
        tags_text = " • ".join(subtitle_tags) if isinstance(subtitle_tags, list) else subtitle_tags
        draw.text((margin_x, current_y), tags_text, font=tag_font, fill=(148, 163, 184, 255)) # slate-400
        
    # Footer Section
    footer_y = height - 90
    draw.line([(margin_x, footer_y - 20), (width - margin_x, footer_y - 20)], fill=(255, 255, 255, 25), width=1)
    
    # Brand info
    draw.text((margin_x, footer_y), "INTEGRA AUTOMAÇÃO INDUSTRIAL", font=footer_brand_font, fill=(241, 245, 249, 255))
    draw.text((margin_x, footer_y + 30), "integrautomacao.com.br • Engenharia e Integração de Sistemas OT", font=footer_sub_font, fill=(148, 163, 184, 255))
    
    # Right badge
    partner_badge = "ROCKWELL AUTOMATION SILVER PARTNER"
    pbbox = draw.textbbox((0, 0), partner_badge, font=badge_font)
    pw = pbbox[2] - pbbox[0]
    draw.text((width - margin_x - pw, footer_y + 8), partner_badge, font=badge_font, fill=(0, 210, 255, 220) if not is_case else (16, 185, 129, 220))
    
    output_path = os.path.join(public_og_dir, filename)
    img.convert("RGB").save(output_path, "PNG", optimize=True)
    print(f"Gerado: {filename}")

# Process all blog posts
for fname in os.listdir(blog_dir):
    if fname.endswith(".md") or fname.endswith(".mdx"):
        slug = os.path.splitext(fname)[0]
        filepath = os.path.join(blog_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        t_match = re.search(r'title:\s*["\']([^"\']+)["\']', content)
        title = t_match.group(1) if t_match else slug
        
        tags_match = re.search(r'tags:\s*\[(.*?)\]', content)
        tags = [t.strip().strip('"\'') for t in tags_match.group(1).split(",")] if tags_match else ["Automação Industrial", "Engenharia OT"]
        
        out_name = f"blog-{slug}.png"
        generate_card(out_name, "Blog Técnico • Engenharia & Automação", title, tags, is_case=False)

# Process cases
for fname in os.listdir(cases_dir):
    if fname.endswith(".md") or fname.endswith(".mdx"):
        slug = os.path.splitext(fname)[0]
        filepath = os.path.join(cases_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        t_match = re.search(r'title:\s*["\']([^"\']+)["\']', content)
        title = t_match.group(1) if t_match else slug
        
        tech_match = re.search(r'tech:\s*\[(.*?)\]', content)
        tech = [t.strip().strip('"\'') for t in tech_match.group(1).split(",")] if tech_match else ["ControlLogix", "FactoryTalk View SE"]
        
        sector_match = re.search(r'sector:\s*["\']([^"\']+)["\']', content)
        sector = sector_match.group(1) if sector_match else "Indústria de Processo"
        
        out_name = f"case-{slug}.png"
        generate_card(out_name, f"Case de Sucesso • {sector}", title, tech, is_case=True)

print("Todas as imagens Open Graph foram geradas com sucesso!")
