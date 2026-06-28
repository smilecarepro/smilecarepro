import io, base64, re, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def arabic_text(text):
    if not text: return ""
    text = str(text)
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text

def get_pdf_fonts():
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    font_reg = os.path.join(base_dir, "fonts", "Cairo-Regular.ttf")
    font_bld = os.path.join(base_dir, "fonts", "Cairo-Bold.ttf")
    
    reg_font = 'Helvetica'
    bld_font = 'Helvetica-Bold'
    
    try:
        pdfmetrics.registerFont(TTFont('ArabicFont', font_reg))
        pdfmetrics.registerFont(TTFont('ArabicFont-Bold', font_bld))
        reg_font = 'ArabicFont'
        bld_font = 'ArabicFont-Bold'
    except Exception as e:
        print("Font load error:", e)
        
    return reg_font, bld_font

def get_pdf_styles():
    reg, bld = get_pdf_fonts()
    styles = getSampleStyleSheet()
    
    normal = ParagraphStyle(
        "normal", parent=styles["Normal"],
        fontSize=10, leading=12, fontName=reg, alignment=0
    )
    
    title = ParagraphStyle(
        "title", parent=normal,
        fontSize=18, fontName=bld, alignment=1, spaceAfter=20, color=colors.HexColor("#185FA5")
    )
    
    label = ParagraphStyle(
        "label", parent=normal,
        fontSize=9, fontName=bld, color=colors.grey
    )
    
    value = ParagraphStyle(
        "value", parent=normal,
        fontSize=10, fontName=reg, color=colors.black
    )
    
    return {"normal": normal, "title": title, "label": label, "value": value, "fonts": (reg, bld)}

def add_header_footer(canvas, doc, clinic):
    # Add Header
    if clinic.get("prescription_header"):
        try:
            img_str = clinic["prescription_header"]
            if "," in img_str: img_str = img_str.split(",")[1]
            header_bin = base64.b64decode(img_str)
            canvas.drawImage(ImageReader(io.BytesIO(header_bin)), 0, A4[1] - 55*mm, width=A4[0], height=55*mm)
        except: pass
    
    # Add Footer
    if clinic.get("prescription_footer"):
        try:
            img_str = clinic["prescription_footer"]
            if "," in img_str: img_str = img_str.split(",")[1]
            footer_bin = base64.b64decode(img_str)
            canvas.drawImage(ImageReader(io.BytesIO(footer_bin)), 0, 0, width=A4[0], height=40*mm)
        except: pass
